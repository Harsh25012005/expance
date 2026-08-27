import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  Sparkles,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Utensils,
  Car,
  ShoppingBag,
  Zap,
  Film,
  HeartPulse,
  Plane,
  GraduationCap,
  MoreHorizontal,
  PieChart,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExpenses } from '../context/ExpenseContext';
import { useShake } from '../context/ShakeContext';
import { CategoryType } from '../types/expense';
import { CATEGORIES } from '../constants/categories';
import { formatCurrency } from '../utils/formatters';
import { getMonthName, calculateStreaks } from '../utils/analyticsHelpers';
import { MoneyReplayModal } from '../components/MoneyReplayModal';
import { WhereDidItGoModal } from '../components/WhereDidItGoModal';
import { theme } from '../constants/theme';

export const AnalyticsScreen: React.FC = () => {
  const { expenses, settings, stats } = useExpenses();
  const { openAddExpensePopup } = useShake();
  const insets = useSafeAreaInsets();

  const [showReplayModal, setShowReplayModal] = useState<boolean>(false);
  const [showWhereDidItGoModal, setShowWhereDidItGoModal] = useState<boolean>(false);

  const now = new Date();
  const currentMonthName = getMonthName(now.getMonth());
  const currentYear = now.getFullYear();

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
  };

  // Streaks info
  const streakStats = useMemo(() => {
    return calculateStreaks(expenses, settings.monthlyBudget || 0);
  }, [expenses, settings.monthlyBudget]);

  // Active category distribution sorted by amount descending (Real data only)
  const categoryBreakdown = useMemo(() => {
    const list: { category: CategoryType; amount: number; percentage: number; label: string }[] = [];
    const total = stats.thisMonthSpending;

    for (const cat of CATEGORIES) {
      const amt = stats.categoryTotals[cat.id] || 0;
      if (amt > 0) {
        const pct = total > 0 ? Math.round((amt / total) * 100) : 0;
        list.push({ category: cat.id, amount: amt, percentage: pct, label: cat.label });
      }
    }

    return list.sort((a, b) => b.amount - a.amount);
  }, [stats]);

  const topCategory = categoryBreakdown[0] || null;

  // Smart natural language insight generated strictly from actual stored data
  const smartInsight = useMemo(() => {
    if (expenses.length === 0 || stats.thisMonthSpending === 0) {
      return null;
    }

    if (topCategory && categoryBreakdown.length === 1) {
      return `${topCategory.label} is your only spending category so far this month.`;
    }

    if (stats.lastMonthSpending > 0 && stats.percentageChange !== null) {
      if (stats.percentageChange > 0) {
        return `You spent ${Math.round(stats.percentageChange)}% more than last month (${formatCurrency(stats.lastMonthSpending, settings.currency)}).`;
      } else if (stats.percentageChange < 0) {
        return `Your spending is down by ${Math.abs(Math.round(stats.percentageChange))}% compared with last month.`;
      }
    }

    if (topCategory) {
      return `${topCategory.label} is your biggest spending category this month.`;
    }

    return `Tracking your daily spending gives you clear control over your finances.`;
  }, [expenses.length, stats, topCategory, categoryBreakdown.length, settings.currency]);

  // Last 4 Months History for Trend Chart
  const monthlyTrends = useMemo(() => {
    const monthsData: { label: string; amount: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const yr = d.getFullYear();
      const shortName = getMonthName(mIdx).substring(0, 3);

      let mTotal = 0;
      for (const exp of expenses) {
        const expDate = new Date(exp.createdAt);
        if (expDate.getFullYear() === yr && expDate.getMonth() === mIdx) {
          mTotal += Number(exp.amount) || 0;
        }
      }

      monthsData.push({ label: shortName, amount: mTotal });
    }
    return monthsData;
  }, [expenses]);

  const maxMonthSpend = useMemo(() => {
    const max = Math.max(...monthlyTrends.map((m) => m.amount));
    return max > 0 ? max : 1;
  }, [monthlyTrends]);

  const renderCategoryIcon = (category: CategoryType, size: number = 14) => {
    switch (category) {
      case 'Food':
        return <Utensils size={size} color={theme.colors.primary} strokeWidth={1.75} />;
      case 'Transport':
        return <Car size={size} color={theme.colors.primary} strokeWidth={1.75} />;
      case 'Shopping':
        return <ShoppingBag size={size} color={theme.colors.primary} strokeWidth={1.75} />;
      case 'Bills':
        return <Zap size={size} color={theme.colors.primary} strokeWidth={1.75} />;
      case 'Entertainment':
        return <Film size={size} color={theme.colors.primary} strokeWidth={1.75} />;
      case 'Health':
        return <HeartPulse size={size} color={theme.colors.primary} strokeWidth={1.75} />;
      case 'Travel':
        return <Plane size={size} color={theme.colors.primary} strokeWidth={1.75} />;
      case 'Education':
        return <GraduationCap size={size} color={theme.colors.primary} strokeWidth={1.75} />;
      case 'Other':
      default:
        return <MoreHorizontal size={size} color={theme.colors.primary} strokeWidth={1.75} />;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingBottom: 95 + Math.max(insets.bottom, 16) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* ──────────────── 1. EDITORIAL STORY HERO: WHERE DID IT GO? ──────────────── */}
      <View style={styles.storyHeroCard}>
        <View style={styles.storyHeroTop}>
          <View>
            <Text style={styles.storyHeroPre}>{currentMonthName.toUpperCase()} {currentYear}</Text>
            <Text style={styles.storyHeroTitle}>Where Did It Go?</Text>
          </View>
          <TouchableOpacity
            style={styles.storyDrillDownBtn}
            onPress={() => {
              triggerHaptic();
              setShowWhereDidItGoModal(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.storyDrillDownText}>Story</Text>
            <ArrowUpRight size={13} color={theme.colors.primary} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={styles.amountDisplayRow}>
          <Text style={styles.heroTotalAmount}>
            {formatCurrency(stats.thisMonthSpending, settings.currency)}
          </Text>
          <Text style={styles.heroTotalLabel}>Total spent this month</Text>
        </View>

        {/* Dynamic Month-over-Month Comparison */}
        {stats.percentageChange !== null ? (
          <View style={styles.heroComparisonRow}>
            {stats.percentageChange > 0 ? (
              <View style={styles.heroTrendBadge}>
                <TrendingUp size={12} color={theme.colors.negative} strokeWidth={2} />
                <Text style={styles.heroTrendNegativeText}>
                  +{Math.abs(Math.round(stats.percentageChange))}% compared with last month
                </Text>
              </View>
            ) : stats.percentageChange < 0 ? (
              <View style={styles.heroTrendBadge}>
                <TrendingDown size={12} color={theme.colors.positive} strokeWidth={2} />
                <Text style={styles.heroTrendPositiveText}>
                  -{Math.abs(Math.round(stats.percentageChange))}% compared with last month
                </Text>
              </View>
            ) : (
              <Text style={styles.heroTrendNeutralText}>
                0% compared with last month
              </Text>
            )}
          </View>
        ) : null}
      </View>

      {/* ──────────────── 2. EMPTY STATE VS REAL CONTENT ──────────────── */}
      {expenses.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconCircle}>
            <PieChart size={28} color={theme.colors.textTertiary} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyHeading}>No expenses yet</Text>
          <Text style={styles.emptyDesc}>
            Shake your phone or tap Add to record your first expense.
          </Text>
          <TouchableOpacity
            style={styles.emptyAddBtn}
            onPress={() => openAddExpensePopup()}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyAddBtnText}>Add Expense</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* ──────────────── 3. TOP SPENDING CATEGORY SECTION ──────────────── */}
          {topCategory && (
            <View style={styles.topExpenseCard}>
              <View style={styles.topExpenseHeader}>
                <Text style={styles.topExpenseTag}>YOUR BIGGEST EXPENSE</Text>
                <View style={styles.topExpenseIconWrap}>
                  {renderCategoryIcon(topCategory.category, 14)}
                </View>
              </View>

              <View style={styles.topExpenseBody}>
                <Text style={styles.topExpenseCatName}>{topCategory.label}</Text>
                <View style={styles.topExpenseAmountRow}>
                  <Text style={styles.topExpenseAmount}>
                    {formatCurrency(topCategory.amount, settings.currency)}
                  </Text>
                  <Text style={styles.topExpenseShare}>
                    {Math.round(topCategory.percentage)}% of your total spending
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ──────────────── 4. SMART INSIGHT CARD ──────────────── */}
          {smartInsight && (
            <View style={styles.smartInsightBox}>
              <View style={styles.smartInsightIconCircle}>
                <Sparkles size={14} color={theme.colors.primary} strokeWidth={2} />
              </View>
              <Text style={styles.smartInsightText}>{smartInsight}</Text>
            </View>
          )}

          {/* ──────────────── 5. EDITORIAL INSIGHT CARDS ──────────────── */}
          <View style={styles.insightsSection}>
            <Text style={styles.sectionHeader}>KEY INSIGHTS</Text>
            <View style={styles.insightsRow}>
              {/* Insight 1: Month Comparison */}
              <View style={styles.insightBox}>
                <View style={styles.insightIconCircle}>
                  {stats.percentageChange !== null && stats.percentageChange > 0 ? (
                    <TrendingUp size={16} color={theme.colors.negative} strokeWidth={2} />
                  ) : (
                    <TrendingDown size={16} color={theme.colors.positive} strokeWidth={2} />
                  )}
                </View>
                <Text style={styles.insightLabel}>VS LAST MONTH</Text>
                <Text style={styles.insightValue}>
                  {stats.percentageChange !== null
                    ? `${Math.abs(Math.round(stats.percentageChange))}% ${
                        stats.percentageChange > 0 ? 'more' : 'less'
                      }`
                    : 'First month'}
                </Text>
                <Text style={styles.insightNote}>
                  {stats.lastMonthSpending > 0
                    ? `${formatCurrency(stats.lastMonthSpending, settings.currency)} in ${getMonthName(
                        (now.getMonth() - 1 + 12) % 12
                      ).substring(0, 3)}`
                    : 'No previous month data'}
                </Text>
              </View>

              {/* Insight 2: No-Spend Days */}
              <View style={styles.insightBox}>
                <View style={[styles.insightIconCircle, { backgroundColor: '#ECFDF5' }]}>
                  <ShieldCheck size={16} color="#059669" strokeWidth={2} />
                </View>
                <Text style={styles.insightLabel}>NO-SPEND DAYS</Text>
                <Text style={styles.insightValue}>
                  {streakStats.totalNoSpendDaysThisMonth} {streakStats.totalNoSpendDaysThisMonth === 1 ? 'day' : 'days'}
                </Text>
                <Text style={styles.insightNote}>
                  Wallet untouched this month
                </Text>
              </View>
            </View>
          </View>

          {/* ──────────────── 6. CATEGORY BREAKDOWN LIST (Highest -> Lowest) ──────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>CATEGORY BREAKDOWN</Text>
              <Text style={styles.sectionHeaderAction}>
                {categoryBreakdown.length} {categoryBreakdown.length === 1 ? 'category' : 'categories'}
              </Text>
            </View>

            <View style={styles.card}>
              {categoryBreakdown.length === 0 ? (
                <Text style={styles.noDataCardText}>No expenses recorded this month.</Text>
              ) : (
                categoryBreakdown.map((item, idx) => {
                  const isLast = idx === categoryBreakdown.length - 1;
                  return (
                    <React.Fragment key={item.category}>
                      <View style={styles.breakdownRow}>
                        <View style={styles.breakdownIconWrap}>
                          {renderCategoryIcon(item.category, 15)}
                        </View>

                        <View style={styles.breakdownMiddle}>
                          <View style={styles.breakdownTopRow}>
                            <Text style={styles.breakdownCatName}>{item.label}</Text>
                            <Text style={styles.breakdownCatAmount}>
                              {formatCurrency(item.amount, settings.currency)}
                            </Text>
                          </View>

                          {/* Progress Track */}
                          <View style={styles.progressTrack}>
                            <View
                              style={[
                                styles.progressFill,
                                { width: `${Math.min(item.percentage, 100)}%` },
                              ]}
                            />
                          </View>
                        </View>

                        <Text style={styles.breakdownPctText}>{item.percentage}%</Text>
                      </View>
                      {!isLast && <View style={styles.rowDivider} />}
                    </React.Fragment>
                  );
                })
              )}
            </View>
          </View>

          {/* ──────────────── 7. 4-MONTH SPENDING TREND ──────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>SPENDING TREND (4 MONTHS)</Text>
            <View style={styles.card}>
              <View style={styles.trendBarsRow}>
                {monthlyTrends.map((m, idx) => {
                  const barHeight = Math.max(
                    Math.round((m.amount / maxMonthSpend) * 90),
                    m.amount > 0 ? 8 : 2
                  );
                  const isCurrent = idx === monthlyTrends.length - 1;
                  return (
                    <View key={m.label} style={styles.trendCol}>
                      <Text style={styles.trendAmountLabel}>
                        {m.amount > 0 ? formatCurrency(m.amount, settings.currency) : '—'}
                      </Text>
                      <View style={styles.trendBarContainer}>
                        <View
                          style={[
                            styles.trendBarFill,
                            {
                              height: barHeight,
                              backgroundColor: isCurrent
                                ? theme.colors.primary
                                : theme.colors.backgroundSecondary,
                              borderColor: isCurrent ? theme.colors.primary : theme.colors.border,
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[
                          styles.trendMonthLabel,
                          isCurrent && styles.trendMonthLabelActive,
                        ]}
                      >
                        {m.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {/* ──────────────── 8. MONEY REPLAY BANNER ──────────────── */}
          <TouchableOpacity
            style={styles.replayBanner}
            onPress={() => {
              triggerHaptic();
              setShowReplayModal(true);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.replayBannerLeft}>
              <View style={styles.replayIconCircle}>
                <Sparkles size={18} color={theme.colors.primary} strokeWidth={1.75} />
              </View>
              <View>
                <Text style={styles.replayBannerTitle}>Monthly Money Replay</Text>
                <Text style={styles.replayBannerSubtitle}>
                  Step-by-step recap of your {currentMonthName} spending habits
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color={theme.colors.primary} strokeWidth={2} />
          </TouchableOpacity>
        </>
      )}

      {/* Money Replay Modal */}
      <MoneyReplayModal
        visible={showReplayModal}
        onClose={() => setShowReplayModal(false)}
      />

      {/* Where Did It Go Story Modal */}
      <WhereDidItGoModal
        visible={showWhereDidItGoModal}
        onClose={() => setShowWhereDidItGoModal(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 95,
  },
  storyHeroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  storyHeroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  storyHeroPre: {
    ...theme.typography.label,
    fontSize: 10,
    color: theme.colors.textSecondary,
    letterSpacing: 0.6,
  },
  storyHeroTitle: {
    ...theme.typography.display,
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  storyDrillDownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.accentLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  storyDrillDownText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  amountDisplayRow: {
    marginBottom: 8,
  },
  heroTotalAmount: {
    ...theme.typography.amount,
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -0.8,
  },
  heroTotalLabel: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  heroComparisonRow: {
    marginTop: 4,
  },
  heroTrendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroTrendNegativeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.negative,
  },
  heroTrendPositiveText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.positive,
  },
  heroTrendNeutralText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginVertical: 12,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 9999,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyHeading: {
    ...theme.typography.sectionHeading,
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  emptyDesc: {
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
    marginBottom: 20,
  },
  emptyAddBtn: {
    backgroundColor: theme.colors.textPrimary,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 9999,
  },
  emptyAddBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  topExpenseCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  topExpenseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  topExpenseTag: {
    ...theme.typography.label,
    fontSize: 10,
    color: theme.colors.textSecondary,
    letterSpacing: 0.6,
  },
  topExpenseIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 9999,
    backgroundColor: theme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topExpenseBody: {
    gap: 2,
  },
  topExpenseCatName: {
    ...theme.typography.sectionHeading,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  topExpenseAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  topExpenseAmount: {
    ...theme.typography.display,
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  topExpenseShare: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  smartInsightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.accentLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.15)',
  },
  smartInsightIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smartInsightText: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textPrimary,
    flex: 1,
    lineHeight: 17,
    fontWeight: '500',
  },
  insightsSection: {
    marginBottom: 18,
  },
  sectionHeader: {
    ...theme.typography.label,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionHeaderAction: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  insightsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  insightBox: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  insightIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  insightLabel: {
    ...theme.typography.label,
    fontSize: 9,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  insightValue: {
    ...theme.typography.sectionHeading,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  insightNote: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  section: {
    marginBottom: 18,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  noDataCardText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    paddingVertical: 12,
    textAlign: 'center',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  breakdownIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    backgroundColor: theme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownMiddle: {
    flex: 1,
  },
  breakdownTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  breakdownCatName: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  breakdownCatAmount: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  progressTrack: {
    height: 5,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 9999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 9999,
  },
  breakdownPctText: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    minWidth: 32,
    textAlign: 'right',
  },
  rowDivider: {
    height: 1,
    backgroundColor: theme.colors.borderSubtle,
  },
  trendBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    paddingTop: 16,
    paddingBottom: 4,
  },
  trendCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  trendAmountLabel: {
    ...theme.typography.caption,
    fontSize: 9,
    color: theme.colors.textSecondary,
    marginBottom: 6,
    textAlign: 'center',
  },
  trendBarContainer: {
    width: 24,
    height: 90,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  trendBarFill: {
    width: '100%',
    borderRadius: 6,
    borderWidth: 1,
  },
  trendMonthLabel: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
  trendMonthLabelActive: {
    fontWeight: '700',
    color: theme.colors.primary,
  },
  replayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  replayBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  replayIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 9999,
    backgroundColor: theme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replayBannerTitle: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  replayBannerSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
