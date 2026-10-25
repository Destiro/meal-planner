import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatIngredientFriendly, scaleIngredient } from '../ingredients';
import { colors, radius, spacing, type } from '../theme';
import { Recipe } from '../types';
import { Button } from './Button';

interface Props {
  recipe: Recipe;
  /** How many people you cook for. Ingredient amounts are scaled to this. */
  household: number;
  onClose: () => void;
}

/** A saved recipe laid out for cooking from: amounts for your household, then the method. Mount it to open. */
export function RecipeDetailModal({ recipe, household, onClose }: Props) {
  const factor = recipe.servings > 0 ? household / recipe.servings : 1;
  const steps = recipe.notes?.split('\n').filter((line) => line.trim() !== '') ?? [];
  const people = (n: number) => `${n} ${n === 1 ? 'person' : 'people'}`;

  return (
    <Modal
      visible
      statusBarTranslucent
      navigationBarTranslucent
      animationType="slide"
      onRequestClose={onClose}
    >
      <StatusBar style="dark" />
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close recipe">
            <Text style={styles.close}>‹ Back to plan</Text>
          </Pressable>

          {recipe.photo ? <Image source={{ uri: recipe.photo }} style={styles.photo} accessibilityLabel="Recipe photo" /> : null}
          <Text style={type.title}>{recipe.name}</Text>
          {recipe.tags && recipe.tags.length > 0 && <Text style={styles.tags}>{recipe.tags.map((t) => `#${t}`).join('  ')}</Text>}

          <View style={styles.servings}>
            <Text style={type.heading}>For {people(household)}</Text>
            <Text style={type.small}>
              {factor === 1
                ? `Amounts are as written, for ${people(recipe.servings)}.`
                : `Scaled from the recipe's ${people(recipe.servings)}. Change "Cooking for" on the Shopping tab to adjust.`}
            </Text>
          </View>

          <Text style={type.heading}>Ingredients</Text>
          {recipe.ingredients.length === 0 && <Text style={type.small}>No ingredients listed.</Text>}
          {recipe.ingredients.map((ingredient, i) => (
            <Text key={i} style={type.body}>
              • {formatIngredientFriendly(scaleIngredient(ingredient, factor))}
            </Text>
          ))}

          <Text style={type.heading}>Method</Text>
          {steps.length === 0 && <Text style={type.small}>No method written down yet.</Text>}
          {steps.map((step, i) => (
            <Text key={i} style={[type.body, styles.step]}>
              {step}
            </Text>
          ))}

          {recipe.sourceUrl && (
            <Pressable
              onPress={() => Linking.openURL(recipe.sourceUrl!).catch(() => Alert.alert('Could not open link'))}
              hitSlop={8}
            >
              <Text style={styles.link} numberOfLines={1}>
                {recipe.sourceUrl}
              </Text>
            </Pressable>
          )}

          <Button label="Close" variant="quiet" onPress={onClose} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  close: { fontSize: 16, fontWeight: '600', color: colors.accent },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: colors.line },
  tags: { fontSize: 13, color: colors.accent },
  servings: { backgroundColor: colors.accentSoft, borderRadius: radius.sm, padding: spacing.md, gap: spacing.xs },
  step: { lineHeight: 22 },
  link: { fontSize: 13, color: colors.accent, textDecorationLine: 'underline' },
});
