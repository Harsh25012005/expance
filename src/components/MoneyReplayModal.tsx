import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaPage } from './SafeAreaPage';
import {
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  WalletCards,
  Award,
  ShieldCheck,
  Flame,
  Utensils,
  Car,
  ShoppingBag,
  Zap,
  Film,
  HeartPulse,
  Plane,
  GraduationCap,
  MoreHorizontal,
  Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useExpenses } from '../context/ExpenseContext';
import { generateMoneyReplayData } from '../utils/analyticsHelpers';
import { formatCurrency } from '../utils/formatters';
import { CategoryType } from '../types/expense';
import { theme } from '../constants/theme';

interface MoneyReplayModalProps {
  visible: boolean;
  onClose: () => void;
}

export const MoneyReplayModal: React.FC<MoneyReplayModalProps> = ({ visible, onClose }) => {
  const { expenses, settings } = useExpenses();
  const [currentStep, setCurrentStep] = useState<number>(0);

  const now = new Date();
  const replayData = generateMoneyReplayData(expenses, settings.monthlyBudget || 0, now);

  const totalSteps = 7;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;
  const countAnim = useRef(new Animated.Value(0)).current;
  const [displayedCount, setDisplayedCount] = useState<number>(0);

  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      animateCardEntrance();
    }
  }, [visible]);

  useEffect(() => {
    animateCardEntrance();
  }, [currentStep]);

  const animateCardEntrance = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(15);
    countAnim.setValue(0);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();

    if (currentStep === 0 && replayData.totalSpent > 0) {
      countAnim.addListener(({ value }) => {
        setDisplayedCount(Math.round(value));
      });

      Animated.timing(countAnim, {
        toValue: replayData.totalSpent,
        duration: 800,
        useNativeDriver: false,
      }).start();
    }
  };

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      triggerHaptic();
      setCurrentStep((prev) => prev + 1);
    } else {
      triggerHaptic();
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      triggerHaptic();
      setCurrentStep((prev) => prev - 1);
    }
  };

  const renderCategoryIcon = (catId: CategoryType, size: number = 22, color: string = theme.colors.primary) => {
    switch (catId) {
      case 'Food':
        return <Utensils size={size} color={color} strokeWidth={1.75} />;
      case 'Transport':
        return <Car size={size} color={color} strokeWidth={1.75} />;
      case 'Shopping':
        return <ShoppingBag size={size} color={color} strokeWidth={1.75} />;
      case 'Bills':
        return <Zap size={size} color={color} strokeWidth={1.75} />;
      case 'Entertainment':
        return <Film size={size} color={color} strokeWidth={1.75} />;
      case 'Health':
        return <HeartPulse size={size} color={color} strokeWidth={1.75} />;
      case 'Travel':
        return <Plane size={size} color={color} strokeWidth={1.75} />;
      case 'Education':
        return <GraduationCap size={size} color={color} strokeWidth={1.75} />;
      case 'Other':
      default:
        return <MoreHorizontal size={size} color={color} strokeWidth={1.75} />;
    }
  };

  const renderCardContent = () => {
    if (!replayData.hasExpenses) {
      return (
        <View style={styles.cardInner}>
          <View style={styles.iconCircleLarge}>
            <Sparkles size={32} color={theme.colors.primary} strokeWidth={1.5} />
          </View>
          <Text style={styles.cardHeaderSmall}>MONEY REPLAY</Text>
          <Text style={styles.cardTitle}>Your {replayData.monthName} Replay</Text>
          <Text style={styles.cardBodyText}>
            Your monthly replay will appear once you have enough spending data.
          </Text>
        </View>
      );
    }

    switch (currentStep) {
      case 0:
        return (
          <View style={styles.cardInner}>
            <Text style={styles.cardHeaderSmall}>YOUR {replayData.monthName.toUpperCase()}</Text>
            <Text style={styles.hugeNumber}>
              {formatCurrency(displayedCount, settings.currency)}
            </Text>
            <Text style={styles.cardSubtitleLarge}>total spent</Text>
            <Text style={styles.cardBodyText}>
              Here is how your money flowed across the month of {replayData.monthName}.
            </Text>
          </View>
        );

      case 1:
        return (
          <View style={styles.cardInner}>
            <Text style={styles.cardHeaderSmall}>TOP SPENDING AREA</Text>
            <Text style={styles.cardTitle}>Your biggest category</Text>

            {replayData.topCategory ? (
              <View style={styles.categoryShowcase}>
                <View style={styles.iconCircleLarge}>
                  {renderCategoryIcon(replayData.topCategory.category, 36, theme.colors.primary)}
                </View>
                <Text style={styles.showcaseName}>{replayData.topCategory.category}</Text>
                <Text style={styles.showcaseAmount}>
                  {formatCurrency(replayData.topCategory.amount, settings.currency)}
                </Text>
                <View style={styles.percentagePill}>
                  <Text style={styles.percentagePillText}>
                    {replayData.topCategory.percentage}% of your total spending
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.cardBodyText}>No category recorded yet.</Text>
            )}
          </View>
        );

      case 2:
        return (
          <View style={styles.cardInner}>
            <View style={[styles.iconCircleLarge, { backgroundColor: '#FFF7ED' }]}>
              <Flame size={32} color="#EA580C" strokeWidth={1.75} />
            </View>
            <Text style={styles.cardHeaderSmall}>ACTIVE SPENDING</Text>
            <Text style={styles.hugeNumber}>
              {replayData.spendingDaysCount} {replayData.spendingDaysCount === 1 ? 'day' : 'days'}
            </Text>
            <Text style={styles.cardBodyText}>
              You recorded expenses on {replayData.spendingDaysCount} {replayData.spendingDaysCount === 1 ? 'day' : 'days'} this month.
            </Text>
          </View>
        );

      case 3:
        return (
          <View style={styles.cardInner}>
            <View style={[styles.iconCircleLarge, { backgroundColor: '#ECFDF5' }]}>
              <ShieldCheck size={32} color="#059669" strokeWidth={1.75} />
            </View>
            <Text style={styles.cardHeaderSmall}>MINDFUL WALLET</Text>
            <Text style={styles.hugeNumber}>
              {replayData.noSpendDaysCount} {replayData.noSpendDaysCount === 1 ? 'day' : 'days'}
            </Text>
            <Text style={styles.cardBodyText}>
              You kept your wallet untouched for {replayData.noSpendDaysCount} {replayData.noSpendDaysCount === 1 ? 'day' : 'days'} this month.
            </Text>
          </View>
        );

      case 4:
        return (
          <View style={styles.cardInner}>
            <View style={[styles.iconCircleLarge, { backgroundColor: '#EFF6FF' }]}>
              <WalletCards size={32} color="#2563EB" strokeWidth={1.75} />
            </View>
            <Text style={styles.cardHeaderSmall}>PEAK TRANSACTION</Text>
            <Text style={styles.cardTitle}>Your biggest expense</Text>
            {replayData.biggestExpense ? (
              <View style={styles.biggestExpenseBox}>
                <Text style={styles.hugeNumber}>
                  {formatCurrency(replayData.biggestExpense.amount, settings.currency)}
                </Text>
                <Text style={styles.expenseNameText}>
                  {replayData.biggestExpense.name}
                </Text>
                <Text style={styles.expenseCatText}>
                  Category: {replayData.biggestExpense.category}
                </Text>
              </View>
            ) : (
              <Text style={styles.cardBodyText}>No expense recorded.</Text>
            )}
          </View>
        );

      case 5:
        return (
          <View style={styles.cardInner}>
            <View style={[styles.iconCircleLarge, { backgroundColor: '#F5F3FF' }]}>
              <Award size={32} color="#7C3AED" strokeWidth={1.75} />
            </View>
            <Text style={styles.cardHeaderSmall}>BUDGET PROGRESS</Text>
            <Text style={styles.cardTitle}>Your budget</Text>
            {replayData.hasBudget && replayData.budgetPercentage !== null ? (
              <View style={styles.budgetBox}>
                <Text style={styles.hugeNumber}>{replayData.budgetPercentage}%</Text>
                <Text style={styles.cardSubtitleLarge}>of monthly budget used</Text>
              </View>
            ) : (
              <Text style={styles.cardBodyText}>
                Set a budget to see your monthly progress.
              </Text>
            )}
          </View>
        );

      case 6:
      default:
        return (
          <View style={styles.cardInner}>
            <View style={styles.iconCircleLarge}>
              <Sparkles size={32} color={theme.colors.primary} strokeWidth={1.5} />
            </View>
            <Text style={styles.cardHeaderSmall}>MONTH COMPLETE</Text>
            <Text style={styles.cardTitle}>Your {replayData.monthName} Money Replay</Text>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryRow}>
                <Check size={14} color={theme.colors.primary} strokeWidth={2} />
                <Text style={styles.summaryRowText}>
                  {formatCurrency(replayData.totalSpent, settings.currency)} total spent
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Check size={14} color={theme.colors.primary} strokeWidth={2} />
                <Text style={styles.summaryRowText}>
                  {replayData.noSpendDaysCount} no-spend days
                </Text>
              </View>

              {replayData.topCategory && (
                <View style={styles.summaryRow}>
                  <Check size={14} color={theme.colors.primary} strokeWidth={2} />
                  <Text style={styles.summaryRowText}>
                    {replayData.topCategory.category} was your biggest category
                  </Text>
                </View>
              )}

              {replayData.hasBudget && replayData.budgetPercentage !== null && (
                <View style={styles.summaryRow}>
                  <Check size={14} color={theme.colors.primary} strokeWidth={2} />
                  <Text style={styles.summaryRowText}>
                    {replayData.budgetPercentage}% of budget used
                  </Text>
                </View>
              )}
            </View>
          </View>
        );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaPage topSpacing={8} bottomSpacing={12} backgroundColor={theme.colors.surface}>
        {/* Top Progress Bars */}
        <View style={styles.progressBarsContainer}>
          {Array.from({ length: totalSteps }).map((_, idx) => (
            <View key={idx} style={styles.progressBarItem}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: idx <= currentStep ? '100%' : '0%',
                    backgroundColor: idx <= currentStep ? theme.colors.primary : 'transparent',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* Top Close Button */}
        <View style={styles.topBar}>
          <Text style={styles.replayBrandText}>Money Replay</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.7}
            accessibilityLabel="Close"
          >
            <X size={18} color={theme.colors.textPrimary} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        {/* Card Body Area */}
        <View style={styles.cardContainer}>
          <TouchableWithoutFeedback onPress={handlePrev}>
            <View style={styles.tapLeftZone} />
          </TouchableWithoutFeedback>

          <TouchableWithoutFeedback onPress={handleNext}>
            <View style={styles.tapRightZone} />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.animatedCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {renderCardContent()}
          </Animated.View>
        </View>

        {/* Bottom Navigation Controls */}
        <View style={styles.bottomControls}>
          {currentStep > 0 ? (
            <TouchableOpacity
              style={styles.navBtnPrev}
              onPress={handlePrev}
              activeOpacity={0.7}
            >
              <ChevronLeft size={16} color={theme.colors.textSecondary} strokeWidth={1.5} />
              <Text style={styles.navBtnPrevText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 80 }} />
          )}

          <TouchableOpacity
            style={styles.navBtnNext}
            onPress={handleNext}
            activeOpacity={0.7}
          >
            <Text style={styles.navBtnNextText}>
              {currentStep === totalSteps - 1 || !replayData.hasExpenses ? 'Done' : 'Next'}
            </Text>
            {currentStep < totalSteps - 1 && replayData.hasExpenses && (
              <ChevronRight size={16} color={theme.colors.surface} strokeWidth={2} />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaPage>
    </Modal>
  );
};

