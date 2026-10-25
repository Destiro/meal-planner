import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { EditItemModal } from '../components/EditItemModal';
import { formatAmount } from '../ingredients';
import { addToPantry, pantryEntryFromText, pantryToText, sortPantry } from '../pantry';
import { newId, useStore } from '../store';
import { colors, radius, spacing, type } from '../theme';
import { PantryItem } from '../types';

/** What you already have at home. Anything here is taken off the shopping list. */
export default function PantryScreen() {
  const { pantry, updatePantry } = useStore();
  const [newItem, setNewItem] = useState('');
  const [editing, setEditing] = useState<PantryItem | null>(null);
  const items = useMemo(() => sortPantry(pantry), [pantry]);

  const add = () => {
    const entry = pantryEntryFromText(newItem);
    if (!entry) return;
    updatePantry((current) => addToPantry(current, entry, newId()));
    setNewItem('');
  };

  const clearPantry = () =>
    Alert.alert(
      'Clear your pantry?',
      `This removes all ${items.length} ${items.length === 1 ? 'item' : 'items'}. Anything on your shopping list that your pantry was covering will appear on the list again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear pantry', style: 'destructive', onPress: () => updatePantry(() => []) },
      ],
    );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={type.title}>Pantry</Text>
        <Text style={type.small}>What you already have. It comes off your shopping list.</Text>
      </View>

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          value={newItem}
          onChangeText={setNewItem}
          placeholder="e.g. 500 g rice, 6 eggs, or just salt"
          returnKeyType="done"
          onSubmitEditing={add}
        />
        <Button label="Add" onPress={add} disabled={!newItem.trim()} />
      </View>

      {items.length > 0 && (
        <View style={styles.clearRow}>
          <Button label="Clear pantry" variant="quiet" onPress={clearPantry} />
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={type.small}>
            Nothing here yet. Add things you have, with an amount if you like. Items with no amount, like salt, are
            treated as always in stock.
          </Text>
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => setEditing(item)}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${item.name}`}
          >
            <Text style={[type.body, { flex: 1 }]}>{item.name}</Text>
            <Text style={type.small}>
              {item.quantity === undefined ? 'Always have' : formatAmount(item.quantity, item.unit) || '1'}
            </Text>
            <Ionicons name="create-outline" size={20} color={colors.inkSoft} />
          </Pressable>
        )}
      />

      {editing && (
        <EditItemModal
          key={editing.id}
          title="Edit pantry item"
          initialText={pantryToText(editing)}
          placeholder="e.g. 500 g rice"
          hint="Leave out the amount for things you always have, like salt."
          isValid={(text) => pantryEntryFromText(text) !== null}
          removeLabel="Remove from pantry"
          onClose={() => setEditing(null)}
          onSave={(text) => {
            const entry = pantryEntryFromText(text);
            if (entry) {
              updatePantry((current) => current.map((p) => (p.id === editing.id ? { id: p.id, ...entry } : p)));
            }
            setEditing(null);
          }}
          onRemove={() => {
            updatePantry((current) => current.filter((p) => p.id !== editing.id));
            setEditing(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.lg, gap: spacing.xs },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  input: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: spacing.md, fontSize: 15 },
  clearRow: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  list: { padding: spacing.lg, paddingTop: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line },
});
