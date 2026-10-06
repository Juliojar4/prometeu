import { ACHIEVEMENTS, achievementProgress, AchStats, emptyStats, newlyUnlocked } from './achievements';
import { BOSSES, bossInfoForWeek, newBoss } from './boss';
import { chestReward, CHEST_ALL_OWNED_BONUS, CHEST_MAX_COINS, CHEST_MIN_COINS } from './chest';
import { addDays } from './dates';
import { applyChanges } from './actions';
import { initialAttributes } from './attributes';
import { autoMissionDone, MISSIONS } from './missions';
import { hash, rng } from './rng';
import { ITEMS, itemById, lookOf, purchase, toggleEquip } from './shop';
import { computeStreak, DayRecord, MAX_SHIELDS } from './streak';

const day = (date: string, pillars: number): DayRecord => ({ date, water: pillars >= 1 ? 8 : 0, waterGoal: 8, workout: pillars >= 2, meals: pillars >= 3 ? 3 : 0 });
const run = (start: string, pattern: number[]) => pattern.map((p, i) => day(addDays(start, i), p));
const at = (h: number, m = 0) => new Date(2026, 9, 6, h, m).getTime(); // 06/10/2026 local

describe('chefao semanal', () => {
  it('tem pelo menos 6 criaturas, com ids e nomes unicos', () => {
    expect(BOSSES.length).toBeGreaterThanOrEqual(6);
    expect(new Set(BOSSES.map((b) => b.id)).size).toBe(BOSSES.length);
    expect(new Set(BOSSES.map((b) => b.name)).size).toBe(BOSSES.length);
  });
  it('e deterministico: a semana toda tem a mesma criatura', () => {
    const mon = '2026-10-05';
    for (let i = 0; i < 7; i++) expect(bossInfoForWeek(addDays(mon, i)).id).toBe(bossInfoForWeek(mon).id);
  });
  it('troca na segunda e roda por todas as criaturas antes de repetir', () => {
    const ids = Array.from({ length: BOSSES.length }, (_, w) => bossInfoForWeek(addDays('2026-10-05', 7 * w)).id);
    expect(new Set(ids).size).toBe(BOSSES.length);
    expect(bossInfoForWeek(addDays('2026-10-05', 7 * BOSSES.length)).id).toBe(ids[0]);
    expect(bossInfoForWeek('2026-10-12').id).not.toBe(bossInfoForWeek('2026-10-11').id);
  });
  it('newBoss usa o nome do catalogo e zera o HP na nova semana', () => {
    const b = newBoss('2026-10-07', 1);
    expect(b.name).toBe(bossInfoForWeek('2026-10-05').name);
    expect(b.hp).toBe(b.maxHp);
  });
  it('desfazer devolve o HP exato tirado (sem passar do maximo)', () => {
    const boss = { ...newBoss('2026-10-06', 1), hp: 10 };
    const s = { level: 1, xp: 0, coins: 0, attrs: initialAttributes(), boss };
    const hit = { xp: 5, coins: 2, attr: 'energia' as const, bossDamage: 30 };
    const { state, applied } = applyChanges(s, [], [hit]);
    expect(state.boss.hp).toBe(0);
    expect(applied[0].bossDamage).toBe(10); // dano real, limitado ao HP restante
    expect(applyChanges(state, applied, []).state.boss.hp).toBe(10);
  });
});

