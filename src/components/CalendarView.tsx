import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Utensils,
  Car,
  ShoppingBag,
  Zap,
  Film,
  HeartPulse,
  Plane,
  GraduationCap,
  MoreHorizontal,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useExpenses } from '../context/ExpenseContext';
import { useShake } from '../context/ShakeContext';
import { CategoryType, Expense } from '../types/expense';
import { formatCurrency, formatTime, formatAndroidDate } from '../utils/formatters';
import { getMonthName, getDailySpendingMap } from '../utils/analyticsHelpers';
import { theme } from '../constants/theme';

interface CalendarViewProps {
  onEditExpense?: (expense: Expense) => void;
  onDeleteExpense?: (expense: Expense) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  onEditExpense,
}) => {
  const { expenses, settings } = useExpenses();
  const { openAddExpensePopup } = useShake();

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

  const handleJumpToToday = () => {
    triggerHaptic();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDay(today.getDate());
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;

  const dailySpendMap = useMemo(() => {
    return getDailySpendingMap(expenses, currentYear, currentMonth);
  }, [expenses, currentYear, currentMonth]);

  // Total spent in this selected calendar month
  const monthTotalSpent = useMemo(() => {
    return Object.values(dailySpendMap).reduce((sum, d) => sum + (d.total || 0), 0);
  }, [dailySpendMap]);

  const selectedDayData = dailySpendMap[selectedDay] || { total: 0, count: 0, expenses: [] };

  const selectedDateObj = new Date(currentYear, currentMonth, selectedDay);
  const isCurrentTodaySelected =
    today.getFullYear() === currentYear &&
    today.getMonth() === currentMonth &&
    today.getDate() === selectedDay;

  const isViewingCurrentMonth =
    today.getFullYear() === currentYear && today.getMonth() === currentMonth;

  const selectedDateHeading = useMemo(() => {
    if (isCurrentTodaySelected) return 'TODAY';
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    if (
      yesterday.getFullYear() === currentYear &&
      yesterday.getMonth() === currentMonth &&
      yesterday.getDate() === selectedDay
    ) {
      return 'YESTERDAY';
    }
    return formatAndroidDate(selectedDateObj, true).toUpperCase();
  }, [selectedDateObj, isCurrentTodaySelected, currentYear, currentMonth, selectedDay, today]);

  const weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  const renderCategoryIcon = (category: CategoryType, size: number = 14) => {
    switch (category) {
      case 'Food':
        return <Utensils size={size} color={theme.colors.textPrimary} strokeWidth={1.5} />;
      case 'Transport':
        return <Car size={size} color={theme.colors.textPrimary} strokeWidth={1.5} />;
      case 'Shopping':
        return <ShoppingBag size={size} color={theme.colors.textPrimary} strokeWidth={1.5} />;
      case 'Bills':
        return <Zap size={size} color={theme.colors.textPrimary} strokeWidth={1.5} />;
      case 'Entertainment':
        return <Film size={size} color={theme.colors.textPrimary} strokeWidth={1.5} />;
      case 'Health':
        return <HeartPulse size={size} color={theme.colors.textPrimary} strokeWidth={1.5} />;
      case 'Travel':
        return <Plane size={size} color={theme.colors.textPrimary} strokeWidth={1.5} />;
      case 'Education':
        return <GraduationCap size={size} color={theme.colors.textPrimary} strokeWidth={1.5} />;
      case 'Other':
      default:
        return <MoreHorizontal size={size} color={theme.colors.textPrimary} strokeWidth={1.5} />;
    }
  };

  return (
    <View style={styles.container}>
      {/* ─── 1. Calendar Header & Month Switcher Card ─── */}
      <View style={styles.calendarCard}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.monthNavGroup}>
            <TouchableOpacity
              style={styles.navArrowBtn}
              onPress={handlePrevMonth}
              activeOpacity={0.7}
            >
              <ChevronLeft size={16} color={theme.colors.textPrimary} strokeWidth={2} />
            </TouchableOpacity>

            <Text style={styles.monthYearTitle}>
              {getMonthName(currentMonth)} {currentYear}
            </Text>

            <TouchableOpacity
              style={styles.navArrowBtn}
              onPress={handleNextMonth}
              activeOpacity={0.7}
            >
              <ChevronRight size={16} color={theme.colors.textPrimary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <View style={styles.headerRightActions}>
            {!isViewingCurrentMonth || selectedDay !== today.getDate() ? (
              <TouchableOpacity
                style={styles.todayPillBtn}
                onPress={handleJumpToToday}
                activeOpacity={0.7}
              >
                <Text style={styles.todayPillText}>Today</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.monthTotalBadge}>
                <Text style={styles.monthTotalText}>
                  {formatCurrency(monthTotalSpent, settings.currency)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ─── 2. Weekdays Header ─── */}
        <View style={styles.weekDaysRow}>
          {weekDays.map((wd) => (
            <View key={wd} style={styles.weekDayCol}>
              <Text style={styles.weekDayText}>{wd}</Text>
            </View>
          ))}
        </View>

        {/* ─── 3. Days Grid ─── */}
        <View style={styles.grid}>
          {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
            <View key={`empty-${idx}`} style={styles.dayCellCol} />
          ))}

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
              <View key={`day-${dayNum}`} style={styles.dayCellCol}>
                <TouchableOpacity
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

                  {hasSpending && (
                    <View
                      style={[
                        styles.spendDot,
                        isSelected && styles.spendDotSelected,
                      ]}
                    />
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>

      {/* ─── 4. Selected Day Story Group ─── */}
      <View style={styles.storyGroup}>
        <View style={styles.dateSummaryRow}>
          <View style={styles.dateHeadingCol}>
            <Text style={styles.dateGroupHeading}>{selectedDateHeading}</Text>
            <Text style={styles.dateSubHeading}>
              {selectedDayData.count} {selectedDayData.count === 1 ? 'transaction' : 'transactions'} ·{' '}
              {formatCurrency(selectedDayData.total, settings.currency)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              triggerHaptic();
              openAddExpensePopup();
            }}
            activeOpacity={0.7}
          >
            <Plus size={13} color={theme.colors.textPrimary} strokeWidth={2} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {selectedDayData.expenses.length > 0 ? (
          <View style={styles.storyCard}>
            {selectedDayData.expenses.map((exp, idx) => (
              <TouchableOpacity
                key={exp.id}
                style={[
                  styles.expenseItemRow,
                  idx > 0 && styles.expenseItemRowDivider,
                ]}
                onPress={() => {
                  triggerHaptic();
                  if (onEditExpense) onEditExpense(exp);
                  else openAddExpensePopup({ initialExpense: exp });
                }}
                activeOpacity={0.7}
              >
                <View style={styles.itemLeft}>
                  <View style={styles.iconCircle}>
                    {renderCategoryIcon(exp.category, 14)}
                  </View>
                  <View style={styles.itemTextCol}>
                    <Text style={styles.itemName}>{exp.name}</Text>
                    <View style={styles.itemMetaRow}>
                      <Text style={styles.itemCategory}>{exp.category}</Text>
                      <Text style={styles.itemDot}>·</Text>
                      <Text style={styles.itemTime}>{formatTime(exp.createdAt)}</Text>
                      {exp.notes ? (
                        <>
                          <Text style={styles.itemDot}>·</Text>
                          <Text style={styles.itemNotes} numberOfLines={1}>
                            {exp.notes}
                          </Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                </View>

                <View style={styles.itemRight}>
                  <Text style={styles.itemAmount}>
                    {formatCurrency(exp.amount, settings.currency)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyDayCard}>
            <View style={styles.emptyIconCircle}>
              <CalendarIcon size={20} color={theme.colors.textTertiary} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyDayTitle}>No expenses recorded</Text>
            <Text style={styles.emptyDaySubtitle}>
              No spending logged on {formatAndroidDate(selectedDateObj, false)}.
            </Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => {
                triggerHaptic();
                openAddExpensePopup();
              }}
              activeOpacity={0.7}
            >
              <Plus size={13} color={theme.colors.textPrimary} strokeWidth={2} />
              <Text style={styles.emptyAddBtnText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  /* Calendar Card */
  calendarCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthNavGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthYearTitle: {
    ...theme.typography.body,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    minWidth: 110,
    textAlign: 'center',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayPillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  todayPillText: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  monthTotalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    backgroundColor: theme.colors.accentLight,
  },
  monthTotalText: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  weekDaysRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 8,
  },
  weekDayCol: {
    width: '14.2857%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayText: {
    ...theme.typography.label,
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    width: '100%',
  },
  dayCellCol: {
    width: '14.2857%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 3,
  },
  dayCell: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    position: 'relative',
  },
  dayCellSelected: {
    backgroundColor: theme.colors.textPrimary,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.accentLight,
  },
  dayNumText: {
    ...theme.typography.body,
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  dayNumTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayNumTextToday: {
    fontWeight: '700',
    color: theme.colors.primary,
  },
  spendDot: {
    position: 'absolute',
    bottom: 5,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
  },
  spendDotSelected: {
    backgroundColor: '#FFFFFF',
  },
  /* Selected Day Story Group */
  storyGroup: {
    gap: 8,
  },
  dateSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  dateHeadingCol: {
    gap: 2,
  },
  dateGroupHeading: {
    ...theme.typography.label,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    letterSpacing: 0.5,
  },
  dateSubHeading: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  addBtnText: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  /* Story Card (Matching AllExpenses list) */
  storyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  expenseItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  expenseItemRowDivider: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTextCol: {
    flex: 1,
  },
  itemName: {
    ...theme.typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  itemCategory: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  itemDot: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  itemTime: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  itemNotes: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textTertiary,
    flex: 1,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemAmount: {
    ...theme.typography.body,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  /* Empty Day Card */
  emptyDayCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyDayTitle: {
    ...theme.typography.sectionHeading,
    fontSize: 14,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  emptyDaySubtitle: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 14,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyAddBtnText: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
});
