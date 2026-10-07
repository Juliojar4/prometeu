import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, useTheme } from '../constants/theme';
import { useGame } from '../store/game';
import { T } from './ui';

/** Aviso curto no topo ao ganhar cargas ("+1 carga de Força") e centelhas ("+1 centelha"). Some sozinho; cede lugar ao banner de conquista. */
export function ChargeToast() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const note = useGame((g) => g.chargeNote);
  const busy = useGame((g) => g.toasts.length > 0);
  const dismiss = useGame((g) => g.dismissChargeNote);
  useEffect(() => {
    if (!note) return;
    const h = setTimeout(dismiss, 2600);
    return () => clearTimeout(h);
  }, [note, dismiss]);
  if (!note || busy) return null;
  return (
    <Animated.View key={note.tick} entering={FadeInUp.duration(220)} exiting={FadeOutUp.duration(180)} style={{ position: 'absolute', top: insets.top + 8, alignSelf: 'center', maxWidth: '92%' }}>
      <Pressable
        onPress={dismiss}
        accessibilityRole="alert"
        accessibilityLabel={note.text}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1, borderColor: t.bronze, backgroundColor: t.card2 }}
      >
        <MaterialCommunityIcons name={note.text.includes('carga') ? 'sword-cross' : 'fire'} size={16} color={note.text.includes('carga') ? t.gold : t.ember} />
        <T style={{ fontSize: 13, fontWeight: '600' }} numberOfLines={2}>{note.text}</T>
      </Pressable>
    </Animated.View>
  );
}
