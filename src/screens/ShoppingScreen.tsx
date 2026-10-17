import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addDays, formatRange, startOfWeek, toKey } from '../dates';
import { useStore } from '../store';
import { colors, radius, spacing, type } from '../theme';

/** Builds a shopping list from this week's planned meals. */
export default function ShoppingScreen() {
  const { recipes, plan } = useStore();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const weekStart = startOfWeek(new Date());

  const items = useMemo(() => {
    const counts = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      const day = plan[toKey(addDays(weekStart, i))];
      if (!day) continue;
      for (const recipeId of Object.values(day)) {
        const recipe = recipes.find((r) => r.id === recipeId);
        recipe?.ingredients.forEach((ing) => {
          const k = ing.toLowerCase();
          counts.set(k, (counts.get(k) ?? 0) + 1);
        });
      }
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, recipes]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={type.title}>Shopping list</Text>
        <Text style={type.small}>This week, {formatRange(weekStart)}</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={([name]) => name}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={type.small}>Plan some meals and their ingredients will show up here.</Text>}
        renderItem={({ item: [name, count] }) => {
          const done = !!checked[name];
          return (
            <Pressable style={styles.row} onPress={() => setChecked({ ...checked, [name]: !done })}>
              <View style={[styles.box, done && styles.boxDone]} />
              <Text style={[type.body, { flex: 1 }, done && styles.struck]}>{name}</Text>
              {count > 1 && <Text style={type.small}>×{count}</Text>}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.lg, gap: spacing.xs },
  list: { padding: spacing.lg, paddingTop: 0, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.accent },
  boxDone: { backgroundColor: colors.accent },
  struck: { textDecorationLine: 'line-through', color: colors.inkSoft },
});
