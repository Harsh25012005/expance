import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Utensils,
  Car,
  ShoppingBag,
  Zap,
  Film,
  HeartPulse,
  Plane,
  GraduationCap,
  MoreHorizontal,
  Edit2,
  Trash2,
} from 'lucide-react-native';
import { Expense, CategoryType } from '../types/expense';
import { formatCurrency, formatTime, formatDateHeader } from '../utils/formatters';
import { useExpenses } from '../context/ExpenseContext';
import { CATEGORY_MAP } from '../constants/categories';
import { theme } from '../constants/theme';

interface ExpenseListItemProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  showDate?: boolean;
}

export const ExpenseListItem: React.FC<ExpenseListItemProps> = ({
  expense,
  onEdit,
  onDelete,
  showDate = false,
}) => {
  const { settings } = useExpenses();
  const catInfo = CATEGORY_MAP[expense.category] || CATEGORY_MAP.Other;

  const renderCategoryIcon = (catId: CategoryType, size: number = 16, color: string = theme.colors.textPrimary) => {
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

  const formattedDate = formatDateHeader(expense.createdAt);
  const formattedTime = formatTime(expense.createdAt);

  return (
    <View style={styles.container}>
      {/* Category Icon */}
      <View style={[styles.iconCircle, { backgroundColor: catInfo.bgColor }]}>
        {renderCategoryIcon(expense.category, 16, catInfo.color)}
      </View>

      {/* Details */}
      <View style={styles.infoCol}>
        <Text style={styles.name} numberOfLines={1}>
          {expense.name}
        </Text>
        <Text style={styles.meta}>
          {expense.category} · {showDate ? `${formattedDate}, ${formattedTime}` : formattedTime}
        </Text>
      </View>

      {/* Amount & Actions */}
      <View style={styles.rightCol}>
        <Text style={styles.amount}>
          {formatCurrency(expense.amount, settings.currency)}
        </Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onEdit(expense)}
            activeOpacity={0.6}
            accessibilityLabel={`Edit ${expense.name}`}
          >
            <Edit2 size={12} color={theme.colors.textSecondary} strokeWidth={1.5} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onDelete(expense)}
            activeOpacity={0.6}
            accessibilityLabel={`Delete ${expense.name}`}
          >
            <Trash2 size={12} color={theme.colors.negative} strokeWidth={1.5} />
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
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoCol: {
    flex: 1,
    marginRight: 10,
  },
  name: {
    ...theme.typography.bodyLarge,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  meta: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  amount: {
    ...theme.typography.bodyLarge,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 3,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    padding: 2,
  },
});
