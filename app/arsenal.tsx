import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AttrIcon } from '../components/AttrIcon';
import { Avatar } from '../components/Avatar';
import { GearArt, RarityMarks } from '../components/ItemArt';
import { AppModal } from '../components/Modal';
import { Button, Divider, Meander, SectionTitle, T } from '../components/ui';
import { radius, useTheme } from '../constants/theme';
import {
  ATTR_LABEL, ATTRS, GEAR_RARITY_LABEL, GEAR_SLOTS, gearById, gearText, MAX_ATTUNED, modLabel, scoreFromXp, SLOT_LABEL, type GearItem, type GearSlot,
} from '../lib/game';
import { useGame } from '../store/game';

const NOTE: Record<string, string> = {
  travado: 'Você já lutou hoje: o arsenal fica como está até a meia-noite.',
  limite: `No máximo ${MAX_ATTUNED} sintonizados. Desfaça um laço antes.`,
};

/** Linha de efeito: o que vale só de equipar e o que vale sintonizado. */
function Effect({ g, attuned }: { g: GearItem; attuned: boolean }) {
  const t = useTheme();
  const x = gearText(g);
  return (
    <T sub style={{ fontSize: 12, lineHeight: 17 }} numberOfLines={2}>
      {x.base ? `${x.base} · ` : ''}
      <T style={{ fontSize: 12, color: attuned ? t.gold : t.sub }}>{x.attuned}{attuned ? '' : ' se sintonizado'}</T>
    </T>
  );
}

