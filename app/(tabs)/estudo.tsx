import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, TextInput, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip } from '../../components/Chip';
import { Confetti } from '../../components/Confetti';
import { ConfirmModal } from '../../components/Modal';
import { Bar, Button, Card, SectionTitle, T } from '../../components/ui';
import { F, radius, useTheme } from '../../constants/theme';
import {
  clampPages, clampStudyMinutes, FOCUS_OPTIONS, MAX_STUDY_MIN, STUDY_KINDS, STUDY_PILLAR_MIN, StudyKind, studyXp,
  timerElapsed, timerMinutes, timerPause, timerRemaining, timerStart, TimerState,
} from '../../lib/game';
import { useGame } from '../../store/game';

type Glyph = keyof typeof MaterialCommunityIcons.glyphMap;
const KIND_ICON: Record<StudyKind, Glyph> = { leitura: 'book-open-page-variant-outline', estudo: 'school-outline', idioma: 'translate', revisao: 'notebook-edit-outline', outro: 'lightbulb-outline' };
const KIND_LABEL = Object.fromEntries(STUDY_KINDS.map((k) => [k.id, k.label])) as Record<StudyKind, string>;
const idle: TimerState = { accMs: 0, startedAt: null };
const mmss = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
const dmy = (ts: number) => { const d = new Date(ts); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`; };

export default function Estudo() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { todayEvents, todayRecord: day, books, levelUpTick, addStudy, removeEvent } = useGame();
  const [kind, setKind] = useState<StudyKind>('leitura');
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState(25);
  const [pages, setPages] = useState('');
  const [removing, setRemoving] = useState<number | null>(null);
  const todays = todayEvents.filter((e) => e.type === 'study');
  const studied = day.study ?? 0;
  const pg = clampPages(Number(pages) || 0);
  const reading = kind === 'leitura';

  const save = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    addStudy({ kind, minutes, title, pages: pg });
    setPages('');
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, gap: 24, paddingBottom: 32 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 4 }}>
          <T serif style={{ fontSize: 13, letterSpacing: 3, color: t.bronze, fontWeight: '700' }}>BIBLIOTECA</T>
          <T sub style={{ fontSize: 14 }}>A mente também é uma chama: alimente-a todo dia.</T>
        </View>

        <Card style={{ gap: 10 }}>
          <View style={s.between}>
            <T style={{ fontWeight: '600' }}>Hoje</T>
            <T serif style={{ color: studied >= STUDY_PILLAR_MIN ? t.gold : t.text, fontWeight: '700' }}>{studied} min</T>
          </View>
          <Bar value={studied / STUDY_PILLAR_MIN} color={t.attr.intelecto} height={12} />
          <T sub style={{ fontSize: 12 }}>
            {studied >= STUDY_PILLAR_MIN ? 'Pilar do estudo cumprido hoje.' : `Faltam ${STUDY_PILLAR_MIN - studied} min para o pilar do estudo (conta para manter a chama).`}
          </T>
        </Card>

        {/* O que */}
        <View style={{ gap: 12 }}>
          <SectionTitle>O que você estuda?</SectionTitle>
          <View style={s.wrap}>
            {STUDY_KINDS.map((k) => <Chip key={k.id} label={k.label} selected={kind === k.id} onPress={() => setKind(k.id)} />)}
          </View>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={reading ? 'Título do livro (opcional)' : 'Assunto (opcional)'}
            placeholderTextColor={t.sub}
            maxLength={80}
            style={[s.input, { color: t.text, borderColor: t.border, backgroundColor: t.card }]}
            accessibilityLabel={reading ? 'Título do livro' : 'Assunto'}
          />
        </View>

        {/* Foco */}
        <View style={{ gap: 12 }}>
          <SectionTitle>Sessão de foco</SectionTitle>
          <FocusTimer kind={kind} title={title} />
        </View>

        {/* Manual */}
        <View style={{ gap: 14 }}>
          <SectionTitle>Registrar estudo</SectionTitle>
          <View style={[s.between, { gap: 12 }]}>
            <T sub style={{ fontSize: 12, letterSpacing: 1 }}>DURAÇÃO</T>
            <View style={s.row}>
              <Step icon="minus" label="Menos 5 minutos" onPress={() => setMinutes((m) => clampStudyMinutes(m - 5))} />
              <View style={{ minWidth: 84, alignItems: 'center' }}>
                <T serif style={{ fontSize: 28, fontWeight: '700', lineHeight: 34 }}>{minutes}</T>
                <T sub style={{ fontSize: 11 }}>minutos</T>
              </View>
              <Step icon="plus" label="Mais 5 minutos" onPress={() => setMinutes((m) => clampStudyMinutes(m + 5))} />
            </View>
          </View>
          {reading && (
            <View style={[s.between, { gap: 12 }]}>
              <T sub style={{ fontSize: 12, letterSpacing: 1 }}>PÁGINAS LIDAS</T>
              <TextInput
                value={pages}
                onChangeText={(v) => setPages(v.replace(/[^0-9]/g, '').slice(0, 4))}
                placeholder="0"
                placeholderTextColor={t.sub}
                keyboardType="number-pad"
                style={[s.input, { width: 110, textAlign: 'center', fontFamily: F.display, fontSize: 18, color: t.text, borderColor: t.border, backgroundColor: t.card }]}
                accessibilityLabel="Páginas lidas (opcional)"
              />
            </View>
          )}
          <T sub style={{ fontSize: 12 }}>
            Rende {studyXp(minutes, kind, pg)} XP de Intelecto ({KIND_LABEL[kind].toLowerCase()}){reading ? ', +1 a cada 10 páginas' : ''}. Máximo de {MAX_STUDY_MIN} min por registro.
          </T>
          <Button title="Registrar estudo" onPress={save} icon={<MaterialCommunityIcons name="book-open-page-variant-outline" size={20} color={t.onPrimary} />} style={{ minHeight: 56 }} />
        </View>

        {/* Hoje */}
        <View style={{ gap: 12 }}>
          <SectionTitle>Estudos de hoje</SectionTitle>
          {todays.length === 0 && <T sub style={{ fontSize: 14 }}>Nada ainda. Dez minutos de leitura já acendem a chama da mente.</T>}
          {todays.map((e) => {
            const d = e.data as { kind?: StudyKind; minutes?: number; title?: string; pages?: number } | null;
            const k = d?.kind ?? 'outro';
            return (
              <View key={e.id} style={[s.item, { backgroundColor: t.card, borderColor: t.border }]}>
                <MaterialCommunityIcons name={KIND_ICON[k]} size={26} color={t.attr.intelecto} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T style={{ fontWeight: '600' }} numberOfLines={1}>{d?.title || KIND_LABEL[k]}</T>
                  <T sub style={{ fontSize: 12 }}>{d?.minutes ?? 0} min{d?.pages ? ` · ${d.pages} pág.` : ''} · +{e.xp} XP</T>
                </View>
                <Pressable onPress={() => setRemoving(e.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Excluir sessão de estudo" style={s.trash}>
                  <MaterialCommunityIcons name="trash-can-outline" size={22} color={t.sub} />
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* Livros */}
        <View style={{ gap: 12 }}>
          <SectionTitle>Meus livros</SectionTitle>
          {books.length === 0 && <T sub style={{ fontSize: 14 }}>Registre uma leitura com o título do livro e ele aparece aqui.</T>}
          {books.map((b) => (
            <View key={b.title.toLowerCase()} style={[s.item, { backgroundColor: t.card, borderColor: t.border }]}>
              <View style={[s.spine, { borderColor: t.attr.intelecto, backgroundColor: t.attr.intelecto + '22' }]}>
                <MaterialCommunityIcons name="book-outline" size={20} color={t.attr.intelecto} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <T serif style={{ fontSize: 15, fontWeight: '700' }} numberOfLines={2}>{b.title}</T>
                <T sub style={{ fontSize: 12 }}>{b.pages} pág. · {b.minutes} min · {b.sessions} {b.sessions === 1 ? 'sessão' : 'sessões'} · última em {dmy(b.last)}</T>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <ConfirmModal
        visible={removing !== null}
        title="Excluir esta sessão?"
        message="O XP, as moedas e o dano ao chefão desta sessão serão devolvidos."
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

/** Foco de 15/25/45 min. O tempo vem de timestamps (Date.now), nunca de ticks acumulados: sobrevive ao segundo plano. */
function FocusTimer({ kind, title }: { kind: StudyKind; title: string }) {
  const t = useTheme();
  const addStudy = useGame((g) => g.addStudy);
  const [plan, setPlan] = useState(25);
  const [timer, setTimer] = useState<TimerState>(idle);
  const [now, setNow] = useState(Date.now());
  const total = plan * 60_000;
  const running = timer.startedAt !== null;
  const started = timer.accMs > 0 || running;
  const remaining = timerRemaining(timer, total, now);
  const done = useRef(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    const sub = AppState.addEventListener('change', (st) => st === 'active' && setNow(Date.now()));
    return () => { clearInterval(id); sub.remove(); };
  }, [running]);

  const finish = (ms: number) => {
    if (done.current) return;
    done.current = true;
    addStudy({ kind, minutes: timerMinutes(ms, plan), title });
    setTimer(idle);
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

  return (
    <Card style={{ gap: 12 }}>
      <View style={s.row}>
        {FOCUS_OPTIONS.map((m) => <Chip key={m} label={`${m} min`} selected={plan === m} disabled={started} onPress={() => setPlan(m)} style={{ flex: 1 }} />)}
      </View>
      <View style={{ alignItems: 'center', gap: 8, paddingVertical: 6 }}>
        <T serif style={{ fontSize: 48, fontWeight: '700', color: running ? t.attr.intelecto : t.text, lineHeight: 56 }}>{mmss(remaining)}</T>
        <View style={{ alignSelf: 'stretch' }}><Bar value={1 - remaining / total} color={t.attr.intelecto} height={10} /></View>
      </View>
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Button variant="ghost" title={running ? 'Pausar' : started ? 'Retomar' : 'Iniciar foco'} onPress={toggle} icon={<MaterialCommunityIcons name={running ? 'pause' : 'play'} size={20} color={t.text} />} />
        </View>
        {started && (
          <View style={{ flex: 1 }}>
            <Button variant="ghost" title="Concluir" onPress={() => finish(timerElapsed(timer, Date.now()))} icon={<MaterialCommunityIcons name="check" size={20} color={t.gold} />} />
          </View>
        )}
      </View>
      {started && <Pressable onPress={() => setTimer(idle)} style={{ alignSelf: 'center', padding: 6 }}><T sub style={{ fontSize: 12 }}>Descartar sem registrar</T></Pressable>}
    </Card>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  step: { width: 48, height: 48, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, fontFamily: F.body, fontSize: 15 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.md, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 16, minHeight: 64 },
  trash: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  spine: { width: 36, height: 44, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
