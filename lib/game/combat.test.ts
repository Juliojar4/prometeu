import { ATTRS, scoreFromXp, SCORE_XP, type AttrKey, type AttrXp } from './attributes';
import { bossCombat, bossInfoForWeek, bossMaxHp, BOSSES } from './boss';
import { applyXp } from './xp';
import { STUDY_PILLAR_MIN } from './streak';
import { chestLoot } from './chest';
import { CLASS_IDS, contemplation, dodgeReady, secondWindReady, vigorReady, type ClassId } from './classes';
import {
  bestGeared, bossPower, CHARGE_CAP_PER_DAY, GEAR_HP_SHARE, canAttack, castSpell, chargeBalance, chargesFor, chargesLabel, expectedDamage, heroHpNow, heroMaxHp, heroStats, noCharges, relicReady, resolveRound, rollDice,
  roundSeed, secondWind, strikeDie, type ChargeRow, type Charges, type SpentRow,
} from './combat';
import { ARMORY, GEAR_PRICE, GEAR_SLOTS, gearById, GIGES, MNEMOSINE, NEMEIA, PELION, PERSEU, RARITY_BONUS, type GearItem, type Loadout } from './gear';
import { addDays } from './dates';
import { rng } from './rng';
import { castable, castFx, consumeFx, isActive, knownSpells, NO_FX, preparedSlots, sparkCap, type Fx, type Spell, type SpellId } from './spells';

const xpFor = (score: number): AttrXp => {
  const xp = SCORE_XP[score - 8];
  return { forca: xp, destreza: xp, constituicao: xp, intelecto: xp };
};

describe('cargas', () => {
  it('por pilar, sem farm de copo', () => {
    expect(chargesFor('water', null)).toBe(0);
    expect(chargesFor('water_goal', null)).toBe(2);
    expect(chargesFor('meal', { rating: 'ruim' })).toBe(1);
    expect(chargesFor('mission', null)).toBe(1);
    expect(chargesFor('workout', { minutes: 4 })).toBe(0);
    expect(chargesFor('workout', { minutes: 7 })).toBe(1); // alongamento rápido conta
    expect(chargesFor('workout', { minutes: 45 })).toBe(3);
    expect(chargesFor('workout', { minutes: 240 })).toBe(4); // teto diário
    expect(chargesFor('workout', { minutes: 45 }, 3)).toBe(1);
    expect(chargesFor('study', { minutes: 9 })).toBe(0);
    expect(chargesFor('study', { minutes: 30 })).toBe(2);
    expect(chargesFor('study', { minutes: 30 }, 4)).toBe(0);
  });
  it('treino divide entre Força e Destreza como o XP', () => {
    const rows: ChargeRow[] = [
      { date: '2026-10-06', type: 'workout', attr: 'forca', kind: 'corrida', n: 2 },
      { date: '2026-10-06', type: 'workout', attr: 'forca', kind: 'outro', n: 3 },
      { date: '2026-10-07', type: 'study', attr: 'intelecto', n: 2 },
    ];
    expect(chargeBalance(rows, [], '2026-10-05')).toEqual({ forca: 2, destreza: 3, constituicao: 0, intelecto: 2 });
  });
  it('sobra expira na segunda; dívida atravessa a semana até ser paga', () => {
    const earned: ChargeRow[] = [{ date: '2026-10-06', type: 'meal', attr: 'constituicao', n: 3 }];
    expect(chargeBalance(earned, [], '2026-10-12').constituicao).toBe(0);
    const spent: SpentRow[] = [{ week: '2026-10-05', attr: 'constituicao', n: 5 }];
    expect(chargeBalance(earned, spent, '2026-10-05').constituicao).toBe(-2);
    expect(chargeBalance(earned, spent, '2026-10-19').constituicao).toBe(-2);
    const later: ChargeRow[] = [...earned, { date: '2026-10-13', type: 'meal', attr: 'constituicao', n: 3 }];
    expect(chargeBalance(later, spent, '2026-10-12').constituicao).toBe(1);
  });
  it('desfazer uma ação com a carga já gasta vira dívida, sem devolver o dano', () => {
    const week = '2026-10-05';
    const study: ChargeRow = { date: '2026-10-06', type: 'study', attr: 'intelecto', n: 2 };
    const spent: SpentRow[] = [{ week, attr: 'intelecto', n: 2 }];
    expect(chargeBalance([study], spent, week).intelecto).toBe(0);
    const bal = chargeBalance([], spent, week); // sessão excluída: o log de combate continua lá
    expect(bal.intelecto).toBe(-2);
    expect(canAttack(bal, 'intelecto', 10, 50)).toBe(false);
    // uma sessão nova de 30 min só paga a dívida
    const paid = chargeBalance([{ ...study, date: '2026-10-07' }], spent, week);
    expect(paid.intelecto).toBe(0);
    expect(canAttack(paid, 'intelecto', 10, 50)).toBe(false);
  });
  it('rótulo do feedback', () => {
    expect(chargesLabel({ forca: 1 })).toBe('+1 carga de Força');
    expect(chargesLabel({ constituicao: 2, intelecto: 1 })).toBe('+2 cargas de Constituição · +1 de Intelecto');
  });
});

