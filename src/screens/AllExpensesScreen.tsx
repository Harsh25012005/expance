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
import { Search, X, Receipt, Plus, List, CalendarDays } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useExpenses } from '../context/ExpenseContext';
import { useShake } from '../context/ShakeContext';
import { CategoryType, Expense } from '../types/expense';
import { CATEGORIES } from '../constants/categories';
import { ExpenseListItem } from '../components/ExpenseListItem';
import { CalendarView } from '../components/CalendarView';
import { ConfirmModal } from '../components/ConfirmModal';
import { formatCurrency, groupExpensesByDate } from '../utils/formatters';
import { theme } from '../constants/theme';

export const AllExpensesScreen: React.FC = () => {
  const { expenses, settings, deleteExpense } = useExpenses();
  const { openQuickAddModal } = useShake();
  const insets = useSafeAreaInsets();

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'All'>('All');
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    } catch { }
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
    return filteredExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
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
      {/* 1. View Switcher: List | Calendar */}
      <View style={styles.switcherContainer}>
        <View style={styles.switcher}>
          <TouchableOpacity
            style={[styles.switchBtn, viewMode === 'list' && styles.switchBtnActive]}
            onPress={() => {
              triggerHaptic();
              setViewMode('list');
            }}
            activeOpacity={0.7}
          >
            <List
              size={14}
              color={viewMode === 'list' ? theme.colors.primary : theme.colors.textSecondary}
              strokeWidth={1.75}
            />
            <Text style={[styles.switchText, viewMode === 'list' && styles.switchTextActive]}>
              List
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.switchBtn, viewMode === 'calendar' && styles.switchBtnActive]}
            onPress={() => {
              triggerHaptic();
              setViewMode('calendar');
            }}
            activeOpacity={0.7}
          >
            <CalendarDays
              size={14}
              color={viewMode === 'calendar' ? theme.colors.primary : theme.colors.textSecondary}
              strokeWidth={1.75}
            />
            <Text style={[styles.switchText, viewMode === 'calendar' && styles.switchTextActive]}>
              Calendar
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Calendar View */}
      {viewMode === 'calendar' ? (
        <CalendarView />
      ) : (
        /* 3. List View */
        <>
          {/* Minimalist Search Input */}
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
                  style={styles.searchClearBtn}
                >
                  <X size={13} color={theme.colors.textTertiary} strokeWidth={1.5} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Horizontal Category Filter Pills */}
          <View style={styles.filtersSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersContent}
            >
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  selectedCategory === 'All' && styles.filterPillActive,
                ]}
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
                const isSelected = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.filterPill, isSelected && styles.filterPillActive]}
                    onPress={() => {
                      triggerHaptic();
                      setSelectedCategory(cat.id);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        isSelected && styles.filterPillTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Grouped SectionList */}
          {filteredExpenses.length > 0 ? (
            <SectionList
              sections={groupedSections}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: 85 + Math.max(insets.bottom, 16) },
              ]}
              showsVerticalScrollIndicator={false}
              renderSectionHeader={({ section: { title } }) => (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderText}>{title}</Text>
                </View>
              )}
              renderItem={({ item }) => (
                <ExpenseListItem
                  expense={item}
                  onEdit={(exp) => openQuickAddModal({ initialExpense: exp })}
                  onDelete={(exp) => setDeletingExpense(exp)}
                  showDate={false}
                />
              )}
              ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
              SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
            />
          ) : (
            /* Empty Filter / Empty Data State */
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Receipt size={24} color={theme.colors.textTertiary} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>
                {hasFilterActive ? 'No matching expenses' : 'No expenses recorded'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {hasFilterActive
                  ? 'Try changing your search terms or clearing your category filter.'
                  : 'Shake your phone or tap the button below to add your first expense.'}
              </Text>

              {hasFilterActive ? (
                <TouchableOpacity
                  style={styles.clearFiltersBtn}
                  onPress={() => {
                    triggerHaptic();
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.clearFiltersText}>Clear filters</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => {
                    triggerHaptic();
                    openQuickAddModal({ triggeredByShake: false });
                  }}
                  activeOpacity={0.7}
                >
                  <Plus size={14} color={theme.colors.surface} strokeWidth={2} />
                  <Text style={styles.addBtnText}>Add Expense</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </>
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
  switcherContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  switcher: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  switchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 6,
  },
  switchBtnActive: {
    backgroundColor: theme.colors.accentLight,
  },
  switchText: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  switchTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  headerInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 8,
  },
  headerCount: {
    ...theme.typography.caption,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  headerTotal: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 12,
    height: 38,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.textPrimary,
    padding: 0,
  },
  searchClearBtn: {
    padding: 4,
  },
  filtersSection: {
    marginBottom: 10,
  },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterPillText: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  filterPillTextActive: {
    color: theme.colors.surface,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  sectionHeader: {
    paddingVertical: 6,
    backgroundColor: theme.colors.background,
    marginTop: 4,
  },
  sectionHeaderText: {
    ...theme.typography.label,
    fontSize: 10,
    color: theme.colors.textTertiary,
    letterSpacing: 0.5,
  },
  itemSeparator: {
    height: 6,
  },
  sectionSeparator: {
    height: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    marginHorizontal: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 10,
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
    ...theme.typography.secondary,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    maxWidth: 260,
  },
  clearFiltersBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  clearFiltersText: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primary,
  },
  addBtnText: {
    ...theme.typography.caption,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.surface,
  },
});
