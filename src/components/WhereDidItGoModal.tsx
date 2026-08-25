import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaPage } from './SafeAreaPage';
import {
  X,
  PieChart,
  ChevronDown,
  ChevronUp,
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
import * as Haptics from 'expo-haptics';
import { useExpenses } from '../context/ExpenseContext';
import { useShake } from '../context/ShakeContext';
import { CATEGORIES } from '../constants/categories';
import { CategoryType, Expense } from '../types/expense';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { getMonthName, toLocalDateString } from '../utils/analyticsHelpers';
import { theme } from '../constants/theme';
import { ExpenseListItem } from './ExpenseListItem';

interface WhereDidItGoModalProps {
  visible: boolean;
  onClose: () => void;
}

export const WhereDidItGoModal: React.FC<WhereDidItGoModalProps> = ({ visible, onClose }) => {
  const { expenses, settings, deleteExpense } = useExpenses();
  const { openQuickAddModal } = useShake();
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(null);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentMonthName = getMonthName(currentMonth);

  // Current month expenses only
  const monthExpenses = expenses.filter((exp) => {
    const d = new Date(exp.createdAt);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  const totalMonthSpent = monthExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

  // Category breakdown
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

  const activeCategories = CATEGORIES.map((cat) => ({
    ...cat,
    amount: categoryTotals[cat.id] || 0,
    percentage: totalMonthSpent > 0 ? (categoryTotals[cat.id] / totalMonthSpent) * 100 : 0,
  }))
    .filter((cat) => cat.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
  };

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

  // Filtered transactions for selected drill-down category
  const filteredCategoryExpenses = selectedCategory
    ? monthExpenses.filter((exp) => exp.category === selectedCategory)
    : [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaPage topSpacing={6} bottomSpacing={16}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconCircle}>
              <PieChart size={18} color={theme.colors.primary} strokeWidth={1.5} />
            </View>
            <View>
              <Text style={styles.title}>Where did it go?</Text>
              <Text style={styles.subtitle}>{currentMonthName} spending breakdown</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.7}
            accessibilityLabel="Close"
          >
            <X size={18} color={theme.colors.textPrimary} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Total Spent Banner */}
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>TOTAL SPENT IN {currentMonthName.toUpperCase()}</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(totalMonthSpent, settings.currency)}
            </Text>
            <Text style={styles.totalSubtext}>
              {monthExpenses.length} {monthExpenses.length === 1 ? 'transaction' : 'transactions'} across {activeCategories.length} {activeCategories.length === 1 ? 'category' : 'categories'}
            </Text>
          </View>

          {activeCategories.length > 0 ? (
            <View style={styles.categoriesSection}>
              <Text style={styles.sectionHeading}>Category Breakdown</Text>
              <Text style={styles.sectionSub}>Tap a category to see its transactions</Text>

              <View style={styles.categoryList}>
                {activeCategories.map((cat) => {
                  const isSelected = selectedCategory === cat.id;

                  return (
                    <View key={cat.id} style={styles.categoryWrapper}>
                      <TouchableOpacity
                        style={[
                          styles.categoryCard,
                          isSelected && styles.categoryCardSelected,
                        ]}
                        onPress={() => {
                          triggerHaptic();
                          setSelectedCategory(isSelected ? null : cat.id);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.catRowTop}>
                          <View style={styles.catLeft}>
                            <View style={[styles.catIconWrap, { backgroundColor: cat.bgColor }]}>
                              {renderCategoryIcon(cat.id, 15, cat.color)}
                            </View>
                            <View>
                              <Text style={styles.catLabel}>{cat.label}</Text>
                              <Text style={styles.catPercent}>
                                {cat.label} — {formatPercentage(cat.percentage)}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.catRight}>
                            <Text style={styles.catAmount}>
                              {formatCurrency(cat.amount, settings.currency)}
                            </Text>
                            {isSelected ? (
                              <ChevronUp size={14} color={theme.colors.textSecondary} strokeWidth={1.5} />
                            ) : (
                              <ChevronDown size={14} color={theme.colors.textSecondary} strokeWidth={1.5} />
                            )}
                          </View>
                        </View>

                        {/* Progress Bar */}
                        <View style={styles.track}>
                          <View
                            style={[
                              styles.fill,
                              {
                                width: `${Math.min(Math.max(cat.percentage, 4), 100)}%`,
                                backgroundColor: cat.color || theme.colors.primary,
                              },
                            ]}
                          />
                        </View>
                      </TouchableOpacity>

                      {/* Drill-down transactions */}
                      {isSelected && (
                        <View style={styles.drillDownBox}>
                          <Text style={styles.drillDownHeading}>
                            {filteredCategoryExpenses.length} {filteredCategoryExpenses.length === 1 ? 'transaction' : 'transactions'} in {cat.label}
                          </Text>
                          {filteredCategoryExpenses.map((exp) => (
                            <ExpenseListItem
                              key={exp.id}
                              expense={exp}
                              onEdit={(item) => openQuickAddModal({ initialExpense: item })}
                              onDelete={() => deleteExpense(exp.id)}
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <PieChart size={24} color={theme.colors.textTertiary} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>No expenses this month</Text>
              <Text style={styles.emptySubtitle}>
                Add expenses to see your spending breakdown across categories.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaPage>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: theme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...theme.typography.sectionHeading,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  totalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
    alignItems: 'center',
  },
  totalLabel: {
    ...theme.typography.label,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  totalValue: {
    ...theme.typography.display,
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  totalSubtext: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  categoriesSection: {
    marginBottom: 10,
  },
  sectionHeading: {
    ...theme.typography.sectionHeading,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  sectionSub: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 14,
  },
  categoryList: {
    gap: 10,
  },
  categoryWrapper: {
    borderRadius: theme.borderRadius.container,
    overflow: 'hidden',
  },
  categoryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#F8FAFC',
  },
  catRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  catIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catLabel: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  catPercent: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  catRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catAmount: {
    ...theme.typography.body,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  track: {
    height: 4,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  drillDownBox: {
    backgroundColor: theme.colors.backgroundSecondary,
    padding: 12,
    borderBottomLeftRadius: theme.borderRadius.container,
    borderBottomRightRadius: theme.borderRadius.container,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  drillDownHeading: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    ...theme.typography.sectionHeading,
    fontSize: 15,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 240,
  },
});
