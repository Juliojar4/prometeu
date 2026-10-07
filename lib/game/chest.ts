import { hash, rng } from './rng';
import { DUP_COINS, GEAR, type GearRarity } from './gear';
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

/**
 * Etapa E: o item do baú é um cosmético (40%, como antes, entre os não possuídos) ou um equipamento (60%, sempre que já
 * possui todos os cosméticos). Raridade do equipamento: comum 45%, incomum 30%, raro 18%, lendário 7% (raro ~1 a cada
 * 2 meses de vitórias, lendário ~1 a cada 6); dentro da raridade, sorteio uniforme. Duplicata vira moedas (DUP_COINS).
 * Moedas e cosmético saem de chestReward (mesma semente de antes); o equipamento usa um fluxo próprio (`rand2`).
 */
export const CHEST_GEAR_SHARE = 0.6;
export const CHEST_RARITY_WEIGHTS: [GearRarity, number][] = [['comum', 0.45], ['incomum', 0.3], ['raro', 0.18], ['lendario', 0.07]];
export const CHEST_GEAR = GEAR.filter((g) => !g.only);
export type ChestLoot = { coins: number; itemId: string | null; gearId: string | null; dup: number };

export function chestLoot(weekStart: string, owned: string[], ownedGear: string[],
  rand: () => number = rng(hash(`bau:${weekStart}`)), rand2: () => number = rng(hash(`bau-armas:${weekStart}`))): ChestLoot {
  const base = chestReward(weekStart, owned, rand);
  if (base.itemId && rand2() >= CHEST_GEAR_SHARE) return { ...base, gearId: null, dup: 0 };
  const coins = base.itemId ? base.coins : base.coins - CHEST_ALL_OWNED_BONUS; // o equipamento ocupa o lugar do bônus
  let x = rand2(), rarity: GearRarity = 'lendario';
  for (const [r, w] of CHEST_RARITY_WEIGHTS) { if (x < w) { rarity = r; break; } x -= w; }
  const pool = CHEST_GEAR.filter((g) => g.rarity === rarity);
  const gearId = pool[Math.floor(rand2() * pool.length)].id;
  return { coins, itemId: null, gearId, dup: ownedGear.includes(gearId) ? DUP_COINS[rarity] : 0 };
}
