import { QUICK_WORKOUTS } from './workouts';

/**
 * Atributos estilo D&D 5e (valor 8 a 20 + modificador). O XP de cada atributo é DERIVADO dos eventos
 * (soma do XP gravado em `events`), então registrar/desfazer qualquer ação já mantém o valor exato.
 */
export type AttrKey = 'forca' | 'destreza' | 'constituicao' | 'intelecto';
export type AttrXp = Record<AttrKey, number>; // XP efetivo acumulado (com os fatores já aplicados)

export const ATTRS: AttrKey[] = ['forca', 'destreza', 'constituicao', 'intelecto'];
export const ATTR_LABEL: Record<AttrKey, string> = { forca: 'Força', destreza: 'Destreza', constituicao: 'Constituição', intelecto: 'Intelecto' };

/** Água + comida rendem ~4x um treino por dia (~98 XP vs ~19); 0,25 dava 15 em 3 meses na simulação, 0,2 dá 14 como os demais. */
export const CON_XP_FACTOR = 0.2;
/** 30 min/dia de estudo dão ~31 XP/dia, ~1,6x um treino de 45 XP 3x/semana; 0,6 deixa o Intelecto no mesmo ritmo (~14 em 3 meses). */
export const INT_XP_FACTOR = 0.6;

/** XP acumulado mínimo para cada valor, do 8 (índice 0) ao 20. */
export const SCORE_XP = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000, 5000, 6200];
export const MIN_SCORE = 8;
export const MAX_SCORE = 20;
export const MAX_EFFECTIVE_SCORE = 22;

export function scoreFromXp(xp: number): number {
  let i = 0;
  while (i + 1 < SCORE_XP.length && xp >= SCORE_XP[i + 1]) i++;
  return MIN_SCORE + i;
}

/** Progresso 0..1 até o próximo valor (1 no teto). */
export function scoreProgress(xp: number): number {
  const s = scoreFromXp(xp);
  if (s >= MAX_SCORE) return 1;
  const from = SCORE_XP[s - MIN_SCORE], to = SCORE_XP[s - MIN_SCORE + 1];
  return (xp - from) / (to - from);
}

export const modifier = (score: number) => Math.floor((score - 10) / 2);
/** "+2", "0", "-1". */
export const modLabel = (score: number) => { const m = modifier(score); return m > 0 ? `+${m}` : m < 0 ? `−${-m}` : '0'; };

/** +2 até o nível 4 e +1 a cada 4 níveis (5 = +3, 9 = +4, 13 = +5), teto +6 no 17. */
export const proficiencyBonus = (level: number) => Math.min(6, 2 + Math.floor((Math.max(1, level) - 1) / 4));

/** Base + bônus de equipamento, teto 22 (a base sozinha nunca passa de 20). */
export const effectiveScore = (base: number, itemBonus: number) => Math.min(MAX_EFFECTIVE_SCORE, Math.min(MAX_SCORE, base) + itemBonus);

export const armorClass = (destMod: number, armorBonus: number, shieldBonus: number) => 10 + destMod + armorBonus + shieldBonus;

// ---------- de onde vem o XP ----------
/** Treinos rápidos têm destino fixo, independente do tipo gravado. */
const QUICK_ATTR: Record<string, AttrKey> = { circuito: 'forca', hiit: 'destreza', alongamento: 'destreza' };
const KIND_ATTR: Record<string, AttrKey> = { musculacao: 'forca', corrida: 'destreza', caminhada: 'destreza', alongamento: 'destreza' };

/** Pesos do XP de um treino por atributo. "Outro" (natação, futebol, luta...) divide 50/50; sem tipo (eventos antigos) = Força. */
export function workoutSplit(kind?: string | null, quick?: string | null): Partial<Record<AttrKey, number>> {
  const a = (quick && QUICK_ATTR[quick]) || (kind && KIND_ATTR[kind]);
  if (a) return { [a]: 1 };
  return kind === 'outro' ? { forca: 0.5, destreza: 0.5 } : { forca: 1 };
}

/** Atributo "principal" de um treino (o que fica gravado em events.attr). */
export const workoutAttr = (kind?: string | null, quick?: string | null): AttrKey =>
  Object.keys(workoutSplit(kind, quick))[0] as AttrKey;

/** Id do treino rápido: gravado em `data.quick` (novos) ou reconhecido pelo nome (eventos anteriores à Etapa A). */
export const quickIdOf = (quick?: string | null, name?: string | null) =>
  quick ?? QUICK_WORKOUTS.find((w) => w.name === name)?.id ?? null;

/** Linha agregada de eventos (SUM de xp agrupado por tipo, atributo e detalhes do treino). */
export type AttrEventRow = { type: string; attr: string | null; xp: number; kind?: string | null; quick?: string | null; name?: string | null };
const LEGACY: Record<string, AttrKey> = { energia: 'constituicao', vitalidade: 'constituicao' };

/** XP efetivo de cada atributo a partir dos eventos (Força/Destreza recalculadas pelo tipo do treino). */
export function attrXpFromEvents(rows: AttrEventRow[]): AttrXp {
  const raw: AttrXp = { forca: 0, destreza: 0, constituicao: 0, intelecto: 0 };
  for (const r of rows) {
    if (r.type === 'workout') {
      const split = workoutSplit(r.kind, quickIdOf(r.quick, r.name));
      for (const k of Object.keys(split) as AttrKey[]) raw[k] += r.xp * split[k]!;
      continue;
    }
    const a = (r.attr && LEGACY[r.attr]) || (r.attr as AttrKey);
    if (a in raw) raw[a] += r.xp;
  }
  return {
    forca: Math.floor(raw.forca),
    destreza: Math.floor(raw.destreza),
    constituicao: Math.floor(raw.constituicao * CON_XP_FACTOR),
    intelecto: Math.floor(raw.intelecto * INT_XP_FACTOR),
  };
}

/** Atributo que mais evoluiu entre dois retratos de XP. Base do futuro Wrapped. */
export const mostEvolved = (before: AttrXp, after: AttrXp): AttrKey =>
  ATTRS.reduce((best, a) => (after[a] - before[a] > after[best] - before[best] ? a : best), ATTRS[0]);
