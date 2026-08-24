import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Edit2, Trash2 } from 'lucide-react-native';
import { Expense } from '../types/expense';
import { formatCurrency, formatTime } from '../utils/formatters';
import { theme } from '../constants/theme';
import { useExpenses } from '../context/ExpenseContext';
import { CATEGORY_MAP } from '../constants/categories';

interface ExpenseListItemProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

export const ExpenseListItem: React.FC<ExpenseListItemProps> = ({
  expense,
  onEdit,
  onDelete,
}) => {
  const { settings } = useExpenses();
  const catInfo = CATEGORY_MAP[expense.category] || CATEGORY_MAP.Other;

  return (
    <View style={styles.container}>
      {/* Details */}
      <View style={styles.infoContainer}>
        <Text style={styles.name} numberOfLines={1}>
          {expense.name}
        </Text>
        <View style={styles.metaRow}>
          <View style={[styles.categoryTag, { backgroundColor: catInfo.bgColor }]}>
            <Text style={[styles.categoryText, { color: catInfo.color }]}>
              {expense.category}
            </Text>
          </View>
          <Text style={styles.timeText}>{formatTime(expense.createdAt)}</Text>
        </View>
      </View>

      {/* Amount & Actions */}
      <View style={styles.rightSection}>
        <Text style={styles.amount}>
          {formatCurrency(expense.amount, settings.currency)}
        </Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onEdit(expense)}
            activeOpacity={0.6}
            accessibilityLabel={`Edit ${expense.name}`}
            accessibilityRole="button"
          >
            <Edit2 size={13} color={theme.colors.textSecondary} strokeWidth={1.4} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => onDelete(expense)}
            activeOpacity={0.6}
            accessibilityLabel={`Delete ${expense.name}`}
            accessibilityRole="button"
          >
            <Trash2 size={13} color={theme.colors.danger} strokeWidth={1.4} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoContainer: {
    flex: 1,
    marginRight: 6,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryTag: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 999,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 3,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deleteButton: {
    backgroundColor: theme.colors.dangerLight,
    borderColor: '#FECACA',
  },
});