describe('herói', () => {
  it('PV, CA e proficiência', () => {
    expect(heroMaxHp(1, 0)).toBe(10);
    expect(heroMaxHp(3, 1)).toBe(25);
    expect(heroMaxHp(5, -6)).toBe(8); // 4 no nível 1 e mínimo 1 por nível depois
    const h = heroStats(1, xpFor(10));
    expect(h).toMatchObject({ ac: 10, prof: 2, maxHp: 10, weapon: undefined });
    const g = heroStats(5, xpFor(14), { arma: 'arco-teixo', escudo: 'hoplon' });
    expect(g.scores.destreza).toBe(16);
    expect(g.ac).toBe(10 + 3 + 2);
    expect(g.prof).toBe(3);
    expect(strikeDie('destreza', g.weapon)).toBe('1d8');
    expect(strikeDie('intelecto', g.weapon)).toBe('1d8');
  });
  it('PV voltam cheios no dia seguinte; recuo zera até a meia-noite', () => {
    expect(heroHpNow(10, 4, false)).toBe(6);
    expect(heroHpNow(10, 10, true)).toBe(0);
    expect(heroHpNow(10, 0, false)).toBe(10);
  });
});

describe('rodada', () => {
  const hero = heroStats(1, xpFor(10));
  const boss = bossCombat(BOSSES[1], 1);
  const round = (idx: number, attr: AttrKey = 'forca', heroHp = 10, bossHp = 80) =>
    resolveRound({ seed: roundSeed('2026-10-05', idx), attr, hero, heroHp, boss, bossHp });

  it('determinística: mesma semana e índice, mesmo resultado', () => {
    expect(round(7)).toEqual(round(7));
    expect(round(7).d20).toBe(round(7, 'intelecto').d20); // o d20 não depende da carga escolhida
    expect(round(7).bossD20).toBe(round(7, 'intelecto').bossD20);
    expect(roundSeed('2026-10-05', 1)).not.toBe(roundSeed('2026-10-12', 1));
  });
  it('d20 uniforme (aprox.) em 20 mil rodadas', () => {
    const n = 20000;
    const f = Array(21).fill(0);
    for (let i = 0; i < n; i++) f[round(i).d20]++;
    expect(f[0]).toBe(0);
    for (let k = 1; k <= 20; k++) expect(Math.abs(f[k] / n - 0.05)).toBeLessThan(0.006);
  });
  it('20 natural é crítico com dados dobrados; 1 natural erra; contra-ataque e recuo', () => {
    const rounds = Array.from({ length: 400 }, (_, i) => round(i, 'forca', 3, 80));
    const crit = rounds.find((r) => r.d20 === 20)!;
    expect(crit.hit && crit.crit).toBe(true);
    expect(crit.damage).toBeGreaterThanOrEqual(2); // 2d6 + 0
    expect(rounds.filter((r) => r.d20 === 1).every((r) => !r.hit && r.damage === 0)).toBe(true);
    expect(rounds.every((r) => r.hit === (r.d20 === 20 || (r.d20 !== 1 && r.total >= boss.ac)))).toBe(true);
    const ko = rounds.find((r) => r.bossHit && r.bossDamage >= 3)!;
    expect(ko.heroHp).toBe(0);
    expect(ko.retreated).toBe(true);
  });
  it('dados dobram no crítico', () => {
    const r = rng(1);
    for (let i = 0; i < 200; i++) {
      const v = rollDice('1d6', r, true);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(12);
    }
  });
  it('o golpe final não sofre contra-ataque e o dano é limitado ao HP', () => {
    const r = Array.from({ length: 50 }, (_, i) => round(i, 'intelecto', 10, 1)).find((x) => x.hit)!;
    expect(r).toMatchObject({ damage: 1, bossHp: 0, defeated: true, bossD20: null, bossDamage: 0, heroHp: 10 });
  });
});

