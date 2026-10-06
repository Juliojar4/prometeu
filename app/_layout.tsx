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
import { F, useTheme } from '../constants/theme';
import { useGame } from '../store/game';

export default function RootLayout() {
  const t = useTheme();
  const ready = useGame((s) => s.ready);
  const onboarded = useGame((s) => !!s.profile);
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
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="perfil" options={header('PERFIL')} />
          <Stack.Screen name="chefao" options={header('PROVAÇÃO')} />
          <Stack.Screen name="loja" options={header('LOJA')} />
          <Stack.Screen name="conquistas" options={header('CONQUISTAS')} />
        </Stack.Protected>
      </Stack>
      <AchievementBanner />
    </SafeAreaProvider>
  );
}
