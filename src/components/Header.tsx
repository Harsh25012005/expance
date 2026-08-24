import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Sparkles, FileSpreadsheet, SmartphoneNfc } from 'lucide-react-native';
import { useExpense } from '../context/ExpenseContext';
import { useShake } from '../context/ShakeContext';

interface HeaderProps {
  onOpenSheetModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSheetModal }) => {
  const { sheetConfig } = useExpense();
  const { shakeSettings, simulateShake } = useShake();

  return (
    <View style={styles.container}>
      {/* App Branding */}
      <View style={styles.brandRow}>
        <View style={styles.logoBadge}>
          <Sparkles size={20} color="#10b981" />
        </View>
        <View>
          <Text style={styles.appName}>ShakeExpense</Text>
          <Text style={styles.tagline}>Shake anywhere to record</Text>
        </View>
      </View>

      {/* Header Actions */}
      <View style={styles.actionsRow}>
        {/* Shake Status / Trigger */}
        <TouchableOpacity
          style={styles.shakeButton}
          onPress={simulateShake}
          activeOpacity={0.7}
        >
          <SmartphoneNfc size={16} color={shakeSettings.enabled ? '#10b981' : '#64748b'} />
        </TouchableOpacity>

        {/* Google Sheet Setup Pill */}
        <TouchableOpacity
          style={[
            styles.sheetPill,
            sheetConfig.isConnected ? styles.sheetPillConnected : styles.sheetPillDisconnected,
          ]}
          onPress={onOpenSheetModal}
          activeOpacity={0.7}
        >
          <FileSpreadsheet
            size={16}
            color={sheetConfig.isConnected ? '#10b981' : '#fbbf24'}
          />
          <View
            style={[
              styles.statusDot,
              sheetConfig.isConnected ? styles.dotGreen : styles.dotOrange,
            ]}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#090d16',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.4,
  },
  tagline: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shakeButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 6,
  },
  sheetPillConnected: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  sheetPillDisconnected: {
    borderColor: 'rgba(251, 191, 36, 0.4)',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotGreen: {
    backgroundColor: '#10b981',
  },
  dotOrange: {
    backgroundColor: '#fbbf24',
  },
});
