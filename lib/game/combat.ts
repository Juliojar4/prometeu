import { armorClass, ATTR_LABEL, ATTRS, effectiveScore, modifier, proficiencyBonus, quickIdOf, scoreFromXp, workoutSplit, type AttrKey, type AttrXp } from './attributes';
import type { BossCombat } from './boss';
import { attackProf, classAc, classHp, critFrom, extraDie, flatDamage, HP_PROF_DISCOUNT, SECOND_WIND_DIE, type ClassId } from './classes';
import { weekStart } from './dates';
import { bonusesFor, gearById, GIGES, MNEMOSINE, NEMEIA, PELION, PERSEU, type Equipped, type GearSlot } from './gear';
import { hash, rng } from './rng';
import { ARES_CRIT, ATENA_AC, castFx, forgeBonus, HEARTH_DIE, isActive, NO_FX, POSIDON_PEN, spellById, spellDice, spellTier, type Fx, type FxTag, type Spell, type SpellId } from './spells';

/**
 * Combate por rodadas contra o chefão (Etapa B). Tudo puro: o banco guarda os eventos (que geram cargas)
 * e o log de rodadas (que as gasta); saldo, PV e resultado de cada rodada saem daqui.
 */
export type Charges = Record<AttrKey, number>;
export const noCharges = (): Charges => ({ forca: 0, destreza: 0, constituicao: 0, intelecto: 0 });

// ---------- cargas ----------
/** Treino e estudo: no máximo 4 cargas por dia cada (uma hora de esforço), contra registrar 10 sessões curtas. */
export const CHARGE_CAP_PER_DAY = 4;

/**
 * Cargas que um evento gera. Refeição e missão = 1; meta de água = 2 (o pilar inteiro, copo avulso não dá);
 * treino = 1 a cada 15 min (a partir de 5 min, para o alongamento de 7 min contar); estudo = 1 a cada 15 min
 * (a partir de 10 min, o mínimo do pilar). `usedToday` = cargas do mesmo tipo já ganhas hoje (teto diário).
 */
export function chargesFor(type: string, data?: Record<string, unknown> | null, usedToday = 0, bonus = 0): number {
  if (type === 'meal' || type === 'mission') return 1;
  if (type === 'water_goal') return 2;
  if (type !== 'workout' && type !== 'study') return 0;
  const min = Number(data?.minutes ?? 0);
  const n = (min < (type === 'workout' ? 5 : 10) ? 0 : Math.max(1, Math.floor(min / 15))) + bonus; // bonus = Contemplação (classes.ts)
  return Math.max(0, Math.min(n, CHARGE_CAP_PER_DAY - usedToday));
}

/** Cargas ganhas, agregadas por dia (events.charges). Treino divide entre Força/Destreza como o XP (workoutSplit). */
export type ChargeRow = { date: string; type: string; attr: string | null; kind?: string | null; quick?: string | null; name?: string | null; n: number };
/** Rodadas gastas por semana e atributo (uma carga por rodada). */
export type SpentRow = { week: string; attr: string; n: number };

const isAttr = (a: string): a is AttrKey => (ATTRS as string[]).includes(a);
const keepDebt = (c: Charges): Charges => ({ forca: Math.min(0, c.forca), destreza: Math.min(0, c.destreza), constituicao: Math.min(0, c.constituicao), intelecto: Math.min(0, c.intelecto) });

/**
 * Saldo de cargas na semana `week`. Sobra positiva vale só na semana em que foi ganha (o chefão é semanal);
 * dívida (desfazer uma ação cuja carga já foi gasta) atravessa semanas até ser paga por ações novas.
 */
