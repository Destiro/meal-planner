import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addSlot, moveSlot, removeSlot, renameSlot, SNACK_LABEL } from '../slots';
import { useStore } from '../store';
import { colors, radius, spacing, type } from '../theme';
import { MealSlot } from '../types';
import { Button } from './Button';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** Lets you choose which meals appear each day: rename, reorder, remove, or add one such as Snack. */
export function MealSlotsModal({ visible, onClose }: Props) {
  const { settings, setMealSlots } = useStore();
  const slots = settings.mealSlots;
  const [newLabel, setNewLabel] = useState('');
  const hasSnack = slots.some((s) => s.label.toLowerCase() === SNACK_LABEL.toLowerCase());

  const add = (label: string) => {
    setMealSlots(addSlot(slots, label));
    setNewLabel('');
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={type.title}>Meals each day</Text>
          <Text style={type.small}>
            Rename, reorder or remove the meals you plan. Meals already planned in a removed slot are hidden and left
            out of the shopping list.
          </Text>

          {slots.map((slot, i) => (
            <SlotRow
              key={slot.id}
              slot={slot}
              canRemove={slots.length > 1}
              canMoveUp={i > 0}
              canMoveDown={i < slots.length - 1}
              onRename={(label) => setMealSlots(renameSlot(slots, slot.id, label))}
              onMove={(dir) => setMealSlots(moveSlot(slots, slot.id, dir))}
              onRemove={() => setMealSlots(removeSlot(slots, slot.id))}
            />
          ))}

          <Text style={styles.label}>Add a meal</Text>
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={newLabel}
              onChangeText={setNewLabel}
              placeholder="e.g. Dessert"
              onSubmitEditing={() => add(newLabel)}
              returnKeyType="done"
            />
            <Button label="Add" onPress={() => add(newLabel)} disabled={!newLabel.trim()} />
          </View>
          {!hasSnack && <Button label={`Add ${SNACK_LABEL}`} variant="quiet" onPress={() => add(SNACK_LABEL)} />}

          <Button label="Done" onPress={onClose} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

interface RowProps {
  slot: MealSlot;
  canRemove: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onRename: (label: string) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}

function SlotRow({ slot, canRemove, canMoveUp, canMoveDown, onRename, onMove, onRemove }: RowProps) {
  // Edited locally and saved when you finish, so an empty box while typing never becomes the name.
  const [draft, setDraft] = useState(slot.label);
  const commit = () => {
    onRename(draft);
    setDraft(slot.label);
  };

  return (
    <View style={styles.row}>
      <TextInput
        style={[styles.input, { flex: 1 }]}
        value={draft}
        onChangeText={setDraft}
        onEndEditing={commit}
        accessibilityLabel={`Name of ${slot.label}`}
      />
      <IconButton name="chevron-up" label={`Move ${slot.label} up`} disabled={!canMoveUp} onPress={() => onMove(-1)} />
      <IconButton name="chevron-down" label={`Move ${slot.label} down`} disabled={!canMoveDown} onPress={() => onMove(1)} />
      <IconButton name="trash-outline" label={`Remove ${slot.label}`} disabled={!canRemove} onPress={onRemove} danger />
    </View>
  );
}

function IconButton({
  name,
  label,
  disabled,
  onPress,
  danger,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  disabled: boolean;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.icon, disabled && { opacity: 0.3 }]}
    >
      <Ionicons name={name} size={22} color={danger ? colors.danger : colors.accent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { fontSize: 13, color: colors.inkSoft, marginTop: spacing.md },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: spacing.md, fontSize: 15 },
  icon: { padding: spacing.xs },
});
