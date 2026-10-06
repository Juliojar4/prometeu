import { applyReward, REWARDS, GameState } from './actions';
import { addAttrXp, initialAttributes } from './attributes';
import { bossForDate, bossMaxHp, damageBoss, isDefeated, newBoss } from './boss';
import { addDays, daysBetween, toDateStr, weekStart } from './dates';
import { MISSIONS, pickDailyMissions } from './missions';
import { computeStreak, DayRecord, isActiveDay } from './streak';
import { applyXp, xpForNextLevel } from './xp';

describe('xp', () => {
  it('curva 100 x nivel^1.5 arredondada', () => {
    expect(xpForNextLevel(1)).toBe(100);
    expect(xpForNextLevel(2)).toBe(283);
    expect(xpForNextLevel(4)).toBe(800);
    expect(xpForNextLevel(10)).toBe(3162);
  });
  it('aplica XP sem subir', () => {
    expect(applyXp({ level: 1, xp: 10 }, 50)).toEqual({ level: 1, xp: 60, levelsGained: 0 });
  });
  it('sobe um nivel carregando o resto', () => {
    expect(applyXp({ level: 1, xp: 90 }, 30)).toEqual({ level: 2, xp: 20, levelsGained: 1 });
  });
  it('sobe varios niveis de uma vez', () => {
    // 100 + 283 + 520 = 903 -> nivel 4 com 7 de sobra
    expect(applyXp({ level: 1, xp: 0 }, 910)).toEqual({ level: 4, xp: 7, levelsGained: 3 });
  });
  it('ignora XP negativo', () => {
    expect(applyXp({ level: 2, xp: 5 }, -50)).toEqual({ level: 2, xp: 5, levelsGained: 0 });
  });
});

describe('atributos', () => {
  it('niveis separados', () => {
    const a = addAttrXp(initialAttributes(), 'forca', 150);
    expect(a.levelsGained).toBe(1);
    expect(a.attrs.forca).toEqual({ level: 2, xp: 50 });
    expect(a.attrs.vitalidade).toEqual({ level: 1, xp: 0 });
    expect(a.attrs.energia).toEqual({ level: 1, xp: 0 });
  });
});