export function chargeBalance(earned: ChargeRow[], spent: SpentRow[], week: string): Charges {
  const delta = new Map<string, Charges>();
  const add = (w: string, a: string, n: number) => {
    if (!isAttr(a) || !n) return;
    const c = delta.get(w) ?? noCharges();
    c[a] += n;
    delta.set(w, c);
  };
  for (const r of earned) {
    const w = weekStart(r.date);
    if (r.type !== 'workout') { add(w, r.attr ?? '', r.n); continue; }
    const split = Object.entries(workoutSplit(r.kind, quickIdOf(r.quick, r.name)));
    let rest = r.n; // "outro" 50/50: arredonda a primeira metade e o resto vai para a segunda
    split.forEach(([a, wgt], i) => { const v = i === split.length - 1 ? rest : Math.round(r.n * wgt!); rest -= v; add(w, a, v); });
  }
  for (const s of spent) add(s.week, s.attr, -s.n);
  const weeks = [...delta.keys()].filter((w) => w <= week).sort();
  let bal = noCharges();
  for (const w of weeks) {
    const d = delta.get(w)!;
    const base = keepDebt(bal);
    bal = { forca: base.forca + d.forca, destreza: base.destreza + d.destreza, constituicao: base.constituicao + d.constituicao, intelecto: base.intelecto + d.intelecto };
  }
  return weeks[weeks.length - 1] === week ? bal : keepDebt(bal);
}

// ---------- herói ----------
/** `relics` = lendários sintonizados (habilidades da Etapa E). */
export type Hero = { level: number; scores: Charges; prof: number; ac: number; maxHp: number; weapon?: string; cls: ClassId | null; relics: string[] };

/** PV: 10 + mod Con no nível 1 e +6 + mod Con por nível depois (dado de vida d10 na média, como um guerreiro), mínimo 1 por nível. */
export const heroMaxHp = (level: number, conMod: number) => Math.max(1, 10 + conMod) + (Math.max(1, level) - 1) * Math.max(1, 6 + conMod);

/**
 * Ficha do herói: valores efetivos (atributo dos itens sintonizados), CA (armadura e escudo equipados), proficiência,
 * PV máximo, dado da arma e classe (Muralha de bronze, Fôlego olímpico). Sem `attuned`, todo equipado conta como sintonizado.
 */
export function heroStats(level: number, attrs: AttrXp, equipped: Equipped = {}, cls: ClassId | null = null, attuned?: GearSlot[]): Hero {
  const b = bonusesFor(equipped, attuned);
  const scores = noCharges();
  for (const a of ATTRS) scores[a] = effectiveScore(scoreFromXp(attrs[a]), b.attrs[a]);
  return {
    level, scores,
    prof: proficiencyBonus(level),
    ac: armorClass(modifier(scores.destreza), b.armor, b.shield) + classAc(cls),
    maxHp: heroMaxHp(level, modifier(scores.constituicao)) + classHp(cls, level),
    weapon: equipped.arma ? gearById(equipped.arma)?.damage : undefined,
    cls, relics: b.relics,
  };
}

/** Golpe de cada carga. Sem arma: 1d6 nos físicos, 1d8 no raio (o Intelecto é o mais raro de juntar). */
export const STRIKES: Record<AttrKey, { name: string; die: string }> = {
  forca: { name: 'Golpe de Força', die: '1d6' },
  destreza: { name: 'Golpe de Destreza', die: '1d6' },
  constituicao: { name: 'Investida de Constituição', die: '1d6' },
  intelecto: { name: 'Raio do Intelecto', die: '1d8' },
};
/**
 * A arma equipada troca o dado dos golpes físicos: Força, Destreza e (Etapa E) a Investida de Constituição, que é ~58%
 * das cargas do típico; só Força/Destreza deixava a arma quase invisível. O Raio do Intelecto fica com 1d8.
 */
const physical = (attr: AttrKey) => attr !== 'intelecto';
export const strikeDie = (attr: AttrKey, weapon?: string) => (weapon && physical(attr) ? weapon : STRIKES[attr].die);

/** PV agora: cheios a cada dia; recuou hoje = 0 até a meia-noite. `damageToday` já desconta as curas (Segundo fôlego, Vigor). */
export const heroHpNow = (maxHp: number, damageToday: number, retreatedToday: boolean) =>
  retreatedToday ? 0 : Math.max(1, Math.min(maxHp, maxHp - damageToday));

