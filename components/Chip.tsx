import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import { radius, useTheme } from '../constants/theme';
import { T } from './ui';

/** Opção selecionável (tipo de treino, intensidade, tag). Selecionada: aro e texto dourados + marca. */
export function Chip({ label, selected, onPress, style, disabled }: {
  label: string; selected: boolean; onPress: () => void; style?: StyleProp<ViewStyle>; disabled?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !!disabled }}
      style={({ pressed }) => [
        { minHeight: 44, paddingHorizontal: 14, borderRadius: radius.sm, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
          borderColor: selected ? t.gold : t.border, backgroundColor: selected ? t.card2 : t.card, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        style,
      ]}
    >
      {selected && <MaterialCommunityIcons name="check" size={15} color={t.gold} />}
      <T style={{ fontSize: 14, fontWeight: selected ? '600' : '400', color: selected ? t.gold : t.text }}>{label}</T>
    </Pressable>
  );
}
