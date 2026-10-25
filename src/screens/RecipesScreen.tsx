import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { RecipeFormModal } from '../components/RecipeFormModal';
import { formatIngredient } from '../ingredients';
import { deletePhoto } from '../photos';
import { useStore } from '../store';
import { colors, radius, spacing, type } from '../theme';
import { Recipe } from '../types';

export default function RecipesScreen() {
  const { recipes, addRecipe, updateRecipe, deleteRecipe } = useStore();
  // undefined: form closed. null: adding a new recipe. Recipe: editing it.
  const [editing, setEditing] = useState<Recipe | null | undefined>(undefined);
  const [tag, setTag] = useState<string | null>(null);

  const allTags = useMemo(
    () => [...new Set(recipes.flatMap((r) => r.tags ?? []))].sort(),
    [recipes],
  );
  // If the last recipe with the chosen tag is deleted or retagged, show everything again.
  const activeTag = tag && allTags.includes(tag) ? tag : null;
  const shown = activeTag ? recipes.filter((r) => r.tags?.includes(activeTag)) : recipes;

  const confirmDelete = (recipe: Recipe) =>
    Alert.alert(`Delete "${recipe.name}"?`, 'It will also be removed from your meal plan.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deletePhoto(recipe.photo);
          deleteRecipe(recipe.id);
          setEditing(undefined);
        },
      },
    ]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={type.title}>Recipes</Text>
        <Button label="Add recipe" onPress={() => setEditing(null)} />
      </View>

      {allTags.length > 0 && (
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {[null, ...allTags].map((t) => (
              <Pressable
                key={t ?? 'all'}
                onPress={() => setTag(t)}
                style={[styles.chip, activeTag === t && styles.chipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: activeTag === t }}
              >
                <Text style={[styles.chipText, activeTag === t && styles.chipTextActive]}>{t ?? 'All'}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={shown}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={type.small}>No recipes yet. Add your first one.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => setEditing(item)} accessibilityHint="Opens the recipe to edit">
            {item.photo ? <Image source={{ uri: item.photo }} style={styles.photo} /> : null}
            <Text style={type.heading}>{item.name}</Text>
            <Text style={type.small}>
              Serves {item.servings} · {item.ingredients.map(formatIngredient).join(', ') || 'No ingredients listed'}
            </Text>
            {item.tags && item.tags.length > 0 && <Text style={styles.tags}>{item.tags.map((t) => `#${t}`).join('  ')}</Text>}
            {item.sourceUrl && (
              <Pressable onPress={() => Linking.openURL(item.sourceUrl!).catch(() => Alert.alert('Could not open link'))} hitSlop={8}>
                <Text style={styles.link} numberOfLines={1}>
                  {item.sourceUrl}
                </Text>
              </Pressable>
            )}
          </Pressable>
        )}
      />

      {editing !== undefined && (
        <RecipeFormModal
          // A fresh form each time, so one recipe's fields never leak into the next.
          key={editing?.id ?? 'new'}
          recipe={editing}
          onClose={() => setEditing(undefined)}
          onSave={(input) => {
            if (editing) updateRecipe(editing.id, input);
            else addRecipe(input);
            setEditing(undefined);
          }}
          onDelete={editing ? () => confirmDelete(editing) : undefined}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  chips: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm },
  chip: { paddingVertical: 6, paddingHorizontal: spacing.md, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.ink },
  chipTextActive: { color: '#fff' },
  list: { padding: spacing.lg, paddingTop: 0, gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.line, gap: spacing.xs },
  photo: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.sm, marginBottom: spacing.sm, backgroundColor: colors.line },
  tags: { fontSize: 13, color: colors.accent },
  link: { fontSize: 13, color: colors.accent, textDecorationLine: 'underline' },
});
