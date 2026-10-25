import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing, type } from '../theme';
import { Button } from './Button';

interface Props {
  title: string;
  /** What the text box starts with. */
  initialText: string;
  placeholder: string;
  hint: string;
  /** Save is only offered when this is true for the current text. */
  isValid: (text: string) => boolean;
  removeLabel: string;
  onSave: (text: string) => void;
  onRemove: () => void;
  /** Offered when the item has been changed from a default it can go back to. */
  resetLabel?: string;
  onReset?: () => void;
  onClose: () => void;
}

/** Edit one list line as text, e.g. "2 kg rice". Mount it when it should open. */
export function EditItemModal({
  title,
  initialText,
  placeholder,
  hint,
  isValid,
  removeLabel,
  onSave,
  onRemove,
  resetLabel,
  onReset,
  onClose,
}: Props) {
  const [text, setText] = useState(initialText);
  const valid = isValid(text);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <Text style={type.heading}>{title}</Text>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            autoFocus
            selectTextOnFocus
            placeholder={placeholder}
            returnKeyType="done"
            onSubmitEditing={() => valid && onSave(text)}
          />
          <Text style={type.small}>{hint}</Text>
          <View style={{ gap: spacing.sm }}>
            <Button label="Save" onPress={() => onSave(text)} disabled={!valid} />
            {onReset && resetLabel && <Button label={resetLabel} variant="quiet" onPress={onReset} />}
            <Button label="Cancel" variant="quiet" onPress={onClose} />
            <Pressable onPress={onRemove} style={styles.remove} accessibilityRole="button">
              <Text style={styles.removeText}>{removeLabel}</Text>
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
