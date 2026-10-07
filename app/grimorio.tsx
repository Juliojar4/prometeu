import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConfirmModal } from '../components/Modal';
import { GodSeal, SparkCount, SparkPips } from '../components/Spell';
import { Meander, SectionTitle, T } from '../components/ui';
import { radius, useTheme } from '../constants/theme';
import { canSwapToday, isActive, SPELLS, spellText, type Spell, type SpellId } from '../lib/game';
import { useGame } from '../store/game';

const KIND: Record<Spell['kind'], string> = { ataque: 'ATAQUE', resistencia: 'RESISTÊNCIA', dadiva: 'DÁDIVA' };

/**
 * Grimório: um códice, não uma grade. Folhas em sequência (preparadas no alto, depois as aprendidas e as ainda seladas),
 * separadas por filetes de bronze; cada folha com o selo do deus, nome, tipo, custo em centelhas e o efeito.
 * Preparar num espaço livre é livre; tirar uma magia gasta a troca do dia.
 */
export default function Grimorio() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { profile, combat, today, togglePrepare } = useGame();
  const [ask, setAsk] = useState<Spell | null>(null);
  const [note, setNote] = useState<string | null>(null);
  if (!profile || !combat) return null;
  const prepared = profile.spells ?? [];
  const { slots, fx } = combat;
  const swap = canSwapToday(profile.spellsSwapped, today);
  const excess = prepared.length > slots;

  const toggle = async (s: Spell) => {
    const res = await togglePrepare(s.id).catch(() => null);
    if (!res) return;
    setNote(res.ok ? null : res.reason === 'cheio' ? `Os ${slots} espaços estão ocupados. Tire uma magia antes (1 troca por dia).`
      : res.reason === 'troca' ? 'A troca de hoje já foi usada. Amanhã o grimório se abre de novo.' : null);
  };
  const tap = (s: Spell) => {
    if (prepared.includes(s.id) && !excess) return swap ? setAsk(s) : setNote('A troca de hoje já foi usada. Amanhã o grimório se abre de novo.');
    toggle(s);
  };

  const order = (ids: SpellId[]) => ids.map((id) => SPELLS.find((x) => x.id === id)!).filter(Boolean);
  const learned = SPELLS.filter((s) => s.level <= profile.level && !prepared.includes(s.id));
  const sealed = SPELLS.filter((s) => s.level > profile.level);

  const folio = (s: Spell, i: number, on = false) => {
    const locked = s.level > profile.level;
    const idle = on && prepared.indexOf(s.id) >= slots; // excesso: guardada, sem uso
    return (
      <View key={s.id}>
        {i > 0 && <View style={{ height: 1, backgroundColor: t.border, marginLeft: 70 }} />}
        <View style={[s2.folio, on && { borderLeftColor: t.gold }]}>
          <GodSeal spell={s} sealed={locked} active={on && isActive(fx, s.id)} />
          <View style={{ flex: 1, gap: 3 }}>
            <View style={s2.between}>
              <T serif style={{ flex: 1, fontSize: 16, fontWeight: '700', color: locked ? t.sub : t.text }} numberOfLines={1}>{s.name}</T>
              <SparkPips n={s.cost} dim={locked} />
            </View>
            <T serif style={{ fontSize: 10, letterSpacing: 1.6, color: locked ? t.sub : t.bronze }}>
              {s.god.toUpperCase()}  ·  {KIND[s.kind]}{locked ? `  ·  NÍVEL ${s.level}` : ''}
            </T>
            <T sub style={{ fontSize: 13, lineHeight: 19, opacity: locked ? 0.7 : 1 }}>{spellText(s, profile.level)}</T>
            {!locked && (
              <View style={[s2.between, { marginTop: 4 }]}>
                <T sub style={{ fontSize: 11 }}>{idle ? 'Sem espaço: guardada, não se conjura' : on ? (isActive(fx, s.id) ? 'Ativa agora' : 'Pronta para conjurar') : `Aprendida no nível ${s.level}`}</T>
                <Pressable
                  onPress={() => tap(s)}
                  accessibilityRole="button"
                  accessibilityLabel={`${on ? 'Tirar' : 'Preparar'} ${s.name}`}
                  hitSlop={8}
                  style={({ pressed }) => [s2.act, { borderColor: on ? t.border : t.gold, opacity: pressed ? 0.7 : 1 }]}
                >
                  <View style={[s2.pip, { borderColor: on ? t.gold : t.bronze, backgroundColor: on ? t.gold : 'transparent' }]} />
                  <T serif style={{ fontSize: 11, letterSpacing: 1.4, color: on ? t.sub : t.gold }}>{on ? 'TIRAR' : 'PREPARAR'}</T>
                </Pressable>
              </View>
            )}
            {locked && (
              <View style={[s2.row, { gap: 4, marginTop: 2 }]}>
                <MaterialCommunityIcons name="lock-outline" size={12} color={t.sub} />
                <T sub style={{ fontSize: 11 }}>nível {s.level}</T>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 22, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <MaterialCommunityIcons name="book-open-variant" size={34} color={t.gold} />
          <T serif style={{ fontSize: 22, letterSpacing: 4, fontWeight: '700' }}>DÁDIVAS DO OLIMPO</T>
          <T sub style={{ fontSize: 13, textAlign: 'center', lineHeight: 19, maxWidth: 300 }}>As dádivas dos deuses, pagas com centelhas do fogo roubado. Cada dia de hábito acende uma.</T>
          <View style={{ width: 160, marginTop: 4 }}><Meander cell={3} opacity={0.75} /></View>
        </View>

        <View style={[s2.ledger, { borderColor: t.border }]}>
          <View style={s2.cell}>
            <SparkCount sparks={combat.sparks} max={combat.sparkMax} label={false} size={15} />
            <T sub style={s2.cap}>CENTELHAS</T>
          </View>
          <View style={[s2.rule, { backgroundColor: t.border }]} />
          <View style={s2.cell}>
            <T serif style={{ fontSize: 15, fontWeight: '700', color: excess ? t.danger : t.text }}>{Math.min(prepared.length, 99)}/{slots}</T>
            <T sub style={s2.cap}>PREPARADAS</T>
          </View>
          <View style={[s2.rule, { backgroundColor: t.border }]} />
          <View style={s2.cell}>
            <T serif style={{ fontSize: 15, fontWeight: '700', color: swap ? t.gold : t.sub }}>{swap ? '1' : '0'}</T>
            <T sub style={s2.cap}>TROCA HOJE</T>
          </View>
        </View>
        <T sub style={{ fontSize: 12, lineHeight: 18, marginTop: -10 }}>
          +1 centelha por dia ativo e +1 nos 4 pilares, até {combat.sparkMax}. Preparar num espaço livre é livre; tirar uma magia gasta a troca do dia.
          {profile.cls === 'filosofo' ? ' Filósofo: +2 preparadas, +1 centelha no teto e proficiência integral.' : ''}
        </T>

        <View style={{ gap: 6 }}>
          <SectionTitle>Preparadas</SectionTitle>
          {prepared.length ? order(prepared).map((s, i) => folio(s, i, true)) : <T sub style={{ fontSize: 13 }}>Nenhuma magia preparada. Escolha abaixo.</T>}
        </View>
        {learned.length > 0 && (
          <View style={{ gap: 6 }}>
            <SectionTitle>Aprendidas</SectionTitle>
            {learned.map((s, i) => folio(s, i))}
          </View>
        )}
        {sealed.length > 0 && (
          <View style={{ gap: 6 }}>
            <SectionTitle>Seladas</SectionTitle>
            {sealed.map((s, i) => folio(s, i))}
          </View>
        )}
      </ScrollView>
      {note && ( // aviso fixo no rodapé: aparece onde o dedo está, sem empurrar a lista
        <Pressable onPress={() => setNote(null)} accessibilityRole="alert" accessibilityLabel={note}
          style={[s2.note, { position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 16, borderColor: t.bronze, backgroundColor: t.card2 }]}>
          <MaterialCommunityIcons name="information-outline" size={18} color={t.gold} />
          <T style={{ flex: 1, fontSize: 13, lineHeight: 19 }}>{note}</T>
          <MaterialCommunityIcons name="close" size={16} color={t.sub} />
        </Pressable>
      )}
      <ConfirmModal
        visible={!!ask}
        title={`Tirar ${ask?.name ?? ''}?`}
        message="Isso gasta a troca de hoje: até amanhã você não poderá tirar outra magia. Preparar em um espaço livre continua liberado."
        confirmLabel="Tirar"
        cancelLabel="Manter"
        onConfirm={() => { if (ask) toggle(ask); setAsk(null); }}
        onCancel={() => setAsk(null)}
      />
    </View>
  );
}

const s2 = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  folio: { flexDirection: 'row', gap: 14, paddingVertical: 14, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: 'transparent' },
  act: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6 },
  pip: { width: 8, height: 8, borderWidth: 1.5, transform: [{ rotate: '45deg' }] },
  ledger: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 12 },
  cell: { flex: 1, alignItems: 'center', gap: 4 },
  cap: { fontSize: 10, letterSpacing: 1.4 },
  rule: { width: 1, alignSelf: 'stretch' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: radius.md, padding: 12 },
});
