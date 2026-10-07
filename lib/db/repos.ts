import type { SQLiteDatabase } from 'expo-sqlite';
import {
  attrXpFromEvents, bossInfoForWeek, classById, type AttrEventRow, type ClassId, type AttrKey, type AttrXp, type Boss, type ChargeRow, type DayRecord, type EventType, type GearSlot, type Loadout, gearById,
  type FxTag, type RoundResult, type SpellId, type SpentRow,
} from '../game';

export type Profile = {
  name: string;
  avatar: string;
  createdDate: string;
  level: number;
  xp: number;
  coins: number;
  attrs: AttrXp; // derivado dos eventos (attrXpFromEvents); as colunas *_level/_xp antigas não são mais usadas
  cls: ClassId | null; // null = senda ainda não escolhida
  classChanged: string | null; // data da última troca de classe
  spells: SpellId[] | null; // magias preparadas, em ordem de preparo (null = grimório nunca aberto)
  spellsSwapped: string | null; // data da última troca de preparo
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
  return {
    name: r.name as string,
    avatar: r.avatar as string,
    createdDate: r.created_date as string,
    level: r.level as number,
    xp: r.xp as number,
    coins: r.coins as number,
    attrs: attrXpFromEvents(await db.getAllAsync<AttrEventRow>(ATTR_XP_SQL)),
    cls: classById(r.class as string | null)?.id ?? null,
    classChanged: (r.class_changed as string | null) ?? null,
    spells: r.spells ? JSON.parse(r.spells as string) : null,
    spellsSwapped: (r.spells_swapped as string | null) ?? null,
  };
}

/** Grava as magias preparadas; `swapped` = data, quando a mudança gastou a troca do dia. */
export const setSpells = (db: SQLiteDatabase, spells: SpellId[], swapped: string | null) =>
  db.runAsync('UPDATE profile SET spells = ?, spells_swapped = COALESCE(?, spells_swapped) WHERE id = 1', JSON.stringify(spells), swapped);

/** Escolhe a classe; `changed` = data da troca (null na primeira escolha, que não conta para o intervalo). */
export const setClass = (db: SQLiteDatabase, cls: ClassId, changed: string | null) =>
  db.runAsync('UPDATE profile SET class = ?, class_changed = COALESCE(?, class_changed) WHERE id = 1', cls, changed);

export const createProfile = (db: SQLiteDatabase, name: string, avatar: string, date: string, cls: ClassId | null = null) =>
  db.runAsync('INSERT INTO profile (id, name, avatar, created_date, class) VALUES (1, ?, ?, ?, ?)', name, avatar, date, cls);

export const saveProgress = (db: SQLiteDatabase, p: Pick<Profile, 'level' | 'xp' | 'coins'>) =>
  db.runAsync('UPDATE profile SET level=?, xp=?, coins=? WHERE id = 1', p.level, p.xp, p.coins);

/** XP por atributo, agregado dos eventos (linear, então somar por grupo é exato; desfazer = apagar o evento). */
export const ATTR_XP_SQL = `SELECT type, attr, json_extract(data, '$.kind') AS kind, json_extract(data, '$.quick') AS quick,
  json_extract(data, '$.name') AS name, SUM(xp) AS xp FROM events WHERE xp > 0 GROUP BY 1, 2, 3, 4, 5`;

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
  xp: number; coins: number; attr: string; bossDamage: number; charges: number; data: Record<string, unknown> | null;
};
type EventDbRow = Omit<EventRow, 'bossDamage' | 'data'> & { boss_damage: number; data: string | null };
const toEvent = ({ boss_damage, data, ...r }: EventDbRow): EventRow => ({ ...r, bossDamage: boss_damage, data: data ? JSON.parse(data) : null });

export const insertEvent = (
  db: SQLiteDatabase,
  e: { ts: number; date: string; type: EventType; ref?: string; xp: number; coins: number; attr: string; bossDamage: number; charges: number; data?: object },
) =>
  db.runAsync(
    'INSERT INTO events (ts, date, type, ref, xp, coins, attr, boss_damage, charges, data) VALUES (?,?,?,?,?,?,?,?,?,?)',
    e.ts, e.date, e.type, e.ref ?? null, e.xp, e.coins, e.attr, e.bossDamage, e.charges, e.data ? JSON.stringify(e.data) : null,
  );

