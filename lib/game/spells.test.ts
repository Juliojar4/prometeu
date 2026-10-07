import { SCORE_XP, type AttrXp } from './attributes';
import { bossCombat, BOSSES } from './boss';
import { canCast, castSpell, heroStats, resolveRound, roundSeed, secondWind, spellDc } from './combat';
import {
  activeFx, castable, castFx, consumeFx, NO_FX, preparedSlots, sparkBalance, sparkCap, sparksForDay, spellById, spellDice, SPELLS, spellText, togglePrepared,
  type SpellId,
} from './spells';
import type { DayRecord } from './streak';

const xpFor = (score: number): AttrXp => { const xp = SCORE_XP[score - 8]; return { forca: xp, destreza: xp, constituicao: xp, intelecto: xp }; };
const day = (date: string, pillars: number): DayRecord =>
  ({ date, water: pillars >= 1 ? 8 : 0, waterGoal: 8, workout: pillars >= 2, meals: pillars >= 3 ? 2 : 0, study: pillars >= 4 ? 10 : 0 });

describe('grimório', () => {
  it('12 magias de deuses gregos, custo 1-3, ids únicos, nada de emoji', () => {
    expect(SPELLS).toHaveLength(12);
    expect(new Set(SPELLS.map((s) => s.id)).size).toBe(12);
    expect(SPELLS.every((s) => s.cost >= 1 && s.cost <= 3)).toBe(true);
    expect(SPELLS.some((s) => /\p{Extended_Pictographic}/u.test(s.name + s.desc))).toBe(false);
    expect(spellById('prometeu')).toMatchObject({ cost: 3, level: 9 });
    expect(spellDice(spellById('zeus')!, 5)).toBe('2d4');
    expect(spellDice(spellById('artemis')!, 13)).toBe('1d4'); // a Flecha não sobe de patamar
    expect(spellText(spellById('prometeu')!, 9)).toContain('3d6');
  });

  it('preparadas = 2 + mod Int (mín. 1), Filósofo +2', () => {
    expect(preparedSlots('hoplita', 8)).toBe(1);
    expect(preparedSlots('hoplita', 14)).toBe(4);
    expect(preparedSlots('filosofo', 8)).toBe(3);
    expect(preparedSlots(null, 4)).toBe(1);
  });

  it('preparar num espaço livre é grátis; despreparar gasta a troca do dia; bloqueadas por nível', () => {
    const today = '2026-10-07';
    expect(togglePrepared([], 'zeus', 4, 2, null, today)).toEqual({ ok: false, reason: 'bloqueada' });
    expect(togglePrepared([], 'artemis', 1, 1, null, today)).toEqual({ ok: true, prepared: ['artemis'], swap: false });
    expect(togglePrepared(['artemis'], 'apolo', 1, 1, null, today)).toEqual({ ok: false, reason: 'cheio' });
    expect(togglePrepared(['artemis'], 'artemis', 1, 1, null, today)).toEqual({ ok: true, prepared: [], swap: true });
    expect(togglePrepared(['artemis'], 'artemis', 1, 1, today, today)).toEqual({ ok: false, reason: 'troca' });
    // excesso (deixou de ser Filósofo): tirar é livre
    expect(togglePrepared(['artemis', 'apolo', 'atena'], 'atena', 1, 1, today, today)).toMatchObject({ ok: true, swap: false });
    expect(castable(['artemis', 'apolo', 'atena'], 1, 1).map((s) => s.id)).toEqual(['artemis']);
  });
});

