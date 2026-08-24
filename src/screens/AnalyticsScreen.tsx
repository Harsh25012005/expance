import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import {
  TrendingUp,
  PieChart,
  Calendar,
  Wallet,
  Award,
  BarChart3,
  Inbox,
} from 'lucide-react-native';
import { useExpenses } from '../context/ExpenseContext';
import { CATEGORIES } from '../constants/categories';
import { theme } from '../constants/theme';
import { formatCurrency, formatPercentage } from '../utils/formatters';

export const AnalyticsScreen: React.FC = () => {
  const { stats, settings, expenses } = useExpenses();
  const hasExpenses = expenses.length > 0;

  const activeCategories = CATEGORIES.map((cat) => ({
    ...cat,
    amount: stats.categoryTotals[cat.id] || 0,
    percentage: stats.totalSpending > 0 ? ((stats.categoryTotals[cat.id] || 0) / stats.totalSpending) * 100 : 0,
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
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
      </View>

      {hasExpenses ? (
        <>
          {/* Summary Overview Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={[styles.metricIconCircle, { backgroundColor: theme.colors.primaryLight }]}>
                <Wallet size={15} color={theme.colors.primary} strokeWidth={1.4} />
              </View>
              <Text style={styles.metricLabel}>Total</Text>
              <Text style={styles.metricValue}>
                {formatCurrency(stats.totalSpending, settings.currency)}
              </Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIconCircle, { backgroundColor: '#ECFDF5' }]}>
                <Calendar size={15} color="#059669" strokeWidth={1.4} />
              </View>
              <Text style={styles.metricLabel}>This Month</Text>
              <Text style={styles.metricValue}>
                {formatCurrency(stats.thisMonthSpending, settings.currency)}
              </Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIconCircle, { backgroundColor: '#FFFBEB' }]}>
                <TrendingUp size={15} color="#D97706" strokeWidth={1.4} />
              </View>
              <Text style={styles.metricLabel}>Average</Text>
              <Text style={styles.metricValue}>
                {formatCurrency(stats.averageExpense, settings.currency)}
              </Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIconCircle, { backgroundColor: '#FDF2F8' }]}>
                <Award size={15} color="#DB2777" strokeWidth={1.4} />
              </View>
              <Text style={styles.metricLabel}>Top Category</Text>
              <Text style={styles.metricValue} numberOfLines={1}>
                {stats.topCategory?.category || 'None'}
              </Text>
            </View>
          </View>

          {/* Monthly Trend Visualizer */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <BarChart3 size={15} color={theme.colors.primary} strokeWidth={1.4} />
              <Text style={styles.cardTitle}>Monthly Trends</Text>
            </View>

            <View style={styles.chartRow}>
              {monthlyTrends.map((item, idx) => {
                const heightPercent = maxMonthAmount > 0 ? (item.amount / maxMonthAmount) * 100 : 0;
                const isCurrent = idx === monthlyTrends.length - 1;

                return (
                  <View key={item.label} style={styles.chartCol}>
                    <Text style={styles.barAmountText}>
                      {item.amount > 0 ? `${settings.currency}${Math.round(item.amount)}` : '$0'}
                    </Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${Math.max(6, heightPercent)}%`,
                            backgroundColor: isCurrent ? theme.colors.primary : '#93C5FD',
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.barLabelText,
                        isCurrent && styles.barLabelCurrent,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Category Breakdown */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <PieChart size={15} color={theme.colors.primary} strokeWidth={1.4} />
              <Text style={styles.cardTitle}>Categories</Text>
            </View>

            {/* Segmented Bar */}
            <View style={styles.segmentedBar}>
              {activeCategories.map((cat) => (
                <View
                  key={cat.id}
                  style={[
                    styles.barSegment,
                    {
                      flex: cat.percentage,
                      backgroundColor: cat.color,
                    },
                  ]}
                />
              ))}
            </View>

            {/* Categories List (Text only) */}
            <View style={styles.categoriesList}>
              {activeCategories.map((cat) => (
                <View key={cat.id} style={styles.categoryItem}>
                  <View style={styles.catInfoCol}>
                    <View style={styles.catNameRow}>
                      <Text style={styles.catLabel}>{cat.label}</Text>
                      <Text style={styles.catAmount}>
                        {formatCurrency(cat.amount, settings.currency)}
                      </Text>
                    </View>

                    <View style={styles.catTrack}>
                      <View
                        style={[
                          styles.catFill,
                          {
                            width: `${Math.min(100, Math.max(3, cat.percentage))}%`,
                            backgroundColor: cat.color,
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <Text style={styles.catPercent}>{formatPercentage(cat.percentage)}</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      ) : (
        /* Empty State */
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Inbox size={32} color={theme.colors.textMuted} strokeWidth={1.4} />
          </View>
          <Text style={styles.emptyTitle}>No analytics yet</Text>
          <Text style={styles.emptyDescription}>
            Spending trends will appear here when you record expenses.
          </Text>
        </View>
      )}

      <View style={{ height: 80 }} />
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
    paddingTop: 10,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: 16,
  },
  chartCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barAmountText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  barTrack: {
    width: 20,
    height: 70,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
  },
  barLabelText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 6,
  },
  barLabelCurrent: {
    fontWeight: '600',
    color: theme.colors.primary,
  },
  segmentedBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    marginBottom: 12,
  },
  barSegment: {
    height: '100%',
  },
  categoriesList: {
    gap: 10,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catInfoCol: {
    flex: 1,
  },
  catNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  catLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  catAmount: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  catTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  catFill: {
    height: '100%',
    borderRadius: 2,
  },
  catPercent: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    width: 32,
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  emptyDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
