import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SectionList,
} from 'react-native';
import { Search, X, Inbox, Calendar } from 'lucide-react-native';
import { useExpenses } from '../context/ExpenseContext';
import { useShake } from '../context/ShakeContext';
import { CategoryType, Expense } from '../types/expense';
import { CATEGORIES } from '../constants/categories';
import { theme } from '../constants/theme';
import { ExpenseListItem } from '../components/ExpenseListItem';
import { ConfirmModal } from '../components/ConfirmModal';
import { formatCurrency, groupExpensesByDate } from '../utils/formatters';

type DateFilterType = 'all' | 'this_month' | 'this_week' | 'last_30_days';

export const AllExpensesScreen: React.FC = () => {
  const { expenses, settings, deleteExpense } = useExpenses();
  const { openQuickAddModal } = useShake();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'All'>('All');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  const filteredExpenses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = startOfToday - 30 * 24 * 60 * 60 * 1000;

    return expenses.filter((exp) => {
      if (query) {
        const matchName = exp.name.toLowerCase().includes(query);
        const matchNotes = exp.notes?.toLowerCase().includes(query) || false;
        const matchAmount = exp.amount.toString().includes(query);
        if (!matchName && !matchNotes && !matchAmount) {
          return false;
        }
      }

      if (selectedCategory !== 'All' && exp.category !== selectedCategory) {
        return false;
      }

      if (dateFilter !== 'all') {
        const expDate = new Date(exp.createdAt);
        const expTime = expDate.getTime();

        if (dateFilter === 'this_month') {
          if (expDate.getFullYear() !== currentYear || expDate.getMonth() !== currentMonth) {
            return false;
          }
        } else if (dateFilter === 'this_week') {
          if (expTime < sevenDaysAgo) {
            return false;
          }
        } else if (dateFilter === 'last_30_days') {
          if (expTime < thirtyDaysAgo) {
            return false;
          }
        }
      }

      return true;
    });
  }, [expenses, searchQuery, selectedCategory, dateFilter]);

  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  }, [filteredExpenses]);

  const groupedSections = useMemo(() => {
    return groupExpensesByDate(filteredExpenses);
  }, [filteredExpenses]);

  const handleDeleteConfirm = async () => {
    if (deletingExpense) {
      await deleteExpense(deletingExpense.id);
      setDeletingExpense(null);
    }
  };

  const hasAnyFilterActive = searchQuery.length > 0 || selectedCategory !== 'All' || dateFilter !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setDateFilter('all');
  };

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={14} color={theme.colors.textSecondary} strokeWidth={1.4} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
              <X size={14} color={theme.colors.textSecondary} strokeWidth={1.4} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Horizontal Scroll Date Filters */}
      <View style={styles.filterScrollWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'this_month', label: 'This Month' },
              { id: 'this_week', label: 'This Week' },
              { id: 'last_30_days', label: '30 Days' },
            ] as const
          ).map((tab) => {
            const isActive = dateFilter === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.pillChip, isActive && styles.pillChipActive]}
                onPress={() => setDateFilter(tab.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pillChipText,
                    isActive && styles.pillChipTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Horizontal Scroll Category Filter Chips (Text-only pills) */}
      <View style={styles.filterScrollWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          <TouchableOpacity
            style={[
              styles.categoryPill,
              selectedCategory === 'All' && styles.categoryPillActive,
            ]}
            onPress={() => setSelectedCategory('All')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.categoryPillText,
                selectedCategory === 'All' && styles.categoryPillTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryPill,
                  isSelected && {
                    backgroundColor: cat.bgColor,
                    borderColor: cat.color,
                  },
                ]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isSelected && { color: cat.color, fontWeight: '600' },
                  ]}
                >
                  {cat.id}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Filter Summary Stats Bar */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryCount}>
          {filteredExpenses.length} {filteredExpenses.length === 1 ? 'item' : 'items'}
        </Text>
        <Text style={styles.summaryTotal}>
          {formatCurrency(filteredTotal, settings.currency)}
        </Text>
      </View>

      {/* Expenses List */}
      {filteredExpenses.length > 0 ? (
        <SectionList
          sections={groupedSections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.itemWrapper}>
              <ExpenseListItem
                expense={item}
                onEdit={(exp) => openQuickAddModal({ initialExpense: exp })}
                onDelete={(exp) => setDeletingExpense(exp)}
              />
            </View>
          )}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Calendar size={11} color={theme.colors.textSecondary} strokeWidth={1.4} />
              <Text style={styles.sectionHeaderText}>{title}</Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        /* Empty State */
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrapper}>
            <Inbox size={26} color={theme.colors.textMuted} strokeWidth={1.4} />
          </View>
          <Text style={styles.emptyTitle}>
            {hasAnyFilterActive ? 'No matches' : 'No expenses'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {hasAnyFilterActive
              ? 'Try changing your search or filters.'
              : 'Shake your phone to add an expense.'}
          </Text>

          {hasAnyFilterActive && (
            <TouchableOpacity
              style={styles.resetPill}
              onPress={resetFilters}
              activeOpacity={0.7}
            >
              <Text style={styles.resetPillText}>Reset</Text>
            </TouchableOpacity>
          )}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textPrimary,
    padding: 0,
  },
  filterScrollWrapper: {
    paddingVertical: 3,
  },
  filterScrollContent: {
    paddingHorizontal: 20,
    gap: 6,
  },
  pillChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pillChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  pillChipTextActive: {
    color: '#FFFFFF',
  },
  categoryPill: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryPillActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  categoryPillText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  categoryPillTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  summaryCount: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  summaryTotal: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 90,
  },
  itemWrapper: {
    marginBottom: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    backgroundColor: theme.colors.background,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingBottom: 80,
  },
  emptyIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
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
    textAlign: 'center',
  },
  resetPill: {
    marginTop: 10,
    paddingVertical: 5,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  resetPillText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.primary,
  },
});
