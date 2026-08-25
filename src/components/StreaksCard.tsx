import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShieldCheck, Moon, Award } from 'lucide-react-native';
import { useExpenses } from '../context/ExpenseContext';
import { calculateStreaks } from '../utils/analyticsHelpers';
import { theme } from '../constants/theme';

export const StreaksCard: React.FC = () => {
  const { expenses, settings } = useExpenses();
  const streaks = calculateStreaks(expenses, settings.monthlyBudget || 0);

  return (
    <View style={styles.widgetContainer}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Award size={15} color={theme.colors.primary} strokeWidth={2} />
          <Text style={styles.title}>Your streaks</Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        {/* 1. Under Budget */}
        <View style={styles.statColumn}>
          <Text style={styles.statValue}>{streaks.underBudgetStreak} <Text style={styles.daysUnit}>days</Text></Text>
          <Text style={styles.statLabel}>Under budget</Text>
        </View>

        <View style={styles.divider} />

        {/* 2. No Spending */}
        <View style={styles.statColumn}>
          <Text style={styles.statValue}>{streaks.noSpendStreak} <Text style={styles.daysUnit}>days</Text></Text>
          <Text style={styles.statLabel}>No spending</Text>
        </View>

        <View style={styles.divider} />

        {/* 3. Tracking */}
        <View style={styles.statColumn}>
          <Text style={styles.statValue}>{streaks.trackingStreak} <Text style={styles.daysUnit}>days</Text></Text>
          <Text style={styles.statLabel}>Tracking</Text>
        </View>
      </View>
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
    ...theme.typography.sectionHeading,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...theme.typography.display,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  daysUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  statLabel: {
    ...theme.typography.caption,
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.border,
  },
});
