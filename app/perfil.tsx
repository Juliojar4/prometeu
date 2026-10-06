import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AttrIcon } from '../components/AttrIcon';
import { Avatar } from '../components/Avatar';
import { Flame } from '../components/Flame';
import { Coin, Medallion } from '../components/Medallion';
import { Bar, Card, Meander, SectionTitle, T } from '../components/ui';
import { radius, useTheme } from '../constants/theme';
import { ACHIEVEMENTS, ATTR_LABEL, ATTRS, bossInfoForWeek, MAX_SHIELDS, xpForNextLevel } from '../lib/game';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../store/game';

type Glyph = keyof typeof MaterialCommunityIcons.glyphMap;

export default function Perfil() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile: p, streak, stats, unlocked, boss, pendingChest } = useGame();
  if (!p) return null;
  const done = ACHIEVEMENTS.filter((a) => unlocked[a.id]).length;

  const numbers: { label: string; value: string | number }[] = [
    { label: 'Copos', value: stats.water },
    { label: 'Treinos', value: stats.workouts },
    { label: 'Refeições', value: stats.meals },
    { label: 'Missões', value: stats.missions },
    { label: 'Chefões', value: stats.bossesDefeated },
    { label: 'Melhor chama', value: stats.bestStreak },
    { label: 'Horas de estudo', value: Math.floor(stats.studyMinutes / 60) },
    { label: 'Páginas', value: stats.pages },
    { label: 'Livros', value: stats.books },
  ];

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
      <View style={{ alignItems: 'center', gap: 12, paddingTop: 4 }}>
        <Avatar id={p.avatar} tired={streak.tired} size={128} />
        <T serif style={{ fontSize: 26, fontWeight: '700' }}>{p.name}</T>
        <View style={{ width: 140 }}><Meander cell={3} opacity={0.8} /></View>
      </View>

      <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
        <View style={{ alignItems: 'center', gap: 6 }}><Medallion level={p.level} size={64} /><T sub style={{ fontSize: 12 }}>{p.xp} / {xpForNextLevel(p.level)} XP</T></View>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Flame size={48} lit={!streak.tired && streak.streak > 0} />
          <T serif style={{ color: t.ember, fontWeight: '700' }}>{streak.streak}</T>
          <View style={{ flexDirection: 'row', gap: 3 }} accessible accessibilityLabel={`${streak.shields} de ${MAX_SHIELDS} escudos`}>
            {Array.from({ length: MAX_SHIELDS }, (_, i) => (
              <MaterialCommunityIcons key={i} name={i < streak.shields ? 'shield-half-full' : 'shield-outline'} size={16} color={i < streak.shields ? t.bronze : t.border} />
            ))}
          </View>
        </View>
        <View style={{ alignItems: 'center', gap: 10 }}><Coin size={28} /><T serif style={{ color: t.gold, fontWeight: '700' }}>{p.coins}</T></View>
      </Card>

      <View style={{ gap: 14 }}>
        <SectionTitle>Atributos</SectionTitle>
        {ATTRS.map((a) => (
          <View key={a} style={s.row}>
            <AttrIcon attr={a} size={34} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={s.between}>
                <T style={{ fontWeight: '600' }}>{ATTR_LABEL[a]}</T>
                <T serif sub style={{ fontSize: 13 }}>Nv {p.attrs[a].level}</T>
              </View>
              <Bar value={p.attrs[a].xp / xpForNextLevel(p.attrs[a].level)} color={t.attr[a]} height={9} />
            </View>
          </View>
        ))}
      </View>

      <View style={{ gap: 12 }}>
        <SectionTitle>Feitos</SectionTitle>
        <View style={s.grid}>
          {numbers.map((n) => (
            <View key={n.label} style={[s.stat, { backgroundColor: t.card, borderColor: t.border }]}>
              <T serif style={{ fontSize: 22, fontWeight: '700', color: t.gold }}>{n.value}</T>
              <T sub style={{ fontSize: 11, letterSpacing: 0.5 }}>{n.label}</T>
            </View>
          ))}
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <SectionTitle>Salões</SectionTitle>
        <Row icon="store-outline" title="Loja" line={`${p.coins} moedas para gastar`} onPress={() => router.push('/loja')} />
        <Row icon="trophy-outline" title="Conquistas" line={`${done} de ${ACHIEVEMENTS.length} desbloqueadas`} onPress={() => router.push('/conquistas')} />
        {boss && <Row icon="skull-outline" title="Provação da semana" line={pendingChest ? 'O baú aguarda para ser aberto' : bossInfoForWeek(boss.weekStart).name} onPress={() => router.push('/chefao')} />}
      </View>
      <T sub style={{ fontSize: 12, textAlign: 'center' }}>Histórico e configurações chegam em breve.</T>
    </ScrollView>
  );
}

function Row({ icon, title, line, onPress }: { icon: Glyph; title: string; line: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${line}`} style={({ pressed }) => [s.link, { backgroundColor: t.card, borderColor: t.bronze, opacity: pressed ? 0.8 : 1 }]}>
      <View style={[s.medal, { borderColor: t.gold }]}><MaterialCommunityIcons name={icon} size={22} color={t.gold} /></View>
      <View style={{ flex: 1 }}>
        <T serif style={{ fontSize: 16, fontWeight: '700' }}>{title}</T>
        <T sub style={{ fontSize: 13 }}>{line}</T>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color={t.bronze} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { width: '31%', flexGrow: 1, alignItems: 'center', gap: 2, borderWidth: 1, borderRadius: radius.md, paddingVertical: 12 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: radius.md, padding: 14, minHeight: 64 },
  medal: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
