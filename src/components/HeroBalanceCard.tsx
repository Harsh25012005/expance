import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown, Calendar, Wallet } from 'lucide-react-native';
import { theme } from '../constants/theme';
import { useExpenses } from '../context/ExpenseContext';
import { formatCurrency } from '../utils/formatters';

export const HeroBalanceCard: React.FC = () => {
  const { stats, settings } = useExpenses();
  const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'short' });

  const hasExpenses = stats.totalCount > 0;
  const isIncrease = stats.percentageChange !== null && stats.percentageChange > 0;
  const isDecrease = stats.percentageChange !== null && stats.percentageChange < 0;

  return (
    <View style={styles.container}>
      {/* Top Meta Row */}
      <View style={styles.topRow}>
        <View style={styles.periodPill}>
          <Calendar size={12} color={theme.colors.primary} strokeWidth={1.4} />
          <Text style={styles.periodText}>{currentMonthName}</Text>
        </View>

        <View style={styles.transactionPill}>
          <Wallet size={12} color={theme.colors.textSecondary} strokeWidth={1.4} />
          <Text style={styles.transactionText}>
            {stats.totalCount} {stats.totalCount === 1 ? 'txn' : 'txns'}
          </Text>
        </View>
      </View>

      {/* Main Amount */}
      <View style={styles.amountContainer}>
        <Text style={styles.amountText}>
          {formatCurrency(stats.thisMonthSpending, settings.currency)}
        </Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Bottom Trend & Top Category Row */}
      <View style={styles.bottomRow}>
        {stats.percentageChange !== null ? (
          <View style={styles.trendRow}>
            {isIncrease ? (
              <View style={[styles.trendPill, styles.trendUp]}>
                <TrendingUp size={11} color={theme.colors.danger} strokeWidth={1.4} />
                <Text style={styles.trendUpText}>
                  +{Math.abs(Math.round(stats.percentageChange))}%
                </Text>
              </View>
            ) : isDecrease ? (
              <View style={[styles.trendPill, styles.trendDown]}>
                <TrendingDown size={11} color={theme.colors.success} strokeWidth={1.4} />
                <Text style={styles.trendDownText}>
                  -{Math.abs(Math.round(stats.percentageChange))}%
                </Text>
              </View>
            ) : (
              <View style={[styles.trendPill, styles.trendNeutral]}>
                <Text style={styles.trendNeutralText}>0%</Text>
              </View>
            )}
            <Text style={styles.comparisonText}>vs last mo</Text>
          </View>
        ) : (
          <Text style={styles.comparisonText}>
            {hasExpenses ? 'This month' : 'No spending'}
          </Text>
        )}

        {stats.topCategory && (
          <View style={styles.topCategoryPill}>
            <Text style={styles.topCategoryLabel}>Top: </Text>
            <Text style={styles.topCategoryValue}>{stats.topCategory.category}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  periodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    gap: 4,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  periodText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  transactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  transactionText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  amountContainer: {
    marginVertical: 2,
  },
  amountText: {
    fontSize: 30,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    letterSpacing: -0.6,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 999,
    gap: 2,
  },
  trendUp: {
    backgroundColor: theme.colors.dangerLight,
  },
  trendUpText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.danger,
  },
  trendDown: {
    backgroundColor: theme.colors.successLight,
  },
  trendDownText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.success,
  },
  trendNeutral: {
    backgroundColor: '#F1F5F9',
  },
  trendNeutralText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  comparisonText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  topCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topCategoryLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  topCategoryValue: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
});
