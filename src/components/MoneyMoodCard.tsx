import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertCircle, TrendingUp, ShieldCheck } from 'lucide-react-native';
import { useExpenses } from '../context/ExpenseContext';
import { calculateMoneyMood } from '../utils/analyticsHelpers';

interface MoneyMoodCardProps {
  compact?: boolean;
}

export const MoneyMoodCard: React.FC<MoneyMoodCardProps> = memo(() => {
  const { expenses, settings, theme } = useExpenses();
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
    <View style={[styles.widgetContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.headerRow}>
        <View style={styles.leftCol}>
          <Text style={[styles.widgetLabel, { color: theme.colors.textSecondary }]}>Money Mood</Text>
          <Text style={[styles.moodValue, { color: theme.colors.textPrimary }]}>{moodInfo.mood}</Text>
        </View>

        <View style={[styles.badge, { backgroundColor: moodInfo.bgColor }]}>
          {renderIcon()}
          <Text style={[styles.badgeText, { color: moodInfo.textColor }]}>
            {moodInfo.mood}
          </Text>
        </View>
      </View>

      <Text style={[styles.descriptionText, { color: theme.colors.textSecondary }]}>
        {moodInfo.description}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  widgetContainer: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
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
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  moodValue: {
    fontSize: 16,
    fontWeight: '700',
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
    fontSize: 11,
    fontWeight: '700',
  },
  descriptionText: {
    fontSize: 12,
    lineHeight: 17,
  },
});
