import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Award } from 'lucide-react-native';
import { useExpenses } from '../context/ExpenseContext';
import { calculateStreaks } from '../utils/analyticsHelpers';

export const StreaksCard: React.FC = memo(() => {
  const { expenses, settings, theme } = useExpenses();
  const streaks = calculateStreaks(expenses, settings.monthlyBudget || 0);

  return (
    <View style={[styles.widgetContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Award size={15} color={theme.colors.primary} strokeWidth={2} />
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Your streaks</Text>
        </View>
      </View>

      <View style={[styles.metricsRow, { backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.borderSubtle }]}>
        {/* 1. Under Budget */}
        <View style={styles.statColumn}>
          <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
            {streaks.underBudgetStreak} <Text style={[styles.daysUnit, { color: theme.colors.textSecondary }]}>days</Text>
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Under budget</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

        {/* 2. No Spending */}
        <View style={styles.statColumn}>
          <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
            {streaks.noSpendStreak} <Text style={[styles.daysUnit, { color: theme.colors.textSecondary }]}>days</Text>
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>No spending</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

        {/* 3. Tracking */}
        <View style={styles.statColumn}>
          <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
            {streaks.trackingStreak} <Text style={[styles.daysUnit, { color: theme.colors.textSecondary }]}>days</Text>
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Tracking</Text>
        </View>
      </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  daysUnit: {
    fontSize: 12,
    fontWeight: '500',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 24,
  },
});
