import { modifier } from './attributes';
import type { ClassId } from './classes';
import { pillarsDone, type DayRecord } from './streak';

/**
 * Magias (Etapa D): o grimório é o mesmo para todas as classes; cada magia é a dádiva de um deus.
 * Moeda = centelhas (fragmentos do fogo roubado), ganhas por hábito. Tudo puro: o banco guarda os dias,
 * as magias preparadas e o log de rodadas; saldo de centelhas e efeitos ativos saem daqui.
 */
export type SpellId = 'artemis' | 'apolo' | 'atena' | 'hermes' | 'hefesto' | 'demeter' | 'ares' | 'zeus' | 'posidon' | 'hestia' | 'hades' | 'prometeu';
/** ataque = d20 + Intelecto + proficiência de magia contra a CA; resistencia = o monstro rola contra a CD; dadiva = sem teste. */
export type SpellKind = 'ataque' | 'resistencia' | 'dadiva';
export type Spell = {
  id: SpellId; name: string; god: string; icon: string; cost: number; level: number; kind: SpellKind;
  /** Efeito em uma linha; `{d}` vira o dado do patamar atual (ex.: "2d6"). */
  desc: string;
  /** Duração: 'agora' (efeito imediato), 'golpes' (próximos N golpes), 'rodadas', 'dia' (até a meia-noite, a luta). */
  lasts: 'agora' | 'proximo' | 'golpes' | 'rodadas' | 'dia';
  /** Dano/cura por patamar: `[n, lados]` vira `n x patamar` dados (patamar 1 no nível 1-4, 2 no 5-8...). */
  dice?: [number, number];
  /** Dado fixo (não sobe com o patamar): a Flecha é a magia barata de todo dia. */
  flat?: boolean;
};

/** Patamar das magias: sobe junto com a proficiência (a cada 4 níveis), como o monstro. */
export const spellTier = (level: number) => 1 + Math.floor((Math.max(1, level) - 1) / 4);
export const spellDice = (s: Spell, level: number) => (s.dice ? `${s.dice[0] * (s.flat ? 1 : spellTier(level))}d${s.dice[1]}` : '');

// Constantes dos efeitos (calibradas na simulação de combat.test.ts).
export const ATENA_AC = 2; // Égide: +2 de CA no dia
export const POSIDON_PEN = 2; // Maré: −2 no ataque do monstro no dia
export const FORGE_STRIKES = 3; // Forja: próximos 3 golpes
export const forgeBonus = (level: number) => 1 + spellTier(level); // +2 no patamar 1, +3 no 2...
export const ARES_CRIT = 18; // Fúria: próximo golpe com vantagem e crítico com 18-20
export const HADES_ROUNDS = 2; // Sombra: o rastro fere nas 2 rodadas seguintes
export const HEARTH_DIE = '1d8'; // Lareira: fica com 1 PV e recupera 1d8 + nível

