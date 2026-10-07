export type Progress = { level: number; xp: number }; // xp = XP dentro do nível atual

/** XP necessário para sair do nível `level` para o próximo. */
export const xpForNextLevel = (level: number) => Math.round(100 * Math.pow(level, 1.5));

export function applyXp(p: Progress, gained: number): Progress & { levelsGained: number } {
  let { level, xp } = p;
  xp += Math.max(0, Math.floor(gained));
  let levelsGained = 0;
  while (xp >= xpForNextLevel(level)) {
    xp -= xpForNextLevel(level);
    level++;
    levelsGained++;
  }
  return { level, xp, levelsGained };
}

/** Inverso de applyXp: tira XP voltando de nível se preciso (nunca abaixo de nível 1 / 0 XP). */
export function removeXp(p: Progress, lost: number): Progress {
  let { level, xp } = p;
  xp -= Math.max(0, Math.floor(lost));
  while (xp < 0 && level > 1) {
    level--;
    xp += xpForNextLevel(level);
  }
  return { level, xp: Math.max(0, xp) };
}

/** XP acumulado desde o nível 1 (converte o formato antigo nível + XP dentro do nível). */
export function totalXp(p: Progress): number {
  let t = p.xp;
  for (let l = 1; l < p.level; l++) t += xpForNextLevel(l);
  return t;
}
