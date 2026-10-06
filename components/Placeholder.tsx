import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useTheme } from '../constants/theme';
import { Meander, T } from './ui';

type Glyph = keyof typeof MaterialCommunityIcons.glyphMap;

/** Tela "em breve": emblema, titulo serifado, friso e uma linha de contexto. */
export function Placeholder({ icon, title, line }: { icon: Glyph; title: string; line: string }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 18 }}>
      <View style={{ width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: t.gold, alignItems: 'center', justifyContent: 'center', backgroundColor: t.card }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, borderWidth: 1, borderColor: t.bronze, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name={icon} size={40} color={t.gold} />
        </View>
      </View>
      <T serif style={{ fontSize: 26, letterSpacing: 3, fontWeight: '700' }}>{title.toUpperCase()}</T>
      <View style={{ width: 120 }}><Meander cell={2} opacity={0.7} /></View>
      <T sub style={{ textAlign: 'center', lineHeight: 22 }}>{line}</T>
      <T style={{ fontSize: 12, letterSpacing: 2, color: t.ember }} serif>EM BREVE</T>
    </View>
  );
}
