import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useTheme } from '../constants/theme';
import { Meander } from './Meander';

const D = 150; // diametro da pança

/** Ânfora de bronze que enche (0..1). `drop` muda a cada copo para soltar uma gota no gargalo. */
export function Amphora({ frac, drop }: { frac: number; drop: number }) {
  const t = useTheme();
  const level = useSharedValue(0);
  const fall = useSharedValue(0);
  const shine = useSharedValue(0.25);
  const first = useRef(true);

  useEffect(() => {
    level.value = withTiming(Math.max(0, Math.min(1, frac)), { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [frac, level]);
  useEffect(() => {
    shine.value = withRepeat(withSequence(withTiming(0.5, { duration: 1400 }), withTiming(0.2, { duration: 1400 })), -1);
  }, [shine]);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    fall.value = 0;
    fall.value = withTiming(1, { duration: 650, easing: Easing.in(Easing.quad) });
  }, [drop, fall]);

  const fill = useAnimatedStyle(() => ({ height: level.value * (D - 4) }));
  const dropSt = useAnimatedStyle(() => ({ opacity: fall.value === 0 || fall.value === 1 ? 0 : 1 - fall.value * 0.5, transform: [{ translateY: fall.value * 78 }, { rotate: '45deg' }] }));
  const shineSt = useAnimatedStyle(() => ({ opacity: shine.value }));
  const metal = t.bronze;

  return (
    <View style={{ width: D + 56, alignItems: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* asas */}
      <View style={{ position: 'absolute', top: 12, left: 36, width: 56, height: 62, borderWidth: 3, borderColor: metal, borderTopLeftRadius: 30, borderBottomLeftRadius: 44, borderRightWidth: 0 }} />
      <View style={{ position: 'absolute', top: 12, right: 36, width: 56, height: 62, borderWidth: 3, borderColor: metal, borderTopRightRadius: 30, borderBottomRightRadius: 44, borderLeftWidth: 0 }} />
      {/* boca e gargalo */}
      <View style={{ width: 64, height: 9, backgroundColor: t.gold, borderRadius: 2 }} />
      <View style={{ width: 38, height: 36, borderLeftWidth: 3, borderRightWidth: 3, borderColor: metal, backgroundColor: t.card2 }} />
      <Animated.View style={[{ position: 'absolute', top: 2, width: 9, height: 9, borderRadius: 5, borderTopLeftRadius: 0, backgroundColor: t.attr.energia }, dropSt]} />
      {/* pança */}
      <View style={{ width: D, height: D, borderRadius: D / 2, borderWidth: 3, borderColor: t.gold, backgroundColor: t.track, overflow: 'hidden', justifyContent: 'flex-end' }}>
        <Animated.View style={[{ backgroundColor: t.attr.energia, opacity: 0.92 }, fill]}>
          <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, backgroundColor: '#FFFFFF' }, shineSt]} />
        </Animated.View>
        <View style={{ position: 'absolute', top: D * 0.4, left: 0, right: 0 }}>
          <Meander cell={3} color={t.gold} opacity={0.55} />
        </View>
        {[0.25, 0.5, 0.75].map((p) => (
          <View key={p} style={{ position: 'absolute', right: 0, bottom: (D - 6) * p, width: 10, height: 1, backgroundColor: t.gold, opacity: 0.6 }} />
        ))}
      </View>
      {/* pé */}
      <View style={{ width: 30, height: 8, backgroundColor: metal, marginTop: -2 }} />
      <View style={{ width: 70, height: 7, backgroundColor: t.gold, borderRadius: 2 }} />
    </View>
  );
}
