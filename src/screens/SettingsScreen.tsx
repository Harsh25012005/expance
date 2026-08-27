import React, { useState, memo } from 'react';
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
  Moon,
  LayoutGrid,
  PiggyBank,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExpenses } from '../context/ExpenseContext';
import { useShake } from '../context/ShakeContext';
import { SUPPORTED_CURRENCIES } from '../constants/categories';
import { ShakeSensitivity } from '../types/expense';
import { ConfirmModal } from '../components/ConfirmModal';
import { SetBudgetModal } from '../components/SetBudgetModal';
import { CustomTimePickerModal } from '../components/CustomTimePickerModal';
import { ShakeSensitivityModal } from '../components/ShakeSensitivityModal';
import { WidgetsHubModal } from '../components/WidgetsHubModal';
import { exportExpenses, ExportFormat } from '../services/exportService';
import { formatCurrency, formatTimeDisplay } from '../utils/formatters';
import { requestReminderPermissions } from '../utils/reminderService';
import { AppLogo } from '../components/AppLogo';

export const SettingsScreen: React.FC = memo(() => {
  const { settings, updateSettings, expenses, eraseAllData, isDark, toggleDarkMode, theme } = useExpenses();
  const { openAddExpensePopup } = useShake();
  const insets = useSafeAreaInsets();

  const [showEraseAllConfirm, setShowEraseAllConfirm] = useState<boolean>(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState<boolean>(false);
  const [showSensitivityModal, setShowSensitivityModal] = useState<boolean>(false);
  const [showNameModal, setShowNameModal] = useState<boolean>(false);
  const [showBudgetModal, setShowBudgetModal] = useState<boolean>(false);
  const [showReminderTimeModal, setShowReminderTimeModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showWidgetsModal, setShowWidgetsModal] = useState<boolean>(false);
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
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingBottom: 85 + Math.max(insets.bottom, 16) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* ──────────────── 1. PREFERENCES SECTION ──────────────── */}
      <View style={styles.section}>
        <Text style={[styles.sectionHeader, { color: theme.colors.textSecondary }]}>PREFERENCES</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
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
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.backgroundSecondary }]}>
                <User size={15} color={theme.colors.textPrimary} strokeWidth={1.5} />
              </View>
              <View>
                <Text style={[styles.rowTitle, { color: theme.colors.textPrimary }]}>Your Name</Text>
                <Text style={[styles.rowSubtitle, { color: theme.colors.textSecondary }]}>{settings.userName || 'Not set'}</Text>
              </View>
            </View>
            <ChevronRight size={15} color={theme.colors.textTertiary} strokeWidth={1.5} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.colors.borderSubtle }]} />

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
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.backgroundSecondary }]}>
                <Coins size={15} color={theme.colors.textPrimary} strokeWidth={1.5} />
              </View>
              <View>
                <Text style={[styles.rowTitle, { color: theme.colors.textPrimary }]}>Currency</Text>
                <Text style={[styles.rowSubtitle, { color: theme.colors.textSecondary }]}>
                  {settings.currencyCode} ({settings.currency})
                </Text>
              </View>
            </View>
            <ChevronRight size={15} color={theme.colors.textTertiary} strokeWidth={1.5} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.colors.borderSubtle }]} />

          {/* Widgets Hub & Shortcuts */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => {
              triggerHaptic();
              setShowWidgetsModal(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.backgroundSecondary }]}>
                <LayoutGrid size={15} color={theme.colors.textPrimary} strokeWidth={1.5} />
              </View>
              <View>
                <Text style={[styles.rowTitle, { color: theme.colors.textPrimary }]}>Widgets & App Shortcuts</Text>
                <Text style={[styles.rowSubtitle, { color: theme.colors.textSecondary }]}>Home screen widgets & 1-tap actions</Text>
              </View>
            </View>
            <ChevronRight size={15} color={theme.colors.textTertiary} strokeWidth={1.5} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.colors.borderSubtle }]} />

          {/* Shake-to-Add Toggle */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.backgroundSecondary }]}>
                <Smartphone size={15} color={theme.colors.textPrimary} strokeWidth={1.5} />
              </View>
              <View>
                <Text style={[styles.rowTitle, { color: theme.colors.textPrimary }]}>Shake to Add Expense</Text>
                <Text style={[styles.rowSubtitle, { color: theme.colors.textSecondary }]}>Shake phone to trigger quick add</Text>
              </View>
            </View>
            <Switch
              value={settings.shakeEnabled}
              onValueChange={(val) => {
                triggerHaptic();
                updateSettings({ shakeEnabled: val });
              }}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Shake Sensitivity Compact Row */}
          {settings.shakeEnabled && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.colors.borderSubtle }]} />
              <TouchableOpacity
                style={styles.row}
                onPress={() => {
                  triggerHaptic();
                  setShowSensitivityModal(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.rowLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: theme.colors.backgroundSecondary }]}>
                    <Smartphone size={15} color={theme.colors.textPrimary} strokeWidth={1.5} />
                  </View>
                  <View>
                    <Text style={[styles.rowTitle, { color: theme.colors.textPrimary }]}>Shake Sensitivity</Text>
                    <Text style={[styles.rowSubtitle, { color: theme.colors.textSecondary }]}>
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

          <View style={[styles.divider, { backgroundColor: theme.colors.borderSubtle }]} />

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
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.backgroundSecondary }]}>
                <WalletCards size={15} color={theme.colors.textPrimary} strokeWidth={1.5} />
              </View>
              <View>
                <Text style={[styles.rowTitle, { color: theme.colors.textPrimary }]}>Monthly Budget</Text>
                <Text style={[styles.rowSubtitle, { color: theme.colors.textSecondary }]}>
                  {settings.monthlyBudget && settings.monthlyBudget > 0
                    ? formatCurrency(settings.monthlyBudget, settings.currency)
                    : 'Set your monthly budget'}
                </Text>
              </View>
            </View>
            <ChevronRight size={15} color={theme.colors.textTertiary} strokeWidth={1.5} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.colors.borderSubtle }]} />

          {/* Haptic Feedback Toggle */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.backgroundSecondary }]}>
                <Vibrate size={15} color={theme.colors.textPrimary} strokeWidth={1.5} />
              </View>
              <View>
                <Text style={[styles.rowTitle, { color: theme.colors.textPrimary }]}>Haptic Feedback</Text>
                <Text style={[styles.rowSubtitle, { color: theme.colors.textSecondary }]}>Tactile response on actions</Text>
              </View>
            </View>
            <Switch
              value={settings.hapticsEnabled}
              onValueChange={(val) => {
                triggerHaptic();
                updateSettings({ hapticsEnabled: val });
              }}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </View>

      {/* ──────────────── 2. EXPENSE REMINDERS SECTION ──────────────── */}
      <View style={styles.section}>
        <Text style={[styles.sectionHeader, { color: theme.colors.textSecondary }]}>EXPENSE REMINDERS</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {/* Daily Reminder Toggle */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.backgroundSecondary }]}>
                <Bell size={15} color={theme.colors.textPrimary} strokeWidth={1.5} />
              </View>
              <View>
                <Text style={[styles.rowTitle, { color: theme.colors.textPrimary }]}>Daily reminder</Text>
                <Text style={[styles.rowSubtitle, { color: theme.colors.textSecondary }]}>
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
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Reminder Time Selector */}
          {settings.dailyReminderEnabled && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.colors.borderSubtle }]} />
              <TouchableOpacity
                style={styles.row}
                onPress={() => {
                  triggerHaptic();
                  setShowReminderTimeModal(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.rowLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: theme.colors.backgroundSecondary }]}>
                    <Clock size={15} color={theme.colors.textPrimary} strokeWidth={1.5} />
                  </View>
                  <View>
                    <Text style={[styles.rowTitle, { color: theme.colors.textPrimary }]}>Preferred Time</Text>
                    <Text style={[styles.rowSubtitle, { color: theme.colors.textSecondary }]}>
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
        <Text style={[styles.sectionHeader, { color: theme.colors.textSecondary }]}>DATA & STORAGE</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
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
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.backgroundSecondary }]}>
                <Download size={15} color={theme.colors.textPrimary} strokeWidth={1.5} />
              </View>
              <View>
                <Text style={[styles.rowTitle, { color: theme.colors.textPrimary }]}>Export Expenses</Text>
                <Text style={[styles.rowSubtitle, { color: theme.colors.textSecondary }]}>Export records as CSV, PDF, or JSON</Text>
              </View>
            </View>
            <ChevronRight size={15} color={theme.colors.textTertiary} strokeWidth={1.5} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.colors.borderSubtle }]} />

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
                <Text style={[styles.rowSubtitle, { color: theme.colors.textSecondary }]}>Permanently delete expenses and reset setup</Text>
              </View>
            </View>
            <ChevronRight size={15} color={theme.colors.negative} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ──────────────── 4. ABOUT SECTION ──────────────── */}
      <View style={styles.section}>
        <Text style={[styles.sectionHeader, { color: theme.colors.textSecondary }]}>ABOUT</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.aboutBox}>
            <AppLogo size={44} style={styles.aboutLogo} />
            <Text style={[styles.appName, { color: theme.colors.textPrimary }]}>Expenza</Text>
            <Text style={[styles.appTagline, { color: theme.colors.textSecondary }]}>Your personal expense tracker.</Text>
            <Text style={[styles.appVersion, { color: theme.colors.textTertiary }]}>Version 1.1.0 • Dark Mode & AI Ready</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.borderSubtle }]} />

          <View style={styles.privacyRow}>
            <Shield size={15} color={theme.colors.positive} strokeWidth={1.5} />
            <Text style={[styles.privacyText, { color: theme.colors.textSecondary }]}>
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
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay, paddingTop: insets.top + 20 }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, paddingBottom: 24 + Math.max(insets.bottom, 16) }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.borderSubtle }]}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>Export Expenses</Text>
                <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>Choose your preferred export format</Text>
              </View>
              <TouchableOpacity
                onPress={() => !isExporting && setShowExportModal(false)}
                style={[styles.modalClose, { backgroundColor: theme.colors.backgroundSecondary }]}
                disabled={isExporting}
              >
                <X size={18} color={theme.colors.textSecondary} strokeWidth={1.5} />
              </TouchableOpacity>
            </View>

            {isExporting ? (
              <View style={styles.exportLoadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.exportLoadingText, { color: theme.colors.textPrimary }]}>
                  Generating your expense report...
                </Text>
                <Text style={[styles.exportLoadingSubText, { color: theme.colors.textSecondary }]}>
                  Formatting transactions and summary statistics
                </Text>
              </View>
            ) : (
              <View style={styles.exportOptions}>
                {/* Excel Option */}
                <TouchableOpacity
                  style={[styles.exportCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                  onPress={() => handleExport('xlsx')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.exportIconCircle, { backgroundColor: '#ECFDF5' }]}>
                    <Table size={22} color="#059669" strokeWidth={1.75} />
                  </View>
                  <View style={styles.exportCardText}>
                    <Text style={[styles.exportFormatTitle, { color: theme.colors.textPrimary }]}>Excel Spreadsheet (.xlsx)</Text>
                    <Text style={[styles.exportFormatDesc, { color: theme.colors.textSecondary }]}>
                      Styled sheets, total summary & formulas
                    </Text>
                  </View>
                  <ChevronRight size={18} color={theme.colors.textTertiary} strokeWidth={1.5} />
                </TouchableOpacity>

                {/* PDF Option */}
                <TouchableOpacity
                  style={[styles.exportCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                  onPress={() => handleExport('pdf')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.exportIconCircle, { backgroundColor: '#FEF2F2' }]}>
                    <FileText size={22} color="#DC2626" strokeWidth={1.75} />
                  </View>
                  <View style={styles.exportCardText}>
                    <Text style={[styles.exportFormatTitle, { color: theme.colors.textPrimary }]}>PDF Document (.pdf)</Text>
                    <Text style={[styles.exportFormatDesc, { color: theme.colors.textSecondary }]}>
                      Clean statement with categorized tables
                    </Text>
                  </View>
                  <ChevronRight size={18} color={theme.colors.textTertiary} strokeWidth={1.5} />
                </TouchableOpacity>

                {/* JSON Option */}
                <TouchableOpacity
                  style={[styles.exportCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                  onPress={() => handleExport('json')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.exportIconCircle, { backgroundColor: '#EEF2FF' }]}>
                    <Code2 size={22} color="#4F46E5" strokeWidth={1.75} />
                  </View>
                  <View style={styles.exportCardText}>
                    <Text style={[styles.exportFormatTitle, { color: theme.colors.textPrimary }]}>Raw Backup (.json)</Text>
                    <Text style={[styles.exportFormatDesc, { color: theme.colors.textSecondary }]}>
                      Complete data structure for developer backup
                    </Text>
                  </View>
                  <ChevronRight size={18} color={theme.colors.textTertiary} strokeWidth={1.5} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ──────────────── NAME EDIT MODAL ──────────────── */}
      <Modal
        visible={showNameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNameModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.editNameCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.editNameTitle, { color: theme.colors.textPrimary }]}>Change Your Name</Text>
            <TextInput
              style={[styles.nameInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
              value={tempName}
              onChangeText={setTempName}
              placeholder="Enter your name"
              placeholderTextColor={theme.colors.textTertiary}
              autoFocus
            />
            <View style={styles.editNameActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: theme.colors.backgroundSecondary }]}
                onPress={() => setShowNameModal(false)}
              >
                <Text style={[styles.cancelBtnText, { color: theme.colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleSaveName}
              >
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ──────────────── CURRENCY MODAL ──────────────── */}
      <Modal
        visible={showCurrencyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.currencyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.currencyHeader}>
              <Text style={[styles.currencyTitle, { color: theme.colors.textPrimary }]}>Select Currency</Text>
              <TouchableOpacity onPress={() => setShowCurrencyModal(false)} style={styles.modalClose}>
                <X size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.currencyScroll} showsVerticalScrollIndicator={false}>
              {SUPPORTED_CURRENCIES.map((curr) => {
                const isSelected = settings.currencyCode === curr.code;
                return (
                  <TouchableOpacity
                    key={curr.code}
                    style={[
                      styles.currencyRow,
                      { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                      isSelected && { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
                    ]}
                    onPress={() => {
                      triggerHaptic();
                      updateSettings({ currency: curr.symbol, currencyCode: curr.code });
                      setShowCurrencyModal(false);
                    }}
                  >
                    <Text style={[styles.currencyRowCode, { color: theme.colors.textPrimary }]}>
                      {curr.code} ({curr.symbol})
                    </Text>
                    <Text style={[styles.currencyRowName, { color: theme.colors.textSecondary }]}>{curr.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Shake Sensitivity Modal */}
      <ShakeSensitivityModal
        visible={showSensitivityModal}
        onClose={() => setShowSensitivityModal(false)}
      />

      {/* Set Budget Modal */}
      <SetBudgetModal
        visible={showBudgetModal}
        onClose={() => setShowBudgetModal(false)}
      />

      {/* Custom Time Picker Modal */}
      <CustomTimePickerModal
        visible={showReminderTimeModal}
        initialTime={settings.reminderTime || '20:00'}
        onSave={(val: string) => {
          updateSettings({ reminderTime: val });
          setShowReminderTimeModal(false);
        }}
        onClose={() => setShowReminderTimeModal(false)}
      />

      {/* Widgets & Shortcuts Hub Modal */}
      <WidgetsHubModal
        visible={showWidgetsModal}
        onClose={() => setShowWidgetsModal(false)}
        onOpenQuickAdd={() => openAddExpensePopup()}
      />

      {/* Erase All Data Confirmation Modal */}
      <ConfirmModal
        visible={showEraseAllConfirm}
        title="Erase All Data?"
        message="This will permanently wipe all recorded expenses, budgets, savings goals, and preferences. You will restart from fresh onboarding."
        confirmText="Erase Everything"
        cancelText="Cancel"
        isDestructive
        onConfirm={handleEraseAllConfirm}
        onCancel={() => setShowEraseAllConfirm(false)}
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
    paddingBottom: 85,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  divider: {
    height: 1,
    marginLeft: 60,
  },
  aboutBox: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  aboutLogo: {
    marginBottom: 10,
  },
  appName: {
    fontSize: 18,
    fontWeight: '700',
  },
  appTagline: {
    fontSize: 13,
    marginTop: 2,
  },
  appVersion: {
    fontSize: 11,
    marginTop: 6,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  privacyText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportOptions: {
    marginTop: 16,
    gap: 10,
  },
  exportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  exportIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exportCardText: {
    flex: 1,
  },
  exportFormatTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  exportFormatDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  exportLoadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  exportLoadingText: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 14,
  },
  exportLoadingSubText: {
    fontSize: 12,
    marginTop: 4,
  },
  editNameCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  editNameTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  nameInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 16,
  },
  editNameActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  currencyCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    maxHeight: 480,
  },
  currencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  currencyTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  currencyScroll: {
    maxHeight: 380,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  currencyRowCode: {
    fontSize: 14,
    fontWeight: '700',
  },
  currencyRowName: {
    fontSize: 12,
  },
});
