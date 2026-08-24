import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingDown, TrendingUp, Calendar, Receipt } from 'lucide-react-native';
import { useExpenses } from '../context/ExpenseContext';
import { formatCurrency } from '../utils/formatters';
import { theme } from '../constants/theme';

export const HeroBalanceCard: React.FC = () => {
  const { stats, settings } = useExpenses();
  const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'long' });

  const hasExpenses = stats.totalCount > 0;
  const isIncrease = stats.percentageChange !== null && stats.percentageChange > 0;
  const isDecrease = stats.percentageChange !== null && stats.percentageChange < 0;

  return (
    <View style={styles.container}>
      {/* Top Meta Label */}
      <View style={styles.topRow}>
        <Text style={styles.cardLabel}>TOTAL SPENT</Text>
        <Text style={styles.monthLabel}>{currentMonthName}</Text>
      </View>

      {/* Main Big Amount Typography */}
      <View style={styles.amountContainer}>
        <Text style={styles.amountText}>
          {formatCurrency(stats.totalSpending, settings.currency)}
        </Text>
      </View>

      {/* Sub-label & Month-over-Month Comparison */}
      <View style={styles.periodRow}>
        <Text style={styles.periodText}>This month: {formatCurrency(stats.thisMonthSpending, settings.currency)}</Text>

        {stats.percentageChange !== null && (
          <View style={styles.trendRow}>
            {isIncrease ? (
              <View style={styles.trendBadge}>
                <TrendingUp size={12} color={theme.colors.negative} strokeWidth={2} />
                <Text style={styles.trendNegativeText}>
                  +{Math.abs(Math.round(stats.percentageChange))}% vs last mo
                </Text>
              </View>
            ) : isDecrease ? (
              <View style={styles.trendBadge}>
                <TrendingDown size={12} color={theme.colors.positive} strokeWidth={2} />
                <Text style={styles.trendPositiveText}>
                  -{Math.abs(Math.round(stats.percentageChange))}% vs last mo
                </Text>
              </View>
            ) : (
              <Text style={styles.trendNeutralText}>0% vs last mo</Text>
            )}
          </View>
        )}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Bottom Sub-stats Row */}
      <View style={styles.bottomRow}>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Transactions</Text>
          <Text style={styles.statValue}>{stats.totalCount}</Text>
        </View>

        <View style={styles.verticalDivider} />

        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Avg / Expense</Text>
          <Text style={styles.statValue}>
            {formatCurrency(stats.averageExpense, settings.currency)}
          </Text>
        </View>

        <View style={styles.verticalDivider} />

        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Top Category</Text>
          <Text style={styles.statValue} numberOfLines={1}>
            {stats.topCategory?.category || 'None'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardLabel: {
    ...theme.typography.label,
    color: theme.colors.textSecondary,
  },
  monthLabel: {
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
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  periodText: {
    ...theme.typography.secondary,
    color: theme.colors.textSecondary,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    color: theme.colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderSubtle,
    marginVertical: 16,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statCol: {
    flex: 1,
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    ...theme.typography.bodyLarge,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  verticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.borderSubtle,
    marginHorizontal: 12,
  },
});
