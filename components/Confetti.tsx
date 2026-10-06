import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

const COLORS = ['#E8622A', '#D9B26B', '#B98A4A', '#8FA05A', '#5C8DBA', '#F08A3C'];

function Piece({ x, delay, color, h }: { x: number; delay: number; color: string; h: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = 0;
    p.value = withDelay(delay, withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }));
  }, [p, delay]);
  const st = useAnimatedStyle(() => ({
    opacity: 1 - p.value,
    transform: [{ translateY: p.value * h }, { translateX: Math.sin(p.value * 8) * 24 }, { rotate: `${p.value * 720}deg` }],
  }));
  return <Animated.View style={[{ position: 'absolute', top: -20, left: x, width: 8, height: 14, borderRadius: 1, backgroundColor: color }, st]} />;
}

/** Chuva de confetes; remonta a cada `tick` > 0. */
export function Confetti({ tick }: { tick: number }) {
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(
    () => Array.from({ length: 40 }, (_, i) => ({ x: Math.random() * width, delay: Math.random() * 400, color: COLORS[i % COLORS.length] })),
    [tick, width], // eslint-disable-line react-hooks/exhaustive-deps
  );
  if (!tick) return null;
  return (
    <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill} key={tick}>
      {pieces.map((p, i) => <Piece key={i} {...p} h={height} />)}
    </Animated.View>
  );
}
