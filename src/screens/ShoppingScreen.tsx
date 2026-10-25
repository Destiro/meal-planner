import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { addDays, formatRange, startOfWeek, toKey } from '../dates';
import { buildShoppingList, formatItemAmount, formatShoppingText, itemKey } from '../shopping';
import { useStore } from '../store';
import { colors, radius, spacing, type } from '../theme';

/** Builds a shopping list from the planned meals of a chosen week. */
export default function ShoppingScreen() {
  const { recipes, plan, settings, setHousehold } = useStore();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const thisWeekKey = toKey(startOfWeek(new Date()));
  const weekKey = toKey(weekStart);
  const label =
    weekKey === thisWeekKey ? 'This week' : weekKey === toKey(addDays(startOfWeek(new Date()), 7)) ? 'Next week' : 'Week of';

  const items = useMemo(
    () => buildShoppingList(recipes, plan, weekStart, settings.household),
    [recipes, plan, weekStart, settings.household],
  );

  // Ticks are remembered per week so moving between weeks doesn't mix them up.
  const tickKey = (key: string) => `${weekKey}|${key}`;

  // Shares what's still left to buy, so ticked-off items don't get sent along.
  const remaining = items.filter((item) => !checked[tickKey(itemKey(item))]);
  const share = () =>
    Share.share({ message: formatShoppingText(remaining, `Shopping list, ${formatRange(weekStart)}`) }).catch(() => {});

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

      {items.length > 0 && (
        <View style={styles.shareRow}>
          <Button label="Share list" variant="quiet" onPress={share} disabled={remaining.length === 0} />
        </View>
      )}
      <FlatList
        data={items}
        keyExtractor={itemKey}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={type.small}>Plan some meals and their ingredients will show up here.</Text>}
        renderItem={({ item }) => {
          const done = !!checked[tickKey(itemKey(item))];
          const amount = formatItemAmount(item);
          return (
            <Pressable
              style={styles.row}
              onPress={() => setChecked({ ...checked, [tickKey(itemKey(item))]: !done })}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: done }}
            >
              <View style={[styles.box, done && styles.boxDone]} />
              <Text style={[type.body, { flex: 1 }, done && styles.struck]}>{item.name}</Text>
              {!!amount && <Text style={type.small}>{amount}</Text>}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  arrow: { fontSize: 36, color: colors.accent, paddingHorizontal: spacing.md },
  thisWeek: { alignSelf: 'center', paddingBottom: spacing.md },
  thisWeekText: { fontSize: 14, fontWeight: '600', color: colors.accent },
  household: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 22, color: colors.accent, fontWeight: '600', lineHeight: 26 },
  people: { minWidth: 24, textAlign: 'center' },
  shareRow: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  list: { padding: spacing.lg, paddingTop: 0, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.accent },
  boxDone: { backgroundColor: colors.accent },
  struck: { textDecorationLine: 'line-through', color: colors.inkSoft },
});
