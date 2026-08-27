import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaPage } from './SafeAreaPage';
import {
  X,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Utensils,
  Car,
  ShoppingBag,
  Zap,
  Film,
  HeartPulse,
  Plane,
  GraduationCap,
  MoreHorizontal,
  PieChart,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExpenses } from '../context/ExpenseContext';
import { CATEGORIES, CATEGORY_MAP } from '../constants/categories';
import { CategoryType } from '../types/expense';
import { formatCurrency } from '../utils/formatters';
import { getMonthName } from '../utils/analyticsHelpers';
import { theme } from '../constants/theme';

interface WhereDidItGoModalProps {
  visible: boolean;
  onClose: () => void;
}

export const WhereDidItGoModal: React.FC<WhereDidItGoModalProps> = ({ visible, onClose }) => {
  const { expenses, settings } = useExpenses();
  const insets = useSafeAreaInsets();

  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth());

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
  };

  const handlePrevMonth = () => {
    triggerHaptic();
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    triggerHaptic();
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  // 1. Current Selected Month Expenses & Total
  const currentMonthExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const d = new Date(exp.createdAt);
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });
  }, [expenses, selectedYear, selectedMonth]);

  const totalSpent = useMemo(() => {
    return currentMonthExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  }, [currentMonthExpenses]);

  // 2. Previous Month Expenses & Comparison
  const lastMonthTotal = useMemo(() => {
    const prevMonthDate = new Date(selectedYear, selectedMonth - 1, 1);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth();

    const prevMonthExpenses = expenses.filter((exp) => {
      const d = new Date(exp.createdAt);
      return d.getFullYear() === prevYear && d.getMonth() === prevMonth;
    });

    return prevMonthExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  }, [expenses, selectedYear, selectedMonth]);

  // Month-over-Month percentage change
  const comparisonInfo = useMemo(() => {
    if (totalSpent === 0 && lastMonthTotal === 0) return null;
    if (lastMonthTotal === 0) return { text: 'First month of tracking', type: 'neutral' as const };

    const diff = totalSpent - lastMonthTotal;
    const pct = Math.round((Math.abs(diff) / lastMonthTotal) * 100);

    if (diff > 0) {
      return { text: `+${pct}% vs last month`, type: 'negative' as const };
    } else if (diff < 0) {
      return { text: `-${pct}% vs last month`, type: 'positive' as const };
    }
    return { text: '0% vs last month', type: 'neutral' as const };
  }, [totalSpent, lastMonthTotal]);

  // 3. Category Distribution (Sorted Highest -> Lowest)
  const categoryBreakdown = useMemo(() => {
    const totals: Record<CategoryType, number> = {
      Food: 0,
      Transport: 0,
      Shopping: 0,
      Bills: 0,
      Entertainment: 0,
      Health: 0,
      Travel: 0,
      Education: 0,
      Other: 0,
    };

    for (const exp of currentMonthExpenses) {
      totals[exp.category] = (totals[exp.category] || 0) + (Number(exp.amount) || 0);
    }

    return CATEGORIES.map((cat) => ({
      ...cat,
      amount: totals[cat.id] || 0,
      percentage: totalSpent > 0 ? Math.round((totals[cat.id] / totalSpent) * 100) : 0,
    }))
      .filter((cat) => cat.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [currentMonthExpenses, totalSpent]);

  // 4. Biggest Category
  const topCategory = categoryBreakdown[0] || null;

  const renderCategoryIcon = (catId: CategoryType, size: number = 14, color?: string) => {
    const iconColor = color || theme.colors.textPrimary;
    switch (catId) {
      case 'Food':
        return <Utensils size={size} color={iconColor} strokeWidth={1.5} />;
      case 'Transport':
        return <Car size={size} color={iconColor} strokeWidth={1.5} />;
      case 'Shopping':
        return <ShoppingBag size={size} color={iconColor} strokeWidth={1.5} />;
      case 'Bills':
        return <Zap size={size} color={iconColor} strokeWidth={1.5} />;
      case 'Entertainment':
        return <Film size={size} color={iconColor} strokeWidth={1.5} />;
      case 'Health':
        return <HeartPulse size={size} color={iconColor} strokeWidth={1.5} />;
      case 'Travel':
        return <Plane size={size} color={iconColor} strokeWidth={1.5} />;
      case 'Education':
        return <GraduationCap size={size} color={iconColor} strokeWidth={1.5} />;
      case 'Other':
      default:
        return <MoreHorizontal size={size} color={iconColor} strokeWidth={1.5} />;
    }
  };

  const monthLabel = `${getMonthName(selectedMonth)} ${selectedYear}`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaPage topSpacing={6} bottomSpacing={16}>
        {/* ─── Compact Header ─── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Where did it go?</Text>
            <Text style={styles.subtitle}>A simple breakdown of your spending.</Text>
          </View>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.7}
            accessibilityLabel="Close"
          >
            <X size={18} color={theme.colors.textPrimary} strokeWidth={1.75} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: 30 + Math.max(insets.bottom, 16) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Month Switcher Card ─── */}
          <View style={styles.monthSwitcherCard}>
            <TouchableOpacity
              style={styles.monthNavBtn}
              onPress={handlePrevMonth}
              activeOpacity={0.7}
            >
              <ChevronLeft size={18} color={theme.colors.textPrimary} strokeWidth={1.75} />
            </TouchableOpacity>

            <Text style={styles.monthSwitcherText}>{monthLabel}</Text>

            <TouchableOpacity
              style={styles.monthNavBtn}
              onPress={handleNextMonth}
              activeOpacity={0.7}
            >
              <ChevronRight size={18} color={theme.colors.textPrimary} strokeWidth={1.75} />
            </TouchableOpacity>
          </View>

          {/* ─── Hero Spending Breakdown Card (Expenza Surface Card) ─── */}
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <Text style={styles.heroLabel}>TOTAL SPENT</Text>
              <Text style={styles.heroMonthLabel}>{getMonthName(selectedMonth)}</Text>
            </View>

            <View style={styles.amountContainer}>
              <Text style={styles.amountText}>
                {formatCurrency(totalSpent, settings.currency)}
              </Text>
            </View>

            {comparisonInfo && (
              <View style={styles.trendRow}>
                {comparisonInfo.type === 'negative' ? (
                  <View style={styles.trendBadge}>
                    <TrendingUp size={12} color={theme.colors.negative} strokeWidth={2} />
                    <Text style={styles.trendNegativeText}>{comparisonInfo.text}</Text>
                  </View>
                ) : comparisonInfo.type === 'positive' ? (
                  <View style={styles.trendBadge}>
                    <TrendingDown size={12} color={theme.colors.positive} strokeWidth={2} />
                    <Text style={styles.trendPositiveText}>{comparisonInfo.text}</Text>
                  </View>
                ) : (
                  <Text style={styles.trendNeutralText}>{comparisonInfo.text}</Text>
                )}
              </View>
            )}

            {/* Multi-segment Horizontal Progress Bar */}
            {categoryBreakdown.length > 0 && (
              <View style={styles.multiBarTrack}>
                {categoryBreakdown.map((cat) => (
                  <View
                    key={cat.id}
                    style={[
                      styles.multiBarSegment,
                      {
                        flex: Math.max(cat.percentage, 4),
                        backgroundColor: cat.color || theme.colors.primary,
                      },
                    ]}
                  />
                ))}
              </View>
            )}

            {/* Inline Biggest Category Highlight */}
            {topCategory && (
              <View style={styles.topCategoryHighlight}>
                <Text style={styles.topCatTag}>Biggest Category</Text>
                <Text style={styles.topCatText}>
                  {topCategory.label} · {formatCurrency(topCategory.amount, settings.currency)} ({topCategory.percentage}%)
                </Text>
              </View>
            )}
          </View>

          {categoryBreakdown.length > 0 ? (
            /* ─── Category Breakdown Card List ─── */
            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownSectionTitle}>Category Breakdown</Text>
              <View style={styles.categoryList}>
                {categoryBreakdown.map((cat, idx) => (
                  <View
                    key={cat.id}
                    style={[
                      styles.categoryRow,
                      idx > 0 && styles.categoryRowDivider,
                    ]}
                  >
                    <View style={styles.catRowHeader}>
                      <View style={styles.catHeaderLeft}>
                        <View
                          style={[
                            styles.catIconCircle,
                            { backgroundColor: cat.bgColor || theme.colors.backgroundSecondary },
                          ]}
                        >
                          {renderCategoryIcon(cat.id, 14, cat.color || theme.colors.primary)}
                        </View>
                        <View>
                          <Text style={styles.catName}>{cat.label}</Text>
                          <Text style={styles.catPercentage}>{cat.percentage}% of total</Text>
                        </View>
                      </View>

                      <View style={styles.catHeaderRight}>
                        <Text style={styles.catAmount}>
                          {formatCurrency(cat.amount, settings.currency)}
                        </Text>
                      </View>
                    </View>

                    {/* Progress Bar with Category Color */}
                    <View style={styles.track}>
                      <View
                        style={[
                          styles.fill,
                          {
                            width: `${Math.min(Math.max(cat.percentage, 4), 100)}%`,
                            backgroundColor: cat.color || theme.colors.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            /* ─── Minimal Expenza Empty State ─── */
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <PieChart size={24} color={theme.colors.textTertiary} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>Nothing to show yet</Text>
              <Text style={styles.emptySubtitle}>
                Add your first expense to see where your money goes.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaPage>
    </Modal>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.background,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    ...theme.typography.pageHeading,
    fontSize: 20,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  /* Month Switcher Card */
  monthSwitcherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 14,
  },
  monthNavBtn: {
    padding: 6,
    borderRadius: 9999,
  },
  monthSwitcherText: {
    ...theme.typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  /* Hero Card */
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  heroLabel: {
    ...theme.typography.label,
    color: theme.colors.textSecondary,
  },
  heroMonthLabel: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    fontWeight: '500',
  },
  amountContainer: {
    marginVertical: 4,
  },
  amountText: {
    ...theme.typography.amount,
    color: theme.colors.textPrimary,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendNegativeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.negative,
  },
  trendPositiveText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.positive,
  },
  trendNeutralText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  multiBarTrack: {
    flexDirection: 'row',
    height: 8,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 9999,
    overflow: 'hidden',
    gap: 2,
    marginBottom: 14,
  },
  multiBarSegment: {
    height: '100%',
    borderRadius: 4,
  },
  topCategoryHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  topCatTag: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  topCatText: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  /* Breakdown Card */
  breakdownCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  breakdownSectionTitle: {
    ...theme.typography.sectionHeading,
    fontSize: 15,
    color: theme.colors.textPrimary,
    marginBottom: 14,
  },
  categoryList: {
    gap: 14,
  },
  categoryRow: {
    gap: 8,
  },
  categoryRowDivider: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  catRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: {
    ...theme.typography.body,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  catPercentage: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  catHeaderRight: {
    alignItems: 'flex-end',
  },
  catAmount: {
    ...theme.typography.body,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  track: {
    height: 4,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 9999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 9999,
  },
  /* Empty Card */
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    paddingVertical: 48,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    ...theme.typography.sectionHeading,
    fontSize: 15,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    ...theme.typography.caption,
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 18,
  },
});
