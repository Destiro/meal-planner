import React from 'react';
import { Modal, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatIngredient } from '../ingredients';
import { RecipeInput } from '../store';
import { colors, spacing, type } from '../theme';
import { Button } from './Button';

interface Props {
  recipe: RecipeInput;
  /** Opens the Add Recipe form so you can adjust it before saving. */
  onSave: () => void;
  onClose: () => void;
}

/** Read a suggested recipe in full before deciding to save it. Mount it to open. */
export function RecipePreviewModal({ recipe, onSave, onClose }: Props) {
  const steps = recipe.notes?.split('\n').filter(Boolean) ?? [];
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={type.title}>{recipe.name}</Text>
          <Text style={type.small}>Serves {recipe.servings}</Text>

          <Text style={type.heading}>Ingredients</Text>
          {recipe.ingredients.length === 0 && <Text style={type.small}>No ingredients listed.</Text>}
          {recipe.ingredients.map((ingredient, i) => (
            <Text key={i} style={type.body}>
              • {formatIngredient(ingredient)}
            </Text>
          ))}

          <Text style={type.heading}>Method</Text>
          {steps.length === 0 && <Text style={type.small}>No steps listed.</Text>}
          {steps.map((step, i) => (
            <Text key={i} style={type.body}>
              {step}
            </Text>
          ))}

          <Button label="Save to recipes" onPress={onSave} />
          <Button label="Close" variant="quiet" onPress={onClose} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
});
