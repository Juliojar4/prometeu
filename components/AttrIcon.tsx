import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useTheme } from '../constants/theme';
import type { Attr } from '../lib/game';

export const ATTR_GLYPH: Record<Attr, keyof typeof MaterialCommunityIcons.glyphMap> = { forca: 'sword', vitalidade: 'leaf', energia: 'waves', intelecto: 'book-open-page-variant' };

/** Ícone de atributo: glifo vetorial na cor do atributo dentro de um medalhao com aro. */
export function AttrIcon({ attr, size = 32 }: { attr: Attr; size?: number }) {
  const t = useTheme();
  const c = t.attr[attr];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: c, backgroundColor: c + '22', alignItems: 'center', justifyContent: 'center' }}>
      <MaterialCommunityIcons name={ATTR_GLYPH[attr]} size={size * 0.56} color={c} />
    </View>
  );
}
