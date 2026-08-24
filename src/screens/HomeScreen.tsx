import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { ArrowRight, SmartphoneNfc, Plus, Sparkles, Inbox } from 'lucide-react-native';
import { useExpense } from '../context/ExpenseContext';
import { useShake } from '../context/ShakeContext';
import { HeroBalanceCard } from '../components/HeroBalanceCard';
import { ExpenseListItem } from '../components/ExpenseListItem';
import { CategorySpendingChart } from '../components/CategorySpendingChart';

interface HomeScreenProps {
  onNavigateToExpenses: () => void;
  onOpenSheetModal: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToExpenses,
  onOpenSheetModal,
}) => {
  const { expenses, isSyncing, syncWithGoogleSheet } = useExpense();
  const { openShakeModal, simulateShake } = useShake();
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await syncWithGoogleSheet(true);
    setRefreshing(false);
  };

  const recentExpenses = expenses.slice(0, 5);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing || isSyncing}
          onRefresh={onRefresh}
          tintColor="#10b981"
          colors={['#10b981']}
        />
      }
    >
      {/* 1. Hero Balance & Metrics Card */}
      <HeroBalanceCard onOpenSheetModal={onOpenSheetModal} />

      {/* 2. Interactive Shake Hint Banner */}
      <TouchableOpacity
        style={styles.shakeBanner}
        onPress={simulateShake}
        activeOpacity={0.8}
      >
        <View style={styles.shakeBannerIcon}>
          <SmartphoneNfc size={22} color="#10b981" />
        </View>
        <View style={styles.shakeBannerContent}>
          <Text style={styles.shakeBannerTitle}>Shake Device Anytime</Text>
          <Text style={styles.shakeBannerSubtitle}>
            Shake your phone from any screen to log a new expense with Remark & Amount!
          </Text>
        </View>
        <View style={styles.shakeBannerBtn}>
          <Text style={styles.shakeBannerBtnText}>Try</Text>
        </View>
      </TouchableOpacity>

      {/* 3. Category Spending Breakdown */}
      <CategorySpendingChart />

      {/* 4. Recent Expenses Section */}
      <View style={styles.recentSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Sparkles size={16} color="#10b981" />
            <Text style={styles.sectionTitle}>RECENT EXPENSES</Text>
          </View>
          {expenses.length > 5 && (
            <TouchableOpacity
              onPress={onNavigateToExpenses}
              style={styles.viewAllBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>View All ({expenses.length})</Text>
              <ArrowRight size={14} color="#10b981" />
            </TouchableOpacity>
          )}
        </View>

        {recentExpenses.length === 0 ? (
          <View style={styles.emptyState}>
            <Inbox size={40} color="#475569" />
            <Text style={styles.emptyStateTitle}>No expenses logged yet</Text>
            <Text style={styles.emptyStateDesc}>
              Shake your device or tap below to record your first expense.
            </Text>
            <TouchableOpacity style={styles.addExpenseBtn} onPress={openShakeModal}>
              <Plus size={16} color="#090d16" />
              <Text style={styles.addExpenseBtnText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.recentList}>
            {recentExpenses.map((expense) => (
              <ExpenseListItem key={expense.id} expense={expense} />
            ))}
          </View>
        )}
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  content: {
    paddingBottom: 90,
  },
  shakeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 18,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    gap: 12,
  },
  shakeBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shakeBannerContent: {
    flex: 1,
    gap: 2,
  },
  shakeBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#34d399',
  },
  shakeBannerSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 15,
  },
  shakeBannerBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  shakeBannerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#090d16',
  },
  recentSection: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.8,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  recentList: {
    gap: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 24,
    marginHorizontal: 16,
    gap: 8,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: 4,
  },
  emptyStateDesc: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 240,
  },
  addExpenseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    marginTop: 8,
  },
  addExpenseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#090d16',
  },
  bottomSpacer: {
    height: 40,
  },
});
