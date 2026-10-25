import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, type } from '../theme';
import { Button } from './Button';

interface Props {
  /** What the meal is called, e.g. "Dinner". */
  mealLabel: string;
  recipeName: string;
  onView: () => void;
  onChange: () => void;
  onClear: () => void;
  onClose: () => void;
}

/** What to do with a meal that is already planned: read the recipe, swap it, or take it off. Mount it to open. */
export function MealActionsModal({ mealLabel, recipeName, onView, onChange, onClear, onClose }: Props) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
        {/* The sheet swallows taps so touching it doesn't close it. */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={type.small}>{mealLabel}</Text>
          <Text style={type.heading}>{recipeName}</Text>
          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            <Button label="View recipe" onPress={onView} />
            <Button label="Change recipe" variant="quiet" onPress={onChange} />
            <Button label="Clear this meal" variant="quiet" onPress={onClear} />
            <Button label="Cancel" variant="quiet" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
