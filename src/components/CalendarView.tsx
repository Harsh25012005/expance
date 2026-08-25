import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { ChevronLeft, ChevronRight, CalendarDays, Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useExpenses } from '../context/ExpenseContext';
import { useShake } from '../context/ShakeContext';
import { Expense } from '../types/expense';
import { formatCurrency } from '../utils/formatters';
import { getMonthName, getDailySpendingMap, toLocalDateString } from '../utils/analyticsHelpers';
import { ExpenseListItem } from './ExpenseListItem';
import { theme } from '../constants/theme';

export const CalendarView: React.FC = () => {
  const { expenses, settings, deleteExpense } = useExpenses();
  const { openQuickAddModal } = useShake();
  const insets = useSafeAreaInsets();

  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number>(today.getDate());

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
  };

  // Month navigation
  const handlePrevMonth = () => {
    triggerHaptic();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    triggerHaptic();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
    setSelectedDay(1);
  };

  // Days in selected month & offset
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  // Starting day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  // Adjusted for Monday start (0 = Mon, 1 = Tue, ..., 6 = Sun)
  const firstDayOfWeek = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;

  // Daily spending map for this month
  const dailySpendMap = useMemo(() => {
    return getDailySpendingMap(expenses, currentYear, currentMonth);
  }, [expenses, currentYear, currentMonth]);

  const selectedDayData = dailySpendMap[selectedDay] || { total: 0, count: 0, expenses: [] };

  const selectedDateObj = new Date(currentYear, currentMonth, selectedDay);
  const selectedDateLabel = `${selectedDay} ${getMonthName(currentMonth)}`;
  const isToday =
    today.getFullYear() === currentYear &&
    today.getMonth() === currentMonth &&
    today.getDate() === selectedDay;

  const handleAddExpenseForDay = () => {
    triggerHaptic();
    const dateStr = selectedDateObj.toISOString();
    openQuickAddModal({ triggeredByShake: false });
  };

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingBottom: 85 + Math.max(insets.bottom, 16) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Month Navigation Header */}
      <View style={styles.calendarCard}>
        <View style={styles.navRow}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={handlePrevMonth}
            activeOpacity={0.7}
            accessibilityLabel="Previous month"
          >
            <ChevronLeft size={18} color={theme.colors.textPrimary} strokeWidth={1.5} />
          </TouchableOpacity>

          <View style={styles.monthHeaderCenter}>
            <Text style={styles.monthTitle}>
              {getMonthName(currentMonth)} {currentYear}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.navBtn}
            onPress={handleNextMonth}
            activeOpacity={0.7}
            accessibilityLabel="Next month"
          >
            <ChevronRight size={18} color={theme.colors.textPrimary} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        {/* 2. Days of Week Header */}
        <View style={styles.weekDaysRow}>
          {weekDays.map((wd) => (
            <Text key={wd} style={styles.weekDayText}>
              {wd}
            </Text>
          ))}
        </View>

        {/* 3. Calendar Grid */}
        <View style={styles.grid}>
          {/* Empty offset cells */}
          {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
            <View key={`empty-${idx}`} style={styles.dayCellEmpty} />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const isSelected = dayNum === selectedDay;
            const daySpend = dailySpendMap[dayNum];
            const hasSpending = Boolean(daySpend && daySpend.total > 0);
            const isCurrentToday =
              today.getFullYear() === currentYear &&
              today.getMonth() === currentMonth &&
              today.getDate() === dayNum;

            return (
              <TouchableOpacity
                key={`day-${dayNum}`}
                style={[
                  styles.dayCell,
                  isSelected && styles.dayCellSelected,
                  isCurrentToday && !isSelected && styles.dayCellToday,
                ]}
                onPress={() => {
                  triggerHaptic();
                  setSelectedDay(dayNum);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dayNumText,
                    isSelected && styles.dayNumTextSelected,
                    isCurrentToday && !isSelected && styles.dayNumTextToday,
                  ]}
                >
                  {dayNum}
                </Text>

                {/* Spending Indicator Dot */}
                {hasSpending && (
                  <View
                    style={[
                      styles.spendDot,
                      isSelected && styles.spendDotSelected,
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 4. Selected Date Spending Details */}
      <View style={styles.detailsCard}>
        <View style={styles.detailsHeader}>
          <View>
            <Text style={styles.detailsDateTitle}>
              {selectedDateLabel} {isToday ? '(Today)' : ''}
            </Text>
            <Text style={styles.detailsSpentText}>
              {formatCurrency(selectedDayData.total, settings.currency)} spent
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addBtn}
            onPress={handleAddExpenseForDay}
            activeOpacity={0.7}
          >
            <Plus size={13} color={theme.colors.surface} strokeWidth={2} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {selectedDayData.expenses.length > 0 ? (
          <View style={styles.expensesList}>
            {selectedDayData.expenses.map((exp) => (
              <ExpenseListItem
                key={exp.id}
                expense={exp}
                onEdit={(item) => openQuickAddModal({ initialExpense: item })}
                onDelete={() => deleteExpense(exp.id)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyDayBox}>
            <Text style={styles.emptyDayTitle}>No expenses recorded</Text>
            <Text style={styles.emptyDaySubtitle}>
              You did not record any spending for {selectedDateLabel}.
            </Text>
            <TouchableOpacity
              style={styles.emptyDayAddBtn}
              onPress={handleAddExpenseForDay}
              activeOpacity={0.7}
            >
              <Plus size={13} color={theme.colors.primary} strokeWidth={2} />
              <Text style={styles.emptyDayAddBtnText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 110,
  },
  calendarCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  monthHeaderCenter: {
    alignItems: 'center',
  },
  monthTitle: {
    ...theme.typography.sectionHeading,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textTertiary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 6,
  },
  dayCellEmpty: {
    width: '14.28%',
    height: 40,
  },
  dayCell: {
    width: '14.28%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    position: 'relative',
  },
  dayCellSelected: {
    backgroundColor: theme.colors.primary,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  dayNumText: {
    ...theme.typography.body,
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  dayNumTextSelected: {
    color: theme.colors.surface,
    fontWeight: '700',
  },
  dayNumTextToday: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  spendDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
    position: 'absolute',
    bottom: 4,
  },
  spendDotSelected: {
    backgroundColor: theme.colors.surface,
  },
  detailsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
    paddingBottom: 12,
  },
  detailsDateTitle: {
    ...theme.typography.sectionHeading,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  detailsSpentText: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primary,
  },
  addBtnText: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.surface,
  },
  expensesList: {
    gap: 8,
  },
  emptyDayBox: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyDayTitle: {
    ...theme.typography.sectionHeading,
    fontSize: 14,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  emptyDaySubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  emptyDayAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  emptyDayAddBtnText: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});