// ---------- simulação de balanceamento ----------
/** Cargas por dia (índice 0 = segunda). */
type Plan = (day: number) => Partial<Charges>;
// típico (Etapa A): 3 treinos/semana de 45 XP (30 min média = 2 cargas de Força), 8 copos/dia (meta = 2),
// 2 refeições/dia (2), 30 min de estudo/dia (2 de Intelecto)
const typical: Plan = (d) => ({ constituicao: 4, intelecto: 2, forca: d % 2 === 0 && d < 6 ? 2 : 0 });
// fraco (metade): meta de água em dias alternados, 1 refeição/dia, 15 min de estudo/dia, 2 treinos curtos/semana
const weak: Plan = (d) => ({ constituicao: d % 2 === 0 ? 3 : 1, intelecto: 1, forca: d === 0 || d === 3 ? 2 : 0 });

/** Centelhas por dia (índice 0 = segunda): típico 4 pilares nos dias de treino (2) e 3 nos outros (1) = 10/semana; fraco 5/semana. */
type Sparks = (day: number) => number;
const typicalSparks: Sparks = (d) => (d % 2 === 0 && d < 6 ? 2 : 1);
const weakSparks: Sparks = (d) => [1, 0, 1, 1, 1, 0, 1][d];

/**
 * IA de conjuração: prepara a melhor magia de dano conhecida, a mais barata (Flecha), e, se houver espaço, a cura e as dádivas; em cada rodada
 * cura abaixo de 40% dos PV, lança a dádiva no começo do dia (se sobrar para o dano) e lança dano sempre que há centelhas.
 */
const DAMAGE: SpellId[] = ['prometeu', 'zeus', 'hades', 'artemis'];
const BUFFS: SpellId[] = ['atena', 'hefesto'];
function prepare(level: number, slots: number): Spell[] {
  const known = knownSpells(level).map((x) => x.id);
  const dmg = DAMAGE.filter((x) => known.includes(x));
  const order = [...new Set([dmg[0], dmg[dmg.length - 1], 'apolo', ...BUFFS, ...dmg])].filter((x): x is SpellId => !!x && known.includes(x as SpellId));
  return castable(order, level, slots);
}
function pickSpell(ready: Spell[], sparks: number, hp: number, maxHp: number, first: boolean, fx: Fx): Spell | null {
  const ok = (x: Spell) => x.cost <= sparks && !isActive(fx, x.id);
  const heal = ready.find((x) => x.id === 'apolo' && ok(x));
  if (hp <= 0.4 * maxHp && heal) return heal;
  const dmg = ready.filter((x) => DAMAGE.includes(x.id) && ok(x));
  const buff = ready.find((x) => BUFFS.includes(x.id) && ok(x));
  if (first && buff && sparks >= buff.cost + (dmg[0]?.cost ?? 0) + 1) return buff;
  return dmg[0] ?? null;
}

/**
 * Joga todas as cargas todo dia (Intelecto primeiro, o dado maior) até acabarem, recuar ou o chefão cair.
 * O HP do chefão sai da ficha do herói na segunda; o nível sobe durante a semana com `xpDay` (só os PV mudam).
 * `magic` = centelhas e magias (Etapa D): `sparks` = saldo que vem da semana anterior (não expira).
 */
