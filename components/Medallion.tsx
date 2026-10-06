import { Text, View } from 'react-native';
import { F, useTheme } from '../constants/theme';

/** Medalhao de nivel: disco com aro duplo de bronze e numero serifado. */
export function Medallion({ level, size = 56, label = true }: { level: number; size?: number; label?: boolean }) {
  const t = useTheme();
  const inner = size - 8;
  return (
    <View
      accessible
      accessibilityLabel={`Nível ${level}`}
      style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: t.gold, backgroundColor: t.card2, alignItems: 'center', justifyContent: 'center' }}
    >
      <View style={{ width: inner, height: inner, borderRadius: inner / 2, borderWidth: 1, borderColor: t.bronze, alignItems: 'center', justifyContent: 'center' }}>
        {label && <Text style={{ fontFamily: F.bodySemi, fontSize: size * 0.14, letterSpacing: 1, color: t.sub, marginBottom: -size * 0.04 }}>NÍVEL</Text>}
        <Text style={{ fontFamily: F.displayBlack, fontSize: size * (label ? 0.34 : 0.42), color: t.gold, includeFontPadding: false }}>{level}</Text>
      </View>
    </View>
  );
}

/** Moeda (obolo): disco dourado com aro interno. */
export function Coin({ size = 16 }: { size?: number }) {
  const t = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.gold, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.62, height: size * 0.62, borderRadius: size, borderWidth: 1.5, borderColor: t.bg, opacity: 0.55 }} />
    </View>
  );
}
