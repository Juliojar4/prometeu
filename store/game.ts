import * as Haptics from 'expo-haptics';
import { create } from 'zustand';
import { getDb } from '../lib/db';
import * as repo from '../lib/db/repos';
import {
  AchStats, addDays, applyChanges, ATTRS, AttrKey, scoreFromXp, autoMissionDone, Boss, bossCombat, BossCombat, bossForDate, bossInfoForWeek, canAttack, chargeBalance,
  Charges, chargesFor, chargesLabel, clampMinutes, computeStreak, DayEvent, DayRecord, emptyStats, EventType, GameState, Hero,
  heroHpNow, heroStats, Intensity, MAX_CUPS_PER_DAY, MealRating, MealSlot, MealTag, mealReward, clampPages, clampStudyMinutes, noCharges, resolveRound, roundSeed,
  studyReward, StudyKind, summarizeBooks, BookSummary, Mission, missionById, newlyUnlocked, pickDailyMissions, pillarsDone, Purchase, purchase,
  Reward, REWARDS, StreakState, toDateStr, toggleEquip, waterBonusAction, WATER_GOAL_BONUS, weekStart, WorkoutKind, workoutReward,
  bossMaxHp, canChangeClass, ClassId, contemplation, dodgeReady, rescaleBoss, secondWind, secondWindReady, vigorReady,
  activeFx, canCast, castable, castSpell, Fx, knownSpells, PrepResult, preparedSlots, sparkBalance, sparkCap, Spell, SpellId, togglePrepared,
  bestGeared, bossPower, buyGear as buyGearRule, chestLoot, ChestLoot, equipGear as equipGearRule, gearById, GearBuy, gearLocked, GearSlot, Loadout, LoadoutResult,
  RelicReady, relicReady, toggleAttune, unequipGear as unequipGearRule, DUP_COINS,
} from '../lib/game';

export type DailyMission = Mission & { completed: boolean };
export type StudyInput = { kind: StudyKind; minutes: number; title?: string; pages?: number };
export type WorkoutInput = { kind: WorkoutKind; minutes: number; intensity: Intensity; name?: string; quick?: string }; // quick = id do treino rápido
type Onboarding = { name: string; avatar: string; cls: ClassId } & repo.Settings;
/**
 * Estado do combate, todo derivado do banco em load(). `rounds` = últimas rodadas da semana (mais recente primeiro).
 * `ready` = talentos de uso diário ainda disponíveis hoje (Segundo fôlego, Esquiva, Vigor).
 */
