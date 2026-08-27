import React, { useState, useEffect, useRef, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { WalletCards, Plus, Edit3 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useExpenses } from '../context/ExpenseContext';
import { getMonthlyBudgetStats, getMonthName } from '../utils/analyticsHelpers';
import { formatCurrency } from '../utils/formatters';
import { SetBudgetModal } from './SetBudgetModal';

export const BudgetCard: React.FC = memo(() => {
  const { expenses, settings, theme } = useExpenses();
  const [showModal, setShowModal] = useState<boolean>(false);

  const now = new Date();
  const currentMonthName = getMonthName(now.getMonth());
  const budgetStats = getMonthlyBudgetStats(expenses, settings.monthlyBudget || 0, now);

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (budgetStats.hasBudget) {
      Animated.timing(progressAnim, {
        toValue: Math.min(budgetStats.percentageUsed, 100),
        duration: 650,
        useNativeDriver: false,
      }).start();
    } else {
      progressAnim.setValue(0);
    }
  }, [budgetStats.percentageUsed, budgetStats.hasBudget]);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
  };

  const handleOpenModal = () => {
    triggerHaptic();
    setShowModal(true);
  };

  if (!budgetStats.hasBudget) {
    return (
      <>
        <View style={[styles.widgetContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.emptyHeader}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.accentLight }]}>
              <WalletCards size={18} color={theme.colors.primary} strokeWidth={1.75} />
            </View>
            <View style={styles.emptyTextCol}>
              <Text style={[styles.widgetTitle, { color: theme.colors.textPrimary }]}>Set your monthly budget</Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                Set a budget to understand your spending.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.setBudgetBtn, { backgroundColor: theme.colors.primary }]}
            onPress={handleOpenModal}
            activeOpacity={0.8}
          >
            <Plus size={14} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.setBudgetBtnText}>Set Budget</Text>
          </TouchableOpacity>
        </View>

        <SetBudgetModal visible={showModal} onClose={() => setShowModal(false)} />
      </>
    );
  }

  // Determine progress bar color based on status
  let barColor = theme.colors.primary;
  let remainingColor = theme.colors.textPrimary;
  let remainingText = `${formatCurrency(budgetStats.remaining, settings.currency)} remaining`;

  if (budgetStats.status === 'over_budget') {
    barColor = theme.colors.danger;
    remainingColor = theme.colors.danger;
    remainingText = `${formatCurrency(budgetStats.overAmount, settings.currency)} over budget`;
  } else if (budgetStats.status === 'near_limit') {
    barColor = '#F59E0B';
    remainingColor = '#B45309';
    remainingText = `${formatCurrency(budgetStats.remaining, settings.currency)} remaining`;
  }

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <>
      <View style={[styles.widgetContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        {/* Header with Title & Month + Edit Button */}
        <View style={styles.widgetHeader}>
          <View>
            <Text style={[styles.widgetTitle, { color: theme.colors.textPrimary }]}>Monthly Budget</Text>
            <Text style={[styles.widgetSubtitle, { color: theme.colors.textSecondary }]}>{currentMonthName}</Text>
          </View>

          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: theme.colors.accentLight }]}
            onPress={handleOpenModal}
            activeOpacity={0.7}
          >
            <Edit3 size={12} color={theme.colors.primary} strokeWidth={2} />
            <Text style={[styles.editBtnText, { color: theme.colors.primary }]}>Edit Budget</Text>
          </TouchableOpacity>
        </View>

        {/* 1. Remaining Amount (Top Priority) */}
        <View style={styles.remainingBox}>
          <Text style={[styles.remainingAmount, { color: remainingColor }]}>
            {remainingText}
          </Text>
          <View style={[styles.percentBadge, { backgroundColor: theme.colors.backgroundSecondary }]}>
            <Text style={[styles.percentBadgeText, { color: theme.colors.textSecondary }]}>{budgetStats.percentageUsed}% used</Text>
          </View>
        </View>

        {/* 2. Animated Progress Bar */}
        <View style={[styles.progressBarTrack, { backgroundColor: theme.colors.backgroundSecondary }]}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: progressWidth,
                backgroundColor: barColor,
              },
            ]}
          />
        </View>

        {/* 3. Spent of Total Budget */}
        <View style={styles.spentRow}>
          <Text style={styles.spentMainText}>
            <Text style={[styles.spentAmount, { color: theme.colors.textPrimary }]}>
              {formatCurrency(budgetStats.spent, settings.currency)}
            </Text>
            <Text style={[styles.spentOfText, { color: theme.colors.textSecondary }]}>
              {' '}spent of {formatCurrency(budgetStats.monthlyBudget, settings.currency)}
            </Text>
          </Text>
        </View>
      </View>

      <SetBudgetModal visible={showModal} onClose={() => setShowModal(false)} />
    </>
  );
});

const styles = StyleSheet.create({
  widgetContainer: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  widgetTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  widgetSubtitle: {
    fontSize: 12,
    marginTop: 1,
    fontWeight: '500',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  remainingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  remainingAmount: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  percentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  percentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressBarTrack: {
    height: 7,
    borderRadius: 9999,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 9999,
  },
  spentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spentMainText: {
    fontSize: 12,
  },
  spentAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  spentOfText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTextCol: {
    flex: 1,
  },
  emptySubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  setBudgetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  setBudgetBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
