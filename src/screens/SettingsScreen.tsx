import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Platform,
  Share,
  Alert,
} from 'react-native';
import {
  Smartphone,
  DollarSign,
  Trash2,
  Download,
  Check,
  Zap,
  ShieldCheck,
  Vibrate,
  Sparkles,
} from 'lucide-react-native';
import { useExpenses } from '../context/ExpenseContext';
import { useShake } from '../context/ShakeContext';
import { SUPPORTED_CURRENCIES } from '../constants/categories';
import { ShakeSensitivity } from '../types/expense';
import { theme } from '../constants/theme';
import { ConfirmModal } from '../components/ConfirmModal';

export const SettingsScreen: React.FC = () => {
  const { settings, updateSettings, expenses, clearAllExpenses } = useExpenses();
  const { simulateShake } = useShake();

  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState<boolean>(false);

  const handleSensitivityChange = (val: ShakeSensitivity) => {
    updateSettings({ shakeSensitivity: val });
  };

  const handleExportData = async () => {
    try {
      const dataStr = JSON.stringify(
        {
          appName: 'ExpenseFlow',
          exportedAt: new Date().toISOString(),
          totalRecords: expenses.length,
          expenses,
          settings,
        },
        null,
        2
      );

      await Share.share({
        message: dataStr,
        title: 'ExpenseFlow_Backup.json',
      });
    } catch (err) {
      console.error('Failed to export data:', err);
    }
  };

  const handleClearAllConfirm = async () => {
    try {
      await clearAllExpenses();
      setShowClearConfirm(false);
      Alert.alert('Cleared', 'All records deleted.');
    } catch (e) {
      console.error('Failed to clear data:', e);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Shake Detection */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Shake Gesture</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.primaryLight }]}>
                <Smartphone size={15} color={theme.colors.primary} strokeWidth={1.4} />
              </View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>Shake-to-Add</Text>
                <Text style={styles.rowSubtitle}>Shake phone to log expense</Text>
              </View>
            </View>
            <Switch
              value={settings.shakeEnabled}
              onValueChange={(val) => updateSettings({ shakeEnabled: val })}
              trackColor={{ false: '#CBD5E1', true: theme.colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {settings.shakeEnabled && (
            <>
              <View style={styles.divider} />
              <View style={styles.sensitivitySection}>
                <View style={styles.sensitivityHeader}>
                  <Text style={styles.sublabel}>Sensitivity</Text>
                  <Text style={styles.sublabelValue}>
                    {settings.shakeSensitivity.toUpperCase()}
                  </Text>
                </View>

                {/* Pill Segmented Control */}
                <View style={styles.segmentedControl}>
                  {(['low', 'medium', 'high'] as ShakeSensitivity[]).map((level) => {
                    const isSelected = settings.shakeSensitivity === level;
                    return (
                      <TouchableOpacity
                        key={level}
                        style={[
                          styles.segmentPill,
                          isSelected && styles.segmentPillActive,
                        ]}
                        onPress={() => handleSensitivityChange(level)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.segmentText,
                            isSelected && styles.segmentTextActive,
                          ]}
                        >
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.testPill}
                onPress={simulateShake}
                activeOpacity={0.7}
              >
                <Sparkles size={13} color={theme.colors.primary} strokeWidth={1.4} />
                <Text style={styles.testPillText}>Test Shake Gesture</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Platform Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Zap size={12} color={theme.colors.primary} strokeWidth={1.4} />
            <Text style={styles.statusTitle}>Background Detection</Text>
          </View>
          <Text style={styles.statusDescription}>
            {Platform.OS === 'android'
              ? 'Active in background via Android Foreground Service.'
              : 'Active in foreground on iOS.'}
          </Text>
        </View>
      </View>

      {/* Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Preferences</Text>

        <View style={styles.card}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#F0FDF4' }]}>
                <DollarSign size={15} color="#16A34A" strokeWidth={1.4} />
              </View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>Currency</Text>
                <Text style={styles.rowSubtitle}>
                  {SUPPORTED_CURRENCIES.find((c) => c.symbol === settings.currency)?.name ||
                    settings.currency}
                </Text>
              </View>
            </View>
            <Text style={styles.selectedCurrencySymbol}>{settings.currency}</Text>
          </TouchableOpacity>

          {showCurrencyPicker && (
            <View style={styles.currencyOptionsList}>
              {SUPPORTED_CURRENCIES.map((curr) => {
                const isSelected = settings.currency === curr.symbol;
                return (
                  <TouchableOpacity
                    key={curr.code}
                    style={[
                      styles.currencyOptionItem,
                      isSelected && styles.currencyOptionActive,
                    ]}
                    onPress={() => {
                      updateSettings({ currency: curr.symbol, currencyCode: curr.code });
                      setShowCurrencyPicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.currencyOptionName}>{curr.name}</Text>
                    {isSelected && <Check size={14} color={theme.colors.primary} strokeWidth={1.5} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#F5F3FF' }]}>
                <Vibrate size={15} color="#7C3AED" strokeWidth={1.4} />
              </View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>Haptics</Text>
                <Text style={styles.rowSubtitle}>Vibrate on actions</Text>
              </View>
            </View>
            <Switch
              value={settings.hapticsEnabled}
              onValueChange={(val) => updateSettings({ hapticsEnabled: val })}
              trackColor={{ false: '#CBD5E1', true: theme.colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </View>

      {/* Data */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Data</Text>

        <View style={styles.card}>
          <TouchableOpacity
            style={styles.row}
            onPress={handleExportData}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.primaryLight }]}>
                <Download size={15} color={theme.colors.primary} strokeWidth={1.4} />
              </View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>Export JSON</Text>
                <Text style={styles.rowSubtitle}>{expenses.length} records</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => setShowClearConfirm(true)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.dangerLight }]}>
                <Trash2 size={15} color={theme.colors.danger} strokeWidth={1.4} />
              </View>
              <View style={styles.rowTextCol}>
                <Text style={[styles.rowTitle, { color: theme.colors.danger }]}>
                  Clear All Data
                </Text>
                <Text style={styles.rowSubtitle}>Delete all records</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>About</Text>

        <View style={styles.card}>
          <View style={styles.aboutRow}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.successLight }]}>
              <ShieldCheck size={16} color={theme.colors.success} strokeWidth={1.4} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aboutTitle}>100% Offline & Private</Text>
              <Text style={styles.aboutText}>
                All data is stored locally on device.
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
        </View>
      </View>

      {/* Clear Confirmation Modal */}
      <ConfirmModal
        visible={showClearConfirm}
        title="Clear All Data?"
        message="Permanently delete all stored expenses?"
        confirmLabel="Clear All"
        isDestructive
        onConfirm={handleClearAllConfirm}
        onCancel={() => setShowClearConfirm(false)}
      />

      <View style={{ height: 80 }} />
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
    paddingTop: 10,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  section: {
    marginBottom: 14,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 5,
    marginLeft: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rowTextCol: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  rowSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  sensitivitySection: {
    marginTop: 2,
  },
  sensitivityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  sublabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  sublabelValue: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 999, // Pill capsule
    padding: 3,
    gap: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  segmentPill: {
    flex: 1,
    paddingVertical: 5,
    alignItems: 'center',
    borderRadius: 999,
  },
  segmentPillActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  segmentText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  segmentTextActive: {
    fontWeight: '600',
    color: theme.colors.primary,
  },
  testPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 7,
    borderRadius: 999,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  testPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  statusCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  statusTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  statusDescription: {
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 15,
  },
  selectedCurrencySymbol: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  currencyOptionsList: {
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 4,
    gap: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  currencyOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  currencyOptionActive: {
    backgroundColor: '#FFFFFF',
  },
  currencyOptionName: {
    fontSize: 12,
    color: theme.colors.textPrimary,
  },
  aboutRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  aboutTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 1,
  },
  aboutText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    lineHeight: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
});
