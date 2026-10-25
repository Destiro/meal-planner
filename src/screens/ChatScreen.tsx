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
import { loadChat, saveChat, StoredMessage } from '../chatHistory';
import { parseReply, PlanEntry, planToMeals, Segment } from '../chatFormat';
import { addDays, startOfWeek } from '../dates';
import { formatIngredient } from '../ingredients';
import { pantryToText } from '../pantry';
import { newId, RecipeInput, useStore } from '../store';
import { colors, radius, spacing, type } from '../theme';

const SUGGESTIONS = [
  'What can I make with what I have in my pantry?',
  'Plan my dinners for this week',
  'Suggest a quick vegetarian recipe',
];

/** A cooking assistant that knows your recipes and pantry, and can suggest recipes and meal plans. */
export default function ChatScreen() {
  const { recipes, pantry, settings, addRecipe, setMeal } = useStore();
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<RecipeInput | null>(null);
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
              <AssistantMessage content={item.content} onSaveRecipe={setDraft} onAddPlan={addPlan} />
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

        <View style={styles.inputRow}>
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
  onSaveRecipe,
  onAddPlan,
}: {
  content: string;
  onSaveRecipe: (recipe: RecipeInput) => void;
  onAddPlan: (entries: PlanEntry[], weekOffset: 0 | 1) => void;
}) {
  const segments = useMemo(() => parseReply(content), [content]);
  return (
    <View style={styles.assistant}>
      {segments.map((segment, i) => (
        <SegmentView key={i} segment={segment} onSaveRecipe={onSaveRecipe} onAddPlan={onAddPlan} />
      ))}
    </View>
  );
}

function SegmentView({
  segment,
  onSaveRecipe,
  onAddPlan,
}: {
  segment: Segment;
  onSaveRecipe: (recipe: RecipeInput) => void;
  onAddPlan: (entries: PlanEntry[], weekOffset: 0 | 1) => void;
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
        <Button label="Save to recipes" onPress={() => onSaveRecipe(recipe)} />
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
  planButtons: { flexDirection: 'row', gap: spacing.sm },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  errorBox: { gap: spacing.sm },
  error: { fontSize: 15, color: colors.danger },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.surface },
  input: { flex: 1, maxHeight: 120, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: spacing.md, fontSize: 15 },
});
