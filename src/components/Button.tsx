import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from '../theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'quiet';
  disabled?: boolean;
}

export function Button({ label, onPress, variant = 'primary', disabled }: Props) {
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        primary ? styles.primary : styles.quiet,
        (pressed || disabled) && { opacity: 0.6 },
      ]}
    >
      <Text style={[styles.label, { color: primary ? '#fff' : colors.accent }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: radius.sm, alignItems: 'center' },
  primary: { backgroundColor: colors.accent },
  quiet: { backgroundColor: colors.accentSoft },
  label: { fontSize: 15, fontWeight: '600' },
});