function simulate(plan: Plan, week: string, xp0: number, xpDay: number, score: number, cls: ClassId | null = null, magic?: { earn: Sparks; sparks: number }, gear?: Loadout & { owned: string[] }) {
  const levelAt = (xp: number) => applyXp({ level: 1, xp: 0 }, xp).level;
  const geared = (level: number) => heroStats(level, xpFor(score), gear?.equipped ?? {}, cls, gear?.attuned);
  const bare = heroStats(levelAt(xp0), xpFor(score), {}, cls);
  const boss = bossCombat(bossInfoForWeek(week), bare.level);
  const maxHp = bossMaxHp(week, bossPower(bare, bestGeared(bare.level, xpFor(score), cls, gear?.owned ?? [], boss), boss)); // sem itens = expectedDamage(bare)
  let mused = 0, mnem = 0;
  let bossHp = maxHp, idx = 0, retreats = 0, defeatDay: number | null = null, sparks = magic?.sparks ?? 0, casts = 0;
  const c = noCharges();
  for (let day = 0; day < 7 && defeatDay === null; day++) {
    const p = plan(day);
    for (const a of ATTRS) c[a] += p[a] ?? 0;
    const hero = geared(levelAt(xp0 + xpDay * (day + 1)));
    if (magic) sparks = Math.max(sparks, Math.min(sparkCap(hero.level, cls), sparks + magic.earn(day)));
    const ready = magic ? prepare(hero.level, preparedSlots(cls, score)) : [];
    // Contemplação: estudou (cumpriu o pilar) = +1 de Intelecto, até 2 por semana e dentro do teto diário de 4
    if (p.intelecto) { const b = Math.min(contemplation(cls, hero.level, 0, STUDY_PILLAR_MIN, mused), CHARGE_CAP_PER_DAY - p.intelecto); c.intelecto += b; mused += b; }
    let hp = hero.maxHp, folego = 0, esquiva = 0, vigor = 0, fx = NO_FX, first = true, perseu = 0, giges = 0;
    while (hp > 0 && bossHp > 0) {
      const relic = relicReady(hero, { perseu, giges, mnemosine: mnem });
      const attr = (['intelecto', 'forca', 'destreza', 'constituicao'] as AttrKey[]).find((a) => c[a] >= 1);
      const spell = magic ? pickSpell(ready, relic.mnemosine ? sparks + 3 : sparks, hp, hero.maxHp, first, fx) : null;
      first = false;
      if (!attr && !spell) break;
      const base = { seed: roundSeed(week, idx++), hero, heroHp: hp, boss, bossHp, fx, relic };
      let r;
      if (hp <= hero.maxHp / 2 && secondWindReady(cls, hero.level, folego)) { // Hoplita: cura quando chega à metade
        folego++;
        r = secondWind(base);
      } else if (spell) {
        casts++;
        r = castSpell({ ...base, spell: spell.id, dodge: dodgeReady(cls, hero.level, esquiva) });
        sparks -= r.spellCost;
      } else {
        c[attr!]--;
        r = resolveRound({ ...base, attr: attr!, dodge: dodgeReady(cls, hero.level, esquiva), vigor: vigorReady(cls, hero.level, vigor) });
      }
      if (r.talent === 'esquiva') esquiva++;
      if (r.talent === 'vigor') vigor++;
      if (r.fx.includes('perseu')) perseu++;
      if (r.fx.includes('giges')) giges++;
      if (r.fx.includes('mnemosine')) mnem++;
      fx = consumeFx(r.spell && r.spellOk ? castFx(fx, r.spell) : fx, r.fx);
      bossHp = r.bossHp;
      hp = r.heroHp;
      if (r.retreated) retreats++;
    }
    if (bossHp === 0) defeatDay = day + 1;
  }
  return { defeatDay, dealt: 1 - bossHp / maxHp, retreats, maxHp, sparks, casts };
}

describe('simulação: uma semana de hábitos derrota o chefão', () => {
  // 104 semanas seguidas (13 voltas nas 8 criaturas) em 4 fases do típico (~160 XP/dia; o fraco ganha metade):
  // semana 1 (nível 1, valores 8), semana 3 (nível 5, valores 10), 1 mês (nível 7, 11), 3 meses (nível 11, 14)
  const phases = [{ name: 'semana 1', xp0: 0, score: 8 }, { name: 'semana 3', xp0: 2240, score: 10 }, { name: '1 mês', xp0: 4800, score: 11 }, { name: '3 meses', xp0: 14500, score: 14 }];
  const weeks = Array.from({ length: 104 }, (_, i) => addDays('2026-10-05', 7 * i));

  it.each(phases)('$name', ({ name, xp0, score }) => {
    const t = weeks.map((w) => simulate(typical, w, xp0, 160, score));
    const k = weeks.map((w) => simulate(weak, w, xp0, 80, score));
    const days = t.map((r) => r.defeatDay ?? 8).sort((a, b) => a - b);
    const won = t.filter((r) => r.defeatDay !== null).length / t.length;
    const median = days[Math.floor(days.length / 2)];
    const weakWon = k.filter((r) => r.defeatDay !== null).length / k.length;
    const weakDealt = k.reduce((n, r) => n + r.dealt, 0) / k.length;
    const retreatWeeks = t.filter((r) => r.retreats > 0).length / t.length;
    console.log(`${name}: típico vence ${(won * 100).toFixed(0)}% (mediana dia ${median}), recua em ${(retreatWeeks * 100).toFixed(0)}% das semanas; fraco vence ${(weakWon * 100).toFixed(0)}%, tira ${(weakDealt * 100).toFixed(0)}% do HP`);
    // medido: típico vence 78-92% (mediana dia 6; a semana 1 perde rodadas recuando com 9 PV), fraco vence 0-5% e tira ~65%
    expect(won).toBeGreaterThanOrEqual(0.75);
    expect(median).toBeGreaterThanOrEqual(5);
    expect(median).toBeLessThanOrEqual(7);
    expect(weakWon).toBeLessThanOrEqual(0.06);
    expect(weakDealt).toBeGreaterThanOrEqual(0.5);
  });

  it('valores usados na simulação batem com a tabela', () => {
    expect(scoreFromXp(xpFor(14).forca)).toBe(14);
  });
});

