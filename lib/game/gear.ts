import type { AttrKey } from './attributes';

/**
 * Equipamentos de combate (separados dos cosméticos de shop.ts). Etapa E: Armaria (comuns e incomuns por moedas),
 * baú do chefão (todas as raridades, ponderado) e uma conquista (a Pele do Leão de Nemeia).
 * Equipado = um por slot, dá a parte "física" (CA da armadura/escudo, dado da arma). Sintonizado (máx. 3) = também
 * o bônus de atributo e a habilidade do lendário. Amuleto e anel só valem sintonizados: é aí que está a escolha.
 */
export type GearSlot = 'arma' | 'armadura' | 'escudo' | 'amuleto' | 'anel';
export type GearRarity = 'comum' | 'incomum' | 'raro' | 'lendario';
export type GearItem = {
  id: string; name: string; slot: GearSlot; rarity: GearRarity; attr: AttrKey;
  icon: string; // glifo MaterialCommunityIcons
  ac?: number; // bônus de CA (armadura e escudo)
  damage?: string; // dado da arma: troca o 1d6 dos golpes de Força, Destreza e Constituição
  ability?: string; // só lendários
  only?: 'conquista'; // fora do baú e da loja
};
export type Equipped = Partial<Record<GearSlot, string>>; // slot -> item_id
export type Loadout = { equipped: Equipped; attuned: GearSlot[] };

export const GEAR_SLOTS: GearSlot[] = ['arma', 'armadura', 'escudo', 'amuleto', 'anel'];
export const SLOT_LABEL: Record<GearSlot, string> = { arma: 'Arma', armadura: 'Armadura', escudo: 'Escudo', amuleto: 'Amuleto', anel: 'Anel' };
/** Bônus no atributo (sintonizado) por raridade; o lendário vale +3 como o raro e ganha uma habilidade. */
export const RARITY_BONUS: Record<GearRarity, number> = { comum: 1, incomum: 2, raro: 3, lendario: 3 };
export const RARITY_RANK: Record<GearRarity, number> = { comum: 1, incomum: 2, raro: 3, lendario: 4 };
export const GEAR_RARITY_LABEL: Record<GearRarity, string> = { comum: 'Comum', incomum: 'Incomum', raro: 'Raro', lendario: 'Lendário' };
/** Máximo de itens sintonizados. */
export const MAX_ATTUNED = 3;

/**
 * Preço na Armaria (só comuns e incomuns). O típico ganha ~430 moedas/semana (água 147, refeições 63, estudo 56,
 * treinos 34, missões ~70, baú ~60); gastando metade em armas, um comum por semana e um incomum a cada ~2.
 */
export const GEAR_PRICE: Partial<Record<GearRarity, number>> = { comum: 150, incomum: 320 };
/** Duplicata do baú vira moedas (~1/4 do preço de loja; raros e lendários valem mais porque não se compram). */
export const DUP_COINS: Record<GearRarity, number> = { comum: 40, incomum: 80, raro: 150, lendario: 250 };

// Legendários: ids usados pelo combate.
export const PELION = 'lanca-pelion'; // golpes com a arma são críticos com 19-20
export const NEMEIA = 'pele-nemeia'; // −1 no dano de todo contra-ataque
export const PERSEU = 'escudo-perseu'; // o primeiro golpe de cada dia tem vantagem
export const GIGES = 'anel-giges'; // o primeiro acerto da criatura em cada dia erra
export const MNEMOSINE = 'colar-mnemosine'; // a primeira magia de cada semana não gasta centelhas

