import React, { useState, useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import {
  Smartphone,
  Plus,
  LayoutGrid,
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
import { SavingsJarsSection } from '../components/SavingsJarsSection';
import { ConfirmModal } from '../components/ConfirmModal';
import { WidgetsHubModal } from '../components/WidgetsHubModal';
import { Expense } from '../types/expense';

interface HomeScreenProps {
  onNavigateToExpenses: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = memo(({ onNavigateToExpenses }) => {
  const { expenses, deleteExpense, theme } = useExpenses();
  const { openQuickAddModal } = useShake();
  const insets = useSafeAreaInsets();

  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [showWhereDidItGoModal, setShowWhereDidItGoModal] = useState<boolean>(false);
  const [showWidgetsModal, setShowWidgetsModal] = useState<boolean>(false);

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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
  };

  const handleDeleteConfirm = async () => {
    if (deletingExpense) {
      await deleteExpense(deletingExpense.id);
      setDeletingExpense(null);
    }
  };

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
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

        {/* 3. Visual Savings Goal Jars (Sinking Funds) */}
        <SavingsJarsSection />

        {/* 4. Where Did It Go? Visual Category Breakdown Widget */}
        <WhereDidItGoWidget onOpenBreakdown={() => setShowWhereDidItGoModal(true)} />

        {/* 5. Money Mood Widget */}
        <MoneyMoodCard />

        {/* 6. Streaks Statistics Widget */}
        <StreaksCard />

        {/* 7. Home & Lock Screen Widgets Hub */}
        <TouchableOpacity
          style={[styles.widgetsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={() => {
            triggerHaptic();
            setShowWidgetsModal(true);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.widgetsLeft}>
            <View style={[styles.widgetsIconCircle, { backgroundColor: '#4F46E515' }]}>
              <LayoutGrid size={18} color="#4F46E5" strokeWidth={2} />
            </View>
            <View style={styles.widgetsTextCol}>
              <View style={styles.widgetsTitleRow}>
                <Text style={[styles.widgetsTitle, { color: theme.colors.textPrimary }]}>Home Screen Widgets</Text>
                <View style={[styles.widgetBadge, { backgroundColor: '#4F46E520' }]}>
                  <Text style={styles.widgetBadgeText}>NEW</Text>
                </View>
              </View>
              <Text style={[styles.widgetsSubtitle, { color: theme.colors.textSecondary }]}>
                Add balance & quick-entry widgets to your phone home screen
              </Text>
            </View>
          </View>
          <ChevronRight size={16} color={theme.colors.textTertiary} strokeWidth={2} />
        </TouchableOpacity>

        {/* 8. Quick Action Widget (Shake to Add + Clear Manual Add) */}
        <View style={[styles.actionWidget, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.actionLeft}>
            <Animated.View
              style={[
                styles.shakeIconCircle,
                { backgroundColor: theme.colors.accentLight },
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
              <Text style={[styles.actionTitle, { color: theme.colors.textPrimary }]}>Shake to add</Text>
              <Text style={[styles.actionSubtitle, { color: theme.colors.textSecondary }]}>
                Shake your phone anytime to quickly record spending.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.manualAddBtn, { backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.borderSubtle }]}
            onPress={() => {
              triggerHaptic();
              openQuickAddModal({ triggeredByShake: false });
            }}
            activeOpacity={0.7}
          >
            <Plus size={13} color={theme.colors.textPrimary} strokeWidth={2} />
            <Text style={[styles.manualAddBtnText, { color: theme.colors.textPrimary }]}>Add</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Where Did It Go Full Breakdown Bottom Sheet Modal */}
      <WhereDidItGoModal
        visible={showWhereDidItGoModal}
        onClose={() => setShowWhereDidItGoModal(false)}
      />

      {/* Widgets & App Shortcuts Hub Modal */}
      <WidgetsHubModal
        visible={showWidgetsModal}
        onClose={() => setShowWidgetsModal(false)}
        onOpenQuickAdd={() => openQuickAddModal({ triggeredByShake: false })}
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
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  widgetsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  widgetsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  widgetsIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetsTextCol: {
    flex: 1,
  },
  widgetsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  widgetsTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  widgetBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  widgetBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 0.5,
  },
  widgetsSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  actionWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  shakeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  actionSubtitle: {
    fontSize: 12,
    marginTop: 1,
    lineHeight: 16,
  },
  manualAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
  },
  manualAddBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
