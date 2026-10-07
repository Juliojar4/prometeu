import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { ClassPicker } from '../components/ClassPicker';
import { Flame } from '../components/Flame';
import { Button, Card, Meander, SectionTitle, T } from '../components/ui';
import { AVATARS, F, radius, useTheme } from '../constants/theme';
import type { ClassId } from '../lib/game';
import { useGame } from '../store/game';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function Stepper({ value, onChange, min, max, label }: { value: number; onChange: (n: number) => void; min: number; max: number; label: string }) {
  const t = useTheme();
  const b = (d: number) => (
    <Pressable
      onPress={() => onChange(Math.max(min, Math.min(max, value + d)))}
      accessibilityRole="button"
      accessibilityLabel={d > 0 ? 'Aumentar' : 'Diminuir'}
      style={[s.stepBtn, { backgroundColor: t.card2, borderColor: t.bronze }]}
    >
      <MaterialCommunityIcons name={d > 0 ? 'plus' : 'minus'} size={24} color={t.gold} />
    </Pressable>
  );
  return (
    <View style={s.row}>
      {b(-1)}
      <View style={{ flex: 1, alignItems: 'center' }}>
        <T serif style={{ fontSize: 28, fontWeight: '700', color: t.gold }}>{value}</T>
        <T sub style={{ fontSize: 13 }}>{label}</T>
      </View>
      {b(1)}
    </View>
  );
}

function TimeField({ label, icon, value, onChange }: { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; value: string; onChange: (v: string) => void }) {
  const t = useTheme();
  const ok = TIME.test(value);
  return (
    <View style={s.row}>
      <View style={[s.row, { flex: 1, gap: 10 }]}><MaterialCommunityIcons name={icon} size={20} color={t.bronze} /><T>{label}</T></View>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="numbers-and-punctuation"
        maxLength={5}
        placeholder="HH:MM"
        placeholderTextColor={t.sub}
        style={[s.time, { color: t.text, backgroundColor: t.track, borderColor: ok ? t.border : t.danger, fontFamily: F.display }]}
      />
    </View>
  );
}

export default function Onboarding() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const finish = useGame((st) => st.completeOnboarding);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0].id);
  const [waterGoal, setWater] = useState(8);
  const [weeklyWorkoutGoal, setWorkouts] = useState(3);
  const [r, setR] = useState({ water: '10:00', workout: '18:00', meal: '12:30' });
  const [step, setStep] = useState<0 | 1>(0); // 0 = nome, busto e metas; 1 = senda (classe)
  const [cls, setCls] = useState<ClassId | null>(null);
  const valid = name.trim().length > 0 && Object.values(r).every((v) => TIME.test(v));
  useEffect(() => {
    if (step === 0) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setStep(0); return true; });
    return () => sub.remove();
  }, [step]);

  if (step === 1) return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 12, paddingBottom: 24, gap: 20 }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => setStep(0)} accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={12} style={[s.row, { gap: 6, alignSelf: 'flex-start' }]}>
          <MaterialCommunityIcons name="chevron-left" size={22} color={t.bronze} />
          <T serif style={{ fontSize: 12, letterSpacing: 1.5, color: t.bronze }}>VOLTAR</T>
        </Pressable>
        <View style={{ alignItems: 'center', gap: 10 }}>
          <Avatar id={avatar} size={96} cls={cls} />
          <T serif style={{ fontSize: 24, letterSpacing: 3, fontWeight: '700' }}>SUA SENDA</T>
          <View style={{ width: 140 }}><Meander cell={3} opacity={0.8} /></View>
          <T sub style={{ textAlign: 'center', lineHeight: 21, maxWidth: 300 }}>
            Cada herói luta do seu jeito. A classe muda só o combate: todo hábito vale o mesmo, e dá para trocar depois pelo perfil.
          </T>
        </View>
        <ClassPicker value={cls} onChange={setCls} />
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: t.bg, borderTopWidth: 1, borderTopColor: t.border }}>
        <Button title={cls ? 'Acender a chama' : 'Escolha uma senda'} disabled={!cls} onPress={() => cls && finish({ name, avatar, cls, waterGoal, weeklyWorkoutGoal, reminders: r })} />
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 24, paddingBottom: 24, gap: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', gap: 10 }}>
          <Flame size={64} />
          <T serif style={{ fontSize: 34, letterSpacing: 6, fontWeight: '700' }}>PROMETEU</T>
          <View style={{ width: 160 }}><Meander cell={3} opacity={0.8} /></View>
          <T sub style={{ textAlign: 'center', lineHeight: 22, maxWidth: 280 }}>
            O titã roubou o fogo para os mortais. Mantenha a sua chama acesa: cada hábito vira experiência.
          </T>
        </View>

        <View style={{ gap: 12 }}>
          <SectionTitle>Seu nome</SectionTitle>
          <TextInput
            value={name}
            onChangeText={setName}
            maxLength={20}
            placeholder="Como o chamarão nas crônicas?"
            placeholderTextColor={t.sub}
            selectionColor={t.ember}
            style={[s.input, { color: t.text, backgroundColor: t.track, borderColor: t.border }]}
          />
        </View>

        <View style={{ gap: 14 }}>
          <SectionTitle>Seu busto</SectionTitle>
          <View style={[s.row, { justifyContent: 'space-around' }]}>
            {AVATARS.map((a) => {
              const on = avatar === a.id;
              return (
                <Pressable key={a.id} onPress={() => setAvatar(a.id)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={a.nome} style={{ alignItems: 'center', gap: 8, opacity: on ? 1 : 0.6 }}>
                  <View style={{ padding: 5, borderRadius: 50, borderWidth: 1, borderColor: on ? t.ember : 'transparent' }}>
                    <Avatar id={a.id} size={84} />
                  </View>
                  <T serif style={{ fontSize: 12, letterSpacing: 1.5, color: on ? t.gold : t.sub, fontWeight: '700' }}>{a.nome.toUpperCase()}</T>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Card>
          <SectionTitle>Água por dia</SectionTitle>
          <Stepper value={waterGoal} onChange={setWater} min={1} max={20} label={`copos de 250 ml (${waterGoal * 250} ml)`} />
        </Card>

        <Card>
          <SectionTitle>Treinos por semana</SectionTitle>
          <Stepper value={weeklyWorkoutGoal} onChange={setWorkouts} min={1} max={7} label="treinos por semana" />
        </Card>

        <Card>
          <SectionTitle>Lembretes</SectionTitle>
          <TimeField icon="water-outline" label="Água" value={r.water} onChange={(v) => setR({ ...r, water: v })} />
          <TimeField icon="dumbbell" label="Treino" value={r.workout} onChange={(v) => setR({ ...r, workout: v })} />
          <TimeField icon="food-apple-outline" label="Refeição" value={r.meal} onChange={(v) => setR({ ...r, meal: v })} />
        </Card>
      </ScrollView>

      {/* CTA fixo na metade inferior, acima da barra de navegacao do Android */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: t.bg, borderTopWidth: 1, borderTopColor: t.border }}>
        <Button title="Continuar" disabled={!valid} onPress={() => setStep(1)} />
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 17, fontFamily: F.body },
  stepBtn: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  time: { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, fontSize: 17, minWidth: 96, textAlign: 'center' },
});
