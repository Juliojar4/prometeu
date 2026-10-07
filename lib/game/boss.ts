import { daysBetween, weekStart } from './dates';

export type Boss = { weekStart: string; name: string; maxHp: number; hp: number };

/**
 * Ficha de combate no nível 1 (bossCombat escala com o nível). `charges` = quantas cargas médias o monstro aguenta:
 * o HP é `charges` x dano médio por carga do herói no começo da semana (bossMaxHp), então vale para qualquer ficha.
 */
export type BossInfo = { id: string; name: string; subtitle: string; icon: string; line: string; ac: number; atk: number; die: string; charges: number; save: number };

/**
 * Provações da mitologia grega; uma por semana, em rodízio fixo. `icon` = glifo de MaterialCommunityIcons.
 * CA alta já pesa no dano médio (e portanto no HP); quem bate forte erra mais. `charges` calibrado pela simulação
 * de combat.test.ts: o usuário típico (~48 cargas/semana) vence em 5-7 dias, o fraco (~25) tira metade do HP.
 * `save` (resistência a magias): a Medusa, criatura de magia, +2; ágeis e de várias cabeças +1; brutos 0.
 */
export const BOSSES: BossInfo[] = [
  // escamas medianas, golpe médio; as cabeças que renascem viram HP extra
  { id: 'hidra', name: 'Hidra de Lerna', subtitle: 'Cortam-se duas cabeças, nascem quatro', icon: 'snake', line: 'Cada carga corta uma cabeça. A constância cauteriza o pescoço.', ac: 12, atk: 1, die: '1d4', charges: 41, save: 1 },
  // couro grosso e chifrada certeira
  { id: 'minotauro', name: 'Minotauro', subtitle: 'O guardião do labirinto de Cnossos', icon: 'cow', line: 'No labirinto só avança quem não desiste de dobrar a próxima esquina.', ac: 13, atk: 2, die: '1d6', charges: 39, save: 0 },
  // três corpos: defesa média, fôlego de fogo
  { id: 'quimera', name: 'Quimera', subtitle: 'Leão, cabra e serpente numa só fera', icon: 'paw', line: 'Três ameaças num só corpo. Enfrente uma de cada vez, todo dia.', ac: 12, atk: 1, die: '1d4', charges: 39, save: 1 },
  // três mordidas: acerta bastante, cada uma fraca
  { id: 'cerbero', name: 'Cérbero', subtitle: 'O cão de três cabeças das portas de Hades', icon: 'dog-side', line: 'Ele guarda a porta do que você evita. Passe por ela com passos pequenos.', ac: 13, atk: 2, die: '1d4', charges: 39, save: 1 },
  // difícil de encarar (CA alta), frágil de corpo
  { id: 'gorgona', name: 'Medusa', subtitle: 'O olhar que transforma em pedra', icon: 'eye-outline', line: 'A inércia petrifica. Mexa-se e ela perde o poder sobre você.', ac: 14, atk: 1, die: '1d4', charges: 37, save: 2 },
  // gigante lento: fácil de acertar, muito HP, porrada pesada que erra mais
  { id: 'ciclope', name: 'Polifemo', subtitle: 'O ciclope devorador da ilha', icon: 'eye', line: 'Um só olho e muita fome. Astúcia e disciplina vencem a força bruta.', ac: 11, atk: 0, die: '1d6', charges: 41, save: 0 },
  // investida bruta, couro médio
  { id: 'javali', name: 'Javali de Erimanto', subtitle: 'A fera que devasta as montanhas', icon: 'pig-variant', line: 'Persiga-o sem pressa e sem pausa até que ele ceda à sua cadência.', ac: 12, atk: 2, die: '1d4', charges: 39, save: 0 },
  // bando ágil: escapa dos golpes, bica fraco
  { id: 'harpias', name: 'Harpias', subtitle: 'As aves que roubam a refeição', icon: 'bird', line: 'Elas levam o que você planejou. Proteja a mesa, a água e o treino.', ac: 14, atk: 1, die: '1d4', charges: 37, save: 1 },
];

/** Dias entre duas segundas-feiras / 7: número da semana desde 1970-01-05. */
const weekIndex = (ws: string) => Math.round(daysBetween('1970-01-05', ws) / 7);

/** Provação da semana de `date` (função pura: mesma semana, mesma criatura). */
export const bossInfoForWeek = (date: string): BossInfo => BOSSES[((weekIndex(weekStart(date)) % BOSSES.length) + BOSSES.length) % BOSSES.length];

/** +1 de CA, ataque e dano a cada 4 níveis do herói, no mesmo passo do bônus de proficiência dele. */
const tier = (level: number) => Math.floor((Math.max(1, level) - 1) / 4);
/** `save` = bônus de resistência contra magias (Etapa D): mente e reflexo da criatura, +1 a cada 4 níveis como o resto. */
export type BossCombat = { ac: number; atk: number; die: string; dmgBonus: number; save: number };
export const bossCombat = (info: BossInfo, level: number): BossCombat =>
  ({ ac: info.ac + tier(level), atk: info.atk + tier(level), die: info.die, dmgBonus: tier(level), save: info.save + tier(level) });

/** HP = cargas que aguenta x `power` (dano médio por carga do herói contra ele, expectedDamage em combat.ts). */
export const bossMaxHp = (date: string, power: number) => Math.max(10, Math.round(bossInfoForWeek(date).charges * power));

export function newBoss(date: string, power: number): Boss {
  const maxHp = bossMaxHp(date, power);
  return { weekStart: weekStart(date), name: bossInfoForWeek(date).name, maxHp, hp: maxHp };
}

/** Boss da semana de `date`: reaproveita o atual se for a mesma semana (reset na segunda). */
export const bossForDate = (current: Boss | null, date: string, power: number): Boss =>
  current && current.weekStart === weekStart(date) ? current : newBoss(date, power);

/**
 * Chefão aberto na escala antiga (400 + 30/nível, antes da Etapa B): leva o HP para a escala nova mantendo a fração de vida.
 * Vivo continua vivo (mín. 1); derrotado continua derrotado.
 */
export const rescaleBoss = (b: Boss, maxHp: number): Boss =>
  ({ ...b, maxHp, hp: b.hp <= 0 ? 0 : Math.min(maxHp, Math.max(1, Math.round((b.hp * maxHp) / b.maxHp))) });

export const damageBoss = (b: Boss, dmg: number): Boss => ({ ...b, hp: Math.max(0, b.hp - Math.max(0, dmg)) });
export const isDefeated = (b: Boss) => b.hp <= 0;
