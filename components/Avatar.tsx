import { useMemo, type ReactElement } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import { avatarById, type Theme, useTheme } from '../constants/theme';
import { Look, lookOf } from '../lib/game';
import { useGame } from '../store/game';

/** Folha de louro: elipse rotacionada. */
function Leaf({ x, y, rot, s, c }: { x: number; y: number; rot: number; s: number; c: string }) {
  return <View style={{ position: 'absolute', left: x - s / 2, top: y - s * 0.22, width: s, height: s * 0.44, borderRadius: s, backgroundColor: c, transform: [{ rotate: `${rot}deg` }] }} />;
}

/** Coroa de louros: dois ramos subindo pelos lados do circulo (raio r, centro cx,cy). */
function Laurel({ cx, cy, r, leaf, color }: { cx: number; cy: number; r: number; leaf: number; color: string }) {
  const leaves: ReactElement[] = [];
  for (let i = 0; i < 7; i++) {
    const ang = (-18 + i * 14) * (Math.PI / 180); // do lado (-18deg) subindo ate ~66deg; espelhado
    for (const side of [1, -1]) {
      const a = side === 1 ? ang : Math.PI - ang;
      const x = cx + Math.cos(a) * r;
      const y = cy - Math.sin(a) * r;
      leaves.push(<Leaf key={`${i}${side}`} x={x} y={y} rot={90 - (a * 180) / Math.PI + (side === 1 ? 28 : -28)} s={leaf} c={color} />);
    }
  }
  return <>{leaves}</>;
}

/** Busto em marmore: cabeca + ombros, mais um atributo que diferencia o personagem. */
function Bust({ kind, d, fg, accent, acc, t }: { kind: 'helmet' | 'laurel' | 'beard'; d: number; fg: string; accent: string; acc: string[]; t: Theme }) {
  const head = d * 0.34;
  const hx = (d - head) / 2;
  const hy = d * 0.2;
  const has = (id: string) => acc.includes(id);
  return (
    <View style={{ width: d, height: d }}>
      {/* capa: atras dos ombros */}
      {has('acc-capa') && (
        <View style={{ position: 'absolute', left: d * 0.05, top: d * 0.56, width: d * 0.9, height: d * 0.7, borderTopLeftRadius: d * 0.45, borderTopRightRadius: d * 0.45, backgroundColor: '#7A2E4F' }} />
      )}
      {/* ombros */}
      <View style={{ position: 'absolute', left: d * 0.14, top: d * 0.64, width: d * 0.72, height: d * 0.6, borderTopLeftRadius: d * 0.36, borderTopRightRadius: d * 0.36, backgroundColor: fg, opacity: 0.92 }} />
      {/* pescoco */}
      <View style={{ position: 'absolute', left: d * 0.43, top: d * 0.5, width: d * 0.14, height: d * 0.2, backgroundColor: fg }} />
      {kind === 'beard' && <View style={{ position: 'absolute', left: hx + head * 0.05, top: hy + head * 0.5, width: head * 0.9, height: head * 0.75, borderBottomLeftRadius: head, borderBottomRightRadius: head, borderTopLeftRadius: head * 0.15, borderTopRightRadius: head * 0.15, backgroundColor: accent }} />}
      {/* cabeca */}
      <View style={{ position: 'absolute', left: hx, top: hy, width: head, height: head * 1.12, borderRadius: head / 2, backgroundColor: fg }} />
      {kind === 'helmet' && (
        <>
          <View style={{ position: 'absolute', left: hx - head * 0.06, top: hy - head * 0.06, width: head * 1.12, height: head * 0.62, borderTopLeftRadius: head, borderTopRightRadius: head, backgroundColor: accent }} />
          <View style={{ position: 'absolute', left: d / 2 - head * 0.07, top: hy - head * 0.34, width: head * 0.14, height: head * 0.4, borderRadius: 2, backgroundColor: accent }} />
          <View style={{ position: 'absolute', left: d / 2 - head * 0.04, top: hy + head * 0.5, width: head * 0.08, height: head * 0.34, backgroundColor: accent }} />
        </>
      )}
      {kind === 'laurel' && <Laurel cx={d / 2} cy={hy + head * 0.5} r={head * 0.62} leaf={head * 0.34} color={accent} />}
      {/* adereços */}
      {has('acc-capa') && <View style={{ position: 'absolute', left: d / 2 - d * 0.035, top: d * 0.63, width: d * 0.07, height: d * 0.07, borderRadius: d, backgroundColor: t.gold }} />}
      {has('acc-diadema') && (
        <>
          <View style={{ position: 'absolute', left: hx - head * 0.02, top: hy + head * 0.2, width: head * 1.04, height: Math.max(2, head * 0.08), backgroundColor: t.gold }} />
          <View style={{ position: 'absolute', left: d / 2 - head * 0.08, top: hy + head * 0.13, width: head * 0.16, height: head * 0.16, backgroundColor: t.ember, borderWidth: 1, borderColor: t.gold, transform: [{ rotate: '45deg' }] }} />
        </>
      )}
      {has('acc-louros') && <Laurel cx={d / 2} cy={hy + head * 0.5} r={head * 0.64} leaf={head * 0.38} color={t.gold} />}
      {has('acc-elmo') && (
        <>
          <View style={{ position: 'absolute', left: d / 2 - head * 0.12, top: hy - head * 0.5, width: head * 0.24, height: head * 0.55, borderTopLeftRadius: head, borderTopRightRadius: head, backgroundColor: t.ember }} />
          <View style={{ position: 'absolute', left: hx - head * 0.1, top: hy - head * 0.1, width: head * 1.2, height: head * 0.7, borderTopLeftRadius: head, borderTopRightRadius: head, backgroundColor: t.bronze, borderWidth: 1, borderColor: t.gold }} />
          <View style={{ position: 'absolute', left: hx - head * 0.1, top: hy + head * 0.3, width: head * 0.2, height: head * 0.55, backgroundColor: t.bronze, borderWidth: 1, borderColor: t.gold }} />
          <View style={{ position: 'absolute', left: hx + head * 0.9, top: hy + head * 0.3, width: head * 0.2, height: head * 0.55, backgroundColor: t.bronze, borderWidth: 1, borderColor: t.gold }} />
        </>
      )}
      {has('acc-aspis') && (
        <View style={{ position: 'absolute', left: d * 0.03, top: d * 0.6, width: d * 0.3, height: d * 0.3, borderRadius: d, backgroundColor: t.bronze, borderWidth: Math.max(2, d * 0.025), borderColor: t.gold, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: d * 0.12, height: d * 0.12, borderRadius: d, borderWidth: 1, borderColor: t.gold }} />
        </View>
      )}
      {has('acc-tocha') && (
        <>
          <View style={{ position: 'absolute', left: d * 0.82, top: d * 0.46, width: Math.max(3, d * 0.045), height: d * 0.48, borderRadius: 2, backgroundColor: t.bronze, transform: [{ rotate: '10deg' }] }} />
          <View style={{ position: 'absolute', left: d * 0.74, top: d * 0.24 }}>
            <MaterialCommunityIcons name="fire" size={d * 0.26} color={t.ember} />
            <View style={{ position: 'absolute', left: d * 0.065, top: d * 0.12 }}><MaterialCommunityIcons name="fire" size={d * 0.13} color={t.gold} /></View>
          </View>
        </>
      )}
    </View>
  );
}

