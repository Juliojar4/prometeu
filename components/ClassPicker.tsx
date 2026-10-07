import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';
import { radius, useTheme } from '../constants/theme';
import { ATTR_LABEL, CLASSES, classById, type ClassId } from '../lib/game';
import { T } from './ui';

type Glyph = keyof typeof MaterialCommunityIcons.glyphMap;

/** Insígnia da classe: losango de bronze com o glifo na cor do atributo (perfil, combate, lista). */
export function ClassBadge({ cls, size = 40, active = true }: { cls: ClassId; size?: number; active?: boolean }) {
  const t = useTheme();
  const c = classById(cls)!;
  const color = t.attr[c.attr];
  const d = size * 0.72;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: d, height: d, transform: [{ rotate: '45deg' }], borderWidth: 1.5, borderColor: active ? color : t.border, backgroundColor: active ? color + '1F' : t.card2 }} />
      <MaterialCommunityIcons name={c.icon as Glyph} size={size * 0.46} color={active ? color : t.sub} />
    </View>
  );
}

/**
 * Escolha de classe em lista: cada senda numa linha (insígnia, nome, atributo e lema); a escolhida se abre com a
 * frase e os dois talentos. Nada de grade de cartões iguais.
 */
export function ClassPicker({ value, onChange, level = 1, current }: { value: ClassId | null; onChange: (c: ClassId) => void; level?: number; current?: ClassId | null }) {
  const t = useTheme();
  return (
    <View style={{ gap: 10 }} accessibilityRole="radiogroup">
      {CLASSES.map((c) => {
        const on = value === c.id;
        const color = t.attr[c.attr];
        return (
          <View key={c.id}>
            <Pressable
              onPress={() => { onChange(c.id); Haptics.selectionAsync().catch(() => {}); }}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${c.name}, ${ATTR_LABEL[c.attr]}. ${c.epithet}`}
              style={[s.row, { borderColor: on ? color : t.border, backgroundColor: on ? t.card2 : t.card, borderLeftWidth: on ? 3 : 1 }]}
            >
              <View style={s.head}>
                <ClassBadge cls={c.id} size={46} active={on} />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <T serif style={{ fontSize: 17, fontWeight: '700' }} numberOfLines={1}>{c.name}</T>
                    {current === c.id && <T serif style={{ fontSize: 10, letterSpacing: 1.5, color: t.gold }}>ATUAL</T>}
                  </View>
                  <T sub style={{ fontSize: 12 }} numberOfLines={1}>
                    <T serif style={{ fontSize: 11, letterSpacing: 1.2, color }}>{ATTR_LABEL[c.attr].toUpperCase()}</T>  ·  {c.epithet}
                  </T>
                </View>
                <View style={[s.pip, { borderColor: on ? color : t.border, backgroundColor: on ? color : 'transparent' }]} />
              </View>
              {on && (
                <View style={{ gap: 10, paddingTop: 4 }}>
                  <T sub style={{ fontSize: 13, lineHeight: 19 }}>{c.line}</T>
                  {c.talents.map((tl) => {
                    const locked = level < tl.level;
                    return (
                      <View key={tl.name} style={{ flexDirection: 'row', gap: 10, opacity: locked ? 0.7 : 1 }}>
                        <View style={[s.lvl, { borderColor: locked ? t.border : t.bronze }]}>
                          <T serif style={{ fontSize: 9, letterSpacing: 1, color: t.sub }}>NV</T>
                          <T serif style={{ fontSize: 13, fontWeight: '700', color: locked ? t.sub : t.gold, marginTop: -2 }}>{tl.level}</T>
                        </View>
                        <View style={{ flex: 1, gap: 1 }}>
                          <T style={{ fontSize: 14, fontWeight: '600' }}>{tl.name}</T>
                          <T sub style={{ fontSize: 13, lineHeight: 18 }}>{tl.desc}</T>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: { borderWidth: 1, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 14, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pip: { width: 10, height: 10, borderWidth: 1.5, transform: [{ rotate: '45deg' }] },
  lvl: { width: 34, height: 38, borderWidth: 1, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
