import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { addDays, formatDay, formatRange, startOfWeek, toKey, weekDays } from '../dates';
import { useStore } from '../store';
import { colors, radius, spacing, type } from '../theme';
import { MEAL_TYPES, MealType } from '../types';

interface Slot {
  dateKey: string;
  meal: MealType;
}

export default function PlannerScreen() {
  const { recipes, plan, setMeal } = useStore();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [picking, setPicking] = useState<Slot | null>(null);

  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const recipeName = (id?: string) => recipes.find((r) => r.id === id)?.name;
  const todayKey = toKey(new Date());

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => setWeekStart(addDays(weekStart, -7))} hitSlop={12}>
          <Text style={styles.arrow}>‹</Text>
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={type.title}>Meal plan</Text>
          <Text style={type.small}>{formatRange(weekStart)}</Text>
        </View>
        <Pressable onPress={() => setWeekStart(addDays(weekStart, 7))} hitSlop={12}>
          <Text style={styles.arrow}>›</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {days.map((d) => {
          const key = toKey(d);
          const isToday = key === todayKey;
          return (
            <View key={key} style={[styles.card, isToday && styles.cardToday]}>
              <Text style={type.heading}>{formatDay(d)}</Text>
              {MEAL_TYPES.map((meal) => {
                const name = recipeName(plan[key]?.[meal]);
                return (
                  <Pressable
                    key={meal}
                    style={styles.slot}
                    onPress={() => setPicking({ dateKey: key, meal })}
                  >
                    <Text style={styles.mealLabel}>{meal}</Text>
                    <Text style={name ? type.body : styles.empty}>{name ?? 'Add a meal'}</Text>
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={!!picking} animationType="slide" transparent onRequestClose={() => setPicking(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={type.heading}>Choose a recipe</Text>
            <FlatList
              data={recipes}
              keyExtractor={(r) => r.id}
              style={{ marginVertical: spacing.md }}
              ListEmptyComponent={<Text style={type.small}>No recipes yet. Add one in the Recipes tab.</Text>}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.option}
                  onPress={() => {
                    if (picking) setMeal(picking.dateKey, picking.meal, item.id);
                    setPicking(null);
                  }}
                >
                  <Text style={type.body}>{item.name}</Text>
                </Pressable>
              )}
            />
            <View style={{ gap: spacing.sm }}>
              <Button
                label="Clear this meal"
                variant="quiet"
                onPress={() => {
                  if (picking) setMeal(picking.dateKey, picking.meal, null);
                  setPicking(null);
                }}
              />
              <Button label="Cancel" variant="quiet" onPress={() => setPicking(null)} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  arrow: { fontSize: 36, color: colors.accent, paddingHorizontal: spacing.md },
  list: { padding: spacing.lg, paddingTop: 0, gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.line },
  cardToday: { borderColor: colors.accent, borderWidth: 2 },
  slot: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm + 2, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, marginTop: spacing.sm },
  mealLabel: { width: 90, fontSize: 13, color: colors.inkSoft, textTransform: 'capitalize' },
  empty: { fontSize: 15, color: colors.accent },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, maxHeight: '75%' },
  option: { paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
});
