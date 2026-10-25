import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { entryFromText, entryToText, ListRow } from '../shoppingEdits';
import { colors, radius, spacing, type } from '../theme';
import { ListEntry } from '../types';
import { Button } from './Button';

interface Props {
  row: ListRow;
  onSave: (entry: ListEntry) => void;
  onRemove: () => void;
  /** Only offered for planned items that have been changed. */
  onReset?: () => void;
  onClose: () => void;
}

/** Edit one shopping list line as text, e.g. "2 kg rice". Mount it when it should open. */
export function EditItemModal({ row, onSave, onRemove, onReset, onClose }: Props) {
  const [text, setText] = useState(entryToText(row));
  const entry = entryFromText(text);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <Text style={type.heading}>Edit item</Text>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            autoFocus
            selectTextOnFocus
            placeholder="e.g. 2 kg rice"
            returnKeyType="done"
            onSubmitEditing={() => entry && onSave(entry)}
          />
          <Text style={type.small}>Start with an amount if you like: 500 g flour, 3 eggs.</Text>
          <View style={{ gap: spacing.sm }}>
            <Button label="Save" onPress={() => entry && onSave(entry)} disabled={!entry} />
            {onReset && <Button label="Reset to what the recipes need" variant="quiet" onPress={onReset} />}
            <Button label="Cancel" variant="quiet" onPress={onClose} />
            <Pressable onPress={onRemove} style={styles.remove} accessibilityRole="button">
              <Text style={styles.removeText}>{row.kind === 'extra' ? 'Delete item' : 'Remove from this list'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: spacing.lg },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, gap: spacing.md },
  input: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: spacing.md, fontSize: 15 },
  remove: { alignItems: 'center', padding: spacing.md },
  removeText: { fontSize: 15, fontWeight: '600', color: colors.danger },
});
