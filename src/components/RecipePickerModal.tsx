import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { searchRecipes } from '../recipeFields';
import { useStore } from '../store';
import { colors, radius, spacing, type } from '../theme';
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
  return (
    <Modal visible={!!slot} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>{slot && <PickerSheet slot={slot} onClose={onClose} />}</View>
    </Modal>
  );
}

/** Mounted only while open, so the search box starts empty each time. */
function PickerSheet({ slot, onClose }: { slot: Slot; onClose: () => void }) {
  const { recipes, setMeal } = useStore();
  const [query, setQuery] = useState('');
  const shown = useMemo(() => searchRecipes(recipes, query), [recipes, query]);

  return (
    <View style={styles.sheet}>
      <Text style={type.heading}>Choose a recipe</Text>
      {recipes.length > 5 && (
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search recipes"
          autoCorrect={false}
          accessibilityLabel="Search recipes"
        />
      )}
      <FlatList
        data={shown}
        keyExtractor={(r) => r.id}
        style={{ marginVertical: spacing.md }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={type.small}>
            {recipes.length === 0 ? 'No recipes yet. Add one in the Recipes tab.' : 'No recipes match your search.'}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.option}
            onPress={() => {
              setMeal(slot.dateKey, slot.meal, item.id);
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
            setMeal(slot.dateKey, slot.meal, null);
            onClose();
          }}
        />
        <Button label="Cancel" variant="quiet" onPress={onClose} />
      </View>
    </View>
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
  search: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: spacing.md, fontSize: 15, marginTop: spacing.md },
  option: { paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
});
