import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError, chatOnline } from '../api';
import { Button } from '../components/Button';
import { RecipeFormModal } from '../components/RecipeFormModal';
import { RecipePreviewModal } from '../components/RecipePreviewModal';
import { loadChat, saveChat, StoredMessage } from '../chatHistory';
import { PantryAction, parseReply, PlanEntry, planToMeals, Segment } from '../chatFormat';
import { formatDuration } from '../audio';
import { addDays, startOfWeek, toKey } from '../dates';
import { formatIngredient } from '../ingredients';
import { applyPantryActions, pantryToText } from '../pantry';
import { applyShoppingActions } from '../shoppingEdits';
import { shoppingRows } from '../shoppingList';
import { newId, RecipeInput, useStore } from '../store';
import { useVoiceInput } from '../useVoiceInput';
import { colors, radius, spacing, type } from '../theme';

const SUGGESTIONS = [
  'What can I make with what I have in my pantry?',
  'Plan my dinners for this week',
  'Suggest a quick vegetarian recipe',
];

/** A cooking assistant that knows your recipes and pantry, and can suggest recipes and meal plans. */
export default function ChatScreen() {
  const { recipes, plan, pantry, settings, shoppingEdits, addRecipe, setMeal, updatePantry, updateShoppingEdits } = useStore();
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<RecipeInput | null>(null);
  const [viewing, setViewing] = useState<RecipeInput | null>(null);
  const listRef = useRef<FlatList<StoredMessage>>(null);

  useEffect(() => {
    loadChat().then((saved) => {
      setMessages(saved);
      setLoaded(true);
    });
  }, []);

  // Save after every change, but only once the saved chat has been loaded so it is never overwritten.
  useEffect(() => {
    if (loaded) saveChat(messages);
  }, [loaded, messages]);

  const context = useMemo(
    () => ({
      pantry: pantry.map(pantryToText),
      recipes: recipes.map((r) => r.name),
      slots: settings.mealSlots.map((s) => s.label),
      household: settings.household,
    }),
    [pantry, recipes, settings.mealSlots, settings.household],
  );

  /** Sends `history` (which already ends with the person's message) and adds the assistant's reply. */
  const ask = async (history: StoredMessage[]) => {
    setSending(true);
    setError(null);
    try {
      const reply = await chatOnline(
        history.map(({ role, content }) => ({ role, content })),
        context,
      );
      setMessages([...history, { id: newId(), role: 'assistant', content: reply }]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
    } finally {
      setSending(false);
    }
  };

  const send = (text: string) => {
    const content = text.trim();
    if (!content || sending) return;
    const history: StoredMessage[] = [...messages, { id: newId(), role: 'user', content }];
    setMessages(history);
    setInput('');
    ask(history);
  };

  const newChat = () => {
    setMessages([]);
    setError(null);
  };

  // Talking sends straight away. The assistant only ever suggests changes, so a misheard word can't
  // alter anything until you tap a button on a card.
  const voice = useVoiceInput(send);

  const applyPantry = (actions: PantryAction[]) => {
    const result = applyPantryActions(pantry, actions, newId);
    updatePantry(() => result.pantry);
    const parts = [
      result.added ? `added ${result.added} ${result.added === 1 ? 'item' : 'items'}` : null,
      result.removed ? `removed ${result.removed} ${result.removed === 1 ? 'item' : 'items'}` : null,
    ].filter(Boolean);
    Alert.alert(parts.length ? 'Pantry updated' : 'Nothing changed', parts.length ? `You've ${parts.join(' and ')}.` : 'Those items are not in your pantry.');
  };

  // Applies the assistant's suggested shopping list changes to this week's list or next week's.
  const applyShopping = (actions: PantryAction[], weekOffset: 0 | 1) => {
    const weekStart = addDays(startOfWeek(new Date()), 7 * weekOffset);
    const weekKey = toKey(weekStart);
    const { rows } = shoppingRows({ recipes, plan, settings, pantry, edits: shoppingEdits }, weekKey, weekStart);
    const result = applyShoppingActions(shoppingEdits, weekKey, rows, actions, newId);
    updateShoppingEdits(() => result.edits);
    const parts = [
      result.added ? `added ${result.added} ${result.added === 1 ? 'item' : 'items'}` : null,
      result.removed ? `removed ${result.removed} ${result.removed === 1 ? 'item' : 'items'}` : null,
    ].filter(Boolean);
    const which = weekOffset === 0 ? "this week's" : "next week's";
    Alert.alert(
      parts.length ? 'Shopping list updated' : 'Nothing changed',
      parts.length ? `You've ${parts.join(' and ')} on ${which} list.` : `Those items were not on ${which} list.`,
    );
  };

  const addPlan = (entries: PlanEntry[], weekOffset: 0 | 1) => {
    const weekStart = addDays(startOfWeek(new Date()), 7 * weekOffset);
    const { meals, skipped } = planToMeals(entries, recipes, settings.mealSlots, weekStart);
    meals.forEach((m) => setMeal(m.dateKey, m.slotId, m.recipeId));
    const added = `Added ${meals.length} ${meals.length === 1 ? 'meal' : 'meals'} to ${weekOffset === 0 ? 'this' : 'next'} week.`;
    Alert.alert(
      meals.length ? 'Plan updated' : 'Nothing added',
      skipped.length ? `${added}\n\n${skipped.length} could not be matched to your recipes or meals.` : added,
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={type.title}>Assistant</Text>
        <Button label="New chat" variant="quiet" onPress={newChat} disabled={messages.length === 0 || sending} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            loaded ? (
              <View style={styles.empty}>
                <Text style={type.small}>
                  Ask about cooking, get recipe ideas, or have a week planned from your own recipes and pantry.
                </Text>
                {SUGGESTIONS.map((s) => (
                  <Pressable key={s} style={styles.suggestion} onPress={() => send(s)} accessibilityRole="button">
                    <Text style={styles.suggestionText}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            ) : undefined
          }
          renderItem={({ item }) =>
            item.role === 'user' ? (
              <View style={[styles.bubble, styles.user]}>
                <Text style={styles.userText}>{item.content}</Text>
              </View>
            ) : (
              <AssistantMessage
                content={item.content}
                onViewRecipe={setViewing}
                onSaveRecipe={setDraft}
                onAddPlan={addPlan}
                onApplyPantry={applyPantry}
                onApplyShopping={applyShopping}
              />
            )
          }
          ListFooterComponent={
            <View style={{ paddingTop: spacing.sm }}>
              {sending && (
                <View style={styles.thinking}>
                  <ActivityIndicator color={colors.accent} />
                  <Text style={type.small}>Thinking…</Text>
                </View>
              )}
              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.error}>{error}</Text>
                  {messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                    <Button label="Try again" variant="quiet" onPress={() => ask(messages)} disabled={sending} />
                  )}
                </View>
              )}
            </View>
          }
        />

        {(voice.recording || voice.transcribing) && (
          <View style={styles.voiceBar}>
            {voice.transcribing ? <ActivityIndicator color={colors.accent} /> : <View style={styles.recDot} />}
            <Text style={type.body}>
              {voice.transcribing ? 'Listening to what you said…' : `Recording ${formatDuration(voice.durationMillis)}. Tap the mic to send.`}
            </Text>
          </View>
        )}
        <View style={styles.inputRow}>
          <Pressable
            onPress={voice.toggle}
            disabled={voice.transcribing || sending}
            accessibilityRole="button"
            accessibilityLabel={voice.recording ? 'Stop recording and send' : 'Talk to the assistant'}
            style={[styles.mic, voice.recording && styles.micActive, (voice.transcribing || sending) && { opacity: 0.4 }]}
          >
            <Ionicons name={voice.recording ? 'stop' : 'mic-outline'} size={22} color={voice.recording ? '#fff' : colors.accent} />
          </Pressable>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask the assistant…"
            multiline
            maxLength={1000}
            accessibilityLabel="Message"
          />
          <Button label="Send" onPress={() => send(input)} disabled={!input.trim() || sending} />
        </View>
      </KeyboardAvoidingView>

      {viewing && (
        <RecipePreviewModal
          recipe={viewing}
          onClose={() => setViewing(null)}
          onSave={() => {
            setDraft(viewing);
            setViewing(null);
          }}
        />
      )}

      {draft && (
        <RecipeFormModal
          key={draft.name}
          recipe={null}
          draft={draft}
          onClose={() => setDraft(null)}
          onSave={(recipe) => {
            addRecipe(recipe);
            setDraft(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

function AssistantMessage({
  content,
  onViewRecipe,
  onSaveRecipe,
  onAddPlan,
  onApplyPantry,
  onApplyShopping,
}: {
  content: string;
  onViewRecipe: (recipe: RecipeInput) => void;
  onSaveRecipe: (recipe: RecipeInput) => void;
  onAddPlan: (entries: PlanEntry[], weekOffset: 0 | 1) => void;
  onApplyPantry: (actions: PantryAction[]) => void;
  onApplyShopping: (actions: PantryAction[], weekOffset: 0 | 1) => void;
}) {
  const segments = useMemo(() => parseReply(content), [content]);
  return (
    <View style={styles.assistant}>
      {segments.map((segment, i) => (
        <SegmentView
          key={i}
          segment={segment}
          onViewRecipe={onViewRecipe}
          onSaveRecipe={onSaveRecipe}
          onAddPlan={onAddPlan}
          onApplyPantry={onApplyPantry}
          onApplyShopping={onApplyShopping}
        />
      ))}
    </View>
  );
}

function SegmentView({
  segment,
  onViewRecipe,
  onSaveRecipe,
  onAddPlan,
  onApplyPantry,
  onApplyShopping,
}: {
  segment: Segment;
  onViewRecipe: (recipe: RecipeInput) => void;
  onSaveRecipe: (recipe: RecipeInput) => void;
  onAddPlan: (entries: PlanEntry[], weekOffset: 0 | 1) => void;
  onApplyPantry: (actions: PantryAction[]) => void;
  onApplyShopping: (actions: PantryAction[], weekOffset: 0 | 1) => void;
}) {
  if (segment.kind === 'text') {
    return (
      <View style={[styles.bubble, styles.bot]}>
        <Text style={type.body}>{segment.text}</Text>
      </View>
    );
  }
  if (segment.kind === 'recipe') {
    const { recipe } = segment;
    return (
      <View style={styles.card}>
        <Text style={type.heading}>{recipe.name}</Text>
        <Text style={type.small}>
          Serves {recipe.servings} · {recipe.ingredients.length} ingredients
        </Text>
        <Text style={type.small}>{recipe.ingredients.map(formatIngredient).join(', ')}</Text>
        <View style={styles.planButtons}>
          <View style={styles.flex}>
            <Button label="View recipe" variant="quiet" onPress={() => onViewRecipe(recipe)} />
          </View>
          <View style={styles.flex}>
            <Button label="Save" onPress={() => onSaveRecipe(recipe)} />
          </View>
        </View>
      </View>
    );
  }
  if (segment.kind === 'pantry') {
    return (
      <View style={styles.card}>
        <Text style={type.heading}>Pantry changes</Text>
        {segment.actions.map((action, i) => (
          <Text key={i} style={type.body}>
            {action.action === 'add' ? 'Add' : 'Remove'}: {action.text}
          </Text>
        ))}
        <Button label="Update my pantry" onPress={() => onApplyPantry(segment.actions)} />
      </View>
    );
  }
  if (segment.kind === 'shopping') {
    return (
      <View style={styles.card}>
        <Text style={type.heading}>Shopping list changes</Text>
        {segment.actions.map((action, i) => (
          <Text key={i} style={type.body}>
            {action.action === 'add' ? 'Add' : 'Remove'}: {action.text}
          </Text>
        ))}
        <View style={styles.planButtons}>
          <View style={styles.flex}>
            <Button label="This week's list" onPress={() => onApplyShopping(segment.actions, 0)} />
          </View>
          <View style={styles.flex}>
            <Button label="Next week's" variant="quiet" onPress={() => onApplyShopping(segment.actions, 1)} />
          </View>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.card}>
      <Text style={type.heading}>Suggested plan</Text>
      {segment.entries.map((entry, i) => (
        <Text key={i} style={type.body}>
          {entry.day} · {entry.meal}: {entry.recipe}
        </Text>
      ))}
      <Text style={type.small}>Only meals that match your saved recipes are added.</Text>
      <View style={styles.planButtons}>
        <View style={styles.flex}>
          <Button label="This week" onPress={() => onAddPlan(segment.entries, 0)} />
        </View>
        <View style={styles.flex}>
          <Button label="Next week" variant="quiet" onPress={() => onAddPlan(segment.entries, 1)} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  list: { padding: spacing.lg, paddingTop: 0, flexGrow: 1 },
  empty: { gap: spacing.md },
  suggestion: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: spacing.md },
  suggestionText: { fontSize: 15, color: colors.accent, fontWeight: '600' },
  bubble: { borderRadius: radius.md, padding: spacing.md, maxWidth: '88%' },
  user: { alignSelf: 'flex-end', backgroundColor: colors.accent },
  userText: { fontSize: 15, color: '#fff' },
  assistant: { gap: spacing.sm, alignItems: 'flex-start' },
  bot: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  card: { alignSelf: 'stretch', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.accent, padding: spacing.lg, gap: spacing.sm },
  voiceBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.accentSoft },
  recDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.danger },
  mic: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  micActive: { backgroundColor: colors.danger },
  planButtons: { flexDirection: 'row', gap: spacing.sm },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  errorBox: { gap: spacing.sm },
  error: { fontSize: 15, color: colors.danger },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.surface },
  input: { flex: 1, maxHeight: 120, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: spacing.md, fontSize: 15 },
});
