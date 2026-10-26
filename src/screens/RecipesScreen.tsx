import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { ExploreModal } from '../components/ExploreModal';
import { RecipeFormModal } from '../components/RecipeFormModal';
import { formatIngredient } from '../ingredients';
import { deletePhoto } from '../photos';
import { favouritesFirst, searchRecipes } from '../recipeFields';
import { RecipeInput, useStore } from '../store';
import { colors, radius, spacing, type } from '../theme';
import { Recipe } from '../types';

export default function RecipesScreen() {
  const { recipes, addRecipe, updateRecipe, toggleFavourite, deleteRecipe } = useStore();
  // undefined: form closed. null: adding a new recipe. Recipe: editing it.
  const [editing, setEditing] = useState<Recipe | null | undefined>(undefined);
  // A recipe borrowed from Explore, shown in the Add Recipe form for you to review.
  const [draft, setDraft] = useState<RecipeInput | null>(null);
  const [exploring, setExploring] = useState(false);
  const [tag, setTag] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [favouritesOnly, setFavouritesOnly] = useState(false);

  const allTags = useMemo(
    () => [...new Set(recipes.flatMap((r) => r.tags ?? []))].sort(),
    [recipes],
  );
  // If the last recipe with the chosen tag is deleted or retagged, show everything again.
  const activeTag = tag && allTags.includes(tag) ? tag : null;
  const hasFavourites = recipes.some((r) => r.favourite);
  // If the last favourite is un-bookmarked, show everything again.
  const activeFavourites = favouritesOnly && hasFavourites;
  const shown = useMemo(
    () => favouritesFirst(searchRecipes(recipes, query, activeTag, activeFavourites)),
    [recipes, query, activeTag, activeFavourites],
  );

  const selectAll = () => {
    setTag(null);
    setFavouritesOnly(false);
  };
  const selectFavourites = () => {
    setTag(null);
    setFavouritesOnly(true);
  };
  const selectTag = (t: string) => {
    setTag(t);
    setFavouritesOnly(false);
  };

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
        <View style={styles.actions}>
          <Button label="Explore" variant="quiet" onPress={() => setExploring(true)} />
          <Button label="Add recipe" onPress={() => setEditing(null)} />
        </View>
      </View>

      {recipes.length > 0 && (
        <View style={styles.search}>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name, ingredient or tag"
            returnKeyType="search"
            autoCorrect={false}
            clearButtonMode="while-editing"
            accessibilityLabel="Search recipes"
          />
        </View>
      )}

      {(allTags.length > 0 || hasFavourites) && (
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Pressable
              onPress={selectAll}
              style={[styles.chip, !activeTag && !activeFavourites && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: !activeTag && !activeFavourites }}
            >
              <Text style={[styles.chipText, !activeTag && !activeFavourites && styles.chipTextActive]}>All</Text>
            </Pressable>
            {hasFavourites && (
              <Pressable
                onPress={selectFavourites}
                style={[styles.chip, activeFavourites && styles.chipActive]}
                accessibilityRole="button"
                accessibilityLabel="Favourites"
                accessibilityState={{ selected: activeFavourites }}
              >
                <View style={styles.chipInner}>
                  <Ionicons name="bookmark" size={14} color={activeFavourites ? '#fff' : colors.accent} />
                  <Text style={[styles.chipText, activeFavourites && styles.chipTextActive]}>Favourites</Text>
                </View>
              </Pressable>
            )}
            {allTags.map((t) => (
              <Pressable
                key={t}
                onPress={() => selectTag(t)}
                style={[styles.chip, activeTag === t && styles.chipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: activeTag === t }}
              >
                <Text style={[styles.chipText, activeTag === t && styles.chipTextActive]}>{t}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={shown}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={type.small}>
            {recipes.length === 0 ? 'No recipes yet. Add your first one.' : 'No recipes match your search.'}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => setEditing(item)} accessibilityHint="Opens the recipe to edit">
            {item.photo ? <Image source={{ uri: item.photo }} style={styles.photo} /> : null}
            <View style={styles.titleRow}>
              <Text style={[type.heading, styles.title]}>{item.name}</Text>
              <Pressable
                onPress={() => toggleFavourite(item.id)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={item.favourite ? `Remove ${item.name} from favourites` : `Add ${item.name} to favourites`}
                accessibilityState={{ selected: !!item.favourite }}
              >
                <Ionicons name={item.favourite ? 'bookmark' : 'bookmark-outline'} size={26} color={item.favourite ? colors.accent : colors.inkSoft} />
              </Pressable>
            </View>
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

      {exploring && (
        <ExploreModal
          onClose={() => setExploring(false)}
          onUse={(borrowed) => {
            setExploring(false);
            setDraft(borrowed);
            setEditing(null);
          }}
        />
      )}

      {editing !== undefined && (
        <RecipeFormModal
          // A fresh form each time, so one recipe's fields never leak into the next.
          key={editing?.id ?? (draft ? `draft-${draft.name}` : 'new')}
          recipe={editing}
          draft={draft}
          onClose={() => {
            setEditing(undefined);
            setDraft(null);
          }}
          onSave={(input) => {
            if (editing) updateRecipe(editing.id, input);
            else addRecipe(input);
            setEditing(undefined);
            setDraft(null);
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
  actions: { flexDirection: 'row', gap: spacing.sm },
  search: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  searchInput: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: spacing.md, fontSize: 15 },
  chips: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm },
  chip: { paddingVertical: 6, paddingHorizontal: spacing.md, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipInner: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.ink },
  chipTextActive: { color: '#fff' },
  list: { padding: spacing.lg, paddingTop: 0, gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.line, gap: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1 },
  photo: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.sm, marginBottom: spacing.sm, backgroundColor: colors.line },
  tags: { fontSize: 13, color: colors.accent },
  link: { fontSize: 13, color: colors.accent, textDecorationLine: 'underline' },
});
