import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { randomOnline, searchOnline } from '../api';
import { creditFor, ExploreRecipe, ingredientLine, toRecipeInput } from '../explore';
import { RecipeInput } from '../store';
import { colors, radius, spacing, type } from '../theme';
import { Button } from './Button';

interface Props {
  /** Called with a starting point for the Add Recipe form when you choose "Make this mine". */
  onUse: (draft: RecipeInput) => void;
  onClose: () => void;
}

const SPOONACULAR = 'https://spoonacular.com/food-api';

const openLink = (url: string | undefined) => url && Linking.openURL(url).catch(() => {});

const meta = (r: ExploreRecipe) =>
  [r.readyInMinutes ? `${r.readyInMinutes} min` : null, r.servings ? `serves ${r.servings}` : null]
    .filter(Boolean)
    .join(' · ');

/** Browse recipes from the online service. Mount it to open. */
export function ExploreModal({ onUse, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [recipes, setRecipes] = useState<ExploreRecipe[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ExploreRecipe | null>(null);
  // Only the latest request may update the screen, so a slow earlier one can't overwrite newer results.
  const latest = useRef(0);

  const run = async (load: () => Promise<ExploreRecipe[]>) => {
    const id = ++latest.current;
    setLoading(true);
    setError(null);
    try {
      const result = await load();
      if (id === latest.current) setRecipes(result);
    } catch (e) {
      if (id === latest.current) setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      if (id === latest.current) setLoading(false);
    }
  };

  const search = () => query.trim() && run(() => searchOnline(query));
  const inspire = () => run(() => randomOnline());

  return (
    <Modal visible animationType="slide" onRequestClose={selected ? () => setSelected(null) : onClose}>
      <SafeAreaView style={styles.screen}>
        {selected ? (
          <Detail
            recipe={selected}
            onBack={() => setSelected(null)}
            onUse={() => onUse(toRecipeInput(selected))}
          />
        ) : (
          <View style={styles.flex}>
            <View style={styles.header}>
              <Text style={type.title}>Explore</Text>
              <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
                <Text style={styles.link}>Close</Text>
              </Pressable>
            </View>

            <View style={styles.searchRow}>
              <TextInput
                style={styles.input}
                value={query}
                onChangeText={setQuery}
                placeholder="Search recipes, e.g. lentil soup"
                returnKeyType="search"
                autoCorrect={false}
                onSubmitEditing={search}
                accessibilityLabel="Search online recipes"
              />
              <Button label="Search" onPress={search} disabled={!query.trim() || loading} />
            </View>
            <View style={styles.inspire}>
              <Button label="Inspire me" variant="quiet" onPress={inspire} disabled={loading} />
            </View>

            {loading && <ActivityIndicator color={colors.accent} style={{ margin: spacing.lg }} />}
            {error && <Text style={styles.error}>{error}</Text>}

            <FlatList
              data={recipes ?? []}
              keyExtractor={(r) => String(r.id)}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
              ListEmptyComponent={
                loading || error ? undefined : (
                  <Text style={type.small}>
                    {recipes
                      ? 'No recipes found. Try a simpler search.'
                      : 'Search for a recipe, or tap Inspire me for ideas.'}
                  </Text>
                )
              }
              ListFooterComponent={
                <View style={styles.footer}>
                  <Pressable onPress={() => openLink(SPOONACULAR)} hitSlop={8}>
                    <Text style={styles.credit}>Recipes from spoonacular</Text>
                  </Pressable>
                  <Text style={styles.disclaimer}>
                    Recipe details come from other websites and may be inaccurate. Always check ingredients for
                    allergies.
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <Pressable style={styles.card} onPress={() => setSelected(item)} accessibilityRole="button">
                  {item.image ? <Image source={{ uri: item.image }} style={styles.thumb} /> : null}
                  <Text style={type.heading}>{item.title}</Text>
                  {!!meta(item) && <Text style={type.small}>{meta(item)}</Text>}
                  {item.diets.length > 0 && <Text style={styles.tags}>{item.diets.join(' · ')}</Text>}
                </Pressable>
              )}
            />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function Detail({ recipe, onBack, onUse }: { recipe: ExploreRecipe; onBack: () => void; onUse: () => void }) {
  const credit = creditFor(recipe);
  return (
    <ScrollView contentContainerStyle={styles.detail}>
      <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back to results">
        <Text style={styles.link}>‹ Back</Text>
      </Pressable>

      {recipe.image ? <Image source={{ uri: recipe.image }} style={styles.hero} /> : null}
      <Text style={type.title}>{recipe.title}</Text>
      {!!meta(recipe) && <Text style={type.small}>{meta(recipe)}</Text>}
      <Pressable onPress={() => openLink(credit.url)} disabled={!credit.url} hitSlop={8}>
        <Text style={[type.small, credit.url && styles.credit]}>Recipe from {credit.label}</Text>
      </Pressable>

      <Button label="Make this mine" onPress={onUse} />
      <Text style={type.small}>Opens the recipe form so you can change it before saving.</Text>

      <Text style={type.heading}>Ingredients</Text>
      {recipe.ingredients.length === 0 && <Text style={type.small}>No ingredients listed.</Text>}
      {recipe.ingredients.map((ingredient, i) => (
        <Text key={i} style={type.body}>
          • {ingredientLine(ingredient)}
        </Text>
      ))}

      <Text style={type.heading}>Method</Text>
      {recipe.steps.length === 0 && <Text style={type.small}>No steps listed.</Text>}
      {recipe.steps.map((step, i) => (
        <Text key={i} style={type.body}>
          {i + 1}. {step}
        </Text>
      ))}

      <Pressable onPress={() => openLink(SPOONACULAR)} hitSlop={8}>
        <Text style={styles.credit}>Recipes from spoonacular</Text>
      </Pressable>
      <Text style={styles.disclaimer}>
        Recipe details come from other websites and may be inaccurate. Always check ingredients for allergies.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  link: { fontSize: 16, fontWeight: '600', color: colors.accent },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  input: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: spacing.md, fontSize: 15 },
  inspire: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  error: { color: colors.danger, fontSize: 15, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  list: { padding: spacing.lg, paddingTop: 0 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.line, gap: spacing.xs },
  thumb: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.sm, marginBottom: spacing.sm, backgroundColor: colors.line },
  tags: { fontSize: 13, color: colors.accent },
  footer: { paddingTop: spacing.lg, gap: spacing.sm, alignItems: 'center' },
  credit: { fontSize: 13, color: colors.accent, textDecorationLine: 'underline' },
  disclaimer: { fontSize: 12, color: colors.inkSoft, textAlign: 'center' },
  detail: { padding: spacing.lg, gap: spacing.md },
  hero: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: colors.line },
});
