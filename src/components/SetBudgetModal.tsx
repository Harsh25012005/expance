import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, WalletCards, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useExpenses } from '../context/ExpenseContext';
import { formatCurrency } from '../utils/formatters';
import { theme } from '../constants/theme';

interface SetBudgetModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SetBudgetModal: React.FC<SetBudgetModalProps> = ({ visible, onClose }) => {
  const { settings, updateSettings } = useExpenses();
  const insets = useSafeAreaInsets();
  const [budgetInput, setBudgetInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      setBudgetInput(settings.monthlyBudget && settings.monthlyBudget > 0 ? settings.monthlyBudget.toString() : '');
      setIsSubmitting(false);
    }
  }, [visible, settings.monthlyBudget]);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
  };

  const handleSave = async () => {
    const num = parseFloat(budgetInput.replace(/,/g, ''));
    if (isNaN(num) || num < 0) return;

    setIsSubmitting(true);
    triggerHaptic();
    await updateSettings({ monthlyBudget: num });
    setIsSubmitting(false);
    onClose();
  };

  const handleRemoveBudget = async () => {
    triggerHaptic();
    await updateSettings({ monthlyBudget: 0 });
    onClose();
  };

  const presets = [10000, 25000, 50000, 100000];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View
          style={[
            styles.overlay,
            {
              paddingTop: insets.top + 20,
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardWrap}
          >
            <View style={styles.card}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.iconCircle}>
                    <WalletCards size={18} color={theme.colors.primary} strokeWidth={1.5} />
                  </View>
                  <Text style={styles.title}>
                    {settings.monthlyBudget && settings.monthlyBudget > 0 ? 'Edit monthly budget' : 'Set monthly budget'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={onClose}
                  activeOpacity={0.7}
                  accessibilityLabel="Close"
                >
                  <X size={16} color={theme.colors.textSecondary} strokeWidth={1.5} />
                </TouchableOpacity>
              </View>

              {/* Subtitle */}
              <Text style={styles.subtitle}>
                Set a target to keep track of your monthly spending and stay within your limits.
              </Text>

              {/* Input Area */}
              <View style={styles.inputBox}>
                <Text style={styles.currencyPrefix}>{settings.currency}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="numeric"
                  value={budgetInput}
                  onChangeText={setBudgetInput}
                  autoFocus
                  maxLength={10}
                />
              </View>

              {/* Quick Presets */}
              <View style={styles.presetsRow}>
                {presets.map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={styles.presetChip}
                    onPress={() => {
                      triggerHaptic();
                      setBudgetInput(preset.toString());
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.presetText}>
                      {formatCurrency(preset, settings.currency)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Buttons */}
              <View style={styles.actionsRow}>
                {settings.monthlyBudget && settings.monthlyBudget > 0 ? (
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={handleRemoveBudget}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.removeBtnText}>Remove budget</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    (!budgetInput || parseFloat(budgetInput) <= 0) && styles.saveBtnDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={!budgetInput || parseFloat(budgetInput) <= 0 || isSubmitting}
                  activeOpacity={0.7}
                >
                  <Text style={styles.saveBtnText}>Save Budget</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
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
  keyboardWrap: {
    width: '100%',
    maxWidth: 400,
  },
  card: {
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
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...theme.typography.sectionHeading,
    color: theme.colors.textPrimary,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    ...theme.typography.secondary,
    color: theme.colors.textSecondary,
    marginBottom: 18,
    lineHeight: 18,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    marginBottom: 14,
  },
  currencyPrefix: {
    ...theme.typography.display,
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginRight: 8,
  },
  input: {
    flex: 1,
    ...theme.typography.display,
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    padding: 0,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  presetText: {
    ...theme.typography.caption,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  removeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  removeBtnText: {
    ...theme.typography.body,
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.danger,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    ...theme.typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.surface,
  },
});
