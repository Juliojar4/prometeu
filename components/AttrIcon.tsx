import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useTheme } from '../constants/theme';
import { ATTR_LABEL, ATTRS, modLabel, scoreFromXp, scoreProgress, type AttrKey, type AttrXp } from '../lib/game';
import { Bar, T } from './ui';

export const ATTR_GLYPH: Record<AttrKey, keyof typeof MaterialCommunityIcons.glyphMap> = { forca: 'sword', destreza: 'feather', constituicao: 'heart-pulse', intelecto: 'book-open-page-variant' };

/** Ícone de atributo: glifo vetorial na cor do atributo dentro de um medalhao com aro. */
export function AttrIcon({ attr, size = 32 }: { attr: AttrKey; size?: number }) {
  const t = useTheme();
  const c = t.attr[attr];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: c, backgroundColor: c + '22', alignItems: 'center', justifyContent: 'center' }}>
      <MaterialCommunityIcons name={ATTR_GLYPH[attr]} size={size * 0.56} color={c} />
    </View>
  );
}

/** Lista dos 4 atributos (Home e perfil): valor · modificador e barra até o próximo valor. */
export function AttrRows({ attrs }: { attrs: AttrXp }) {
  const t = useTheme();
  return ATTRS.map((a) => {
    const score = scoreFromXp(attrs[a]);
    return (
      <View key={a} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} accessible accessibilityLabel={`${ATTR_LABEL[a]}: ${score}, modificador ${modLabel(score)}`}>
        <AttrIcon attr={a} size={34} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <T style={{ fontWeight: '600' }}>{ATTR_LABEL[a]}</T>
            <T serif style={{ fontSize: 15, fontWeight: '700' }}>{score}<T sub style={{ fontSize: 13 }}>  ·  {modLabel(score)}</T></T>
          </View>
          <Bar value={scoreProgress(attrs[a])} color={t.attr[a]} height={9} />
        </View>
      </View>
    );
  });
}
