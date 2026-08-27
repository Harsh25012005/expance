import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Clock, Plus, Minus, X, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { theme } from '../constants/theme';

interface CustomTimePickerModalProps {
  visible: boolean;
  initialTime?: string; // 24h format e.g. "20:35" or "08:00"
  onSave: (timeStr: string) => void;
  onClose: () => void;
}

export const CustomTimePickerModal: React.FC<CustomTimePickerModalProps> = ({
  visible,
  initialTime = '20:00',
  onSave,
  onClose,
}) => {
  const insets = useSafeAreaInsets();

  const parseTime = (timeStr: string) => {
    const parts = timeStr.split(':');
    let h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) || 0;
    if (isNaN(h)) h = 20;

    const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
    let hour12 = h % 12;
    if (hour12 === 0) hour12 = 12;

    return { hour: hour12, minute: m, period };
  };

  const [selectedHour, setSelectedHour] = useState<number>(8);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('PM');

  useEffect(() => {
    if (visible) {
      const parsed = parseTime(initialTime);
      setSelectedHour(parsed.hour);
      setSelectedMinute(parsed.minute);
      setSelectedPeriod(parsed.period);
    }
  }, [visible, initialTime]);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
  };

  const handleHourChange = (h: number) => {
    triggerHaptic();
    setSelectedHour(h);
  };

  const handleMinuteChange = (m: number) => {
    triggerHaptic();
    const clamped = Math.min(Math.max(m, 0), 59);
    setSelectedMinute(clamped);
  };

  const handlePeriodChange = (p: 'AM' | 'PM') => {
    triggerHaptic();
    setSelectedPeriod(p);
  };

  const handleSave = () => {
    triggerHaptic();
    let h24 = selectedHour;
    if (selectedPeriod === 'PM') {
      if (h24 < 12) h24 += 12;
    } else {
      if (h24 === 12) h24 = 0;
    }

    const hh = h24.toString().padStart(2, '0');
    const mm = selectedMinute.toString().padStart(2, '0');
    const result24 = `${hh}:${mm}`;

    onSave(result24);
    onClose();
  };

  const formattedDisplay = `${selectedHour}:${selectedMinute.toString().padStart(2, '0')} ${selectedPeriod}`;

  const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const MINUTE_PRESETS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.overlay, { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Clock size={18} color={theme.colors.primary} strokeWidth={1.75} />
              </View>
              <View>
                <Text style={styles.title}>Preferred time</Text>
                <Text style={styles.subtitle}>Choose your daily reminder time</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
              accessibilityLabel="Close"
            >
              <X size={16} color={theme.colors.textSecondary} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>

          {/* Time Display Showcase */}
          <View style={styles.displayCard}>
            <Text style={styles.displayTimeText}>{formattedDisplay}</Text>
            <View style={styles.periodSwitch}>
              <TouchableOpacity
                style={[styles.periodBtn, selectedPeriod === 'AM' && styles.periodBtnActive]}
                onPress={() => handlePeriodChange('AM')}
                activeOpacity={0.7}
              >
                <Text style={[styles.periodBtnText, selectedPeriod === 'AM' && styles.periodBtnTextActive]}>
                  AM
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.periodBtn, selectedPeriod === 'PM' && styles.periodBtnActive]}
                onPress={() => handlePeriodChange('PM')}
                activeOpacity={0.7}
              >
                <Text style={[styles.periodBtnText, selectedPeriod === 'PM' && styles.periodBtnTextActive]}>
                  PM
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Hour Selector (1-12) */}
          <View style={styles.selectorSection}>
            <Text style={styles.sectionLabel}>HOUR</Text>
            <View style={styles.gridRow}>
              {HOURS.map((h) => {
                const isSelected = selectedHour === h;
                return (
                  <TouchableOpacity
                    key={`h-${h}`}
                    style={[styles.chipBtn, isSelected && styles.chipBtnActive]}
                    onPress={() => handleHourChange(h)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {h}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Minute Adjuster & Presets (00-59) */}
          <View style={styles.selectorSection}>
            <View style={styles.minuteHeaderRow}>
              <Text style={styles.sectionLabel}>MINUTE</Text>
              <View style={styles.stepperWrap}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => handleMinuteChange((selectedMinute - 1 + 60) % 60)}
                  activeOpacity={0.7}
                  accessibilityLabel="Decrease minute"
                >
                  <Minus size={13} color={theme.colors.textPrimary} strokeWidth={2} />
                </TouchableOpacity>
                <Text style={styles.stepperValue}>
                  :{selectedMinute.toString().padStart(2, '0')}
                </Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => handleMinuteChange((selectedMinute + 1) % 60)}
                  activeOpacity={0.7}
                  accessibilityLabel="Increase minute"
                >
                  <Plus size={13} color={theme.colors.textPrimary} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.gridRow}>
              {MINUTE_PRESETS.map((m) => {
                const isSelected = selectedMinute === m;
                return (
                  <TouchableOpacity
                    key={`m-${m}`}
                    style={[styles.chipBtn, isSelected && styles.chipBtnActive]}
                    onPress={() => handleMinuteChange(m)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      :{m.toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              activeOpacity={0.7}
            >
              <Check size={14} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.saveBtnText}>Save Time</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
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
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 9999, // Fully rounded
    backgroundColor: theme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...theme.typography.sectionHeading,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 9999, // Fully rounded
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  displayTimeText: {
    ...theme.typography.display,
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: -0.5,
  },
  periodSwitch: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 9999, // Fully rounded
    padding: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  periodBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999, // Fully rounded
  },
  periodBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  periodBtnText: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  periodBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  selectorSection: {
    marginBottom: 14,
  },
  sectionLabel: {
    ...theme.typography.label,
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  minuteHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999, // Fully rounded
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  stepperBtn: {
    width: 22,
    height: 22,
    borderRadius: 9999, // Fully rounded
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
    minWidth: 26,
    textAlign: 'center',
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chipBtn: {
    width: '15.2%',
    height: 32,
    borderRadius: 9999, // Fully rounded
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  chipBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 9999, // Fully rounded
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  cancelBtnText: {
    ...theme.typography.body,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 9999, // Fully rounded
    backgroundColor: theme.colors.primary,
  },
  saveBtnText: {
    ...theme.typography.body,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
