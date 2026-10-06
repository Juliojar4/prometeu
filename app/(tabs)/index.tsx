import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AttrIcon } from '../../components/AttrIcon';
import { BossEmblem } from '../../components/BossEmblem';
import { ConfirmModal } from '../../components/Modal';
import { Avatar } from '../../components/Avatar';
import { Confetti } from '../../components/Confetti';
import { Flame } from '../../components/Flame';
import { Coin, Medallion } from '../../components/Medallion';
import { Bar, Card, SectionTitle, T } from '../../components/ui';
import { radius, useTheme } from '../../constants/theme';
import { addDays, ATTRS, ATTR_LABEL, bossInfoForWeek, MAX_SHIELDS, pillarsDone, STUDY_PILLAR_MIN, xpForNextLevel } from '../../lib/game';
import { useGame } from '../../store/game';

type Glyph = keyof typeof MaterialCommunityIcons.glyphMap;

export default function Home() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, streak, todayRecord: day, settings, missions, boss, pendingChest, today, levelUpTick, load, completeMission, undoMission } = useGame();
  const [undoing, setUndoing] = useState<string | null>(null);

  // virou o dia / voltou do background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => st === 'active' && load());
    return () => sub.remove();
  }, [load]);

  if (!profile || !boss) return null;
  const need = xpForNextLevel(profile.level);
  const defeated = boss.hp === 0;
  const info = bossInfoForWeek(boss.weekStart);
  const pillars = pillarsDone(day);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, gap: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Heroi */}
        <Card frieze style={{ gap: 14 }}>
          <View style={s.row}>
            <Avatar id={profile.avatar} tired={streak.tired} size={76} onPress={() => router.push('/perfil')} />
            <View style={{ flex: 1, gap: 4 }}>
              <T serif style={{ fontSize: 22, fontWeight: '700' }} numberOfLines={1}>{profile.name}</T>
              <T sub style={{ fontSize: 13 }}>{streak.tired ? 'A chama enfraqueceu. Volte hoje.' : 'Portador da chama'}</T>
              <View style={[s.row, { gap: 6, marginTop: 2 }]}>
                <Coin size={16} />
                <T style={{ color: t.gold, fontWeight: '600', fontSize: 15 }}>{profile.coins}</T>
              </View>
            </View>
            <Medallion level={profile.level} size={64} />
          </View>
          <View style={{ gap: 6 }}>
            <Bar value={profile.xp / need} color={t.ember} height={14} />
            <View style={s.between}>
              <T sub style={{ fontSize: 12 }}>Experiência</T>
              <T sub style={{ fontSize: 12 }}>{profile.xp} / {need} XP</T>
            </View>
          </View>
        </Card>

        {/* Chama (streak) */}
        <Card style={{ gap: 12 }}>
          <View style={[s.row, { gap: 14 }]}>
            <Flame size={56} lit={!streak.tired && streak.streak > 0} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <T serif style={{ fontSize: 34, fontWeight: '700', color: t.ember }}>{streak.streak}</T>
                <T sub numberOfLines={1}>{streak.streak === 1 ? 'dia de chama' : 'dias de chama'}</T>
              </View>
            </View>
            <View style={[s.row, { gap: 3 }]} accessible accessibilityLabel={`${streak.shields} de ${MAX_SHIELDS} escudos`}>
              {Array.from({ length: MAX_SHIELDS }, (_, i) => (
                <MaterialCommunityIcons key={i} name={i < streak.shields ? 'shield-half-full' : 'shield-outline'} size={24} color={i < streak.shields ? t.bronze : t.border} />
              ))}
            </View>
          </View>
          <T sub style={{ fontSize: 12 }}>
            {streak.shields >= MAX_SHIELDS ? 'Escudos no máximo: cada um guarda a chama num dia difícil.' : `Mais ${streak.nextShieldIn} ${streak.nextShieldIn === 1 ? 'dia ativo' : 'dias ativos'} para ganhar um escudo (dia ativo = 2 de 4 pilares).`}
          </T>
          {streak.lastShieldUse === addDays(today, -1) && (
            <View style={[s.note, { borderColor: t.bronze, backgroundColor: t.card2 }]}>
              <MaterialCommunityIcons name="shield-half-full" size={20} color={t.gold} />
              <T style={{ flex: 1, fontSize: 13, lineHeight: 19 }}>Um escudo guardou sua chama ontem. Sem problema: o fogo segue aceso, e hoje é um novo dia.</T>
            </View>
          )}
          {streak.atRisk && (
            <T sub style={{ fontSize: 13, lineHeight: 19 }}>
              {streak.shields > 0
                ? `Faltam ${2 - pillars} ${2 - pillars === 1 ? 'pilar' : 'pilares'} para manter a chama hoje. Se o dia escapar, um escudo cuida dela.`
                : `Cumpra mais ${2 - pillars} ${2 - pillars === 1 ? 'pilar' : 'pilares'} hoje para manter a chama acesa.`}
            </T>
          )}
        </Card>

        {/* Hoje */}
        <View style={{ gap: 12 }}>
          <SectionTitle right={<T sub style={{ fontSize: 12 }}>{pillarsDone(day)} de 4</T>}>Hoje</SectionTitle>
          <View style={[s.row, { gap: 8 }]}>
            <Pillar icon="water-outline" label="Água" value={`${day.water}/${settings.waterGoal}`} done={day.water >= settings.waterGoal} />
            <Pillar icon="dumbbell" label="Treino" value={day.workout ? 'Feito' : 'Falta'} done={day.workout} />
            <Pillar icon="food-apple-outline" label="Comida" value={String(day.meals)} done={day.meals >= 2} />
            <Pillar icon="book-open-page-variant-outline" label="Estudo" value={`${day.study ?? 0} min`} done={(day.study ?? 0) >= STUDY_PILLAR_MIN} />
          </View>
        </View>

        {/* Atributos */}
        <View style={{ gap: 14 }}>
          <SectionTitle>Atributos</SectionTitle>
          {ATTRS.map((a) => {
            const p = profile.attrs[a];
            return (
              <View key={a} style={s.row}>
                <AttrIcon attr={a} size={34} />
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={s.between}>
                    <T style={{ fontWeight: '600' }}>{ATTR_LABEL[a]}</T>
                    <T serif sub style={{ fontSize: 13 }}>Nv {p.level}</T>
                  </View>
                  <Bar value={p.xp / xpForNextLevel(p.level)} color={t.attr[a]} height={9} />
                </View>
              </View>
            );
          })}
        </View>

        {/* Chefao */}
        <Pressable onPress={() => router.push('/chefao')} accessibilityRole="button" accessibilityLabel={`Provação da semana: ${info.name}`}>
          <Card frieze style={{ gap: 14 }}>
            <View style={s.row}>
              <BossEmblem icon={info.icon} size={64} defeated={defeated} />
              <View style={{ flex: 1, gap: 2 }}>
                <T style={{ fontSize: 11, letterSpacing: 2, color: t.sub }} serif>PROVAÇÃO DA SEMANA</T>
                <T serif style={{ fontSize: 18, fontWeight: '700' }} numberOfLines={2}>{info.name}</T>
                <T sub style={{ fontSize: 12 }} numberOfLines={1}>{info.subtitle}</T>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={t.bronze} />
            </View>
            <Bar value={boss.hp / boss.maxHp} color={t.danger} height={14} />
            <View style={s.between}>
              {pendingChest ? (
                <View style={[s.row, { gap: 6 }]}>
                  <MaterialCommunityIcons name="treasure-chest" size={18} color={t.gold} />
                  <T style={{ fontSize: 12, fontWeight: '600', color: t.gold }}>Baú pronto para abrir</T>
                </View>
              ) : (
                <T sub style={{ fontSize: 12 }}>Cada hábito feito fere a criatura</T>
              )}
              <T style={{ fontSize: 12, fontWeight: '600' }}>{defeated ? 'Derrotado' : `${boss.hp} / ${boss.maxHp}`}</T>
            </View>
          </Card>
        </Pressable>

        {/* Missoes: acoes na metade inferior */}
        <View style={{ gap: 12 }}>
          <SectionTitle>Missões do dia</SectionTitle>
          {missions.map((m) => {
            return (
              <Pressable
                key={m.id}
                disabled={!!m.auto}
                onPress={() => (m.completed ? setUndoing(m.id) : completeMission(m.id))}
                accessibilityRole="button"
                accessibilityLabel={`${m.completed ? 'Concluída' : m.auto ? 'Automática' : 'Concluir'}: ${m.title}`}
                accessibilityHint={m.completed && !m.auto ? 'Toque para desfazer' : m.auto ? 'Concluída sozinha ao cumprir a meta' : undefined}
                style={({ pressed }) => [s.mission, { backgroundColor: m.completed ? t.card2 : t.card, borderColor: m.completed ? t.gold : t.bronze, opacity: pressed ? 0.8 : 1 }]}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <T style={{ fontWeight: '600', color: m.completed ? t.sub : t.text, textDecorationLine: m.completed ? 'line-through' : 'none' }}>{m.title}</T>
                  <View style={[s.row, { gap: 6 }]}>
                    <T sub style={{ fontSize: 12 }}>+{m.xp} XP</T>
                    <Coin size={10} />
                    <T sub style={{ fontSize: 12 }}>{m.coins}</T>
                    {m.auto && (
                      <>
                        <T sub style={{ fontSize: 12 }}>·</T>
                        <MaterialCommunityIcons name="flash-outline" size={13} color={t.bronze} />
                        <T style={{ fontSize: 12, color: t.bronze }}>Automática</T>
                      </>
                    )}
                    {m.completed && !m.auto && <T sub style={{ fontSize: 12 }}>· toque para desfazer</T>}
                  </View>
                </View>
                <View style={[s.check, { borderColor: m.completed ? t.gold : t.bronze, backgroundColor: m.completed ? t.gold : 'transparent' }]}>
                  {m.completed && <MaterialCommunityIcons name="check" size={20} color={t.bg} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <ConfirmModal
        visible={undoing !== null}
        title="Desfazer esta missão?"
        message="O XP, as moedas e o dano ao chefão desta missão serão devolvidos."
        confirmLabel="Desfazer"
        cancelLabel="Manter"
        onConfirm={() => { if (undoing) undoMission(undoing); setUndoing(null); }}
        onCancel={() => setUndoing(null)}
      />
      <Confetti tick={levelUpTick} />
    </View>
  );
}

function Pillar({ icon, label, value, done }: { icon: Glyph; label: string; value: string; done: boolean }) {
  const t = useTheme();
  const c = done ? t.gold : t.sub;
  return (
    <View style={[s.pillar, { borderColor: done ? t.gold : t.border, backgroundColor: done ? t.card2 : t.card }]}>
      <MaterialCommunityIcons name={icon} size={26} color={c} />
      <T serif numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 15, fontWeight: '700', color: done ? t.gold : t.text }}>{value}</T>
      <T sub style={{ fontSize: 11, letterSpacing: 0.5 }}>{label}</T>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pillar: { flex: 1, alignItems: 'center', borderRadius: radius.md, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 4, gap: 6 },
  mission: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.md, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 16, minHeight: 64 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: radius.md, padding: 12 },
  check: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