// CA: armadura leve +1, média +2, pesada +3; escudo +1 (pelta) ou +2 (hóplon), como no 5e.
// Arma: comum e incomum 1d8, raro e lendário 1d10 (sem arma: 1d6).
export const GEAR: GearItem[] = [
  { id: 'gladio-bronze', name: 'Gládio de bronze', slot: 'arma', rarity: 'comum', attr: 'forca', icon: 'sword', damage: '1d8' },
  { id: 'funda-rodes', name: 'Funda de Rodes', slot: 'arma', rarity: 'comum', attr: 'destreza', icon: 'bullseye', damage: '1d8' },
  { id: 'arco-teixo', name: 'Arco de teixo cretense', slot: 'arma', rarity: 'incomum', attr: 'destreza', icon: 'bow-arrow', damage: '1d8' },
  { id: 'clava-oliveira', name: 'Clava de oliveira', slot: 'arma', rarity: 'incomum', attr: 'constituicao', icon: 'mace', damage: '1d8' },
  { id: 'copis-tebas', name: 'Cópis de Tebas', slot: 'arma', rarity: 'raro', attr: 'forca', icon: 'sickle', damage: '1d10' },
  { id: PELION, name: 'Lança do Pélion', slot: 'arma', rarity: 'lendario', attr: 'forca', icon: 'spear', damage: '1d10',
    ability: 'Golpes com a arma são críticos com 19 ou 20.' },

  { id: 'linotorax', name: 'Linotórax', slot: 'armadura', rarity: 'comum', attr: 'destreza', icon: 'tshirt-crew', ac: 1 },
  { id: 'couraca-escamas', name: 'Couraça de escamas', slot: 'armadura', rarity: 'incomum', attr: 'forca', icon: 'tshirt-v', ac: 2 },
  { id: 'couraca-musculada', name: 'Couraça musculada', slot: 'armadura', rarity: 'raro', attr: 'constituicao', icon: 'weight-lifter', ac: 3 },
  { id: NEMEIA, name: 'Pele do Leão de Nemeia', slot: 'armadura', rarity: 'lendario', attr: 'constituicao', icon: 'paw', ac: 2, only: 'conquista',
    ability: 'Nenhuma lâmina a atravessa: todo contra-ataque causa 1 a menos.' },

  { id: 'pelta-tracia', name: 'Pelta trácia', slot: 'escudo', rarity: 'comum', attr: 'destreza', icon: 'shield-half-full', ac: 1 },
  { id: 'hoplon', name: 'Hóplon de Esparta', slot: 'escudo', rarity: 'incomum', attr: 'constituicao', icon: 'shield', ac: 2 },
  { id: PERSEU, name: 'Escudo polido de Perseu', slot: 'escudo', rarity: 'lendario', attr: 'destreza', icon: 'mirror', ac: 2,
    ability: 'O reflexo revela a fraqueza: o primeiro golpe de cada dia tem vantagem.' },

  { id: 'bolota-dodona', name: 'Bolota de Dodona', slot: 'amuleto', rarity: 'comum', attr: 'intelecto', icon: 'seed-outline' },
  { id: 'amuleto-coruja', name: 'Amuleto da coruja', slot: 'amuleto', rarity: 'incomum', attr: 'intelecto', icon: 'owl' },
  { id: 'olho-graias', name: 'Olho das Graias', slot: 'amuleto', rarity: 'raro', attr: 'destreza', icon: 'eye-circle-outline' },
  { id: MNEMOSINE, name: 'Colar de Mnemósine', slot: 'amuleto', rarity: 'lendario', attr: 'intelecto', icon: 'necklace',
    ability: 'A memória guarda o fogo: a primeira magia de cada semana não gasta centelhas.' },

  { id: 'anel-policrates', name: 'Anel de Polícrates', slot: 'anel', rarity: 'comum', attr: 'constituicao', icon: 'ring' },
  { id: 'anel-oricalco', name: 'Anel de oricalco', slot: 'anel', rarity: 'raro', attr: 'intelecto', icon: 'circle-double' },
  { id: GIGES, name: 'Anel de Giges', slot: 'anel', rarity: 'lendario', attr: 'destreza', icon: 'ring',
    ability: 'Some da vista: o primeiro acerto da criatura em cada dia erra.' },
];

export const gearById = (id?: string | null) => GEAR.find((g) => g.id === id);
/** Vendidos na Armaria: comuns e incomuns. */
export const ARMORY = GEAR.filter((g) => GEAR_PRICE[g.rarity] !== undefined && !g.only);

