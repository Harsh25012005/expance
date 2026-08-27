import React, { useState, useMemo, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Calendar as CalendarIcon, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useExpenses } from '../context/ExpenseContext';
import { formatCurrency, formatAndroidDate } from '../utils/formatters';
import { HeatmapDayData } from '../types/expense';

const getCellColor = (level: number) => {
  switch (level) {
    case 0:
      return '#E5E5E2';
    case 1:
      return '#BBF7D0';
    case 2:
      return '#86EFAC';
    case 3:
      return '#22C55E';
    case 4:
      return '#15803D';
    default:
      return '#E5E5E2';
  }
};

interface WeekColumnProps {
  week: HeatmapDayData[];
  onCellPress: (day: HeatmapDayData) => void;
}

const WeekColumn = memo(({ week, onCellPress }: WeekColumnProps) => {
  return (
    <View style={styles.weekColumn}>
      {week.map((day, dIdx) => (
        <TouchableOpacity
          key={dIdx}
          style={[
            styles.dayCell,
            {
              backgroundColor: getCellColor(day.level),
            },
          ]}
          onPress={() => onCellPress(day)}
          activeOpacity={0.65}
        />
      ))}
    </View>
  );
});

export const SpendingHeatmap: React.FC = memo(() => {
  const { expenses, settings, theme } = useExpenses();
  const [selectedDay, setSelectedDay] = useState<HeatmapDayData | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
  };

  // Generate 52 weeks of data ending today
  const { weeksData, totalNoSpendDays } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayMap: Record<string, { amount: number; count: number }> = {};

    for (let i = 0; i < expenses.length; i++) {
      const exp = expenses[i];
      const d = new Date(exp.createdAt);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!dayMap[key]) {
        dayMap[key] = { amount: 0, count: 0 };
      }
      dayMap[key].amount += Number(exp.amount) || 0;
      dayMap[key].count += 1;
    }

    const isLargeCurrency = settings.currencyCode === 'INR' || settings.currencyCode === 'JPY';
    const multiplier = isLargeCurrency ? 50 : 1;
    const dailyRef = settings.monthlyBudget && settings.monthlyBudget > 0
      ? settings.monthlyBudget / 30
      : 50 * multiplier;

    const t1 = Math.max(5, dailyRef * 0.3);
    const t2 = Math.max(15, dailyRef * 0.8);
    const t3 = Math.max(30, dailyRef * 1.5);

    let noSpendCount = 0;
    const totalDays = 52 * 7;
    const weeks: HeatmapDayData[][] = [];
    let currentWeek: HeatmapDayData[] = [];

    for (let i = totalDays - 1; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const entry = dayMap[key] || { amount: 0, count: 0 };

      if (entry.amount === 0) {
        noSpendCount++;
      }

      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (entry.amount === 0) level = 0;
      else if (entry.amount <= t1) level = 1;
      else if (entry.amount <= t2) level = 2;
      else if (entry.amount <= t3) level = 3;
      else level = 4;

      currentWeek.push({
        dateString: key,
        dayOfWeek: date.getDay(),
        amount: entry.amount,
        count: entry.count,
        level,
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return {
      weeksData: weeks,
      totalNoSpendDays: noSpendCount,
    };
  }, [expenses, settings.monthlyBudget, settings.currencyCode]);

  const handleCellPress = (day: HeatmapDayData) => {
    triggerHaptic();
    setSelectedDay(day);
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      renderToHardwareTextureAndroid
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.badgeIcon, { backgroundColor: theme.colors.primaryLight }]}>
            <CalendarIcon size={15} color={theme.colors.primary} strokeWidth={2} />
          </View>
          <View>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>365-Day Spending Heatmap</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {totalNoSpendDays} No-Spend Days this year
            </Text>
          </View>
        </View>
      </View>

      {/* 52-Week Horizontal Heatmap Scroll */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.heatmapScrollContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        removeClippedSubviews
      >
        <View style={styles.gridContainer}>
          {weeksData.map((week, wIdx) => (
            <WeekColumn key={wIdx} week={week} onCellPress={handleCellPress} />
          ))}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legendRow}>
        <Text style={[styles.legendLabel, { color: theme.colors.textSecondary }]}>No Spend</Text>
        <View style={styles.legendPills}>
          {[0, 1, 2, 3, 4].map((lvl) => (
            <View
              key={lvl}
              style={[
                styles.legendCell,
                {
                  backgroundColor: getCellColor(lvl),
                },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.legendLabel, { color: theme.colors.textSecondary }]}>High Spend</Text>
      </View>

      {/* Day Detail Popover Modal */}
      <Modal
        visible={!!selectedDay}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedDay(null)}
      >
        <View style={[styles.popoverOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.popoverCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.popoverHeader}>
              <Text style={[styles.popoverDate, { color: theme.colors.textPrimary }]}>
                {selectedDay ? formatAndroidDate(new Date(selectedDay.dateString), true) : ''}
              </Text>
              <TouchableOpacity
                style={[styles.popoverClose, { backgroundColor: theme.colors.backgroundSecondary }]}
                onPress={() => setSelectedDay(null)}
              >
                <X size={14} color={theme.colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <View style={[styles.popoverBody, { backgroundColor: theme.colors.background, borderColor: theme.colors.borderSubtle }]}>
              <View style={styles.popoverStat}>
                <Text style={[styles.popoverStatLabel, { color: theme.colors.textSecondary }]}>Total Spent</Text>
                <Text style={[styles.popoverStatAmount, { color: selectedDay?.amount === 0 ? theme.colors.positive : theme.colors.textPrimary }]}>
                  {selectedDay?.amount === 0
                    ? 'No Spend 🎉'
                    : formatCurrency(selectedDay?.amount || 0, settings.currency)}
                </Text>
              </View>

              <View style={styles.popoverStat}>
                <Text style={[styles.popoverStatLabel, { color: theme.colors.textSecondary }]}>Transactions</Text>
                <Text style={[styles.popoverStatCount, { color: theme.colors.textPrimary }]}>
                  {selectedDay?.count || 0} items
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  heatmapScrollContent: {
    paddingVertical: 4,
  },
  gridContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  weekColumn: {
    flexDirection: 'column',
    gap: 4,
  },
  dayCell: {
    width: 12,
    height: 12,
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
  },
  legendPills: {
    flexDirection: 'row',
    gap: 3,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  legendLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  popoverOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  popoverCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  popoverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  popoverDate: {
    fontSize: 14,
    fontWeight: '700',
  },
  popoverClose: {
    width: 26,
    height: 26,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popoverBody: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  popoverStat: {
    flex: 1,
  },
  popoverStatLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  popoverStatAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  popoverStatCount: {
    fontSize: 15,
    fontWeight: '600',
  },
});
