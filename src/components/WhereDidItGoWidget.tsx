import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { PieChart, ChevronRight, Utensils, Car, ShoppingBag, Zap, Film, HeartPulse, Plane, GraduationCap, MoreHorizontal } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useExpenses } from '../context/ExpenseContext';
import { CATEGORIES } from '../constants/categories';
import { CategoryType } from '../types/expense';
import { formatCurrency } from '../utils/formatters';
import { theme } from '../constants/theme';

interface WhereDidItGoWidgetProps {
  onOpenBreakdown: () => void;
}

export const WhereDidItGoWidget: React.FC<WhereDidItGoWidgetProps> = ({ onOpenBreakdown }) => {
  const { expenses, settings } = useExpenses();

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

  const renderCategoryIcon = (catId: CategoryType, color: string) => {
    switch (catId) {
      case 'Food':
        return <Utensils size={13} color={color} strokeWidth={1.75} />;
      case 'Transport':
        return <Car size={13} color={color} strokeWidth={1.75} />;
      case 'Shopping':
        return <ShoppingBag size={13} color={color} strokeWidth={1.75} />;
      case 'Bills':
        return <Zap size={13} color={color} strokeWidth={1.75} />;
      case 'Entertainment':
        return <Film size={13} color={color} strokeWidth={1.75} />;
      case 'Health':
        return <HeartPulse size={13} color={color} strokeWidth={1.75} />;
      case 'Travel':
        return <Plane size={13} color={color} strokeWidth={1.75} />;
      case 'Education':
        return <GraduationCap size={13} color={color} strokeWidth={1.75} />;
      case 'Other':
      default:
        return <MoreHorizontal size={13} color={color} strokeWidth={1.75} />;
    }
  };

  return (
    <View style={styles.widgetContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Where did it go?</Text>
          <Text style={styles.totalSpentText}>
            {formatCurrency(totalMonthSpent, settings.currency)} spent this month
          </Text>
        </View>

        <TouchableOpacity
          style={styles.viewBtn}
          onPress={() => {
            triggerHaptic();
            onOpenBreakdown();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.viewBtnText}>View breakdown</Text>
          <ChevronRight size={13} color={theme.colors.primary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Multi-segment horizontal indicator bar */}
      {topCategories.length > 0 ? (
        <>
          <View style={styles.multiBarTrack}>
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
                  <Text style={styles.catName}>{cat.label}</Text>
                </View>
                <Text style={styles.catAmount}>
                  {formatCurrency(cat.amount, settings.currency)}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <Text style={styles.emptyText}>Add expenses to see your spending breakdown.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  widgetContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    ...theme.typography.sectionHeading,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  totalSpentText: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.colors.accentLight,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  viewBtnText: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  multiBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.backgroundSecondary,
    flexDirection: 'row',
    overflow: 'hidden',
    gap: 2,
    marginBottom: 12,
  },
  multiBarSegment: {
    height: '100%',
    borderRadius: 2,
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
    borderRadius: 3.5,
  },
  catName: {
    ...theme.typography.body,
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  catAmount: {
    ...theme.typography.body,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  emptyText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
});
