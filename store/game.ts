import * as Haptics from 'expo-haptics';
import { create } from 'zustand';
import { getDb } from '../lib/db';
import * as repo from '../lib/db/repos';
import {
  AchStats, addDays, applyChanges, autoMissionDone, Boss, bossForDate, chestReward, ChestReward,
  clampMinutes, computeStreak, DayEvent, DayRecord, emptyStats, EventType, GameState, Intensity, MAX_CUPS_PER_DAY, MealRating, MealSlot,
  MealTag, mealReward, clampPages, clampStudyMinutes, studyReward, StudyKind, summarizeBooks, BookSummary, Mission, MISSION_BOSS_DAMAGE, missionById, newlyUnlocked, pickDailyMissions, pillarsDone, Purchase, purchase,
  Reward, REWARDS, StreakState, toDateStr, toggleEquip, waterBonusAction, WATER_GOAL_BONUS, weekStart, WorkoutKind, workoutReward,
} from '../lib/game';

export type DailyMission = Mission & { completed: boolean };
export type StudyInput = { kind: StudyKind; minutes: number; title?: string; pages?: number };
export type WorkoutInput = { kind: WorkoutKind; minutes: number; intensity: Intensity; name?: string };
type Onboarding = { name: string; avatar: string } & repo.Settings;

type Store = {
  ready: boolean;
  today: string;
  profile: repo.Profile | null; // null = onboarding pendente
  settings: repo.Settings;
  todayRecord: DayRecord;
  streak: StreakState;
  missions: DailyMission[];
  boss: Boss | null;
  todayEvents: repo.EventRow[]; // água, treinos, refeições e missões de hoje
  weekWorkouts: number; // treinos da semana (seg a dom)
  levelUpTick: number; // incrementa a cada subida de nível ou chefão derrotado (dispara confete)
  weekDamage: repo.DamageRow[]; // eventos da semana que feriram o chefão (mais recente primeiro)
  pendingChest: Boss | null; // chefão derrotado com baú ainda fechado
  owned: string[];
  equipped: string[];
  unlocked: Record<string, string>; // conquista -> data
  stats: AchStats;
  toasts: string[]; // ids de conquistas recém-desbloqueadas aguardando o banner
  load: () => Promise<void>;
  completeOnboarding: (o: Onboarding) => Promise<void>;
  /** Conclui uma missão manual do dia. As automáticas se concluem sozinhas ao cumprir a regra. */
  completeMission: (id: string) => Promise<void>;
  /** Desfaz uma missão manual concluída hoje, devolvendo XP/moedas/dano. */
  undoMission: (id: string) => Promise<void>;
  /** Abre o baú do chefão derrotado (uma única vez por chefão). `null` se não há baú. */
  openChest: () => Promise<(ChestReward & { weekStart: string }) | null>;
  buy: (itemId: string) => Promise<Purchase>;
  equip: (itemId: string) => Promise<void>;
  dismissToast: () => void;
  addWater: () => Promise<void>;
  /** Remove o último copo e reverte XP/moedas/dano (e o bônus da meta, se deixou de valer). */
  undoWater: () => Promise<void>;
  addWorkout: (w: WorkoutInput) => Promise<void>;
  addStudy: (s: StudyInput) => Promise<void>;
  books: BookSummary[]; // derivado das sessões de leitura
  /** Exclui um treino de hoje revertendo a recompensa. */
  removeEvent: (id: number) => Promise<void>;
  /** Avalia/edita uma refeição de hoje (troca a recompensa anterior, sem duplicar). */
  setMeal: (slot: MealSlot, rating: MealRating, tags: MealTag[]) => Promise<void>;
  clearMeal: (slot: MealSlot) => Promise<void>;
};

const emptyDay = (date: string, waterGoal: number): DayRecord => ({ date, water: 0, waterGoal, workout: false, meals: 0, study: 0 });
const noStreak: StreakState = { streak: 0, bestStreak: 0, shields: 0, activeDays: 0, tired: false, atRisk: false, lastShieldUse: null, nextShieldIn: 7 };

