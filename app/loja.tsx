import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { ItemArt, RarityMarks } from '../components/ItemArt';
import { Coin } from '../components/Medallion';
import { AppModal, ConfirmModal } from '../components/Modal';
import { Button, Divider, T } from '../components/ui';
import { radius, useTheme } from '../constants/theme';
import { CATEGORIES, Item, ItemCategory, itemsByCategory, Look, lookOf, RARITY, toggleEquip } from '../lib/game';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../store/game';

export default function Loja() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { profile, owned, equipped, buy, equip } = useGame();
  const [cat, setCat] = useState<ItemCategory>('cor');
  const [preview, setPreview] = useState<Item | null>(null);
  const [confirm, setConfirm] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);
  const cardW = (width - 40 - 12) / 2;
  const items = useMemo(() => itemsByCategory(cat), [cat]);
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
        {CATEGORIES.map((c) => {
          const on = c.id === cat;
          return (
            <Pressable key={c.id} onPress={() => setCat(c.id)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[s.tab, { borderBottomColor: on ? t.gold : 'transparent' }]}>
              <T serif style={{ fontSize: 11, letterSpacing: 1, fontWeight: '700', color: on ? t.gold : t.sub }} numberOfLines={1}>{c.label.toUpperCase()}</T>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }} showsVerticalScrollIndicator={false}>
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
