import React, { useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { useStore } from '../store';
import { colors, radius, spacing, type } from '../theme';

export default function RecipesScreen() {
  const { recipes, addRecipe, deleteRecipe } = useStore();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState('');

  const close = () => {
    setAdding(false);
    setName('');
    setIngredients('');
  };

  const save = () => {
    const list = ingredients.split('\n').map((s) => s.trim()).filter(Boolean);
    addRecipe(name.trim(), list);
    close();
  };

  const confirmDelete = (id: string, title: string) =>
    Alert.alert(`Delete "${title}"?`, 'It will also be removed from your meal plan.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteRecipe(id) },
    ]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={type.title}>Recipes</Text>
        <Button label="Add recipe" onPress={() => setAdding(true)} />
      </View>

      <FlatList
        data={recipes}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={type.small}>No recipes yet. Add your first one.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onLongPress={() => confirmDelete(item.id, item.name)}>
            <Text style={type.heading}>{item.name}</Text>
            <Text style={type.small}>{item.ingredients.join(', ') || 'No ingredients listed'}</Text>
          </Pressable>
        )}
      />
      {recipes.length > 0 && <Text style={styles.hint}>Press and hold a recipe to delete it</Text>}

      <Modal visible={adding} animationType="slide" onRequestClose={close}>
        <SafeAreaView style={styles.screen}>
          <View style={styles.form}>
            <Text style={type.title}>New recipe</Text>
            <Text style={styles.label}>Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Lentil soup" />
            <Text style={styles.label}>Ingredients (one per line)</Text>
            <TextInput
              style={[styles.input, { height: 160, textAlignVertical: 'top' }]}
              value={ingredients}
              onChangeText={setIngredients}
              multiline
              placeholder={'red lentils\ncarrots\nonion'}
            />
            <View style={{ gap: spacing.sm }}>
              <Button label="Save recipe" onPress={save} disabled={!name.trim()} />
              <Button label="Cancel" variant="quiet" onPress={close} />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  list: { padding: spacing.lg, paddingTop: 0, gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.line, gap: spacing.xs },
  hint: { textAlign: 'center', color: colors.inkSoft, fontSize: 12, paddingVertical: spacing.sm },
  form: { padding: spacing.lg, gap: spacing.md },
  label: { fontSize: 13, color: colors.inkSoft },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: spacing.md, fontSize: 15 },
});
