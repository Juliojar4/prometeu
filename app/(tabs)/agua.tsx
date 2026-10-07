import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Amphora } from '../../components/Amphora';
import { Confetti } from '../../components/Confetti';
import { Button, Divider, T } from '../../components/ui';
import { F, radius, useTheme } from '../../constants/theme';
import { CUP_ML, litersLabel, MAX_CUPS_PER_DAY, REWARDS, WATER_GOAL_BONUS } from '../../lib/game';
import { useGame } from '../../store/game';

export default function Agua() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { todayRecord: day, levelUpTick, addWater, undoWater } = useGame();
  const cups = day.water;
  const goal = day.waterGoal;
  const met = cups >= goal;
  const full = cups >= MAX_CUPS_PER_DAY;
  const k = useSharedValue(1);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: k.value }] }));

  const add = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    addWater();
  };
  const undo = () => {
    Haptics.selectionAsync().catch(() => {});
    undoWater();
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 16 }}>
      <View style={{ gap: 4 }}>
        <T serif style={{ fontSize: 13, letterSpacing: 3, color: t.bronze, fontWeight: '700' }}>OFERENDA AO RIO</T>
        <T sub style={{ fontSize: 14 }}>
          {met ? 'A meta de hoje está cumprida. Beba só se tiver sede.' : `Faltam ${goal - cups} ${goal - cups === 1 ? 'copo' : 'copos'} para a meta de ${litersLabel(goal)}.`}
        </T>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        <Amphora frac={cups / goal} drop={cups} />
        <View style={{ alignItems: 'center', gap: 2 }} accessible accessibilityLabel={`${cups} de ${goal} copos, ${litersLabel(cups)}`}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <T serif style={{ fontSize: 52, fontWeight: '700', color: met ? t.gold : t.text, lineHeight: 60 }}>{cups}</T>
            <T serif sub style={{ fontSize: 24 }}>/ {goal}</T>
          </View>
          <T sub style={{ fontSize: 13 }}>copos de {CUP_ML} ml · {litersLabel(cups)} de {litersLabel(goal)}</T>
        </View>
        <View style={{ width: 200 }}><Divider /></View>
        <T sub style={{ fontSize: 12, textAlign: 'center' }}>
          Cada copo: +{REWARDS.water.xp} XP de Constituição. Meta do dia: +{WATER_GOAL_BONUS.xp} XP e 2 cargas de ataque{met ? ' (já recebidos)' : ''}.
        </T>
      </View>

      <View style={{ gap: 12 }}>
        <Button
          variant="ghost"
          title="Desfazer último copo"
          disabled={cups === 0}
          onPress={undo}
          icon={<MaterialCommunityIcons name="undo-variant" size={18} color={t.text} />}
          style={{ minHeight: 44 }}
        />
        <Pressable
          onPress={add}
          disabled={full}
          onPressIn={() => (k.value = withSpring(0.97, { duration: 150 }))}
          onPressOut={() => (k.value = withSpring(1, { duration: 200 }))}
          accessibilityRole="button"
          accessibilityLabel="Beber um copo de água"
          accessibilityState={{ disabled: full }}
        >
          <Animated.View style={[s.big, { backgroundColor: t.primary, borderColor: t.gold, opacity: full ? 0.4 : 1 }, st]}>
            <MaterialCommunityIcons name="water-plus-outline" size={32} color={t.onPrimary} />
            <T style={{ fontFamily: F.displayBlack, fontSize: 26, letterSpacing: 2, color: t.onPrimary }}>+1 COPO</T>
          </Animated.View>
        </Pressable>
      </View>
      <Confetti tick={levelUpTick} />
    </View>
  );
}

const s = StyleSheet.create({
  big: { minHeight: 84, borderRadius: radius.md, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
});