describe('bau', () => {
  it('e deterministico para a mesma semente e fica na faixa', () => {
    const a = chestReward('2026-10-05', []);
    expect(chestReward('2026-10-05', [])).toEqual(a);
    expect(a.coins).toBeGreaterThanOrEqual(CHEST_MIN_COINS);
    expect(a.coins).toBeLessThanOrEqual(CHEST_MAX_COINS);
    expect(a.coins % 5).toBe(0);
    expect(itemById(a.itemId!)).toBeDefined();
  });
  it('aceita semente injetavel e varia entre semanas', () => {
    expect(chestReward('x', [], () => 0)).toEqual({ coins: CHEST_MIN_COINS, itemId: ITEMS[0].id });
    expect(chestReward('x', [], () => 0.999).itemId).toBe(ITEMS[ITEMS.length - 1].id);
    const itens = new Set(Array.from({ length: 12 }, (_, i) => chestReward(`2026-W${i}`, []).itemId));
    expect(itens.size).toBeGreaterThan(1);
  });
  it('nunca sorteia item ja possuido', () => {
    const owned = ITEMS.slice(1).map((i) => i.id);
    for (let i = 0; i < 20; i++) expect(chestReward(`w${i}`, owned).itemId).toBe(ITEMS[0].id);
  });
  it('possuindo tudo: sem item e moedas extras', () => {
    const r = chestReward('2026-10-05', ITEMS.map((i) => i.id), () => 0);
    expect(r.itemId).toBeNull();
    expect(r.coins).toBe(CHEST_MIN_COINS + CHEST_ALL_OWNED_BONUS);
  });
  it('rng/hash: mesma semente, mesma sequencia', () => {
    expect(rng(hash('a'))()).toBe(rng(hash('a'))());
    expect(rng(hash('a'))()).not.toBe(rng(hash('b'))());
  });
});

describe('missoes automaticas', () => {
  const ev = (type: string, ts: number, data: Record<string, unknown> | null = null, ref: string | null = null) => ({ type, ts, data, ref });
  const rule = (id: string) => MISSIONS.find((m) => m.id === id)!.auto;

  it('ha missoes automaticas e manuais', () => {
    expect(MISSIONS.filter((m) => m.auto).length).toBeGreaterThanOrEqual(8);
    expect(MISSIONS.filter((m) => !m.auto).length).toBeGreaterThan(10);
    expect(autoMissionDone(undefined, [ev('water', at(8))], 8)).toBe(false);
  });
  it('2 copos antes das 10h usa o horario dos eventos', () => {
    expect(autoMissionDone(rule('agua-cedo'), [ev('water', at(7)), ev('water', at(9, 59))], 8)).toBe(true);
    expect(autoMissionDone(rule('agua-cedo'), [ev('water', at(7)), ev('water', at(10))], 8)).toBe(false);
    expect(autoMissionDone(rule('agua-cedo'), [ev('water', at(7))], 8)).toBe(false);
  });
  it('metade da meta ate o meio-dia acompanha a meta do usuario', () => {
    const copos = (n: number) => Array.from({ length: n }, () => ev('water', at(11)));
    expect(autoMissionDone(rule('agua-metade'), copos(4), 8)).toBe(true);
    expect(autoMissionDone(rule('agua-metade'), copos(4), 10)).toBe(false);
    expect(autoMissionDone(rule('agua-metade'), copos(5), 10)).toBe(true);
  });
  it('treino: tipo e minutos minimos', () => {
    const w = (kind: string, minutes: number) => ev('workout', at(18), { kind, minutes });
    expect(autoMissionDone(rule('forca-alongar'), [w('alongamento', 5)], 8)).toBe(true);
    expect(autoMissionDone(rule('forca-alongar'), [w('alongamento', 4)], 8)).toBe(false);
    expect(autoMissionDone(rule('forca-alongar'), [w('corrida', 30)], 8)).toBe(false);
    expect(autoMissionDone(rule('forca-treino'), [w('corrida', 30)], 8)).toBe(true);
    expect(autoMissionDone(rule('forca-caminhada'), [w('caminhada', 20)], 8)).toBe(true);
  });
  it('refeicao: tag, turno e nota; desfazer o evento desfaz a regra', () => {
    const meal = (slot: string, rating: string, tags: string[]) => ev('meal', at(12), { rating, tags }, slot);
    expect(autoMissionDone(rule('vit-fruta'), [meal('lanche', 'ok', ['fruta'])], 8)).toBe(true);
    expect(autoMissionDone(rule('vit-fruta'), [meal('lanche', 'ok', ['verdura'])], 8)).toBe(false);
    expect(autoMissionDone(rule('vit-cafe'), [meal('cafe', 'bom', [])], 8)).toBe(true);
    expect(autoMissionDone(rule('vit-cafe'), [meal('cafe', 'ruim', [])], 8)).toBe(false);
    expect(autoMissionDone(rule('vit-cafe'), [meal('almoco', 'bom', [])], 8)).toBe(false);
    expect(autoMissionDone(rule('vit-fruta'), [], 8)).toBe(false);
  });
});

