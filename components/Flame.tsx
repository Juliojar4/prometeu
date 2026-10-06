import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useTheme } from '../constants/theme';

/** Chama de streak: duas camadas (brasa + miolo dourado) oscilando fora de fase, com halo pulsante. `lit=false` = apagada (cansado). */
export function Flame({ size = 48, lit = true }: { size?: number; lit?: boolean }) {
  const t = useTheme();
  const a = useSharedValue(0);
  const b = useSharedValue(0);
  useEffect(() => {
    if (!lit) return;
    const loop = (ms: number) => withRepeat(withSequence(withTiming(1, { duration: ms, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: ms, easing: Easing.inOut(Easing.sin) })), -1);
    a.value = loop(900);
    b.value = loop(620);
  }, [lit, a, b]);
  const outer = useAnimatedStyle(() => ({ transform: [{ rotate: `${(a.value - 0.5) * 6}deg` }, { scaleY: 1 + a.value * 0.06 }, { scaleX: 1 - a.value * 0.03 }] }));
  const core = useAnimatedStyle(() => ({ transform: [{ rotate: `${(0.5 - b.value) * 8}deg` }, { scaleY: 1 + b.value * 0.1 }] }));
  const halo = useAnimatedStyle(() => ({ opacity: 0.05 + a.value * 0.06, transform: [{ scale: 1 + b.value * 0.08 }] }));
  const base = lit ? t.ember : t.sub;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no">
      {lit && <Animated.View style={[{ position: 'absolute', width: size * 0.9, height: size * 0.9, borderRadius: size, backgroundColor: t.ember }, halo]} />}
      <Animated.View style={[{ position: 'absolute', transformOrigin: 'bottom' }, outer]}>
        <MaterialCommunityIcons name="fire" size={size} color={base} />
      </Animated.View>
      {lit && (
        <Animated.View style={[{ position: 'absolute', bottom: size * 0.12, transformOrigin: 'bottom' }, core]}>
          <MaterialCommunityIcons name="fire" size={size * 0.5} color={t.gold} />
        </Animated.View>
      )}
    </View>
  );
}
