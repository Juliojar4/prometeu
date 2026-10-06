import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BossEmblem } from '../components/BossEmblem';
import { Chest, ChestPhase } from '../components/Chest';
import { Confetti } from '../components/Confetti';
import { ItemArt, RarityMarks } from '../components/ItemArt';
import { Coin } from '../components/Medallion';
import { Bar, Button, Card, SectionTitle, T } from '../components/ui';
import { useTheme } from '../constants/theme';
import { addDays, Boss, bossInfoForWeek, ChestReward, daysBetween, EventType, itemById, MEAL_SLOTS, missionById, RARITY } from '../lib/game';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../store/game';

type Glyph = keyof typeof MaterialCommunityIcons.glyphMap;
const KIND: Record<string, { icon: Glyph; label: string }> = {
  water: { icon: 'water-outline', label: 'Copo de água' },
  water_goal: { icon: 'water-check', label: 'Meta de água' },
  workout: { icon: 'dumbbell', label: 'Treino' },
  meal: { icon: 'food-apple-outline', label: 'Refeição' },
  mission: { icon: 'script-text-outline', label: 'Missão' },
};
const DOW = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
const DOW_FULL = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const hhmm = (ts: number) => `${String(new Date(ts).getHours()).padStart(2, '0')}:${String(new Date(ts).getMinutes()).padStart(2, '0')}`;

