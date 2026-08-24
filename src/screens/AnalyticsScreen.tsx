import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import {
  TrendingUp,
  PieChart,
  DollarSign,
  Calendar,
  CreditCard,
  Sparkles,
  Zap,
  ArrowUpRight,
} from 'lucide-react-native';
import { useExpense } from '../context/ExpenseContext';
import { CATEGORIES } from '../constants/categories';
import { CategoryIcon } from '../components/CategoryIcon';
import { formatCurrency } from '../utils/formatters';

export const AnalyticsScreen: React.FC = () => {
  const { expenses, totalSpending, currency, categorySpendMap } = useExpense();

  // Metrics calculations
  const totalCount = expenses.length;
  const avgExpense = totalCount > 0 ? totalSpending / totalCount : 0;
  
  const maxExpense = expenses.reduce((max, item) => {
    return item.amount > (max?.amount || 0) ? item : max;
  }, expenses[0] || null);

  // Payment method breakdown
  const paymentBreakdown = expenses.reduce((acc: Record<string, number>, item) => {
    const method = item.paymentMethod || 'Other';
    acc[method] = (acc[method] || 0) + item.amount;
    return acc;
  }, {});

  const sortedCategories = CATEGORIES.map((cat) => {
    const amount = categorySpendMap[cat.id] || 0;
    const percentage = totalSpending > 0 ? (amount / totalSpending) * 100 : 0;
    return {
      ...cat,
      amount,
      percentage,
    };
  })
    .filter((cat) => cat.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Metric Cards */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <View style={styles.metricIconWrap}>
            <TrendingUp size={16} color="#10b981" />
          </View>
          <Text style={styles.metricLabel}>Total Spent</Text>
          <Text style={styles.metricValue}>{formatCurrency(totalSpending, currency)}</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
            <DollarSign size={16} color="#38bdf8" />
          </View>
          <Text style={styles.metricLabel}>Avg. per Entry</Text>
          <Text style={styles.metricValue}>{formatCurrency(avgExpense, currency)}</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(167, 139, 250, 0.15)' }]}>
            <Zap size={16} color="#a78bfa" />
          </View>
          <Text style={styles.metricLabel}>Total Records</Text>
          <Text style={styles.metricValue}>{totalCount} txns</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(251, 146, 60, 0.15)' }]}>
            <ArrowUpRight size={16} color="#fb923c" />
          </View>
          <Text style={styles.metricLabel}>Highest Spend</Text>
          <Text style={styles.metricValue}>
            {maxExpense ? formatCurrency(maxExpense.amount, currency) : formatCurrency(0, currency)}
          </Text>
        </View>
      </View>

      {/* Highest Single Expense Spotlight */}
      {maxExpense && (
        <View style={styles.spotlightCard}>
          <View style={styles.spotlightHeader}>
            <Sparkles size={16} color="#f59e0b" />
            <Text style={styles.spotlightTitle}>HIGHEST SINGLE EXPENSE</Text>
          </View>
          <View style={styles.spotlightBody}>
            <CategoryIcon categoryId={maxExpense.category} size="md" />
            <View style={styles.spotlightInfo}>
              <Text style={styles.spotlightRemark}>{maxExpense.remark}</Text>
              <Text style={styles.spotlightMeta}>
                {new Date(maxExpense.date).toLocaleDateString()} • {maxExpense.paymentMethod || 'UPI'}
              </Text>
            </View>
            <Text style={styles.spotlightAmount}>
              {formatCurrency(maxExpense.amount, currency)}
            </Text>
          </View>
        </View>
      )}

      {/* Category Breakdown Details */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <PieChart size={16} color="#10b981" />
          <Text style={styles.sectionTitle}>ALL CATEGORIES BREAKDOWN</Text>
        </View>

        <View style={styles.categoryList}>
          {sortedCategories.map((item) => (
            <View key={item.id} style={styles.catItem}>
              <CategoryIcon categoryId={item.id} size="md" />
              <View style={styles.catDetails}>
                <View style={styles.catRowTop}>
                  <Text style={styles.catName}>{item.name}</Text>
                  <Text style={styles.catAmount}>{formatCurrency(item.amount, currency)}</Text>
                </View>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${item.percentage}%`, backgroundColor: item.color },
                    ]}
                  />
                </View>
                <Text style={styles.catPercent}>{item.percentage.toFixed(1)}% of expenses</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Payment Method Distribution */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <CreditCard size={16} color="#38bdf8" />
          <Text style={styles.sectionTitle}>PAYMENT METHODS</Text>
        </View>

        <View style={styles.paymentGrid}>
          {Object.entries(paymentBreakdown).map(([method, amt]) => {
            const pct = totalSpending > 0 ? ((amt / totalSpending) * 100).toFixed(0) : '0';
            return (
              <View key={method} style={styles.paymentCard}>
                <Text style={styles.paymentMethodName}>{method}</Text>
                <Text style={styles.paymentMethodAmount}>{formatCurrency(amt, currency)}</Text>
                <Text style={styles.paymentMethodPct}>{pct}% of total</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 90,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#0f172a',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 14,
    gap: 6,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  spotlightCard: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    padding: 14,
    gap: 10,
  },
  spotlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  spotlightTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fbbf24',
    letterSpacing: 0.8,
  },
  spotlightBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  spotlightInfo: {
    flex: 1,
    gap: 2,
  },
  spotlightRemark: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
  },
  spotlightMeta: {
    fontSize: 11,
    color: '#94a3b8',
  },
  spotlightAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f59e0b',
  },
  section: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.8,
  },
  categoryList: {
    gap: 12,
  },
  catItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  catDetails: {
    flex: 1,
    gap: 4,
  },
  catRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f8fafc',
  },
  catAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  barContainer: {
    height: 6,
    backgroundColor: '#1e293b',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  catPercent: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'right',
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  paymentCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 4,
  },
  paymentMethodName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  paymentMethodAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  paymentMethodPct: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});