/** Chance de d20 + bônus >= CA (1 natural sempre erra, 20 sempre acerta). */
const hitChance = (bonus: number, ac: number) => Math.min(0.95, Math.max(0.05, (21 + bonus - ac) / 20));
const avgDice = (die: string) => { const [n, s] = die.split('d').map(Number); return (n * (s + 1)) / 2; };
/**
 * Dano médio de uma carga contra o monstro (média dos 4 golpes, crítico incluso). Base do HP do chefão.
 * Com classe, supõe a proficiência menos HP_PROF_DISCOUNT nos 4 golpes (igual para as 4 classes, talentos de fora):
 * o HP não depende de qual classe o herói escolheu. Sem classe, proficiência integral (Etapa B). Com classe, + SPELL_HP_SHARE (magias).
 */
export function expectedDamage(hero: Hero, boss: BossCombat, mix: Charges = UNIFORM): number {
  const per = ATTRS.map((a) => {
    const mod = modifier(hero.scores[a]);
    const avg = avgDice(strikeDie(a, hero.weapon));
    return mix[a] * (hitChance(mod + hero.prof - (hero.cls ? HP_PROF_DISCOUNT : 0), boss.ac) * Math.max(1, avg + mod) + 0.05 * avg);
  });
  return per.reduce((x, y) => x + y, 0) * (hero.cls ? 1 + SPELL_HP_SHARE : 1);
}
const UNIFORM: Charges = { forca: 0.25, destreza: 0.25, constituicao: 0.25, intelecto: 0.25 };
/**
 * Etapa D: com senda, o herói também conjura (centelhas dos dias ativos, ~9 magias por semana no típico). Magia é BÔNUS:
 * o HP supõe só +11% (quem nunca conjura vence 65-84%; 0,12 derrubava a semana 1 para 64%), igual nas 4 classes.
 * Sem classe (Etapa B), nada muda.
 */
export const SPELL_HP_SHARE = 0.11;
/**
 * Etapa E: o HP do chefão parte do herói SEM equipamento e soma 90% do ganho de dano por carga do MELHOR arsenal que ele
 * possui (bestGeared; pesado pelas cargas do típico, com a ficha da classe). O progresso é o resto: os 10%, CA, PV,
 * críticos, habilidades dos lendários e o item comprado no meio da semana (o HP só é calculado na segunda).
 * A vitória é muito sensível (o típico vence no 6º/7º dia): com 0,5 todos passavam de 95% já no 1º mês; com 0,9 o
 * típico ganha +2 a +16 pp sem magia (mais no 1º mês). Calibrado em combat.test.ts.
 */
export const GEAR_HP_SHARE = 0.9;
/**
 * O ganho dos itens é pesado pelas cargas do típico (Constituição 58%, Intelecto 29%, treino 13%), não pela média dos
 * 4 golpes: com a média, um item de Constituição (a carga mais comum) mal mexia no HP e um de Força pesava demais.
 */
export const CHARGE_MIX: Charges = { forca: 0.065, destreza: 0.065, constituicao: 0.58, intelecto: 0.29 };
/**
 * Dano médio de um golpe com a ficha real (proficiência e talentos da classe, crítico do Filósofo e da Lança do Pélion).
 * Só para o ganho dos itens: o mesmo +2 de Intelecto vale mais no Raio do Filósofo do que no de um Hoplita.
 */
function strikeDamage(hero: Hero, boss: BossCombat, a: AttrKey) {
  const mod = modifier(hero.scores[a]);
  const extra = extraDie(hero.cls, a, hero.level);
  const dice = avgDice(strikeDie(a, hero.weapon)) + (extra ? avgDice(extra) : 0);
  const crit = 21 - Math.min(critFrom(hero.cls, a), hero.relics.includes(PELION) && physical(a) ? 19 : 20);
  return hitChance(mod + attackProf(hero.cls, a, hero.prof), boss.ac) * Math.max(1, dice + mod + flatDamage(hero.cls, a, hero.level)) + 0.05 * crit * dice;
}
/** Dano médio por carga que o HP do chefão supõe: o do herói sem itens + GEAR_HP_SHARE do que os itens acrescentam. */
export function bossPower(bare: Hero, geared: Hero, boss: BossCombat): number {
  return expectedDamage(bare, boss) + GEAR_HP_SHARE * Math.max(0, gearGain(bare, geared, boss)) * (bare.cls ? 1 + SPELL_HP_SHARE : 1);
}
/** Quanto os itens somam ao dano por carga, pesado pelas cargas do típico. */
const gearGain = (bare: Hero, geared: Hero, boss: BossCombat) =>
  ATTRS.reduce((n, a) => n + CHARGE_MIX[a] * (strikeDamage(geared, boss, a) - strikeDamage(bare, boss, a)), 0);