describe('simulação: classes equilibradas, com e sem magias (Etapas C e D)', () => {
  // 104 semanas, 4 fases; cada classe joga o mesmo plano de hábitos (classe não muda cargas). Desde a Etapa D, com centelhas
  // (o saldo passa de uma semana para a outra) e a IA de conjuração; o HP do chefão de quem tem classe supõe as magias.
  // o treino segue o estilo da classe: o Peltasta corre (Destreza) onde os outros fazem musculação (Força); mesmas cargas
  const phases = [{ name: 'semana 1', xp0: 0, score: 8 }, { name: 'semana 3', xp0: 2240, score: 10 }, { name: '1 mês', xp0: 4800, score: 11 }, { name: '3 meses', xp0: 14500, score: 14 }];
  const weeks = Array.from({ length: 104 }, (_, i) => addDays('2026-10-05', 7 * i));
  const styled = (plan: Plan, cls: ClassId): Plan => (cls !== 'peltasta' ? plan : (d) => { const p = plan(d); return { ...p, forca: 0, destreza: p.forca }; });
  const run = (plan: Plan, earn: Sparks | null, xpDay: number, xp0: number, score: number, cls: ClassId, style = true) => {
    let sparks = 0, won = 0, casts = 0;
    for (const w of weeks) {
      const r = simulate(style ? styled(plan, cls) : plan, w, xp0, xpDay, score, cls, earn ? { earn, sparks } : undefined);
      sparks = r.sparks;
      casts += r.casts;
      if (r.defeatDay !== null) won++;
    }
    return { rate: won / weeks.length, casts: casts / weeks.length };
  };

  it.each(phases)('$name', ({ name, xp0, score }) => {
    const t = CLASS_IDS.map((c) => run(typical, typicalSparks, 160, xp0, score, c)).map((x) => x.rate);
    const k = CLASS_IDS.map((c) => run(weak, weakSparks, 80, xp0, score, c)).map((x) => x.rate);
    const t0 = CLASS_IDS.map((c) => run(typical, null, 160, xp0, score, c)).map((x) => x.rate); // nunca conjura
    const k0 = CLASS_IDS.map((c) => run(weak, null, 80, xp0, score, c)).map((x) => x.rate);
    const pct = (v: number[]) => v.map((x) => `${(x * 100).toFixed(0)}%`.padStart(4)).join(' ');
    const casts = CLASS_IDS.map((c) => run(typical, typicalSparks, 160, xp0, score, c).casts.toFixed(1)).join(' ');
    console.log(`${name.padEnd(8)} | típico ${pct(t)} | sem magia ${pct(t0)} | fraco ${pct(k)} | fraco sem magia ${pct(k0)} | magias/semana ${casts}   (${CLASS_IDS.join(', ')})`);
    console.log(`${name.padEnd(8)} | Peltasta sem corrida: ${pct([run(typical, typicalSparks, 160, xp0, score, 'peltasta', false).rate])}`);
    const spread = (v: number[]) => Math.max(...v) - Math.min(...v);
    // magia é bônus (decisão do dono): quem nunca conjura não é punido
    expect(Math.min(...t0)).toBeGreaterThanOrEqual(0.65);
    expect(Math.min(...t)).toBeGreaterThanOrEqual(0.8);
    expect(Math.max(...t)).toBeLessThanOrEqual(0.97);
    expect(Math.max(...k)).toBeLessThanOrEqual(0.12);
    expect(Math.max(...k0)).toBeLessThanOrEqual(0.1);
    expect(spread(t)).toBeLessThanOrEqual(0.1); // classes a no máximo 10 pp com magia
    expect(spread(t0)).toBeLessThanOrEqual(0.08); // e 8 pp sem, como na Etapa C
  });
});

// ---------- Etapa E: equipamentos ----------
/**
 * Aquisição realista: por semana, metade das moedas do típico (~430/semana: água 147, refeições 63, estudo 56, treinos 34,
 * missões ~70, baú ~60) vai para a Armaria; a outra metade, cosméticos. O típico abre o baú toda semana (vence 65-95%;
 * otimista de propósito: os tetos ficam mais exigentes). O fraco (metade das moedas) quase nunca vence: sem baú.
 */
