import type { AttrKey } from './attributes';
import { hash, rng } from './rng';

import type { MealRating, MealSlot, MealTag, StudyKind, WorkoutKind } from './habits';

/** Regra de verificação automática, avaliada sobre os eventos do dia (água, treinos e refeições). */
export type AutoRule =
  | { type: 'water'; cups?: number; goalFraction?: number; beforeHour?: number }
  | { type: 'workout'; kind?: WorkoutKind; minutes?: number }
  | { type: 'meal'; tag?: MealTag; slot?: MealSlot; ratings?: MealRating[] }
  | { type: 'study'; minutes?: number; pages?: number; kind?: StudyKind };

export type Mission = { id: string; title: string; xp: number; coins: number; attr: AttrKey; auto?: AutoRule };

const m = (id: string, title: string, attr: AttrKey, xp = 20, coins = 5, auto?: AutoRule): Mission => ({ id, title, xp, coins, attr, auto });

export const MISSIONS: Mission[] = [
  // Constituição: hidratação (antes Energia)
  m('agua-cedo', 'Beba 2 copos de água antes das 10h', 'constituicao', 20, 5, { type: 'water', cups: 2, beforeHour: 10 }),
  m('agua-garrafa', 'Deixe uma garrafa de água ao alcance da mão', 'constituicao', 15, 3),
  m('agua-refeicao', 'Beba um copo de água antes de cada refeição', 'constituicao'),
  m('agua-sem-refri', 'Passe o dia sem refrigerante', 'constituicao', 30, 8),
  m('agua-cha', 'Troque um café por chá sem açúcar', 'constituicao', 20, 5),
  m('agua-metade', 'Beba metade da sua meta de água até o meio-dia', 'constituicao', 25, 6, { type: 'water', goalFraction: 0.5, beforeHour: 12 }),
  m('agua-noite', 'Tome um copo de água antes de dormir', 'constituicao', 15, 3),
  m('agua-lembrete', 'Beba água a cada hora do expediente', 'constituicao', 30, 8),
  m('agua-fruta', 'Prepare uma água saborizada com frutas', 'constituicao', 20, 5),
  m('agua-treino', 'Hidrate-se bem antes e depois do treino', 'constituicao', 20, 5),
  // Força e Destreza (treino)
  m('forca-alongar', 'Alongue-se por 5 minutos', 'destreza', 15, 3, { type: 'workout', kind: 'alongamento', minutes: 5 }),
  m('forca-caminhada', 'Faça uma caminhada de 20 minutos', 'destreza', 30, 8, { type: 'workout', kind: 'caminhada', minutes: 20 }),
  m('forca-flexoes', 'Faça 10 flexões (ou na parede, ou no joelho)', 'forca'),
  m('forca-agacha', 'Faça 20 agachamentos', 'forca'),
  m('forca-prancha', 'Segure a prancha por 30 segundos', 'forca'),
  m('forca-escada', 'Suba escadas em vez de usar o elevador', 'forca', 15, 3),
  m('forca-pausa', 'Levante e ande por 3 minutos a cada hora sentado', 'forca', 20, 5),
  m('forca-treino', 'Complete um treino de pelo menos 30 minutos', 'forca', 40, 10, { type: 'workout', minutes: 30 }),
  m('forca-dancar', 'Dance sua música favorita inteira', 'forca', 15, 3),
  m('forca-postura', 'Cuide da postura: ajuste a cadeira e a tela', 'forca', 15, 3),
  // Constituição: alimentação (antes Vitalidade)
  m('vit-fruta', 'Coma uma fruta hoje', 'constituicao', 15, 3, { type: 'meal', tag: 'fruta' }),
  m('vit-salada', 'Coma uma porção de salada ou legumes', 'constituicao', 20, 5, { type: 'meal', tag: 'verdura' }),
  m('vit-cafe', 'Tome um café da manhã de verdade', 'constituicao', 20, 5, { type: 'meal', slot: 'cafe', ratings: ['bom', 'ok'] }),
  m('vit-doce', 'Passe o dia sem doces industrializados', 'constituicao', 30, 8),
  m('vit-cozinhar', 'Cozinhe uma refeição em casa', 'constituicao', 30, 8, { type: 'meal', tag: 'caseiro' }),
  m('vit-devagar', 'Faça uma refeição sem celular, mastigando devagar', 'constituicao'),
  m('vit-proteina', 'Inclua uma fonte de proteína em cada refeição', 'constituicao', 25, 6),
  m('vit-cores', 'Monte um prato com pelo menos 3 cores', 'constituicao'),
  m('vit-lanche', 'Leve um lanche saudável de casa', 'constituicao', 20, 5),
  m('vit-sono', 'Jante pelo menos 2 horas antes de dormir', 'constituicao', 20, 5),
  // Gerais
  m('geral-sol', 'Tome 10 minutos de sol', 'constituicao', 15, 3),
  m('geral-respirar', 'Faça 2 minutos de respiração profunda', 'constituicao', 15, 3),
  m('geral-dormir', 'Vá para a cama no horário planejado', 'constituicao', 25, 6),
  // Intelecto (estudo e leitura)
  m('int-ler10', 'Leia 10 páginas de um livro', 'intelecto', 20, 5, { type: 'study', kind: 'leitura', pages: 10 }),
  m('int-ler30', 'Leia 30 páginas hoje', 'intelecto', 35, 9, { type: 'study', kind: 'leitura', pages: 30 }),
  m('int-estudar25', 'Estude por 25 minutos', 'intelecto', 25, 6, { type: 'study', minutes: 25 }),
  m('int-estudar45', 'Faça uma sessão de estudo de 45 minutos', 'intelecto', 40, 10, { type: 'study', minutes: 45 }),
  m('int-idioma', 'Pratique um idioma por 15 minutos', 'intelecto', 20, 5, { type: 'study', kind: 'idioma', minutes: 15 }),
  m('int-revisao', 'Revise suas anotações', 'intelecto', 20, 5, { type: 'study', kind: 'revisao', minutes: 10 }),
  m('int-palavras', 'Aprenda 5 palavras novas', 'intelecto', 15, 3),
  m('int-podcast', 'Ouça um podcast ou aula sobre algo novo', 'intelecto', 20, 5),
  m('int-resumo', 'Resuma em três linhas algo que aprendeu hoje', 'intelecto', 20, 5),
  m('int-sem-tela', 'Leia sem o celular por perto por 15 minutos', 'intelecto', 25, 6),
];