/**
 * Ficha do melhor arsenal que o herói POSSUI (não o vestido), pelo ganho de dano com a ficha da classe: a arma e até 3 sintonizados
 * de slots diferentes. É a base do HP do chefão: desequipar antes da segunda não amolece a criatura; o que se compra
 * durante a semana vale inteiro até a segunda seguinte. Busca exaustiva (~20 itens: poucos milhares de fichas, 1x por semana).
 */
export function bestGeared(level: number, attrs: AttrXp, cls: ClassId | null, owned: string[], boss: BossCombat): Hero {
  const items = owned.map((id) => gearById(id)).filter((g): g is NonNullable<typeof g> => !!g);
  const bare = heroStats(level, attrs, {}, cls);
  let best = bare, bestDmg = 0;
  for (const w of [undefined, ...items.filter((g) => g.slot === 'arma')]) {
    const pool = items.filter((g) => g.slot !== 'arma' || g === w);
    const pick = (from: number, chosen: typeof items) => {
      const equipped: Equipped = { ...(w ? { arma: w.id } : {}) };
      for (const g of chosen) equipped[g.slot] = g.id;
      const h = heroStats(level, attrs, equipped, cls, chosen.map((g) => g.slot));
      const d = gearGain(bare, h, boss);
      if (d > bestDmg) { best = h; bestDmg = d; }
      if (chosen.length === 3) return;
      for (let i = from; i < pool.length; i++) if (!chosen.some((g) => g.slot === pool[i].slot)) pick(i + 1, [...chosen, pool[i]]);
    };
    pick(0, []);
  }
  return best;
}

// ---------- dados ----------
/** Semente da rodada: semana + índice global da rodada. Fechar e reabrir o app não muda o dado. */
export const roundSeed = (week: string, idx: number) => hash(`combate:${week}:${idx}`);
const roll = (rand: () => number, sides: number) => 1 + Math.floor(rand() * sides);
/** "2d6" -> soma; crítico dobra a quantidade de dados. */
export function rollDice(die: string, rand: () => number, crit = false) {
  const [n, sides] = die.split('d').map(Number);
  let t = 0;
  for (let i = 0; i < n * (crit ? 2 : 1); i++) t += roll(rand, sides);
  return t;
}

// ---------- rodada ----------
/**
 * `dodge`/`vigor`: Esquiva e Vigor ainda disponíveis hoje (uso derivado do log de rodadas). `fx` = magias ativas hoje (Etapa D).
 * `relic`: habilidades de lendários ainda disponíveis (Etapa E; derivadas das marcas em combat_rounds.fx).
 */
export type RelicReady = { perseu?: boolean; giges?: boolean; mnemosine?: boolean };
export type RoundInput = { seed: number; attr: AttrKey; hero: Hero; heroHp: number; boss: BossCombat; bossHp: number; dodge?: boolean; vigor?: boolean; fx?: Fx; relic?: RelicReady };

/** Usos já feitos: Perseu e Giges no dia, Mnemósine na semana. */
export type RelicUse = { perseu: number; giges: number; mnemosine: number };
export const relicReady = (hero: Hero, used: RelicUse): RelicReady => ({
  perseu: hero.relics.includes(PERSEU) && used.perseu < 1,
  giges: hero.relics.includes(GIGES) && used.giges < 1,
  mnemosine: hero.relics.includes(MNEMOSINE) && used.mnemosine < 1,
});
/** `talent`: talento que agiu na rodada ('folego' = Segundo fôlego, 'esquiva', 'vigor'); `heal` = PV recuperados. */
export type Talented = 'folego' | 'esquiva' | 'vigor';
export type RoundResult = {
  attr: AttrKey; d20: number; total: number; hit: boolean; crit: boolean; damage: number; bossHp: number;
  bossD20: number | null; bossTotal: number | null; bossHit: boolean; bossCrit: boolean; bossDamage: number;
  heroHp: number; retreated: boolean; defeated: boolean; talent: Talented | null; heal: number;
  /** Etapa D: magia lançada (null nos golpes), centelhas gastas, se pegou (acertou / a criatura não resistiu) e efeitos consumidos. */
  spell: SpellId | null; spellCost: number; spellOk: boolean | null; fx: FxTag[];
};