const TYPICAL_GEAR_COINS = 215;
const WEAK_GEAR_COINS = 100;
/**
 * IA de compra e sintonia: o melhor para qualquer classe é o que bate nas cargas que ela tem (classe não muda cargas):
 * Constituição 58%, Intelecto 29%, treino 13%; Destreza ainda dá CA. Puxar para o atributo da classe (Força no Hoplita)
 * desperdiçava a sintonia em golpes raros e abria 16 pp entre classes. Limite conhecido: um Filósofo que sintoniza tudo
 * em Intelecto (peso 1,5) chega a 95% sem magia aos 3 meses (acima da meta de 92%); com peso 1, 85%.
 */
const ATTR_W: Record<AttrKey, number> = { constituicao: 3, intelecto: 1, destreza: 0.6, forca: 0.3 };
const dieAvg = (d?: string) => (d ? (Number(d.split('d')[1]) + 1) / 2 : 3.5);
const baseValue = (g: GearItem) => (dieAvg(g.damage) - 3.5) * 3 + (g.ac ?? 0) * 1.5;
const attuneValue = (g: GearItem, _cls: ClassId) => ATTR_W[g.attr] * RARITY_BONUS[g.rarity] + (g.ability ? 2 : 0);
/** Melhor arsenal com o que possui: o melhor item de cada slot e os 3 maiores ganhos de sintonia. */
function bestLoadout(owned: string[], cls: ClassId): { loadout: Loadout; score: number } {
  const its = owned.map((id) => gearById(id)!);
  const equipped: Loadout['equipped'] = {};
  for (const slot of GEAR_SLOTS) {
    const best = its.filter((g) => g.slot === slot).sort((a, b) => baseValue(b) + attuneValue(b, cls) - baseValue(a) - attuneValue(a, cls))[0];
    if (best) equipped[slot] = best.id;
  }
  const slots = GEAR_SLOTS.filter((x) => equipped[x]);
  const attuned = slots.sort((a, b) => attuneValue(gearById(equipped[b])!, cls) - attuneValue(gearById(equipped[a])!, cls)).slice(0, 3);
  const score = slots.reduce((n, x) => n + baseValue(gearById(equipped[x])!), 0) + attuned.reduce((n, x) => n + attuneValue(gearById(equipped[x])!, cls), 0);
  return { loadout: { equipped, attuned }, score };
}
/** Arsenal na semana `week` depois de `weeks` semanas de moedas (e baús, se `chests`), comprando o que mais melhora. */
function gearAt(week: string, weeks: number, cls: ClassId, coinsPerWeek: number, chests: boolean): Loadout & { owned: string[] } {
  let coins = 0;
  const owned: string[] = [];
  for (let k = weeks; k >= 1; k--) {
    coins += coinsPerWeek;
    if (chests) {
      const l = chestLoot(addDays(week, -7 * k), [], owned);
      if (l.gearId && !l.dup) owned.push(l.gearId);
      coins += l.dup;
    }
    for (;;) {
      const now = bestLoadout(owned, cls).score;
      const buy = ARMORY.filter((g) => !owned.includes(g.id) && GEAR_PRICE[g.rarity]! <= coins)
        .map((g) => ({ g, gain: bestLoadout([...owned, g.id], cls).score - now })).sort((a, b) => b.gain - a.gain)[0];
      if (!buy || buy.gain <= 0) break;
      owned.push(buy.g.id);
      coins -= GEAR_PRICE[buy.g.rarity]!;
    }
  }
  return { ...bestLoadout(owned, cls).loadout, owned };
}

