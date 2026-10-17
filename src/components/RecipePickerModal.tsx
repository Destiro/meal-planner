import React from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../store';
import { colors, spacing, type } from '../theme';
import { MealType } from '../types';
import { Button } from './Button';

export interface Slot {
  dateKey: string;
  meal: MealType;
}

interface Props {
  slot: Slot | null;
  onClose: () => void;
}

export function RecipePickerModal({ slot, onClose }: Props) {
  const { recipes, setMeal } = useStore();
  return (
    <Modal visible={!!slot} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={type.heading}>Choose a recipe</Text>
          <FlatList
            data={recipes}
            keyExtractor={(r) => r.id}
            style={{ marginVertical: spacing.md }}
            ListEmptyComponent={<Text style={type.small}>No recipes yet. Add one in the Recipes tab.</Text>}
            renderItem={({ item }) => (
              <Pressable
                style={styles.option}
                onPress={() => {
                  if (slot) setMeal(slot.dateKey, slot.meal, item.id);
                  onClose();
                }}
              >
                <Text style={type.body}>{item.name}</Text>
              </Pressable>
            )}
          />
          <View style={{ gap: spacing.sm }}>
            <Button
              label="Clear this meal"
              variant="quiet"
              onPress={() => {
                if (slot) setMeal(slot.dateKey, slot.meal, null);
                onClose();
              }}
            />
            <Button label="Cancel" variant="quiet" onPress={onClose} />
          </View>
        </View>
      </View>
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
    maxHeight: '75%',
  },
  option: { paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
});
