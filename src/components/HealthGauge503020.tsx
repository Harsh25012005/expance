import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Scale, Sparkles, TrendingUp, ShieldCheck, HeartPulse } from 'lucide-react-native';
import { useExpenses } from '../context/ExpenseContext';
import { formatCurrency } from '../utils/formatters';

export const HealthGauge503020: React.FC = memo(() => {
  const { stats, settings, theme } = useExpenses();
  const rule = stats.rule503020;

  const getScoreColor = (score: number) => {
    if (score >= 80) return theme.colors.positive;
    if (score >= 60) return theme.colors.warning;
    return theme.colors.negative;
  };

  const scoreColor = getScoreColor(rule.score);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.badgeIcon, { backgroundColor: theme.colors.primaryLight }]}>
            <Scale size={16} color={theme.colors.primary} strokeWidth={2} />
          </View>
          <View>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>50 / 30 / 20 Health Score</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Financial Balance & Alignment</Text>
          </View>
        </View>

        {/* Dynamic Score Ring / Chip */}
        <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '15', borderColor: scoreColor + '40' }]}>
          <HeartPulse size={13} color={scoreColor} strokeWidth={2.5} />
          <Text style={[styles.scoreText, { color: scoreColor }]}>{rule.score}/100</Text>
        </View>
      </View>

      {/* Tri-Segmented 50/30/20 Visual Bar */}
      <View style={styles.barWrapper}>
        <View style={styles.segmentedBar}>
          <View
            style={[
              styles.barSegment,
              {
                width: `${Math.max(5, rule.needsPercentage)}%`,
                backgroundColor: '#3B82F6', // Blue for Needs
                borderTopLeftRadius: 6,
                borderBottomLeftRadius: 6,
              },
            ]}
          />
          <View
            style={[
              styles.barSegment,
              {
                width: `${Math.max(5, rule.wantsPercentage)}%`,
                backgroundColor: '#EC4899', // Pink for Wants
              },
            ]}
          />
          <View
            style={[
              styles.barSegment,
              {
                width: `${Math.max(5, rule.savingsPercentage)}%`,
                backgroundColor: '#10B981', // Emerald for Savings
                borderTopRightRadius: 6,
                borderBottomRightRadius: 6,
              },
            ]}
          />
        </View>
      </View>

      {/* Breakdown Metrics Grid */}
      <View style={[styles.metricsGrid, { backgroundColor: theme.colors.background, borderColor: theme.colors.borderSubtle }]}>
        {/* 1. Needs */}
        <View style={styles.metricColumn}>
          <View style={styles.metricLabelRow}>
            <View style={[styles.indicatorDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={[styles.metricTitle, { color: theme.colors.textPrimary }]}>Needs (50%)</Text>
          </View>
          <Text style={[styles.metricPct, { color: '#3B82F6' }]}>{rule.needsPercentage}%</Text>
          <Text style={[styles.metricAmount, { color: theme.colors.textSecondary }]}>
            {formatCurrency(rule.needsAmount, settings.currency)}
          </Text>
        </View>

        {/* 2. Wants */}
        <View style={styles.metricColumn}>
          <View style={styles.metricLabelRow}>
            <View style={[styles.indicatorDot, { backgroundColor: '#EC4899' }]} />
            <Text style={[styles.metricTitle, { color: theme.colors.textPrimary }]}>Wants (30%)</Text>
          </View>
          <Text style={[styles.metricPct, { color: '#EC4899' }]}>{rule.wantsPercentage}%</Text>
          <Text style={[styles.metricAmount, { color: theme.colors.textSecondary }]}>
            {formatCurrency(rule.wantsAmount, settings.currency)}
          </Text>
        </View>

        {/* 3. Savings */}
        <View style={styles.metricColumn}>
          <View style={styles.metricLabelRow}>
            <View style={[styles.indicatorDot, { backgroundColor: '#10B981' }]} />
            <Text style={[styles.metricTitle, { color: theme.colors.textPrimary }]}>Savings (20%)</Text>
          </View>
          <Text style={[styles.metricPct, { color: '#10B981' }]}>{rule.savingsPercentage}%</Text>
          <Text style={[styles.metricAmount, { color: theme.colors.textSecondary }]}>
            {formatCurrency(rule.savingsAmount, settings.currency)}
          </Text>
        </View>
      </View>

      {/* Smart Coaching Advice Callout */}
      <View style={[styles.adviceBox, { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.borderSubtle }]}>
        <Sparkles size={14} color={theme.colors.primary} strokeWidth={2} style={styles.adviceIcon} />
        <View style={styles.adviceTextCol}>
          <Text style={[styles.adviceStatus, { color: theme.colors.textPrimary }]}>{rule.statusText}</Text>
          <Text style={[styles.adviceBody, { color: theme.colors.textSecondary }]}>{rule.recommendation}</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badgeIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '700',
  },
  barWrapper: {
    marginBottom: 12,
  },
  segmentedBar: {
    height: 12,
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: 'rgba(150, 150, 150, 0.15)',
  },
  barSegment: {
    height: '100%',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  metricColumn: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metricTitle: {
    fontSize: 10,
    fontWeight: '600',
  },
  metricPct: {
    fontSize: 16,
    fontWeight: '800',
    marginVertical: 1,
  },
  metricAmount: {
    fontSize: 11,
    fontWeight: '500',
  },
  adviceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  adviceIcon: {
    marginTop: 2,
  },
  adviceTextCol: {
    flex: 1,
  },
  adviceStatus: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  adviceBody: {
    fontSize: 11,
    lineHeight: 15,
  },
});