export type GearBuy = { ok: true; coins: number; owned: string[] } | { ok: false; reason: 'saldo' | 'possui' | 'inexistente' };
/** Compra na Armaria: só itens à venda, não possuídos e com saldo. */
export function buyGear(coins: number, owned: string[], id: string): GearBuy {
  const g = ARMORY.find((x) => x.id === id);
  if (!g) return { ok: false, reason: 'inexistente' };
  if (owned.includes(id)) return { ok: false, reason: 'possui' };
  if (coins < GEAR_PRICE[g.rarity]!) return { ok: false, reason: 'saldo' };
  return { ok: true, coins: coins - GEAR_PRICE[g.rarity]!, owned: [...owned, id] };
}

export type LoadoutResult = { ok: true; loadout: Loadout } | { ok: false; reason: 'inexistente' | 'nao_possui' | 'limite' | 'vazio' };

/** Equipa no slot do item (troca o que estava lá). Sintoniza sozinho se houver vaga (o anterior do slot libera a dele). */
export function equipGear(l: Loadout, owned: string[], id: string): LoadoutResult {
  const g = gearById(id);
  if (!g) return { ok: false, reason: 'inexistente' };
  if (!owned.includes(id)) return { ok: false, reason: 'nao_possui' };
  const rest = l.attuned.filter((s) => s !== g.slot);
  return { ok: true, loadout: { equipped: { ...l.equipped, [g.slot]: id }, attuned: rest.length < MAX_ATTUNED ? [...rest, g.slot] : rest } };
}

export function unequipGear(l: Loadout, slot: GearSlot): Loadout {
  const { [slot]: _, ...equipped } = l.equipped;
  return { equipped, attuned: l.attuned.filter((s) => s !== slot) };
}

/** Sintoniza ou dessintoniza o item de um slot (máx. 3). */
export function toggleAttune(l: Loadout, slot: GearSlot): LoadoutResult {
  if (!l.equipped[slot]) return { ok: false, reason: 'vazio' };
  if (l.attuned.includes(slot)) return { ok: true, loadout: { ...l, attuned: l.attuned.filter((s) => s !== slot) } };
  if (l.attuned.length >= MAX_ATTUNED) return { ok: false, reason: 'limite' };
  return { ok: true, loadout: { ...l, attuned: [...l.attuned, slot] } };
}

/**
 * Trocas livres fora de combate; no dia em que já houve rodada, o arsenal fica travado até a meia-noite
 * (PV e habilidades são por dia: trocar no meio da luta daria, por exemplo, Giges e depois outro anel).
 */
export const gearLocked = (roundsToday: number) => roundsToday > 0;

/**
 * Soma dos bônus: atributo só dos sintonizados; CA de armadura e escudo de todo equipado. `relics` = lendários sintonizados.
 * Sem `attuned`, todo equipado conta como sintonizado (fichas montadas à mão, testes).
 */
export function bonusesFor(equipped: Equipped, attuned: GearSlot[] = Object.keys(equipped) as GearSlot[]) {
  const attrs: Record<AttrKey, number> = { forca: 0, destreza: 0, constituicao: 0, intelecto: 0 };
  let armor = 0, shield = 0;
  const relics: string[] = [];
  for (const [slot, id] of Object.entries(equipped) as [GearSlot, string][]) {
    const g = gearById(id);
    if (!g) continue;
    if (attuned.includes(slot)) {
      attrs[g.attr] += RARITY_BONUS[g.rarity];
      if (g.ability) relics.push(g.id);
    }
    if (g.slot === 'armadura') armor += g.ac ?? 0;
    if (g.slot === 'escudo') shield += g.ac ?? 0;
  }
  return { attrs, armor, shield, relics };
}

const ATTR_NAME: Record<AttrKey, string> = { forca: 'Força', destreza: 'Destreza', constituicao: 'Constituição', intelecto: 'Intelecto' };
/** Textos do item: `base` vale só de equipar ("CA +2", "Dano 1d8"); `attuned` só sintonizado ("+2 Constituição"). */
export const gearText = (g: GearItem) => ({
  base: g.damage ? `Dano ${g.damage}` : g.ac ? `CA +${g.ac}` : null,
  attuned: `+${RARITY_BONUS[g.rarity]} ${ATTR_NAME[g.attr]}`,
});
