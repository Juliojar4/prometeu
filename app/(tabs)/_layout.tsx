import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { ColorValue, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F, useTheme } from '../../constants/theme';

type Glyph = keyof typeof MaterialCommunityIcons.glyphMap;
const icon = (name: Glyph) => ({ color, focused }: { color: ColorValue; focused: boolean }) => (
  <View style={{ alignItems: 'center' }}>
    <View style={{ position: 'absolute', top: -10, width: 22, height: 2, backgroundColor: focused ? color : 'transparent' }} />
    <MaterialCommunityIcons name={name} size={24} color={color} />
  </View>
);

export default function TabsLayout() {
  const t = useTheme();
  const insets = useSafeAreaInsets(); // edge-to-edge: a barra de navegacao do Android fica por cima do app
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: t.bg },
        tabBarActiveTintColor: t.ember,
        tabBarInactiveTintColor: t.sub,
        tabBarStyle: {
          backgroundColor: t.card,
          borderTopColor: t.border,
          borderTopWidth: 1,
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 14,
        },
        tabBarLabelStyle: { fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 0.4 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: icon('pillar') }} />
      <Tabs.Screen name="agua" options={{ title: 'Água', tabBarIcon: icon('water-outline') }} />
      <Tabs.Screen name="treino" options={{ title: 'Treino', tabBarIcon: icon('dumbbell') }} />
      <Tabs.Screen name="comida" options={{ title: 'Comida', tabBarIcon: icon('food-apple-outline') }} />
      <Tabs.Screen name="estudo" options={{ title: 'Estudo', tabBarIcon: icon('book-open-page-variant-outline') }} />
      <Tabs.Screen name="amigos" options={{ title: 'Amigos', tabBarIcon: icon('account-group-outline') }} />
    </Tabs>
  );
}