/**
 * Contra-ataque do monstro (fluxo próprio da semente). `dodge` = Esquiva pronta: o primeiro acerto vira raspão.
 * Magias: Égide (+CA), Maré (−ataque), Sandálias (o acerto vira raspão, depois da Esquiva) e Lareira (não deixa recuar).
 */
function counter(seed: number, hero: Hero, heroHp: number, boss: BossCombat, dodge: boolean, fx: Fx, giges = false) {
  const r2 = rng(seed ^ 0x5bd1e995);
  const bossD20 = roll(r2, 20);
  const bossTotal = bossD20 + boss.atk - (fx.posidon ? POSIDON_PEN : 0);
  const bossCrit = bossD20 === 20;
  const bossHit = bossCrit || (bossD20 !== 1 && bossTotal >= hero.ac + (fx.atena ? ATENA_AC : 0));
  const dodged = bossHit && dodge;
  const vanished = bossHit && !dodged && giges; // Anel de Giges: depois da Esquiva, antes das Sandálias
  const warded = bossHit && !dodged && !vanished && fx.hermes;
  const landed = bossHit && !dodged && !vanished && !warded;
  const raw = landed ? Math.max(1, rollDice(boss.die, r2, bossCrit) + boss.dmgBonus) : 0;
  const hide = landed && hero.relics.includes(NEMEIA); // Pele de Nemeia: −1 em todo contra-ataque (pode zerar)
  let bossDamage = Math.min(heroHp, hide ? raw - 1 : raw);
  let hearth = 0;
  if (bossDamage > 0 && bossDamage >= heroHp && fx.hestia) { // a Lareira segura o golpe que faria recuar
    bossDamage = heroHp - 1;
    hearth = Math.min(hero.maxHp - 1, rollDice(HEARTH_DIE, r2) + hero.level);
  }
  return { bossD20, bossTotal, bossHit, bossCrit, bossDamage, dodged, warded, hearth, vanished, hide };
}

/**
 * Parte comum a toda rodada: o rastro da Sombra de Hades fere (fluxo próprio), a Colheita cura 1 PV,
 * e se a criatura sobrevive ela contra-ataca. `hit`/`dmg` = o que a ação do herói causou; `heal0` = cura da ação.
 */
function finish(seed: number, hero: Hero, heroHp: number, boss: BossCombat, bossHp: number, fx: Fx, dodge: boolean, giges: boolean,
  act: Pick<RoundResult, 'attr' | 'd20' | 'total' | 'hit' | 'crit' | 'talent' | 'spell' | 'spellCost' | 'spellOk'> & { dmg: number; heal0: number; tags: FxTag[] }): RoundResult {
  const tags = [...act.tags];
  const tick = fx.hades > 0 ? rollDice(spellDice(spellById('hades')!, hero.level), rng(seed ^ 0x2f6b4d1)) : 0;
  if (fx.hades > 0) tags.push('hades');
  const damage = Math.min(bossHp, act.dmg + tick);
  const left = bossHp - damage;
  const regen = fx.demeter ? 1 : 0;
  const hp0 = Math.min(hero.maxHp, heroHp + act.heal0 + regen);
  const c = left > 0 ? counter(seed, hero, hp0, boss, dodge, fx, giges) : null;
  if (c?.warded) tags.push('hermes');
  if (c?.hearth) tags.push('hestia');
  if (c?.vanished) tags.push('giges');
  if (c?.hide) tags.push('nemeia');
  const hp = hp0 - (c?.bossDamage ?? 0) + (c?.hearth ?? 0);
  const talent = c?.dodged ? 'esquiva' : act.talent;
  return {
    attr: act.attr, d20: act.d20, total: act.total, hit: act.hit, crit: act.crit, damage, bossHp: left,
    bossD20: c?.bossD20 ?? null, bossTotal: c?.bossTotal ?? null, bossHit: c?.bossHit ?? false, bossCrit: c?.bossCrit ?? false, bossDamage: c?.bossDamage ?? 0,
    heroHp: hp, retreated: hp <= 0, defeated: left <= 0, talent, heal: hp0 - heroHp + (c?.hearth ?? 0),
    spell: act.spell, spellCost: act.spellCost, spellOk: act.spellOk, fx: tags,
  };
}
const NO_SPELL = { spell: null, spellCost: 0, spellOk: null } as const;

