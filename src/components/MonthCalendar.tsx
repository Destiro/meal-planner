import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { monthGrid, toKey } from '../dates';
import { useStore } from '../store';
import { colors, radius, spacing } from '../theme';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface Props {
  month: Date; // any date inside the month to show
  selectedKey: string;
  onSelect: (date: Date) => void;
}

export function MonthCalendar({ month, selectedKey, onSelect }: Props) {
  const { plan, settings } = useStore();
  const days = monthGrid(month);
  const todayKey = toKey(new Date());

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={styles.weekday}>
            {w}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {days.map((d) => {
          const key = toKey(d);
          const inMonth = d.getMonth() === month.getMonth();
          const selected = key === selectedKey;
          const planned = settings.mealSlots.filter((s) => plan[key]?.[s.id]).length;
          return (
            <Pressable key={key} style={styles.cell} onPress={() => onSelect(d)}>
              <View
                style={[
                  styles.dayBubble,
                  selected && { backgroundColor: colors.accent },
                  !selected && key === todayKey && { borderColor: colors.accent, borderWidth: 2 },
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    !inMonth && { color: colors.line },
                    selected && { color: '#fff', fontWeight: '700' },
                  ]}
                >
                  {d.getDate()}
                </Text>
              </View>
              <View style={styles.dots}>
                {Array.from({ length: planned }, (_, i) => (
                  <View key={i} style={[styles.dot, !inMonth && { opacity: 0.35 }]} />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
  },
  row: { flexDirection: 'row', marginBottom: spacing.xs },
  weekday: { width: '14.2857%', textAlign: 'center', fontSize: 12, color: colors.inkSoft, paddingVertical: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.2857%', alignItems: 'center', paddingVertical: 3 },
  dayBubble: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 15, color: colors.ink },
  dots: { flexDirection: 'row', gap: 3, height: 6, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent },
});