/**
 * Avatar: busto de estatua sobre fundo tonal, aro de bronze e os itens equipados (cor, adereços, companheiro).
 * `look` forca uma aparencia (previa na loja); sem ele, usa o que esta equipado. `tired` = estatua dessaturada + selo de sono.
 */
export function Avatar({ id, tired, size = 64, onPress, look }: { id: string; tired?: boolean; size?: number; onPress?: () => void; look?: Look }) {
  const t = useTheme();
  const equipped = useGame((g) => g.equipped);
  const lk = useMemo(() => look ?? lookOf(equipped), [look, equipped]);
  const a = avatarById(id);
  const ring = Math.max(2, size * 0.035);
  const inner = size - ring * 2 - size * 0.08;
  const body = (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: ring, borderColor: tired ? t.border : lk.cor?.ring ?? t.gold }} />
      <View style={{ width: inner, height: inner, borderRadius: inner / 2, backgroundColor: lk.cor?.bg ?? a.bg, overflow: 'hidden', opacity: tired ? 0.55 : 1 }}>
        <Bust kind={a.kind} d={inner} fg={t.marble} accent={a.kind === 'laurel' ? '#9DB05F' : t.bronze} acc={lk.acc.map((i) => i.id)} t={t} />
      </View>
      {tired && (
        <View style={{ position: 'absolute', right: -size * 0.04, top: -size * 0.04, width: size * 0.36, height: size * 0.36, borderRadius: size, backgroundColor: t.card2, borderWidth: 1, borderColor: t.bronze, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="sleep" size={size * 0.22} color={t.gold} />
        </View>
      )}
      {lk.pet && (
        <View style={{ position: 'absolute', right: -size * 0.06, bottom: -size * 0.06, width: size * 0.38, height: size * 0.38, borderRadius: size, backgroundColor: t.card2, borderWidth: Math.max(1, size * 0.015), borderColor: t.gold, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name={lk.pet.ref as never} size={size * 0.23} color={t.gold} />
        </View>
      )}
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Abrir perfil">{body}</Pressable>
  ) : body;
}
