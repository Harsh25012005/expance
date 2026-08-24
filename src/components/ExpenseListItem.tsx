import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { CheckCircle2, CloudUpload, Trash2 } from 'lucide-react-native';
import { ExpenseItem } from '../types/expense';
import { CategoryIcon } from './CategoryIcon';
import { formatCurrency, formatDate, getCategoryDetails } from '../utils/formatters';
import { useExpense } from '../context/ExpenseContext';

interface ExpenseListItemProps {
  expense: ExpenseItem;
  showDelete?: boolean;
}

export const ExpenseListItem: React.FC<ExpenseListItemProps> = ({
  expense,
  showDelete = true,
}) => {
  const { currency, deleteExpense } = useExpense();
  const catDetails = getCategoryDetails(expense.category);

  const handleDelete = () => {
    Alert.alert(
      'Delete Expense',
      `Are you sure you want to delete "${expense.remark}" (${formatCurrency(expense.amount, currency)})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteExpense(expense.id),
        },
      ]
    );
  };

  return (
    <View style={styles.card}>
      {/* Huge Category Icon */}
      <CategoryIcon categoryId={expense.category} size="md" />

      {/* Expense Info: Remark, Date & Payment Method */}
      <View style={styles.infoContainer}>
        <Text style={styles.remarkText} numberOfLines={1}>
          {expense.remark}
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.dateText}>{formatDate(expense.date)}</Text>
          {expense.paymentMethod && (
            <View style={styles.paymentBadge}>
              <Text style={styles.paymentBadgeText}>{expense.paymentMethod}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Amount & Sync Status */}
      <View style={styles.amountContainer}>
        <Text style={styles.amountText}>{formatCurrency(expense.amount, currency)}</Text>

        <View style={styles.syncRow}>
          {expense.syncedToSheet ? (
            <View style={styles.syncBadgeSuccess}>
              <CheckCircle2 size={12} color="#10b981" />
              <Text style={styles.syncBadgeSuccessText}>In Sheet</Text>
            </View>
          ) : (
            <View style={styles.syncBadgePending}>
              <CloudUpload size={12} color="#f59e0b" />
              <Text style={styles.syncBadgePendingText}>Local</Text>
            </View>
          )}

          {showDelete && (
            <TouchableOpacity
              onPress={handleDelete}
              style={styles.deleteBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Trash2 size={14} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 5,
    gap: 12,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  remarkText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  paymentBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  paymentBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94a3b8',
  },
  amountContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncBadgeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  syncBadgeSuccessText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#34d399',
  },
  syncBadgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  syncBadgePendingText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fbbf24',
  },
  deleteBtn: {
    padding: 2,
  },
});
