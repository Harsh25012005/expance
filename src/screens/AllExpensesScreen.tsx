import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import {
  Search,
  X,
  Filter,
  CheckCircle2,
  CloudUpload,
  Layers,
  Inbox,
  FileSpreadsheet,
} from 'lucide-react-native';
import { useExpense } from '../context/ExpenseContext';
import { ExpenseListItem } from '../components/ExpenseListItem';
import { DateFilterType, SyncFilterType } from '../types/expense';
import { formatCurrency } from '../utils/formatters';

export const AllExpensesScreen: React.FC = () => {
  const { expenses, currency, isSyncing, syncWithGoogleSheet, sheetConfig } = useExpense();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [syncFilter, setSyncFilter] = useState<SyncFilterType>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await syncWithGoogleSheet(true);
    setRefreshing(false);
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      // 1. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesRemark = item.remark?.toLowerCase().includes(q);
        const matchesCat = item.category?.toLowerCase().includes(q);
        const matchesPayment = item.paymentMethod?.toLowerCase().includes(q);
        if (!matchesRemark && !matchesCat && !matchesPayment) return false;
      }

      // 2. Sync Filter
      if (syncFilter === 'synced' && !item.syncedToSheet) return false;
      if (syncFilter === 'pending' && item.syncedToSheet) return false;

      // 3. Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;

      // 4. Date filter
      if (dateFilter !== 'all') {
        const itemDate = new Date(item.date);
        const now = new Date();

        if (dateFilter === 'today') {
          if (itemDate.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === 'week') {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(now.getDate() - 7);
          if (itemDate < oneWeekAgo) return false;
        } else if (dateFilter === 'month') {
          if (
            itemDate.getMonth() !== now.getMonth() ||
            itemDate.getFullYear() !== now.getFullYear()
          )
            return false;
        }
      }

      return true;
    });
  }, [expenses, searchQuery, syncFilter, selectedCategory, dateFilter]);

  const totalFilteredAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [filteredExpenses]);

  const dateFilterOptions: { id: DateFilterType; label: string }[] = [
    { id: 'all', label: 'All Time' },
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
  ];

  const syncFilterOptions: { id: SyncFilterType; label: string; icon: any }[] = [
    { id: 'all', label: 'All Items', icon: Layers },
    { id: 'synced', label: 'In Sheet', icon: CheckCircle2 },
    { id: 'pending', label: 'Local Only', icon: CloudUpload },
  ];

  return (
    <View style={styles.container}>
      {/* Search Input Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={18} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search remark, category, payment..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            selectionColor="#10b981"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips Rows */}
      <View style={styles.filterSection}>
        {/* Date Filters */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={dateFilterOptions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.filterChipRow}
          renderItem={({ item }) => {
            const isSelected = dateFilter === item.id;
            return (
              <TouchableOpacity
                style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                onPress={() => setDateFilter(item.id)}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        {/* Sync Status Filters */}
        <View style={styles.syncFilterRow}>
          {syncFilterOptions.map((opt) => {
            const isSelected = syncFilter === opt.id;
            const IconComp = opt.icon;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.syncFilterChip, isSelected && styles.syncFilterChipSelected]}
                onPress={() => setSyncFilter(opt.id)}
              >
                <IconComp size={13} color={isSelected ? '#10b981' : '#64748b'} />
                <Text style={[styles.syncFilterText, isSelected && styles.syncFilterTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Summary Stat Bar */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryCount}>
          {filteredExpenses.length} {filteredExpenses.length === 1 ? 'expense' : 'expenses'} found
        </Text>
        <View style={styles.summaryTotal}>
          <Text style={styles.summaryTotalLabel}>Total:</Text>
          <Text style={styles.summaryTotalAmount}>
            {formatCurrency(totalFilteredAmount, currency)}
          </Text>
        </View>
      </View>

      {/* Expenses List */}
      <FlatList
        data={filteredExpenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ExpenseListItem expense={item} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isSyncing}
            onRefresh={onRefresh}
            tintColor="#10b981"
            colors={['#10b981']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Inbox size={48} color="#334155" />
            <Text style={styles.emptyTitle}>No matching expenses</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your search terms or filters above.
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 14,
    height: 46,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#f8fafc',
  },
  filterSection: {
    gap: 8,
    paddingBottom: 8,
  },
  filterChipRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterChipSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  filterChipTextSelected: {
    color: '#34d399',
  },
  syncFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  syncFilterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingVertical: 6,
    gap: 5,
  },
  syncFilterChipSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: '#10b981',
  },
  syncFilterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  syncFilterTextSelected: {
    color: '#34d399',
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#1e293b',
    marginVertical: 4,
  },
  summaryCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  summaryTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryTotalLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  summaryTotalAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10b981',
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 90,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
});
