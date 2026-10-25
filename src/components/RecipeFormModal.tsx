import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatIngredient, parseIngredient } from '../ingredients';
import { DEFAULT_SERVINGS } from '../migrate';
import { deletePhoto, savePhoto } from '../photos';
import { normalizeUrl, parseTags } from '../recipeFields';
import { RecipeInput } from '../store';
import { colors, radius, spacing, type } from '../theme';
import { Recipe } from '../types';
import { Button } from './Button';

interface Props {
  /** The recipe being edited, or null to create a new one. */
  recipe: Recipe | null;
  onSave: (recipe: RecipeInput) => void;
  onDelete?: () => void;
  onClose: () => void;
}

/** Mount it when the form should open: its fields start from `recipe` each time. */
export function RecipeFormModal({ recipe, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(recipe?.name ?? '');
  const [servings, setServings] = useState(String(recipe?.servings ?? DEFAULT_SERVINGS));
  const [ingredients, setIngredients] = useState(recipe?.ingredients.map(formatIngredient).join('\n') ?? '');
  const [notes, setNotes] = useState(recipe?.notes ?? '');
  const [link, setLink] = useState(recipe?.sourceUrl ?? '');
  const [tags, setTags] = useState(recipe?.tags?.join(', ') ?? '');
  const [photo, setPhoto] = useState(recipe?.photo);

  const linkInvalid = link.trim() !== '' && !normalizeUrl(link);

  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
      if (!result.canceled) setPhoto(result.assets[0].uri);
    } catch (e) {
      console.warn('Could not pick photo', e);
      Alert.alert('Could not open your photos');
    }
  };

  const save = () => {
    let savedPhoto = photo;
    if (photo !== recipe?.photo) {
      // Only copy it into app storage when it is a new pick, and tidy up the one it replaces.
      try {
        savedPhoto = photo ? savePhoto(photo) : undefined;
        deletePhoto(recipe?.photo);
      } catch (e) {
        console.warn('Could not save photo', e);
        Alert.alert('Could not save the photo', 'The recipe will be saved without it.');
        savedPhoto = recipe?.photo;
      }
    }
    onSave({
      name: name.trim(),
      servings: Math.max(1, Math.round(Number(servings)) || DEFAULT_SERVINGS),
      ingredients: ingredients
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .map(parseIngredient),
      notes: notes.trim() || undefined,
      sourceUrl: normalizeUrl(link),
      tags: parseTags(tags),
      photo: savedPhoto,
    });
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={type.title}>{recipe ? 'Edit recipe' : 'New recipe'}</Text>

          <Text style={styles.label}>Photo</Text>
          {photo ? <Image source={{ uri: photo }} style={styles.photo} accessibilityLabel="Recipe photo" /> : null}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Button label={photo ? 'Change photo' : 'Add photo'} variant="quiet" onPress={pickPhoto} />
            </View>
            {photo ? (
              <View style={{ flex: 1 }}>
                <Button label="Remove photo" variant="quiet" onPress={() => setPhoto(undefined)} />
              </View>
            ) : null}
          </View>

          <Text style={styles.label}>Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Lentil soup" />

          <Text style={styles.label}>Serves (people)</Text>
          <TextInput style={styles.input} value={servings} onChangeText={setServings} keyboardType="number-pad" />

          <Text style={styles.label}>Ingredients (one per line, e.g. 200g rice or 2 eggs)</Text>
          <TextInput
            style={[styles.input, { height: 160, textAlignVertical: 'top' }]}
            value={ingredients}
            onChangeText={setIngredients}
            multiline
            placeholder={'red lentils\ncarrots\nonion'}
          />

          <Text style={styles.label}>Method / notes</Text>
          <TextInput
            style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="Steps, tips, what to serve it with"
          />

          <Text style={styles.label}>Source link</Text>
          <TextInput
            style={[styles.input, linkInvalid && styles.inputError]}
            value={link}
            onChangeText={setLink}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="https://"
          />
          {linkInvalid && <Text style={styles.error}>That doesn’t look like a web link.</Text>}

          <Text style={styles.label}>Tags (comma separated)</Text>
          <TextInput
            style={styles.input}
            value={tags}
            onChangeText={setTags}
            autoCapitalize="none"
            placeholder="quick, vegetarian"
          />

          <View style={{ gap: spacing.sm }}>
            <Button label="Save recipe" onPress={save} disabled={!name.trim() || linkInvalid} />
            <Button label="Cancel" variant="quiet" onPress={onClose} />
            {onDelete && (
              <Pressable onPress={onDelete} style={styles.delete} accessibilityRole="button">
                <Text style={styles.deleteText}>Delete recipe</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  form: { padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  label: { fontSize: 13, color: colors.inkSoft },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: spacing.md, fontSize: 15 },
  inputError: { borderColor: colors.danger },
  error: { fontSize: 13, color: colors.danger },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: colors.line },
  delete: { alignItems: 'center', padding: spacing.md },
  deleteText: { fontSize: 15, fontWeight: '600', color: colors.danger },
});
