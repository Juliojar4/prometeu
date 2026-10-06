import { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { radius, shadow, useTheme } from '../constants/theme';
import { Button, Meander, T } from './ui';

/** Modal do app: cortina escura, cartão de bronze, entrada suave. Substitui o diálogo nativo do Android. */
export function AppModal({ visible, onClose, children, frieze }: { visible: boolean; onClose: () => void; children: ReactNode; frieze?: boolean }) {
  const t = useTheme();
  const { height } = useWindowDimensions();
  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(160)} style={s.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar" accessibilityRole="button" />
        <Animated.View entering={ZoomIn.duration(180)} style={[s.card, { backgroundColor: t.card, borderColor: t.bronze, maxHeight: height * 0.86 }, shadow(t)]}>
          {frieze && <Meander cell={2} opacity={0.6} />}
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} showsVerticalScrollIndicator={false} bounces={false}>{children}</ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

/** Confirmação: título serifado, texto, "cancelar" e a ação. `destructive` pinta a ação com a cor de perigo. */
export function ConfirmModal({ visible, title, message, confirmLabel, cancelLabel = 'Cancelar', destructive, busy, onConfirm, onCancel }: {
  visible: boolean; title: string; message?: string; confirmLabel: string; cancelLabel?: string; destructive?: boolean; busy?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <AppModal visible={visible} onClose={onCancel}>
      <T serif style={{ fontSize: 19, fontWeight: '700', letterSpacing: 0.5 }}>{title}</T>
      {!!message && <T sub style={{ lineHeight: 22 }}>{message}</T>}
      <View style={{ gap: 10, marginTop: 6 }}>
        <Button title={busy ? 'Aguarde...' : confirmLabel} variant={destructive ? 'danger' : 'primary'} onPress={onConfirm} disabled={busy} />
        <Button title={cancelLabel} variant="ghost" onPress={onCancel} disabled={busy} />
      </View>
    </AppModal>
  );
}

const s = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(8,6,4,0.78)', justifyContent: 'center', padding: 24 },
  card: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
});
