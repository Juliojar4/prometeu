import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useTheme } from '../constants/theme';

type Glyph = keyof typeof MaterialCommunityIcons.glyphMap;

/**
 * Emblema da provação: losango duplo de bronze com o glifo da criatura e quatro pontas nos vértices.
 * Derrotado: tudo em ouro, com a coroa pousada no topo.
 */
export function BossEmblem({ icon, size = 120, defeated }: { icon: string; size?: number; defeated?: boolean }) {
  const t = useTheme();
  const c = defeated ? t.gold : t.danger;
  const d = size * 0.62; // lado do quadrado girado
  const half = (d * Math.SQRT2) / 2; // do centro ao vértice
  const tip = Math.max(5, size * 0.055);
  const tips = [[0, -half], [half, 0], [0, half], [-half, 0]];
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ position: 'absolute', width: size * 0.96, height: size * 0.96, borderRadius: size, borderWidth: 1, borderColor: c, opacity: 0.35 }} />
      <View style={{ position: 'absolute', width: d, height: d, borderWidth: 2, borderColor: c, backgroundColor: t.card2, transform: [{ rotate: '45deg' }] }} />
      <View style={{ position: 'absolute', width: d * 0.84, height: d * 0.84, borderWidth: 1, borderColor: t.bronze, transform: [{ rotate: '45deg' }] }} />
      {tips.map(([x, y], i) => (
        <View key={i} style={{ position: 'absolute', width: tip, height: tip, left: size / 2 + x - tip / 2, top: size / 2 + y - tip / 2, backgroundColor: t.bronze, transform: [{ rotate: '45deg' }] }} />
      ))}
      <MaterialCommunityIcons name={icon as Glyph} size={size * 0.4} color={c} style={{ opacity: defeated ? 0.55 : 1 }} />
      {defeated && (
        <View style={{ position: 'absolute', top: size * 0.02 }}>
          <MaterialCommunityIcons name="crown-outline" size={size * 0.22} color={t.gold} />
        </View>
      )}
    </View>
  );
}