/**
 * Uma rodada: o herói rola d20 + mod do atributo + proficiência (da classe) contra a CA do monstro (20 natural = crítico com
 * dados dobrados, 19 também no Raio do Filósofo; 1 natural = erro); se o monstro sobrevive, rola d20 + ataque contra a CA do herói.
 * Herói e monstro usam fluxos separados da mesma semente: o dado do monstro não depende da carga escolhida.
 * Danos gravados são os reais (limitados ao PV restante). Sem classe e sem magia ativa, o resultado é o mesmo da Etapa B.
 * Magias ativas: Fúria de Ares (vantagem, crítico 18-20) e Forja de Hefesto (+dano) valem para o golpe e são consumidas nele.
 */
export function resolveRound({ seed, attr, hero, heroHp, boss, bossHp, dodge = false, vigor: vigorReady = false, fx = NO_FX, relic = {} }: RoundInput): RoundResult {
  const r1 = rng(seed);
  const mod = modifier(hero.scores[attr]);
  let d20 = roll(r1, 20);
  if (fx.ares || relic.perseu) d20 = Math.max(d20, roll(r1, 20)); // Escudo de Perseu: vantagem no primeiro golpe do dia
  const total = d20 + mod + attackProf(hero.cls, attr, hero.prof);
  const pelion = hero.relics.includes(PELION) && physical(attr) ? 19 : 20; // Lança do Pélion: golpes com a arma
  const crit = d20 >= Math.min(critFrom(hero.cls, attr), fx.ares ? ARES_CRIT : 20, pelion);
  const hit = crit || (d20 !== 1 && total >= boss.ac);
  const extra = extraDie(hero.cls, attr, hero.level);
  const vigor = hit && vigorReady && attr === 'constituicao';
  const forge = hit && fx.forja > 0 ? forgeBonus(hero.level) : 0;
  const rolled = hit ? rollDice(strikeDie(attr, hero.weapon), r1, crit) + (extra ? rollDice(extra, r1, crit) : 0) + mod + flatDamage(hero.cls, attr, hero.level) + (vigor ? 1 : 0) + forge : 0;
  const tags: FxTag[] = [...(fx.forja > 0 ? ['forja' as const] : []), ...(fx.ares ? ['ares' as const] : []), ...(relic.perseu ? ['perseu' as const] : [])];
  return finish(seed, hero, heroHp, boss, bossHp, fx, dodge, !!relic.giges, {
    attr, d20, total, hit, crit, talent: vigor ? 'vigor' : null, ...NO_SPELL,
    dmg: hit ? Math.max(1, rolled) : 0, heal0: vigor ? Math.min(1, hero.maxHp - heroHp) : 0, tags,
  });
}

/** Segundo fôlego (Hoplita 5+): cura 1d10 + nível sem gastar carga; ocupa a rodada e o monstro contra-ataca. */
export function secondWind({ seed, hero, heroHp, boss, bossHp, fx = NO_FX, relic = {} }: Omit<RoundInput, 'attr' | 'dodge' | 'vigor'>): RoundResult {
  const heal = Math.min(hero.maxHp - heroHp, rollDice(SECOND_WIND_DIE, rng(seed)) + hero.level);
  return finish(seed, hero, heroHp, boss, bossHp, fx, false, !!relic.giges, { attr: 'forca', d20: 0, total: 0, hit: false, crit: false, talent: 'folego', ...NO_SPELL, dmg: 0, heal0: heal, tags: [] });
}