export type Combat = {
  charges: Charges; hero: Hero; heroHp: number; retreated: boolean; boss: BossCombat; rounds: repo.RoundRow[];
  ready: { folego: boolean; esquiva: boolean; vigor: boolean };
  /** Etapa D: centelhas (saldo derivado dos dias − magias), teto, efeitos ativos hoje e magias prontas para conjurar. */
  sparks: number; sparkMax: number; fx: Fx; spells: Spell[]; slots: number;
  /** Etapa E: habilidades de lendários ainda disponíveis (Perseu e Giges hoje, Mnemósine na semana); `locked` = já lutou hoje (arsenal travado). */
  relic: RelicReady; locked: boolean;
};

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
  gearOwned: string[]; // equipamentos de combate possuídos (Etapa E)
  loadout: Loadout; // equipados e sintonizados
  unlocked: Record<string, string>; // conquista -> data
  stats: AchStats;
  toasts: string[]; // ids de conquistas recém-desbloqueadas aguardando o banner
  combat: Combat | null;
  chargeNote: { text: string; tick: number } | null; // "+1 carga de Força" ao registrar um hábito
  /** Uma rodada com uma carga do atributo. `null` se não pode atacar (sem carga, recuou hoje, chefão caído). */
  attack: (attr: AttrKey) => Promise<repo.RoundRow | null>;
  /** Segundo fôlego do Hoplita (nível 5+): cura sem gastar carga; o monstro contra-ataca. */
  catchBreath: () => Promise<repo.RoundRow | null>;
  /** Conjura uma magia preparada (gasta centelhas, não cargas; o monstro contra-ataca). */
  cast: (spell: SpellId) => Promise<repo.RoundRow | null>;
  /** Prepara/desprepara uma magia do grimório (1 troca por dia). */
  togglePrepare: (spell: SpellId) => Promise<PrepResult>;
  /** Escolhe ou troca a classe. `false` se ainda está no intervalo de 7 dias. */
  chooseClass: (cls: ClassId) => Promise<boolean>;
  dismissChargeNote: () => void;
  load: () => Promise<void>;
  completeOnboarding: (o: Onboarding) => Promise<void>;
  /** Conclui uma missão manual do dia. As automáticas se concluem sozinhas ao cumprir a regra. */
  completeMission: (id: string) => Promise<void>;
  /** Desfaz uma missão manual concluída hoje, devolvendo XP/moedas/dano. */
  undoMission: (id: string) => Promise<void>;
  /** Abre o baú do chefão derrotado (uma única vez por chefão). `null` se não há baú. */
  openChest: () => Promise<(ChestLoot & { weekStart: string }) | null>;
  /** Armaria: compra um equipamento (e já equipa se o slot está vazio e o arsenal não está travado). */
  buyGear: (id: string) => Promise<GearBuy>;
  /** Arsenal: equipa, desequipa e sintoniza. Recusa ('travado') se já houve rodada hoje. */
  equipGear: (id: string) => Promise<LoadoutResult | { ok: false; reason: 'travado' }>;
  unequipGear: (slot: GearSlot) => Promise<LoadoutResult | { ok: false; reason: 'travado' }>;
  attune: (slot: GearSlot) => Promise<LoadoutResult | { ok: false; reason: 'travado' }>;
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
  gearOwned: [],
  loadout: { equipped: {}, attuned: [] },
  unlocked: {},
  stats: emptyStats(),
  toasts: [],
  combat: null,
  chargeNote: null,

  async load() {
    const db = await getDb();
    const today = toDateStr(new Date());
    const [profile, settings] = [await repo.getProfile(db), await repo.getSettings(db)];
    if (!profile) return set({ ready: true, profile: null, settings, today });

    const days = await repo.getDays(db);
    const gear = await repo.getGear(db);
    const hero = heroStats(profile.level, profile.attrs, gear.loadout.equipped, profile.cls, gear.loadout.attuned);
    // dano médio por carga contra esta criatura: o herói sem itens + parte do ganho do MELHOR arsenal que possui (não o vestido)
    const bc = bossCombat(bossInfoForWeek(today), profile.level);
    const bare = heroStats(profile.level, profile.attrs, {}, profile.cls);
    const power = bossPower(bare, bestGeared(profile.level, profile.attrs, profile.cls, gear.owned, bc), bc);
    let boss = await repo.getBoss(db, weekStart(today));
    if (!boss) {
      boss = bossForDate(null, today, power); // HP pela ficha do herói na abertura da semana
      await repo.saveBoss(db, boss);
    } else if (await repo.isLegacyBoss(db, boss.weekStart)) {
      // chefão aberto na escala antiga (400+): mesma fração de vida na escala nova, uma única vez
      const scaled = rescaleBoss(boss, bossMaxHp(boss.weekStart, power));
      if (await repo.rescaleLegacyBoss(db, scaled)) boss = scaled;
    }
    const [earned, spent, rounds, heroDay] = [await repo.getChargeRows(db), await repo.getSpentRows(db), await repo.getWeekRounds(db, boss.weekStart), await repo.getHeroDay(db, today)];
    const slots = preparedSlots(hero.cls, hero.scores.intelecto);
    if (profile.cls && profile.spells === null) { // grimório nunca aberto: já vem com as primeiras magias anotadas
      profile.spells = knownSpells(profile.level).slice(0, slots).map((x) => x.id);
      await repo.setSpells(db, profile.spells, null);
    }
    const combat: Combat = {
      sparks: sparkBalance(days, await repo.getSparksSpent(db), sparkCap(profile.level, profile.cls)),
      sparkMax: sparkCap(profile.level, profile.cls), slots,
      fx: activeFx(await repo.getDayRounds(db, today)),
      spells: castable(profile.spells ?? [], profile.level, slots),
      charges: chargeBalance(earned, spent, boss.weekStart), hero, retreated: heroDay.retreated,
      heroHp: heroHpNow(hero.maxHp, heroDay.damage, heroDay.retreated),
      boss: bossCombat(bossInfoForWeek(boss.weekStart), profile.level), rounds: rounds.slice(0, 6),
      ready: {
        folego: secondWindReady(hero.cls, hero.level, heroDay.folego),
        esquiva: dodgeReady(hero.cls, hero.level, heroDay.esquiva),
        vigor: vigorReady(hero.cls, hero.level, heroDay.vigor),
      },
      relic: relicReady(hero, { perseu: heroDay.perseu, giges: heroDay.giges, mnemosine: rounds.filter((r) => r.fx.includes('mnemosine')).length }),
      locked: gearLocked(heroDay.rounds),
    };
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
      level: profile.level, maxAttrScore: Math.max(...ATTRS.map((a) => scoreFromXp(profile.attrs[a]))), items: inv.owned.length, intelectoScore: scoreFromXp(profile.attrs.intelecto),
      gearItems: gear.owned.length, legendaries: gear.owned.filter((id) => gearById(id)?.rarity === 'lendario').length,
      attunedGear: gear.loadout.attuned.length, gearSlots: Object.keys(gear.loadout.equipped).length,
    };
    set({
      combat,
      books, weekDamage, pendingChest, owned: inv.owned, equipped: inv.equipped, unlocked, stats, gearOwned: gear.owned, loadout: gear.loadout,
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

  async completeOnboarding({ name, avatar, cls, ...settings }) {
    const db = await getDb();
    await repo.createProfile(db, name.trim(), avatar, toDateStr(new Date()), cls);
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
    const gear = await repo.getGear(db);
    const reward = chestLoot(boss.weekStart, (await repo.getInventory(db)).owned, gear.owned);
    const date = toDateStr(new Date());
    let claimed = false;
    await db.withTransactionAsync(async () => {
      claimed = await repo.claimChest(db, boss.weekStart); // UPDATE condicional: só a primeira abertura passa
      if (!claimed) return;
      if (reward.itemId) await repo.addItem(db, reward.itemId, date, 'bau');
      // equipamento: INSERT OR IGNORE; se já existia (duplicata), vira moedas, sem duplicar nem perder
      if (reward.gearId && !reward.dup && !(await repo.addGear(db, reward.gearId, date, 'bau'))) reward.dup = DUP_COINS[gearById(reward.gearId)!.rarity];
      await repo.addCoins(db, reward.coins + reward.dup);
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

  buyGear: (id) => enqueue(async () => {
    const db = await getDb();
    const [p, gear] = [await repo.getProfile(db), await repo.getGear(db)];
    if (!p) return { ok: false, reason: 'inexistente' } as GearBuy;
    const res = buyGearRule(p.coins, gear.owned, id);
    if (!res.ok) return res;
    const today = toDateStr(new Date());
    const free = !gear.loadout.equipped[gearById(id)!.slot] && !gearLocked((await repo.getHeroDay(db, today)).rounds);
    const next = free ? equipGearRule(gear.loadout, res.owned, id) : null;
    await db.withTransactionAsync(async () => {
      await repo.addCoins(db, res.coins - p.coins);
      await repo.addGear(db, id, today, 'loja');
      if (next?.ok) await repo.setLoadout(db, next.loadout); // slot vazio: já equipa (e sintoniza, se houver vaga)
    });
    await get().load();
    await evaluate();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    return res;
  }),
  equipGear: (id) => regear((l, owned) => equipGearRule(l, owned, id)),
  unequipGear: (slot) => regear((l) => ({ ok: true, loadout: unequipGearRule(l, slot) })),
  attune: (slot) => regear((l) => toggleAttune(l, slot)),

  dismissToast: () => set((s) => ({ toasts: s.toasts.slice(1) })),
  dismissChargeNote: () => set({ chargeNote: null }),

  attack: (attr) => fight(attr),
  catchBreath: () => fight('folego'),
  cast: (spell) => fight({ spell }),

  togglePrepare: (id) => enqueue(async () => {
    const db = await getDb();
    const { profile: p, combat } = useGame.getState();
    const today = toDateStr(new Date());
    if (!p || !combat) return { ok: false, reason: 'inexistente' } as PrepResult;
    const res = togglePrepared(p.spells ?? [], id, p.level, combat.slots, p.spellsSwapped, today);
    if (!res.ok) return res;
    await repo.setSpells(db, res.prepared, res.swap ? today : null);
    await get().load();
    Haptics.selectionAsync().catch(() => {});
    return res;
  }),

  chooseClass: (cls) => enqueue(async () => {
    const db = await getDb();
    const p = await repo.getProfile(db);
    const today = toDateStr(new Date());
    if (!p || p.cls === cls) return !!p;
    if (p.cls && !canChangeClass(p.classChanged, today)) return false;
    await repo.setClass(db, cls, p.cls ? today : null); // a primeira escolha não inicia o intervalo de troca
    await get().load();
    await evaluate();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    return true;
  }),
}));

/** Muda o arsenal fora de combate: travado no dia em que já houve rodada (gearLocked). Tudo numa transação. */
const regear = (f: (l: Loadout, owned: string[]) => LoadoutResult) => enqueue(async (): Promise<LoadoutResult | { ok: false; reason: 'travado' }> => {
  const db = await getDb();
  if (gearLocked((await repo.getHeroDay(db, toDateStr(new Date()))).rounds)) return { ok: false, reason: 'travado' };
  const gear = await repo.getGear(db);
  const res = f(gear.loadout, gear.owned);
  if (!res.ok) return res;
  await db.withTransactionAsync(() => repo.setLoadout(db, res.loadout));
  await useGame.getState().load();
  await evaluate();
  Haptics.selectionAsync().catch(() => {});
  return res;
});

/** Uma rodada: golpe com uma carga do atributo, o Segundo fôlego ('folego', sem carga) ou uma magia (centelhas). */
const fight = (move: AttrKey | 'folego' | { spell: SpellId }) => enqueue(async (): Promise<repo.RoundRow | null> => {
  if (toDateStr(new Date()) !== useGame.getState().today) await useGame.getState().load(); // meia-noite: PV cheios de novo
  const { boss, combat, today, profile } = useGame.getState();
  if (!boss || !combat || !profile) return null;
  const spell = typeof move === 'object' ? combat.spells.find((x) => x.id === move.spell) : null;
  if (typeof move === 'object' ? !spell || !canCast(spell, combat.sparks, combat.fx, combat.heroHp, boss.hp, combat.relic.mnemosine)
    : move === 'folego' ? !combat.ready.folego || combat.heroHp <= 0 || boss.hp <= 0 || combat.heroHp >= combat.hero.maxHp
    : !canAttack(combat.charges, move, combat.heroHp, boss.hp)) return null;
  const db = await getDb();
  const idx = await repo.nextRoundIdx(db);
  const base = { seed: roundSeed(boss.weekStart, idx), hero: combat.hero, heroHp: combat.heroHp, boss: combat.boss, bossHp: boss.hp, fx: combat.fx, relic: combat.relic };
  const r = spell ? castSpell({ ...base, spell: spell.id, dodge: combat.ready.esquiva })
    : move === 'folego' ? secondWind(base) : resolveRound({ ...base, attr: move as AttrKey, dodge: combat.ready.esquiva, vigor: combat.ready.vigor });
  const ts = Date.now();
  await db.withTransactionAsync(async () => {
    await repo.insertRound(db, idx, ts, today, boss.weekStart, r, profile.cls);
    await repo.saveBoss(db, { ...boss, hp: r.bossHp });
  });
  await useGame.getState().load();
  if (r.defeated) useGame.setState((s) => ({ levelUpTick: s.levelUpTick + 1 }));
  enqueue(evaluate).catch(() => {}); // conquistas depois, sem segurar a animação da rodada
  return { ...r, id: 0, idx, ts, date: today };
});

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
      if (x.gear) await repo.addGear(db, x.gear, today, 'conquista'); // INSERT OR IGNORE: nunca duplica
    }
  });
  await useGame.getState().load();
  useGame.setState((s) => ({ toasts: [...s.toasts, ...fresh.map((x) => x.id)] }));
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  if (fresh.some((x) => x.gear)) await evaluate(); // o item da conquista pode destravar outra (primeiro lendário)
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

