import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, SharedValue, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useTheme } from '../constants/theme';
import { Coin } from './Medallion';

export type ChestPhase = 'closed' | 'shaking' | 'open';
const W = 150;
const H = 96;
const LID = 44;
const SPARKS = [-46, -22, 0, 22, 46];

/** Baú de bronze desenhado com Views: treme, a tampa se abre, a luz sobe e as moedas saltam. */
export function Chest({ phase }: { phase: ChestPhase }) {
  const t = useTheme();
  const shake = useSharedValue(0);
  const lid = useSharedValue(0);
  const glow = useSharedValue(0);
  const coins = useSharedValue(0);

  useEffect(() => {
    if (phase === 'shaking') {
      shake.value = withRepeat(withSequence(withTiming(1, { duration: 55 }), withTiming(-1, { duration: 110 }), withTiming(0, { duration: 55 })), 4);
    } else if (phase === 'open') {
      shake.value = withTiming(0, { duration: 80 });
      lid.value = withSpring(1, { damping: 9, stiffness: 120 });
      glow.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
      coins.value = withDelay(180, withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }));
    } else {
      shake.value = 0; lid.value = 0; glow.value = 0; coins.value = 0;
    }
  }, [phase, shake, lid, glow, coins]);

  const body = useAnimatedStyle(() => ({ transform: [{ rotate: `${shake.value * 3}deg` }] }));
  const lidSt = useAnimatedStyle(() => ({ transform: [{ translateY: -lid.value * LID * 0.85 }, { rotate: `${-lid.value * 7}deg` }] }));
  const mouth = useAnimatedStyle(() => ({ opacity: lid.value }));
  const glowSt = useAnimatedStyle(() => ({ opacity: glow.value, transform: [{ scale: 0.6 + glow.value * 0.4 }] }));
  const beam = useAnimatedStyle(() => ({ opacity: glow.value * 0.22, transform: [{ scaleY: glow.value }] }));

  const metal = t.bronze;
  return (
    <View style={{ width: W + 80, height: H + LID + 50, alignItems: 'center', justifyContent: 'flex-end' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[{ position: 'absolute', bottom: H * 0.1, width: W * 1.4, height: W * 1.4, alignItems: 'center', justifyContent: 'center' }, glowSt]}>
        {[1, 0.74, 0.5].map((k) => <View key={k} style={{ position: 'absolute', width: W * 1.4 * k, height: W * 1.4 * k, borderRadius: W, backgroundColor: t.gold, opacity: 0.07 }} />)}
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', bottom: H - 6, width: W * 0.62, height: 96, backgroundColor: t.gold, borderTopLeftRadius: 60, borderTopRightRadius: 60, transformOrigin: 'bottom' }, beam]} />
      {SPARKS.map((x, i) => <Spark key={i} x={x} i={i} p={coins} />)}
      <Animated.View style={[{ width: W, height: H + LID }, body]}>
        {/* corpo */}
        <View style={{ position: 'absolute', bottom: 0, width: W, height: H, borderRadius: 6, backgroundColor: t.card2, borderWidth: 3, borderColor: metal, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 10, backgroundColor: t.track, opacity: 0.8 }} />
          {[0.2, 0.8].map((p) => <View key={p} style={{ position: 'absolute', left: `${p * 100}%`, top: 0, bottom: 0, width: 10, marginLeft: -5, backgroundColor: metal }} />)}
          <View style={{ position: 'absolute', left: W / 2 - 13 - 3, top: 8, width: 26, height: 30, borderRadius: 4, backgroundColor: t.gold, borderWidth: 2, borderColor: t.bronze }}>
            <View style={{ alignSelf: 'center', marginTop: 8, width: 6, height: 12, borderRadius: 3, backgroundColor: t.track }} />
          </View>
        </View>
        {/* boca aberta: interior escuro com luz dourada */}
        <Animated.View style={[{ position: 'absolute', top: LID - 8, left: 6, width: W - 12, height: 16, borderRadius: 4, backgroundColor: t.track, borderBottomWidth: 3, borderColor: t.gold }, mouth]} />
        {/* tampa: gira para tras em torno da borda inferior (dobradica) */}
        <Animated.View style={[{ position: 'absolute', top: 0, width: W, height: LID, transformOrigin: 'bottom' }, lidSt]}>
          <View style={{ flex: 1, borderTopLeftRadius: 40, borderTopRightRadius: 40, backgroundColor: t.card2, borderWidth: 3, borderColor: metal, overflow: 'hidden' }}>
            {[0.2, 0.8].map((p) => <View key={p} style={{ position: 'absolute', left: `${p * 100}%`, top: 0, bottom: 0, width: 10, marginLeft: -5, backgroundColor: metal }} />)}
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, backgroundColor: t.gold }} />
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function Spark({ x, i, p }: { x: number; i: number; p: SharedValue<number> }) {
  const st = useAnimatedStyle(() => ({
    opacity: p.value === 0 ? 0 : 1 - p.value,
    transform: [{ translateX: x * (0.5 + p.value) }, { translateY: -(H + 10) - p.value * (46 + (i % 3) * 22) }],
  }));
  return <Animated.View style={[{ position: 'absolute', bottom: 0 }, st]}><Coin size={16} /></Animated.View>;
}