describe('equipamentos no combate (Etapa E)', () => {
  const hero = (eq: Loadout['equipped'], att?: Loadout['attuned']) => heroStats(5, xpFor(10), eq, null, att); // nível 5: PV >= 30 das rodadas
  const boss = bossCombat(BOSSES[1], 1);
  it('CA e dado da arma valem só equipados; atributo e habilidade, sintonizados', () => {
    const h = hero({ arma: 'clava-oliveira', escudo: 'hoplon' }, []);
    expect(h.scores.constituicao).toBe(10);
    expect(h.ac).toBe(12);
    expect(strikeDie('constituicao', h.weapon)).toBe('1d8'); // a arma vale também na Investida
    expect(strikeDie('intelecto', h.weapon)).toBe('1d8');
    expect(hero({ arma: 'clava-oliveira' }, ['arma']).scores.constituicao).toBe(12);
    expect(hero({ arma: PELION }, []).relics).toEqual([]);
    expect(hero({ arma: PELION }, ['arma']).relics).toEqual([PELION]);
  });
  it('o HP do chefão absorve só uma parte do ganho dos itens', () => {
    const bare = hero({});
    const geared = hero({ arma: 'clava-oliveira', anel: 'anel-policrates' });
    const p = bossPower(bare, geared, boss);
    expect(bossPower(bare, bare, boss)).toBe(expectedDamage(bare, boss));
    expect(p).toBeGreaterThan(expectedDamage(bare, boss));
    const full = bossPower(bare, geared, boss) / GEAR_HP_SHARE - expectedDamage(bare, boss) * (1 / GEAR_HP_SHARE - 1); // ganho inteiro
    expect(p).toBeLessThan(full);
  });
  const rounds = (h: ReturnType<typeof hero>, relic = {}, n = 400, attr: AttrKey = 'forca') =>
    Array.from({ length: n }, (_, i) => resolveRound({ seed: roundSeed('2026-10-05', i), attr, hero: h, heroHp: 30, boss, bossHp: 500, relic }));
  it('Lança do Pélion: crítico com 19 nos golpes com a arma, não no Raio', () => {
    const r = rounds(hero({ arma: PELION }));
    expect(r.filter((x) => x.d20 === 19).every((x) => x.crit)).toBe(true);
    expect(rounds(hero({ arma: PELION }), {}, 400, 'intelecto').filter((x) => x.d20 === 19).some((x) => x.crit)).toBe(false);
    expect(rounds(hero({ arma: 'copis-tebas' })).filter((x) => x.d20 === 19).some((x) => x.crit)).toBe(false);
  });
  it('Escudo de Perseu: vantagem (d20 nunca menor) e marca o uso', () => {
    const h = hero({ escudo: PERSEU });
    const a = rounds(h), b = rounds(h, { perseu: true });
    b.forEach((x, i) => expect(x.d20).toBeGreaterThanOrEqual(a[i].d20));
    expect(b.every((x) => x.fx.includes('perseu'))).toBe(true);
    expect(a.some((x) => x.fx.includes('perseu'))).toBe(false);
  });
  it('Anel de Giges: o acerto da criatura erra; Pele de Nemeia: −1 no dano', () => {
    const plain = rounds(hero({ anel: GIGES }));
    const giges = rounds(hero({ anel: GIGES }), { giges: true });
    plain.forEach((x, i) => { if (x.bossHit) expect([giges[i].bossDamage, giges[i].fx.includes('giges')]).toEqual([0, true]); });
    const hide = rounds(hero({ armadura: NEMEIA }));
    const armored = rounds(hero({ armadura: NEMEIA }, [])); // mesma CA, sem a habilidade
    armored.forEach((x, i) => { if (x.bossDamage) expect(hide[i].bossDamage).toBe(x.bossDamage - 1); });
    expect(hide.some((x) => x.fx.includes('nemeia'))).toBe(true);
  });
  it('Colar de Mnemósine: a magia sai de graça uma vez por semana', () => {
    const h = heroStats(1, xpFor(10), { amuleto: MNEMOSINE }, 'filosofo');
    const base = { seed: roundSeed('2026-10-05', 3), spell: 'artemis' as const, hero: h, heroHp: 20, boss, bossHp: 99 };
    expect(castSpell(base).spellCost).toBe(1);
    const free = castSpell({ ...base, relic: { mnemosine: true } });
    expect([free.spellCost, free.fx]).toEqual([0, ['mnemosine']]);
    expect(relicReady(h, { perseu: 0, giges: 0, mnemosine: 1 }).mnemosine).toBe(false);
    expect(relicReady(h, { perseu: 0, giges: 0, mnemosine: 0 })).toEqual({ perseu: false, giges: false, mnemosine: true });
  });
  it('baú: determinístico, cosmético ou equipamento, duplicata vira moedas', () => {
    const a = chestLoot('2026-10-05', [], []);
    expect(chestLoot('2026-10-05', [], [])).toEqual(a);
    const weeks = Array.from({ length: 400 }, (_, i) => chestLoot(addDays('2026-10-05', 7 * i), [], []));
    const gear = weeks.filter((x) => x.gearId).map((x) => gearById(x.gearId)!);
    expect(Math.abs(gear.length / weeks.length - 0.6)).toBeLessThan(0.07);
    expect(weeks.every((x) => !!x.gearId !== !!x.itemId)).toBe(true);
    expect(gear.some((g) => g.id === NEMEIA)).toBe(false); // só por conquista
    const legend = gear.filter((g) => g.rarity === 'lendario').length / gear.length;
    expect(legend).toBeGreaterThan(0.02);
    expect(legend).toBeLessThan(0.14);
    const w = weeks.findIndex((x) => x.gearId);
    const dup = chestLoot(addDays('2026-10-05', 7 * w), [], [weeks[w].gearId!]);
    expect(dup.gearId).toBe(weeks[w].gearId);
    expect(dup.dup).toBeGreaterThan(0);
  });
});

