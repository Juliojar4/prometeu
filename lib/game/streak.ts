import { addDays } from './dates';

/** `study` = minutos estudados no dia (opcional: dias antigos não têm o campo e valem 0). */
export type DayRecord = { date: string; water: number; waterGoal: number; workout: boolean; meals: number; study?: number };

export const MEALS_PILLAR = 2; // refeições avaliadas para o pilar "comida" contar
export const STUDY_PILLAR_MIN = 10; // minutos de estudo para o pilar contar
export const MAX_SHIELDS = 3;
export const DAYS_PER_SHIELD = 7;

export const PILLARS = 4;
export const pillarsDone = (d: DayRecord) =>
  Number(d.waterGoal > 0 && d.water >= d.waterGoal) + Number(d.workout) + Number(d.meals >= MEALS_PILLAR) + Number((d.study ?? 0) >= STUDY_PILLAR_MIN);

/** Dia ativo = pelo menos 2 dos 4 pilares (água, treino, comida, estudo). */
export const isActiveDay = (d: DayRecord) => pillarsDone(d) >= 2;

export type StreakState = {
  streak: number;
  bestStreak: number;
  shields: number;
  activeDays: number;
  /** Houve dia perdido (sem escudo) ontem e hoje ainda não está ativo -> avatar cansado. */
  tired: boolean;
  /** Hoje ainda não é dia ativo e há chama para perder: sem escudo o fim do dia zera a sequência. */
  atRisk: boolean;
  /** Último dia salvo por um escudo (para a mensagem acolhedora). */
  lastShieldUse: string | null;
  /** Dias ativos que faltam para o próximo escudo (0 se já está no máximo). */
  nextShieldIn: number;
};

/**
 * Simula dia a dia de `start` (primeiro dia de uso) até `today`.
 * - dia ativo: streak+1; a cada 7 dias ativos (acumulado) ganha 1 escudo (máx 3)
 * - dia falho no passado: escudo gasto automaticamente (streak mantém) ou streak zera
 * - hoje ainda não acabou: nunca penaliza
 */
export function computeStreak(days: DayRecord[], start: string, today: string): StreakState {
  const byDate = new Map(days.map((d) => [d.date, d]));
  let streak = 0, bestStreak = 0, shields = 0, activeDays = 0, lostOn = '', todayActive = false;
  let lastShieldUse: string | null = null;
  for (let date = start; date <= today; date = addDays(date, 1)) {
    const rec = byDate.get(date);
    const active = !!rec && isActiveDay(rec);
    if (date === today) todayActive = active;
    if (active) {
      bestStreak = Math.max(bestStreak, ++streak);
      if (++activeDays % DAYS_PER_SHIELD === 0) shields = Math.min(MAX_SHIELDS, shields + 1);
    } else if (date !== today) {
      if (shields > 0) {
        shields--;
        lastShieldUse = date;
      } else {
        streak = 0;
        lostOn = date;
      }
    }
  }
  return {
    streak, bestStreak, shields, activeDays,
    tired: lostOn === addDays(today, -1) && !todayActive,
    atRisk: streak > 0 && !todayActive,
    lastShieldUse,
    nextShieldIn: shields >= MAX_SHIELDS ? 0 : DAYS_PER_SHIELD - (activeDays % DAYS_PER_SHIELD),
  };
}
