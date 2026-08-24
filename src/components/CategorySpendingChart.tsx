import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useExpense } from '../context/ExpenseContext';
import { CATEGORIES } from '../constants/categories';
import { CategoryIcon } from './CategoryIcon';
import { formatCurrency } from '../utils/formatters';

export const CategorySpendingChart: React.FC = () => {
  const { categorySpendMap, totalSpending, currency } = useExpense();

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

  if (sortedCategories.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>No category expenses recorded yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>SPENDING BREAKDOWN</Text>

      <View style={styles.breakdownList}>
        {sortedCategories.map((item) => (
          <View key={item.id} style={styles.categoryRow}>
            {/* Category Icon */}
            <CategoryIcon categoryId={item.id} size="sm" />

            <View style={styles.infoWrapper}>
              <View style={styles.labelRow}>
                <Text style={styles.categoryName}>{item.name}</Text>
                <Text style={styles.amountText}>{formatCurrency(item.amount, currency)}</Text>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.max(item.percentage, 4)}%`,
                      backgroundColor: item.color,
                    },
                  ]}
                />
              </View>

              <View style={styles.percentRow}>
                <Text style={styles.percentText}>{item.percentage.toFixed(1)}% of total</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.8,
  },
  emptyCard: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
  },
  breakdownList: {
    gap: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoWrapper: {
    flex: 1,
    gap: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f8fafc',
  },
  amountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#1e293b',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  percentRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  percentText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
  },
});
