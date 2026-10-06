import { ReactNode, useEffect } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextProps, TextStyle, View, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { F, radius, shadow, useTheme } from '../constants/theme';
import { Divider, Meander } from './Meander';

export { Divider, Meander };

/** Card: superficie com borda de bronze. `frieze` poe o meandro no topo (use so em cards importantes: heroi, chefao). */
export function Card({ children, style, frieze }: { children: ReactNode; style?: StyleProp<ViewStyle>; frieze?: boolean }) {
  const t = useTheme();
  return (
    <View style={[s.card, { backgroundColor: t.card, borderColor: t.border }, shadow(t), style]}>
      {frieze && <Meander cell={2} opacity={0.55} />}
      {children}
    </View>
  );
}

const SEMI = new Set(['600', '700', '800', '900', 'bold']);
/** Texto. `serif` = Cinzel (titulos/numeros). fontWeight >= 600 troca para a variante certa da fonte. */
export function T({ style, sub, serif, ...p }: TextProps & { sub?: boolean; serif?: boolean }) {
  const t = useTheme();
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const heavy = SEMI.has(String(flat.fontWeight));
  const family = serif ? (heavy ? F.display : F.displayMed) : heavy ? F.bodySemi : F.body;
  return <Text {...p} style={[{ color: sub ? t.sub : t.text, fontSize: 15, fontFamily: family }, style, { fontWeight: 'normal' }]} />;
}

/** Titulo de secao: caixa-alta serifada espacada + filete. */
export function SectionTitle({ children, right }: { children: string; right?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <T serif style={{ fontSize: 13, letterSpacing: 2, color: t.bronze, fontWeight: '700' }}>{children.toUpperCase()}</T>
      <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
      {right}
    </View>
  );
}

/**
 * Barra animada: sulco escuro com aro de bronze, preenchimento com realce de metal,
 * graduacao em quartos e ponta incandescente. `value` 0..1.
 */
export function Bar({ value, color, height = 12 }: { value: number; color: string; height?: number }) {
  const t = useTheme();
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withTiming(Math.max(0, Math.min(1, value)), { duration: 800, easing: Easing.out(Easing.cubic) });
  }, [value, w]);
  const st = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  const r = Math.min(6, height / 2);
  return (
    <View style={{ height, borderRadius: r, backgroundColor: t.track, borderWidth: 1, borderColor: t.border, overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', backgroundColor: color, borderRadius: r }, st]}>
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '38%', backgroundColor: '#FFFFFF', opacity: 0.2 }} />
        <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 3, backgroundColor: '#FFFFFF', opacity: 0.35 }} />
      </Animated.View>
      {[0.25, 0.5, 0.75].map((p) => (
        <View key={p} style={{ position: 'absolute', left: `${p * 100}%`, top: 0, bottom: 0, width: 1, backgroundColor: t.bg, opacity: 0.35 }} />
      ))}
    </View>
  );
}

/** Botao. `variant`: 'primary' (brasa, uma por tela) | 'ghost' (contorno de bronze) | 'danger' (acao destrutiva confirmada). */
export function Button({ title, onPress, disabled, style, variant = 'primary', icon }: {
  title: string; onPress: () => void; disabled?: boolean; style?: StyleProp<ViewStyle>; variant?: 'primary' | 'ghost' | 'danger'; icon?: ReactNode;
}) {
  const t = useTheme();
  const k = useSharedValue(1);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: k.value }] }));
  const primary = variant !== 'ghost';
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => (k.value = withSpring(0.97, { duration: 150 }))}
      onPressOut={() => (k.value = withSpring(1, { duration: 200 }))}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
    >
      <Animated.View
        style={[
          s.btn,
          primary
            ? { backgroundColor: variant === 'danger' ? t.danger : t.primary, borderColor: t.gold }
            : { backgroundColor: 'transparent', borderColor: t.bronze },
          { opacity: disabled ? 0.4 : 1 },
          style,
          st,
        ]}
      >
        {icon}
        <Text style={{ color: variant === 'danger' ? '#FFF4EA' : primary ? t.onPrimary : t.text, fontFamily: F.display, fontSize: 14, letterSpacing: 1.5 }}>{title.toUpperCase()}</Text>
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: 16, borderWidth: 1, gap: 12, overflow: 'hidden' },
  btn: { borderRadius: radius.md, borderWidth: 1, minHeight: 48, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
});
