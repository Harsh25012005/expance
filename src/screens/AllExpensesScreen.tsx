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
import { Search, X, Receipt, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useExpenses } from '../context/ExpenseContext';
import { useShake } from '../context/ShakeContext';
import { CategoryType, Expense } from '../types/expense';
import { CATEGORIES } from '../constants/categories';
import { ExpenseListItem } from '../components/ExpenseListItem';
import { ConfirmModal } from '../components/ConfirmModal';
import { formatCurrency, groupExpensesByDate } from '../utils/formatters';
import { theme } from '../constants/theme';

export const AllExpensesScreen: React.FC = () => {
  const { expenses, settings, deleteExpense } = useExpenses();
  const { openQuickAddModal } = useShake();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'All'>('All');
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
  };

  const filteredExpenses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

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

      return true;
    });
  }, [expenses, searchQuery, selectedCategory]);

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

  const hasFilterActive = searchQuery.length > 0 || selectedCategory !== 'All';

  return (
    <View style={styles.container}>
      {/* 1. Header Information */}
      <View style={styles.headerInfoRow}>
        <Text style={styles.headerCount}>
          {expenses.length} {expenses.length === 1 ? 'transaction' : 'transactions'}
        </Text>
        <Text style={styles.headerTotal}>
          Total: {formatCurrency(filteredTotal, settings.currency)}
        </Text>
      </View>

      {/* 2. Minimalist Search Input */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={15} color={theme.colors.textTertiary} strokeWidth={1.5} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or amount..."
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                triggerHaptic();
                setSearchQuery('');
              }}
              activeOpacity={0.7}
              style={styles.clearBtn}
            >
              <X size={14} color={theme.colors.textSecondary} strokeWidth={1.5} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 3. Horizontal Category Filters */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <TouchableOpacity
            style={[styles.filterPill, selectedCategory === 'All' && styles.filterPillActive]}
            onPress={() => {
              triggerHaptic();
              setSelectedCategory('All');
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterPillText,
                selectedCategory === 'All' && styles.filterPillTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => {
                  triggerHaptic();
                  setSelectedCategory(cat.id);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isActive && styles.filterPillTextActive,
                  ]}
                >
                  {cat.id}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 4. Grouped Expenses List or Empty State */}
      {filteredExpenses.length > 0 ? (
        <SectionList
          sections={groupedSections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ExpenseListItem
              expense={item}
              onEdit={(exp) => openQuickAddModal({ initialExpense: exp })}
              onDelete={(exp) => setDeletingExpense(exp)}
            />
          )}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.dateHeaderWrap}>
              <Text style={styles.dateHeaderText}>{title}</Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Receipt size={24} color={theme.colors.textTertiary} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>
            {hasFilterActive ? 'No matching expenses' : 'No expenses recorded'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {hasFilterActive
              ? 'Try changing your search terms or filter.'
              : 'Shake your phone or tap below to record an expense.'}
          </Text>
          {hasFilterActive ? (
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => {
                triggerHaptic();
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.resetBtnText}>Clear Filters</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => {
                triggerHaptic();
                openQuickAddModal({ triggeredByShake: false });
              }}
              activeOpacity={0.85}
            >
              <Plus size={15} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.addBtnText}>Add Expense</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        visible={!!deletingExpense}
        title="Delete Expense"
        message={`Are you sure you want to delete "${deletingExpense?.name}"?`}
        confirmText="Delete"
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
  headerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  headerCount: {
    ...theme.typography.secondary,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  headerTotal: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: theme.colors.textPrimary,
    marginLeft: 8,
  },
  clearBtn: {
    padding: 4,
  },
  filterSection: {
    marginBottom: 12,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 6,
  },
  filterPill: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterPillActive: {
    backgroundColor: theme.colors.textPrimary,
    borderColor: theme.colors.textPrimary,
  },
  filterPillText: {
    ...theme.typography.caption,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  dateHeaderWrap: {
    paddingVertical: 8,
  },
  dateHeaderText: {
    ...theme.typography.sectionHeading,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyTitle: {
    ...theme.typography.sectionHeading,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    ...theme.typography.secondary,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  resetBtn: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  resetBtnText: {
    ...theme.typography.secondary,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.textPrimary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.sm,
  },
  addBtnText: {
    ...theme.typography.secondary,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
