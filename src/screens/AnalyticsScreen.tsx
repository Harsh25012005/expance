import React, { useState, useMemo, memo } from 'react';
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
import { SpendingHeatmap } from '../components/SpendingHeatmap';

export const AnalyticsScreen: React.FC = memo(() => {
  const { expenses, settings, stats, theme } = useExpenses();
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

  // Active category distribution sorted by amount descending
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
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingBottom: 95 + Math.max(insets.bottom, 16) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* ──────────────── 1. EDITORIAL STORY HERO: WHERE DID IT GO? ──────────────── */}
      <View style={[styles.storyHeroCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.storyHeroTop}>
          <View>
            <Text style={[styles.storyHeroPre, { color: theme.colors.textSecondary }]}>{currentMonthName.toUpperCase()} {currentYear}</Text>
            <Text style={[styles.storyHeroTitle, { color: theme.colors.textPrimary }]}>Where Did It Go?</Text>
          </View>
          <TouchableOpacity
            style={[styles.storyDrillDownBtn, { backgroundColor: theme.colors.accentLight }]}
            onPress={() => {
              triggerHaptic();
              setShowWhereDidItGoModal(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.storyDrillDownText, { color: theme.colors.primary }]}>Story</Text>
            <ArrowUpRight size={13} color={theme.colors.primary} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={styles.amountDisplayRow}>
          <Text style={[styles.heroTotalAmount, { color: theme.colors.textPrimary }]}>
            {formatCurrency(stats.thisMonthSpending, settings.currency)}
          </Text>
          <Text style={[styles.heroTotalLabel, { color: theme.colors.textSecondary }]}>Total spent this month</Text>
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
              <Text style={[styles.heroTrendNeutralText, { color: theme.colors.textSecondary }]}>
                0% compared with last month
              </Text>
            )}
          </View>
        ) : null}
      </View>

      {/* ──────────────── 2. 365-DAY GITHUB-STYLE SPENDING HEATMAP ──────────────── */}
      <SpendingHeatmap />

      {/* ──────────────── 4. EMPTY STATE VS REAL CONTENT ──────────────── */}
      {expenses.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.emptyIconCircle, { backgroundColor: theme.colors.backgroundSecondary }]}>
            <PieChart size={28} color={theme.colors.textTertiary} strokeWidth={1.5} />
          </View>
          <Text style={[styles.emptyHeading, { color: theme.colors.textPrimary }]}>No expenses yet</Text>
          <Text style={[styles.emptyDesc, { color: theme.colors.textSecondary }]}>
            Shake your phone or tap Add to record your first expense.
          </Text>
          <TouchableOpacity
            style={[styles.emptyAddBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => openAddExpensePopup()}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyAddBtnText}>Add Expense</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* ──────────────── 5. TOP SPENDING CATEGORY SECTION ──────────────── */}
          {topCategory && (
            <View style={[styles.topExpenseCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.topExpenseHeader}>
                <Text style={[styles.topExpenseTag, { color: theme.colors.textSecondary }]}>YOUR BIGGEST EXPENSE</Text>
                <View style={[styles.topExpenseIconWrap, { backgroundColor: theme.colors.accentLight }]}>
                  {renderCategoryIcon(topCategory.category, 14)}
                </View>
              </View>

              <View style={styles.topExpenseBody}>
                <Text style={[styles.topExpenseCatName, { color: theme.colors.textPrimary }]}>{topCategory.label}</Text>
                <View style={styles.topExpenseAmountRow}>
                  <Text style={[styles.topExpenseAmount, { color: theme.colors.primary }]}>
                    {formatCurrency(topCategory.amount, settings.currency)}
                  </Text>
                  <Text style={[styles.topExpenseShare, { color: theme.colors.textSecondary }]}>
                    {Math.round(topCategory.percentage)}% of your total spending
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ──────────────── 6. SMART INSIGHT CARD ──────────────── */}
          {smartInsight && (
            <View style={[styles.smartInsightBox, { backgroundColor: theme.colors.accentLight, borderColor: theme.colors.borderSubtle }]}>
              <View style={styles.smartInsightIconCircle}>
                <Sparkles size={14} color={theme.colors.primary} strokeWidth={2} />
              </View>
              <Text style={[styles.smartInsightText, { color: theme.colors.textPrimary }]}>{smartInsight}</Text>
            </View>
          )}

          {/* ──────────────── 7. EDITORIAL INSIGHT CARDS ──────────────── */}
          <View style={styles.insightsSection}>
            <Text style={[styles.sectionHeader, { color: theme.colors.textSecondary }]}>KEY INSIGHTS</Text>
            <View style={styles.insightsRow}>
              {/* Insight 1: Month Comparison */}
              <View style={[styles.insightBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={[styles.insightIconCircle, { backgroundColor: theme.colors.backgroundSecondary }]}>
                  {stats.percentageChange !== null && stats.percentageChange > 0 ? (
                    <TrendingUp size={16} color={theme.colors.negative} strokeWidth={2} />
                  ) : (
                    <TrendingDown size={16} color={theme.colors.positive} strokeWidth={2} />
                  )}
                </View>
                <Text style={[styles.insightLabel, { color: theme.colors.textSecondary }]}>VS LAST MONTH</Text>
                <Text style={[styles.insightValue, { color: theme.colors.textPrimary }]}>
                  {stats.percentageChange !== null
                    ? `${Math.abs(Math.round(stats.percentageChange))}% ${
                        stats.percentageChange > 0 ? 'more' : 'less'
                      }`
                    : 'First month'}
                </Text>
                <Text style={[styles.insightNote, { color: theme.colors.textSecondary }]}>
                  {stats.lastMonthSpending > 0
                    ? `${formatCurrency(stats.lastMonthSpending, settings.currency)} in ${getMonthName(
                        (now.getMonth() - 1 + 12) % 12
                      ).substring(0, 3)}`
                    : 'No previous month data'}
                </Text>
              </View>

              {/* Insight 2: No-Spend Days */}
              <View style={[styles.insightBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={[styles.insightIconCircle, { backgroundColor: theme.colors.positiveLight }]}>
                  <ShieldCheck size={16} color={theme.colors.positive} strokeWidth={2} />
                </View>
                <Text style={[styles.insightLabel, { color: theme.colors.textSecondary }]}>NO-SPEND DAYS</Text>
                <Text style={[styles.insightValue, { color: theme.colors.textPrimary }]}>
                  {streakStats.totalNoSpendDaysThisMonth} {streakStats.totalNoSpendDaysThisMonth === 1 ? 'day' : 'days'}
                </Text>
                <Text style={[styles.insightNote, { color: theme.colors.textSecondary }]}>
                  Wallet untouched this month
                </Text>
              </View>
            </View>
          </View>

          {/* ──────────────── 8. CATEGORY BREAKDOWN LIST ──────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionHeader, { color: theme.colors.textSecondary }]}>CATEGORY BREAKDOWN</Text>
              <Text style={[styles.sectionHeaderAction, { color: theme.colors.textSecondary }]}>
                {categoryBreakdown.length} {categoryBreakdown.length === 1 ? 'category' : 'categories'}
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              {categoryBreakdown.length === 0 ? (
                <Text style={[styles.noDataCardText, { color: theme.colors.textSecondary }]}>No expenses recorded this month.</Text>
              ) : (
                categoryBreakdown.map((item, idx) => {
                  const isLast = idx === categoryBreakdown.length - 1;
                  return (
                    <React.Fragment key={item.category}>
                      <View style={styles.breakdownRow}>
                        <View style={[styles.breakdownIconWrap, { backgroundColor: theme.colors.accentLight }]}>
                          {renderCategoryIcon(item.category, 15)}
                        </View>

                        <View style={styles.breakdownMiddle}>
                          <View style={styles.breakdownTopRow}>
                            <Text style={[styles.breakdownCatName, { color: theme.colors.textPrimary }]}>{item.label}</Text>
                            <Text style={[styles.breakdownCatAmount, { color: theme.colors.textPrimary }]}>
                              {formatCurrency(item.amount, settings.currency)}
                            </Text>
                          </View>

                          {/* Progress Track */}
                          <View style={[styles.progressTrack, { backgroundColor: theme.colors.backgroundSecondary }]}>
                            <View
                              style={[
                                styles.progressFill,
                                { width: `${Math.min(item.percentage, 100)}%`, backgroundColor: theme.colors.primary },
                              ]}
                            />
                          </View>
                        </View>

                        <Text style={[styles.breakdownPctText, { color: theme.colors.textSecondary }]}>{item.percentage}%</Text>
                      </View>
                      {!isLast && <View style={[styles.rowDivider, { backgroundColor: theme.colors.borderSubtle }]} />}
                    </React.Fragment>
                  );
                })
              )}
            </View>
          </View>

          {/* ──────────────── 9. 4-MONTH SPENDING TREND ──────────────── */}
          <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: theme.colors.textSecondary }]}>SPENDING TREND (4 MONTHS)</Text>
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.trendBarsRow}>
                {monthlyTrends.map((m, idx) => {
                  const barHeight = Math.max(
                    Math.round((m.amount / maxMonthSpend) * 90),
                    m.amount > 0 ? 8 : 2
                  );
                  const isCurrent = idx === monthlyTrends.length - 1;
                  return (
                    <View key={m.label} style={styles.trendCol}>
                      <Text style={[styles.trendAmountLabel, { color: theme.colors.textSecondary }]}>
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
                          { color: isCurrent ? theme.colors.primary : theme.colors.textSecondary },
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

          {/* ──────────────── 10. MONEY REPLAY BANNER ──────────────── */}
          <TouchableOpacity
            style={[styles.replayBanner, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => {
              triggerHaptic();
              setShowReplayModal(true);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.replayBannerLeft}>
              <View style={[styles.replayIconCircle, { backgroundColor: theme.colors.accentLight }]}>
                <Sparkles size={18} color={theme.colors.primary} strokeWidth={1.75} />
              </View>
              <View>
                <Text style={[styles.replayBannerTitle, { color: theme.colors.textPrimary }]}>Monthly Money Replay</Text>
                <Text style={[styles.replayBannerSubtitle, { color: theme.colors.textSecondary }]}>
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
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 95,
  },
  storyHeroCard: {
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  storyHeroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  storyHeroPre: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  storyHeroTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 2,
  },
  storyDrillDownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  storyDrillDownText: {
    fontSize: 12,
    fontWeight: '600',
  },
  amountDisplayRow: {
    marginBottom: 8,
  },
  heroTotalAmount: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  heroTotalLabel: {
    fontSize: 12,
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
    color: '#DC2626',
  },
  heroTrendPositiveText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16A34A',
  },
  heroTrendNeutralText: {
    fontSize: 12,
  },
  emptyCard: {
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginVertical: 12,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
    marginBottom: 20,
  },
  emptyAddBtn: {
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
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  topExpenseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  topExpenseTag: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  topExpenseIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topExpenseBody: {
    gap: 2,
  },
  topExpenseCatName: {
    fontSize: 16,
    fontWeight: '700',
  },
  topExpenseAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  topExpenseAmount: {
    fontSize: 17,
    fontWeight: '700',
  },
  topExpenseShare: {
    fontSize: 12,
    fontWeight: '500',
  },
  smartInsightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  smartInsightIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smartInsightText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  insightsSection: {
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  sectionHeaderAction: {
    fontSize: 11,
    fontWeight: '500',
  },
  insightsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  insightBox: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  insightIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  insightLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  insightValue: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  insightNote: {
    fontSize: 11,
    lineHeight: 14,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  noDataCardText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  breakdownIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
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
    marginBottom: 4,
  },
  breakdownCatName: {
    fontSize: 13,
    fontWeight: '600',
  },
  breakdownCatAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  breakdownPctText: {
    fontSize: 12,
    fontWeight: '600',
    width: 32,
    textAlign: 'right',
  },
  rowDivider: {
    height: 1,
    marginVertical: 8,
  },
  trendBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 130,
    paddingTop: 10,
  },
  trendCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  trendAmountLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 6,
  },
  trendBarContainer: {
    width: 36,
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
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  trendMonthLabelActive: {
    fontWeight: '800',
  },
  replayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  replayBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  replayIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replayBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  replayBannerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
});
