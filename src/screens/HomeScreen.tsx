import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import {
  ArrowRight,
  Smartphone,
  Plus,
  Receipt,
  Sparkles,
  BarChart3,
  PieChart,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useExpenses } from '../context/ExpenseContext';
import { useShake } from '../context/ShakeContext';
import { HeroBalanceCard } from '../components/HeroBalanceCard';
import { ExpenseListItem } from '../components/ExpenseListItem';
import { ConfirmModal } from '../components/ConfirmModal';
import { Expense } from '../types/expense';
import { CATEGORIES } from '../constants/categories';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { theme } from '../constants/theme';

interface HomeScreenProps {
  onNavigateToExpenses: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateToExpenses }) => {
  const { expenses, stats, settings, deleteExpense } = useExpenses();
  const { openQuickAddModal } = useShake();

  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  // Subtle animated phone shake icon
  const shakeIconAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(2000),
        Animated.timing(shakeIconAnim, { toValue: 4, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeIconAnim, { toValue: -4, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeIconAnim, { toValue: 3, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeIconAnim, { toValue: -3, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeIconAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
        Animated.delay(3000),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
  };

  const recentExpenses = expenses.slice(0, 5);
  const hasExpenses = expenses.length > 0;

  // Compute category breakdown for "Where your money goes"
  const topCategories = CATEGORIES.map((cat) => ({
    ...cat,
    amount: stats.categoryTotals[cat.id] || 0,
    percentage:
      stats.totalSpending > 0
        ? ((stats.categoryTotals[cat.id] || 0) / stats.totalSpending) * 100
        : 0,
  }))
    .filter((cat) => cat.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);

  // Compute 4-month or 7-day trend
  const monthlyTrends = useMemo(() => {
    const monthsData: { label: string; amount: number }[] = [];
    const now = new Date();

    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const label = d.toLocaleDateString('en-US', { month: 'short' });

      let sum = 0;
      for (const exp of expenses) {
        const expDate = new Date(exp.createdAt);
        if (expDate.getMonth() === m && expDate.getFullYear() === y) {
          sum += exp.amount;
        }
      }
      monthsData.push({ label, amount: sum });
    }
    return monthsData;
  }, [expenses]);

  const maxMonthAmount = Math.max(...monthlyTrends.map((m) => m.amount), 1);

  const handleDeleteConfirm = async () => {
    if (deletingExpense) {
      await deleteExpense(deletingExpense.id);
      setDeletingExpense(null);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Total Spent (Main Balance Card) */}
      <HeroBalanceCard />

      {/* 2. Shake to Add (Quick Add with '+ Add manually' secondary) */}
      <View style={styles.quickShakeCard}>
        <View style={styles.quickShakeTop}>
          <View style={styles.quickShakeLeft}>
            <Text style={styles.quickShakeTitle}>Shake to add</Text>
            <Text style={styles.quickShakeSubtitle}>
              Expenza makes recording an expense as simple as a shake.
            </Text>
          </View>

          <Animated.View
            style={[
              styles.quickShakeIconWrap,
              {
                transform: [
                  {
                    rotate: shakeIconAnim.interpolate({
                      inputRange: [-10, 10],
                      outputRange: ['-10deg', '10deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <Smartphone size={18} color={theme.colors.primary} strokeWidth={1.5} />
          </Animated.View>
        </View>

        {/* Secondary '+ Add manually' action */}
        <TouchableOpacity
          style={styles.manualAddBtn}
          onPress={() => {
            triggerHaptic();
            openQuickAddModal({ triggeredByShake: false });
          }}
          activeOpacity={0.7}
        >
          <Plus size={13} color={theme.colors.textPrimary} strokeWidth={2} />
          <Text style={styles.manualAddBtnText}>Add manually</Text>
        </TouchableOpacity>
      </View>

      {/* 3. Spending Overview (Only when real data exists) */}
      {hasExpenses && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardTitle}>Spending overview</Text>
          <View style={styles.overviewGrid}>
            <View style={styles.overviewMetric}>
              <Text style={styles.overviewLabel}>TOTAL SPENT</Text>
              <Text style={styles.overviewValue}>
                {formatCurrency(stats.totalSpending, settings.currency)}
              </Text>
            </View>

            <View style={styles.overviewMetric}>
              <Text style={styles.overviewLabel}>TRANSACTIONS</Text>
              <Text style={styles.overviewValue}>{stats.totalCount}</Text>
            </View>

            <View style={styles.overviewMetric}>
              <Text style={styles.overviewLabel}>AVG / EXPENSE</Text>
              <Text style={styles.overviewValue}>
                {formatCurrency(stats.averageExpense, settings.currency)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* 4. Where Your Money Goes (Category breakdown) */}
      {hasExpenses && topCategories.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardTitle}>Where your money goes</Text>
          <View style={styles.breakdownList}>
            {topCategories.map((cat) => (
              <View key={cat.id} style={styles.breakdownRow}>
                <View style={styles.breakdownRowTop}>
                  <Text style={styles.breakdownCatName}>{cat.label}</Text>
                  <View style={styles.breakdownValues}>
                    <Text style={styles.breakdownAmount}>
                      {formatCurrency(cat.amount, settings.currency)}
                    </Text>
                    <Text style={styles.breakdownPercent}>
                      {formatPercentage(cat.percentage)}
                    </Text>
                  </View>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(Math.max(cat.percentage, 4), 100)}%`,
                        backgroundColor: theme.colors.primary,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 5. Spending Trend Section */}
      {hasExpenses && (
        <View style={styles.sectionCard}>
          <View style={styles.trendHeader}>
            <Text style={styles.sectionCardTitle}>Spending trend</Text>
            <Text style={styles.trendSubtitle}>Last 4 months</Text>
          </View>

          <View style={styles.trendBarsContainer}>
            {monthlyTrends.map((month) => {
              const heightPercent = Math.max((month.amount / maxMonthAmount) * 100, 6);
              const isCurrentMonth = month.label === monthlyTrends[monthlyTrends.length - 1].label;

              return (
                <View key={month.label} style={styles.trendBarCol}>
                  <Text style={styles.barAmountText}>
                    {month.amount > 0 ? formatCurrency(month.amount, settings.currency) : '-'}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { height: `${heightPercent}%` },
                        isCurrentMonth && styles.barFillActive,
                      ]}
                    />
                  </View>
                  <Text style={[styles.barMonthLabel, isCurrentMonth && styles.barMonthLabelActive]}>
                    {month.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* 6. Recent Activity Section Header */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Recent activity</Text>
        {hasExpenses && (
          <TouchableOpacity
            style={styles.seeAllBtn}
            onPress={() => {
              triggerHaptic();
              onNavigateToExpenses();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllText}>See all</Text>
            <ArrowRight size={13} color={theme.colors.textPrimary} strokeWidth={1.5} />
          </TouchableOpacity>
        )}
      </View>

      {/* 7. Transactions List or Smart Empty State */}
      {hasExpenses ? (
        <View style={styles.expensesList}>
          {recentExpenses.map((expense) => (
            <ExpenseListItem
              key={expense.id}
              expense={expense}
              onEdit={(exp) => openQuickAddModal({ initialExpense: exp })}
              onDelete={(exp) => setDeletingExpense(exp)}
              showDate
            />
          ))}
        </View>
      ) : (
        /* Smart Empty State */
        <View style={styles.smartEmptyCard}>
          <View style={styles.smartEmptyIconWrap}>
            <Receipt size={24} color={theme.colors.textTertiary} strokeWidth={1.5} />
          </View>
          <Text style={styles.smartEmptyTitle}>Ready when you are.</Text>
          <Text style={styles.smartEmptySubtitle}>
            Shake your phone or add your first expense to start seeing your spending insights.
          </Text>

          <TouchableOpacity
            style={styles.addFirstBtn}
            onPress={() => {
              triggerHaptic();
              openQuickAddModal({ triggeredByShake: false });
            }}
            activeOpacity={0.85}
          >
            <Plus size={15} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.addFirstBtnText}>Add your first expense</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        visible={!!deletingExpense}
        title="Delete Expense"
        message={`Are you sure you want to delete "${deletingExpense?.name}"?`}
        confirmText="Delete"
        isDestructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingExpense(null)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    paddingBottom: 110,
  },
  quickShakeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  quickShakeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  quickShakeLeft: {
    flex: 1,
    marginRight: 12,
  },
  quickShakeTitle: {
    ...theme.typography.sectionHeading,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  quickShakeSubtitle: {
    ...theme.typography.secondary,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  quickShakeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: theme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  manualAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.sm,
    height: 40,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  manualAddBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionCardTitle: {
    ...theme.typography.sectionHeading,
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  overviewGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  overviewMetric: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  overviewLabel: {
    ...theme.typography.label,
    fontSize: 9,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  overviewValue: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  breakdownList: {
    gap: 10,
  },
  breakdownRow: {
    gap: 4,
  },
  breakdownRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownCatName: {
    ...theme.typography.body,
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  breakdownValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownAmount: {
    ...theme.typography.body,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  breakdownPercent: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    width: 32,
    textAlign: 'right',
  },
  progressTrack: {
    height: 3,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  trendSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  trendBarsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 110,
    paddingTop: 8,
  },
  trendBarCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barAmountText: {
    ...theme.typography.caption,
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  barTrack: {
    width: 22,
    height: 65,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: theme.colors.border,
    borderRadius: 4,
  },
  barFillActive: {
    backgroundColor: theme.colors.primary,
  },
  barMonthLabel: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginTop: 6,
  },
  barMonthLabelActive: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    ...theme.typography.sectionHeading,
    color: theme.colors.textPrimary,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  seeAllText: {
    ...theme.typography.secondary,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  expensesList: {
    paddingHorizontal: 20,
  },
  smartEmptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    padding: 28,
    marginHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  smartEmptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  smartEmptyTitle: {
    ...theme.typography.sectionHeading,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  smartEmptySubtitle: {
    ...theme.typography.secondary,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  addFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.textPrimary,
    paddingHorizontal: 20,
    height: 42,
    borderRadius: theme.borderRadius.sm,
  },
  addFirstBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
