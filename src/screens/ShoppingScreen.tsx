import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, SectionList, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { EditItemModal } from '../components/EditItemModal';
import { addDays, formatRange, startOfWeek, toKey } from '../dates';
import { addToPantry } from '../pantry';
import { canDecrease, formatQuantityLabel, nextQuantity } from '../quantity';
import { AisleSection, formatShoppingText, groupByAisle } from '../shopping';
import {
  applyShoppingActions,
  clearWeek,
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

  const clearList = () =>
    Alert.alert(
      'Clear this list?',
      `This removes all ${rows.length} ${rows.length === 1 ? 'item' : 'items'} from ${label.toLowerCase()}, ${formatRange(weekStart)}. ` +
        'Items from your recipes can be brought back with "Restore removed items". Items you added yourself cannot.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear list', style: 'destructive', onPress: () => updateShoppingEdits((edits) => clearWeek(edits, weekKey, rows)) },
      ],
    );

  const addItem = () => {
    if (!entryFromText(newItem)) return;
    // Adding something already on the list raises its amount instead of repeating the line.
    updateShoppingEdits(
      (edits) => applyShoppingActions(edits, weekKey, rows, [{ action: 'add', text: newItem }], newId).edits,
    );
    setNewItem('');
  };

  const header = (
    <View>
      <View style={styles.household}>
        <View style={styles.householdText}>
          <Text style={type.body}>Cooking for</Text>
          <Text style={type.small}>Scales recipe amounts to this many people</Text>
        </View>
        <View style={styles.stepper}>
          <Pressable
            onPress={() => setHousehold(settings.household - 1)}
            hitSlop={8}
            accessibilityLabel="Fewer people"
            style={styles.stepButton}
          >
            <Text style={styles.stepText}>−</Text>
          </Pressable>
          <View style={styles.people} accessibilityLabel={`${settings.household} ${settings.household === 1 ? 'person' : 'people'}`}>
            <Text style={type.heading}>{settings.household}</Text>
            <Text style={type.small}>{settings.household === 1 ? 'person' : 'people'}</Text>
          </View>
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
          <Button label="Clear list" variant="quiet" onPress={clearList} />
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
          // Changes the quantity on the spot. For a planned item this is remembered as your own amount.
          const change = (direction: 1 | -1) =>
            updateShoppingEdits((edits) =>
              editRow(edits, weekKey, row, {
                name: row.name,
                quantity: nextQuantity(row.quantity, row.unit, direction),
                unit: row.unit,
              }),
            );
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
              </Pressable>
              <View style={styles.quantity}>
                <Pressable
                  onPress={() => change(-1)}
                  disabled={!canDecrease(row.quantity, row.unit)}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`Less ${row.name}`}
                  style={[styles.qtyButton, !canDecrease(row.quantity, row.unit) && { opacity: 0.35 }]}
                >
                  <Text style={styles.qtyButtonText}>−</Text>
                </Pressable>
                <Text style={styles.qtyLabel} accessibilityLabel={`${formatQuantityLabel(row.quantity, row.unit)} of ${row.name}`}>
                  {formatQuantityLabel(row.quantity, row.unit)}
                </Text>
                <Pressable
                  onPress={() => change(1)}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`More ${row.name}`}
                  style={styles.qtyButton}
                >
                  <Text style={styles.qtyButtonText}>+</Text>
                </Pressable>
              </View>
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
  householdText: { flex: 1, paddingRight: spacing.md },
  people: { minWidth: 48, alignItems: 'center' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.md },
  addInput: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: spacing.md, fontSize: 15 },
  shareRow: { paddingBottom: spacing.md, gap: spacing.sm },
  aisle: { fontSize: 13, fontWeight: '700', color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.5, paddingTop: spacing.md },
  list: { padding: spacing.lg, paddingTop: 0 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  quantity: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  qtyButton: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  qtyButtonText: { fontSize: 18, color: colors.accent, fontWeight: '600', lineHeight: 22 },
  qtyLabel: { minWidth: 44, textAlign: 'center', fontSize: 14, fontWeight: '600', color: colors.ink },
  edit: { paddingVertical: spacing.md, paddingHorizontal: spacing.sm },
  restore: { alignItems: 'center', paddingTop: spacing.lg },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.accent },
  boxDone: { backgroundColor: colors.accent },
  struck: { textDecorationLine: 'line-through', color: colors.inkSoft },
});
