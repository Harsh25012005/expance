import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useExpenses } from '../context/ExpenseContext';
import { CATEGORIES } from '../constants/categories';
import { CategoryType } from '../types/expense';
import { formatCurrency } from '../utils/formatters';

interface WhereDidItGoWidgetProps {
  onOpenBreakdown: () => void;
}

export const WhereDidItGoWidget: React.FC<WhereDidItGoWidgetProps> = memo(({ onOpenBreakdown }) => {
  const { expenses, settings, theme } = useExpenses();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Current month expenses only
  const monthExpenses = expenses.filter((exp) => {
    const d = new Date(exp.createdAt);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  const totalMonthSpent = monthExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

  const categoryTotals: Record<CategoryType, number> = {
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

  for (const exp of monthExpenses) {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + (Number(exp.amount) || 0);
  }

  const topCategories = CATEGORIES.map((cat) => ({
    ...cat,
    amount: categoryTotals[cat.id] || 0,
    percentage: totalMonthSpent > 0 ? (categoryTotals[cat.id] / totalMonthSpent) * 100 : 0,
  }))
    .filter((cat) => cat.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
  };

  return (
    <View style={[styles.widgetContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Where did it go?</Text>
          <Text style={[styles.totalSpentText, { color: theme.colors.textSecondary }]}>
            {formatCurrency(totalMonthSpent, settings.currency)} spent this month
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.viewBtn, { backgroundColor: theme.colors.accentLight }]}
          onPress={() => {
            triggerHaptic();
            onOpenBreakdown();
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.viewBtnText, { color: theme.colors.primary }]}>Breakdown</Text>
          <ChevronRight size={13} color={theme.colors.primary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Multi-segment horizontal indicator bar */}
      {topCategories.length > 0 ? (
        <>
          <View style={[styles.multiBarTrack, { backgroundColor: theme.colors.backgroundSecondary }]}>
            {topCategories.map((cat) => (
              <View
                key={cat.id}
                style={[
                  styles.multiBarSegment,
                  {
                    flex: Math.max(cat.percentage, 5),
                    backgroundColor: cat.color || theme.colors.primary,
                  },
                ]}
              />
            ))}
          </View>

          {/* Top 3 Categories Rows */}
          <View style={styles.categoryRows}>
            {topCategories.map((cat) => (
              <View key={cat.id} style={styles.catRow}>
                <View style={styles.catLeft}>
                  <View style={[styles.dot, { backgroundColor: cat.color || theme.colors.primary }]} />
                  <Text style={[styles.catName, { color: theme.colors.textPrimary }]}>{cat.label}</Text>
                </View>
                <Text style={[styles.catAmount, { color: theme.colors.textPrimary }]}>
                  {formatCurrency(cat.amount, settings.currency)}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>Add expenses to see your spending breakdown.</Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  widgetContainer: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  totalSpentText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  viewBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  multiBarTrack: {
    height: 6,
    borderRadius: 9999,
    flexDirection: 'row',
    overflow: 'hidden',
    gap: 2,
    marginBottom: 12,
  },
  multiBarSegment: {
    height: '100%',
    borderRadius: 9999,
  },
  categoryRows: {
    gap: 8,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 9999,
  },
  catName: {
    fontSize: 13,
    fontWeight: '500',
  },
  catAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
});
