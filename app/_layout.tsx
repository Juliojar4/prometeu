import { Cinzel_500Medium, Cinzel_700Bold, Cinzel_900Black } from '@expo-google-fonts/cinzel';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AchievementBanner } from '../components/AchievementBanner';
import { ChargeToast } from '../components/ChargeToast';
import { F, useTheme } from '../constants/theme';
import { useGame } from '../store/game';

export default function RootLayout() {
  const t = useTheme();
  const ready = useGame((s) => s.ready);
  const onboarded = useGame((s) => !!s.profile);
  const hasClass = useGame((s) => !!s.profile?.cls); // perfis anteriores às classes escolhem a senda uma vez, antes da Home
  const load = useGame((s) => s.load);
  const [fontsLoaded, fontError] = useFonts({
    Cinzel_500Medium, Cinzel_700Bold, Cinzel_900Black,
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
    ...MaterialCommunityIcons.font,
  });

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(t.bg).catch(() => {});
  }, [t.bg]);

  const header = (title: string) => ({
    headerShown: true,
    title,
    headerStyle: { backgroundColor: t.bg },
    headerShadowVisible: false,
    headerTintColor: t.gold,
    headerTitleAlign: 'center' as const,
    headerTitleStyle: { fontFamily: F.display, fontSize: 15, color: t.text },
  });

  // gate: sem fontes (ou erro) mostra so o fundo da marca, nunca texto em fonte do sistema piscando
  if (!ready || !(fontsLoaded || fontError)) return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  return (
    <SafeAreaProvider>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={onboarded && hasClass}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="perfil" options={header('PERFIL')} />
          <Stack.Screen name="chefao" options={header('PROVAÇÃO')} />
          <Stack.Screen name="combate" options={header('COMBATE')} />
          <Stack.Screen name="loja" options={header('LOJA')} />
          <Stack.Screen name="conquistas" options={header('CONQUISTAS')} />
          <Stack.Screen name="grimorio" options={header('GRIMÓRIO')} />
          <Stack.Screen name="arsenal" options={header('ARSENAL')} />
        </Stack.Protected>
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="senda" options={header('SENDA')} />
        </Stack.Protected>
      </Stack>
      <ChargeToast />
      <AchievementBanner />
    </SafeAreaProvider>
  );
}
