import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { searchOnline } from '../api';
import { colors, radius, spacing, type } from '../theme';
import { Button } from './Button';

interface Props {
  /** What to look for, usually the recipe's name. */
  query: string;
  onPick: (imageUrl: string) => void;
  onClose: () => void;
}

/** Shows photos of similar recipes from the online service so you can borrow one. Mount it to open. */
export function PhotoFinderModal({ query, onPick, onClose }: Props) {
  const [photos, setPhotos] = useState<{ id: number; title: string; url: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    searchOnline(query, 8)
      .then((recipes) => {
        if (cancelled) return;
        setPhotos(recipes.flatMap((r) => (r.image ? [{ id: r.id, title: r.title, url: r.image }] : [])));
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [query]);

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
          <Text style={type.title}>Find a photo</Text>
          <Text style={type.small}>Photos of recipes matching “{query}”. Tap one to use it.</Text>

          {!photos && !error && <ActivityIndicator color={colors.accent} style={{ margin: spacing.xl }} />}
          {error && <Text style={styles.error}>{error}</Text>}
          {photos && photos.length === 0 && <Text style={type.small}>No photos found for that name.</Text>}

          <View style={styles.grid}>
            {photos?.map((photo) => (
              <Pressable
                key={photo.id}
                style={styles.cell}
                onPress={() => onPick(photo.url)}
                accessibilityRole="button"
                accessibilityLabel={`Use the photo of ${photo.title}`}
              >
                <Image source={{ uri: photo.url }} style={styles.image} />
                <Text style={type.small} numberOfLines={2}>
                  {photo.title}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable onPress={() => Linking.openURL('https://spoonacular.com/food-api').catch(() => {})} hitSlop={8}>
            <Text style={styles.credit}>Photos from spoonacular</Text>
          </Pressable>
          <Button label="Cancel" variant="quiet" onPress={onClose} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  error: { fontSize: 15, color: colors.danger },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  cell: { width: '47%', gap: spacing.xs },
  image: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.sm, backgroundColor: colors.line },
  credit: { fontSize: 13, color: colors.accent, textDecorationLine: 'underline', textAlign: 'center' },
});
