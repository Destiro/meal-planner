import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { Alert, Animated, Pressable, ScrollView, ScrollViewInstance, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DayMeals } from '../components/DayMeals';
import { MealActionsModal } from '../components/MealActionsModal';
import { MealSlotsModal } from '../components/MealSlotsModal';
import { MonthCalendar } from '../components/MonthCalendar';
import { RecipeDetailModal } from '../components/RecipeDetailModal';
import { RecipePickerModal, Slot } from '../components/RecipePickerModal';
import {
  addDays,
  addMonths,
  formatDay,
  formatMonth,
  formatRange,
  startOfMonth,
  startOfWeek,
  toKey,
  weekDays,
} from '../dates';
import { weekHasMeals } from '../planUtils';
import { useStore } from '../store';
import { Recipe } from '../types';
import { colors, radius, spacing, type } from '../theme';

type Mode = 'week' | 'month';

export default function PlannerScreen() {
  const [mode, setMode] = useState<Mode>('week');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => new Date());
  const [picking, setPicking] = useState<Slot | null>(null);
  // A meal that is already planned: the slot whose actions are showing, and the recipe being read.
  const [acting, setActing] = useState<Slot | null>(null);
  const [viewing, setViewing] = useState<Recipe | null>(null);
  const [editingSlots, setEditingSlots] = useState(false);
  const { plan, recipes, settings, copyWeekPlan, setMeal } = useStore();

  const previousWeek = addDays(weekStart, -7);
  const canCopy = weekHasMeals(plan, previousWeek);
  const copyLastWeek = () => {
    const doCopy = () => copyWeekPlan(previousWeek, weekStart);
    if (!weekHasMeals(plan, weekStart)) return doCopy();
    Alert.alert('Replace this week?', "Meals already planned this week will be replaced with last week's.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Replace', style: 'destructive', onPress: doCopy },
    ]);
  };

  const todayKey = toKey(new Date());

  // Crossfade between week and month: fade out, swap content, fade back in.
  const [fade] = useState(() => new Animated.Value(1));
  const scrollRef = useRef<ScrollViewInstance>(null);
  const switching = useRef(false);

  const toggleMode = () => {
    if (switching.current) return;
    switching.current = true;
    const next: Mode = mode === 'week' ? 'month' : 'week';
    Animated.timing(fade, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
      setMode(next);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      Animated.timing(fade, { toValue: 1, duration: 240, useNativeDriver: true }).start(() => {
        switching.current = false;
      });
    });
  };
  // An empty slot goes straight to choosing a recipe. A planned one asks whether to view, change or clear it.
  const openSlot = (dateKey: string, meal: Slot['meal']) => {
    const planned = recipes.some((r) => r.id === plan[dateKey]?.[meal]);
    if (planned) setActing({ dateKey, meal });
    else setPicking({ dateKey, meal });
  };
  const actingRecipe = acting ? recipes.find((r) => r.id === plan[acting.dateKey]?.[acting.meal]) : undefined;

  const step = (dir: -1 | 1) => {
    if (mode === 'week') setWeekStart(addDays(weekStart, 7 * dir));
    else setMonth(addMonths(month, dir));
  };

  const goToday = () => {
    const now = new Date();
    setWeekStart(startOfWeek(now));
    setMonth(startOfMonth(now));
    setSelected(now);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => step(-1)} hitSlop={12}>
          <Text style={styles.arrow}>‹</Text>
        </Pressable>
        <Animated.View style={{ alignItems: 'center', opacity: fade }}>
          <Text style={type.title}>{mode === 'week' ? 'Meal plan' : formatMonth(month)}</Text>
          {mode === 'week' && <Text style={type.small}>{formatRange(weekStart)}</Text>}
        </Animated.View>
        <Pressable onPress={() => step(1)} hitSlop={12}>
          <Text style={styles.arrow}>›</Text>
        </Pressable>
      </View>

      <View style={styles.toolbar}>
        <Pressable
          onPress={toggleMode}
          style={({ pressed }) => [styles.chip, pressed && { opacity: 0.6 }]}
          accessibilityLabel={`Switch to ${mode === 'week' ? 'month' : 'week'} view`}
        >
          <Ionicons name="calendar-outline" size={18} color={colors.accent} />
          <Text style={styles.chipText}>{mode === 'week' ? 'Week' : 'Month'}</Text>
          <Ionicons name="swap-horizontal" size={16} color={colors.inkSoft} />
        </Pressable>
        {mode === 'week' && (
          <Pressable onPress={copyLastWeek} disabled={!canCopy} hitSlop={8} style={!canCopy && { opacity: 0.4 }}>
            <Text style={styles.today}>Copy last week</Text>
          </Pressable>
        )}
        <Pressable onPress={goToday} hitSlop={8}>
          <Text style={styles.today}>Today</Text>
        </Pressable>
        <Pressable onPress={() => setEditingSlots(true)} hitSlop={8} accessibilityLabel="Choose which meals to plan">
          <Ionicons name="options-outline" size={22} color={colors.accent} />
        </Pressable>
      </View>

      <Animated.View
        style={{
          flex: 1,
          opacity: fade,
          transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        }}
      >
      <ScrollView ref={scrollRef} contentContainerStyle={styles.list}>
        {mode === 'week' ? (
          weekDays(weekStart).map((d) => {
            const key = toKey(d);
            return (
              <View key={key} style={[styles.card, key === todayKey && styles.cardToday]}>
                <Text style={type.heading}>{formatDay(d)}</Text>
                <DayMeals dateKey={key} onPickSlot={openSlot} />
              </View>
            );
          })
        ) : (
          <>
            <MonthCalendar month={month} selectedKey={toKey(selected)} onSelect={setSelected} />
            <View style={styles.card}>
              <Text style={type.heading}>{formatDay(selected)}</Text>
              <DayMeals dateKey={toKey(selected)} onPickSlot={openSlot} />
            </View>
          </>
        )}
      </ScrollView>
      </Animated.View>

      <RecipePickerModal slot={picking} onClose={() => setPicking(null)} />

      {acting && actingRecipe && (
        <MealActionsModal
          mealLabel={settings.mealSlots.find((s) => s.id === acting.meal)?.label ?? acting.meal}
          recipeName={actingRecipe.name}
          onClose={() => setActing(null)}
          onView={() => {
            setViewing(actingRecipe);
            setActing(null);
          }}
          onChange={() => {
            setPicking(acting);
            setActing(null);
          }}
          onClear={() => {
            setMeal(acting.dateKey, acting.meal, null);
            setActing(null);
          }}
        />
      )}

      {viewing && <RecipeDetailModal recipe={viewing} household={settings.household} onClose={() => setViewing(null)} />}
      <MealSlotsModal visible={editingSlots} onClose={() => setEditingSlots(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, paddingBottom: spacing.lg },
  arrow: { fontSize: 36, color: colors.accent, paddingHorizontal: spacing.md },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingVertical: 7, paddingHorizontal: spacing.md },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.ink },
  today: { fontSize: 14, fontWeight: '600', color: colors.accent },
  list: { padding: spacing.lg, paddingTop: 0, gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.line },
  cardToday: { borderColor: colors.accent, borderWidth: 2 },
});
