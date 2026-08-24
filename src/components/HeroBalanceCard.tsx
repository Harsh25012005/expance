import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {
  TrendingUp,
  RefreshCw,
  FileSpreadsheet,
  SmartphoneNfc,
  Calendar,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react-native';
import { useExpense } from '../context/ExpenseContext';
import { useShake } from '../context/ShakeContext';
import { formatCurrency } from '../utils/formatters';

interface HeroBalanceCardProps {
  onOpenSheetModal?: () => void;
}

export const HeroBalanceCard: React.FC<HeroBalanceCardProps> = ({ onOpenSheetModal }) => {
  const {
    totalSpending,
    todaySpending,
    thisMonthSpending,
    currency,
    sheetConfig,
    isSyncing,
    syncWithGoogleSheet,
    unsyncedCount,
  } = useExpense();

  const { openShakeModal, simulateShake } = useShake();

  const handleSyncPress = async () => {
    await syncWithGoogleSheet(true);
  };

  return (
    <View style={styles.cardContainer}>
      {/* Background visual elements */}
      <View style={styles.gradientOrb1} />
      <View style={styles.gradientOrb2} />

      <View style={styles.cardContent}>
        {/* Top Header with Live Sheet Status Badge */}
        <View style={styles.topRow}>
          <View style={styles.badgeContainer}>
            <View style={styles.sparkleIcon}>
              <Sparkles size={14} color="#10b981" />
            </View>
            <Text style={styles.badgeText}>Total Spending</Text>
          </View>

          {/* Google Sheets Connection Pill */}
          <TouchableOpacity
            style={[
              styles.sheetStatusPill,
              sheetConfig.isConnected && styles.sheetStatusConnected,
              unsyncedCount > 0 && styles.sheetStatusPending,
            ]}
            onPress={onOpenSheetModal}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.statusDot,
                sheetConfig.isConnected ? styles.statusDotGreen : styles.statusDotOrange,
              ]}
            />
            <FileSpreadsheet size={13} color={sheetConfig.isConnected ? '#34d399' : '#fbbf24'} />
            <Text
              style={[
                styles.sheetStatusText,
                sheetConfig.isConnected ? styles.sheetTextGreen : styles.sheetTextOrange,
              ]}
            >
              {sheetConfig.isConnected
                ? unsyncedCount > 0
                  ? `${unsyncedCount} Pending Sync`
                  : 'Sheet Synced'
                : 'Connect Sheet'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Main Big Total Amount */}
        <View style={styles.amountRow}>
          <Text style={styles.mainAmount}>{formatCurrency(totalSpending, currency)}</Text>
        </View>

        {/* Breakdown sub-metrics: Today vs This Month */}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <View style={styles.metricLabelRow}>
              <TrendingUp size={14} color="#38bdf8" />
              <Text style={styles.metricLabel}>Today's Spend</Text>
            </View>
            <Text style={styles.metricValue}>{formatCurrency(todaySpending, currency)}</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricItem}>
            <View style={styles.metricLabelRow}>
              <Calendar size={14} color="#a78bfa" />
              <Text style={styles.metricLabel}>This Month</Text>
            </View>
            <Text style={styles.metricValue}>{formatCurrency(thisMonthSpending, currency)}</Text>
          </View>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionsRow}>
          {/* Shake Action Button */}
          <TouchableOpacity
            style={styles.shakeActionBtn}
            onPress={simulateShake}
            activeOpacity={0.8}
          >
            <SmartphoneNfc size={18} color="#090d16" />
            <Text style={styles.shakeActionBtnText}>Shake to Add</Text>
          </TouchableOpacity>

          {/* Sync with Sheet Button */}
          <TouchableOpacity
            style={[styles.syncActionBtn, isSyncing && styles.syncActionBtnDisabled]}
            onPress={handleSyncPress}
            disabled={isSyncing}
            activeOpacity={0.7}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#38bdf8" />
            ) : (
              <>
                <RefreshCw size={16} color="#38bdf8" />
                <Text style={styles.syncActionBtnText}>Sync Sheet</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#334155',
    overflow: 'hidden',
    position: 'relative',
    marginHorizontal: 16,
    marginVertical: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  gradientOrb1: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  gradientOrb2: {
    position: 'absolute',
    bottom: -60,
    left: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },
  cardContent: {
    padding: 20,
    gap: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sparkleIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: 0.2,
  },
  sheetStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    gap: 5,
  },
  sheetStatusConnected: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  sheetStatusPending: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderColor: 'rgba(249, 115, 22, 0.4)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotGreen: {
    backgroundColor: '#10b981',
  },
  statusDotOrange: {
    backgroundColor: '#f59e0b',
  },
  sheetStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sheetTextGreen: {
    color: '#34d399',
  },
  sheetTextOrange: {
    color: '#fbbf24',
  },
  amountRow: {
    marginTop: -4,
  },
  mainAmount: {
    fontSize: 38,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -1,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  metricItem: {
    flex: 1,
    gap: 4,
  },
  metricDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#334155',
    marginHorizontal: 12,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metricLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  shakeActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderRadius: 14,
    height: 44,
    gap: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  shakeActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#090d16',
  },
  syncActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 14,
    height: 44,
    paddingHorizontal: 16,
    gap: 6,
  },
  syncActionBtnDisabled: {
    opacity: 0.6,
  },
  syncActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#38bdf8',
  },
});
