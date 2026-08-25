import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import {
  Sparkles,
  PieChart,
  ChevronRight,
  MessageCircle,
  BarChart3,
  Utensils,
  Car,
  ShoppingBag,
  Zap,
  Film,
  HeartPulse,
  Plane,
  GraduationCap,
  MoreHorizontal,
  TrendingUp,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExpenses } from '../context/ExpenseContext';
import { CATEGORIES } from '../constants/categories';
import { CategoryType } from '../types/expense';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import {
  generateExplainMyMonth,
  getMonthName,
} from '../utils/analyticsHelpers';
import { MoneyMoodCard } from '../components/MoneyMoodCard';
import { StreaksCard } from '../components/StreaksCard';
import { MoneyReplayModal } from '../components/MoneyReplayModal';
import { WhereDidItGoModal } from '../components/WhereDidItGoModal';
import { theme } from '../constants/theme';

export const AnalyticsScreen: React.FC = () => {
  const { stats, settings, expenses } = useExpenses();
  const insets = useSafeAreaInsets();
  const [showMoneyReplay, setShowMoneyReplay] = useState<boolean>(false);
  const [showWhereDidItGo, setShowWhereDidItGo] = useState<boolean>(false);

  const now = new Date();
  const currentMonthName = getMonthName(now.getMonth());

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    } catch { }
  };

  const hasExpenses = expenses.length > 0;

  // Generate deterministic editorial natural language explanation
  const explainSummary = React.useMemo(() => {
    return generateExplainMyMonth(expenses, settings.monthlyBudget || 0, now, settings.currency);
  }, [expenses, settings.monthlyBudget, settings.currency]);

  // Active category breakdown for this month
  const activeCategories = CATEGORIES.map((cat) => ({
    ...cat,
    amount: stats.categoryTotals[cat.id] || 0,
    percentage:
      stats.totalSpending > 0
        ? ((stats.categoryTotals[cat.id] || 0) / stats.totalSpending) * 100
        : 0,
  }))
    .filter((cat) => cat.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const monthlyTrends = React.useMemo(() => {
    const monthsData: { label: string; amount: number; isCurrent: boolean }[] = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const label = d.toLocaleDateString('en-US', { month: 'short' });

      let sum = 0;
      for (const exp of expenses) {
        const expDate = new Date(exp.createdAt);
        if (expDate.getMonth() === m && expDate.getFullYear() === y) {
          sum += Number(exp.amount) || 0;
        }
      }
      monthsData.push({ label, amount: sum, isCurrent: i === 0 });
    }
    return monthsData;
  }, [expenses]);

  const maxMonthAmount = Math.max(...monthlyTrends.map((m) => m.amount), 1);

  const renderCategoryIcon = (id: CategoryType) => {
    const iconProps = { size: 14, color: theme.colors.textPrimary, strokeWidth: 1.75 };
    switch (id) {
      case 'Food':
        return <Utensils {...iconProps} />;
      case 'Transport':
        return <Car {...iconProps} />;
      case 'Shopping':
        return <ShoppingBag {...iconProps} />;
      case 'Bills':
        return <Zap {...iconProps} />;
      case 'Entertainment':
        return <Film {...iconProps} />;
      case 'Health':
        return <HeartPulse {...iconProps} />;
      case 'Travel':
        return <Plane {...iconProps} />;
      case 'Education':
        return <GraduationCap {...iconProps} />;
      case 'Other':
      default:
        return <MoreHorizontal {...iconProps} />;
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
        {/* 6. Money Replay Action Banner Widget */}
        <TouchableOpacity
          style={styles.replayBanner}
          onPress={() => {
            triggerHaptic();
            setShowMoneyReplay(true);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.replayBannerLeft}>
            <View style={styles.replayIconCircle}>
              <Sparkles size={18} color="#FFFFFF" strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.replayTitle}>Money Replay</Text>
              <Text style={styles.replaySubtitle}>
                {hasExpenses
                  ? `Experience your ${currentMonthName} spending story`
                  : 'Preview your interactive story recap'}
              </Text>
            </View>
          </View>

          <View style={styles.replayActionBtn}>
            <Text style={styles.replayActionText}>Open</Text>
            <ChevronRight size={13} color="#FFFFFF" strokeWidth={2.5} />
          </View>
        </TouchableOpacity>

        {/* 1. Money Mood Widget */}
        <MoneyMoodCard />

        {/* 2. Spending Breakdown (Monthly Trend Mini Chart Widget) */}
        <View style={styles.chartWidget}>
          <View style={styles.widgetHeader}>
            <View>
              <Text style={styles.widgetTitle}>Spending breakdown</Text>
              <Text style={styles.widgetSubtitle}>Last 4 months activity</Text>
            </View>
            <View style={styles.chartBadge}>
              <TrendingUp size={12} color={theme.colors.primary} strokeWidth={2} />
              <Text style={styles.chartBadgeText}>{currentMonthName}</Text>
            </View>
          </View>

          {/* Bar Chart Bars */}
          <View style={styles.chartContainer}>
            {monthlyTrends.map((m, index) => {
              const heightPct = Math.max((m.amount / maxMonthAmount) * 100, 8);
              return (
                <View key={index} style={styles.barColumn}>
                  <Text style={styles.barAmountText}>
                    {m.amount > 0 ? formatCurrency(m.amount, settings.currency).split('.')[0] : '₹0'}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${heightPct}%`,
                          backgroundColor: m.isCurrent ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.barLabel,
                      m.isCurrent && styles.barLabelActive,
                    ]}
                  >
                    {m.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* 3. Where Did It Go? Category Widget */}
        <View style={styles.categoryWidget}>
          <View style={styles.widgetHeader}>
            <View>
              <Text style={styles.widgetTitle}>Where did it go?</Text>
              <Text style={styles.widgetSubtitle}>
                {activeCategories.length} active spending {activeCategories.length === 1 ? 'category' : 'categories'}
              </Text>
            </View>

            {hasExpenses && (
              <TouchableOpacity
                style={styles.drillDownBtn}
                onPress={() => {
                  triggerHaptic();
                  setShowWhereDidItGo(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.drillDownBtnText}>Full Breakdown</Text>
                <ChevronRight size={13} color={theme.colors.primary} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>

          {/* Multi-segment distribution line */}
          {activeCategories.length > 0 ? (
            <>
              <View style={styles.multiBarTrack}>
                {activeCategories.slice(0, 5).map((cat) => (
                  <View
                    key={cat.id}
                    style={[
                      styles.multiBarSegment,
                      {
                        flex: Math.max(cat.percentage, 6),
                        backgroundColor: cat.color || theme.colors.primary,
                      },
                    ]}
                  />
                ))}
              </View>

              <View style={styles.categoriesList}>
                {activeCategories.slice(0, 4).map((cat) => (
                  <View key={cat.id} style={styles.categoryRow}>
                    <View style={styles.catLeft}>
                      <View style={[styles.catIconWrap, { backgroundColor: cat.color ? `${cat.color}15` : theme.colors.backgroundSecondary }]}>
                        {renderCategoryIcon(cat.id)}
                      </View>
                      <View>
                        <Text style={styles.catName}>{cat.label}</Text>
                        <Text style={styles.catPercent}>{formatPercentage(cat.percentage)} of total</Text>
                      </View>
                    </View>

                    <Text style={styles.catAmount}>
                      {formatCurrency(cat.amount, settings.currency)}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.emptyInsightsText}>
              No categorized expenses for this month yet.
            </Text>
          )}
        </View>

        {/* 4. Explain My Month (Editorial Callout Widget) */}
        <View style={styles.explainWidget}>
          <View style={styles.explainHeader}>
            <View style={styles.explainIconWrap}>
              <MessageCircle size={15} color={theme.colors.primary} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.explainBadge}>EXPLAIN MY MONTH</Text>
              <Text style={styles.explainTitle}>{explainSummary.title}</Text>
            </View>
          </View>

          <View style={styles.explainBody}>
            <Text style={styles.explainText}>{explainSummary.text}</Text>
          </View>
        </View>

        {/* 5. Streaks Statistics Widget */}
        <StreaksCard />


      </ScrollView>

      {/* Where Did It Go Full Drill-down Modal */}
      <WhereDidItGoModal
        visible={showWhereDidItGo}
        onClose={() => setShowWhereDidItGo(false)}
      />

      {/* Money Replay Modal */}
      <MoneyReplayModal
        visible={showMoneyReplay}
        onClose={() => setShowMoneyReplay(false)}
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
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  widgetTitle: {
    ...theme.typography.sectionHeading,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  widgetSubtitle: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  chartWidget: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  chartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chartBadgeText: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    paddingTop: 14,
    paddingHorizontal: 8,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barAmountText: {
    ...theme.typography.caption,
    fontSize: 9,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  barTrack: {
    width: 24,
    height: 70,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
  },
  barLabel: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginTop: 6,
  },
  barLabelActive: {
    fontWeight: '700',
    color: theme.colors.primary,
  },
  categoryWidget: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  drillDownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.colors.accentLight,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  drillDownBtnText: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  multiBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.backgroundSecondary,
    flexDirection: 'row',
    overflow: 'hidden',
    gap: 2,
    marginBottom: 14,
  },
  multiBarSegment: {
    height: '100%',
    borderRadius: 2,
  },
  categoriesList: {
    gap: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: {
    ...theme.typography.body,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  catPercent: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  catAmount: {
    ...theme.typography.body,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  emptyInsightsText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  explainWidget: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  explainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  explainIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: theme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explainBadge: {
    ...theme.typography.label,
    fontSize: 9,
    letterSpacing: 0.5,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  explainTitle: {
    ...theme.typography.sectionHeading,
    fontSize: 14,
    color: theme.colors.textPrimary,
    marginTop: 1,
  },
  explainBody: {
    backgroundColor: theme.colors.backgroundSecondary,
    padding: 12,
    borderRadius: theme.borderRadius.md,
  },
  explainText: {
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.textPrimary,
    lineHeight: 18,
  },
  replayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.container,
    padding: 16,
    marginBottom: 12,
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
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  replayTitle: {
    ...theme.typography.sectionHeading,
    fontSize: 15,
    color: '#FFFFFF',
  },
  replaySubtitle: {
    ...theme.typography.caption,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 1,
  },
  replayActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  replayActionText: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