describe('centelhas', () => {
  it('+1 por dia ativo, +1 extra com os 4 pilares', () => {
    expect([0, 1, 2, 3, 4].map((p) => sparksForDay(day('2026-10-05', p)))).toEqual([0, 0, 1, 1, 2]);
  });
  it('teto 2 + nível/4 (máx. 6), Filósofo +1', () => {
    expect(sparkCap(1, 'hoplita')).toBe(2);
    expect(sparkCap(4, 'hoplita')).toBe(3);
    expect(sparkCap(11, 'hoplita')).toBe(4);
    expect(sparkCap(40, 'atleta')).toBe(6);
    expect(sparkCap(40, 'filosofo')).toBe(7);
  });
  it('acumulam sem expirar, cortadas no teto; gastas pelo log', () => {
    const days = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-12', '2026-10-13'].map((d) => day(d, 4));
    expect(sparkBalance(days, [], 3)).toBe(3);
    expect(sparkBalance(days.slice(0, 1), [], 3)).toBe(2);
    expect(sparkBalance(days, [{ date: '2026-10-13', n: 3 }], 3)).toBe(0);
    expect(sparkBalance(days.slice(0, 2), [{ date: '2026-10-06', n: 2 }], 3)).toBe(1); // 2, depois 3 − 2
  });
  it('dia desfeito depois de gastar vira dívida, paga por dias novos', () => {
    const spent = [{ date: '2026-10-05', n: 2 }];
    expect(sparkBalance([day('2026-10-05', 4)], spent, 3)).toBe(0);
    expect(sparkBalance([day('2026-10-05', 1)], spent, 3)).toBe(-2); // desfez: o dia deixou de ser ativo
    expect(sparkBalance([day('2026-10-05', 1), day('2026-10-06', 4)], spent, 3)).toBe(0);
    expect(sparkBalance([day('2026-10-05', 1), day('2026-10-06', 4), day('2026-10-07', 2)], spent, 3)).toBe(1);
  });
});

