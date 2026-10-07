import { SCORE_XP, type AttrXp } from './attributes';
import { bossCombat, BOSSES, rescaleBoss } from './boss';
import { attackProf, canChangeClass, classById, CLASSES, contemplation, critFrom, dodgeReady, nextClassChange, secondWindReady, vigorReady } from './classes';
import { chargesFor, expectedDamage, heroStats, resolveRound, roundSeed, secondWind } from './combat';

const xpFor = (score: number): AttrXp => { const xp = SCORE_XP[score - 8]; return { forca: xp, destreza: xp, constituicao: xp, intelecto: xp }; };
const boss = bossCombat(BOSSES[1], 1);
const rounds = (cls: Parameters<typeof heroStats>[3], attr: 'forca' | 'destreza' | 'constituicao' | 'intelecto', level = 1, n = 400, extra = {}) => {
  const hero = heroStats(level, xpFor(10), {}, cls);
  return Array.from({ length: n }, (_, i) => resolveRound({ seed: roundSeed('2026-10-05', i), attr, hero, heroHp: hero.maxHp - 3, boss, bossHp: 500, ...extra }));
};

describe('classes', () => {
  it('uma por atributo, nomes próprios e dois talentos (nível 1 e 5)', () => {
    expect(CLASSES.map((c) => c.attr).sort()).toEqual(['constituicao', 'destreza', 'forca', 'intelecto']);
    expect(CLASSES.every((c) => c.talents[0].level === 1 && c.talents[1].level === 5)).toBe(true);
    expect(classById('mago')).toBeNull();
  });

  it('proficiência integral no atributo da classe e 1 a menos nos outros; sem classe, integral', () => {
    expect(attackProf('hoplita', 'forca', 3)).toBe(3);
    expect(attackProf('hoplita', 'intelecto', 3)).toBe(2);
    expect(attackProf('filosofo', 'intelecto', 2)).toBe(2);
    expect(attackProf('filosofo', 'forca', 2)).toBe(1);
    expect(attackProf(null, 'forca', 2)).toBe(2);
  });

  it('ficha: Muralha de bronze (+1 CA) e Fôlego olímpico (+2 PV por nível)', () => {
    const base = heroStats(3, xpFor(10));
    expect(heroStats(3, xpFor(10), {}, 'hoplita').ac).toBe(base.ac + 1);
    expect(heroStats(3, xpFor(10), {}, 'atleta').maxHp).toBe(base.maxHp + 6);
    expect(heroStats(3, xpFor(10), {}, 'peltasta')).toMatchObject({ ac: base.ac, maxHp: base.maxHp, cls: 'peltasta' });
  });

  it('o HP do chefão não depende da classe escolhida', () => {
    const e = CLASSES.map((c) => expectedDamage(heroStats(5, xpFor(12), {}, c.id), boss));
    expect(new Set(e).size).toBe(1);
  });

  it('sem classe, a rodada é idêntica à da Etapa B (o d20 e os dados do monstro não mudam com a classe)', () => {
    const a = rounds(null, 'forca'), b = rounds('peltasta', 'forca');
    expect(a.map((r) => r.d20)).toEqual(b.map((r) => r.d20));
    expect(a.map((r) => r.bossD20)).toEqual(b.map((r) => r.bossD20));
    expect(a.every((r) => r.talent === null && r.heal === 0)).toBe(true);
  });

  it('Mente afiada: Raio do Filósofo é crítico com 19; os outros golpes só com 20', () => {
    expect(critFrom('filosofo', 'intelecto')).toBe(19);
    expect(critFrom('filosofo', 'forca')).toBe(20);
    const r = rounds('filosofo', 'intelecto');
    expect(r.filter((x) => x.d20 === 19).every((x) => x.crit && x.hit)).toBe(true);
    expect(rounds(null, 'intelecto').filter((x) => x.d20 === 19).some((x) => x.crit)).toBe(false);
  });

  it('Golpe certeiro e Muralha de bronze aumentam o dano dos golpes do atributo', () => {
    const sum = (rs: ReturnType<typeof rounds>) => rs.reduce((n, x) => n + x.damage, 0);
    expect(sum(rounds('peltasta', 'destreza'))).toBeGreaterThan(sum(rounds(null, 'destreza')));
    const h = rounds('hoplita', 'forca'), n = rounds('atleta', 'forca'); // atleta: prof 1 a menos em Força
    expect(h.filter((x) => x.hit).every((x) => x.damage >= 3)).toBe(true); // 1d6 + 0 + 2
    expect(sum(h)).toBeGreaterThan(sum(n));
  });

  it('Vigor: +1 de dano e 1 PV no primeiro acerto de Constituição do dia', () => {
    const r = rounds('atleta', 'constituicao', 5, 50, { vigor: true }).find((x) => x.hit)!;
    expect(r).toMatchObject({ talent: 'vigor', heal: 1 });
    expect(vigorReady('atleta', 5, 0)).toBe(true);
    expect(vigorReady('atleta', 5, 1)).toBe(false);
    expect(vigorReady('atleta', 4, 0)).toBe(false);
  });

  it('Esquiva: o acerto do monstro vira raspão, sem dano', () => {
    const r = rounds('peltasta', 'destreza', 5, 80, { dodge: true }).find((x) => x.bossHit)!;
    expect(r).toMatchObject({ talent: 'esquiva', bossDamage: 0 });
    expect(r.heroHp).toBe(heroStats(5, xpFor(10), {}, 'peltasta').maxHp - 3);
    expect(dodgeReady('peltasta', 5, 1)).toBe(false);
  });

  it('Segundo fôlego: cura 1d10 + nível (até o máximo) e o monstro contra-ataca', () => {
    const hero = heroStats(5, xpFor(10), {}, 'hoplita');
    for (let i = 0; i < 40; i++) {
      const r = secondWind({ seed: roundSeed('2026-10-05', i), hero, heroHp: 4, boss, bossHp: 90 });
      expect(r.heal).toBeGreaterThanOrEqual(Math.min(6, hero.maxHp - 4));
      expect(r.heal).toBeLessThanOrEqual(15);
      expect(r).toMatchObject({ talent: 'folego', damage: 0, bossHp: 90 });
      expect(r.heroHp).toBe(4 + r.heal - r.bossDamage);
      expect(r.bossD20).not.toBeNull();
    }
    expect(secondWind({ seed: 1, hero, heroHp: hero.maxHp, boss, bossHp: 90 }).heal).toBe(0);
    expect(secondWindReady('hoplita', 5, 0)).toBe(true);
    expect(secondWindReady('hoplita', 4, 0)).toBe(false);
  });

  it('Contemplação: +1 carga na sessão que cruza o pilar, até 2 por semana, dentro do teto diário', () => {
    expect(contemplation('filosofo', 5, 0, 15, 0)).toBe(1);
    expect(contemplation('filosofo', 5, 12, 30, 0)).toBe(0); // pilar já cumprido hoje
    expect(contemplation('filosofo', 5, 0, 15, 2)).toBe(0); // já usou as 2 da semana
    expect(contemplation('filosofo', 4, 0, 15, 0)).toBe(0);
    expect(contemplation('hoplita', 9, 0, 15, 0)).toBe(0);
    expect(chargesFor('study', { minutes: 30 }, 0, 1)).toBe(3);
    expect(chargesFor('study', { minutes: 60 }, 0, 1)).toBe(4); // teto
  });

  it('troca de classe: livre na primeira escolha, depois uma a cada 7 dias', () => {
    expect(canChangeClass(null, '2026-10-06')).toBe(true);
    expect(nextClassChange('2026-10-06')).toBe('2026-10-13');
    expect(canChangeClass('2026-10-06', '2026-10-12')).toBe(false);
    expect(canChangeClass('2026-10-06', '2026-10-13')).toBe(true);
  });
});

describe('reescala do chefão da escala antiga', () => {
  it('mantém a fração de vida; vivo continua vivo e derrotado continua derrotado', () => {
    const b = { weekStart: '2026-10-05', name: 'Minotauro', maxHp: 400, hp: 334 };
    expect(rescaleBoss(b, 56)).toEqual({ ...b, maxHp: 56, hp: 47 });
    expect(rescaleBoss({ ...b, hp: 1 }, 56).hp).toBe(1);
    expect(rescaleBoss({ ...b, hp: 0 }, 56).hp).toBe(0);
    expect(rescaleBoss({ ...b, hp: 400 }, 56).hp).toBe(56);
  });
});