export default function Arsenal() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, combat, loadout, gearOwned, equipGear, unequipGear, attune } = useGame();
  const [slot, setSlot] = useState<GearSlot | null>(null);
  const [note, setNote] = useState('');
  if (!profile || !combat) return null;
  const locked = combat.locked;
  const say = (r: { ok: boolean; reason?: string }) => setNote(r.ok ? '' : NOTE[r.reason ?? ''] ?? '');

  const legend = GEAR_SLOTS.map((x) => gearById(loadout.equipped[x])).find((g) => g?.ability && loadout.attuned.includes(g.slot));
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: insets.bottom + 88 }} showsVerticalScrollIndicator={false}>
        <View style={[s.row, { gap: 16 }]}>
          <Avatar id={profile.avatar} size={96} />
          <View style={{ flex: 1, gap: 6 }}>
            <T serif style={{ fontSize: 11, letterSpacing: 3, color: t.bronze, fontWeight: '700' }}>PANÓPLIA</T>
            <T serif style={{ fontSize: 15, fontWeight: '700' }}>CA {combat.hero.ac}  ·  PV {combat.hero.maxHp}</T>
            <View style={[s.row, { gap: 6 }]} accessible accessibilityLabel={`${loadout.attuned.length} de ${MAX_ATTUNED} sintonizados`}>
              {Array.from({ length: MAX_ATTUNED }, (_, i) => (
                <View key={i} style={{ width: 9, height: 9, transform: [{ rotate: '45deg' }], borderWidth: 1, borderColor: t.gold, backgroundColor: i < loadout.attuned.length ? t.gold : 'transparent' }} />
              ))}
              <T sub style={{ fontSize: 12, marginLeft: 4 }}>{loadout.attuned.length} de {MAX_ATTUNED} sintonizados</T>
            </View>
          </View>
        </View>
        <Meander cell={3} opacity={0.6} />

        {locked && (
          <View style={[s.row, s.notice, { borderColor: t.bronze, backgroundColor: t.card }]}>
            <MaterialCommunityIcons name="lock-outline" size={18} color={t.bronze} />
            <T sub style={{ flex: 1, fontSize: 13, lineHeight: 19 }}>{NOTE.travado}</T>
          </View>
        )}

        <View style={{ gap: 10 }}>
          <SectionTitle>Equipados</SectionTitle>
          {GEAR_SLOTS.map((x) => {
            const g = gearById(loadout.equipped[x]);
            const on = loadout.attuned.includes(x);
            const bag = gearOwned.filter((id) => gearById(id)?.slot === x).length;
            return (
              <View key={x} style={[s.slot, { backgroundColor: t.card, borderColor: on ? t.gold : t.border }]}>
                {on && <View style={[s.edge, { backgroundColor: t.gold }]} />}
                <Pressable onPress={() => { setNote(''); setSlot(x); }} style={[s.row, { flex: 1, gap: 12 }]} accessibilityRole="button"
                  accessibilityLabel={`${SLOT_LABEL[x]}: ${g ? g.name : 'vazio'}. Trocar`}>
                  {g ? <GearArt item={g} size={46} /> : (
                    <View style={[s.empty, { borderColor: t.border }]}><MaterialCommunityIcons name="plus" size={18} color={t.sub} /></View>
                  )}
                  <View style={{ flex: 1, gap: 2 }}>
                    <T serif style={{ fontSize: 10, letterSpacing: 2, color: t.bronze, fontWeight: '700' }}>{SLOT_LABEL[x].toUpperCase()}</T>
                    {g ? (
                      <>
                        <T serif style={{ fontSize: 14, fontWeight: '700' }} numberOfLines={1}>{g.name}</T>
                        <Effect g={g} attuned={on} />
                      </>
                    ) : <T sub style={{ fontSize: 13 }}>{bag ? `Vazio · ${bag} na bolsa` : 'Vazio'}</T>}
                  </View>
                </Pressable>
                {g && (
                  <Pressable
                    disabled={locked}
                    onPress={async () => say(await attune(x))}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: on, disabled: locked }}
                    accessibilityLabel={`Sintonia de ${g.name}`}
                    style={[s.tie, { opacity: locked ? 0.4 : 1 }]}
                  >
                    <MaterialCommunityIcons name={on ? 'link-variant' : 'link-variant-off'} size={20} color={on ? t.gold : t.sub} />
                    <T serif style={{ fontSize: 9, letterSpacing: 1, color: on ? t.gold : t.sub }}>{on ? 'SINTONIA' : 'SINTONIZAR'}</T>
                  </Pressable>
                )}
              </View>
            );
          })}
          {!!note && <T style={{ fontSize: 13, color: t.danger, textAlign: 'center' }}>{note}</T>}
        </View>

        {legend && (
          <View style={{ gap: 6 }}>
            <SectionTitle>Relíquia</SectionTitle>
            <T sub style={{ fontSize: 13, lineHeight: 19 }}><T serif style={{ fontSize: 13, color: t.gold, fontWeight: '700' }}>{legend.name}. </T>{legend.ability}</T>
          </View>
        )}

        <View style={{ gap: 10 }}>
          <SectionTitle>Atributos com os itens</SectionTitle>
          {ATTRS.map((a) => {
            const base = Math.min(20, scoreFromXp(profile.attrs[a]));
            const eff = combat.hero.scores[a];
            return (
              <View key={a} style={[s.row, { gap: 12 }]}>
                <AttrIcon attr={a} size={26} />
                <T style={{ flex: 1, fontSize: 14 }}>{ATTR_LABEL[a]}</T>
                {eff > base && <T sub style={{ fontSize: 12 }}>{base} +{eff - base}</T>}
                <T serif style={{ fontSize: 16, fontWeight: '700', color: eff > base ? t.gold : t.text, minWidth: 64, textAlign: 'right' }}>{eff} · {modLabel(eff)}</T>
              </View>
            );
          })}
          <T sub style={{ fontSize: 12, lineHeight: 18 }}>Equipado dá a CA da armadura e do escudo e o dado da arma. Sintonizado soma também o atributo e, nos lendários, a habilidade.</T>
        </View>
      </ScrollView>

      <View style={[s.footer, { paddingBottom: insets.bottom + 12, backgroundColor: t.bg, borderColor: t.border }]}>
        <Button variant="ghost" title="Armaria" onPress={() => router.push('/loja?aba=armaria')} icon={<MaterialCommunityIcons name="anvil" size={18} color={t.gold} />} />
      </View>

      <AppModal visible={!!slot} onClose={() => setSlot(null)}>
        {slot && (() => {
          const mine = gearOwned.map((id) => gearById(id)!).filter((g) => g?.slot === slot);
          const cur = loadout.equipped[slot];
          return (
            <>
              <T serif style={{ fontSize: 17, fontWeight: '700', letterSpacing: 2 }}>{SLOT_LABEL[slot].toUpperCase()}</T>
              {locked && <T sub style={{ fontSize: 12, lineHeight: 18 }}>{NOTE.travado}</T>}
              {mine.length === 0 && <T sub style={{ fontSize: 13, lineHeight: 19 }}>Nada para este espaço ainda. A Armaria vende comuns e incomuns; raros e lendários só saem do baú do chefão.</T>}
              {mine.map((g) => {
                const on = cur === g.id;
                return (
                  <Pressable key={g.id} disabled={locked || on}
                    onPress={async () => { const r = await equipGear(g.id); say(r); if (r.ok) setSlot(null); }}
                    accessibilityRole="button" accessibilityState={{ selected: on, disabled: locked }}
                    style={({ pressed }) => [s.pick, { borderColor: on ? t.gold : t.border, backgroundColor: on ? t.card2 : 'transparent', opacity: pressed ? 0.8 : 1 }]}>
                    <GearArt item={g} size={44} />
                    <View style={{ flex: 1, gap: 3 }}>
                      <View style={[s.row, { justifyContent: 'space-between', gap: 8 }]}>
                        <T serif style={{ flex: 1, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>{g.name}</T>
                        <RarityMarks gear={g.rarity} size={6} />
                      </View>
                      <Effect g={g} attuned />
                      {g.ability && <T sub style={{ fontSize: 12, lineHeight: 17, color: t.gold }}>{g.ability}</T>}
                      <T sub style={{ fontSize: 11 }}>{GEAR_RARITY_LABEL[g.rarity]}{on ? ' · equipado' : ''}</T>
                    </View>
                  </Pressable>
                );
              })}
              {cur && !locked && <Button variant="ghost" title="Deixar vazio" onPress={async () => { say(await unequipGear(slot)); setSlot(null); }} />}
              <Divider />
              <Pressable onPress={() => setSlot(null)} style={{ alignSelf: 'center', minHeight: 40, justifyContent: 'center', paddingHorizontal: 16 }} accessibilityRole="button">
                <T sub style={{ fontSize: 13 }}>Fechar</T>
              </Pressable>
            </>
          );
        })()}
      </AppModal>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  notice: { gap: 10, borderWidth: 1, borderRadius: radius.md, padding: 12 },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: radius.md, paddingVertical: 10, paddingLeft: 14, paddingRight: 6, minHeight: 68, overflow: 'hidden' },
  edge: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  empty: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderRadius: radius.sm },
  tie: { alignItems: 'center', justifyContent: 'center', gap: 2, minWidth: 72, minHeight: 48 },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: radius.md, padding: 10 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
});
