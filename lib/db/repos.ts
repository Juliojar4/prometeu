import type { SQLiteDatabase } from 'expo-sqlite';
import { bossInfoForWeek, type Attr, type Attributes, type Boss, type DayRecord, type EventType } from '../game';

export type Profile = {
  name: string;
  avatar: string;
  createdDate: string;
  level: number;
  xp: number;
  coins: number;
  attrs: Attributes;
};
export type Settings = {
  waterGoal: number; // copos de 250 ml
  weeklyWorkoutGoal: number;
  reminders: { water: string; workout: string; meal: string }; // 'HH:MM'
};

// ---- perfil ----
type ProfileRow = Record<string, number | string>;

export async function getProfile(db: SQLiteDatabase): Promise<Profile | null> {
  const r = await db.getFirstAsync<ProfileRow>('SELECT * FROM profile WHERE id = 1');
  if (!r) return null;
  const a = (k: string) => ({ level: r[`${k}_level`] as number, xp: r[`${k}_xp`] as number });
  return {
    name: r.name as string,
    avatar: r.avatar as string,
    createdDate: r.created_date as string,
    level: r.level as number,
    xp: r.xp as number,
    coins: r.coins as number,
    attrs: { forca: a('forca'), vitalidade: a('vitalidade'), energia: a('energia'), intelecto: a('intelecto') },
  };
}

export const createProfile = (db: SQLiteDatabase, name: string, avatar: string, date: string) =>
  db.runAsync('INSERT INTO profile (id, name, avatar, created_date) VALUES (1, ?, ?, ?)', name, avatar, date);

export const saveProgress = (db: SQLiteDatabase, p: Pick<Profile, 'level' | 'xp' | 'coins' | 'attrs'>) =>
  db.runAsync(
    `UPDATE profile SET level=?, xp=?, coins=?, forca_level=?, forca_xp=?,
     vitalidade_level=?, vitalidade_xp=?, energia_level=?, energia_xp=?, intelecto_level=?, intelecto_xp=? WHERE id = 1`,
    p.level, p.xp, p.coins,
    p.attrs.forca.level, p.attrs.forca.xp,
    p.attrs.vitalidade.level, p.attrs.vitalidade.xp,
    p.attrs.energia.level, p.attrs.energia.xp,
    p.attrs.intelecto.level, p.attrs.intelecto.xp,
  );

// ---- configurações ----
export const DEFAULT_SETTINGS: Settings = {
  waterGoal: 8,
  weeklyWorkoutGoal: 3,
  reminders: { water: '10:00', workout: '18:00', meal: '12:30' },
};

export async function getSettings(db: SQLiteDatabase): Promise<Settings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const m = Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)]));
  return { ...DEFAULT_SETTINGS, ...m };
}

export async function saveSettings(db: SQLiteDatabase, s: Settings) {
  for (const [k, v] of Object.entries(s))
    await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', k, JSON.stringify(v));
}

// ---- eventos ----
export type EventRow = {
  id: number; ts: number; date: string; type: EventType; ref: string | null;
  xp: number; coins: number; attr: Attr; bossDamage: number; data: Record<string, unknown> | null;
};
type EventDbRow = Omit<EventRow, 'bossDamage' | 'data'> & { boss_damage: number; data: string | null };
const toEvent = ({ boss_damage, data, ...r }: EventDbRow): EventRow => ({ ...r, bossDamage: boss_damage, data: data ? JSON.parse(data) : null });

export const insertEvent = (
  db: SQLiteDatabase,
  e: { ts: number; date: string; type: EventType; ref?: string; xp: number; coins: number; attr: string; bossDamage: number; data?: object },
) =>
  db.runAsync(
    'INSERT INTO events (ts, date, type, ref, xp, coins, attr, boss_damage, data) VALUES (?,?,?,?,?,?,?,?,?)',
    e.ts, e.date, e.type, e.ref ?? null, e.xp, e.coins, e.attr, e.bossDamage, e.data ? JSON.stringify(e.data) : null,
  );

export async function getEventsByDate(db: SQLiteDatabase, date: string): Promise<EventRow[]> {
  return (await db.getAllAsync<EventDbRow>('SELECT * FROM events WHERE date = ? ORDER BY ts, id', date)).map(toEvent);
}

export const deleteEvent = (db: SQLiteDatabase, id: number) => db.runAsync('DELETE FROM events WHERE id = ?', id);

