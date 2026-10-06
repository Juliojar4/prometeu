import { hash, rng } from './rng';
import { ITEMS } from './shop';

export type ChestReward = { coins: number; itemId: string | null };

export const CHEST_MIN_COINS = 50;
export const CHEST_MAX_COINS = 90;
export const CHEST_ALL_OWNED_BONUS = 100;

/**
 * Conteúdo do baú de uma provação. Determinístico dado a semente (por padrão, a semana do chefão):
 * moedas de 50 a 90 (múltiplos de 5) e um item sorteado entre os ainda não possuídos.
 * Se já possui tudo, ganha moedas extras no lugar do item. `rand` é injetável (testes).
 */
export function chestReward(weekStart: string, owned: string[], rand: () => number = rng(hash(`bau:${weekStart}`))): ChestReward {
  const coins = CHEST_MIN_COINS + 5 * Math.floor(rand() * ((CHEST_MAX_COINS - CHEST_MIN_COINS) / 5 + 1));
  const pool = ITEMS.filter((i) => !owned.includes(i.id));
  if (!pool.length) return { coins: coins + CHEST_ALL_OWNED_BONUS, itemId: null };
  return { coins, itemId: pool[Math.floor(rand() * pool.length)].id };
}
