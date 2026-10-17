import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../store';
import { colors, spacing, type } from '../theme';
import { MEAL_TYPES, MealType } from '../types';

interface Props {
  dateKey: string;
  onPickSlot: (dateKey: string, meal: MealType) => void;
}

/** The three meal rows for one day. Tap a row to choose a recipe. */
export function DayMeals({ dateKey, onPickSlot }: Props) {
  const { recipes, plan } = useStore();
  return (
    <View>
      {MEAL_TYPES.map((meal) => {
        const name = recipes.find((r) => r.id === plan[dateKey]?.[meal])?.name;
        return (
          <Pressable key={meal} style={styles.slot} onPress={() => onPickSlot(dateKey, meal)}>
            <Text style={styles.mealLabel}>{meal}</Text>
            <Text style={name ? type.body : styles.empty}>{name ?? 'Add a meal'}</Text>
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
  mealLabel: { width: 90, fontSize: 13, color: colors.inkSoft, textTransform: 'capitalize' },
  empty: { fontSize: 15, color: colors.accent },
});
