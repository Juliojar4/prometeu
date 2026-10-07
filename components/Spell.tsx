import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { useTheme } from '../constants/theme';
import type { Fx, Spell } from '../lib/game';
import { spellById } from '../lib/game';
import { T } from './ui';

type Glyph = keyof typeof MaterialCommunityIcons.glyphMap;

/** Selo do deus: disco com aro duplo (ouro por fora, bronze por dentro) e o glifo ao centro. Selado = esmaecido. */
export function GodSeal({ spell, size = 44, sealed, active }: { spell: Spell; size?: number; sealed?: boolean; active?: boolean }) {
  const t = useTheme();
  const inner = size - 6;
  const ring = sealed ? t.border : spell.id === 'prometeu' ? t.ember : t.gold;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: ring, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? t.card2 : 'transparent' }}>
      <View style={{ width: inner, height: inner, borderRadius: inner / 2, borderWidth: 1, borderColor: sealed ? t.border : t.bronze, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name={spell.icon as Glyph} size={size * 0.46} color={sealed ? t.sub : spell.id === 'prometeu' ? t.ember : t.gold} />
      </View>
    </View>
  );
}

/** Custo em centelhas: chamas pequenas. */
export function SparkPips({ n, size = 13, dim }: { n: number; size?: number; dim?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 1 }} accessible accessibilityLabel={`${n} ${n === 1 ? 'centelha' : 'centelhas'}`}>
      {Array.from({ length: n }, (_, i) => <MaterialCommunityIcons key={i} name="fire" size={size} color={dim ? t.sub : t.ember} />)}
    </View>
  );
}

/** "3/4 centelhas" (saldo e teto); dívida em perigo. */
export function SparkCount({ sparks, max, size = 13, label = true }: { sparks: number; max: number; size?: number; label?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} accessible accessibilityLabel={sparks < 0 ? `Dívida de ${-sparks} centelhas` : `${sparks} de ${max} centelhas`}>
      <MaterialCommunityIcons name="fire" size={size + 3} color={sparks > 0 ? t.ember : t.sub} />
      <T serif style={{ fontSize: size, fontWeight: '700', color: sparks < 0 ? t.danger : t.text }}>{sparks < 0 ? `−${-sparks}` : sparks}/{max}</T>
      {label && <T sub style={{ fontSize: size - 1 }}>{sparks < 0 ? 'dívida de centelhas' : sparks === 1 ? 'centelha' : 'centelhas'}</T>}
    </View>
  );
}

/** Efeitos de magia ativos hoje: glifo do deus + quanto falta ("hoje", "3 golpes", "próximo golpe"). */
export function ActiveFx({ fx }: { fx: Fx }) {
  const t = useTheme();
  const items: [string, string][] = [];
  if (fx.atena) items.push(['atena', 'CA +2 hoje']);
  if (fx.posidon) items.push(['posidon', 'ataque −2 hoje']);
  if (fx.demeter) items.push(['demeter', '+1 PV por rodada']);
  if (fx.hermes) items.push(['hermes', 'próximo acerto']);
  if (fx.hestia) items.push(['hestia', 'contra o recuo']);
  if (fx.ares) items.push(['ares', 'próximo golpe']);
  if (fx.forja) items.push(['hefesto', `${fx.forja} ${fx.forja === 1 ? 'golpe' : 'golpes'}`]);
  if (fx.hades) items.push(['hades', `${fx.hades} ${fx.hades === 1 ? 'rodada' : 'rodadas'}`]);
  if (!items.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6, flexShrink: 1 }} accessibilityLabel={`Magias ativas: ${items.map(([id, d]) => `${spellById(id)!.name}, ${d}`).join('; ')}`} accessible>
      {items.map(([id, d]) => (
        <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: t.bronze, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
          <MaterialCommunityIcons name={spellById(id)!.icon as Glyph} size={13} color={t.gold} />
          <T sub style={{ fontSize: 11 }}>{d}</T>
        </View>
      ))}
    </View>
  );
}

/**
 * Brilho da magia sobre o dado: halo dourado que cresce e some, e o glifo do deus subindo.
 * Prometeu em brasa; dádivas de proteção ficam um pouco mais (o escudo "assenta").
 */
export function SpellBurst({ spell, tick }: { spell: Spell | null; tick: number }) {
  const t = useTheme();
  const halo = useSharedValue(0);
  const glyph = useSharedValue(0);
  useEffect(() => {
    if (!tick) return;
    halo.set(0);
    glyph.set(0);
    halo.set(withSequence(withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }), withDelay(220, withTiming(0, { duration: 520 }))));
    glyph.set(withSequence(withTiming(1, { duration: 300, easing: Easing.out(Easing.back(2)) }), withDelay(spell?.kind === 'dadiva' ? 600 : 300, withTiming(0, { duration: 420 }))));
  }, [tick, halo, glyph, spell]);
  const hs = useAnimatedStyle(() => ({ opacity: halo.value * 0.2, transform: [{ scale: 0.5 + halo.value * 0.9 }] }));
  const gs = useAnimatedStyle(() => ({ opacity: glyph.value, transform: [{ scale: 0.6 + glyph.value * 0.5 }, { translateY: (1 - glyph.value) * 14 }] }));
  if (!spell) return null;
  const c = spell.id === 'prometeu' ? t.ember : t.gold;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: c }, hs]} />
      <Animated.View style={[{ position: 'absolute', width: 132, height: 132, borderRadius: 66, borderWidth: 2, borderColor: c }, hs]} />
      <Animated.View style={gs}><MaterialCommunityIcons name={spell.icon as Glyph} size={64} color={c} /></Animated.View>
    </View>
  );
}
