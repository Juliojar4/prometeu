import type { Reward } from './actions';
import { workoutAttr } from './attributes';

// ---------- água ----------
export const CUP_ML = 250;
export const MAX_CUPS_PER_DAY = 24;
/** Bônus único ao bater a meta do dia (vira evento `water_goal`; some se o dia cair abaixo da meta). */
export const WATER_GOAL_BONUS: Reward = { xp: 20, coins: 5, attr: 'constituicao', bossDamage: 0 };

/** Litros formatados em pt-BR ("1,25 L"). */
export const litersLabel = (cups: number) => `${String(cups * CUP_ML / 1000).replace('.', ',')} L`;

/** Dado o total de copos, a meta e se o bônus já existe: o que fazer com o bônus. */
export function waterBonusAction(cups: number, goal: number, hasBonus: boolean): 'grant' | 'revoke' | null {
  const met = goal > 0 && cups >= goal;
  return met && !hasBonus ? 'grant' : !met && hasBonus ? 'revoke' : null;
}

// ---------- treino ----------
export type WorkoutKind = 'musculacao' | 'corrida' | 'caminhada' | 'alongamento' | 'outro';
export type Intensity = 'leve' | 'media' | 'forte';
export const WORKOUT_KINDS: { id: WorkoutKind; label: string }[] = [
  { id: 'musculacao', label: 'Musculação' },
  { id: 'corrida', label: 'Corrida' },
  { id: 'caminhada', label: 'Caminhada' },
  { id: 'alongamento', label: 'Alongamento' },
  { id: 'outro', label: 'Outro' },
];
export const INTENSITIES: { id: Intensity; label: string; mult: number }[] = [
  { id: 'leve', label: 'Leve', mult: 1 },
  { id: 'media', label: 'Média', mult: 1.5 },
  { id: 'forte', label: 'Forte', mult: 2 },
];
export const MAX_WORKOUT_MIN = 240;
export const MAX_WORKOUT_COINS = 40;

export const clampMinutes = (m: number) => Math.min(MAX_WORKOUT_MIN, Math.max(1, Math.floor(Number.isFinite(m) ? m : 0)));

/** XP = minutos (teto de 240) x multiplicador da intensidade. */
export const workoutXp = (minutes: number, intensity: Intensity) =>
  Math.round(clampMinutes(minutes) * INTENSITIES.find((i) => i.id === intensity)!.mult);

/** `attr` = atributo principal (o valor real sai de workoutSplit ao derivar dos eventos; "outro" divide 50/50). */
export function workoutReward(minutes: number, intensity: Intensity, kind: WorkoutKind = 'musculacao', quick?: string): Reward {
  const xp = workoutXp(minutes, intensity);
  return { xp, coins: Math.min(MAX_WORKOUT_COINS, Math.round(xp / 4)), attr: workoutAttr(kind, quick), bossDamage: 0 };
}

// ---------- alimentação ----------
export type MealSlot = 'cafe' | 'almoco' | 'lanche' | 'jantar';
export type MealRating = 'bom' | 'ok' | 'ruim';
export type MealTag = 'fruta' | 'verdura' | 'caseiro' | 'sem_refri';
export const MEAL_SLOTS: { id: MealSlot; label: string }[] = [
  { id: 'cafe', label: 'Café da manhã' },
  { id: 'almoco', label: 'Almoço' },
  { id: 'lanche', label: 'Lanche' },
  { id: 'jantar', label: 'Jantar' },
];
export const MEAL_TAGS: { id: MealTag; label: string }[] = [
  { id: 'fruta', label: 'Fruta' },
  { id: 'verdura', label: 'Verdura' },
  { id: 'caseiro', label: 'Caseiro' },
  { id: 'sem_refri', label: 'Sem refrigerante' },
];
export const MEAL_RATING_XP: Record<MealRating, number> = { bom: 20, ok: 12, ruim: 5 };
export const MEAL_TAG_XP = 3;

/** XP por nota + 3 por tag (tags repetidas/desconhecidas não contam). Vai para Constituição. Ruim ainda dá um pouco. */
export function mealReward(rating: MealRating, tags: MealTag[]): Reward {
  const n = new Set(tags.filter((t) => MEAL_TAGS.some((x) => x.id === t))).size;
  const xp = MEAL_RATING_XP[rating] + n * MEAL_TAG_XP;
  return { xp, coins: rating === 'ruim' ? 2 : rating === 'ok' ? 4 : 5, attr: 'constituicao', bossDamage: 0 };
}

