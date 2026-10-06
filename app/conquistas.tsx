import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Coin } from '../components/Medallion';
import { Bar, Card, T } from '../components/ui';
import { radius, useTheme } from '../constants/theme';
import { ACHIEVEMENTS, achievementProgress } from '../lib/game';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../store/game';

const fmtDate = (d: string) => d.split('-').reverse().slice(0, 2).join('/');

export default function Conquistas() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { unlocked, stats } = useGame();
  const list = useMemo(() => {
    const done = ACHIEVEMENTS.filter((a) => unlocked[a.id]).sort((a, b) => unlocked[b.id].localeCompare(unlocked[a.id]));
    const todo = ACHIEVEMENTS.filter((a) => !unlocked[a.id]).sort((a, b) => achievementProgress(b, stats) - achievementProgress(a, stats));
    return [...done, ...todo];
  }, [unlocked, stats]);
  const count = ACHIEVEMENTS.filter((a) => unlocked[a.id]).length;

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
      <Card frieze style={{ gap: 10 }}>
        <View style={s.between}>
          <T serif style={{ fontSize: 11, letterSpacing: 3, color: t.bronze, fontWeight: '700' }}>SALÃO DOS FEITOS</T>
          <T serif style={{ fontSize: 20, fontWeight: '700', color: t.gold }}>{count} / {ACHIEVEMENTS.length}</T>
        </View>
        <Bar value={count / ACHIEVEMENTS.length} color={t.gold} height={12} />
      </Card>
      {list.map((a) => {
        const date = unlocked[a.id];
        const p = achievementProgress(a, stats);
        const cur = Math.min(a.target, stats[a.metric]);
        return (
          <View key={a.id} style={[s.item, { backgroundColor: t.card, borderColor: date ? t.bronze : t.border }]} accessible accessibilityLabel={`${a.name}. ${a.desc}. ${date ? `Desbloqueada em ${fmtDate(date)}` : `${cur} de ${a.target}`}`}>
            <View style={[s.medal, { borderColor: date ? t.gold : t.border, backgroundColor: date ? t.card2 : 'transparent' }]}>
              <MaterialCommunityIcons name={date ? (a.icon as never) : 'lock-outline'} size={24} color={date ? t.gold : t.sub} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <T serif style={{ fontSize: 15, fontWeight: '700', color: date ? t.text : t.sub }}>{a.name}</T>
              <T sub style={{ fontSize: 13, lineHeight: 18 }}>{a.desc}</T>
              {date ? (
                <View style={[s.row, { gap: 6, marginTop: 2 }]}>
                  <T style={{ fontSize: 12, color: t.gold, fontWeight: '600' }}>Desbloqueada em {fmtDate(date)}</T>
                  {a.coins > 0 && <><Coin size={10} /><T sub style={{ fontSize: 12 }}>{a.coins}</T></>}
                </View>
              ) : (
                <View style={{ gap: 4, marginTop: 4 }}>
                  <Bar value={p} color={t.bronze} height={8} />
                  <View style={s.between}>
                    <T sub style={{ fontSize: 12 }}>{cur} / {a.target}</T>
                    {a.coins > 0 && <View style={[s.row, { gap: 4 }]}><Coin size={10} /><T sub style={{ fontSize: 12 }}>{a.coins}</T></View>}
                  </View>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  item: { flexDirection: 'row', gap: 14, borderRadius: radius.md, borderWidth: 1, padding: 14 },
  medal: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