export const useGame = create<Store>((set, get) => ({
  ready: false,
  today: toDateStr(new Date()),
  profile: null,
  settings: repo.DEFAULT_SETTINGS,
  todayRecord: emptyDay('', 8),
  streak: noStreak,
  missions: [],
  boss: null,
  todayEvents: [],
  weekWorkouts: 0,
  books: [],
  levelUpTick: 0,
  weekDamage: [],
  pendingChest: null,
  owned: [],
  equipped: [],
  unlocked: {},
  stats: emptyStats(),
  toasts: [],

  async load() {
    const db = await getDb();
    const today = toDateStr(new Date());
    const [profile, settings] = [await repo.getProfile(db), await repo.getSettings(db)];
    if (!profile) return set({ ready: true, profile: null, settings, today });

    const days = await repo.getDays(db);
    let boss = await repo.getBoss(db, weekStart(today));
    if (!boss) {
      boss = bossForDate(null, today, profile.level);
      await repo.saveBoss(db, boss);
    }
    const daily = await repo.getDailyMissions(db, today, () => pickDailyMissions(today).map((m) => m.id));
    const [todayEvents, weekWorkouts] = [await repo.getEventsByDate(db, today), await repo.countWorkouts(db, weekStart(today), addDays(weekStart(today), 6))];
    const [weekDamage, pendingChest, inv, unlocked, counts] = [
      await repo.getWeekDamage(db, weekStart(today), addDays(weekStart(today), 6)), await repo.getPendingChest(db),
      await repo.getInventory(db), await repo.getUnlocked(db), await repo.getCounts(db),
    ];
    const books = summarizeBooks(await repo.getReadingEvents(db));
    const streak = computeStreak(days, profile.createdDate, today);
    const stats: AchStats = {
      ...emptyStats(), ...counts,
      perfectDays: days.filter((d) => pillarsDone(d) >= 3).length, activeDays: streak.activeDays, bestStreak: streak.bestStreak,
      level: profile.level, maxAttrLevel: Math.max(...Object.values(profile.attrs).map((a) => a.level)), items: inv.owned.length, intelectoLevel: profile.attrs.intelecto.level,
    };
    set({
      books, weekDamage, pendingChest, owned: inv.owned, equipped: inv.equipped, unlocked, stats,
      ready: true,
      todayEvents,
      weekWorkouts,
      today,
      profile,
      settings,
      boss,
      todayRecord: days.find((d) => d.date === today) ?? emptyDay(today, settings.waterGoal),
      streak,
      missions: daily.map((d) => ({ ...missionById(d.id)!, completed: d.completed })),
    });
  },

  async completeOnboarding({ name, avatar, ...settings }) {
    const db = await getDb();
    await repo.createProfile(db, name.trim(), avatar, toDateStr(new Date()));
    await repo.saveSettings(db, settings);
    await get().load();
  },

  completeMission: (id) => mutate({ mission: id }),
  undoMission: (id) => mutate({ undoMission: id }),
  addWater: () => mutate({ water: 'add' }),
  undoWater: () => mutate({ water: 'undo' }),
  addWorkout: (w) => mutate({ workout: w }),
  addStudy: (s) => mutate({ study: s }),
  removeEvent: (id) => mutate({ remove: id }),
  setMeal: (slot, rating, tags) => mutate({ meal: { slot, rating, tags } }),
  clearMeal: (slot) => mutate({ meal: { slot } }),

  openChest: () => enqueue(async () => {
    const db = await getDb();
    const boss = await repo.getPendingChest(db);
    if (!boss) return null;
    const reward = chestReward(boss.weekStart, (await repo.getInventory(db)).owned);
    let claimed = false;
    await db.withTransactionAsync(async () => {
      claimed = await repo.claimChest(db, boss.weekStart); // UPDATE condicional: só a primeira abertura passa
      if (!claimed) return;
      await repo.addCoins(db, reward.coins);
      if (reward.itemId) await repo.addItem(db, reward.itemId, toDateStr(new Date()), 'bau');
    });
    if (!claimed) return null;
    await get().load();
    await evaluate();
    return { ...reward, weekStart: boss.weekStart };
  }),

  buy: (itemId) => enqueue(async () => {
    const db = await getDb();
    const [p, inv] = [await repo.getProfile(db), await repo.getInventory(db)];
    if (!p) return { ok: false, reason: 'inexistente' } as Purchase;
    const res = purchase(p.coins, inv.owned, itemId);
    if (!res.ok) return res;
    await db.withTransactionAsync(async () => {
      await repo.addCoins(db, res.coins - p.coins);
      await repo.addItem(db, itemId, toDateStr(new Date()), 'loja');
      await repo.setEquipped(db, toggleEquip(inv.equipped, res.owned, itemId)); // compra já equipa
    });
    await get().load();
    await evaluate();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    return res;
  }),

  equip: (itemId) => enqueue(async () => {
    const db = await getDb();
    const inv = await repo.getInventory(db);
    await repo.setEquipped(db, toggleEquip(inv.equipped, inv.owned, itemId));
    await get().load();
    Haptics.selectionAsync().catch(() => {});
  }),

  dismissToast: () => set((s) => ({ toasts: s.toasts.slice(1) })),
}));