export const SPELLS: Spell[] = [
  { id: 'artemis', name: 'Flecha de Ártemis', god: 'Ártemis', icon: 'bow-arrow', cost: 1, level: 1, kind: 'ataque', lasts: 'agora', dice: [1, 4], flat: true,
    desc: 'A flecha da caçadora: ataque de magia (d20 + Intelecto) contra a CA, {d} de dano.' },
  { id: 'apolo', name: 'Bênção de Apolo', god: 'Apolo', icon: 'white-balance-sunny', cost: 1, level: 1, kind: 'dadiva', lasts: 'agora', dice: [1, 4],
    desc: 'A luz do curador fecha as feridas: recupera {d} + nível PV.' },
  { id: 'atena', name: 'Égide de Atena', god: 'Atena', icon: 'shield-sun', cost: 1, level: 1, kind: 'dadiva', lasts: 'dia',
    desc: 'O escudo da deusa cobre o seu: +2 de CA até a meia-noite.' },
  { id: 'hermes', name: 'Sandálias de Hermes', god: 'Hermes', icon: 'weather-windy', cost: 1, level: 2, kind: 'dadiva', lasts: 'proximo',
    desc: 'Pés alados: o próximo golpe que te acertaria hoje passa de raspão.' },
  { id: 'hefesto', name: 'Forja de Hefesto', god: 'Hefesto', icon: 'anvil', cost: 1, level: 3, kind: 'dadiva', lasts: 'golpes',
    desc: 'O ferreiro reforja seu golpe: os próximos 3 golpes de hoje causam +{f} de dano (+1 por patamar).' },
  { id: 'demeter', name: 'Colheita de Deméter', god: 'Deméter', icon: 'barley', cost: 1, level: 3, kind: 'dadiva', lasts: 'dia', dice: [1, 4],
    desc: 'O que se planta, se colhe: recupera {d} PV agora e 1 PV a cada rodada até a meia-noite.' },
  { id: 'ares', name: 'Fúria de Ares', god: 'Ares', icon: 'axe-battle', cost: 1, level: 4, kind: 'dadiva', lasts: 'proximo',
    desc: 'A sede de guerra guia a mão: o próximo golpe de hoje tem vantagem e é crítico com 18, 19 ou 20.' },
  { id: 'zeus', name: 'Raio de Zeus', god: 'Zeus', icon: 'lightning-bolt', cost: 2, level: 5, kind: 'resistencia', lasts: 'agora', dice: [1, 4],
    desc: 'O trovão do Olimpo: {d} de dano; se a criatura resistir, o raio se perde.' },
  { id: 'posidon', name: 'Maré de Posídon', god: 'Posídon', icon: 'waves', cost: 2, level: 5, kind: 'resistencia', lasts: 'dia',
    desc: 'O mar puxa a fera para baixo: −2 no ataque da criatura até a meia-noite; se resistir, nada acontece.' },
  { id: 'hestia', name: 'Lareira de Héstia', god: 'Héstia', icon: 'fireplace', cost: 2, level: 6, kind: 'dadiva', lasts: 'proximo',
    desc: 'O fogo de casa te acolhe: se um golpe fosse te fazer recuar hoje, você fica com 1 PV e recupera 1d8 + nível.' },
  { id: 'hades', name: 'Sombra de Hades', god: 'Hades', icon: 'weather-night', cost: 2, level: 7, kind: 'resistencia', lasts: 'rodadas', dice: [1, 4],
    desc: 'A sombra do mundo dos mortos: {d} de dano agora e de novo nas 2 rodadas seguintes; se resistir, só metade agora.' },
  { id: 'prometeu', name: 'Fogo de Prometeu', god: 'Prometeu', icon: 'torch', cost: 3, level: 9, kind: 'resistencia', lasts: 'agora', dice: [1, 6],
    desc: 'O fogo roubado dos deuses, devolvido em chamas: {d} de dano; se a criatura resistir, metade.' },
];
export const spellById = (id?: string | null) => SPELLS.find((s) => s.id === id) ?? null;
export const spellText = (s: Spell, level: number) => s.desc.replace('{d}', spellDice(s, level)).replace('{f}', String(forgeBonus(level)));

// ---------- centelhas ----------
/** +1 centelha por dia ativo (2 pilares) e +1 extra no dia dos 4 pilares. */
export const sparksForDay = (d: DayRecord) => { const p = pillarsDone(d); return p >= 4 ? 2 : p >= 2 ? 1 : 0; };
/** Teto: 2 + 1 a cada 4 níveis, no máximo 6; o Filósofo guarda 1 a mais. */
export const SPARK_CAP_MAX = 6;
export const sparkCap = (level: number, cls: ClassId | null | undefined) =>
  Math.min(SPARK_CAP_MAX, 2 + Math.floor(Math.max(1, level) / 4)) + (cls === 'filosofo' ? 1 : 0);

/**
 * Saldo de centelhas: dia a dia, ganha (até o teto) e gasta (rodadas de magia do dia). Não expira na segunda.
 * Ganho acima do teto se perde. Dívida (desfazer ações e o dia deixar de ser ativo depois de gastar) fica até ser paga.
 * ponytail: o teto vem do nível/classe atuais e vale para o histórico todo; subir o teto pode revelar até 1 centelha
 * que o teto antigo cortou. Gravar o teto por dia se isso incomodar.
 */
export function sparkBalance(days: DayRecord[], spent: { date: string; n: number }[], cap: number): number {
  const earn = new Map(days.map((d) => [d.date, sparksForDay(d)]));
  const use = new Map<string, number>();
  for (const s of spent) use.set(s.date, (use.get(s.date) ?? 0) + s.n);
  let bal = 0;
  for (const date of [...new Set([...earn.keys(), ...use.keys()])].sort()) {
    bal = Math.max(bal, Math.min(cap, bal + (earn.get(date) ?? 0))) - (use.get(date) ?? 0);
  }
  return bal;
}

