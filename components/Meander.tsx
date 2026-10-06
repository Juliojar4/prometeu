import { useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import { useTheme } from '../constants/theme';

// Chave grega: [col, row, w, h] em celulas. Tile de 6x5 (5 de chave + 1 de respiro), trilho inferior continuo.
const TILE_W = 6;
const TILE_H = 5;
const RECTS: [number, number, number, number][] = [
  [0, 0, 1, 5], [0, 0, 5, 1], [4, 0, 1, 4], [2, 3, 3, 1], [2, 2, 1, 2], [0, 4, 6, 1],
];

/** Friso meandro desenhado com Views. `cell` = espessura do traco em px. */
export function Meander({ cell = 3, color, opacity = 1 }: { cell?: number; color?: string; opacity?: number }) {
  const t = useTheme();
  const [w, setW] = useState(0);
  const tiles = Math.max(0, Math.ceil(w / (TILE_W * cell)));
  const c = color ?? t.bronze;
  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ height: TILE_H * cell, overflow: 'hidden', opacity }}>
      <View style={{ flexDirection: 'row', width: tiles * TILE_W * cell }}>
        {Array.from({ length: tiles }, (_, i) => (
          <View key={i} style={{ width: TILE_W * cell, height: TILE_H * cell }}>
            {RECTS.map(([x, y, rw, rh], j) => (
              <View key={j} style={{ position: 'absolute', left: x * cell, top: y * cell, width: rw * cell, height: rh * cell, backgroundColor: c }} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

/** Divisor: linha fina de bronze com losango central. Use `meander` para o friso completo. */
export function Divider({ meander, style }: { meander?: boolean; style?: object }) {
  const t = useTheme();
  if (meander) return <View style={style}><Meander cell={2} opacity={0.8} /></View>;
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, style]}>
      <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
      <View style={{ width: 6, height: 6, backgroundColor: t.bronze, transform: [{ rotate: '45deg' }] }} />
      <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
    </View>
  );
}