/** Desbloqueia as conquistas cujo critério foi cumprido (estado já recarregado) e enfileira o banner. */
async function evaluate() {
  const { stats, unlocked } = useGame.getState();
  const fresh = newlyUnlocked(stats, Object.keys(unlocked));
  if (!fresh.length) return;
  const db = await getDb();
  const today = toDateStr(new Date());
  await db.withTransactionAsync(async () => {
    for (const x of fresh) {
      await repo.unlockAchievement(db, x.id, today);
      await repo.addCoins(db, x.coins);
    }
  });
  await useGame.getState().load();
  useGame.setState((s) => ({ toasts: [...s.toasts, ...fresh.map((x) => x.id)] }));
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

type Op = {
  mission?: string;
  undoMission?: string;
  water?: 'add' | 'undo';
  workout?: WorkoutInput;
  study?: StudyInput;
  remove?: number;
  meal?: { slot: MealSlot; rating?: MealRating; tags?: MealTag[] };
};

let chain: Promise<unknown> = Promise.resolve();
/** Toques rápidos (vários copos seguidos) viram uma fila: cada operação lê o estado já gravado pela anterior. */
function enqueue<R>(fn: () => Promise<R>): Promise<R> {
  const run = chain.then(fn);
  chain = run.catch(() => {});
  return run;
}
const mutate = (op: Op) => enqueue(() => apply(op));

const rewardOf = (e: repo.EventRow): Reward => ({ xp: e.xp, coins: e.coins, attr: e.attr, bossDamage: e.bossDamage });

async function apply(op: Op) {
  const g = useGame.getState();
  if (toDateStr(new Date()) !== g.today) await g.load(); // virou o dia com o app aberto
  const { profile, boss, settings, today, missions, todayEvents } = useGame.getState();
  if (!profile || !boss) return;

  type Add = { type: EventType; ref?: string; reward: Reward; data?: object };
  const revert: repo.EventRow[] = [];
  const adds: Add[] = [];
  const goal = useGame.getState().todayRecord.waterGoal;
  const waters = todayEvents.filter((e) => e.type === 'water');
  const bonus = todayEvents.find((e) => e.type === 'water_goal');

  const ts = Date.now();

  if (op.mission !== undefined) {
    const m = missions.find((x) => x.id === op.mission);
    if (!m || m.completed || m.auto) return; // automáticas só se concluem pela regra
    adds.push({ type: 'mission', ref: m.id, reward: missionReward(m) });
  } else if (op.undoMission !== undefined) {
    const m = missions.find((x) => x.id === op.undoMission);
    const e = todayEvents.find((x) => x.type === 'mission' && x.ref === op.undoMission);
    if (!m || m.auto || !e) return;
    revert.push(e);
  } else if (op.water === 'add') {
    if (waters.length >= MAX_CUPS_PER_DAY) return;
    adds.push({ type: 'water', reward: REWARDS.water });
    if (waterBonusAction(waters.length + 1, goal, !!bonus) === 'grant') adds.push({ type: 'water_goal', reward: WATER_GOAL_BONUS });
  } else if (op.water === 'undo') {
    const last = waters[waters.length - 1];
    if (!last) return;
    revert.push(last);
    if (bonus && waterBonusAction(waters.length - 1, goal, true) === 'revoke') revert.push(bonus);
  } else if (op.workout) {
    const { kind, intensity, name } = op.workout;
    const minutes = clampMinutes(op.workout.minutes);
    adds.push({ type: 'workout', reward: workoutReward(minutes, intensity), data: { kind, minutes, intensity, ...(name ? { name } : {}) } });
  } else if (op.study) {
    const { kind, title, pages } = op.study;
    const minutes = clampStudyMinutes(op.study.minutes);
    const pg = kind === 'leitura' ? clampPages(pages ?? 0) : 0;
    const t = title?.trim().slice(0, 80);
    adds.push({ type: 'study', reward: studyReward(minutes, kind, pg), data: { kind, minutes, ...(t ? { title: t } : {}), ...(pg ? { pages: pg } : {}) } });
  } else if (op.remove !== undefined) {
    const e = todayEvents.find((x) => x.id === op.remove && (x.type === 'workout' || x.type === 'meal' || x.type === 'study'));
    if (!e) return;
    revert.push(e);
  } else if (op.meal) {
    const { slot, rating, tags = [] } = op.meal;
    const old = todayEvents.find((e) => e.type === 'meal' && e.ref === slot);
    if (old) revert.push(old);
    if (rating) {
      const uniq = [...new Set(tags)];
      adds.push({ type: 'meal', ref: slot, reward: mealReward(rating, uniq), data: { rating, tags: uniq } });
    } else if (!old) return;
  }

  // missões automáticas: conclui as que a regra agora cumpre e desfaz as que deixaram de cumprir (ex.: copo desfeito)
  const gone = new Set(revert.map((e) => e.id));
  const after: DayEvent[] = [
    ...todayEvents.filter((e) => !gone.has(e.id)),
    ...adds.map((a) => ({ type: a.type, ref: a.ref ?? null, ts, data: (a.data as Record<string, unknown>) ?? null })),
  ];
  for (const m of missions) {
    if (!m.auto) continue;
    const done = autoMissionDone(m.auto, after, goal);
    const ev = todayEvents.find((e) => e.type === 'mission' && e.ref === m.id);
    if (done && !m.completed) adds.push({ type: 'mission', ref: m.id, reward: missionReward(m), data: { auto: true } });
    else if (!done && m.completed && ev?.data?.auto && !gone.has(ev.id)) revert.push(ev);
  }
  if (!revert.length && !adds.length) return;

  const before: GameState = { level: profile.level, xp: profile.xp, coins: profile.coins, attrs: profile.attrs, boss };
  const { state, applied, levelUp } = applyChanges(before, revert.map(rewardOf), adds.map((a) => a.reward));

  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const e of revert) await repo.deleteEvent(db, e.id);
    for (const [i, a] of adds.entries()) {
      await repo.insertEvent(db, { ts, date: today, type: a.type, ref: a.ref, data: a.data, ...applied[i] });
    }
    await repo.saveProgress(db, state);
    await repo.saveBoss(db, state.boss);
    await repo.recomputeDay(db, today, settings.waterGoal);
    for (const e of revert) if (e.type === 'mission' && e.ref) await repo.setMissionCompleted(db, today, e.ref, false);
    for (const a of adds) if (a.type === 'mission' && a.ref) await repo.setMissionCompleted(db, today, a.ref, true);
  });

  await useGame.getState().load(); // recalcula dia, streak, lista de hoje e chefão a partir do banco
  const defeated = before.boss.hp > 0 && state.boss.hp === 0;
  if (levelUp || defeated) {
    useGame.setState({ levelUpTick: useGame.getState().levelUpTick + 1 });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  } else if (adds.some((a) => a.type === 'mission')) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  await evaluate();
}

const missionReward = (m: Mission): Reward => ({ xp: m.xp, coins: m.coins, attr: m.attr, bossDamage: MISSION_BOSS_DAMAGE });
