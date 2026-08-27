import React, { useState, useEffect, useRef } from 'react';
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
  Dimensions,
} from 'react-native';
import {
  X,
  ChevronRight,
  Utensils,
  Car,
  ShoppingBag,
  Zap,
  Film,
  HeartPulse,
  Plane,
  GraduationCap,
  MoreHorizontal,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShake } from '../context/ShakeContext';
import { useExpenses } from '../context/ExpenseContext';
import { CategoryType } from '../types/expense';
import { CATEGORIES, CATEGORY_MAP } from '../constants/categories';
import { theme } from '../constants/theme';

export const QuickExpenseModal: React.FC = () => {
  const { isQuickAddModalOpen, closeQuickAddModal, editingExpense } = useShake();
  const { addExpense, updateExpense, settings } = useExpenses();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<CategoryType>('Food');
  const [showCategoryPicker, setShowCategoryPicker] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inputRef = useRef<TextInput>(null);

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
      setShowCategoryPicker(false);
      setErrorMsg(null);
      setIsSubmitting(false);

      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isQuickAddModalOpen, editingExpense]);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
  };

  const handleQuickAddAmount = (extra: number) => {
    triggerHaptic();
    const current = parseFloat(amount) || 0;
    setAmount((current + extra).toString());
    if (errorMsg) setErrorMsg(null);
  };

  const renderCategoryIcon = (catId: CategoryType, size: number = 15, color: string = theme.colors.textPrimary) => {
    switch (catId) {
      case 'Food':
        return <Utensils size={size} color={color} strokeWidth={1.5} />;
      case 'Transport':
        return <Car size={size} color={color} strokeWidth={1.5} />;
      case 'Shopping':
        return <ShoppingBag size={size} color={color} strokeWidth={1.5} />;
      case 'Bills':
        return <Zap size={size} color={color} strokeWidth={1.5} />;
      case 'Entertainment':
        return <Film size={size} color={color} strokeWidth={1.5} />;
      case 'Health':
        return <HeartPulse size={size} color={color} strokeWidth={1.5} />;
      case 'Travel':
        return <Plane size={size} color={color} strokeWidth={1.5} />;
      case 'Education':
        return <GraduationCap size={size} color={color} strokeWidth={1.5} />;
      case 'Other':
      default:
        return <MoreHorizontal size={size} color={color} strokeWidth={1.5} />;
    }
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const numAmount = parseFloat(amount);

    if (!trimmedName) {
      setErrorMsg('Please enter what you spent on');
      return;
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Please enter a valid amount');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      if (settings.hapticsEnabled) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        } catch {}
      }

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
      setErrorMsg('Failed to save expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = name.trim().length > 0 && parseFloat(amount) > 0;
  const currentCatInfo = CATEGORY_MAP[category] || CATEGORY_MAP.Other;

  return (
    <Modal
      visible={isQuickAddModalOpen}
      transparent
      animationType="fade"
      onRequestClose={closeQuickAddModal}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View
          style={[
            styles.overlay,
            {
              paddingTop: insets.top + 16,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardWrap}
          >
            <View style={styles.popupCard}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>
                  {editingExpense ? 'Edit expense' : 'Add expense'}
                </Text>

                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={closeQuickAddModal}
                  activeOpacity={0.7}
                  accessibilityLabel="Close"
                >
                  <X size={16} color={theme.colors.textSecondary} strokeWidth={1.5} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.formScroll}
                contentContainerStyle={styles.formContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* 1. Expense Name */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>EXPENSE NAME</Text>
                  <TextInput
                    ref={inputRef}
                    style={styles.textInput}
                    value={name}
                    onChangeText={(val) => {
                      setName(val);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="What did you spend on?"
                    placeholderTextColor={theme.colors.textTertiary}
                    returnKeyType="next"
                  />
                </View>

                {/* 2. Category Selector */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>CATEGORY</Text>
                  <TouchableOpacity
                    style={styles.categorySelector}
                    onPress={() => {
                      triggerHaptic();
                      Keyboard.dismiss();
                      setShowCategoryPicker(!showCategoryPicker);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.categoryLeft}>
                      <View style={[styles.categoryIconWrap, { backgroundColor: currentCatInfo.bgColor }]}>
                        {renderCategoryIcon(category, 14, currentCatInfo.color)}
                      </View>
                      <Text style={styles.categorySelectedText}>{currentCatInfo.label}</Text>
                    </View>
                    <ChevronRight size={15} color={theme.colors.textTertiary} strokeWidth={1.5} />
                  </TouchableOpacity>

                  {/* 3x3 Compact Category Grid */}
                  {showCategoryPicker && (
                    <View style={styles.categoryGrid}>
                      {CATEGORIES.map((cat) => {
                        const isSelected = category === cat.id;
                        return (
                          <TouchableOpacity
                            key={cat.id}
                            style={[
                              styles.categoryGridItem,
                              isSelected && styles.categoryGridItemSelected,
                            ]}
                            onPress={() => {
                              triggerHaptic();
                              setCategory(cat.id);
                              setShowCategoryPicker(false);
                            }}
                            activeOpacity={0.7}
                          >
                            <View
                              style={[
                                styles.gridIconWrap,
                                { backgroundColor: cat.bgColor },
                                isSelected && { backgroundColor: theme.colors.textPrimary },
                              ]}
                            >
                              {renderCategoryIcon(cat.id, 13, isSelected ? '#FFFFFF' : cat.color)}
                            </View>
                            <Text
                              style={[
                                styles.gridItemLabel,
                                isSelected && styles.gridItemLabelSelected,
                              ]}
                              numberOfLines={1}
                            >
                              {cat.id}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* 3. Amount */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>AMOUNT</Text>
                  <View style={styles.amountContainer}>
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
                      placeholderTextColor={theme.colors.textTertiary}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                    />
                  </View>

                  {/* Increment Pills */}
                  <View style={styles.quickPillsRow}>
                    {[10, 50, 100, 200, 500].map((inc) => (
                      <TouchableOpacity
                        key={inc}
                        style={styles.quickPill}
                        onPress={() => handleQuickAddAmount(inc)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.quickPillText}>+{inc}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Error Banner */}
                {errorMsg && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{errorMsg}</Text>
                  </View>
                )}
              </ScrollView>

              {/* Bottom Save Action */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (!isValid || isSubmitting) && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={!isValid || isSubmitting}
                  activeOpacity={0.85}
                >
                  <Text style={styles.saveButtonText}>
                    {isSubmitting ? 'Saving...' : editingExpense ? 'Save Changes' : 'Save Expense'}
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
    backgroundColor: theme.colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  keyboardWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxHeight: Dimensions.get('window').height * 0.78,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  title: {
    ...theme.typography.sectionHeading,
    color: theme.colors.textPrimary,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 9999, // Fully rounded
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formScroll: {
    maxHeight: 380,
  },
  formContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    ...theme.typography.label,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '400',
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9999, // Fully rounded
    alignItems: 'center',
    justifyContent: 'center',
  },
  categorySelectedText: {
    ...theme.typography.body,
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    backgroundColor: theme.colors.background,
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryGridItem: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryGridItemSelected: {
    borderColor: theme.colors.textPrimary,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  gridIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  gridItemLabel: {
    ...theme.typography.caption,
    fontSize: 10,
    color: theme.colors.textPrimary,
  },
  gridItemLabelSelected: {
    fontWeight: '600',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  currencySymbol: {
    ...theme.typography.amountSmall,
    fontSize: 20,
    color: theme.colors.textPrimary,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    ...theme.typography.amountSmall,
    fontSize: 20,
    color: theme.colors.textPrimary,
    paddingVertical: 4,
  },
  quickPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  quickPill: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999, // Fully rounded
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  quickPillText: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  errorContainer: {
    backgroundColor: theme.colors.negativeLight,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.negative,
    marginTop: 4,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.negative,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
  },
  saveButton: {
    backgroundColor: theme.colors.textPrimary,
    height: 44,
    borderRadius: 9999, // Fully rounded button
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