describe('conjurar', () => {
  const boss = bossCombat(BOSSES[1], 5);
  const hero = heroStats(9, xpFor(12), {}, 'filosofo');
  const cast = (spell: SpellId, i: number, fx = NO_FX, heroHp = hero.maxHp) =>
    castSpell({ seed: roundSeed('2026-10-05', i), spell, hero, heroHp, boss, bossHp: 500, fx });

  it('determinística e com fluxo próprio: o dado do monstro é o mesmo de um golpe naquela rodada', () => {
    expect(cast('artemis', 3)).toEqual(cast('artemis', 3));
    const strike = resolveRound({ seed: roundSeed('2026-10-05', 3), attr: 'forca', hero, heroHp: hero.maxHp, boss, bossHp: 500 });
    expect(cast('zeus', 3).bossD20).toBe(strike.bossD20);
    expect(cast('zeus', 3)).toMatchObject({ spell: 'zeus', spellCost: 2, attr: 'intelecto' });
  });

  it('resistência: CD = 8 + prof de magia + Int; resistir corta o dano do Fogo pela metade', () => {
    expect(spellDc(hero)).toBe(8 + 4 + 1);
    expect(spellDc(heroStats(9, xpFor(12), {}, 'hoplita'))).toBe(8 + 3 + 1);
    const rs = Array.from({ length: 300 }, (_, i) => cast('prometeu', i));
    expect(rs.every((r) => r.spellOk === r.total < spellDc(hero))).toBe(true);
    expect(rs.filter((r) => r.spellOk).every((r) => r.damage >= 3 && r.damage <= 18)).toBe(true); // 3d6
    expect(rs.filter((r) => !r.spellOk).every((r) => r.damage >= 1 && r.damage <= 9)).toBe(true);
    expect(Array.from({ length: 300 }, (_, i) => cast('zeus', i)).filter((r) => !r.spellOk).every((r) => r.damage === 0)).toBe(true); // Zeus: resistiu, nada
    expect(rs.some((r) => r.spellOk) && rs.some((r) => !r.spellOk)).toBe(true);
  });

  it('Flecha de Ártemis: ataque de magia contra a CA, 1d4', () => {
    const rs = Array.from({ length: 300 }, (_, i) => cast('artemis', i));
    const hits = rs.filter((r) => r.hit).length / rs.length;
    expect(hits).toBeGreaterThan(0.45); // bônus +5 contra CA 15: 0,55
    expect(hits).toBeLessThan(0.65);
    expect(rs.every((r) => r.damage <= (r.crit ? 8 : 4))).toBe(true);
    expect(rs.every((r) => r.hit === r.spellOk)).toBe(true);
  });

  it('Bênção de Apolo cura até o máximo; a criatura contra-ataca', () => {
    const r = cast('apolo', 1, NO_FX, 3);
    expect(r.heal).toBeGreaterThanOrEqual(3 + 9); // 3d4 (patamar 3) + nível 9
    expect(r.bossD20).not.toBeNull();
    expect(cast('apolo', 1, NO_FX, hero.maxHp).heal).toBe(0);
  });

  it('Égide (+2 CA) e Maré (−2 no ataque) valem no contra-ataque', () => {
    const rs = Array.from({ length: 300 }, (_, i) => ({ base: cast('apolo', i), egide: cast('atena', i) }));
    expect(rs.filter((x) => x.egide.bossHit).length).toBeLessThan(rs.filter((x) => x.base.bossHit).length);
    expect(rs.every((x) => x.egide.bossD20 === x.base.bossD20)).toBe(true);
    const fx = { ...NO_FX, posidon: true };
    const s = resolveRound({ seed: 7, attr: 'forca', hero, heroHp: hero.maxHp, boss, bossHp: 500, fx });
    const n = resolveRound({ seed: 7, attr: 'forca', hero, heroHp: hero.maxHp, boss, bossHp: 500 });
    expect(s.bossTotal).toBe(n.bossTotal! - 2);
  });

  it('Sandálias e Lareira: o acerto vira raspão / não deixa recuar; ficam marcados como consumidos', () => {
    const hit = Array.from({ length: 200 }, (_, i) => i).find((i) => resolveRound({ seed: i, attr: 'forca', hero, heroHp: 2, boss, bossHp: 500 }).bossHit)!;
    const w = resolveRound({ seed: hit, attr: 'forca', hero, heroHp: 2, boss, bossHp: 500, fx: { ...NO_FX, hermes: true } });
    expect(w).toMatchObject({ bossDamage: 0, heroHp: 2, fx: ['hermes'] });
    const h = resolveRound({ seed: hit, attr: 'forca', hero, heroHp: 2, boss, bossHp: 500, fx: { ...NO_FX, hestia: true } });
    expect(h.retreated).toBe(false);
    expect(h.fx).toEqual(['hestia']);
    expect(h.heroHp).toBeGreaterThanOrEqual(1 + 1 + 9);
  });

  it('Forja (+dano nos 3 golpes), Fúria (crítico 18-20) e Sombra (rastro em 2 rodadas)', () => {
    const forge = { ...NO_FX, forja: 3 };
    const a = Array.from({ length: 100 }, (_, i) => resolveRound({ seed: i, attr: 'forca', hero, heroHp: 90, boss, bossHp: 500 }));
    const b = Array.from({ length: 100 }, (_, i) => resolveRound({ seed: i, attr: 'forca', hero, heroHp: 90, boss, bossHp: 500, fx: forge }));
    expect(b.every((r, i) => r.fx.includes('forja') && (r.hit ? r.damage === a[i].damage + 4 : true))).toBe(true); // +1 + patamar 3
    const ares = Array.from({ length: 300 }, (_, i) => resolveRound({ seed: i, attr: 'forca', hero, heroHp: 90, boss, bossHp: 500, fx: { ...NO_FX, ares: true } }));
    expect(ares.filter((r) => r.d20 === 18).every((r) => r.crit)).toBe(true);
    const tick = secondWind({ seed: 5, hero, heroHp: 90, boss, bossHp: 500, fx: { ...NO_FX, hades: 2 } });
    expect(tick.damage).toBeGreaterThanOrEqual(3);
    expect(tick.fx).toEqual(['hades']);
  });

  it('efeitos ativos refeitos do log do dia; não se lança de novo o que já está ativo', () => {
    const fx = activeFx([
      { spell: 'hefesto', spellOk: true, fx: [] }, { spell: null, spellOk: null, fx: ['forja'] },
      { spell: 'posidon', spellOk: false, fx: ['forja'] }, { spell: 'hermes', spellOk: true, fx: ['forja'] },
    ]);
    expect(fx).toMatchObject({ forja: 0, posidon: false, hermes: true });
    expect(consumeFx(castFx(NO_FX, 'hades'), ['hades']).hades).toBe(1);
    expect(canCast(spellById('hermes')!, 5, fx, 10, 10)).toBe(false);
    expect(canCast(spellById('hefesto')!, 5, fx, 10, 10)).toBe(true);
    expect(canCast(spellById('zeus')!, 1, fx, 10, 10)).toBe(false);
  });
});