describe('streak: casos de borda dos escudos', () => {
  it('escudo consumido mantem a chama, registra o dia e zera o saldo', () => {
    const s = computeStreak(run('2026-01-01', [2, 2, 2, 2, 2, 2, 2, 0, 2]), '2026-01-01', '2026-01-09');
    expect(s.lastShieldUse).toBe('2026-01-08');
    expect(s.shields).toBe(0);
    expect(s.streak).toBe(8);
  });
  it('varios dias falhos seguidos gastam um escudo por dia e depois quebram', () => {
    // 14 dias ativos = 2 escudos; 3 dias falhos: 2 cobertos, o 3o zera
    const base = Array(14).fill(2);
    const s2 = computeStreak(run('2026-01-01', [...base, 0, 0]), '2026-01-01', '2026-01-17');
    expect(s2.shields).toBe(0);
    expect(s2.streak).toBe(14);
    expect(s2.tired).toBe(false);
    const s3 = computeStreak(run('2026-01-01', [...base, 0, 0, 0]), '2026-01-01', '2026-01-18');
    expect(s3.streak).toBe(0);
    expect(s3.tired).toBe(true);
    expect(computeStreak(run('2026-01-01', [...base, 0, 0, 0, 2]), '2026-01-01', '2026-01-18').streak).toBe(1);
  });
  it('maximo de 3: o excedente nao acumula e o proximo escudo so vem ao gastar', () => {
    const s = computeStreak(run('2026-01-01', Array(35).fill(2)), '2026-01-01', '2026-02-04');
    expect(s.shields).toBe(MAX_SHIELDS);
    expect(s.nextShieldIn).toBe(0);
    const gasto = computeStreak(run('2026-01-01', [...Array(35).fill(2), 0, 2]), '2026-01-01', '2026-02-06');
    expect(gasto.shields).toBe(MAX_SHIELDS - 1);
  });
  it('risco: hoje sem 2 pilares com chama acesa; guardado quando ja ativo', () => {
    const d = run('2026-01-01', [2, 2, 1]);
    expect(computeStreak(d, '2026-01-01', '2026-01-03').atRisk).toBe(true);
    expect(computeStreak(run('2026-01-01', [2, 2, 2]), '2026-01-01', '2026-01-03').atRisk).toBe(false);
    expect(computeStreak(run('2026-01-01', [0, 0, 0]), '2026-01-01', '2026-01-03').atRisk).toBe(false);
  });
  it('conta o proximo escudo e a melhor sequencia', () => {
    const s = computeStreak(run('2026-01-01', [2, 2, 2, 0, 0, 2]), '2026-01-01', '2026-01-06');
    expect(s.bestStreak).toBe(3);
    expect(s.nextShieldIn).toBe(7 - 4);
  });
});

