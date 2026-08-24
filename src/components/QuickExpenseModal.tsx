import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { X, Sparkles, ChevronDown, Check } from 'lucide-react-native';
import { useShake } from '../context/ShakeContext';
import { useExpenses } from '../context/ExpenseContext';
import { CategoryType } from '../types/expense';
import { CATEGORIES, CATEGORY_MAP } from '../constants/categories';
import { theme } from '../constants/theme';

export const QuickExpenseModal: React.FC = () => {
  const { isQuickAddModalOpen, closeQuickAddModal, triggeredByShake, editingExpense } = useShake();
  const { addExpense, updateExpense, settings } = useExpenses();

  const [name, setName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<CategoryType>('Food');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isQuickAddModalOpen) {
      if (editingExpense) {
        setName(editingExpense.name);
        setAmount(editingExpense.amount.toString());
        setCategory(editingExpense.category);
      } else {
        setName('');
        setAmount('');
        setCategory('Food');
      }
      setIsDropdownOpen(false);
      setErrorMsg(null);
      setIsSubmitting(false);
    }
  }, [isQuickAddModalOpen, editingExpense]);

  const handleQuickAddAmount = (extra: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + extra).toString());
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const numAmount = parseFloat(amount);

    if (!trimmedName) {
      setErrorMsg('Enter an expense name');
      return;
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Enter an amount > 0');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          name: trimmedName,
          amount: numAmount,
          category,
        });
      } else {
        await addExpense({
          name: trimmedName,
          amount: numAmount,
          category,
        });
      }

      closeQuickAddModal();
    } catch (err) {
      console.error('Error saving expense:', err);
      setErrorMsg('Failed to save.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isQuickAddModalOpen) {
    return null;
  }

  const isValid = name.trim().length > 0 && parseFloat(amount) > 0;
  const currentCatInfo = CATEGORY_MAP[category] || CATEGORY_MAP.Other;

  return (
    <Modal
      visible={isQuickAddModalOpen}
      animationType="fade"
      transparent
      onRequestClose={closeQuickAddModal}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardContainer}
          >
            <View style={styles.popupCard}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>
                    {editingExpense ? 'Edit Expense' : 'Add Expense'}
                  </Text>
                  {triggeredByShake && (
                    <View style={styles.shakeBadge}>
                      <Sparkles size={11} color="#B45309" strokeWidth={1.4} />
                      <Text style={styles.shakeBadgeText}>Shake</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.closeCircle}
                  onPress={closeQuickAddModal}
                  activeOpacity={0.7}
                  accessibilityLabel="Close"
                >
                  <X size={16} color={theme.colors.textSecondary} strokeWidth={1.4} />
                </TouchableOpacity>
              </View>

              {/* Amount Input */}
              <View style={styles.amountSection}>
                <View style={styles.amountInputRow}>
                  <Text style={styles.currencySymbol}>{settings.currency}</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={amount}
                    onChangeText={(val) => {
                      const cleaned = val.replace(/[^0-9.]/g, '');
                      setAmount(cleaned);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="decimal-pad"
                    autoFocus={!editingExpense}
                  />
                </View>

                {/* Horizontal Scroll Quick Amount Chips */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickChipsContent}
                  style={styles.quickChipsScroll}
                >
                  {[5, 10, 20, 50, 100, 200, 500].map((inc) => (
                    <TouchableOpacity
                      key={inc}
                      style={styles.quickChip}
                      onPress={() => handleQuickAddAmount(inc)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickChipText}>+{inc}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Expense Name */}
              <View style={styles.fieldSection}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="e.g. Coffee, Lunch, Uber"
                  placeholderTextColor={theme.colors.textMuted}
                  returnKeyType="done"
                />
              </View>

              {/* Category Dropdown (Clean text only, scrollable list) */}
              <View style={styles.fieldSection}>
                <Text style={styles.inputLabel}>Category</Text>
                <TouchableOpacity
                  style={[styles.dropdownButton, isDropdownOpen && styles.dropdownButtonActive]}
                  onPress={() => {
                    Keyboard.dismiss();
                    setIsDropdownOpen(!isDropdownOpen);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropdownSelectedText}>{currentCatInfo.label}</Text>
                  <ChevronDown
                    size={16}
                    color={theme.colors.textSecondary}
                    strokeWidth={1.4}
                    style={{
                      transform: [{ rotate: isDropdownOpen ? '180deg' : '0deg' }],
                    }}
                  />
                </TouchableOpacity>

                {/* Dropdown Options List with dedicated Smooth ScrollView */}
                {isDropdownOpen && (
                  <View style={styles.dropdownMenu}>
                    <ScrollView
                      style={styles.dropdownScroll}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={true}
                    >
                      {CATEGORIES.map((cat) => {
                        const isSelected = category === cat.id;
                        return (
                          <TouchableOpacity
                            key={cat.id}
                            style={[
                              styles.dropdownItem,
                              isSelected && styles.dropdownItemActive,
                            ]}
                            onPress={() => {
                              setCategory(cat.id);
                              setIsDropdownOpen(false);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.dropdownItemLabel,
                                isSelected && styles.dropdownItemLabelActive,
                              ]}
                            >
                              {cat.label}
                            </Text>
                            {isSelected && (
                              <Check size={14} color={theme.colors.primary} strokeWidth={1.5} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Error Banner */}
              {errorMsg && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.cancelPill}
                  onPress={closeQuickAddModal}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelPillText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.savePill,
                    (!isValid || isSubmitting) && styles.savePillDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={!isValid || isSubmitting}
                  activeOpacity={0.8}
                >
                  <Text style={styles.savePillText}>
                    {isSubmitting ? 'Saving...' : editingExpense ? 'Update' : 'Save'}
                  </Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24, // 24px side gutters
  },
  keyboardContainer: {
    width: '100%',
    maxWidth: 400,
  },
  popupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  shakeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 999,
    gap: 3,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  shakeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#B45309',
  },
  closeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  amountSection: {
    marginBottom: 14,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.primary,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    padding: 0,
  },
  quickChipsScroll: {
    marginTop: 8,
  },
  quickChipsContent: {
    flexDirection: 'row',
    gap: 6,
  },
  quickChip: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  fieldSection: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 5,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dropdownButtonActive: {
    borderColor: theme.colors.primary,
  },
  dropdownSelectedText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  dropdownMenu: {
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxHeight: 160,
    overflow: 'hidden',
  },
  dropdownScroll: {
    maxHeight: 160,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  dropdownItemActive: {
    backgroundColor: theme.colors.primaryLight,
  },
  dropdownItemLabel: {
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  dropdownItemLabelActive: {
    fontWeight: '600',
    color: theme.colors.primary,
  },
  errorBanner: {
    backgroundColor: theme.colors.dangerLight,
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: theme.colors.dangerText,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cancelPill: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  savePill: {
    flex: 2,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savePillDisabled: {
    opacity: 0.5,
  },
  savePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
