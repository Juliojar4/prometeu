export type ItemCategory = 'cor' | 'acessorio' | 'tema' | 'pet';
export type Rarity = 'comum' | 'raro' | 'epico' | 'lendario';
/** Um item equipado por slot: cor, tema, pet e um acessório por posição. */
export type Slot = 'cor' | 'tema' | 'pet' | 'cabeca' | 'costas' | 'mao';

export type Item = {
  id: string;
  category: ItemCategory;
  slot: Slot;
  name: string;
  desc: string;
  price: number;
  rarity: Rarity;
  /** cor: fundo e moldura do avatar. */
  bg?: string;
  ring?: string;
  /** tema: chave em constants/theme.ts. pet: glifo MaterialCommunityIcons. */
  ref?: string;
};

export const RARITY: Record<Rarity, { label: string; rank: number }> = {
  comum: { label: 'Comum', rank: 1 },
  raro: { label: 'Raro', rank: 2 },
  epico: { label: 'Épico', rank: 3 },
  lendario: { label: 'Lendário', rank: 4 },
};

export const CATEGORIES: { id: ItemCategory; label: string }[] = [
  { id: 'cor', label: 'Cores' },
  { id: 'acessorio', label: 'Adereços' },
  { id: 'tema', label: 'Temas' },
  { id: 'pet', label: 'Pets' },
];

const cor = (id: string, name: string, desc: string, price: number, rarity: Rarity, bg: string, ring: string): Item =>
  ({ id, category: 'cor', slot: 'cor', name, desc, price, rarity, bg, ring });
const acc = (id: string, slot: 'cabeca' | 'costas' | 'mao', name: string, desc: string, price: number, rarity: Rarity): Item =>
  ({ id, category: 'acessorio', slot, name, desc, price, rarity });
const tema = (id: string, ref: string, name: string, desc: string, price: number, rarity: Rarity): Item =>
  ({ id, category: 'tema', slot: 'tema', name, desc, price, rarity, ref });
const pet = (id: string, ref: string, name: string, desc: string, price: number, rarity: Rarity): Item =>
  ({ id, category: 'pet', slot: 'pet', name, desc, price, rarity, ref });

export const ITEMS: Item[] = [
  cor('cor-egeu', 'Azul do Egeu', 'Fundo de mar profundo com aro de espuma.', 40, 'comum', '#173A4C', '#7FB8D8'),
  cor('cor-esmeralda', 'Oliveira', 'Verde de bosque sagrado.', 40, 'comum', '#1B3B2E', '#6FB596'),
  cor('cor-ares', 'Sangue de Ares', 'Vermelho de campo de batalha.', 90, 'raro', '#4A1D18', '#D9604A'),
  cor('cor-purpura', 'Púrpura de Tiro', 'O tom reservado aos reis.', 140, 'raro', '#3B2345', '#B98CC9'),
  cor('cor-hades', 'Noite de Hades', 'Quase preto, aro de prata fria.', 220, 'epico', '#14141C', '#9A9AB8'),
  cor('cor-micenas', 'Ouro de Micenas', 'Fundo de ouro velho, aro reluzente.', 420, 'lendario', '#4A3A14', '#E3C068'),

  acc('acc-diadema', 'cabeca', 'Diadema', 'Filete de bronze com uma gema na testa.', 60, 'comum'),
  acc('acc-louros', 'cabeca', 'Louros dourados', 'A coroa dos vencedores de Olímpia.', 150, 'raro'),
  acc('acc-elmo', 'cabeca', 'Elmo coríntio', 'Bronze polido com penacho de crina.', 260, 'epico'),
  acc('acc-capa', 'costas', 'Capa de púrpura', 'Manto esvoaçante preso por um broche.', 180, 'raro'),
  acc('acc-aspis', 'mao', 'Áspis', 'O escudo redondo do hoplita.', 200, 'raro'),
  acc('acc-tocha', 'mao', 'Tocha de Prometeu', 'Uma brasa roubada dos deuses, sempre acesa.', 450, 'lendario'),

  tema('tema-brasa', 'brasa', 'Brasa do Olimpo', 'Carvão em brasa: vermelhos profundos e cobre quente.', 300, 'epico'),
  tema('tema-egeu', 'egeu', 'Mar Egeu', 'Azul de maré e espuma. Chama laranja só onde importa.', 300, 'epico'),

  pet('pet-coruja', 'owl', 'Coruja de Atena', 'Vigia em silêncio e lembra a sabedoria.', 120, 'raro'),
  pet('pet-argos', 'dog', 'Argos', 'O cão fiel que esperou vinte anos.', 120, 'raro'),
  pet('pet-serpente', 'snake', 'Serpente de Asclépio', 'Guardiã da cura e do cuidado.', 200, 'raro'),
  pet('pet-aguia', 'bird', 'Águia de Zeus', 'Mensageira do trovão.', 380, 'epico'),
  pet('pet-pegaso', 'horse-variant', 'Pégaso', 'O cavalo alado nascido do mármore e do mar.', 700, 'lendario'),
];

export const itemById = (id: string) => ITEMS.find((i) => i.id === id);
export const itemsByCategory = (c: ItemCategory) => ITEMS.filter((i) => i.category === c);

export type Purchase = { ok: true; coins: number; owned: string[] } | { ok: false; reason: 'saldo' | 'possui' | 'inexistente' };

/** Compra com validação: item existe, ainda não é seu e o saldo cobre o preço. Não muta a entrada. */
export function purchase(coins: number, owned: string[], itemId: string): Purchase {
  const it = itemById(itemId);
  if (!it) return { ok: false, reason: 'inexistente' };
  if (owned.includes(itemId)) return { ok: false, reason: 'possui' };
  if (coins < it.price) return { ok: false, reason: 'saldo' };
  return { ok: true, coins: coins - it.price, owned: [...owned, itemId] };
}

/** Equipa o item (troca quem ocupava o mesmo slot) ou, se já equipado, desequipa. Só itens possuídos. */
export function toggleEquip(equipped: string[], owned: string[], itemId: string): string[] {
  const it = itemById(itemId);
  if (!it || !owned.includes(itemId)) return equipped;
  if (equipped.includes(itemId)) return equipped.filter((x) => x !== itemId);
  return [...equipped.filter((x) => itemById(x)?.slot !== it.slot), itemId];
}

/** Aparência derivada dos itens equipados. */
export type Look = { cor: Item | null; acc: Item[]; pet: Item | null; tema: Item | null };
export function lookOf(equipped: string[]): Look {
  const its = equipped.map(itemById).filter((i): i is Item => !!i);
  return { cor: its.find((i) => i.slot === 'cor') ?? null, acc: its.filter((i) => i.category === 'acessorio'), pet: its.find((i) => i.slot === 'pet') ?? null, tema: its.find((i) => i.slot === 'tema') ?? null };
}
