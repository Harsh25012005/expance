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
  RotateCcw,
  Sparkles,
  ChevronRight,
  X,
  FileText,
  Table,
  Code2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useExpenses } from '../context/ExpenseContext';
import { SUPPORTED_CURRENCIES } from '../constants/categories';
import { ShakeSensitivity } from '../types/expense';
import { ConfirmModal } from '../components/ConfirmModal';
import { exportExpenses, ExportFormat } from '../services/exportService';
import { theme } from '../constants/theme';

export const SettingsScreen: React.FC = () => {
  const { settings, updateSettings, expenses, clearAllExpenses, resetOnboarding } = useExpenses();

  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [showResetOnboardingConfirm, setShowResetOnboardingConfirm] = useState<boolean>(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState<boolean>(false);
  const [showNameModal, setShowNameModal] = useState<boolean>(false);
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

  const handleClearAllConfirm = async () => {
    try {
      await clearAllExpenses();
      setShowClearConfirm(false);
      Alert.alert('Data Cleared', 'All local expense transactions have been deleted.');
    } catch (e) {
      console.error('Failed to clear data:', e);
    }
  };

  const handleResetOnboardingConfirm = async () => {
    try {
      await resetOnboarding();
      setShowResetOnboardingConfirm(false);
    } catch (e) {
      console.error('Failed to reset onboarding:', e);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
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

          {/* Shake Sensitivity Selector */}
          {settings.shakeEnabled && (
            <>
              <View style={styles.divider} />
              <View style={styles.sensitivityContainer}>
                <View style={styles.sensitivityHeader}>
                  <Text style={styles.sensitivityTitle}>Shake Sensitivity</Text>
                  <View style={styles.lowDefaultBadge}>
                    <Text style={styles.lowDefaultBadgeText}>DEFAULT: LOW</Text>
                  </View>
                </View>
                <Text style={styles.sensitivityHelpText}>
                  Low sensitivity helps prevent accidental triggers during normal phone movement.
                </Text>

                <View style={styles.sensitivityTabs}>
                  {(
                    [
                      { id: 'low', label: 'Low' },
                      { id: 'medium', label: 'Medium' },
                      { id: 'high', label: 'High' },
                    ] as const
                  ).map((item) => {
                    const isSelected = settings.shakeSensitivity === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.sensitivityTab,
                          isSelected && styles.sensitivityTabActive,
                        ]}
                        onPress={() => handleSensitivityChange(item.id)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.sensitivityTabText,
                            isSelected && styles.sensitivityTabTextActive,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </>
          )}

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

      {/* ──────────────── 2. DATA MANAGEMENT SECTION ──────────────── */}
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

          {/* Reset Onboarding */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => {
              triggerHaptic();
              setShowResetOnboardingConfirm(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <View style={styles.iconCircle}>
                <RotateCcw size={15} color={theme.colors.textPrimary} strokeWidth={1.5} />
              </View>
              <View>
                <Text style={styles.rowTitle}>Reset Onboarding</Text>
                <Text style={styles.rowSubtitle}>Re-launch the introductory flow</Text>
              </View>
            </View>
            <ChevronRight size={15} color={theme.colors.textTertiary} strokeWidth={1.5} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Clear All Data */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => {
              triggerHaptic();
              setShowClearConfirm(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.negativeLight }]}>
                <Trash2 size={15} color={theme.colors.negative} strokeWidth={1.5} />
              </View>
              <View>
                <Text style={[styles.rowTitle, { color: theme.colors.negative }]}>Clear All Data</Text>
                <Text style={styles.rowSubtitle}>Permanently erase all transaction records</Text>
              </View>
            </View>
            <ChevronRight size={15} color={theme.colors.negative} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ──────────────── 3. ABOUT SECTION ──────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>ABOUT</Text>
        <View style={styles.card}>
          <View style={styles.appInfoRow}>
            <View style={styles.appLogoCircle}>
              <Sparkles size={16} color={theme.colors.textPrimary} strokeWidth={1.5} />
            </View>
            <View style={styles.appMeta}>
              <Text style={styles.appName}>ExpenseFlow</Text>
              <Text style={styles.appVersion}>Version 1.0.0 (Editorial Release)</Text>
            </View>
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
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
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
                      Formatted spreadsheet with light blue header, clean borders & totals
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
                      Full structured data backup for developer portability
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
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <TouchableOpacity
                onPress={() => setShowCurrencyModal(false)}
                style={styles.modalClose}
              >
                <X size={18} color={theme.colors.textSecondary} strokeWidth={1.5} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.currencyList}>
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
                      <View>
                        <Text style={styles.currCode}>{curr.code}</Text>
                        <Text style={styles.currName}>{curr.name}</Text>
                      </View>
                    </View>
                    {isSelected && <Check size={16} color={theme.colors.primary} strokeWidth={2} />}
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
      >
        <View style={styles.modalOverlay}>
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

      {/* Clear All Confirmation Modal */}
      <ConfirmModal
        visible={showClearConfirm}
        title="Clear All Data?"
        message="This will permanently delete all stored transactions. This action cannot be undone."
        confirmText="Clear All Data"
        isDestructive
        onConfirm={handleClearAllConfirm}
        onCancel={() => setShowClearConfirm(false)}
      />

      {/* Reset Onboarding Confirmation Modal */}
      <ConfirmModal
        visible={showResetOnboardingConfirm}
        title="Reset Onboarding?"
        message="This will return you to the initial setup flow. Your expense transactions will remain safe."
        confirmText="Reset Setup"
        onConfirm={handleResetOnboardingConfirm}
        onCancel={() => setShowResetOnboardingConfirm(false)}
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
  lowDefaultBadge: {
    backgroundColor: theme.colors.accentLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lowDefaultBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  sensitivityHelpText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 16,
    marginBottom: 10,
  },
  sensitivityTabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sensitivityTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  sensitivityTabActive: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sensitivityTabText: {
    ...theme.typography.secondary,
    color: theme.colors.textSecondary,
  },
  sensitivityTabTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  appInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  appLogoCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appMeta: {
    flex: 1,
  },
  appName: {
    ...theme.typography.bodyLarge,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  appVersion: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 1,
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
    borderRadius: theme.borderRadius.md,
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  currencyItemActive: {
    backgroundColor: theme.colors.accentLight,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 8,
  },
  currLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  currBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currBadgeActive: {
    backgroundColor: theme.colors.surface,
  },
  currBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  currBadgeTextActive: {
    color: theme.colors.primary,
  },
  currCode: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  currName: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
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
  },
  nameInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 18,
  },
  nameModalActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  nameCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: theme.borderRadius.sm,
  },
  nameCancelText: {
    ...theme.typography.secondary,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  nameSaveBtn: {
    backgroundColor: theme.colors.textPrimary,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: theme.borderRadius.sm,
  },
  nameSaveText: {
    ...theme.typography.secondary,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