describe('datas', () => {
  it('formata, soma e mede dias', () => {
    expect(toDateStr(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(addDays('2026-02-27', 3)).toBe('2026-03-02');
    expect(daysBetween('2026-01-01', '2026-01-31')).toBe(30);
  });
  it('weekStart devolve a segunda-feira', () => {
    expect(weekStart('2026-10-05')).toBe('2026-10-05'); // segunda
    expect(weekStart('2026-10-11')).toBe('2026-10-05'); // domingo
    expect(weekStart('2026-10-06')).toBe('2026-10-05');
  });
});

const day = (date: string, pillars: number): DayRecord => ({
  date,
  water: pillars >= 1 ? 8 : 0,
  waterGoal: 8,
  workout: pillars >= 2,
  meals: pillars >= 3 ? 3 : 0,
});
const run = (start: string, pattern: number[]) => pattern.map((p, i) => day(addDays(start, i), p));

describe('streak', () => {
  it('dia ativo = 2 de 3 pilares', () => {
    expect(isActiveDay(day('2026-01-01', 1))).toBe(false);
    expect(isActiveDay(day('2026-01-01', 2))).toBe(true);
    expect(isActiveDay(day('2026-01-01', 3))).toBe(true);
  });
  it('conta dias ativos seguidos; hoje sem atividade nao pune', () => {
    const days = run('2026-01-01', [2, 3, 2, 0]);
    const s = computeStreak(days, '2026-01-01', '2026-01-04');
    expect(s.streak).toBe(3);
    expect(s.tired).toBe(false);
  });
  it('dia falho sem escudo zera e deixa cansado no dia seguinte', () => {
    const days = run('2026-01-01', [2, 2, 0, 0]);
    const s = computeStreak(days, '2026-01-01', '2026-01-04');
    expect(s.streak).toBe(0);
    expect(s.tired).toBe(true);
    // ficou ativo hoje -> descansado
    const s2 = computeStreak([...days.slice(0, 3), day('2026-01-04', 2)], '2026-01-01', '2026-01-04');
    expect(s2.streak).toBe(1);
    expect(s2.tired).toBe(false);
  });
  it('+1 escudo a cada 7 dias ativos e escudo protege dia falho automaticamente', () => {
    const days = run('2026-01-01', [2, 2, 2, 2, 2, 2, 2, 0, 2]);
    const s = computeStreak(days, '2026-01-01', '2026-01-09');
    expect(s.activeDays).toBe(8);
    expect(s.streak).toBe(8); // escudo cobriu o dia 8, streak intacto
    expect(s.shields).toBe(0);
    expect(s.tired).toBe(false);
  });
  it('maximo de 3 escudos', () => {
    const days = run('2026-01-01', Array(35).fill(2));
    const s = computeStreak(days, '2026-01-01', '2026-02-04');
    expect(s.shields).toBe(3);
    expect(computeStreak(run('2026-01-01', Array(42).fill(2)), '2026-01-01', '2026-02-11').shields).toBe(3);
  });
  it('dias ausentes (sem registro) contam como falhos', () => {
    const s = computeStreak([day('2026-01-01', 2)], '2026-01-01', '2026-01-03');
    expect(s.streak).toBe(0);
    expect(s.tired).toBe(true);
  });
});

describe('chefao', () => {
  it('HP cresce com o nivel', () => {
    expect(bossMaxHp(1)).toBe(400);
    expect(bossMaxHp(3)).toBe(460);
  });
  it('dano reduz HP e nao fica negativo', () => {
    const b = newBoss('2026-10-06', 1);
    expect(damageBoss(b, 100).hp).toBe(300);
    const dead = damageBoss(b, 9999);
    expect(dead.hp).toBe(0);
    expect(isDefeated(dead)).toBe(true);
  });
  it('reseta na segunda-feira', () => {
    const b = damageBoss(newBoss('2026-10-06', 1), 100);
    expect(bossForDate(b, '2026-10-11', 5)).toBe(b); // domingo: mesma semana
    const next = bossForDate(b, '2026-10-12', 5); // segunda
    expect(next.weekStart).toBe('2026-10-12');
    expect(next.hp).toBe(bossMaxHp(5));
  });
});

describe('missoes', () => {
  it('tem pelo menos 30 missoes com ids unicos', () => {
    expect(MISSIONS.length).toBeGreaterThanOrEqual(30);
    expect(new Set(MISSIONS.map((x) => x.id)).size).toBe(MISSIONS.length);
  });
  it('sorteio e deterministico, distinto e varia por data', () => {
    const a = pickDailyMissions('2026-10-06');
    expect(a).toHaveLength(3);
    expect(new Set(a.map((x) => x.id)).size).toBe(3);
    expect(pickDailyMissions('2026-10-06')).toEqual(a);
    const others = Array.from({ length: 10 }, (_, i) => pickDailyMissions(addDays('2026-10-07', i)).map((x) => x.id).join());
    expect(new Set([a.map((x) => x.id).join(), ...others]).size).toBeGreaterThan(5);
  });
});

describe('applyReward', () => {
  const base = (): GameState => ({ level: 1, xp: 0, coins: 0, attrs: initialAttributes(), boss: newBoss('2026-10-06', 1) });
  it('aplica XP geral, atributo, moedas e dano', () => {
    const r = applyReward(base(), REWARDS.workout);
    expect(r.state.xp).toBe(60);
    expect(r.state.coins).toBe(15);
    expect(r.state.attrs.forca.xp).toBe(60);
    expect(r.state.attrs.energia.xp).toBe(0);
    expect(r.state.boss.hp).toBe(370);
    expect(r.levelsGained).toBe(0);
  });
  it('reporta subida de nivel', () => {
    const s = { ...base(), xp: 70 };
    const r = applyReward(s, REWARDS.workout);
    expect(r.levelsGained).toBe(1);
    expect(r.state.level).toBe(2);
    expect(r.state.xp).toBe(30);
  });
});
