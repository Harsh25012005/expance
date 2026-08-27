import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  LayoutGrid,
  X,
  Plus,
  PieChart,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  Smartphone,
  CheckCircle2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useExpenses } from '../context/ExpenseContext';
import { useShake } from '../context/ShakeContext';
import { formatCurrency } from '../utils/formatters';

interface WidgetsHubModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenQuickAdd?: () => void;
}

export const WidgetsHubModal: React.FC<WidgetsHubModalProps> = ({
  visible,
  onClose,
  onOpenQuickAdd,
}) => {
  const { theme, stats, settings } = useExpenses();
  const { openAddExpensePopup } = useShake();
  const [activeTab, setActiveTab] = useState<'balance' | 'breakdown' | 'shortcuts'>('balance');

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
  };

  const monthlyBudget = settings.monthlyBudget || 0;
  const spent = stats.thisMonthSpending;
  const remaining = Math.max(0, monthlyBudget - spent);
  const daysLeftInMonth = Math.max(1, 30 - new Date().getDate());
  const dailySafeSpend = Math.round(remaining / daysLeftInMonth);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.overlay, { backgroundColor: theme.colors.overlay }]}>
        <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.borderSubtle }]}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryLight }]}>
                <LayoutGrid size={16} color={theme.colors.primary} strokeWidth={2} />
              </View>
              <View>
                <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Widgets & App Shortcuts</Text>
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                  Home Screen & Lock Screen Ready
                </Text>
              </View>
            </View>

            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: theme.colors.backgroundSecondary }]} onPress={onClose}>
              <X size={15} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Selector Tabs */}
          <View style={[styles.tabsRow, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'balance' && [styles.tabItemActive, { backgroundColor: theme.colors.surface }]]}
              onPress={() => {
                triggerHaptic();
                setActiveTab('balance');
              }}
            >
              <Text style={[styles.tabItemText, { color: activeTab === 'balance' ? theme.colors.textPrimary : theme.colors.textSecondary }]}>
                Daily Allowance
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'breakdown' && [styles.tabItemActive, { backgroundColor: theme.colors.surface }]]}
              onPress={() => {
                triggerHaptic();
                setActiveTab('breakdown');
              }}
            >
              <Text style={[styles.tabItemText, { color: activeTab === 'breakdown' ? theme.colors.textPrimary : theme.colors.textSecondary }]}>
                Category Bar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'shortcuts' && [styles.tabItemActive, { backgroundColor: theme.colors.surface }]]}
              onPress={() => {
                triggerHaptic();
                setActiveTab('shortcuts');
              }}
            >
              <Text style={[styles.tabItemText, { color: activeTab === 'shortcuts' ? theme.colors.textPrimary : theme.colors.textSecondary }]}>
                Quick Actions
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.bodyScroll}>
            {/* 1. Daily Allowance Small Widget Simulator */}
            {activeTab === 'balance' && (
              <View style={styles.previewContainer}>
                <Text style={[styles.previewSectionHeading, { color: theme.colors.textSecondary }]}>
                  2x2 SMALL HOME SCREEN WIDGET
                </Text>

                <View style={[styles.smallWidgetCard, { backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.border }]}>
                  <View style={styles.widgetHeaderRow}>
                    <Text style={[styles.widgetAppLabel, { color: theme.colors.primary }]}>EXPENZA</Text>
                    <Sparkles size={12} color={theme.colors.primary} />
                  </View>
                  <Text style={[styles.widgetBigAmount, { color: theme.colors.textPrimary }]}>
                    {formatCurrency(dailySafeSpend, settings.currency)}
                  </Text>
                  <Text style={[styles.widgetAmountSub, { color: theme.colors.textSecondary }]}>Daily Safe-to-Spend</Text>

                  <View style={[styles.widgetChipRow, { backgroundColor: theme.colors.surfaceSubtle }]}>
                    <Text style={[styles.widgetChipText, { color: theme.colors.textPrimary }]}>
                      {daysLeftInMonth} days left • {formatCurrency(remaining, settings.currency)} rem.
                    </Text>
                  </View>
                </View>

                <Text style={[styles.instructionsText, { color: theme.colors.textSecondary }]}>
                  ✨ Real-time calculated daily allowance prevents overspending by giving you a clean daily budget cap.
                </Text>
              </View>
            )}

            {/* 2. Category Mini Bar Medium Widget Simulator */}
            {activeTab === 'breakdown' && (
              <View style={styles.previewContainer}>
                <Text style={[styles.previewSectionHeading, { color: theme.colors.textSecondary }]}>
                  4x2 MEDIUM HOME SCREEN WIDGET
                </Text>

                <View style={[styles.mediumWidgetCard, { backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.border }]}>
                  <View style={styles.widgetHeaderRow}>
                    <Text style={[styles.widgetAppLabel, { color: theme.colors.textPrimary }]}>Monthly Spending Flow</Text>
                    <Text style={[styles.widgetMediumSpend, { color: theme.colors.textPrimary }]}>
                      {formatCurrency(spent, settings.currency)}
                    </Text>
                  </View>

                  <View style={styles.miniCategoryDistributionBar}>
                    <View style={[styles.miniBarSeg, { width: '45%', backgroundColor: '#4F46E5' }]} />
                    <View style={[styles.miniBarSeg, { width: '25%', backgroundColor: '#0284C7' }]} />
                    <View style={[styles.miniBarSeg, { width: '18%', backgroundColor: '#D97706' }]} />
                    <View style={[styles.miniBarSeg, { width: '12%', backgroundColor: '#10B981' }]} />
                  </View>

                  <View style={styles.miniLegendsRow}>
                    <Text style={[styles.miniLegendItem, { color: theme.colors.textSecondary }]}>🍔 Food 45%</Text>
                    <Text style={[styles.miniLegendItem, { color: theme.colors.textSecondary }]}>🚗 Transport 25%</Text>
                    <Text style={[styles.miniLegendItem, { color: theme.colors.textSecondary }]}>⚡ Bills 18%</Text>
                  </View>
                </View>

                <Text style={[styles.instructionsText, { color: theme.colors.textSecondary }]}>
                  ✨ Glance at your biggest spending categories directly from your home screen without opening the app.
                </Text>
              </View>
            )}

            {/* 3. Quick Actions Launcher Simulator */}
            {activeTab === 'shortcuts' && (
              <View style={styles.previewContainer}>
                <Text style={[styles.previewSectionHeading, { color: theme.colors.textSecondary }]}>
                  INTERACTIVE APP SHORTCUTS
                </Text>

                <View style={styles.shortcutsGrid}>
                  <TouchableOpacity
                    style={[styles.shortcutCard, { backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.border }]}
                    onPress={() => {
                      triggerHaptic();
                      onClose();
                      if (onOpenQuickAdd) {
                        onOpenQuickAdd();
                      } else {
                        openAddExpensePopup({ triggeredByShake: false });
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.shortcutIconCircle, { backgroundColor: theme.colors.primaryLight }]}>
                      <Plus size={18} color={theme.colors.primary} strokeWidth={2.5} />
                    </View>
                    <Text style={[styles.shortcutTitle, { color: theme.colors.textPrimary }]}>Quick Add</Text>
                    <Text style={[styles.shortcutSub, { color: theme.colors.textSecondary }]}>1-Tap Log</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.shortcutCard, { backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.border }]}
                    onPress={() => {
                      triggerHaptic();
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.shortcutIconCircle, { backgroundColor: '#059669' + '20' }]}>
                      <PieChart size={18} color="#059669" strokeWidth={2} />
                    </View>
                    <Text style={[styles.shortcutTitle, { color: theme.colors.textPrimary }]}>Insights</Text>
                    <Text style={[styles.shortcutSub, { color: theme.colors.textSecondary }]}>View Breakdown</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.shortcutTipBox, { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.borderSubtle }]}>
                  <Smartphone size={16} color={theme.colors.primary} />
                  <Text style={[styles.shortcutTipText, { color: theme.colors.textSecondary }]}>
                    Long press the Expenza app icon on your phone home screen to reveal these instant shortcuts anytime.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: Dimensions.get('window').height * 0.85,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    marginTop: 14,
    marginBottom: 16,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabItemActive: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabItemText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bodyScroll: {
    maxHeight: 460,
  },
  previewContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  previewSectionHeading: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  smallWidgetCard: {
    width: 170,
    height: 170,
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  widgetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  widgetAppLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  widgetBigAmount: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  widgetAmountSub: {
    fontSize: 10,
    fontWeight: '500',
  },
  widgetChipRow: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  widgetChipText: {
    fontSize: 9,
    fontWeight: '600',
  },
  mediumWidgetCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    justifyContent: 'space-between',
    gap: 12,
  },
  widgetMediumSpend: {
    fontSize: 16,
    fontWeight: '800',
  },
  miniCategoryDistributionBar: {
    height: 10,
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  miniBarSeg: {
    height: '100%',
  },
  miniLegendsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  miniLegendItem: {
    fontSize: 10,
    fontWeight: '600',
  },
  instructionsText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 17,
    paddingHorizontal: 16,
  },
  shortcutsGrid: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  shortcutCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  shortcutIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  shortcutTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  shortcutSub: {
    fontSize: 11,
    marginTop: 2,
  },
  shortcutTipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    width: '100%',
  },
  shortcutTipText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
  },
});
