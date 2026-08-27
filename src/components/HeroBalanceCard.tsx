import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingDown, TrendingUp } from 'lucide-react-native';
import { useExpenses } from '../context/ExpenseContext';
import { formatCurrency } from '../utils/formatters';

export const HeroBalanceCard: React.FC = memo(() => {
  const { stats, settings, theme } = useExpenses();
  const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'long' });

  const isIncrease = stats.percentageChange !== null && stats.percentageChange > 0;
  const isDecrease = stats.percentageChange !== null && stats.percentageChange < 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {/* Top Meta Label */}
      <View style={styles.topRow}>
        <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>TOTAL SPENT</Text>
        <Text style={[styles.monthLabel, { color: theme.colors.textTertiary }]}>{currentMonthName}</Text>
      </View>

      {/* Main Big Amount Typography */}
      <View style={styles.amountContainer}>
        <Text style={[styles.amountText, { color: theme.colors.textPrimary }]}>
          {formatCurrency(stats.totalSpending, settings.currency)}
        </Text>
      </View>

      {/* Sub-label & Month-over-Month Comparison */}
      <View style={styles.periodRow}>
        <Text style={[styles.periodText, { color: theme.colors.textSecondary }]}>
          This month: {formatCurrency(stats.thisMonthSpending, settings.currency)}
        </Text>

        {stats.percentageChange !== null && (
          <View style={styles.trendRow}>
            {isIncrease ? (
              <View style={styles.trendBadge}>
                <TrendingUp size={12} color={theme.colors.negative} strokeWidth={2} />
                <Text style={[styles.trendNegativeText, { color: theme.colors.negative }]}>
                  +{Math.abs(Math.round(stats.percentageChange))}% vs last mo
                </Text>
              </View>
            ) : isDecrease ? (
              <View style={styles.trendBadge}>
                <TrendingDown size={12} color={theme.colors.positive} strokeWidth={2} />
                <Text style={[styles.trendPositiveText, { color: theme.colors.positive }]}>
                  -{Math.abs(Math.round(stats.percentageChange))}% vs last mo
                </Text>
              </View>
            ) : (
              <Text style={[styles.trendNeutralText, { color: theme.colors.textSecondary }]}>0% vs last mo</Text>
            )}
          </View>
        )}
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: theme.colors.borderSubtle }]} />

      {/* Bottom Sub-stats Row */}
      <View style={styles.bottomRow}>
        <View style={styles.statCol}>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Transactions</Text>
          <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{stats.totalCount}</Text>
        </View>

        <View style={[styles.verticalDivider, { backgroundColor: theme.colors.borderSubtle }]} />

        <View style={styles.statCol}>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Avg / Expense</Text>
          <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
            {formatCurrency(stats.averageExpense, settings.currency)}
          </Text>
        </View>

        <View style={[styles.verticalDivider, { backgroundColor: theme.colors.borderSubtle }]} />

        <View style={styles.statCol}>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Top Category</Text>
          <Text style={[styles.statValue, { color: theme.colors.textPrimary }]} numberOfLines={1}>
            {stats.topCategory?.category || 'None'}
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 20,
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  monthLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  amountContainer: {
    marginVertical: 4,
  },
  amountText: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  periodText: {
    fontSize: 13,
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
  },
  trendPositiveText: {
    fontSize: 12,
    fontWeight: '600',
  },
  trendNeutralText: {
    fontSize: 12,
  },
  divider: {
    height: 1,
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
    fontSize: 11,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  verticalDivider: {
    width: 1,
    height: 24,
    marginHorizontal: 12,
  },
});
