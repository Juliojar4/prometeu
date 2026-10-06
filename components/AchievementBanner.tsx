import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeOutUp, SlideInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, shadow, useTheme } from '../constants/theme';
import { achievementById } from '../lib/game';
import { useGame } from '../store/game';
import { Coin } from './Medallion';
import { T } from './ui';

/** Banner no topo ao desbloquear uma conquista; várias entram em fila, uma de cada vez. */
export function AchievementBanner() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const id = useGame((g) => g.toasts[0]);
  const dismiss = useGame((g) => g.dismissToast);
  useEffect(() => {
    if (!id) return;
    const h = setTimeout(dismiss, 3800);
    return () => clearTimeout(h);
  }, [id, dismiss]);
  const a = id ? achievementById(id) : null;
  if (!a) return null;
  return (
    <Animated.View key={id} entering={SlideInUp.duration(320)} exiting={FadeOutUp.duration(200)} style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16 }}>
      <Pressable
        onPress={dismiss}
        accessibilityRole="alert"
        accessibilityLabel={`Conquista desbloqueada: ${a.name}`}
        style={[{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: t.gold, backgroundColor: t.card }, shadow(t)]}
      >
        <View style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: t.gold, backgroundColor: t.card2, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name={a.icon as never} size={24} color={t.gold} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T serif style={{ fontSize: 10, letterSpacing: 2, color: t.bronze, fontWeight: '700' }}>CONQUISTA DESBLOQUEADA</T>
          <T serif style={{ fontSize: 16, fontWeight: '700' }} numberOfLines={1}>{a.name}</T>
        </View>
        {a.coins > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Coin size={14} />
            <T serif style={{ color: t.gold, fontWeight: '700', fontSize: 14 }}>+{a.coins}</T>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}
