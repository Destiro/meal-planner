import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, SectionList, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { EditItemModal } from '../components/EditItemModal';
import { addDays, formatRange, startOfWeek, toKey } from '../dates';
import { addToPantry } from '../pantry';
import { AisleSection, formatItemAmount, formatShoppingText, groupByAisle } from '../shopping';
import {
  addExtra,
  editRow,
  EMPTY_WEEK,
  entryFromText,
  entryToText,
  ListRow,
  removedCount,
  removeRow,
  resetRow,
  restoreRemoved,
  setChecked,
} from '../shoppingEdits';
import { shoppingRows } from '../shoppingList';
import { newId, useStore } from '../store';
import { colors, radius, spacing, type } from '../theme';

/** Builds a shopping list from the planned meals of a chosen week, which you can then edit by hand. */
export default function ShoppingScreen() {
  const { recipes, plan, settings, shoppingEdits, updateShoppingEdits, pantry, updatePantry, setHousehold, setGroupByAisle } =
    useStore();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [newItem, setNewItem] = useState('');
  const [editing, setEditing] = useState<ListRow | null>(null);

  const thisWeekKey = toKey(startOfWeek(new Date()));
  const weekKey = toKey(weekStart);
  const label =
    weekKey === thisWeekKey ? 'This week' : weekKey === toKey(addDays(startOfWeek(new Date()), 7)) ? 'Next week' : 'Week of';

  // What the meals need, minus what you already have, with your hand edits applied on top.
  const { rows, needed, covered } = useMemo(
    () => shoppingRows({ recipes, plan, settings, pantry, edits: shoppingEdits }, weekKey, weekStart),
    [recipes, plan, settings, pantry, shoppingEdits, weekKey, weekStart],
  );
  const week = shoppingEdits[weekKey] ?? EMPTY_WEEK;
  const removed = removedCount(needed, week);

  const sections = useMemo<{ aisle: AisleSection['aisle'] | null; data: ListRow[] }[]>(
    () => (settings.groupByAisle ? groupByAisle(rows) : [{ aisle: null, data: rows }]),
    [rows, settings.groupByAisle],
  );

  // Shares what's still left to buy, so ticked-off items don't get sent along.
  const remaining = rows.filter((row) => !week.checked[row.key]);
  const share = () =>
    Share.share({ message: formatShoppingText(remaining, `Shopping list, ${formatRange(weekStart)}`) }).catch(() => {});

  // Bought items go into the pantry, which takes them off the list. Their ticks are cleared so they
  // do not come back ticked if the pantry amount later drops.
  const tickedPlanned = rows.filter((row) => row.kind === 'planned' && week.checked[row.key]);
  const moveToPantry = () => {
    updatePantry((current) =>
      tickedPlanned.reduce(
        (acc, row) => addToPantry(acc, { name: row.name, quantity: row.quantity, unit: row.unit }, newId()),
        current,
      ),
    );
    updateShoppingEdits((edits) => tickedPlanned.reduce((acc, row) => setChecked(acc, weekKey, row.key, false), edits));
  };

  const addItem = () => {
    const entry = entryFromText(newItem);
    if (!entry) return;
    updateShoppingEdits((edits) => addExtra(edits, weekKey, entry, newId()));
    setNewItem('');
  };

  const header = (
    <View>
      <View style={styles.household}>
        <Text style={type.body}>Cooking for</Text>
        <View style={styles.stepper}>
          <Pressable
            onPress={() => setHousehold(settings.household - 1)}
            hitSlop={8}
            accessibilityLabel="Fewer people"
            style={styles.stepButton}
          >
            <Text style={styles.stepText}>−</Text>
          </Pressable>
          <Text style={[type.heading, styles.people]} accessibilityLabel={`${settings.household} people`}>
            {settings.household}
          </Text>
          <Pressable
            onPress={() => setHousehold(settings.household + 1)}
            hitSlop={8}
            accessibilityLabel="More people"
            style={styles.stepButton}
          >
            <Text style={styles.stepText}>+</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.household}>
        <Text style={type.body}>Group by aisle</Text>
        <Switch
          value={settings.groupByAisle}
          onValueChange={setGroupByAisle}
          trackColor={{ true: colors.accent }}
          accessibilityLabel="Group by aisle"
        />
      </View>

      <View style={styles.addRow}>
        <TextInput
          style={styles.addInput}
          value={newItem}
          onChangeText={setNewItem}
          placeholder="Add an item, e.g. 2 bin bags"
          returnKeyType="done"
          onSubmitEditing={addItem}
        />
        <Button label="Add" onPress={addItem} disabled={!newItem.trim()} />
      </View>

      {rows.length > 0 && (
        <View style={styles.shareRow}>
          <Button label="Share list" variant="quiet" onPress={share} disabled={remaining.length === 0} />
          {tickedPlanned.length > 0 && (
            <Button label={`Move ${tickedPlanned.length} ticked to pantry`} variant="quiet" onPress={moveToPantry} />
          )}
          {covered > 0 && (
            <Text style={type.small}>
              Your pantry covers {covered} {covered === 1 ? 'item' : 'items'}.
            </Text>
          )}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => setWeekStart(addDays(weekStart, -7))}
          hitSlop={12}
          accessibilityLabel="Previous week"
        >
          <Text style={styles.arrow}>‹</Text>
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={type.title}>Shopping list</Text>
          <Text style={type.small}>
            {label}, {formatRange(weekStart)}
          </Text>
        </View>
        <Pressable onPress={() => setWeekStart(addDays(weekStart, 7))} hitSlop={12} accessibilityLabel="Next week">
          <Text style={styles.arrow}>›</Text>
        </Pressable>
      </View>
      {weekKey !== thisWeekKey && (
        <Pressable onPress={() => setWeekStart(startOfWeek(new Date()))} hitSlop={8} style={styles.thisWeek}>
          <Text style={styles.thisWeekText}>Back to this week</Text>
        </Pressable>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(row) => row.key}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={header}
        renderSectionHeader={({ section }) =>
          section.aisle ? <Text style={styles.aisle}>{section.aisle}</Text> : null
        }
        ListEmptyComponent={
          <Text style={type.small}>Plan some meals and their ingredients will show up here, or add your own items.</Text>
        }
        ListFooterComponent={
          removed > 0 ? (
            <Pressable
              onPress={() => updateShoppingEdits((edits) => restoreRemoved(edits, weekKey))}
              hitSlop={8}
              style={styles.restore}
            >
              <Text style={styles.thisWeekText}>
                Restore {removed} removed {removed === 1 ? 'item' : 'items'}
              </Text>
            </Pressable>
          ) : undefined
        }
        SectionSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item: row }) => {
          const done = !!week.checked[row.key];
          const amount = formatItemAmount(row);
          return (
            <View style={styles.row}>
              <Pressable
                style={styles.rowMain}
                onPress={() => updateShoppingEdits((edits) => setChecked(edits, weekKey, row.key, !done))}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: done }}
              >
                <View style={[styles.box, done && styles.boxDone]} />
                <Text style={[type.body, { flex: 1 }, done && styles.struck]}>{row.name}</Text>
                {!!amount && <Text style={type.small}>{amount}</Text>}
              </Pressable>
              <Pressable
                onPress={() => setEditing(row)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${row.name}`}
                style={styles.edit}
              >
                <Ionicons name="create-outline" size={20} color={row.edited ? colors.accent : colors.inkSoft} />
              </Pressable>
            </View>
          );
        }}
      />

      {editing && (
        <EditItemModal
          // The row can be edited again straight after, so start each open from its current state.
          key={editing.key}
          title="Edit item"
          initialText={entryToText(editing)}
          placeholder="e.g. 2 kg rice"
          hint="Start with an amount if you like: 500 g flour, 3 eggs."
          isValid={(text) => entryFromText(text) !== null}
          removeLabel={editing.kind === 'extra' ? 'Delete item' : 'Remove from this list'}
          resetLabel="Reset to what the recipes need"
          onClose={() => setEditing(null)}
          onSave={(text) => {
            const entry = entryFromText(text);
            if (entry) updateShoppingEdits((edits) => editRow(edits, weekKey, editing, entry));
            setEditing(null);
          }}
          onRemove={() => {
            updateShoppingEdits((edits) => removeRow(edits, weekKey, editing));
            setEditing(null);
          }}
          onReset={
            editing.kind === 'planned' && editing.edited
              ? () => {
                  updateShoppingEdits((edits) => resetRow(edits, weekKey, editing.key));
                  setEditing(null);
                }
              : undefined
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  arrow: { fontSize: 36, color: colors.accent, paddingHorizontal: spacing.md },
  thisWeek: { alignSelf: 'center', paddingBottom: spacing.md },
  thisWeekText: { fontSize: 14, fontWeight: '600', color: colors.accent },
  household: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.md },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 22, color: colors.accent, fontWeight: '600', lineHeight: 26 },
  people: { minWidth: 24, textAlign: 'center' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.md },
  addInput: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: spacing.md, fontSize: 15 },
  shareRow: { paddingBottom: spacing.md, gap: spacing.sm },
  aisle: { fontSize: 13, fontWeight: '700', color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.5, paddingTop: spacing.md },
  list: { padding: spacing.lg, paddingTop: 0 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  edit: { padding: spacing.md },
  restore: { alignItems: 'center', paddingTop: spacing.lg },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.accent },
  boxDone: { backgroundColor: colors.accent },
  struck: { textDecorationLine: 'line-through', color: colors.inkSoft },
});
