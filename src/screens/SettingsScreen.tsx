import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  Smartphone,
  Coins,
  Trash2,
  Download,
  Check,
  Vibrate,
  User,
  Shield,
  ChevronRight,
  X,
  FileText,
  Table,
  Code2,
  WalletCards,
  Bell,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExpenses } from '../context/ExpenseContext';
import { SUPPORTED_CURRENCIES } from '../constants/categories';
import { ShakeSensitivity } from '../types/expense';
import { ConfirmModal } from '../components/ConfirmModal';
import { SetBudgetModal } from '../components/SetBudgetModal';
import { CustomTimePickerModal } from '../components/CustomTimePickerModal';
import { ShakeSensitivityModal } from '../components/ShakeSensitivityModal';
import { exportExpenses, ExportFormat } from '../services/exportService';
import { formatCurrency, formatTimeDisplay } from '../utils/formatters';
import { requestReminderPermissions } from '../utils/reminderService';
import { theme } from '../constants/theme';
import { AppLogo } from '../components/AppLogo';

export const SettingsScreen: React.FC = () => {
  const { settings, updateSettings, expenses, eraseAllData } = useExpenses();
  const insets = useSafeAreaInsets();

  const [showEraseAllConfirm, setShowEraseAllConfirm] = useState<boolean>(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState<boolean>(false);
  const [showSensitivityModal, setShowSensitivityModal] = useState<boolean>(false);
  const [showNameModal, setShowNameModal] = useState<boolean>(false);
  const [showBudgetModal, setShowBudgetModal] = useState<boolean>(false);
  const [showReminderTimeModal, setShowReminderTimeModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [tempName, setTempName] = useState<string>(settings.userName || '');

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
  };

  const handleSensitivityChange = (val: ShakeSensitivity) => {
    triggerHaptic();
    updateSettings({ shakeSensitivity: val });
  };

  const handleSaveName = async () => {
    if (tempName.trim()) {
      await updateSettings({ userName: tempName.trim() });
      setShowNameModal(false);
    }
  };

  const handleExport = async (format: ExportFormat) => {
    if (isExporting) return;
    triggerHaptic();

    if (expenses.length === 0) {
      setShowExportModal(false);
      Alert.alert(
        'No expenses to export',
        'Add at least one expense before exporting your report.'
      );
      return;
    }

    try {
      setIsExporting(true);
      await exportExpenses(format, expenses, settings);
      setShowExportModal(false);
    } catch (err) {
      console.error('Failed to export expenses:', err);
      Alert.alert(
        format === 'pdf' ? "Couldn't create the PDF" : "Couldn't export expenses",
        'Something went wrong while creating your expense report. Please try again.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleEraseAllConfirm = async () => {
    try {
      setShowEraseAllConfirm(false);
      await eraseAllData();
    } catch (e) {
      console.error('Failed to erase all data:', e);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingBottom: 85 + Math.max(insets.bottom, 16) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* ──────────────── 1. PREFERENCES SECTION ──────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>PREFERENCES</Text>
        <View style={styles.card}>
          {/* User Name */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => {
              triggerHaptic();
              setTempName(settings.userName || '');
              setShowNameModal(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <View style={styles.iconCircle}>
                <User size={15} color={theme.colors.textPrimary} strokeWidth={1.5} />
              </View>
              <View>
                <Text style={styles.rowTitle}>Your Name</Text>
                <Text style={styles.rowSubtitle}>{settings.userName || 'Not set'}</Text>
              </View>
            </View>
            <ChevronRight size={15} color={theme.colors.textTertiary} strokeWidth={1.5} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Currency */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => {
              triggerHaptic();
              setShowCurrencyModal(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <View style={styles.iconCircle}>
                <Coins size={15} color={theme.colors.textPrimary} strokeWidth={1.5} />
              </View>
              <View>
                <Text style={styles.rowTitle}>Currency</Text>
                <Text style={styles.rowSubtitle}>
                  {settings.currencyCode} ({settings.currency})
                </Text>
              </View>
            </View>
            <ChevronRight size={15} color={theme.colors.textTertiary} strokeWidth={1.5} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Shake-to-Add Toggle */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={styles.iconCircle}>
                <Smartphone size={15} color={theme.colors.textPrimary} strokeWidth={1.5} />
              </View>
              <View>
                <Text style={styles.rowTitle}>Shake to Add Expense</Text>
                <Text style={styles.rowSubtitle}>Shake phone to trigger quick add</Text>
              </View>
            </View>
            <Switch
              value={settings.shakeEnabled}
              onValueChange={(val) => {
                triggerHaptic();
                updateSettings({ shakeEnabled: val });
              }}
              trackColor={{ false: theme.colors.border, true: theme.colors.textPrimary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Shake Sensitivity Compact Row */}
          {settings.shakeEnabled && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.row}
                onPress={() => {
                  triggerHaptic();
                  setShowSensitivityModal(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.rowLeft}>
                  <View style={styles.iconCircle}>
                    <Smartphone size={15} color={theme.colors.textPrimary} strokeWidth={1.5} />
                  </View>
                  <View>
                    <Text style={styles.rowTitle}>Shake Sensitivity</Text>
                    <Text style={styles.rowSubtitle}>
                      {settings.shakeSensitivity === 'low'
                        ? 'Low · Gentle shakes'
                        : settings.shakeSensitivity === 'high'
                        ? 'High · Quick response'
                        : 'Medium · Balanced (Recommended)'}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={15} color={theme.colors.textTertiary} strokeWidth={1.5} />
              </TouchableOpacity>
            </>
          )}

          <View style={styles.divider} />

          {/* Monthly Budget */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => {
              triggerHaptic();
              setShowBudgetModal(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <View style={styles.iconCircle}>
                <WalletCards size={15} color={theme.colors.textPrimary} strokeWidth={1.5} />
              </View>
              <View>
                <Text style={styles.rowTitle}>Monthly Budget</Text>
                <Text style={styles.rowSubtitle}>
                  {settings.monthlyBudget && settings.monthlyBudget > 0
                    ? formatCurrency(settings.monthlyBudget, settings.currency)
                    : 'Set your monthly budget'}
                </Text>
              </View>
            </View>
            <ChevronRight size={15} color={theme.colors.textTertiary} strokeWidth={1.5} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Haptic Feedback Toggle */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={styles.iconCircle}>
                <Vibrate size={15} color={theme.colors.textPrimary} strokeWidth={1.5} />
              </View>
              <View>
                <Text style={styles.rowTitle}>Haptic Feedback</Text>
                <Text style={styles.rowSubtitle}>Tactile response on actions</Text>
              </View>
            </View>
            <Switch
              value={settings.hapticsEnabled}
              onValueChange={(val) => {
                triggerHaptic();
                updateSettings({ hapticsEnabled: val });
              }}
              trackColor={{ false: theme.colors.border, true: theme.colors.textPrimary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </View>

      {/* ──────────────── 2. EXPENSE REMINDERS SECTION ──────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>EXPENSE REMINDERS</Text>
        <View style={styles.card}>
          {/* Daily Reminder Toggle */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={styles.iconCircle}>
                <Bell size={15} color={theme.colors.textPrimary} strokeWidth={1.5} />
              </View>
              <View>
                <Text style={styles.rowTitle}>Daily reminder</Text>
                <Text style={styles.rowSubtitle}>
                  Remind if no expense recorded today
                </Text>
              </View>
            </View>
            <Switch
              value={settings.dailyReminderEnabled || false}
              onValueChange={async (val) => {
                triggerHaptic();
                if (val) {
                  await requestReminderPermissions();
                }
                updateSettings({ dailyReminderEnabled: val });
              }}
              trackColor={{ false: theme.colors.border, true: theme.colors.textPrimary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Reminder Time Selector */}
          {settings.dailyReminderEnabled && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.row}
                onPress={() => {
                  triggerHaptic();
                  setShowReminderTimeModal(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.rowLeft}>
                  <View style={styles.iconCircle}>
                    <Clock size={15} color={theme.colors.textPrimary} strokeWidth={1.5} />
                  </View>
                  <View>
                    <Text style={styles.rowTitle}>Preferred Time</Text>
                    <Text style={styles.rowSubtitle}>
                      {formatTimeDisplay(settings.reminderTime)}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={15} color={theme.colors.textTertiary} strokeWidth={1.5} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* ──────────────── 3. DATA MANAGEMENT SECTION ──────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>DATA & STORAGE</Text>
        <View style={styles.card}>
          {/* Export Expenses Modal Trigger */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => {
              triggerHaptic();
              if (expenses.length === 0) {
                Alert.alert(
                  'No expenses to export',
                  'Add at least one expense before exporting your report.'
                );
                return;
              }
              setShowExportModal(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <View style={styles.iconCircle}>
                <Download size={15} color={theme.colors.textPrimary} strokeWidth={1.5} />
              </View>
              <View>
                <Text style={styles.rowTitle}>Export Expenses</Text>
                <Text style={styles.rowSubtitle}>Export records as CSV, PDF, or JSON</Text>
              </View>
            </View>
            <ChevronRight size={15} color={theme.colors.textTertiary} strokeWidth={1.5} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Erase All Data */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => {
              triggerHaptic();
              setShowEraseAllConfirm(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.negativeLight }]}>
                <Trash2 size={15} color={theme.colors.negative} strokeWidth={1.5} />
              </View>
              <View>
                <Text style={[styles.rowTitle, { color: theme.colors.negative }]}>Erase All Data</Text>
                <Text style={styles.rowSubtitle}>Permanently delete expenses and reset setup</Text>
              </View>
            </View>
            <ChevronRight size={15} color={theme.colors.negative} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ──────────────── 4. ABOUT SECTION ──────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>ABOUT</Text>
        <View style={styles.card}>
          <View style={styles.aboutBox}>
            <AppLogo size={44} style={styles.aboutLogo} />
            <Text style={styles.appName}>Expenza</Text>
            <Text style={styles.appTagline}>Your personal expense tracker.</Text>
            <Text style={styles.appVersion}>Version 1.0.0</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.privacyRow}>
            <Shield size={15} color={theme.colors.positive} strokeWidth={1.5} />
            <Text style={styles.privacyText}>
              100% On-Device Local Storage. No external databases, no analytics trackers.
            </Text>
          </View>
        </View>
      </View>

      {/* ──────────────── EXPORT FORMAT MODAL ──────────────── */}
      <Modal
        visible={showExportModal}
        animationType="slide"
        transparent
        onRequestClose={() => !isExporting && setShowExportModal(false)}
        statusBarTranslucent
      >
        <View style={[styles.modalOverlay, { paddingTop: insets.top + 20 }]}>
          <View style={[styles.modalContent, { paddingBottom: 24 + Math.max(insets.bottom, 16) }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Export Expenses</Text>
                <Text style={styles.modalSubtitle}>Choose your preferred export format</Text>
              </View>
              <TouchableOpacity
                onPress={() => !isExporting && setShowExportModal(false)}
                style={styles.modalClose}
                disabled={isExporting}
              >
                <X size={18} color={theme.colors.textSecondary} strokeWidth={1.5} />
              </TouchableOpacity>
            </View>

            {isExporting ? (
              <View style={styles.exportLoadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.textPrimary} />
                <Text style={styles.exportLoadingText}>Preparing your report…</Text>
              </View>
            ) : (
              <View style={styles.exportOptionsList}>
                {/* Excel Option */}
                <TouchableOpacity
                  style={styles.exportOptionCard}
                  onPress={() => handleExport('xlsx')}
                  activeOpacity={0.7}
                  disabled={isExporting}
                >
                  <View style={[styles.exportIconCircle, { backgroundColor: '#DCFCE7' }]}>
                    <Table size={18} color="#16A34A" strokeWidth={1.5} />
                  </View>
                  <View style={styles.exportOptionTextCol}>
                    <Text style={styles.exportOptionTitle}>Export Excel (.xlsx)</Text>
                    <Text style={styles.exportOptionDesc}>
                      Formatted spreadsheet with summary header & clean tables
                    </Text>
                  </View>
                  <ChevronRight size={16} color={theme.colors.textTertiary} strokeWidth={1.5} />
                </TouchableOpacity>

                {/* PDF Option */}
                <TouchableOpacity
                  style={styles.exportOptionCard}
                  onPress={() => handleExport('pdf')}
                  activeOpacity={0.7}
                  disabled={isExporting}
                >
                  <View style={[styles.exportIconCircle, { backgroundColor: '#FEE2E2' }]}>
                    <FileText size={18} color="#DC2626" strokeWidth={1.5} />
                  </View>
                  <View style={styles.exportOptionTextCol}>
                    <Text style={styles.exportOptionTitle}>Export PDF (.pdf)</Text>
                    <Text style={styles.exportOptionDesc}>
                      Formatted statement with category breakdown & summary totals
                    </Text>
                  </View>
                  <ChevronRight size={16} color={theme.colors.textTertiary} strokeWidth={1.5} />
                </TouchableOpacity>

                {/* JSON Option */}
                <TouchableOpacity
                  style={styles.exportOptionCard}
                  onPress={() => handleExport('json')}
                  activeOpacity={0.7}
                  disabled={isExporting}
                >
                  <View style={[styles.exportIconCircle, { backgroundColor: theme.colors.accentLight }]}>
                    <Code2 size={18} color={theme.colors.primary} strokeWidth={1.5} />
                  </View>
                  <View style={styles.exportOptionTextCol}>
                    <Text style={styles.exportOptionTitle}>JSON Backup (.json)</Text>
                    <Text style={styles.exportOptionDesc}>
                      Full structured data backup for data portability
                    </Text>
                  </View>
                  <ChevronRight size={16} color={theme.colors.textTertiary} strokeWidth={1.5} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Currency Selector Modal */}
      <Modal
        visible={showCurrencyModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCurrencyModal(false)}
        statusBarTranslucent
      >
        <View style={[styles.modalOverlay, { paddingTop: insets.top + 20 }]}>
          <View style={[styles.modalContent, { paddingBottom: 24 + Math.max(insets.bottom, 16) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <TouchableOpacity
                onPress={() => setShowCurrencyModal(false)}
                style={styles.modalClose}
              >
                <X size={18} color={theme.colors.textSecondary} strokeWidth={1.5} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.currencyList} showsVerticalScrollIndicator={false}>
              {SUPPORTED_CURRENCIES.map((curr) => {
                const isSelected = settings.currencyCode === curr.code;
                return (
                  <TouchableOpacity
                    key={curr.code}
                    style={[styles.currencyItem, isSelected && styles.currencyItemActive]}
                    onPress={() => {
                      triggerHaptic();
                      updateSettings({ currency: curr.symbol, currencyCode: curr.code });
                      setShowCurrencyModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.currLeft}>
                      <View style={[styles.currBadge, isSelected && styles.currBadgeActive]}>
                        <Text style={[styles.currBadgeText, isSelected && styles.currBadgeTextActive]}>
                          {curr.symbol}
                        </Text>
                      </View>
                      <View style={styles.currTextCol}>
                        <Text style={[styles.currName, isSelected && styles.currNameActive]}>
                          {curr.name}
                        </Text>
                        <Text style={styles.currCode}>{curr.code}</Text>
                      </View>
                    </View>
                    <View style={[styles.currIndicator, isSelected && styles.currIndicatorActive]}>
                      {isSelected && <Check size={12} color={theme.colors.primary} strokeWidth={2.5} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Name Edit Modal */}
      <Modal
        visible={showNameModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowNameModal(false)}
        statusBarTranslucent
      >
        <View style={[styles.modalOverlay, { justifyContent: 'center', alignItems: 'center', padding: 20, paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.nameModalCard}>
            <Text style={styles.modalTitle}>Your Name</Text>
            <Text style={styles.modalSubtitle}>What should we call you on the dashboard?</Text>

            <TextInput
              style={styles.nameInput}
              value={tempName}
              onChangeText={setTempName}
              placeholder="Enter your name"
              placeholderTextColor={theme.colors.textTertiary}
              autoFocus
            />

            <View style={styles.nameModalActions}>
              <TouchableOpacity
                style={styles.nameCancelBtn}
                onPress={() => setShowNameModal(false)}
              >
                <Text style={styles.nameCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.nameSaveBtn}
                onPress={handleSaveName}
              >
                <Text style={styles.nameSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Set Monthly Budget Modal */}
      <SetBudgetModal
        visible={showBudgetModal}
        onClose={() => setShowBudgetModal(false)}
      />

      {/* Shake Sensitivity Modal */}
      <ShakeSensitivityModal
        visible={showSensitivityModal}
        onClose={() => setShowSensitivityModal(false)}
      />

      {/* Custom Mobile Time Picker Modal */}
      <CustomTimePickerModal
        visible={showReminderTimeModal}
        initialTime={settings.reminderTime || '20:00'}
        onSave={(timeStr) => updateSettings({ reminderTime: timeStr })}
        onClose={() => setShowReminderTimeModal(false)}
      />

      {/* Erase All Data Confirmation Modal */}
      <ConfirmModal
        visible={showEraseAllConfirm}
        title="Erase all data?"
        message="This will permanently delete your expenses and reset Expenza to its initial setup. This action cannot be undone."
        confirmText="Erase Everything"
        cancelText="Cancel"
        isDestructive
        onConfirm={handleEraseAllConfirm}
        onCancel={() => setShowEraseAllConfirm(false)}
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
    paddingBottom: 110,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    ...theme.typography.label,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    ...theme.typography.body,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  rowSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderSubtle,
  },
  sensitivityContainer: {
    paddingVertical: 12,
  },
  sensitivityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sensitivityTitle: {
    ...theme.typography.body,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  sensitivityHelpText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  sensitivityCardsList: {
    gap: 8,
    marginTop: 4,
  },
  sensitivityCardItem: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sensitivityCardItemActive: {
    backgroundColor: theme.colors.accentLight,
    borderColor: theme.colors.primary,
  },
  sensCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sensTitleCol: {
    flex: 1,
    marginRight: 8,
  },
  sensTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sensMainTitle: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  sensRecBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.2)',
  },
  sensRecBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  sensSubtitle: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: 1,
  },
  sensIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sensIndicatorActive: {
    borderColor: theme.colors.primary,
    backgroundColor: '#FFFFFF',
  },
  sensDesc: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textSecondary,
    lineHeight: 15,
  },
  aboutBox: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  aboutLogo: {
    marginBottom: 8,
  },
  appName: {
    ...theme.typography.sectionHeading,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  appTagline: {
    ...theme.typography.secondary,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  appVersion: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    marginTop: 4,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  privacyText: {
    flex: 1,
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.container,
    borderTopRightRadius: theme.borderRadius.container,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    maxHeight: '75%',
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  modalTitle: {
    ...theme.typography.sectionHeading,
    color: theme.colors.textPrimary,
  },
  modalSubtitle: {
    ...theme.typography.secondary,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  modalClose: {
    padding: 4,
  },
  exportOptionsList: {
    paddingTop: 12,
    gap: 10,
  },
  exportOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  exportIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exportOptionTextCol: {
    flex: 1,
    marginRight: 8,
  },
  exportOptionTitle: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  exportOptionDesc: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 15,
  },
  exportLoadingContainer: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportLoadingText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: 12,
  },
  currencyList: {
    paddingTop: 8,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  currencyItemActive: {
    backgroundColor: theme.colors.accentLight,
    borderColor: theme.colors.primary,
  },
  currLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currBadgeActive: {
    backgroundColor: '#FFFFFF',
  },
  currBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  currBadgeTextActive: {
    color: theme.colors.primary,
  },
  currTextCol: {
    gap: 2,
  },
  currName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  currNameActive: {
    color: theme.colors.textPrimary,
  },
  currCode: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  currIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currIndicatorActive: {
    borderColor: theme.colors.primary,
    backgroundColor: '#FFFFFF',
  },
  nameModalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 'auto',
    marginTop: 'auto',
    borderWidth: 1,
    borderColor: theme.colors.border,
    width: '100%',
    maxWidth: 340,
  },
  nameInput: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 18,
    marginTop: 12,
  },
  nameModalActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  nameCancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 9999, // Fully rounded
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  nameCancelText: {
    ...theme.typography.secondary,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  nameSaveBtn: {
    backgroundColor: theme.colors.textPrimary,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 9999, // Fully rounded
  },
  nameSaveText: {
    ...theme.typography.secondary,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