const styles = StyleSheet.create({
  progressBarsContainer: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  progressBarItem: {
    flex: 1,
    height: 3,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  replayBrandText: {
    ...theme.typography.label,
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 9999, // Fully rounded
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    position: 'relative',
  },
  tapLeftZone: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '35%',
    zIndex: 2,
  },
  tapRightZone: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '65%',
    zIndex: 2,
  },
  animatedCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: theme.colors.background,
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 380,
  },
  cardInner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  iconCircleLarge: {
    width: 64,
    height: 64,
    borderRadius: 9999, // Fully rounded
    backgroundColor: theme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardHeaderSmall: {
    ...theme.typography.label,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  cardTitle: {
    ...theme.typography.display,
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  hugeNumber: {
    ...theme.typography.display,
    fontSize: 36,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  cardSubtitleLarge: {
    ...theme.typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 14,
  },
  cardBodyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  categoryShowcase: {
    alignItems: 'center',
    marginTop: 8,
  },
  showcaseName: {
    ...theme.typography.sectionHeading,
    fontSize: 18,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  showcaseAmount: {
    ...theme.typography.display,
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 8,
  },
  percentagePill: {
    backgroundColor: theme.colors.accentLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999, // Fully rounded
  },
  percentagePillText: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  biggestExpenseBox: {
    alignItems: 'center',
    marginTop: 4,
  },
  expenseNameText: {
    ...theme.typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  expenseCatText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  budgetBox: {
    alignItems: 'center',
  },
  summaryGrid: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    gap: 10,
    marginTop: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryRowText: {
    ...theme.typography.body,
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  navBtnPrev: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 9999, // Fully rounded
    backgroundColor: theme.colors.backgroundSecondary,
  },
  navBtnPrevText: {
    ...theme.typography.body,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  navBtnNext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 9999, // Fully rounded
    backgroundColor: theme.colors.primary,
  },
  navBtnNextText: {
    ...theme.typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.surface,
  },
});