/** Todas as sessões de leitura com título (para "Meus livros"). */
export async function getReadingEvents(db: SQLiteDatabase): Promise<EventRow[]> {
  return (await db.getAllAsync<EventDbRow>("SELECT * FROM events WHERE type = 'study' AND json_extract(data, '$.kind') = 'leitura' ORDER BY ts, id")).map(toEvent);
}

/** Treinos registrados na semana (segunda a domingo). */
export async function countWorkouts(db: SQLiteDatabase, from: string, to: string) {
  const r = await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM events WHERE type = 'workout' AND date BETWEEN ? AND ?", from, to);
  return r?.n ?? 0;
}

// ---- dias ----
type DayRow = { date: string; water: number; water_goal: number; workout: number; meals: number; study: number };
const toDay = (r: DayRow): DayRecord => ({
  date: r.date, water: r.water, waterGoal: r.water_goal, workout: !!r.workout, meals: r.meals, study: r.study,
});

export async function getDays(db: SQLiteDatabase): Promise<DayRecord[]> {
  return (await db.getAllAsync<DayRow>('SELECT * FROM days ORDER BY date')).map(toDay);
}

/** Recalcula o dia a partir dos eventos (fonte da verdade): idempotente, serve para registrar e desfazer. */
export async function recomputeDay(db: SQLiteDatabase, date: string, waterGoal: number) {
  await db.runAsync('INSERT OR IGNORE INTO days (date, water_goal) VALUES (?, ?)', date, waterGoal);
  await db.runAsync(
    `UPDATE days SET
       water = (SELECT COUNT(*) FROM events WHERE date = days.date AND type = 'water'),
       workout = EXISTS (SELECT 1 FROM events WHERE date = days.date AND type = 'workout'),
       meals = (SELECT COUNT(*) FROM events WHERE date = days.date AND type = 'meal'),
       study = (SELECT COALESCE(SUM(json_extract(data, '$.minutes')), 0) FROM events WHERE date = days.date AND type = 'study')
     WHERE date = ?`,
    date,
  );
}

// ---- missões do dia ----
export async function getDailyMissions(db: SQLiteDatabase, date: string, pick: () => string[]) {
  let rows = await db.getAllAsync<{ mission_id: string; completed: number }>(
    'SELECT mission_id, completed FROM daily_missions WHERE date = ?', date,
  );
  if (!rows.length) {
    for (const id of pick()) await db.runAsync('INSERT INTO daily_missions (date, mission_id) VALUES (?, ?)', date, id);
    rows = await db.getAllAsync('SELECT mission_id, completed FROM daily_missions WHERE date = ?', date);
  }
  return rows.map((r) => ({ id: r.mission_id, completed: !!r.completed }));
}

export const setMissionCompleted = (db: SQLiteDatabase, date: string, id: string, completed: boolean) =>
  db.runAsync('UPDATE daily_missions SET completed = ? WHERE date = ? AND mission_id = ?', completed ? 1 : 0, date, id);

// ---- chefão ----
type BossRow = { week_start: string; name: string; max_hp: number; hp: number };
// o nome vem do catálogo (semanas gravadas antes da etapa 3 tinham nomes antigos)
const toBoss = (r: BossRow): Boss => ({ weekStart: r.week_start, name: bossInfoForWeek(r.week_start).name, maxHp: r.max_hp, hp: r.hp });

export async function getBoss(db: SQLiteDatabase, weekStart: string): Promise<Boss | null> {
  const r = await db.getFirstAsync<BossRow>('SELECT * FROM boss_weeks WHERE week_start = ?', weekStart);
  return r ? toBoss(r) : null;
}

/** Upsert que preserva `chest_claimed` (INSERT OR REPLACE zeraria a flag do baú). */
export const saveBoss = (db: SQLiteDatabase, b: Boss) =>
  db.runAsync(
    `INSERT INTO boss_weeks (week_start, name, max_hp, hp) VALUES (?,?,?,?)
     ON CONFLICT(week_start) DO UPDATE SET name = excluded.name, max_hp = excluded.max_hp, hp = excluded.hp`,
    b.weekStart, b.name, b.maxHp, b.hp,
  );

/** Chefão derrotado cujo baú ainda não foi aberto (o mais recente). */
export async function getPendingChest(db: SQLiteDatabase): Promise<Boss | null> {
  const r = await db.getFirstAsync<BossRow>('SELECT * FROM boss_weeks WHERE hp = 0 AND chest_claimed = 0 ORDER BY week_start DESC LIMIT 1');
  return r ? toBoss(r) : null;
}