export default function Chefao() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { boss, weekDamage, pendingChest, today, levelUpTick, openChest, profile } = useGame();
  const [phase, setPhase] = useState<ChestPhase>('closed');
  const [opened, setOpened] = useState<{ boss: Boss; reward: ChestReward | null } | null>(null);
  if (!boss || !profile) return null;

  const info = bossInfoForWeek(boss.weekStart);
  const defeated = boss.hp === 0;
  const chestBoss = opened?.boss ?? pendingChest; // depois de aberto o baú sai do "pendente", mas a cena continua
  const perDay = DOW.map((_, i) => weekDamage.filter((e) => e.date === addDays(boss.weekStart, i)).reduce((n, e) => n + e.bossDamage, 0));
  const maxDay = Math.max(1, ...perDay);
  const daysLeft = Math.max(0, daysBetween(today, addDays(boss.weekStart, 7)));

  const open = async () => {
    if (phase !== 'closed' || !pendingChest) return;
    const target = pendingChest;
    setPhase('shaking');
    setOpened({ boss: target, reward: null }); // mantém a cena enquanto o baú sai de "pendente"
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    [140, 280, 420, 560].forEach((ms) => setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}), ms));
    const [reward] = await Promise.all([openChest(), wait(760)]);
    if (!reward) { setOpened(null); return setPhase('closed'); }
    setOpened({ boss: target, reward });
    setPhase('open');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const item = opened?.reward?.itemId ? itemById(opened.reward.itemId) : null;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 22, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        <Card frieze style={{ alignItems: 'center', gap: 10 }}>
          <T serif style={{ fontSize: 11, letterSpacing: 3, color: t.sub }}>PROVAÇÃO DA SEMANA</T>
          <BossEmblem icon={info.icon} size={150} defeated={defeated} />
          <T serif style={{ fontSize: 26, fontWeight: '700', textAlign: 'center' }}>{info.name}</T>
          <T sub style={{ textAlign: 'center', fontSize: 14 }}>{info.subtitle}</T>
          <View style={{ alignSelf: 'stretch', gap: 6, marginTop: 6 }}>
            <Bar value={boss.hp / boss.maxHp} color={t.danger} height={16} />
            <View style={s.between}>
              <T sub style={{ fontSize: 12 }}>{defeated ? 'Derrotado' : daysLeft === 0 ? 'Último dia da provação' : `Reaparece outra criatura em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}`}</T>
              <T serif style={{ fontSize: 14, fontWeight: '700', color: defeated ? t.gold : t.text }}>{boss.hp} / {boss.maxHp} HP</T>
            </View>
          </View>
          <T sub style={{ fontSize: 13, lineHeight: 20, textAlign: 'center' }}>{info.line}</T>
        </Card>

        {/* Baú */}
        {chestBoss ? (
          <Card frieze style={{ alignItems: 'center', gap: 12 }}>
            <T serif style={{ fontSize: 11, letterSpacing: 3, color: t.bronze, fontWeight: '700' }}>{phase === 'open' ? 'SPOLIA DA VITÓRIA' : 'BAÚ DA PROVAÇÃO'}</T>
            <Chest phase={phase} />
            {phase === 'open' && opened?.reward ? (
              <View style={{ alignItems: 'center', gap: 12, alignSelf: 'stretch' }}>
                <View style={[s.row, { gap: 8 }]}>
                  <Coin size={26} />
                  <T serif style={{ fontSize: 30, fontWeight: '700', color: t.gold }}>+{opened.reward.coins}</T>
                </View>
                {item ? (
                  <View style={[s.item, { borderColor: t.gold, backgroundColor: t.card2 }]}>
                    <ItemArt item={item} avatarId={profile.avatar} size={56} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <T style={{ fontSize: 11, letterSpacing: 1.5, color: t.sub }} serif>NOVO ITEM</T>
                      <T serif style={{ fontSize: 16, fontWeight: '700' }}>{item.name}</T>
                      <View style={s.row}><RarityMarks rarity={item.rarity} /><T sub style={{ fontSize: 12 }}>{RARITY[item.rarity].label}</T></View>
                    </View>
                  </View>
                ) : (
                  <T sub style={{ textAlign: 'center' }}>Você já possui todos os itens da loja. Moedas extras no lugar.</T>
                )}
                {item && <T sub style={{ fontSize: 12, textAlign: 'center' }}>Está no seu inventário, na Loja.</T>}
              </View>
            ) : (
              <>
                <T sub style={{ textAlign: 'center', fontSize: 13 }}>
                  {chestBoss.weekStart === boss.weekStart ? 'A criatura caiu.' : `${bossInfoForWeek(chestBoss.weekStart).name} caiu na semana passada.`} Moedas e um item aguardam.
                </T>
                <Button title={phase === 'closed' ? 'Abrir baú' : 'Abrindo...'} disabled={phase !== 'closed'} onPress={open} icon={<MaterialCommunityIcons name="treasure-chest" size={20} color={t.onPrimary} />} style={{ alignSelf: 'stretch', minHeight: 54 }} />
              </>
            )}
          </Card>
        ) : (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <MaterialCommunityIcons name={defeated ? 'check-decagram' : 'treasure-chest-outline'} size={32} color={t.bronze} />
            <T sub style={{ flex: 1, fontSize: 13, lineHeight: 19 }}>
              {defeated ? 'O baú desta provação já foi aberto. Outra criatura chega na segunda-feira.' : 'Derrote a criatura para abrir o baú: moedas e um item da loja.'}
            </T>
          </Card>
        )}

        {/* Dano por dia */}
        <View style={{ gap: 12 }}>
          <SectionTitle>Golpes da semana</SectionTitle>
          <View style={[s.row, { alignItems: 'flex-end', height: 96, gap: 8 }]}>
            {perDay.map((v, i) => {
              const isToday = addDays(boss.weekStart, i) === today;
              return (
                <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }} accessible accessibilityLabel={`${DOW[i]}: ${v} de dano`}>
                  <T sub style={{ fontSize: 10 }}>{v || ''}</T>
                  <View style={{ width: '100%', height: Math.max(3, (v / maxDay) * 60), backgroundColor: v ? t.danger : t.border, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
                  <T serif style={{ fontSize: 10, letterSpacing: 1, color: isToday ? t.gold : t.sub, fontWeight: isToday ? '700' : '400' }}>{DOW[i].toUpperCase()}</T>
                </View>
              );
            })}
          </View>
        </View>

        {/* Histórico */}
        <View style={{ gap: 10 }}>
          <SectionTitle>Histórico de dano</SectionTitle>
          {weekDamage.length === 0 && <T sub style={{ fontSize: 14 }}>Nenhum golpe ainda. Cada hábito feito fere a criatura.</T>}
          {weekDamage.slice(0, 12).map((e) => {
            const k = KIND[e.type as EventType] ?? KIND.water;
            const detail = e.type === 'mission' ? missionById(e.ref ?? '')?.title : e.type === 'meal' ? MEAL_SLOTS.find((m) => m.id === e.ref)?.label : null;
            const when = e.date === today ? `Hoje, ${hhmm(e.ts)}` : `${DOW_FULL[new Date(e.ts).getDay()]}, ${hhmm(e.ts)}`;
            return (
              <View key={e.id} style={[s.log, { backgroundColor: t.card, borderColor: t.border }]}>
                <MaterialCommunityIcons name={k.icon} size={22} color={t.bronze} />
                <View style={{ flex: 1 }}>
                  <T style={{ fontWeight: '600', fontSize: 14 }} numberOfLines={1}>{detail ?? k.label}</T>
                  <T sub style={{ fontSize: 12 }}>{detail ? `${k.label} · ` : ''}{when}</T>
                </View>
                <T serif style={{ color: t.danger, fontWeight: '700' }}>-{e.bossDamage}</T>
              </View>
            );
          })}
        </View>
      </ScrollView>
      <Confetti tick={levelUpTick} />
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: 10, padding: 12 },
  log: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
});
