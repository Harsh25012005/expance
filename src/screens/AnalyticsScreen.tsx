import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import {
  Wallet,
  Calendar,
  TrendingUp,
  PieChart,
  Award,
  BarChart3,
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
import { useExpenses } from '../context/ExpenseContext';
import { CATEGORIES } from '../constants/categories';
import { CategoryType } from '../types/expense';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { theme } from '../constants/theme';

export const AnalyticsScreen: React.FC = () => {
  const { stats, settings, expenses } = useExpenses();
  const hasExpenses = expenses.length > 0;

  const renderCategoryIcon = (catId: CategoryType, size: number = 14, color: string = theme.colors.textPrimary) => {
    switch (catId) {
      case 'Food':
        return <Utensils size={size} color={color} strokeWidth={1.5} />;
      case 'Transport':
        return <Car size={size} color={color} strokeWidth={1.5} />;
      case 'Shopping':
        return <ShoppingBag size={size} color={color} strokeWidth={1.5} />;
      case 'Bills':
        return <Zap size={size} color={color} strokeWidth={1.5} />;
      case 'Entertainment':
        return <Film size={size} color={color} strokeWidth={1.5} />;
      case 'Health':
        return <HeartPulse size={size} color={color} strokeWidth={1.5} />;
      case 'Travel':
        return <Plane size={size} color={color} strokeWidth={1.5} />;
      case 'Education':
        return <GraduationCap size={size} color={color} strokeWidth={1.5} />;
      case 'Other':
      default:
        return <MoreHorizontal size={size} color={color} strokeWidth={1.5} />;
    }
  };

  const activeCategories = CATEGORIES.map((cat) => ({
    ...cat,
    amount: stats.categoryTotals[cat.id] || 0,
    percentage:
      stats.totalSpending > 0
        ? ((stats.categoryTotals[cat.id] || 0) / stats.totalSpending) * 100
        : 0,
  }))
    .filter((cat) => cat.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const monthlyTrends = React.useMemo(() => {
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {hasExpenses ? (
        <>
          {/* 1. Metric Overview Cards */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>TOTAL SPENT</Text>
              <Text style={styles.metricValue}>
                {formatCurrency(stats.totalSpending, settings.currency)}
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>THIS MONTH</Text>
              <Text style={styles.metricValue}>
                {formatCurrency(stats.thisMonthSpending, settings.currency)}
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>AVG / TRANSACTION</Text>
              <Text style={styles.metricValue}>
                {formatCurrency(stats.averageExpense, settings.currency)}
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>TOP CATEGORY</Text>
              <Text style={styles.metricValue} numberOfLines={1}>
                {stats.topCategory?.category || 'None'}
              </Text>
            </View>
          </View>

          {/* 2. Spending Trend Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Spending trend</Text>
              <Text style={styles.cardSubtitle}>Last 4 months</Text>
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

          {/* 3. Top Categories Ranking */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Top categories</Text>
              <Text style={styles.cardSubtitle}>{activeCategories.length} active</Text>
            </View>

            <View style={styles.categoriesList}>
              {activeCategories.map((cat, idx) => (
                <View key={cat.id} style={styles.categoryRow}>
                  <View style={styles.categoryRowTop}>
                    <View style={styles.catLeft}>
                      <Text style={styles.catRank}>#{idx + 1}</Text>
                      <View style={[styles.catIconCircle, { backgroundColor: cat.bgColor }]}>
                        {renderCategoryIcon(cat.id, 14, cat.color)}
                      </View>
                      <Text style={styles.catName}>{cat.label}</Text>
                    </View>
                    <View style={styles.catRight}>
                      <Text style={styles.catAmount}>
                        {formatCurrency(cat.amount, settings.currency)}
                      </Text>
                      <Text style={styles.catPercent}>
                        {formatPercentage(cat.percentage)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
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
        </>
      ) : (
        /* Empty State */
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <PieChart size={24} color={theme.colors.textTertiary} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>Not enough data yet</Text>
          <Text style={styles.emptySubtitle}>
            Add a few expenses to see your spending insights, category breakdown, and monthly trends.
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 110,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  metricLabel: {
    ...theme.typography.label,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  metricValue: {
    ...theme.typography.sectionHeading,
    color: theme.colors.textPrimary,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitle: {
    ...theme.typography.sectionHeading,
    color: theme.colors.textPrimary,
  },
  cardSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  trendBarsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 130,
    paddingTop: 10,
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
    marginBottom: 6,
  },
  barTrack: {
    width: 24,
    height: 80,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: theme.colors.border,
    borderRadius: 6,
  },
  barFillActive: {
    backgroundColor: theme.colors.primary,
  },
  barMonthLabel: {
    ...theme.typography.caption,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginTop: 6,
  },
  barMonthLabelActive: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  categoriesList: {
    gap: 12,
  },
  categoryRow: {
    gap: 6,
  },
  categoryRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catRank: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.textTertiary,
    width: 18,
  },
  catIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: {
    ...theme.typography.body,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  catRight: {
    alignItems: 'flex-end',
  },
  catAmount: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  catPercent: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 12,
  },
  emptyIconCircle: {
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
  emptyTitle: {
    ...theme.typography.sectionHeading,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    ...theme.typography.secondary,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