/** Marca o baú como aberto; `true` só na primeira vez (garante recompensa única). */
export async function claimChest(db: SQLiteDatabase, weekStart: string): Promise<boolean> {
  const r = await db.runAsync('UPDATE boss_weeks SET chest_claimed = 1 WHERE week_start = ? AND hp = 0 AND chest_claimed = 0', weekStart);
  return r.changes === 1;
}

export type DamageRow = { id: number; ts: number; date: string; type: EventType; ref: string | null; bossDamage: number };
export async function getWeekDamage(db: SQLiteDatabase, from: string, to: string): Promise<DamageRow[]> {
  const rows = await db.getAllAsync<{ id: number; ts: number; date: string; type: EventType; ref: string | null; boss_damage: number }>(
    'SELECT id, ts, date, type, ref, boss_damage FROM events WHERE boss_damage > 0 AND date BETWEEN ? AND ? ORDER BY ts DESC, id DESC', from, to,
  );
  return rows.map(({ boss_damage, ...r }) => ({ ...r, bossDamage: boss_damage }));
}

export const addCoins = (db: SQLiteDatabase, delta: number) =>
  db.runAsync('UPDATE profile SET coins = MAX(0, coins + ?) WHERE id = 1', delta);

// ---- loja ----
export async function getInventory(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<{ item_id: string; equipped: number }>('SELECT item_id, equipped FROM inventory ORDER BY acquired, rowid');
  return { owned: rows.map((r) => r.item_id), equipped: rows.filter((r) => r.equipped).map((r) => r.item_id) };
}
export const addItem = (db: SQLiteDatabase, id: string, date: string, source: 'loja' | 'bau') =>
  db.runAsync('INSERT OR IGNORE INTO inventory (item_id, acquired, source) VALUES (?, ?, ?)', id, date, source);
export async function setEquipped(db: SQLiteDatabase, equipped: string[]) {
  await db.runAsync('UPDATE inventory SET equipped = 0');
  for (const id of equipped) await db.runAsync('UPDATE inventory SET equipped = 1 WHERE item_id = ?', id);
}

// ---- conquistas ----
export async function getUnlocked(db: SQLiteDatabase): Promise<Record<string, string>> {
  const rows = await db.getAllAsync<{ id: string; unlocked: string }>('SELECT id, unlocked FROM achievements');
  return Object.fromEntries(rows.map((r) => [r.id, r.unlocked]));
}
export const unlockAchievement = (db: SQLiteDatabase, id: string, date: string) =>
  db.runAsync('INSERT OR IGNORE INTO achievements (id, unlocked) VALUES (?, ?)', id, date);

/** Totais para as conquistas, direto dos eventos (desfazer reduz o total; o desbloqueio já feito permanece). */
export async function getCounts(db: SQLiteDatabase) {
  const r = await db.getFirstAsync<Record<string, number>>(`SELECT
    (SELECT COUNT(*) FROM events WHERE type = 'water') AS water,
    (SELECT COUNT(*) FROM events WHERE type = 'study') AS studySessions,
    (SELECT COALESCE(SUM(json_extract(data, '$.minutes')), 0) FROM events WHERE type = 'study') AS studyMinutes,
    (SELECT COALESCE(SUM(json_extract(data, '$.pages')), 0) FROM events WHERE type = 'study') AS pages,
    (SELECT COALESCE(MAX(json_extract(data, '$.minutes')), 0) FROM events WHERE type = 'study') AS longestStudy,
    (SELECT COUNT(DISTINCT lower(trim(json_extract(data, '$.title')))) FROM events WHERE type = 'study' AND json_extract(data, '$.kind') = 'leitura' AND trim(COALESCE(json_extract(data, '$.title'), '')) <> '') AS books,
    (SELECT COUNT(*) FROM events WHERE type = 'water_goal') AS waterGoalDays,
    (SELECT COUNT(*) FROM events WHERE type = 'workout') AS workouts,
    (SELECT COALESCE(SUM(json_extract(data, '$.minutes')), 0) FROM events WHERE type = 'workout') AS workoutMinutes,
    (SELECT COUNT(*) FROM events WHERE type = 'meal') AS meals,
    (SELECT COUNT(*) FROM events WHERE type = 'meal' AND json_extract(data, '$.rating') = 'bom') AS goodMeals,
    (SELECT COUNT(*) FROM events WHERE type = 'mission') AS missions,
    (SELECT COUNT(*) FROM boss_weeks WHERE hp = 0) AS bossesDefeated,
    (SELECT COUNT(*) FROM boss_weeks WHERE chest_claimed = 1) AS chests,
    (SELECT COUNT(*) FROM inventory WHERE source = 'loja') AS shopPurchases`);
  return r!;
}
