import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { lookOf, type AttrKey } from '../lib/game';
import { useGame } from '../store/game';

/**
 * Prometeu: obsidiana e brasa no escuro (principal), marmore e pergaminho no claro.
 * As chaves antigas (bg, card, text, sub, track, border, primary, onPrimary, coin, fire, danger) continuam.
 */
const dark = {
  bg: '#110F0D', // obsidiana quente
  card: '#1A1714',
  card2: '#231F1A',
  track: '#0B0A09', // sulco da barra
  border: '#3A3026', // bronze apagado
  text: '#EDE3D0', // pergaminho
  sub: '#A39683',
  primary: '#E8622A', // brasa
  onPrimary: '#1A0E07',
  bronze: '#B98A4A',
  gold: '#D9B26B',
  coin: '#D9B26B',
  fire: '#F08A3C',
  ember: '#E8622A',
  danger: '#C4452F',
  marble: '#D8CDB6',
  // Destreza: verdete (pátina do bronze); contraste >= 5:1 sobre card/card2 de todos os temas
  attr: { forca: '#D1633A', destreza: '#56AFA2', constituicao: '#8FA05A', intelecto: '#A98BD0' } as Record<AttrKey, string>,
  water: '#5C8DBA', // azul-egeu da água (ânfora)
  scheme: 'dark' as 'dark' | 'light',
};
const light: typeof dark = {
  bg: '#F2EDE2', // marmore
  card: '#FBF8F1',
  card2: '#EAE3D3',
  track: '#DDD3BE',
  border: '#CBBE9F',
  text: '#2A231B',
  sub: '#6B6051',
  primary: '#C4501B',
  onPrimary: '#FFF8EF',
  bronze: '#86602B',
  gold: '#9A7125',
  coin: '#9A7125',
  fire: '#C4501B',
  ember: '#D2561C',
  danger: '#A8341F',
  marble: '#E4DAC4',
  attr: { forca: '#B5471F', destreza: '#1A675E', constituicao: '#5F6F34', intelecto: '#6A4B9C' } as Record<AttrKey, string>,
  water: '#2F5F8C',
  scheme: 'light',
};

/**
 * Temas da loja: cada um redefine só o que muda (superfícies, bordas, texto, acento). O resto herda do padrão.
 * Todos têm variante escura e clara; o sistema (claro/escuro) continua mandando.
 */
type Palette = Partial<Omit<typeof dark, 'scheme' | 'attr'>>;
const THEMES: Record<string, { dark: Palette; light: Palette }> = {
  brasa: {
    dark: {
      bg: '#160C0A', card: '#20120E', card2: '#2B1913', track: '#0E0605', border: '#4A2B20', text: '#F0DFCB', sub: '#B39A88',
      primary: '#F2702E', onPrimary: '#1E0C05', bronze: '#C9824A', gold: '#E8B66A', coin: '#E8B66A', fire: '#F6994A', ember: '#F2702E', danger: '#D4553B', marble: '#DCC9B0',
    },
    light: {
      bg: '#F6E9DC', card: '#FFF6EC', card2: '#F0DCC8', track: '#E6CDB4', border: '#D9B596', text: '#33201A', sub: '#745849',
      primary: '#C2400F', onPrimary: '#FFF6EC', bronze: '#945022', gold: '#9C5E17', coin: '#9C5E17', fire: '#C2400F', ember: '#C9461A', danger: '#A2301C', marble: '#EBD6BE',
    },
  },
  egeu: {
    dark: {
      bg: '#0A1316', card: '#101C21', card2: '#17272E', track: '#060D10', border: '#284249', text: '#DCEBEE', sub: '#8FA9B0',
      primary: '#3E9BC0', onPrimary: '#04141C', bronze: '#6FA3B5', gold: '#D6BE7C', coin: '#D6BE7C', fire: '#F08A3C', ember: '#E8742E', danger: '#C4452F', marble: '#C9DADC',
    },
    light: {
      bg: '#EAF1F2', card: '#F6FAFA', card2: '#DCE8EA', track: '#CBDADD', border: '#A8C0C5', text: '#15262B', sub: '#4B636A',
      primary: '#1D6F92', onPrimary: '#F4FBFD', bronze: '#47798A', gold: '#86691C', coin: '#86691C', fire: '#C4501B', ember: '#C4501B', danger: '#A8341F', marble: '#DAE7E9',
    },
  },
};

export type Theme = typeof dark;
const build = (base: Theme, p?: Palette): Theme => ({ ...base, ...p });
const BUILT: Record<string, { dark: Theme; light: Theme }> = {
  obsidiana: { dark, light },
  ...Object.fromEntries(Object.entries(THEMES).map(([k, v]) => [k, { dark: build(dark, v.dark), light: build(light, v.light) }])),
};

/** Compat: cor de atributo (tema escuro). Prefira `useTheme().attr[a]`. */
export const ATTR_COLOR: Record<AttrKey, string> = dark.attr;

/** Mostra um tema sem equipá-lo (prévia na loja). */
export const ThemePreview = createContext<string | null>(null);

/** Fontes: Cinzel (serifada classica) para titulos/numeros, Inter para corpo. */
export const F = {
  display: 'Cinzel_700Bold',
  displayBlack: 'Cinzel_900Black',
  displayMed: 'Cinzel_500Medium',
  body: 'Inter_400Regular',
  bodyMed: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 6, md: 10, lg: 14 };

/** Escuro: sem sombra (borda faz o trabalho). Claro: sombra quente curta. */
export const shadow = (t: Theme) =>
  t.scheme === 'light'
    ? { shadowColor: '#5A4320', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 }
    : {};

export const AVATARS = [
  // ids preservados (gravados no banco); nomes/estetica novos
  { id: 'raposa', nome: 'Guerreiro', bg: '#4A2A1C', kind: 'helmet' as const },
  { id: 'dragao', nome: 'Oráculo', bg: '#2F3A22', kind: 'laurel' as const },
  { id: 'robo', nome: 'Titã', bg: '#1F3347', kind: 'beard' as const },
];
export const avatarById = (id: string) => AVATARS.find((a) => a.id === id) ?? AVATARS[0];

export const useTheme = (): Theme => {
  const scheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const preview = useContext(ThemePreview);
  const equipped = useGame((g) => lookOf(g.equipped).tema?.ref);
  return (BUILT[preview ?? equipped ?? 'obsidiana'] ?? BUILT.obsidiana)[scheme];
};
