import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Activity, AlertCircle, TrendingUp, ShieldCheck } from 'lucide-react-native';
import { useExpenses } from '../context/ExpenseContext';
import { calculateMoneyMood } from '../utils/analyticsHelpers';
import { theme } from '../constants/theme';

interface MoneyMoodCardProps {
  compact?: boolean;
}

export const MoneyMoodCard: React.FC<MoneyMoodCardProps> = ({ compact = false }) => {
  const { expenses, settings } = useExpenses();
  const moodInfo = calculateMoneyMood(expenses, settings.monthlyBudget || 0, new Date());

  const renderIcon = () => {
    switch (moodInfo.mood) {
      case 'Tight':
        return <AlertCircle size={15} color={moodInfo.textColor} strokeWidth={2} />;
      case 'Moderate':
        return <TrendingUp size={15} color={moodInfo.textColor} strokeWidth={2} />;
      case 'Comfortable':
      default:
        return <ShieldCheck size={15} color={moodInfo.textColor} strokeWidth={2} />;
    }
  };

  return (
    <View style={styles.widgetContainer}>
      <View style={styles.headerRow}>
        <View style={styles.leftCol}>
          <Text style={styles.widgetLabel}>Money Mood</Text>
          <Text style={styles.moodValue}>{moodInfo.mood}</Text>
        </View>

        <View style={[styles.badge, { backgroundColor: moodInfo.bgColor }]}>
          {renderIcon()}
          <Text style={[styles.badgeText, { color: moodInfo.textColor }]}>
            {moodInfo.mood}
          </Text>
        </View>
      </View>

      <Text style={styles.descriptionText}>
        {moodInfo.description}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  widgetContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  leftCol: {
    gap: 1,
  },
  widgetLabel: {
    ...theme.typography.label,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  moodValue: {
    ...theme.typography.sectionHeading,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  descriptionText: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 17,
  },
});
