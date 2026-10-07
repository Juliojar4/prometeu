import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GearArt, ItemArt, RarityMarks } from '../components/ItemArt';
import { Coin } from '../components/Medallion';
import { AppModal, ConfirmModal } from '../components/Modal';
import { Button, Divider, T } from '../components/ui';
import { radius, useTheme } from '../constants/theme';
import { ARMORY, ATTR_LABEL, CATEGORIES, GEAR_PRICE, GEAR_RARITY_LABEL, GearItem, gearText, Item, ItemCategory, itemsByCategory, Look, lookOf, RARITY, SLOT_LABEL, toggleEquip } from '../lib/game';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../store/game';

export default function Loja() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { profile, owned, equipped, buy, equip, gearOwned, loadout, buyGear } = useGame();
  const { aba } = useLocalSearchParams<{ aba?: string }>();
  const [cat, setCat] = useState<ItemCategory | 'armaria'>(aba === 'armaria' ? 'armaria' : 'cor');
  const [gear, setGear] = useState<GearItem | null>(null); // prévia de equipamento
  const [gearConfirm, setGearConfirm] = useState<GearItem | null>(null);
  const [preview, setPreview] = useState<Item | null>(null);
  const [confirm, setConfirm] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);
  const cardW = (width - 40 - 12) / 2;
  const items = useMemo(() => (cat === 'armaria' ? [] : itemsByCategory(cat)), [cat]);
  if (!profile) return null;

  const pLook = (it: Item): Look => lookOf(equipped.includes(it.id) ? equipped : toggleEquip(equipped, [...owned, it.id], it.id));
  const doBuy = async (it: Item) => {
    if (busy) return;
    setBusy(true);
    await buy(it.id);
    setBusy(false);
    setConfirm(null);
    setPreview(it); // volta à prévia, agora com o item equipado
  };
  const doBuyGear = async (g: GearItem) => {
    if (busy) return;
    setBusy(true);
    await buyGear(g.id);
    setBusy(false);
    setGearConfirm(null);
    setGear(g);
  };
  const tabs: { id: ItemCategory | 'armaria'; label: string }[] = [...CATEGORIES, { id: 'armaria', label: 'Armaria' }];

  return (
    <View style={{ flex: 1 }}>
      <View style={[s.between, { paddingHorizontal: 20, paddingBottom: 12 }]}>
        <View>
          <T serif style={{ fontSize: 11, letterSpacing: 3, color: t.bronze, fontWeight: '700' }}>ÁGORA</T>
          <T sub style={{ fontSize: 13 }}>Troque suas moedas por orgulho.</T>
        </View>
        <View style={[s.row, { gap: 8 }]} accessible accessibilityLabel={`${profile.coins} moedas`}>
          <Coin size={22} />
          <T serif style={{ fontSize: 24, fontWeight: '700', color: t.gold }}>{profile.coins}</T>
        </View>
      </View>

      <View style={[s.tabs, { borderColor: t.border }]}>
        {tabs.map((c) => {
          const on = c.id === cat;
          return (
            <Pressable key={c.id} onPress={() => setCat(c.id)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[s.tab, { borderBottomColor: on ? t.gold : 'transparent' }]}>
              <T serif style={{ fontSize: 11, letterSpacing: 1, fontWeight: '700', color: on ? t.gold : t.sub }} numberOfLines={1}>{c.label.toUpperCase()}</T>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }} showsVerticalScrollIndicator={false}>
        {cat === 'armaria' && (
          <T sub style={{ width: '100%', fontSize: 13, lineHeight: 19 }}>Bronze da forja da ágora: comuns e incomuns. Raros e lendários só saem do baú do chefão.</T>
        )}
        {cat === 'armaria' && ARMORY.map((g) => {
          const has = gearOwned.includes(g.id);
          const on = loadout.equipped[g.slot] === g.id;
          const price = GEAR_PRICE[g.rarity]!;
          return (
            <Pressable key={g.id} onPress={() => setGear(g)} accessibilityRole="button"
              accessibilityLabel={`${g.name}, ${GEAR_RARITY_LABEL[g.rarity]}, ${on ? 'equipado' : has ? 'possuído' : `${price} moedas`}`}
              style={({ pressed }) => [s.card, { width: cardW, backgroundColor: t.card, borderColor: on ? t.gold : t.border, opacity: pressed ? 0.8 : 1 }]}>
              <View style={{ height: 76, alignItems: 'center', justifyContent: 'center' }}><GearArt item={g} size={64} /></View>
              <T serif style={{ fontSize: 14, fontWeight: '700', textAlign: 'center' }} numberOfLines={2}>{g.name}</T>
              <T serif style={{ fontSize: 10, letterSpacing: 1.5, color: t.bronze }}>{SLOT_LABEL[g.slot].toUpperCase()} · {ATTR_LABEL[g.attr].toUpperCase()}</T>
              <RarityMarks gear={g.rarity} />
              <View style={[s.row, { gap: 6, minHeight: 22 }]}>
                {on ? (
                  <><MaterialCommunityIcons name="check" size={16} color={t.gold} /><T style={{ color: t.gold, fontWeight: '600', fontSize: 13 }}>Equipado</T></>
                ) : has ? <T sub style={{ fontSize: 13 }}>Possuído</T> : (
                  <><Coin size={14} /><T style={{ fontWeight: '600', color: profile.coins >= price ? t.gold : t.sub }}>{price}</T></>
                )}
              </View>
            </Pressable>
          );
        })}
        {items.map((it) => {
          const has = owned.includes(it.id);
          const on = equipped.includes(it.id);
          return (
            <Pressable
              key={it.id}
              onPress={() => setPreview(it)}
              accessibilityRole="button"
              accessibilityLabel={`${it.name}, ${RARITY[it.rarity].label}, ${on ? 'equipado' : has ? 'possuído' : `${it.price} moedas`}`}
              style={({ pressed }) => [s.card, { width: cardW, backgroundColor: t.card, borderColor: on ? t.gold : t.border, opacity: pressed ? 0.8 : 1 }]}
            >
              <View style={{ height: 96, alignItems: 'center', justifyContent: 'center' }}>
                <ItemArt item={it} avatarId={profile.avatar} size={84} />
              </View>
              <T serif style={{ fontSize: 14, fontWeight: '700', textAlign: 'center' }} numberOfLines={2}>{it.name}</T>
              <RarityMarks rarity={it.rarity} />
              <View style={[s.row, { gap: 6, minHeight: 22 }]}>
                {on ? (
                  <><MaterialCommunityIcons name="check" size={16} color={t.gold} /><T style={{ color: t.gold, fontWeight: '600', fontSize: 13 }}>Equipado</T></>
                ) : has ? (
                  <T sub style={{ fontSize: 13 }}>Possuído</T>
                ) : (
                  <><Coin size={14} /><T style={{ fontWeight: '600', color: profile.coins >= it.price ? t.gold : t.sub }}>{it.price}</T></>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Prévia */}
      <AppModal visible={!!preview} onClose={() => setPreview(null)} frieze>
        {preview && (() => {
          const has = owned.includes(preview.id);
          const on = equipped.includes(preview.id);
          const missing = preview.price - profile.coins;
          return (
            <>
              <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                <ItemArt item={preview} avatarId={profile.avatar} size={132} look={preview.category === 'tema' ? undefined : pLook(preview)} />
              </View>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <T serif style={{ fontSize: 22, fontWeight: '700', textAlign: 'center' }}>{preview.name}</T>
                <View style={[s.row, { gap: 8 }]}><RarityMarks rarity={preview.rarity} /><T sub style={{ fontSize: 12 }}>{RARITY[preview.rarity].label}</T></View>
              </View>
              <T sub style={{ textAlign: 'center', lineHeight: 21 }}>{preview.desc}</T>
              <Divider />
              {has ? (
                <Button title={on ? 'Desequipar' : 'Equipar'} variant={on ? 'ghost' : 'primary'} onPress={() => equip(preview.id)} />
              ) : missing > 0 ? (
                <>
                  <Button title={`Faltam ${missing} moedas`} variant="ghost" disabled onPress={() => {}} />
                  <T sub style={{ fontSize: 12, textAlign: 'center' }}>Missões, treinos e baús de chefão rendem moedas.</T>
                </>
              ) : (
                <Button title={`Comprar por ${preview.price}`} onPress={() => { setConfirm(preview); setPreview(null); }} icon={<Coin size={16} />} />
              )}
              <Pressable onPress={() => setPreview(null)} style={{ alignSelf: 'center', minHeight: 40, justifyContent: 'center', paddingHorizontal: 16 }} accessibilityRole="button">
                <T sub style={{ fontSize: 13 }}>Fechar</T>
              </Pressable>
            </>
          );
        })()}
      </AppModal>

      {/* Prévia de equipamento */}
      <AppModal visible={!!gear} onClose={() => setGear(null)} frieze>
        {gear && (() => {
          const has = gearOwned.includes(gear.id);
          const price = GEAR_PRICE[gear.rarity]!;
          const missing = price - profile.coins;
          const x = gearText(gear);
          return (
            <>
              <View style={{ alignItems: 'center', paddingVertical: 4 }}><GearArt item={gear} size={104} /></View>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <T serif style={{ fontSize: 22, fontWeight: '700', textAlign: 'center' }}>{gear.name}</T>
                <View style={[s.row, { gap: 8 }]}><RarityMarks gear={gear.rarity} /><T sub style={{ fontSize: 12 }}>{GEAR_RARITY_LABEL[gear.rarity]} · {SLOT_LABEL[gear.slot]}</T></View>
              </View>
              <View style={{ gap: 4 }}>
                {x.base && <T style={{ fontSize: 14, textAlign: 'center' }}>{x.base} ao equipar</T>}
                <T style={{ fontSize: 14, textAlign: 'center', color: t.gold }}>{x.attuned} sintonizado</T>
              </View>
              <Divider />
              {has ? (
                <T sub style={{ textAlign: 'center' }}>Já está na sua bolsa. Equipe e sintonize no Arsenal.</T>
              ) : missing > 0 ? (
                <Button title={`Faltam ${missing} moedas`} variant="ghost" disabled onPress={() => {}} />
              ) : (
                <Button title={`Comprar por ${price}`} onPress={() => { setGearConfirm(gear); setGear(null); }} icon={<Coin size={16} />} />
              )}
              <Pressable onPress={() => setGear(null)} style={{ alignSelf: 'center', minHeight: 40, justifyContent: 'center', paddingHorizontal: 16 }} accessibilityRole="button">
                <T sub style={{ fontSize: 13 }}>Fechar</T>
              </Pressable>
            </>
          );
        })()}
      </AppModal>
      <ConfirmModal
        visible={!!gearConfirm}
        title={gearConfirm ? `Comprar ${gearConfirm.name}?` : ''}
        message={gearConfirm ? `Custa ${GEAR_PRICE[gearConfirm.rarity]} moedas. Seu saldo passa de ${profile.coins} para ${profile.coins - GEAR_PRICE[gearConfirm.rarity]!}. Se o espaço estiver vazio, já fica equipado.` : undefined}
        confirmLabel="Comprar"
        busy={busy}
        onConfirm={() => gearConfirm && doBuyGear(gearConfirm)}
        onCancel={() => { setGear(gearConfirm); setGearConfirm(null); }}
      />

      <ConfirmModal
        visible={!!confirm}
        title={confirm ? `Comprar ${confirm.name}?` : ''}
        message={confirm ? `Custa ${confirm.price} moedas. Seu saldo passa de ${profile.coins} para ${profile.coins - confirm.price}.` : undefined}
        confirmLabel="Comprar"
        busy={busy}
        onConfirm={() => confirm && doBuy(confirm)}
        onCancel={() => { setPreview(confirm); setConfirm(null); }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, marginHorizontal: 20 },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, marginBottom: -1 },
  card: { borderRadius: radius.md, borderWidth: 1, padding: 12, alignItems: 'center', gap: 8 },
});
