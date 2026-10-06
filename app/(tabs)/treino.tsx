import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip } from '../../components/Chip';
import { Confetti } from '../../components/Confetti';
import { ConfirmModal } from '../../components/Modal';
import { Bar, Button, Card, SectionTitle, T } from '../../components/ui';
import { radius, useTheme } from '../../constants/theme';
import {
  clampMinutes, INTENSITIES, Intensity, MAX_WORKOUT_MIN, QUICK_WORKOUTS, QuickWorkout, timerElapsed, timerMinutes,
  timerPause, timerRemaining, timerStart, TimerState, WORKOUT_KINDS, WorkoutKind, workoutXp,
} from '../../lib/game';
import { useGame } from '../../store/game';

type Glyph = keyof typeof MaterialCommunityIcons.glyphMap;
const KIND_ICON: Record<WorkoutKind, Glyph> = { musculacao: 'dumbbell', corrida: 'run-fast', caminhada: 'walk', alongamento: 'meditation', outro: 'arm-flex-outline' };
const QUICK_ICON: Record<string, Glyph> = { alongamento: 'meditation', circuito: 'home-lightning-bolt-outline', hiit: 'timer-outline' };
const INTENSITY_LABEL = Object.fromEntries(INTENSITIES.map((i) => [i.id, i.label])) as Record<Intensity, string>;
const idle: TimerState = { accMs: 0, startedAt: null };
const mmss = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export default function Treino() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { todayEvents, weekWorkouts, settings, levelUpTick, addWorkout, removeEvent } = useGame();
  const [kind, setKind] = useState<WorkoutKind>('musculacao');
  const [minutes, setMinutes] = useState(30);
  const [intensity, setIntensity] = useState<Intensity>('media');
  const [quickId, setQuickId] = useState<string | null>(null);
  const goal = settings.weeklyWorkoutGoal;
  const todays = todayEvents.filter((e) => e.type === 'workout');

  const save = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    addWorkout({ kind, minutes, intensity });
  };
  const [removing, setRemoving] = useState<number | null>(null);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, gap: 24, paddingBottom: 32 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 4 }}>
          <T serif style={{ fontSize: 13, letterSpacing: 3, color: t.bronze, fontWeight: '700' }}>FORJA</T>
          <T sub style={{ fontSize: 14 }}>O fogo se alimenta de constância, não de exagero.</T>
        </View>

        {/* Semana */}
        <Card style={{ gap: 10 }}>
          <View style={s.between}>
            <T style={{ fontWeight: '600' }}>Esta semana</T>
            <T serif style={{ color: weekWorkouts >= goal ? t.gold : t.text, fontWeight: '700' }}>{weekWorkouts} / {goal}</T>
          </View>
          <Bar value={weekWorkouts / Math.max(1, goal)} color={t.attr.forca} height={12} />
          <T sub style={{ fontSize: 12 }}>
            {weekWorkouts >= goal ? 'Meta semanal cumprida. A forja agradece.' : `Faltam ${goal - weekWorkouts} ${goal - weekWorkouts === 1 ? 'treino' : 'treinos'} para a meta da semana.`}
          </T>
        </Card>

        {/* Rápidos */}
        <View style={{ gap: 12 }}>
          <SectionTitle>Treinos rápidos</SectionTitle>
          {QUICK_WORKOUTS.map((w) => (
            <QuickCard key={w.id} w={w} open={quickId === w.id} locked={quickId !== null && quickId !== w.id} onOpen={() => setQuickId(quickId === w.id ? null : w.id)} onDone={() => setQuickId(null)} />
          ))}
        </View>

        {/* Registro manual */}
        <View style={{ gap: 14 }}>
          <SectionTitle>Registrar treino</SectionTitle>
          <View style={s.wrap}>
            {WORKOUT_KINDS.map((k) => <Chip key={k.id} label={k.label} selected={kind === k.id} onPress={() => setKind(k.id)} />)}
          </View>
          <View style={[s.between, { gap: 12 }]}>
            <T sub style={{ fontSize: 12, letterSpacing: 1 }}>DURAÇÃO</T>
            <View style={s.row}>
              <Step icon="minus" label="Menos 5 minutos" onPress={() => setMinutes((m) => clampMinutes(m - 5))} />
              <View style={{ minWidth: 84, alignItems: 'center' }}>
                <T serif style={{ fontSize: 28, fontWeight: '700', lineHeight: 34 }}>{minutes}</T>
                <T sub style={{ fontSize: 11 }}>minutos</T>
              </View>
              <Step icon="plus" label="Mais 5 minutos" onPress={() => setMinutes((m) => clampMinutes(m + 5))} />
            </View>
          </View>
          <View style={s.row}>
            {INTENSITIES.map((i) => <Chip key={i.id} label={i.label} selected={intensity === i.id} onPress={() => setIntensity(i.id)} style={{ flex: 1 }} />)}
          </View>
          <T sub style={{ fontSize: 12 }}>
            Rende {workoutXp(minutes, intensity)} XP de Força ({minutes} min × {INTENSITIES.find((i) => i.id === intensity)!.mult}). Máximo de {MAX_WORKOUT_MIN} min por registro.
          </T>
          <Button title="Registrar treino" onPress={save} icon={<MaterialCommunityIcons name="fire" size={20} color={t.onPrimary} />} style={{ minHeight: 56 }} />
        </View>

        {/* Hoje */}
        <View style={{ gap: 12 }}>
          <SectionTitle>Treinos de hoje</SectionTitle>
          {todays.length === 0 && <T sub style={{ fontSize: 14 }}>Nenhum treino ainda. Uma caminhada de dez minutos já acende a brasa.</T>}
          {todays.map((e) => {
            const d = e.data as { kind?: WorkoutKind; minutes?: number; intensity?: Intensity; name?: string } | null;
            const k = d?.kind ?? 'outro';
            return (
              <View key={e.id} style={[s.item, { backgroundColor: t.card, borderColor: t.border }]}>
                <MaterialCommunityIcons name={KIND_ICON[k]} size={26} color={t.attr.forca} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T style={{ fontWeight: '600' }}>{d?.name ?? WORKOUT_KINDS.find((x) => x.id === k)?.label ?? 'Treino'}</T>
                  <T sub style={{ fontSize: 12 }}>{d?.minutes ? `${d.minutes} min · ${INTENSITY_LABEL[d.intensity ?? 'media']} · ` : ''}+{e.xp} XP</T>
                </View>
                <Pressable onPress={() => setRemoving(e.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Excluir treino" style={s.trash}>
                  <MaterialCommunityIcons name="trash-can-outline" size={22} color={t.sub} />
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>
      <ConfirmModal
        visible={removing !== null}
        title="Excluir este treino?"
        message="O XP, as moedas e o dano ao chefão deste treino serão devolvidos."
        confirmLabel="Excluir"
        cancelLabel="Manter"
        destructive
        onConfirm={() => { if (removing !== null) removeEvent(removing); setRemoving(null); }}
        onCancel={() => setRemoving(null)}
      />
      <Confetti tick={levelUpTick} />
    </View>
  );
}

function Step({ icon, label, onPress }: { icon: Glyph; label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [s.step, { borderColor: t.bronze, opacity: pressed ? 0.6 : 1 }]}>
      <MaterialCommunityIcons name={icon} size={24} color={t.gold} />
    </Pressable>
  );
}

/** Cartão de treino rápido com cronômetro. O tempo vem de timestamps (Date.now), nunca de ticks acumulados. */
function QuickCard({ w, open, locked, onOpen, onDone }: { w: QuickWorkout; open: boolean; locked: boolean; onOpen: () => void; onDone: () => void }) {
  const t = useTheme();
  const addWorkout = useGame((g) => g.addWorkout);
  const [timer, setTimer] = useState<TimerState>(idle);
  const [now, setNow] = useState(Date.now());
  const total = w.minutes * 60_000;
  const running = timer.startedAt !== null;
  const remaining = timerRemaining(timer, total, now);
  const started = timer.accMs > 0 || running;
  const done = useRef(false);

  // tique só para redesenhar; o valor mostrado sempre sai de (agora - início)
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    const sub = AppState.addEventListener('change', (st) => st === 'active' && setNow(Date.now()));
    return () => { clearInterval(id); sub.remove(); };
  }, [running]);

  const finish = (ms: number) => {
    if (done.current) return;
    done.current = true;
    addWorkout({ kind: w.kind, minutes: timerMinutes(ms, w.minutes), intensity: w.intensity, name: w.name });
    setTimer(idle);
    onDone();
    setTimeout(() => (done.current = false), 500);
  };

  useEffect(() => {
    if (running && remaining === 0) {
      Vibration.vibrate([0, 500, 250, 500, 250, 800]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      finish(total);
    }
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => {
    const n = Date.now();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setNow(n);
    setTimer(running ? timerPause(timer, n) : timerStart(timer, n));
  };
  const conclude = () => finish(timerElapsed(timer, Date.now()));
  const cancel = () => { setTimer(idle); };

  return (
    <Card style={{ gap: 12, borderColor: open ? t.bronze : t.border, opacity: locked ? 0.45 : 1 }}>
      <Pressable onPress={onOpen} disabled={locked || started} accessibilityRole="button" accessibilityState={{ expanded: open }} style={s.row}>
        <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: t.attr.forca, backgroundColor: t.attr.forca + '22', alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name={QUICK_ICON[w.id] ?? 'fire'} size={22} color={t.attr.forca} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T serif style={{ fontSize: 17, fontWeight: '700' }}>{w.name}</T>
          <T sub style={{ fontSize: 12 }}>{w.minutes} min · {INTENSITY_LABEL[w.intensity]} · {workoutXp(w.minutes, w.intensity)} XP</T>
        </View>
        {!started && <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={24} color={t.bronze} />}
      </Pressable>
      {open && (
        <>
          <View style={{ gap: 6 }}>
            {w.exercises.map((x, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ width: 5, height: 5, marginTop: 8, backgroundColor: t.bronze, transform: [{ rotate: '45deg' }] }} />
                <T sub style={{ flex: 1, fontSize: 14, lineHeight: 21 }}>{x}</T>
              </View>
            ))}
          </View>
          <View style={{ alignItems: 'center', gap: 8, paddingVertical: 6 }}>
            <T serif style={{ fontSize: 48, fontWeight: '700', color: running ? t.ember : t.text, lineHeight: 56 }} accessibilityLiveRegion="none">{mmss(remaining)}</T>
            <View style={{ alignSelf: 'stretch' }}><Bar value={1 - remaining / total} color={t.ember} height={10} /></View>
          </View>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Button variant="ghost" title={running ? 'Pausar' : started ? 'Retomar' : 'Iniciar'} onPress={toggle}
                icon={<MaterialCommunityIcons name={running ? 'pause' : 'play'} size={20} color={t.text} />} />
            </View>
            {started && (
              <View style={{ flex: 1 }}>
                <Button variant="ghost" title="Concluir" onPress={conclude} icon={<MaterialCommunityIcons name="check" size={20} color={t.gold} />} />
              </View>
            )}
          </View>
          {started && <Pressable onPress={cancel} style={{ alignSelf: 'center', padding: 6 }}><T sub style={{ fontSize: 12 }}>Descartar sem registrar</T></Pressable>}
        </>
      )}
    </Card>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  step: { width: 48, height: 48, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.md, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 16, minHeight: 64 },
  trash: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
