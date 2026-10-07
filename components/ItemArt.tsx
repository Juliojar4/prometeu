import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View } from 'react-native';
import { radius, ThemePreview, useTheme } from '../constants/theme';
import { GEAR_RARITY_LABEL, GearItem, GearRarity, Item, Look, RARITY, Rarity, RARITY_RANK } from '../lib/game';
import { Avatar } from './Avatar';

/** Raridade em losangos (1 a 4): nada de cores extras na paleta. `gear` = raridade de equipamento (comum a lendário). */
export function RarityMarks({ rarity, gear, size = 7 }: { rarity?: Rarity; gear?: GearRarity; size?: number }) {
  const t = useTheme();
  const rank = gear ? RARITY_RANK[gear] : RARITY[rarity!].rank;
  return (
    <View style={{ flexDirection: 'row', gap: 4 }} accessible accessibilityLabel={gear ? GEAR_RARITY_LABEL[gear] : RARITY[rarity!].label}>
      {[1, 2, 3, 4].map((n) => (
        <View key={n} style={{ width: size, height: size, transform: [{ rotate: '45deg' }], backgroundColor: n <= rank ? t.gold : 'transparent', borderWidth: 1, borderColor: n <= rank ? t.gold : t.border }} />
      ))}
    </View>
  );
}

/**
 * Equipamento: glifo sobre um losango de bronze (o mesmo desenho da insígnia de classe, sem a cor do atributo).
 * Lendário: aro de ouro e um halo dourado sutil; `dim` = não possuído/sem sintonia.
 */
export function GearArt({ item, size = 56, dim }: { item: GearItem; size?: number; dim?: boolean }) {
  const t = useTheme();
  const legend = item.rarity === 'lendario';
  const d = size * 0.7;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', opacity: dim ? 0.55 : 1 }}>
      {legend && <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: t.gold, opacity: 0.12 }} />}
      <View style={{ position: 'absolute', width: d, height: d, transform: [{ rotate: '45deg' }], backgroundColor: t.card2, borderWidth: legend ? 2 : 1.5, borderColor: legend || item.rarity === 'raro' ? t.gold : t.bronze }} />
      <MaterialCommunityIcons name={item.icon as never} size={size * 0.42} color={legend ? t.gold : t.text} />
    </View>
  );
}

/** Prévia do item: avatar com a cor/adereço aplicado, medalhão do companheiro ou amostra do tema. */
export function ItemArt({ item, avatarId, size = 84, look }: { item: Item; avatarId: string; size?: number; look?: Look }) {
  const t = useTheme();
  if (look && item.category !== 'tema') return <Avatar id={avatarId} size={size} look={look} />;
  if (item.category === 'cor' || item.category === 'acessorio') {
    return <Avatar id={avatarId} size={size} look={{ cor: item.category === 'cor' ? item : null, acc: item.category === 'acessorio' ? [item] : [], pet: null, tema: null }} />;
  }
  if (item.category === 'pet') {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: t.gold, backgroundColor: t.card2, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name={item.ref as never} size={size * 0.5} color={t.gold} />
      </View>
    );
  }
  return (
    <ThemePreview.Provider value={item.ref ?? null}>
      <ThemeSwatch size={size} />
    </ThemePreview.Provider>
  );
}

/** Miniatura do app no tema em prévia (lê as cores via useTheme, já dentro do Provider). */
function ThemeSwatch({ size }: { size: number }) {
  const t = useTheme();
  const w = size * 1.25;
  return (
    <View style={{ width: w, height: size, borderRadius: radius.md, borderWidth: 1, borderColor: t.border, backgroundColor: t.bg, padding: 7, gap: 6, overflow: 'hidden' }}>
      <View style={{ flex: 1, borderRadius: radius.sm, borderWidth: 1, borderColor: t.border, backgroundColor: t.card, padding: 6, gap: 5 }}>
        <View style={{ height: 5, width: '60%', backgroundColor: t.text, opacity: 0.85 }} />
        <View style={{ height: 5, borderRadius: 3, backgroundColor: t.track, borderWidth: 1, borderColor: t.border }}>
          <View style={{ width: '58%', height: '100%', backgroundColor: t.ember }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.gold }} />
          <View style={{ height: 4, flex: 1, backgroundColor: t.sub, opacity: 0.6 }} />
        </View>
      </View>
      <View style={{ height: 10, borderRadius: radius.sm, backgroundColor: t.primary }} />
    </View>
  );
}
