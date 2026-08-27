import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
} from 'react-native';
import {
  Search,
  X,
  Filter,
  Check,
  Utensils,
  Car,
  ShoppingBag,
  Zap,
  Film,
  HeartPulse,
  Plane,
  GraduationCap,
  MoreHorizontal,
  RotateCcw,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExpenses } from '../context/ExpenseContext';
import { useShake } from '../context/ShakeContext';
import { CategoryType, Expense } from '../types/expense';
import { CATEGORIES } from '../constants/categories';
import {
  formatCurrency,
  formatTime,
  formatAndroidDate,
} from '../utils/formatters';
import { getMonthName } from '../utils/analyticsHelpers';
import { ConfirmModal } from '../components/ConfirmModal';
import { CalendarView } from '../components/CalendarView';
import { theme } from '../constants/theme';

export type SortType = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';
export type DateFilterType = 'all' | 'today' | 'yesterday' | 'week' | 'month';
export type TimeFilterType = 'all' | 'morning' | 'afternoon' | 'evening';

export const AllExpensesScreen: React.FC = () => {
  const { expenses, settings, stats, deleteExpense } = useExpenses();
  const { openAddExpensePopup } = useShake();
  const insets = useSafeAreaInsets();

  // Tab View Mode: 'list' | 'calendar'
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Search & Filter Active States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'ALL'>('ALL');
  const [sortOption, setSortOption] = useState<SortType>('date_desc');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>('all');

  // Draft filter states for Bottom Sheet
  const [draftCategory, setDraftCategory] = useState<CategoryType | 'ALL'>('ALL');
  const [draftSort, setDraftSort] = useState<SortType>('date_desc');
  const [draftDate, setDraftDate] = useState<DateFilterType>('all');
  const [draftTime, setDraftTime] = useState<TimeFilterType>('all');

  // Filter Bottom Sheet Modal State & Animations
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(450)).current;

  // Delete prompt state
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const now = new Date();

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
  };

  const isFilterActive = useMemo(() => {
    return (
      selectedCategory !== 'ALL' ||
      sortOption !== 'date_desc' ||
      dateFilter !== 'all' ||
      timeFilter !== 'all'
    );
  }, [selectedCategory, sortOption, dateFilter, timeFilter]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (draftCategory !== 'ALL') count++;
    if (draftSort !== 'date_desc') count++;
    if (draftDate !== 'all') count++;
    if (draftTime !== 'all') count++;
    return count;
  }, [draftCategory, draftSort, draftDate, draftTime]);

  // Current Month Total Spending
  const thisMonthSpent = useMemo(() => {
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    return expenses
      .filter((exp) => {
        const d = new Date(exp.createdAt);
        return d.getFullYear() === curYear && d.getMonth() === curMonth;
      })
      .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  }, [expenses]);

  // Open Bottom Sheet with smooth fade-in overlay
  const handleOpenFilterSheet = () => {
    triggerHaptic();
    setDraftCategory(selectedCategory);
    setDraftSort(sortOption);
    setDraftDate(dateFilter);
    setDraftTime(timeFilter);

    setIsFilterModalOpen(true);
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0.45,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Close Bottom Sheet with smooth fade-out overlay
  const handleCloseFilterSheet = () => {
    triggerHaptic();
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 450,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsFilterModalOpen(false);
    });
  };

  const handleApplyFilters = () => {
    triggerHaptic();
    setSelectedCategory(draftCategory);
    setSortOption(draftSort);
    setDateFilter(draftDate);
    setTimeFilter(draftTime);
    handleCloseFilterSheet();
  };

  const handleResetFilters = () => {
    triggerHaptic();
    setSelectedCategory('ALL');
    setSortOption('date_desc');
    setDateFilter('all');
    setTimeFilter('all');
    setSearchQuery('');
  };

  const handleResetDraftFilters = () => {
    triggerHaptic();
    setDraftCategory('ALL');
    setDraftSort('date_desc');
    setDraftDate('all');
    setDraftTime('all');
  };

  // Filter & Sort Logic
  const filteredExpenses = useMemo(() => {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const endOfYesterday = startOfToday - 1;
    const sevenDaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const filtered = expenses.filter((exp) => {
      const expDate = new Date(exp.createdAt);
      const expTime = expDate.getTime();
      const expHour = expDate.getHours();

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = exp.name.toLowerCase().includes(q);
        const matchCategory = exp.category.toLowerCase().includes(q);
        const matchNotes = exp.notes?.toLowerCase().includes(q);
        if (!matchName && !matchCategory && !matchNotes) return false;
      }

      // Category
      if (selectedCategory !== 'ALL' && exp.category !== selectedCategory) {
        return false;
      }

      // Date Filter
      if (dateFilter === 'today') {
        if (expTime < startOfToday) return false;
      } else if (dateFilter === 'yesterday') {
        if (expTime < startOfYesterday || expTime > endOfYesterday) return false;
      } else if (dateFilter === 'week') {
        if (expTime < sevenDaysAgo) return false;
      } else if (dateFilter === 'month') {
        if (expDate.getFullYear() !== currentYear || expDate.getMonth() !== currentMonth) {
          return false;
        }
      }

      // Time Filter
      if (timeFilter === 'morning') {
        if (expHour < 6 || expHour >= 12) return false;
      } else if (timeFilter === 'afternoon') {
        if (expHour < 12 || expHour >= 18) return false;
      } else if (timeFilter === 'evening') {
        if (expHour < 18) return false;
      }

      return true;
    });

    // Numeric & Date Sorting
    return filtered.sort((a, b) => {
      const amountA = Number(a.amount) || 0;
      const amountB = Number(b.amount) || 0;
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();

      switch (sortOption) {
        case 'amount_desc':
          return amountB - amountA;
        case 'amount_asc':
          return amountA - amountB;
        case 'date_asc':
          return dateA - dateB;
        case 'date_desc':
        default:
          return dateB - dateA;
      }
    });
  }, [
    expenses,
    searchQuery,
    selectedCategory,
    dateFilter,
    timeFilter,
    sortOption,
  ]);

  // Draft filter match count for live preview in Bottom Sheet button
  const draftMatchCount = useMemo(() => {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const endOfYesterday = startOfToday - 1;
    const sevenDaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return expenses.filter((exp) => {
      const expDate = new Date(exp.createdAt);
      const expTime = expDate.getTime();
      const expHour = expDate.getHours();

      if (draftCategory !== 'ALL' && exp.category !== draftCategory) {
        return false;
      }

      if (draftDate === 'today') {
        if (expTime < startOfToday) return false;
      } else if (draftDate === 'yesterday') {
        if (expTime < startOfYesterday || expTime > endOfYesterday) return false;
      } else if (draftDate === 'week') {
        if (expTime < sevenDaysAgo) return false;
      } else if (draftDate === 'month') {
        if (expDate.getFullYear() !== currentYear || expDate.getMonth() !== currentMonth) {
          return false;
        }
      }

      if (draftTime === 'morning') {
        if (expHour < 6 || expHour >= 12) return false;
      } else if (draftTime === 'afternoon') {
        if (expHour < 12 || expHour >= 18) return false;
      } else if (draftTime === 'evening') {
        if (expHour < 18) return false;
      }

      return true;
    }).length;
  }, [
    expenses,
    draftCategory,
    draftDate,
    draftTime,
  ]);

  // Group Chronological Story by Date with Android Custom Date Format
  const storyGroups = useMemo(() => {
    const groups: { heading: string; data: Expense[] }[] = [];
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

    const getHeading = (dateStr: string) => {
      const d = new Date(dateStr);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

      if (dayStart === startOfToday) return 'TODAY';
      if (dayStart === startOfYesterday) return 'YESTERDAY';
      return formatAndroidDate(d, true).toUpperCase();
    };

    const map = new Map<string, Expense[]>();

    for (const exp of filteredExpenses) {
      const heading = getHeading(exp.createdAt);
      if (!map.has(heading)) {
        map.set(heading, []);
      }
      map.get(heading)!.push(exp);
    }

    map.forEach((data, heading) => {
      groups.push({ heading, data });
    });

    return groups;
  }, [filteredExpenses]);

  const renderCategoryIcon = (category: CategoryType, size: number = 14, color?: string) => {
    const iconColor = color || theme.colors.textPrimary;
    switch (category) {
      case 'Food':
        return <Utensils size={size} color={iconColor} strokeWidth={1.5} />;
      case 'Transport':
        return <Car size={size} color={iconColor} strokeWidth={1.5} />;
      case 'Shopping':
        return <ShoppingBag size={size} color={iconColor} strokeWidth={1.5} />;
      case 'Bills':
        return <Zap size={size} color={iconColor} strokeWidth={1.5} />;
      case 'Entertainment':
        return <Film size={size} color={iconColor} strokeWidth={1.5} />;
      case 'Health':
        return <HeartPulse size={size} color={iconColor} strokeWidth={1.5} />;
      case 'Travel':
        return <Plane size={size} color={iconColor} strokeWidth={1.5} />;
      case 'Education':
        return <GraduationCap size={size} color={iconColor} strokeWidth={1.5} />;
      case 'Other':
      default:
        return <MoreHorizontal size={size} color={iconColor} strokeWidth={1.5} />;
    }
  };

  return (
    <View style={styles.container}>
      {/* ─── Screen Scroll Container (Single global Header comes from App.tsx) ─── */}
      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={[
          styles.mainScrollContent,
          { paddingBottom: 110 + Math.max(insets.bottom, 16) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── 1. Monthly Summary Card (Hero Balance Style) ─── */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <Text style={styles.summaryLabel}>THIS MONTH'S SPENDING</Text>
            <Text style={styles.summaryMonth}>{getMonthName(now.getMonth())} {now.getFullYear()}</Text>
          </View>

          <View style={styles.amountContainer}>
            <Text style={styles.amountText}>
              {formatCurrency(thisMonthSpent, settings.currency)}
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryBottomRow}>
            <View style={styles.summaryStatCol}>
              <Text style={styles.summaryStatLabel}>Transactions</Text>
              <Text style={styles.summaryStatValue}>{filteredExpenses.length}</Text>
            </View>
            <View style={styles.summaryVerticalDivider} />
            <View style={styles.summaryStatCol}>
              <Text style={styles.summaryStatLabel}>Avg. Expense</Text>
              <Text style={styles.summaryStatValue}>
                {formatCurrency(stats.averageExpense, settings.currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* ─── 2. Controls: Segmented Switcher + Filter Trigger ─── */}
        <View style={styles.controlsRow}>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[
                styles.segmentedButton,
                viewMode === 'list' && styles.segmentedButtonActive,
              ]}
              onPress={() => {
                triggerHaptic();
                setViewMode('list');
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.segmentedButtonText,
                  viewMode === 'list' && styles.segmentedButtonTextActive,
                ]}
              >
                List
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentedButton,
                viewMode === 'calendar' && styles.segmentedButtonActive,
              ]}
              onPress={() => {
                triggerHaptic();
                setViewMode('calendar');
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.segmentedButtonText,
                  viewMode === 'calendar' && styles.segmentedButtonTextActive,
                ]}
              >
                Calendar
              </Text>
            </TouchableOpacity>
          </View>

          {/* Compact Single Filter Control */}
          <TouchableOpacity
            style={[styles.filterBtn, isFilterActive && styles.filterBtnActive]}
            onPress={handleOpenFilterSheet}
            activeOpacity={0.7}
          >
            <Filter
              size={14}
              color={isFilterActive ? '#FFFFFF' : theme.colors.textPrimary}
              strokeWidth={1.75}
            />
            <Text
              style={[
                styles.filterBtnText,
                isFilterActive && styles.filterBtnTextActive,
              ]}
            >
              Filter
            </Text>
            {isFilterActive && <View style={styles.filterDot} />}
          </TouchableOpacity>
        </View>

        {/* Search Input Bar */}
        <View style={styles.searchWrap}>
          <Search size={14} color={theme.colors.textTertiary} strokeWidth={1.5} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search expenses..."
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearSearchBtn}
              activeOpacity={0.7}
            >
              <X size={13} color={theme.colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>

        {/* Active Filter Chips Ribbon (Quick Visibility & Clear) */}
        {isFilterActive && (
          <View style={styles.activeFilterRibbon}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeFilterScroll}>
              {selectedCategory !== 'ALL' && (
                <TouchableOpacity
                  style={styles.activeChip}
                  onPress={() => setSelectedCategory('ALL')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.activeChipText}>{selectedCategory}</Text>
                  <X size={11} color={theme.colors.primary} strokeWidth={2.5} />
                </TouchableOpacity>
              )}
              {dateFilter !== 'all' && (
                <TouchableOpacity
                  style={styles.activeChip}
                  onPress={() => setDateFilter('all')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.activeChipText}>
                    {dateFilter === 'today'
                      ? 'Today'
                      : dateFilter === 'yesterday'
                      ? 'Yesterday'
                      : dateFilter === 'week'
                      ? 'This Week'
                      : 'This Month'}
                  </Text>
                  <X size={11} color={theme.colors.primary} strokeWidth={2.5} />
                </TouchableOpacity>
              )}
              {timeFilter !== 'all' && (
                <TouchableOpacity
                  style={styles.activeChip}
                  onPress={() => setTimeFilter('all')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.activeChipText}>
                    {timeFilter === 'morning'
                      ? 'Morning'
                      : timeFilter === 'afternoon'
                      ? 'Afternoon'
                      : 'Evening'}
                  </Text>
                  <X size={11} color={theme.colors.primary} strokeWidth={2.5} />
                </TouchableOpacity>
              )}
              {sortOption !== 'date_desc' && (
                <TouchableOpacity
                  style={styles.activeChip}
                  onPress={() => setSortOption('date_desc')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.activeChipText}>
                    {sortOption === 'date_asc'
                      ? 'Oldest'
                      : sortOption === 'amount_desc'
                      ? 'Highest'
                      : 'Lowest'}
                  </Text>
                  <X size={11} color={theme.colors.primary} strokeWidth={2.5} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.clearAllFiltersBtn}
                onPress={handleResetFilters}
                activeOpacity={0.7}
              >
                <Text style={styles.clearAllFiltersText}>Clear all</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* ─── 3. Main Body: List View OR Calendar View ─── */}
        {viewMode === 'list' ? (
          filteredExpenses.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No expenses recorded</Text>
              <Text style={styles.emptyDesc}>
                {isFilterActive || searchQuery.trim()
                  ? 'Try changing your filters or search query.'
                  : 'Shake your phone anytime to record an expense.'}
              </Text>
              {(isFilterActive || searchQuery.trim().length > 0) && (
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={handleResetFilters}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resetBtnText}>Clear Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.storyContainer}>
              {storyGroups.map((group) => (
                <View key={group.heading} style={styles.storyGroup}>
                  <Text style={styles.dateGroupHeading}>{group.heading}</Text>

                  <View style={styles.storyCard}>
                    {group.data.map((exp, idx) => (
                      <TouchableOpacity
                        key={exp.id}
                        style={[
                          styles.expenseItemRow,
                          idx > 0 && styles.expenseItemRowDivider,
                        ]}
                        onPress={() => {
                          triggerHaptic();
                          openAddExpensePopup({ initialExpense: exp });
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.itemLeft}>
                          <View style={styles.iconCircle}>
                            {renderCategoryIcon(exp.category, 14)}
                          </View>
                          <View style={styles.itemTextCol}>
                            <Text style={styles.itemName}>{exp.name}</Text>
                            <View style={styles.itemMetaRow}>
                              <Text style={styles.itemCategory}>{exp.category}</Text>
                              <Text style={styles.itemDot}>·</Text>
                              <Text style={styles.itemTime}>{formatTime(exp.createdAt)}</Text>
                              {exp.notes ? (
                                <>
                                  <Text style={styles.itemDot}>·</Text>
                                  <Text style={styles.itemNotes} numberOfLines={1}>
                                    {exp.notes}
                                  </Text>
                                </>
                              ) : null}
                            </View>
                          </View>
                        </View>

                        <View style={styles.itemRight}>
                          <Text style={styles.itemAmount}>
                            {formatCurrency(exp.amount, settings.currency)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )
        ) : (
          <CalendarView
            onEditExpense={(exp) => openAddExpensePopup({ initialExpense: exp })}
            onDeleteExpense={(exp) => setExpenseToDelete(exp)}
          />
        )}
      </ScrollView>

      {/* ─── 4. Clean Modern Filter Bottom Sheet ─── */}
      <Modal
        visible={isFilterModalOpen}
        transparent
        animationType="none"
        onRequestClose={handleCloseFilterSheet}
        statusBarTranslucent
      >
        <View style={styles.modalRoot}>
          {/* Fading Backdrop */}
          <Animated.View style={[styles.backdrop, { opacity: overlayOpacity }]}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={handleCloseFilterSheet}
            />
          </Animated.View>

          {/* Sliding Bottom Sheet */}
          <Animated.View
            style={[
              styles.bottomSheet,
              {
                paddingBottom: Math.max(insets.bottom, 16) + 12,
                transform: [{ translateY: sheetTranslateY }],
              },
            ]}
          >
            {/* Sheet Handle */}
            <View style={styles.sheetHandle} />

            {/* Header: Title + Active count + Reset + Close */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Text style={styles.modalTitle}>Filter Expenses</Text>
                {activeFilterCount > 0 && (
                  <View style={styles.activeCountBadge}>
                    <Text style={styles.activeCountText}>{activeFilterCount} active</Text>
                  </View>
                )}
              </View>

              <View style={styles.modalHeaderRight}>
                {activeFilterCount > 0 && (
                  <TouchableOpacity
                    onPress={handleResetDraftFilters}
                    style={styles.resetDraftBtn}
                    activeOpacity={0.7}
                  >
                    <RotateCcw size={12} color={theme.colors.textSecondary} strokeWidth={2} />
                    <Text style={styles.resetDraftText}>Reset</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={handleCloseFilterSheet}
                  activeOpacity={0.7}
                >
                  <X size={16} color={theme.colors.textPrimary} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.filterScroll}>
              {/* ─── Section 1: Category ─── */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionHeading}>CATEGORY</Text>
                <View style={styles.chipGrid}>
                  <TouchableOpacity
                    style={[
                      styles.chipPill,
                      draftCategory === 'ALL' && styles.chipPillActive,
                    ]}
                    onPress={() => {
                      triggerHaptic();
                      setDraftCategory('ALL');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipPillText,
                        draftCategory === 'ALL' && styles.chipPillTextActive,
                      ]}
                    >
                      All
                    </Text>
                  </TouchableOpacity>

                  {CATEGORIES.map((cat) => {
                    const isSelected = draftCategory === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.chipPill,
                          isSelected && styles.chipPillActive,
                        ]}
                        onPress={() => {
                          triggerHaptic();
                          setDraftCategory(cat.id);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.catIconWrap, { backgroundColor: cat.bgColor }]}>
                          {renderCategoryIcon(cat.id, 12, cat.color)}
                        </View>
                        <Text
                          style={[
                            styles.chipPillText,
                            isSelected && styles.chipPillTextActive,
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* ─── Section 2: Date Range ─── */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionHeading}>DATE RANGE</Text>
                <View style={styles.chipGrid}>
                  {(
                    [
                      { id: 'all', label: 'All Dates' },
                      { id: 'today', label: 'Today' },
                      { id: 'yesterday', label: 'Yesterday' },
                      { id: 'week', label: 'This Week' },
                      { id: 'month', label: 'This Month' },
                    ] as const
                  ).map((item) => {
                    const isSelected = draftDate === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.chipPill,
                          isSelected && styles.chipPillActive,
                        ]}
                        onPress={() => {
                          triggerHaptic();
                          setDraftDate(item.id);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.chipPillText,
                            isSelected && styles.chipPillTextActive,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* ─── Section 3: Time Range ─── */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionHeading}>TIME RANGE</Text>
                <View style={styles.chipGrid}>
                  {(
                    [
                      { id: 'all', label: 'All Times' },
                      { id: 'morning', label: 'Morning (6 AM - 12 PM)' },
                      { id: 'afternoon', label: 'Afternoon (12 PM - 6 PM)' },
                      { id: 'evening', label: 'Evening (6 PM - 12 AM)' },
                    ] as const
                  ).map((item) => {
                    const isSelected = draftTime === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.chipPill,
                          isSelected && styles.chipPillActive,
                        ]}
                        onPress={() => {
                          triggerHaptic();
                          setDraftTime(item.id);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.chipPillText,
                            isSelected && styles.chipPillTextActive,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* ─── Section 4: Sort By ─── */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionHeading}>SORT BY</Text>
                <View style={styles.sortGrid}>
                  {(
                    [
                      { id: 'date_desc', label: 'Newest First' },
                      { id: 'date_asc', label: 'Oldest First' },
                      { id: 'amount_desc', label: 'Highest First' },
                      { id: 'amount_asc', label: 'Lowest First' },
                    ] as const
                  ).map((item) => {
                    const isSelected = draftSort === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.sortItemPill,
                          isSelected && styles.sortItemPillActive,
                        ]}
                        onPress={() => {
                          triggerHaptic();
                          setDraftSort(item.id);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.sortItemText,
                            isSelected && styles.sortItemTextActive,
                          ]}
                        >
                          {item.label}
                        </Text>
                        {isSelected && (
                          <Check size={14} color={theme.colors.primary} strokeWidth={2.5} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            {/* ─── Bottom Actions: Apply Filters & Reset ─── */}
            <View style={styles.sheetActionRow}>
              <TouchableOpacity
                style={styles.sheetResetBtn}
                onPress={handleResetDraftFilters}
                activeOpacity={0.7}
              >
                <Text style={styles.sheetResetBtnText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetApplyBtn}
                onPress={handleApplyFilters}
                activeOpacity={0.85}
              >
                <Text style={styles.sheetApplyBtnText}>
                  {draftMatchCount > 0
                    ? `Show ${draftMatchCount} Expense${draftMatchCount === 1 ? '' : 's'}`
                    : 'Apply Filters'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        visible={!!expenseToDelete}
        title="Delete Expense"
        message={
          expenseToDelete
            ? `Delete "${expenseToDelete.name}" (${formatCurrency(
                expenseToDelete.amount,
                settings.currency
              )})?`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive
        onConfirm={async () => {
          if (expenseToDelete) {
            await deleteExpense(expenseToDelete.id);
            setExpenseToDelete(null);
          }
        }}
        onCancel={() => setExpenseToDelete(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  mainScroll: {
    flex: 1,
  },
  mainScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  /* Monthly Summary Card (Hero Balance Style) */
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 14,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    ...theme.typography.label,
    color: theme.colors.textSecondary,
  },
  summaryMonth: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    fontWeight: '500',
  },
  amountContainer: {
    marginVertical: 4,
  },
  amountText: {
    ...theme.typography.amount,
    color: theme.colors.textPrimary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: theme.colors.borderSubtle,
    marginVertical: 14,
  },
  summaryBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryStatCol: {
    flex: 1,
  },
  summaryStatLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  summaryStatValue: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  summaryVerticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.borderSubtle,
    marginHorizontal: 16,
  },
  /* Controls Row */
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 12,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 9999,
    padding: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  segmentedButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  segmentedButtonActive: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  segmentedButtonText: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  segmentedButtonTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterBtnText: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  filterBtnTextActive: {
    color: '#FFFFFF',
  },
  filterDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginBottom: 10,
    borderRadius: 9999,
    paddingHorizontal: 14,
    height: 40,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textPrimary,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  /* Active Filter Ribbon */
  activeFilterRibbon: {
    marginBottom: 12,
  },
  activeFilterScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: theme.colors.accentLight,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  activeChipText: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  clearAllFiltersBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearAllFiltersText: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textDecorationLine: 'underline',
  },
  /* Story List */
  storyContainer: {
    gap: 16,
  },
  storyGroup: {
    gap: 6,
  },
  dateGroupHeading: {
    ...theme.typography.label,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  storyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  expenseItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  expenseItemRowDivider: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTextCol: {
    flex: 1,
  },
  itemName: {
    ...theme.typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  itemCategory: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  itemDot: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  itemTime: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  itemNotes: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textTertiary,
    flex: 1,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemAmount: {
    ...theme.typography.body,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  /* Empty Card */
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    paddingVertical: 48,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyTitle: {
    ...theme.typography.sectionHeading,
    fontSize: 15,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  emptyDesc: {
    ...theme.typography.caption,
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 18,
    marginBottom: 14,
  },
  resetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  /* Bottom Sheet Filter Modal */
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  bottomSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    ...theme.typography.sectionHeading,
    fontSize: 18,
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  activeCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    backgroundColor: theme.colors.accentLight,
  },
  activeCountText: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  modalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resetDraftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resetDraftText: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterScroll: {
    marginBottom: 14,
  },
  sectionBlock: {
    marginBottom: 18,
  },
  sectionHeading: {
    ...theme.typography.label,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipPillActive: {
    backgroundColor: theme.colors.accentLight,
    borderColor: theme.colors.primary,
  },
  chipPillText: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  chipPillTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  catIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Sort Grid */
  sortGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortItemPill: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sortItemPillActive: {
    backgroundColor: theme.colors.accentLight,
    borderColor: theme.colors.primary,
  },
  sortItemText: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  sortItemTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  /* Sheet Bottom Actions */
  sheetActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  sheetResetBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 9999,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    height: 48,
  },
  sheetResetBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  sheetApplyBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 9999,
    backgroundColor: theme.colors.textPrimary,
    height: 48,
  },
  sheetApplyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
