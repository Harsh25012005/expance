import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  FileSpreadsheet,
  SmartphoneNfc,
  DollarSign,
  Trash2,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Zap,
  Info,
} from 'lucide-react-native';
import { useExpense } from '../context/ExpenseContext';
import { useShake } from '../context/ShakeContext';
import { CURRENCY_SYMBOLS } from '../constants/categories';
import { ShakeSensitivity } from '../types/expense';

interface SettingsScreenProps {
  onOpenSheetModal: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onOpenSheetModal }) => {
  const {
    sheetConfig,
    currency,
    updateCurrency,
    resetToDemoData,
    clearAllExpenses,
    expenses,
    unsyncedCount,
  } = useExpense();

  const { shakeSettings, updateShakeSettings, simulateShake } = useShake();

  const handleResetData = () => {
    Alert.alert(
      'Reset to Sample Data',
      'This will restore sample expenses for demonstration. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => resetToDemoData() },
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Expenses',
      'Are you sure you want to delete all local expense records? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: () => clearAllExpenses() },
      ]
    );
  };

  const sensitivities: { id: ShakeSensitivity; label: string; desc: string }[] = [
    { id: 'low', label: 'Low', desc: 'Requires firm shake' },
    { id: 'medium', label: 'Medium', desc: 'Standard balanced' },
    { id: 'high', label: 'High', desc: 'Light shake triggers' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. GOOGLE SHEETS SYNC SECTION */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <FileSpreadsheet size={16} color="#10b981" />
          <Text style={styles.sectionTitle}>GOOGLE SHEETS INTEGRATION</Text>
        </View>

        <TouchableOpacity
          style={styles.cardItem}
          onPress={onOpenSheetModal}
          activeOpacity={0.7}
        >
          <View style={styles.cardItemLeft}>
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: sheetConfig.isConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(251, 191, 36, 0.15)' },
              ]}
            >
              <FileSpreadsheet
                size={20}
                color={sheetConfig.isConnected ? '#10b981' : '#fbbf24'}
              />
            </View>
            <View style={styles.cardItemText}>
              <Text style={styles.cardItemTitle}>
                {sheetConfig.isConnected ? 'Google Sheet Connected' : 'Connect Google Sheet'}
              </Text>
              <Text style={styles.cardItemSubtitle}>
                {sheetConfig.isConnected
                  ? unsyncedCount > 0
                    ? `${unsyncedCount} items waiting to sync`
                    : 'Auto-sync active'
                  : 'Tap to enter Web App URL & setup'}
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* 2. SHAKE DETECTION SETTINGS */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <SmartphoneNfc size={16} color="#38bdf8" />
          <Text style={styles.sectionTitle}>SHAKE GESTURE CONFIGURATION</Text>
        </View>

        <View style={styles.settingsCard}>
          {/* Shake Enable Switch */}
          <View style={styles.rowBetween}>
            <View style={styles.switchLabelWrap}>
              <Text style={styles.itemTitle}>Enable Shake-to-Add</Text>
              <Text style={styles.itemSubtitle}>Shake device anywhere to open quick expense popup</Text>
            </View>
            <Switch
              value={shakeSettings.enabled}
              onValueChange={(val) => updateShakeSettings({ enabled: val })}
              trackColor={{ false: '#334155', true: '#10b981' }}
              thumbColor="#ffffff"
            />
          </View>

          {/* Haptic Feedback Switch */}
          <View style={[styles.rowBetween, styles.dividerTop]}>
            <View style={styles.switchLabelWrap}>
              <Text style={styles.itemTitle}>Haptic Vibration</Text>
              <Text style={styles.itemSubtitle}>Vibrate phone on shake detection</Text>
            </View>
            <Switch
              value={shakeSettings.hapticFeedback}
              onValueChange={(val) => updateShakeSettings({ hapticFeedback: val })}
              trackColor={{ false: '#334155', true: '#10b981' }}
              thumbColor="#ffffff"
            />
          </View>

          {/* Background & Lock Screen Quick Access */}
          <View style={[styles.rowBetween, styles.dividerTop]}>
            <View style={styles.switchLabelWrap}>
              <Text style={styles.itemTitle}>Closed App / Background Quick Access</Text>
              <Text style={styles.itemSubtitle}>Show interactive quick-launcher when app is closed or in background</Text>
            </View>
            <Switch
              value={shakeSettings.backgroundAccess}
              onValueChange={(val) => updateShakeSettings({ backgroundAccess: val })}
              trackColor={{ false: '#334155', true: '#10b981' }}
              thumbColor="#ffffff"
            />
          </View>

          {/* Sensitivity Picker */}
          <View style={styles.dividerTop}>
            <Text style={styles.itemTitle}>Shake Sensitivity</Text>
            <View style={styles.sensitivityRow}>
              {sensitivities.map((s) => {
                const isSelected = shakeSettings.sensitivity === s.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.sensChip, isSelected && styles.sensChipSelected]}
                    onPress={() => updateShakeSettings({ sensitivity: s.id })}
                  >
                    <Text style={[styles.sensChipLabel, isSelected && styles.sensChipLabelSelected]}>
                      {s.label}
                    </Text>
                    <Text style={styles.sensChipDesc}>{s.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Test Shake Button */}
          <TouchableOpacity
            style={styles.testShakeBtn}
            onPress={simulateShake}
            activeOpacity={0.8}
          >
            <Zap size={16} color="#090d16" />
            <Text style={styles.testShakeBtnText}>Test / Simulate Shake Trigger</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. CURRENCY SELECTION */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <DollarSign size={16} color="#a78bfa" />
          <Text style={styles.sectionTitle}>CURRENCY</Text>
        </View>

        <View style={styles.currencyGrid}>
          {CURRENCY_SYMBOLS.map((curr) => {
            const isSelected = currency === curr.symbol;
            return (
              <TouchableOpacity
                key={curr.code}
                style={[styles.currencyCard, isSelected && styles.currencyCardSelected]}
                onPress={() => updateCurrency(curr.symbol)}
              >
                <Text style={[styles.currSymbolText, isSelected && styles.currSymbolTextSelected]}>
                  {curr.symbol}
                </Text>
                <Text style={[styles.currCodeText, isSelected && styles.currCodeTextSelected]}>
                  {curr.code}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 4. DATA MANAGEMENT */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Trash2 size={16} color="#ef4444" />
          <Text style={styles.sectionTitle}>DATA & BACKUP</Text>
        </View>

        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.dangerRow} onPress={handleResetData}>
            <RotateCcw size={18} color="#38bdf8" />
            <View style={styles.dangerTextWrap}>
              <Text style={styles.dangerTitle}>Restore Demo Sample Expenses</Text>
              <Text style={styles.dangerSubtitle}>Populate with sample data for demonstration</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.dangerRow, styles.dividerTop]} onPress={handleClearData}>
            <Trash2 size={18} color="#ef4444" />
            <View style={styles.dangerTextWrap}>
              <Text style={[styles.dangerTitle, { color: '#f87171' }]}>Delete All App Expenses</Text>
              <Text style={styles.dangerSubtitle}>Wipes all {expenses.length} records from this device</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* App Info Footer */}
      <View style={styles.appInfoFooter}>
        <View style={styles.appInfoRow}>
          <Sparkles size={14} color="#10b981" />
          <Text style={styles.appInfoText}>ShakeExpense Tracker v1.0.0</Text>
        </View>
        <Text style={styles.appInfoSub}>NativeWind • Expo • Google Sheets Sync</Text>
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
    padding: 16,
    gap: 20,
    paddingBottom: 90,
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.8,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
  },
  cardItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardItemText: {
    flex: 1,
    gap: 2,
  },
  cardItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
  },
  cardItemSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
  },
  settingsCard: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    gap: 14,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabelWrap: {
    flex: 1,
    paddingRight: 16,
    gap: 2,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
  },
  itemSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
  },
  dividerTop: {
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 14,
  },
  sensitivityRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  sensChip: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 10,
    alignItems: 'center',
    gap: 2,
  },
  sensChipSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
  },
  sensChipLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
  },
  sensChipLabelSelected: {
    color: '#34d399',
  },
  sensChipDesc: {
    fontSize: 9,
    color: '#64748b',
    textAlign: 'center',
  },
  testShakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34d399',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    marginTop: 4,
  },
  testShakeBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#090d16',
  },
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currencyCard: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  currencyCardSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
  },
  currSymbolText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#94a3b8',
  },
  currSymbolTextSelected: {
    color: '#10b981',
  },
  currCodeText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  currCodeTextSelected: {
    color: '#34d399',
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dangerTextWrap: {
    flex: 1,
    gap: 2,
  },
  dangerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
  },
  dangerSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
  },
  appInfoFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 4,
  },
  appInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appInfoText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  appInfoSub: {
    fontSize: 11,
    color: '#64748b',
  },
  bottomSpacer: {
    height: 30,
  },
});
