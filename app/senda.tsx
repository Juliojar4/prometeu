import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { ClassPicker } from '../components/ClassPicker';
import { Button, Meander, T } from '../components/ui';
import { useTheme } from '../constants/theme';
import { canChangeClass, daysBetween, nextClassChange, type ClassId } from '../lib/game';
import { useGame } from '../store/game';

const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

/**
 * "Escolha sua senda": obrigatória uma vez para quem já tinha perfil antes das classes (o _layout só libera a Home
 * depois) e, pelo Perfil, para trocar de classe (no máximo uma vez a cada 7 dias).
 */
export default function Senda() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, today, chooseClass } = useGame();
  const [pick, setPick] = useState<ClassId | null>(profile?.cls ?? null);
  const [busy, setBusy] = useState(false);
  const [first] = useState(!profile?.cls); // congelado: a escolha recarrega o perfil antes de sair da tela
  if (!profile) return null;

  const allowed = first || canChangeClass(profile.classChanged, today);
  const next = nextClassChange(profile.classChanged);
  const same = pick === profile.cls;

  const confirm = async () => {
    if (!pick || busy) return;
    setBusy(true);
    const ok = await chooseClass(pick).catch(() => false);
    setBusy(false);
    if (!ok) return;
    if (first) router.replace('/');
    else router.back();
  };

  return (
    <View style={{ flex: 1 }}>
      {first && <Stack.Screen options={{ headerShown: false }} />}
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: first ? insets.top + 24 : 8, gap: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', gap: 10 }}>
          <Avatar id={profile.avatar} size={96} cls={pick} />
          <T serif style={{ fontSize: 24, letterSpacing: 3, fontWeight: '700', textAlign: 'center' }}>{first ? 'ESCOLHA SUA SENDA' : 'TROCAR DE SENDA'}</T>
          <View style={{ width: 140 }}><Meander cell={3} opacity={0.8} /></View>
          <T sub style={{ textAlign: 'center', lineHeight: 21, maxWidth: 300 }}>
            {first
              ? 'Os deuses chamam os heróis por caminhos diferentes. A classe muda só o combate: todos os hábitos continuam valendo o mesmo.'
              : 'Trocar não apaga histórico, cargas nem XP. Depois da troca, a próxima só daqui a 7 dias.'}
          </T>
        </View>
        <ClassPicker value={pick} onChange={setPick} level={profile.level} current={profile.cls} />
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: t.bg, borderTopWidth: 1, borderTopColor: t.border, gap: 8 }}>
        {!allowed && next && (
          <T sub style={{ fontSize: 13, textAlign: 'center' }}>
            Você poderá trocar de novo em {ddmm(next)} ({daysBetween(today, next)} {daysBetween(today, next) === 1 ? 'dia' : 'dias'}).
          </T>
        )}
        <Button
          title={busy ? 'Aguarde...' : pick ? 'Seguir esta senda' : 'Escolha uma senda'}
          disabled={!pick || busy || !allowed || same}
          onPress={confirm}
        />
      </View>
    </View>
  );
}