export async function getEventsByDate(db: SQLiteDatabase, date: string): Promise<EventRow[]> {
  return (await db.getAllAsync<EventDbRow>('SELECT * FROM events WHERE date = ? ORDER BY ts, id', date)).map(toEvent);
}

export const deleteEvent = (db: SQLiteDatabase, id: number) => db.runAsync('DELETE FROM events WHERE id = ?', id);

/** Todas as sessões de leitura com título (para "Meus livros"). */
export async function getReadingEvents(db: SQLiteDatabase): Promise<EventRow[]> {
  return (await db.getAllAsync<EventDbRow>("SELECT * FROM events WHERE type = 'study' AND json_extract(data, '$.kind') = 'leitura' ORDER BY ts, id")).map(toEvent);
}

/** Sessões de estudo da semana que ganharam a carga da Contemplação (`data.contemplacao`). */
export async function countContemplations(db: SQLiteDatabase, from: string, to: string) {
  const r = await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM events WHERE type = 'study' AND json_extract(data, '$.contemplacao') = 1 AND date BETWEEN ? AND ?", from, to);
  return r?.n ?? 0;
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

/** O chefão desta semana foi aberto na escala antiga de HP (migration v7)? */
export async function isLegacyBoss(db: SQLiteDatabase, weekStart: string) {
  return !!(await db.getFirstAsync<{ x: number }>('SELECT 1 AS x FROM boss_weeks WHERE week_start = ? AND legacy_hp = 1', weekStart));
}
/** Grava o HP reescalado e zera a marca no mesmo UPDATE condicional: só a primeira chamada passa (nunca reescala duas vezes). */
export async function rescaleLegacyBoss(db: SQLiteDatabase, b: Boss): Promise<boolean> {
  const r = await db.runAsync('UPDATE boss_weeks SET max_hp = ?, hp = ?, legacy_hp = 0 WHERE week_start = ? AND legacy_hp = 1', b.maxHp, b.hp, b.weekStart);
  return r.changes === 1;
}

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

/** Dano na semana: eventos antigos (dano passivo) + golpes de combate (`type` 'combat', `ref` = atributo ou id da magia). */
export type DamageRow = { id: number; ts: number; date: string; type: EventType | 'combat'; ref: string | null; bossDamage: number };
export async function getWeekDamage(db: SQLiteDatabase, from: string, to: string): Promise<DamageRow[]> {
  const rows = await db.getAllAsync<{ id: number; ts: number; date: string; type: EventType; ref: string | null; boss_damage: number }>(
    `SELECT id, ts, date, type, ref, boss_damage FROM events WHERE boss_damage > 0 AND date BETWEEN ?1 AND ?2
     UNION ALL SELECT -id, ts, date, 'combat', COALESCE(spell, attr), damage FROM combat_rounds WHERE damage > 0 AND date BETWEEN ?1 AND ?2
     ORDER BY ts DESC, id DESC`, from, to,
  );
  return rows.map(({ boss_damage, ...r }) => ({ ...r, bossDamage: boss_damage }));
}

// ---- combate ----
/** Cargas ganhas por dia (só eventos da Etapa B em diante têm charges > 0). */
export const CHARGES_SQL = `SELECT date, type, attr, json_extract(data, '$.kind') AS kind, json_extract(data, '$.quick') AS quick,
  json_extract(data, '$.name') AS name, SUM(charges) AS n FROM events WHERE charges > 0 GROUP BY 1, 2, 3, 4, 5, 6`;
export const getChargeRows = (db: SQLiteDatabase) => db.getAllAsync<ChargeRow>(CHARGES_SQL);
/** Cargas gastas: uma por rodada de golpe (o Segundo fôlego e as magias não gastam carga). */
export const SPENT_SQL = "SELECT week_start AS week, attr, COUNT(*) AS n FROM combat_rounds WHERE talent IS NOT 'folego' AND spell IS NULL GROUP BY 1, 2";
export const getSpentRows = (db: SQLiteDatabase) => db.getAllAsync<SpentRow>(SPENT_SQL);
/** Centelhas gastas por dia (custo das magias). */
export const SPARKS_SPENT_SQL = 'SELECT date, SUM(spell_cost) AS n FROM combat_rounds WHERE spell_cost > 0 GROUP BY 1';
export const getSparksSpent = (db: SQLiteDatabase) => db.getAllAsync<{ date: string; n: number }>(SPARKS_SPENT_SQL);

export type RoundRow = RoundResult & { id: number; idx: number; ts: number; date: string };
type RoundDbRow = { id: number; idx: number; ts: number; date: string; attr: AttrKey; d20: number; total: number; hit: number; crit: number; damage: number;
  boss_hp: number; boss_d20: number | null; boss_total: number | null; boss_hit: number; boss_damage: number; hero_hp: number;
  talent: RoundResult['talent']; heal: number; spell: SpellId | null; spell_cost: number; spell_ok: number | null; fx: string | null };
const toRound = (r: RoundDbRow): RoundRow => ({
  id: r.id, idx: r.idx, ts: r.ts, date: r.date, attr: r.attr, d20: r.d20, total: r.total, hit: !!r.hit, crit: !!r.crit, damage: r.damage,
  bossHp: r.boss_hp, bossD20: r.boss_d20, bossTotal: r.boss_total, bossHit: !!r.boss_hit, bossCrit: r.boss_d20 === 20, bossDamage: r.boss_damage,
  heroHp: r.hero_hp, retreated: r.hero_hp <= 0, defeated: r.boss_hp <= 0, talent: r.talent ?? null, heal: r.heal ?? 0,
  spell: r.spell ?? null, spellCost: r.spell_cost ?? 0, spellOk: r.spell_ok === null || r.spell_ok === undefined ? null : !!r.spell_ok,
  fx: r.fx ? (r.fx.split(',') as FxTag[]) : [],
});
/** Rodadas da semana, mais recente primeiro. */
export async function getWeekRounds(db: SQLiteDatabase, week: string): Promise<RoundRow[]> {
  return (await db.getAllAsync<RoundDbRow>('SELECT * FROM combat_rounds WHERE week_start = ? ORDER BY idx DESC', week)).map(toRound);
}
/** Rodadas de hoje em ordem (efeitos de magia ativos são refeitos a partir delas). */
export async function getDayRounds(db: SQLiteDatabase, date: string): Promise<RoundRow[]> {
  return (await db.getAllAsync<RoundDbRow>('SELECT * FROM combat_rounds WHERE date = ? ORDER BY idx', date)).map(toRound);
}
/** Próximo índice global (semente do dado). */
export async function nextRoundIdx(db: SQLiteDatabase): Promise<number> {
  const r = await db.getFirstAsync<{ n: number | null }>('SELECT MAX(idx) AS n FROM combat_rounds');
  return (r?.n ?? -1) + 1;
}
/** Dano líquido de hoje (sofrido − curado), se já recuou, talentos e habilidades de lendários já gastos hoje e quantas rodadas houve (trava o arsenal). */
export async function getHeroDay(db: SQLiteDatabase, date: string) {
  const r = await db.getFirstAsync<{ dmg: number | null; ko: number | null; folego: number | null; esquiva: number | null; vigor: number | null; perseu: number | null; giges: number | null; n: number }>(
    `SELECT SUM(boss_damage) - SUM(heal) AS dmg, MAX(hero_hp <= 0) AS ko, SUM(talent = 'folego') AS folego,
       SUM(talent = 'esquiva') AS esquiva, SUM(talent = 'vigor') AS vigor, SUM(fx LIKE '%perseu%') AS perseu,
       SUM(fx LIKE '%giges%') AS giges, COUNT(*) AS n FROM combat_rounds WHERE date = ?`, date);
  return { damage: r?.dmg ?? 0, retreated: !!r?.ko, folego: r?.folego ?? 0, esquiva: r?.esquiva ?? 0, vigor: r?.vigor ?? 0,
    perseu: r?.perseu ?? 0, giges: r?.giges ?? 0, rounds: r?.n ?? 0 };
}
export const insertRound = (db: SQLiteDatabase, idx: number, ts: number, date: string, week: string, r: RoundResult, cls: ClassId | null) =>
  db.runAsync(
    `INSERT INTO combat_rounds (idx, ts, date, week_start, attr, d20, total, hit, crit, damage, boss_hp, boss_d20, boss_total, boss_hit, boss_damage, hero_hp, hero_class, talent, heal,
       spell, spell_cost, spell_ok, fx)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    idx, ts, date, week, r.attr, r.d20, r.total, r.hit ? 1 : 0, r.crit ? 1 : 0, r.damage, r.bossHp, r.bossD20, r.bossTotal, r.bossHit ? 1 : 0, r.bossDamage, r.heroHp,
    cls, r.talent, r.heal, r.spell, r.spellCost, r.spellOk === null ? null : r.spellOk ? 1 : 0, r.fx.length ? r.fx.join(',') : null,
  );
// ---- equipamentos (Etapa E) ----
/** Itens possuídos (ordem de aquisição) e o arsenal: equipados por slot e os sintonizados. */
export async function getGear(db: SQLiteDatabase): Promise<{ owned: string[]; loadout: Loadout }> {
  const owned = (await db.getAllAsync<{ item_id: string }>('SELECT item_id FROM gear_inventory ORDER BY acquired, rowid')).map((r) => r.item_id);
  const rows = await db.getAllAsync<{ slot: GearSlot; item_id: string; attuned: number }>('SELECT slot, item_id, attuned FROM gear_equipped');
  const ok = rows.filter((r) => owned.includes(r.item_id) && gearById(r.item_id)?.slot === r.slot);
  return { owned, loadout: { equipped: Object.fromEntries(ok.map((r) => [r.slot, r.item_id])), attuned: ok.filter((r) => r.attuned).map((r) => r.slot) } };
}
/** `true` se o item entrou agora (INSERT OR IGNORE: nunca duplica). */
export async function addGear(db: SQLiteDatabase, id: string, date: string, source: 'loja' | 'bau' | 'conquista') {
  return (await db.runAsync('INSERT OR IGNORE INTO gear_inventory (item_id, acquired, source) VALUES (?, ?, ?)', id, date, source)).changes === 1;
}
/** Regrava o arsenal inteiro (chamar dentro de transação). */
export async function setLoadout(db: SQLiteDatabase, l: Loadout) {
  await db.runAsync('DELETE FROM gear_equipped');
  for (const [slot, id] of Object.entries(l.equipped)) {
    if (id) await db.runAsync('INSERT INTO gear_equipped (slot, item_id, attuned) VALUES (?, ?, ?)', slot, id, l.attuned.includes(slot as GearSlot) ? 1 : 0);
  }
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
    (SELECT COUNT(*) FROM inventory WHERE source = 'loja') AS shopPurchases,
    (SELECT COUNT(*) FROM combat_rounds WHERE hit = 1) AS hits,
    (SELECT COUNT(*) FROM combat_rounds WHERE crit = 1) AS crits,
    (SELECT COUNT(*) FROM combat_rounds WHERE boss_hp = 0 AND damage > 0 AND attr = 'intelecto' AND spell IS NULL) AS intKills,
    (SELECT COUNT(*) FROM profile WHERE class IS NOT NULL) AS classChosen,
    (SELECT COUNT(*) FROM combat_rounds WHERE talent = 'folego') AS secondWinds,
    (SELECT COUNT(*) FROM combat_rounds WHERE talent = 'esquiva') AS dodges,
    (SELECT COUNT(*) FROM combat_rounds WHERE crit = 1 AND d20 = 19 AND spell IS NULL AND attr = 'intelecto' AND hero_class = 'filosofo') AS crit19,
    (SELECT COUNT(*) FROM combat_rounds WHERE spell IS NOT NULL) AS spellsCast,
    (SELECT COUNT(*) FROM combat_rounds WHERE spell = 'prometeu') AS prometheus,
    (SELECT COUNT(*) FROM combat_rounds WHERE spell IS NOT NULL AND boss_hp = 0 AND damage > 0) AS spellKills,
    (SELECT COUNT(DISTINCT hero_class) FROM combat_rounds WHERE boss_hp = 0 AND damage > 0 AND hero_class IS NOT NULL) AS classWins,
    (SELECT COUNT(*) FROM boss_weeks b WHERE hp = 0
       AND EXISTS (SELECT 1 FROM combat_rounds r WHERE r.week_start = b.week_start AND r.boss_hp = 0)
       AND NOT EXISTS (SELECT 1 FROM combat_rounds r WHERE r.week_start = b.week_start AND r.hero_hp <= 0)) AS flawlessWins`);
  return r!;
}
