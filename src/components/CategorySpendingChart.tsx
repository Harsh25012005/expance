import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useExpenses } from '../context/ExpenseContext';
import { CATEGORIES } from '../constants/categories';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { theme } from '../constants/theme';

export const CategorySpendingChart: React.FC = () => {
  const { stats, settings } = useExpenses();
  const total = stats.totalSpending;

  const activeCategories = CATEGORIES.map((cat) => ({
    ...cat,
    amount: stats.categoryTotals[cat.id] || 0,
    percentage: total > 0 ? ((stats.categoryTotals[cat.id] || 0) / total) * 100 : 0,
  }))
    .filter((cat) => cat.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  if (activeCategories.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Spending by Category</Text>

      {/* Multi-segment distribution bar */}
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

      {/* Category Rows (Clean text only) */}
      <View style={styles.list}>
        {activeCategories.map((cat) => (
          <View key={cat.id} style={styles.categoryRow}>
            <View style={styles.labelContainer}>
              <View style={styles.textRow}>
                <Text style={styles.categoryName}>{cat.label}</Text>
                <Text style={styles.categoryAmount}>
                  {formatCurrency(cat.amount, settings.currency)}
                </Text>
              </View>

              {/* Progress bar */}
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(100, Math.max(2, cat.percentage))}%`,
                      backgroundColor: cat.color,
                    },
                  ]}
                />
              </View>
            </View>

            <Text style={styles.percentageText}>{formatPercentage(cat.percentage)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
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
  list: {
    gap: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelContainer: {
    flex: 1,
  },
  textRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  categoryAmount: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  percentageText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    width: 32,
    textAlign: 'right',
  },
});