// ---------- grimório ----------
/** Magias preparadas: 2 + mod de Intelecto (mín. 1); o Filósofo prepara 2 a mais. */
export const preparedSlots = (cls: ClassId | null | undefined, intScore: number) => Math.max(1, 2 + modifier(intScore)) + (cls === 'filosofo' ? 2 : 0);
/** Aprendidas = nível mínimo atingido. */
export const knownSpells = (level: number) => SPELLS.filter((s) => s.level <= level);
/** Prontas para conjurar: preparadas, aprendidas e dentro do número de espaços (o excesso fica guardado, sem uso). */
export const castable = (prepared: string[], level: number, slots: number) =>
  prepared.map(spellById).filter((s): s is Spell => !!s && s.level <= level).slice(0, slots);

/** Uma troca de preparo por dia: preparar num espaço livre é grátis; despreparar gasta a troca do dia (salvo excesso). */
export const canSwapToday = (lastSwap: string | null, today: string) => lastSwap !== today;
export type PrepResult = { ok: true; prepared: SpellId[]; swap: boolean } | { ok: false; reason: 'bloqueada' | 'cheio' | 'troca' | 'inexistente' };
export function togglePrepared(prepared: SpellId[], id: SpellId, level: number, slots: number, lastSwap: string | null, today: string): PrepResult {
  const s = spellById(id);
  if (!s) return { ok: false, reason: 'inexistente' };
  if (prepared.includes(id)) {
    const excess = prepared.length > slots; // ex.: trocou de Filósofo para outra classe
    if (!excess && !canSwapToday(lastSwap, today)) return { ok: false, reason: 'troca' };
    return { ok: true, prepared: prepared.filter((x) => x !== id), swap: !excess };
  }
  if (s.level > level) return { ok: false, reason: 'bloqueada' };
  if (prepared.length >= slots) return { ok: false, reason: 'cheio' };
  return { ok: true, prepared: [...prepared, id], swap: false };
}

// ---------- efeitos ativos (derivados do log do dia) ----------
export type Fx = { atena: boolean; posidon: boolean; demeter: boolean; hermes: boolean; hestia: boolean; ares: boolean; forja: number; hades: number };
/** Marcas de consumo gravadas na rodada (combat_rounds.fx). Etapa E: também as habilidades dos lendários (não são magias). */
export type FxTag = 'forja' | 'ares' | 'hades' | 'hermes' | 'hestia' | 'perseu' | 'giges' | 'nemeia' | 'mnemosine';
export const NO_FX: Fx = { atena: false, posidon: false, demeter: false, hermes: false, hestia: false, ares: false, forja: 0, hades: 0 };

/** Efeito que uma magia bem-sucedida deixa ativo. */
export function castFx(fx: Fx, id: SpellId): Fx {
  switch (id) {
    case 'atena': case 'posidon': case 'demeter': case 'hermes': case 'hestia': case 'ares': return { ...fx, [id]: true };
    case 'hefesto': return { ...fx, forja: FORGE_STRIKES };
    case 'hades': return { ...fx, hades: HADES_ROUNDS };
    default: return fx;
  }
}
/** Tira do estado o que a rodada consumiu. */
export function consumeFx(fx: Fx, tags: readonly FxTag[]): Fx {
  const f = { ...fx };
  for (const t of tags) {
    if (t === 'forja') f.forja = Math.max(0, f.forja - 1);
    else if (t === 'hades') f.hades = Math.max(0, f.hades - 1);
    else if (t === 'hermes' || t === 'hestia' || t === 'ares') f[t] = false; // as marcas dos lendários não são efeitos de magia
  }
  return f;
}
/** Efeitos ativos agora, refazendo as rodadas de hoje em ordem (magia lançada, depois o que a rodada consumiu). */
export type FxRound = { spell: string | null; spellOk: boolean | null; fx: readonly FxTag[] };
export const activeFx = (today: FxRound[]): Fx =>
  today.reduce((f, r) => consumeFx(r.spell && r.spellOk ? castFx(f, r.spell as SpellId) : f, r.fx), NO_FX);

/** A magia ainda tem efeito pendente hoje? (não se lança de novo por cima: desperdiçaria a centelha). */
export function isActive(fx: Fx, id: SpellId): boolean {
  if (id === 'hefesto') return fx.forja > 0;
  if (id === 'hades') return fx.hades > 0;
  return id in fx && fx[id as keyof Fx] === true;
}
