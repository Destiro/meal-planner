import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../store';
import { colors, spacing, type } from '../theme';
import { MealType } from '../types';

interface Props {
  dateKey: string;
  onPickSlot: (dateKey: string, meal: MealType) => void;
}

/** The meal rows for one day. Tap a row to choose a recipe. */
export function DayMeals({ dateKey, onPickSlot }: Props) {
  const { recipes, plan, settings } = useStore();
  return (
    <View>
      {settings.mealSlots.map(({ id: meal, label }) => {
        const name = recipes.find((r) => r.id === plan[dateKey]?.[meal])?.name;
        return (
          <Pressable key={meal} style={styles.slot} onPress={() => onPickSlot(dateKey, meal)}>
            <Text style={styles.mealLabel} numberOfLines={2}>
              {label}
            </Text>
            {/* flex: 1 lets a long name wrap onto a second line (then end in ...) instead of running off the screen. */}
            <Text style={[name ? type.body : styles.empty, styles.mealName]} numberOfLines={2}>
              {name ?? 'Add a meal'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    marginTop: spacing.sm,
  },
  mealLabel: { width: 90, fontSize: 13, color: colors.inkSoft },
  mealName: { flex: 1 },
  empty: { fontSize: 15, color: colors.accent },
});