// ---------- magias (Etapa D) ----------
/** Proficiência em magia: a do ataque de Intelecto (integral no Filósofo, 1 a menos nas outras classes). */
export const spellAttack = (hero: Hero) => modifier(hero.scores.intelecto) + attackProf(hero.cls, 'intelecto', hero.prof);
/** CD das magias de resistência: 8 + proficiência de magia + mod de Intelecto. */
export const spellDc = (hero: Hero) => 8 + spellAttack(hero);

/**
 * Conjurar: ocupa a rodada (o monstro contra-ataca) e gasta centelhas, não cargas. O herói rola num fluxo próprio da semente
 * (`seed ^ sal da magia`): rodadas antigas não mudam e o dado do monstro é o mesmo de um golpe naquela rodada.
 * Dádivas que protegem (Égide, Sandálias, Lareira, Maré se pegar) já valem no contra-ataque desta rodada.
 * `d20`/`total` = o teste da rodada: ataque do herói ou resistência da criatura (0 nas dádivas).
 */
export function castSpell({ seed, spell: id, hero, heroHp, boss, bossHp, dodge = false, fx = NO_FX, relic = {} }: Omit<RoundInput, 'attr' | 'vigor'> & { spell: SpellId }): RoundResult {
  const s = spellById(id)!;
  const r = rng(seed ^ 0x6a09e667);
  const dice = spellDice(s, hero.level);
  let d20 = 0, total = 0, ok = true, crit = false, dmg = 0, heal0 = 0;
  if (s.kind === 'ataque') { // Flecha de Ártemis: d20 + Int + prof de magia, sem vantagem (com vantagem o fraco passava de 12%)
    d20 = roll(r, 20);
    total = d20 + spellAttack(hero);
    crit = d20 === 20;
    ok = crit || (d20 !== 1 && total >= boss.ac);
    dmg = ok ? rollDice(dice, r, crit) : 0;
  } else if (s.kind === 'resistencia') {
    d20 = roll(r, 20);
    total = d20 + boss.save;
    ok = total < spellDc(hero); // a criatura falhou
    const full = dice ? rollDice(dice, r) : 0;
    dmg = ok ? full : id === 'hades' || id === 'prometeu' ? Math.floor(full / 2) : 0; // Zeus e Maré: resistiu, nada
  } else if (dice) heal0 = Math.min(hero.maxHp - heroHp, rollDice(dice, r) + (id === 'apolo' ? hero.level : 0));
  const after = ok ? castFx(fx, id) : fx;
  return finish(seed, hero, heroHp, boss, bossHp, { ...after, hades: fx.hades, demeter: fx.demeter }, dodge, !!relic.giges,
    { attr: 'intelecto', d20, total, hit: s.kind === 'ataque' ? ok : dmg > 0, crit, talent: null, spell: id,
      spellCost: relic.mnemosine ? 0 : s.cost, spellOk: ok, dmg, heal0, tags: relic.mnemosine ? ['mnemosine'] : [] }); // Colar de Mnemósine: de graça
}

/** Pode conjurar? Centelhas suficientes (nenhuma se o Colar de Mnemósine está pronto), magia pronta, sem o mesmo efeito já ativo, PV e chefão de pé. */
export const canCast = (s: Spell, sparks: number, fx: Fx, heroHp: number, bossHp: number, free = false) =>
  sparks >= (free ? 0 : s.cost) && !isActive(fx, s.id) && heroHp > 0 && bossHp > 0;

/** Pode atacar com esta carga? Precisa de saldo >= 1, PV e chefão de pé. */
export const canAttack = (charges: Charges, attr: AttrKey, heroHp: number, bossHp: number) => charges[attr] >= 1 && heroHp > 0 && bossHp > 0;

/** "+1 carga de Força · +2 de Intelecto" (feedback ao registrar um hábito). */
export function chargesLabel(c: Partial<Charges>): string {
  const parts = ATTRS.filter((a) => (c[a] ?? 0) > 0).map((a) => ({ a, n: c[a]! }));
  return parts.map(({ a, n }, i) => (i === 0 ? `+${n} ${n === 1 ? 'carga' : 'cargas'} de ${ATTR_LABEL[a]}` : `+${n} de ${ATTR_LABEL[a]}`)).join(' · ');
}