describe('conquistas', () => {
  it('ha pelo menos 20, ids unicos, alvo positivo e iniciam bloqueadas', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    expect(ACHIEVEMENTS.every((a) => a.target > 0 && a.icon && a.name && a.desc)).toBe(true);
    expect(newlyUnlocked(emptyStats(), []).map((a) => a.id)).toEqual([]); // nivel 1 nao desbloqueia nada
  });
  it('desbloqueia ao atingir o alvo e nao repete', () => {
    const s: AchStats = { ...emptyStats(), water: 1 };
    expect(newlyUnlocked(s, []).map((a) => a.id)).toEqual(['primeira-gota']);
    expect(newlyUnlocked(s, ['primeira-gota'])).toEqual([]);
  });
  it('varias de uma vez, em ordem do catalogo', () => {
    const s: AchStats = { ...emptyStats(), water: 60, workouts: 1, bestStreak: 3 };
    expect(newlyUnlocked(s, []).map((a) => a.id)).toEqual(['primeira-gota', 'rio-que-corre', 'primeiro-treino', 'chama-acesa']);
  });
  it('progresso vai de 0 a 1 e satura', () => {
    const a = ACHIEVEMENTS.find((x) => x.id === 'rio-que-corre')!;
    expect(achievementProgress(a, { ...emptyStats(), water: 25 })).toBe(0.5);
    expect(achievementProgress(a, { ...emptyStats(), water: 500 })).toBe(1);
    expect(achievementProgress(a, emptyStats())).toBe(0);
  });
});

describe('loja', () => {
  it('catalogo: ids unicos, precos positivos, 2+ temas extras e todas as categorias', () => {
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
    expect(ITEMS.every((i) => i.price > 0)).toBe(true);
    expect(ITEMS.filter((i) => i.category === 'tema').length).toBeGreaterThanOrEqual(2);
    for (const c of ['cor', 'acessorio', 'tema', 'pet']) expect(ITEMS.some((i) => i.category === c)).toBe(true);
  });
  it('compra com saldo suficiente debita o preco', () => {
    const it = ITEMS[0];
    expect(purchase(it.price, [], it.id)).toEqual({ ok: true, coins: 0, owned: [it.id] });
  });
  it('recusa saldo insuficiente, item repetido e item inexistente', () => {
    const it = ITEMS[0];
    expect(purchase(it.price - 1, [], it.id)).toEqual({ ok: false, reason: 'saldo' });
    expect(purchase(1000, [it.id], it.id)).toEqual({ ok: false, reason: 'possui' });
    expect(purchase(1000, [], 'nao-existe')).toEqual({ ok: false, reason: 'inexistente' });
  });
  it('equipar troca o item do mesmo slot e desequipar remove', () => {
    const owned = ['cor-egeu', 'cor-ares', 'acc-elmo', 'acc-capa'];
    let eq = toggleEquip([], owned, 'cor-egeu');
    eq = toggleEquip(eq, owned, 'acc-elmo');
    eq = toggleEquip(eq, owned, 'acc-capa');
    expect(eq).toEqual(['cor-egeu', 'acc-elmo', 'acc-capa']); // slots diferentes convivem
    eq = toggleEquip(eq, owned, 'cor-ares');
    expect(eq).toEqual(['acc-elmo', 'acc-capa', 'cor-ares']); // mesma cor: troca
    expect(toggleEquip(eq, owned, 'acc-capa')).toEqual(['acc-elmo', 'cor-ares']);
  });
  it('so equipa o que possui; dois adornos de cabeca nao convivem', () => {
    expect(toggleEquip([], [], 'cor-egeu')).toEqual([]);
    expect(toggleEquip(['acc-elmo'], ['acc-elmo', 'acc-louros'], 'acc-louros')).toEqual(['acc-louros']);
  });
  it('lookOf resume cor, adornos, pet e tema equipados', () => {
    const l = lookOf(['cor-egeu', 'acc-capa', 'pet-coruja', 'tema-egeu', 'fantasma']);
    expect(l.cor?.id).toBe('cor-egeu');
    expect(l.acc.map((a) => a.id)).toEqual(['acc-capa']);
    expect(l.pet?.ref).toBe('owl');
    expect(l.tema?.ref).toBe('egeu');
    expect(lookOf([])).toEqual({ cor: null, acc: [], pet: null, tema: null });
  });
});