describe('simulação com equipamento (Etapa E)', () => {
  // mesmas 4 fases e 104 semanas; o arsenal de cada semana sai das semanas anteriores (0, 2, 4 e 13 semanas de moedas e baús)
  const phases = [{ name: 'semana 1', xp0: 0, score: 8, before: 0 }, { name: 'semana 3', xp0: 2240, score: 10, before: 2 },
    { name: '1 mês', xp0: 4800, score: 11, before: 4 }, { name: '3 meses', xp0: 14500, score: 14, before: 13 }];
  const weeks = Array.from({ length: 104 }, (_, i) => addDays('2026-10-05', 7 * i));
  const styled = (plan: Plan, cls: ClassId): Plan => (cls !== 'peltasta' ? plan : (d) => { const p = plan(d); return { ...p, forca: 0, destreza: p.forca }; });
  /** Taxa de vitória; `days` = dia médio da vitória (8 = não venceu) e `retreat` = semanas com recuo, para mostrar o progresso. */
  const stats = { days: 0, retreat: 0 };
  const run = (plan: Plan, earn: Sparks | null, xpDay: number, xp0: number, score: number, cls: ClassId, gear: (w: string) => Loadout & { owned: string[] }) => {
    let sparks = 0, won = 0;
    stats.days = 0; stats.retreat = 0;
    for (const w of weeks) {
      const r = simulate(styled(plan, cls), w, xp0, xpDay, score, cls, earn ? { earn, sparks } : undefined, gear(w));
      sparks = r.sparks;
      if (r.defeatDay !== null) won++;
      stats.days += (r.defeatDay ?? 8) / weeks.length;
      stats.retreat += (r.retreats > 0 ? 1 : 0) / weeks.length;
    }
    return won / weeks.length;
  };
  const none = () => ({ equipped: {}, attuned: [], owned: [] });

  it.each(phases)('$name', ({ name, xp0, score, before }) => {
    const pct = (v: number[]) => v.map((x) => `${(x * 100).toFixed(0)}%`.padStart(4)).join(' ');
    const typ = (c: ClassId) => (w: string) => gearAt(w, before, c, TYPICAL_GEAR_COINS, true);
    const wk = (c: ClassId) => (w: string) => gearAt(w, before, c, WEAK_GEAR_COINS, false);
    const prog = (g: (c: ClassId) => (w: string) => Loadout & { owned: string[] }) => CLASS_IDS.map((c) => { run(typical, null, 160, xp0, score, c, g(c)); return `${stats.days.toFixed(1)}d/${(stats.retreat * 100).toFixed(0)}%`; }).join(' ');
    console.log(`${name.padEnd(8)} | sem magia, dia médio/semanas com recuo: sem itens ${prog(() => none)} | com itens ${prog(typ)}`);
    const t0 = CLASS_IDS.map((c) => run(typical, null, 160, xp0, score, c, typ(c)));
    const t = CLASS_IDS.map((c) => run(typical, typicalSparks, 160, xp0, score, c, typ(c)));
    const k = CLASS_IDS.map((c) => run(weak, weakSparks, 80, xp0, score, c, wk(c)));
    const kit = CLASS_IDS.map((c) => { const l = typ(c)(weeks[52]); return `${Object.keys(l.equipped).length}/${l.attuned.length}`; }).join(' ');
    const hpUp = CLASS_IDS.map((c) => { // HP com itens / sem itens, média das 104 semanas
      const r = weeks.map((w) => simulate(typical, w, xp0, 160, score, c, undefined, typ(c)(w)).maxHp / simulate(typical, w, xp0, 160, score, c).maxHp);
      return `+${((r.reduce((x, y) => x + y, 0) / r.length - 1) * 100).toFixed(0)}%`;
    }).join(' ');
    console.log(`${name.padEnd(8)} | HP do chefão com itens: ${hpUp}`);
    console.log(`${name.padEnd(8)} | com itens: sem magia ${pct(t0)} | com magia ${pct(t)} | fraco com tudo ${pct(k)} | itens/sintonizados ${kit}   (${CLASS_IDS.join(', ')})`);
    const spread = (v: number[]) => Math.max(...v) - Math.min(...v);
    expect(Math.min(...t0)).toBeGreaterThanOrEqual(0.65);
    expect(Math.max(...t0)).toBeLessThanOrEqual(0.92);
    expect(Math.max(...t)).toBeLessThanOrEqual(0.98);
    expect(Math.max(...k)).toBeLessThanOrEqual(0.15);
    expect(spread(t0)).toBeLessThanOrEqual(0.1);
    expect(spread(t)).toBeLessThanOrEqual(0.1);
  });
});
