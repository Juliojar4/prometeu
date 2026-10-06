import { applyChanges, applyReward, GameState, revertReward, REWARDS } from './actions';
import { initialAttributes } from './attributes';
import { newBoss } from './boss';
import {
  mealReward, MAX_WORKOUT_MIN, timerElapsed, timerMinutes, timerPause, timerRemaining, timerStart, litersLabel,
  waterBonusAction, WATER_GOAL_BONUS, workoutReward, workoutXp,
} from './habits';
import { removeXp, applyXp } from './xp';

const base = (): GameState => ({ level: 1, xp: 0, coins: 0, attrs: initialAttributes(), boss: newBoss('2026-10-06', 1) });

describe('agua', () => {
  it('copo = 5 XP de Energia', () => {
    expect(REWARDS.water.xp).toBe(5);
    expect(REWARDS.water.attr).toBe('energia');
  });
  it('bonus da meta: concede uma vez, revoga ao cair abaixo, nao duplica', () => {
    expect(waterBonusAction(7, 8, false)).toBeNull();
    expect(waterBonusAction(8, 8, false)).toBe('grant');
    expect(waterBonusAction(9, 8, true)).toBeNull();
    expect(waterBonusAction(7, 8, true)).toBe('revoke');
    // fluxo: bate meta, desfaz, refaz -> estado final igual ao de bater uma vez
    let s = base();
    for (let i = 0; i < 8; i++) s = applyReward(s, REWARDS.water).state;
    s = applyReward(s, WATER_GOAL_BONUS).state;
    const once = s;
    const added = applyChanges(once, [REWARDS.water, WATER_GOAL_BONUS], []);
    const redo = applyChanges(added.state, [], [REWARDS.water, WATER_GOAL_BONUS]);
    expect(redo.state).toEqual(once);
  });
  it('litros em pt-BR', () => {
    expect(litersLabel(5)).toBe('1,25 L');
    expect(litersLabel(8)).toBe('2 L');
  });
});

describe('treino', () => {
  it('XP = minutos x multiplicador', () => {
    expect(workoutXp(30, 'leve')).toBe(30);
    expect(workoutXp(30, 'media')).toBe(45);
    expect(workoutXp(30, 'forte')).toBe(60);
    expect(workoutXp(7, 'media')).toBe(11); // 10,5 arredonda
  });
  it('teto de 240 minutos e minimo de 1', () => {
    expect(workoutXp(9999, 'forte')).toBe(MAX_WORKOUT_MIN * 2);
    expect(workoutXp(0, 'leve')).toBe(1);
    expect(workoutXp(NaN, 'leve')).toBe(1);
  });
  it('moedas e dano no chefao tem teto', () => {
    const r = workoutReward(9999, 'forte');
    expect(r.coins).toBe(40);
    expect(r.bossDamage).toBe(60);
    expect(r.attr).toBe('forca');
  });
});

describe('refeicao', () => {
  it('nota: bom > ok > ruim > 0', () => {
    const [b, o, r] = (['bom', 'ok', 'ruim'] as const).map((n) => mealReward(n, []).xp);
    expect(b).toBeGreaterThan(o);
    expect(o).toBeGreaterThan(r);
    expect(r).toBeGreaterThan(0);
  });
  it('3 XP por tag, sem duplicar, vai para Vitalidade', () => {
    expect(mealReward('bom', ['fruta', 'verdura']).xp).toBe(26);
    expect(mealReward('ok', ['fruta', 'fruta']).xp).toBe(15);
    expect(mealReward('ruim', ['fruta', 'verdura', 'caseiro', 'sem_refri']).xp).toBe(17);
    expect(mealReward('bom', []).attr).toBe('vitalidade');
  });
});

describe('reversoes', () => {
  it('removeXp e inverso de applyXp, inclusive descendo de nivel', () => {
    const p = { level: 3, xp: 40 };
    const up = applyXp(p, 900);
    expect(removeXp(up, 900)).toEqual(p);
    expect(removeXp({ level: 1, xp: 5 }, 50)).toEqual({ level: 1, xp: 0 });
  });
  it('revertReward desfaz applyReward (XP, atributo, moedas, chefao)', () => {
    const s = base();
    const r = applyReward({ ...s, xp: 90 }, REWARDS.workout); // sobe de nivel
    expect(r.levelsGained).toBe(1);
    expect(revertReward(r.state, REWARDS.workout)).toEqual({ ...s, xp: 90 });
  });
  it('dano revertido nunca passa do HP maximo', () => {
    const s = base();
    expect(revertReward(s, REWARDS.workout).boss.hp).toBe(s.boss.maxHp);
  });
  it('applyChanges grava o dano REAL quando o chefao morre; reverter devolve so isso', () => {
    let s = base();
    s = { ...s, boss: { ...s.boss, hp: 4 } };
    const r = applyChanges(s, [], [REWARDS.workout]);
    expect(r.applied[0].bossDamage).toBe(4);
    expect(r.state.boss.hp).toBe(0);
    expect(revertReward(r.state, r.applied[0]).boss.hp).toBe(4);
  });
  it('excluir treino volta ao estado anterior', () => {
    const s = base();
    const w = workoutReward(30, 'media');
    const done = applyChanges(s, [], [w]);
    expect(applyChanges(done.state, done.applied, []).state).toEqual(s);
  });
  it('editar refeicao: troca sem duplicar XP', () => {
    const s = base();
    const first = applyChanges(s, [], [mealReward('ruim', ['fruta'])]);
    const edited = applyChanges(first.state, first.applied, [mealReward('bom', ['fruta', 'verdura'])]);
    const direct = applyChanges(s, [], [mealReward('bom', ['fruta', 'verdura'])]);
    expect(edited.state).toEqual(direct.state);
    expect(applyChanges(edited.state, edited.applied, []).state).toEqual(s);
  });
  it('undo agua desfaz copo; levelUp so se terminou em nivel maior', () => {
    const s = { ...base(), xp: 98 };
    const up = applyChanges(s, [], [REWARDS.water]);
    expect(up.levelUp).toBe(true);
    const down = applyChanges(up.state, up.applied, []);
    expect(down.levelUp).toBe(false);
    expect(down.state).toEqual(s);
  });
});

describe('cronometro por timestamps', () => {
  const T = 7 * 60_000;
  it('conta pelo relogio, pausa congela, retoma soma', () => {
    let t = timerStart({ accMs: 0, startedAt: null }, 1000);
    expect(timerElapsed(t, 61_000)).toBe(60_000);
    t = timerPause(t, 61_000);
    expect(timerElapsed(t, 999_999)).toBe(60_000); // pausado: nao avanca
    t = timerStart(t, 100_000);
    expect(timerRemaining(t, T, 160_000)).toBe(T - 120_000);
  });
  it('segundo plano: 10 min depois ja zerou, sem acumular ticks', () => {
    const t = timerStart({ accMs: 0, startedAt: null }, 0);
    expect(timerRemaining(t, T, 10 * 60_000)).toBe(0);
  });
  it('iniciar duas vezes nao reinicia; relogio recuando nao negativa', () => {
    const t = timerStart({ accMs: 0, startedAt: null }, 5);
    expect(timerStart(t, 99)).toBe(t);
    expect(timerElapsed(t, 1)).toBe(0);
  });
  it('minutos ao concluir: entre 1 e o planejado', () => {
    expect(timerMinutes(10_000, 7)).toBe(1);
    expect(timerMinutes(3 * 60_000, 7)).toBe(3);
    expect(timerMinutes(99 * 60_000, 7)).toBe(7);
  });
});
