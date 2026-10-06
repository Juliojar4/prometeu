import { daysBetween, weekStart } from './dates';

export type Boss = { weekStart: string; name: string; maxHp: number; hp: number };

export type BossInfo = { id: string; name: string; subtitle: string; icon: string; line: string };

/** Provações da mitologia grega; uma por semana, em rodízio fixo. `icon` = glifo de MaterialCommunityIcons. */
export const BOSSES: BossInfo[] = [
  { id: 'hidra', name: 'Hidra de Lerna', subtitle: 'Cortam-se duas cabeças, nascem quatro', icon: 'snake', line: 'Cada hábito corta uma cabeça. A constância cauteriza o pescoço.' },
  { id: 'minotauro', name: 'Minotauro', subtitle: 'O guardião do labirinto de Cnossos', icon: 'cow', line: 'No labirinto só avança quem não desiste de dobrar a próxima esquina.' },
  { id: 'quimera', name: 'Quimera', subtitle: 'Leão, cabra e serpente numa só fera', icon: 'paw', line: 'Três ameaças num só corpo. Enfrente uma de cada vez, todo dia.' },
  { id: 'cerbero', name: 'Cérbero', subtitle: 'O cão de três cabeças das portas de Hades', icon: 'dog-side', line: 'Ele guarda a porta do que você evita. Passe por ela com passos pequenos.' },
  { id: 'gorgona', name: 'Medusa', subtitle: 'O olhar que transforma em pedra', icon: 'eye-outline', line: 'A inércia petrifica. Mexa-se e ela perde o poder sobre você.' },
  { id: 'ciclope', name: 'Polifemo', subtitle: 'O ciclope devorador da ilha', icon: 'eye', line: 'Um só olho e muita fome. Astúcia e disciplina vencem a força bruta.' },
  { id: 'javali', name: 'Javali de Erimanto', subtitle: 'A fera que devasta as montanhas', icon: 'pig-variant', line: 'Persiga-o sem pressa e sem pausa até que ele ceda à sua cadência.' },
  { id: 'harpias', name: 'Harpias', subtitle: 'As aves que roubam a refeição', icon: 'bird', line: 'Elas levam o que você planejou. Proteja a mesa, a água e o treino.' },
];

/** Dias entre duas segundas-feiras / 7: número da semana desde 1970-01-05. */
const weekIndex = (ws: string) => Math.round(daysBetween('1970-01-05', ws) / 7);

/** Provação da semana de `date` (função pura: mesma semana, mesma criatura). */
export const bossInfoForWeek = (date: string): BossInfo => BOSSES[((weekIndex(weekStart(date)) % BOSSES.length) + BOSSES.length) % BOSSES.length];

export const bossMaxHp = (level: number) => 400 + 30 * (level - 1);

export function newBoss(date: string, level: number): Boss {
  const maxHp = bossMaxHp(level);
  return { weekStart: weekStart(date), name: bossInfoForWeek(date).name, maxHp, hp: maxHp };
}

/** Boss da semana de `date`: reaproveita o atual se for a mesma semana (reset na segunda). */
export const bossForDate = (current: Boss | null, date: string, level: number): Boss =>
  current && current.weekStart === weekStart(date) ? current : newBoss(date, level);

export const damageBoss = (b: Boss, dmg: number): Boss => ({ ...b, hp: Math.max(0, b.hp - Math.max(0, dmg)) });
export const isDefeated = (b: Boss) => b.hp <= 0;
