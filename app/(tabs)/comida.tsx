import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip } from '../../components/Chip';
import { Confetti } from '../../components/Confetti';
import { Card, SectionTitle, T } from '../../components/ui';
import { radius, useTheme } from '../../constants/theme';
import { MEAL_SLOTS, MEAL_TAGS, MEALS_PILLAR, MealRating, MealSlot, MealTag } from '../../lib/game';
import { useGame } from '../../store/game';

type Glyph = keyof typeof MaterialCommunityIcons.glyphMap;
const SLOT_ICON: Record<MealSlot, Glyph> = { cafe: 'coffee-outline', almoco: 'silverware-fork-knife', lanche: 'cookie-outline', jantar: 'weather-night' };
const RATINGS: { id: MealRating; label: string; icon: Glyph; line: string }[] = [
  { id: 'bom', label: 'Boa', icon: 'emoticon-happy-outline', line: 'Boa escolha. Seu corpo agradece.' },
  { id: 'ok', label: 'Ok', icon: 'emoticon-neutral-outline', line: 'Tudo certo. O dia segue.' },
  { id: 'ruim', label: 'Foi mal', icon: 'emoticon-sad-outline', line: 'Acontece com todo mundo. Registrar já é cuidar de si.' },
];

export default function Comida() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { todayEvents, todayRecord: day, levelUpTick, setMeal, clearMeal } = useGame();
  const meals = todayEvents.filter((e) => e.type === 'meal');
  const logged = day.meals;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, gap: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 4 }}>
          <T serif style={{ fontSize: 13, letterSpacing: 3, color: t.bronze, fontWeight: '700' }}>MESA</T>
          <T sub style={{ fontSize: 14, lineHeight: 20 }}>Sem contar calorias, sem culpa. Só atenção ao que alimenta você.</T>
        </View>
        <SectionTitle right={<T sub style={{ fontSize: 12 }}>{logged >= MEALS_PILLAR ? 'Pilar cumprido' : `${logged} de ${MEALS_PILLAR} para o pilar`}</T>}>Refeições de hoje</SectionTitle>

        {MEAL_SLOTS.map((slot) => {
          const ev = meals.find((e) => e.ref === slot.id);
          const d = ev?.data as { rating?: MealRating; tags?: MealTag[] } | null;
          const rating = d?.rating;
          const tags = d?.tags ?? [];
          const pick = (r: MealRating) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setMeal(slot.id, r, tags);
          };
          const toggle = (tag: MealTag) => {
            if (!rating) return;
            Haptics.selectionAsync().catch(() => {});
            setMeal(slot.id, rating, tags.includes(tag) ? tags.filter((x) => x !== tag) : [...tags, tag]);
          };
          return (
            <Card key={slot.id} style={{ gap: 14, borderColor: ev ? t.bronze : t.border }}>
              <View style={s.row}>
                <MaterialCommunityIcons name={SLOT_ICON[slot.id]} size={26} color={ev ? t.gold : t.sub} />
                <T serif style={{ flex: 1, fontSize: 17, fontWeight: '700' }}>{slot.label}</T>
                {ev && <T serif style={{ color: t.attr.constituicao, fontWeight: '700', fontSize: 14 }}>+{ev.xp} XP</T>}
              </View>
              <View style={s.row}>
                {RATINGS.map((r) => {
                  const on = rating === r.id;
                  return (
                    <Pressable
                      key={r.id}
                      onPress={() => pick(r.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${slot.label}: ${r.label}`}
                      accessibilityState={{ selected: on }}
                      style={({ pressed }) => [s.rate, { borderColor: on ? t.gold : t.border, backgroundColor: on ? t.card2 : 'transparent', opacity: pressed ? 0.7 : 1 }]}
                    >
                      <MaterialCommunityIcons name={r.icon} size={30} color={on ? t.gold : t.sub} />
                      <T style={{ fontSize: 12, fontWeight: on ? '600' : '400', color: on ? t.gold : t.sub }}>{r.label}</T>
                    </Pressable>
                  );
                })}
              </View>
              {ev && rating && (
                <>
                  <T sub style={{ fontSize: 13 }}>{RATINGS.find((r) => r.id === rating)!.line}</T>
                  <View style={s.wrap}>
                    {MEAL_TAGS.map((tag) => <Chip key={tag.id} label={tag.label} selected={tags.includes(tag.id)} onPress={() => toggle(tag.id)} />)}
                  </View>
                  <Pressable onPress={() => clearMeal(slot.id)} accessibilityRole="button" accessibilityLabel={`Limpar ${slot.label}`} style={{ alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center' }}>
                    <T sub style={{ fontSize: 13, textDecorationLine: 'underline' }}>Limpar registro</T>
                  </Pressable>
                </>
              )}
            </Card>
          );
        })}
      </ScrollView>
      <Confetti tick={levelUpTick} />
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rate: { flex: 1, minHeight: 68, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
});