const rewardOf = (e: repo.EventRow): Reward => ({ xp: e.xp, coins: e.coins, attr: e.attr as AttrKey, bossDamage: e.bossDamage });

async function apply(op: Op) {
  const g = useGame.getState();
  if (toDateStr(new Date()) !== g.today) await g.load(); // virou o dia com o app aberto
  const { profile, boss, settings, today, missions, todayEvents } = useGame.getState();
  if (!profile || !boss) return;

  type Add = { type: EventType; ref?: string; reward: Reward; data?: object; charges?: number };
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
    const { kind, intensity, name, quick } = op.workout;
    const minutes = clampMinutes(op.workout.minutes);
    adds.push({ type: 'workout', reward: workoutReward(minutes, intensity, kind, quick), data: { kind, minutes, intensity, ...(name ? { name } : {}), ...(quick ? { quick } : {}) } });
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

  // cargas de ataque: por pilar/marco, com teto diário em treino e estudo (contando as que ficam hoje)
  const used: Record<string, number> = {};
  for (const e of todayEvents) if (!gone.has(e.id)) used[e.type] = (used[e.type] ?? 0) + e.charges;
  let studied = (useGame.getState().todayRecord.study ?? 0) - revert.reduce((n, e) => n + (e.type === 'study' ? Number(e.data?.minutes ?? 0) : 0), 0);
  for (const a of adds) {
    let bonus = 0;
    if (a.type === 'study') { // Contemplação (Filósofo 5+): a sessão que cruza o pilar do dia ganha +1 carga
      const min = Number((a.data as { minutes?: number } | undefined)?.minutes ?? 0);
      bonus = contemplation(profile.cls, profile.level, studied, studied + min, await weekContemplations(today));
      studied += min;
      if (bonus) a.data = { ...a.data, contemplacao: 1 };
    }
    a.charges = chargesFor(a.type, a.data as Record<string, unknown> | undefined, used[a.type] ?? 0, bonus);
    used[a.type] = (used[a.type] ?? 0) + a.charges;
  }
  const chargesBefore = useGame.getState().combat?.charges ?? noCharges();
  const sparksBefore = useGame.getState().combat?.sparks ?? 0;

  const before: GameState = { level: profile.level, xp: profile.xp, coins: profile.coins, boss };
  const { state, applied, levelUp } = applyChanges(before, revert.map(rewardOf), adds.map((a) => a.reward));

  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const e of revert) await repo.deleteEvent(db, e.id);
    for (const [i, a] of adds.entries()) {
      await repo.insertEvent(db, { ts, date: today, type: a.type, ref: a.ref, data: a.data, ...applied[i], charges: a.charges ?? 0 });
    }
    await repo.saveProgress(db, state);
    await repo.saveBoss(db, state.boss);
    await repo.recomputeDay(db, today, settings.waterGoal);
    for (const e of revert) if (e.type === 'mission' && e.ref) await repo.setMissionCompleted(db, today, e.ref, false);
    for (const a of adds) if (a.type === 'mission' && a.ref) await repo.setMissionCompleted(db, today, a.ref, true);
  });

  await useGame.getState().load(); // recalcula dia, streak, lista de hoje e chefão a partir do banco
  const chargesAfter = useGame.getState().combat?.charges ?? noCharges();
  const gained = Object.fromEntries(ATTRS.map((k) => [k, chargesAfter[k] - chargesBefore[k]])) as Charges;
  const sparked = (useGame.getState().combat?.sparks ?? 0) - sparksBefore; // fechou o 2º (ou o 4º) pilar do dia
  const note = [chargesLabel(gained), sparked > 0 ? `+${sparked} ${sparked === 1 ? 'centelha' : 'centelhas'}` : ''].filter(Boolean).join(' · ');
  if (note) useGame.setState((s) => ({ chargeNote: { text: note, tick: (s.chargeNote?.tick ?? 0) + 1 } }));
  const defeated = before.boss.hp > 0 && state.boss.hp === 0;
  if (levelUp || defeated) {
    useGame.setState({ levelUpTick: useGame.getState().levelUpTick + 1 });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  } else if (adds.some((a) => a.type === 'mission')) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  await evaluate();
}

const weekContemplations = async (today: string) => repo.countContemplations(await getDb(), weekStart(today), addDays(weekStart(today), 6));
const missionReward = (m: Mission): Reward => ({ xp: m.xp, coins: m.coins, attr: m.attr, bossDamage: 0 });