/** Sorteia `n` missões distintas, sempre as mesmas para a mesma data. */
export function pickDailyMissions(date: string, n = 3, bank: Mission[] = MISSIONS): Mission[] {
  const rand = rng(hash(date));
  const pool = [...bank];
  const out: Mission[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
}

export const missionById = (id: string) => MISSIONS.find((x) => x.id === id);

export type DayEvent = { type: string; ref: string | null; ts: number; data: Record<string, unknown> | null };

/** A missão automática está cumprida pelos eventos do dia? Missões manuais devolvem `false`. */
export function autoMissionDone(rule: AutoRule | undefined, events: DayEvent[], waterGoal: number): boolean {
  if (!rule) return false;
  if (rule.type === 'water') {
    const need = rule.cups ?? Math.max(1, Math.ceil(waterGoal * (rule.goalFraction ?? 1)));
    const n = events.filter((e) => e.type === 'water' && (rule.beforeHour === undefined || new Date(e.ts).getHours() < rule.beforeHour)).length;
    return n >= need;
  }
  if (rule.type === 'workout') {
    return events.some((e) => e.type === 'workout'
      && (!rule.kind || e.data?.kind === rule.kind)
      && Number(e.data?.minutes ?? 0) >= (rule.minutes ?? 1));
  }
  if (rule.type === 'study') {
    const st = events.filter((e) => e.type === 'study' && (!rule.kind || e.data?.kind === rule.kind));
    const sum = (k: string) => st.reduce((n, e) => n + Number(e.data?.[k] ?? 0), 0);
    return st.length > 0 && sum('minutes') >= (rule.minutes ?? 0) && sum('pages') >= (rule.pages ?? 0);
  }
  return events.some((e) => {
    if (e.type !== 'meal') return false;
    const d = e.data as { rating?: MealRating; tags?: MealTag[] } | null;
    return (!rule.slot || e.ref === rule.slot)
      && (!rule.tag || !!d?.tags?.includes(rule.tag))
      && (!rule.ratings || (!!d?.rating && rule.ratings.includes(d.rating)));
  });
}