// ---------- estudo ----------
export type StudyKind = 'leitura' | 'estudo' | 'idioma' | 'revisao' | 'outro';
export const STUDY_KINDS: { id: StudyKind; label: string; mult: number }[] = [
  { id: 'leitura', label: 'Leitura de livro', mult: 1 },
  { id: 'estudo', label: 'Estudo ou curso', mult: 1.2 },
  { id: 'idioma', label: 'Idioma', mult: 1.2 },
  { id: 'revisao', label: 'Revisão e prática', mult: 1 },
  { id: 'outro', label: 'Outro', mult: 1 },
];
export const FOCUS_OPTIONS = [15, 25, 45];
export const MAX_STUDY_MIN = 240;
export const MAX_STUDY_COINS = 40;
export const PAGES_PER_BONUS_XP = 10; // +1 XP a cada 10 páginas
export const MAX_PAGES_BONUS = 20;
export const MAX_PAGES = 2000;

export const clampStudyMinutes = (m: number) => Math.min(MAX_STUDY_MIN, Math.max(1, Math.floor(Number.isFinite(m) ? m : 0)));
export const clampPages = (p: number) => Math.min(MAX_PAGES, Math.max(0, Math.floor(Number.isFinite(p) ? p : 0)));

/** XP = minutos x multiplicador do tipo + 1 por 10 páginas (bônus de no máximo 20). Só leitura conta páginas. */
export function studyXp(minutes: number, kind: StudyKind, pages = 0) {
  const base = Math.round(clampStudyMinutes(minutes) * STUDY_KINDS.find((k) => k.id === kind)!.mult);
  const bonus = kind === 'leitura' ? Math.min(MAX_PAGES_BONUS, Math.floor(clampPages(pages) / PAGES_PER_BONUS_XP)) : 0;
  return base + bonus;
}

export function studyReward(minutes: number, kind: StudyKind, pages = 0): Reward {
  const xp = studyXp(minutes, kind, pages);
  return { xp, coins: Math.min(MAX_STUDY_COINS, Math.round(xp / 4)), attr: 'intelecto', bossDamage: 0 };
}

export type BookSummary = { title: string; pages: number; minutes: number; sessions: number; last: number };
/** "Meus livros": agrupa as sessões de leitura com título (sem diferenciar maiúsculas) e ordena pela última leitura. */
export function summarizeBooks(events: { type: string; ts: number; data: Record<string, unknown> | null }[]): BookSummary[] {
  const by = new Map<string, BookSummary>();
  for (const e of events) {
    const title = typeof e.data?.title === 'string' ? e.data.title.trim() : '';
    if (e.type !== 'study' || e.data?.kind !== 'leitura' || !title) continue;
    const k = title.toLowerCase();
    const b = by.get(k) ?? { title, pages: 0, minutes: 0, sessions: 0, last: 0 };
    b.pages += Number(e.data?.pages ?? 0);
    b.minutes += Number(e.data?.minutes ?? 0);
    b.sessions++;
    if (e.ts >= b.last) { b.last = e.ts; b.title = title; }
    by.set(k, b);
  }
  return [...by.values()].sort((a, b) => b.last - a.last);
}

// ---------- cronômetro (baseado em timestamps, imune a segundo plano) ----------
export type TimerState = { accMs: number; startedAt: number | null };
export const timerStart = (t: TimerState, now: number): TimerState => (t.startedAt === null ? { ...t, startedAt: now } : t);
export const timerPause = (t: TimerState, now: number): TimerState =>
  t.startedAt === null ? t : { accMs: t.accMs + Math.max(0, now - t.startedAt), startedAt: null };
export const timerElapsed = (t: TimerState, now: number) => t.accMs + (t.startedAt === null ? 0 : Math.max(0, now - t.startedAt));
export const timerRemaining = (t: TimerState, totalMs: number, now: number) => Math.max(0, totalMs - timerElapsed(t, now));
/** Minutos a registrar ao concluir: tempo decorrido arredondado, entre 1 e o planejado. */
export const timerMinutes = (elapsedMs: number, plannedMin: number) => Math.min(plannedMin, Math.max(1, Math.round(elapsedMs / 60000)));
