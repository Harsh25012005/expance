import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import {
  ArrowRight,
  Smartphone,
  Plus,
  Receipt,
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExpenses } from '../context/ExpenseContext';
import { useShake } from '../context/ShakeContext';
import { HeroBalanceCard } from '../components/HeroBalanceCard';
import { BudgetCard } from '../components/BudgetCard';
import { WhereDidItGoWidget } from '../components/WhereDidItGoWidget';
import { WhereDidItGoModal } from '../components/WhereDidItGoModal';
import { MoneyMoodCard } from '../components/MoneyMoodCard';
import { StreaksCard } from '../components/StreaksCard';
import { ExpenseListItem } from '../components/ExpenseListItem';
import { ConfirmModal } from '../components/ConfirmModal';
import { Expense } from '../types/expense';
import { theme } from '../constants/theme';

interface HomeScreenProps {
  onNavigateToExpenses: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateToExpenses }) => {
  const { expenses, deleteExpense } = useExpenses();
  const { openQuickAddModal } = useShake();
  const insets = useSafeAreaInsets();

  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [showWhereDidItGoModal, setShowWhereDidItGoModal] = useState<boolean>(false);

  // Subtle animated phone shake icon
  const shakeIconAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(2200),
        Animated.timing(shakeIconAnim, { toValue: 4, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeIconAnim, { toValue: -4, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeIconAnim, { toValue: 3, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeIconAnim, { toValue: -3, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeIconAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
        Animated.delay(3000),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    } catch { }
  };

  const recentExpenses = expenses.slice(0, 5);
  const hasExpenses = expenses.length > 0;

  const handleDeleteConfirm = async () => {
    if (deletingExpense) {
      await deleteExpense(deletingExpense.id);
      setDeletingExpense(null);
    }
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: 85 + Math.max(insets.bottom, 16) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Hero Balance Widget */}
        <HeroBalanceCard />

        {/* 2. Monthly Budget Primary Widget */}
        <BudgetCard />

        {/* 3. Where Did It Go? Visual Category Breakdown Widget */}
        <WhereDidItGoWidget onOpenBreakdown={() => setShowWhereDidItGoModal(true)} />

        {/* 4. Money Mood Widget */}
        <MoneyMoodCard />

        {/* 5. Streaks Statistics Widget */}
        <StreaksCard />

        {/* 6. Quick Action Widget (Shake to Add + Clear Manual Add) */}
        <View style={styles.actionWidget}>
          <View style={styles.actionLeft}>
            <Animated.View
              style={[
                styles.shakeIconCircle,
                {
                  transform: [
                    {
                      rotate: shakeIconAnim.interpolate({
                        inputRange: [-10, 10],
                        outputRange: ['-10deg', '10deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Smartphone size={16} color={theme.colors.primary} strokeWidth={2} />
            </Animated.View>
            <View style={styles.actionTextCol}>
              <Text style={styles.actionTitle}>Shake to add</Text>
              <Text style={styles.actionSubtitle}>
                Shake your phone anytime to quickly record spending.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.manualAddBtn}
            onPress={() => {
              triggerHaptic();
              openQuickAddModal({ triggeredByShake: false });
            }}
            activeOpacity={0.7}
          >
            <Plus size={13} color={theme.colors.textPrimary} strokeWidth={2} />
            <Text style={styles.manualAddBtnText}>Add Expense</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Where Did It Go Full Breakdown Bottom Sheet Modal */}
      <WhereDidItGoModal
        visible={showWhereDidItGoModal}
        onClose={() => setShowWhereDidItGoModal(false)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        visible={!!deletingExpense}
        title="Delete Expense?"
        message={`Are you sure you want to remove this ${deletingExpense?.notes || deletingExpense?.category || 'expense'}? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingExpense(null)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  actionWidget: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  shakeIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: theme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextCol: {
    flex: 1,
  },
  actionTitle: {
    ...theme.typography.body,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  actionSubtitle: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
    lineHeight: 14,
  },
  manualAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  manualAddBtnText: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  recentSection: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    ...theme.typography.sectionHeading,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  expenseListCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  itemDivider: {
    height: 1,
    backgroundColor: theme.colors.borderSubtle,
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 240,
  },
});
