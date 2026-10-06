import { addAttrXp, Attr, Attributes, removeAttrXp } from './attributes';
import { Boss, damageBoss } from './boss';
import { applyXp, removeXp } from './xp';

export type ActionType = 'water' | 'workout' | 'meal' | 'mission' | 'study';
/** Tipos gravados em `events`: `water_goal` e o bônus de meta de água (acompanha a contagem do dia). */
export type EventType = ActionType | 'water_goal';
export type Reward = { xp: number; coins: number; attr: Attr; bossDamage: number };

export const REWARDS: Record<Exclude<ActionType, 'mission' | 'study'>, Reward> = {
  water: { xp: 5, coins: 2, attr: 'energia', bossDamage: 5 },
  workout: { xp: 60, coins: 15, attr: 'forca', bossDamage: 30 },
  meal: { xp: 25, coins: 5, attr: 'vitalidade', bossDamage: 10 },
};
export const MISSION_BOSS_DAMAGE = 15;

export type GameState = { level: number; xp: number; coins: number; attrs: Attributes; boss: Boss };
export type ActionResult = { state: GameState; reward: Reward; levelsGained: number; attrLevelsGained: number };

/** Aplica uma recompensa: XP geral + XP do atributo + moedas + dano no chefão. */
export function applyReward(s: GameState, r: Reward): ActionResult {
  const { levelsGained, ...p } = applyXp(s, r.xp);
  const { attrs, levelsGained: attrLevelsGained } = addAttrXp(s.attrs, r.attr, r.xp);
  return {
    state: { ...p, coins: s.coins + r.coins, attrs, boss: damageBoss(s.boss, r.bossDamage) },
    reward: r,
    levelsGained,
    attrLevelsGained,
  };
}

/** Desfaz uma recompensa já aplicada (XP geral, XP do atributo, moedas e dano no chefão). Inverso de applyReward. */
export function revertReward(s: GameState, r: Reward): GameState {
  const { level, xp } = removeXp(s, r.xp);
  return {
    level, xp,
    coins: Math.max(0, s.coins - r.coins),
    attrs: removeAttrXp(s.attrs, r.attr, r.xp),
    boss: { ...s.boss, hp: Math.min(s.boss.maxHp, s.boss.hp + Math.max(0, r.bossDamage)) },
  };
}

/**
 * Troca atômica: desfaz `revert` e aplica `add` em seguida (editar refeição, desfazer água, excluir treino).
 * Devolve as recompensas aplicadas com o dano REAL no chefão (limitado ao HP restante), para gravar nos eventos
 * e a reversão futura devolver exatamente o que foi tirado.
 */
export function applyChanges(s: GameState, revert: Reward[], add: Reward[]) {
  let state = revert.reduce(revertReward, s);
  const applied: Reward[] = [];
  for (const r of add) {
    const res = applyReward(state, r);
    applied.push({ ...r, bossDamage: state.boss.hp - res.state.boss.hp });
    state = res.state;
  }
  return { state, applied, levelUp: state.level > s.level };
}
