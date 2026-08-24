import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  ArrowRight,
  Inbox,
  Plus,
} from 'lucide-react-native';
import { useExpenses } from '../context/ExpenseContext';
import { useShake } from '../context/ShakeContext';
import { theme } from '../constants/theme';
import { HeroBalanceCard } from '../components/HeroBalanceCard';
import { ExpenseListItem } from '../components/ExpenseListItem';
import { ConfirmModal } from '../components/ConfirmModal';
import { Expense } from '../types/expense';
import { CATEGORIES } from '../constants/categories';
import { formatCurrency } from '../utils/formatters';

interface HomeScreenProps {
  onNavigateToExpenses: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateToExpenses }) => {
  const { expenses, stats, settings, deleteExpense } = useExpenses();
  const { openQuickAddModal } = useShake();

  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  const recentExpenses = expenses.slice(0, 6);
  const hasExpenses = expenses.length > 0;

  const handleDeleteConfirm = async () => {
    if (deletingExpense) {
      await deleteExpense(deletingExpense.id);
      setDeletingExpense(null);
    }
  };

  const activeCategories = CATEGORIES.map((cat) => ({
    ...cat,
    amount: stats.categoryTotals[cat.id] || 0,
  })).filter((cat) => cat.amount > 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Monthly Total Card */}
      <HeroBalanceCard />

      {/* Horizontal Scroll Category Chips (Clean text pills) */}
      {hasExpenses && activeCategories.length > 0 && (
        <View style={styles.categoryScrollSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollContent}
          >
            {activeCategories.map((cat) => (
              <View
                key={cat.id}
                style={[
                  styles.categoryPill,
                  { backgroundColor: cat.bgColor, borderColor: '#E2E8F0' },
                ]}
              >
                <Text style={[styles.categoryPillName, { color: cat.color }]}>{cat.id}</Text>
                <Text style={styles.categoryPillAmount}>
                  {formatCurrency(cat.amount, settings.currency)}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Recent Transactions Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent</Text>
        {hasExpenses && (
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={onNavigateToExpenses}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllText}>See all</Text>
            <ArrowRight size={12} color={theme.colors.primary} strokeWidth={1.4} />
          </TouchableOpacity>
        )}
      </View>

      {/* Transactions List or Clean Empty State */}
      {hasExpenses ? (
        <View style={styles.expensesList}>
          {recentExpenses.map((item) => (
            <ExpenseListItem
              key={item.id}
              expense={item}
              onEdit={(exp) => openQuickAddModal({ initialExpense: exp })}
              onDelete={(exp) => setDeletingExpense(exp)}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyIconCircle}>
            <Inbox size={26} color={theme.colors.textMuted} strokeWidth={1.4} />
          </View>
          <Text style={styles.emptyTitle}>No expenses yet</Text>
          <Text style={styles.emptySubtitle}>
            Shake phone or tap below to add
          </Text>
          <TouchableOpacity
            style={styles.emptyAddPill}
            onPress={() => openQuickAddModal({ triggeredByShake: false })}
            activeOpacity={0.8}
          >
            <Plus size={14} color="#FFFFFF" strokeWidth={1.5} />
            <Text style={styles.emptyAddPillText}>Add Expense</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        visible={!!deletingExpense}
        title="Delete Expense"
        message={`Delete "${deletingExpense?.name}"?`}
        confirmLabel="Delete"
        isDestructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingExpense(null)}
      />

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
    paddingBottom: 20,
  },
  categoryScrollSection: {
    marginBottom: 10,
  },
  categoryScrollContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    gap: 6,
  },
  categoryPillName: {
    fontSize: 11,
    fontWeight: '600',
  },
  categoryPillAmount: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  expensesList: {
    paddingHorizontal: 20,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  emptySubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  emptyAddPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    gap: 4,
  },
  emptyAddPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
});
