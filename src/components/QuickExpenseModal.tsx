import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Calendar,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShake } from '../context/ShakeContext';
import { useExpenses } from '../context/ExpenseContext';
import { CategoryType } from '../types/expense';
import { CATEGORIES, CATEGORY_MAP } from '../constants/categories';

const PREDICTIVE_MERCHANTS: Array<{ name: string; category: CategoryType; defaultAmount?: number }> = [
  { name: 'Starbucks Coffee', category: 'Food', defaultAmount: 5.50 },
  { name: 'Uber Ride', category: 'Transport', defaultAmount: 18.00 },
  { name: 'Amazon Order', category: 'Shopping', defaultAmount: 32.00 },
  { name: 'Supermarket Groceries', category: 'Food', defaultAmount: 45.00 },
  { name: 'Netflix Subscription', category: 'Bills', defaultAmount: 15.99 },
  { name: 'Spotify Music', category: 'Bills', defaultAmount: 10.99 },
  { name: 'Pharmacy Medicine', category: 'Health', defaultAmount: 22.50 },
  { name: 'Flight Tickets', category: 'Travel', defaultAmount: 150.00 },
  { name: 'Gym Membership', category: 'Health', defaultAmount: 40.00 },
  { name: 'Gas / Fuel', category: 'Transport', defaultAmount: 35.00 },
];

export const QuickExpenseModal: React.FC = () => {
  const { isQuickAddModalOpen, closeQuickAddModal, editingExpense } = useShake();
  const { addExpense, updateExpense, settings, theme, expenses } = useExpenses();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<CategoryType>('Food');
  const [dateOption, setDateOption] = useState<'today' | 'yesterday'>('today');
  const [showCategoryPicker, setShowCategoryPicker] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inputRef = useRef<TextInput>(null);

  // Predictive Auto-Complete Matches
  const predictiveMatches = useMemo(() => {
    const query = name.trim().toLowerCase();
    if (!query || query.length < 2) return [];

    // Combine built-in merchants with distinct past user merchants
    const pastMerchants = expenses.map((e) => ({
      name: e.name,
      category: e.category,
      defaultAmount: e.amount,
    }));

    const all = [...PREDICTIVE_MERCHANTS, ...pastMerchants];
    const seen = new Set<string>();
    const matches: typeof PREDICTIVE_MERCHANTS = [];

    for (const item of all) {
      const lower = item.name.toLowerCase();
      if (lower.includes(query) && !seen.has(lower)) {
        seen.add(lower);
        matches.push(item);
        if (matches.length >= 3) break;
      }
    }
    return matches;
  }, [name, expenses]);

  useEffect(() => {
    if (isQuickAddModalOpen) {
      if (editingExpense) {
        setName(editingExpense.name);
        setAmount(editingExpense.amount.toString());
        setCategory(editingExpense.category);
        setDateOption('today');
      } else {
        setName('');
        setAmount('');
        setCategory('Food');
        setDateOption('today');
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

  const handleApplyPredictive = (item: typeof PREDICTIVE_MERCHANTS[0]) => {
    triggerHaptic();
    setName(item.name);
    setCategory(item.category);
    if (item.defaultAmount && !amount) {
      setAmount(item.defaultAmount.toFixed(2));
    }
  };

  const handleQuickAddAmount = (inc: number) => {
    triggerHaptic();
    const current = parseFloat(amount) || 0;
    const nextVal = (current + inc).toFixed(2);
    setAmount(nextVal);
  };

  const renderCategoryIcon = (catId: CategoryType, size = 16, color?: string) => {
    const iconColor = color || theme.colors.textPrimary;
    switch (catId) {
      case 'Food':
        return <Utensils size={size} color={iconColor} strokeWidth={1.5} />;
      case 'Transport':
        return <Car size={size} color={iconColor} strokeWidth={1.5} />;
      case 'Shopping':
        return <ShoppingBag size={size} color={iconColor} strokeWidth={1.5} />;
      case 'Bills':
        return <Zap size={size} color={iconColor} strokeWidth={1.5} />;
      case 'Entertainment':
        return <Film size={size} color={iconColor} strokeWidth={1.5} />;
      case 'Health':
        return <HeartPulse size={size} color={iconColor} strokeWidth={1.5} />;
      case 'Travel':
        return <Plane size={size} color={iconColor} strokeWidth={1.5} />;
      case 'Education':
        return <GraduationCap size={size} color={iconColor} strokeWidth={1.5} />;
      case 'Other':
      default:
        return <MoreHorizontal size={size} color={iconColor} strokeWidth={1.5} />;
    }
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const numAmount = parseFloat(amount);

    if (!trimmedName) {
      setErrorMsg('Please enter an expense name');
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Please enter a valid amount');
      return;
    }

    try {
      setIsSubmitting(true);
      triggerHaptic();

      let expenseDate = new Date().toISOString();
      if (dateOption === 'yesterday') {
        const yDate = new Date();
        yDate.setDate(yDate.getDate() - 1);
        expenseDate = yDate.toISOString();
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
          date: expenseDate,
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
              backgroundColor: theme.colors.overlay,
              paddingTop: insets.top + 16,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardWrap}
          >
            <View style={[styles.popupCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              {/* Header */}
              <View style={[styles.header, { borderBottomColor: theme.colors.borderSubtle }]}>
                <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                  {editingExpense ? 'Edit expense' : 'Add expense'}
                </Text>

                <TouchableOpacity
                  style={[styles.closeBtn, { backgroundColor: theme.colors.backgroundSecondary }]}
                  onPress={closeQuickAddModal}
                  activeOpacity={0.7}
                >
                  <X size={15} color={theme.colors.textSecondary} strokeWidth={1.75} />
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
                  <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>EXPENSE NAME</Text>
                  <TextInput
                    ref={inputRef}
                    style={[styles.textInput, { backgroundColor: theme.colors.background, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                    value={name}
                    onChangeText={(val) => {
                      setName(val);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="What did you spend on?"
                    placeholderTextColor={theme.colors.textTertiary}
                    returnKeyType="next"
                  />

                  {/* Predictive Auto-Complete Matches */}
                  {predictiveMatches.length > 0 && (
                    <View style={styles.predictiveRow}>
                      {predictiveMatches.map((item, pIdx) => (
                        <TouchableOpacity
                          key={pIdx}
                          style={[styles.predictiveChip, { backgroundColor: theme.colors.primaryLight }]}
                          onPress={() => handleApplyPredictive(item)}
                          activeOpacity={0.7}
                        >
                          <Sparkles size={10} color={theme.colors.primary} />
                          <Text style={[styles.predictiveChipText, { color: theme.colors.primary }]}>{item.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* 2. Date Selection (Today vs Yesterday) */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>DATE</Text>
                  <View style={styles.datePillsRow}>
                    <TouchableOpacity
                      style={[
                        styles.datePill,
                        { backgroundColor: theme.colors.background, borderColor: dateOption === 'today' ? theme.colors.primary : theme.colors.border },
                        dateOption === 'today' && { backgroundColor: theme.colors.primaryLight },
                      ]}
                      onPress={() => {
                        triggerHaptic();
                        setDateOption('today');
                      }}
                    >
                      <Calendar size={12} color={dateOption === 'today' ? theme.colors.primary : theme.colors.textSecondary} />
                      <Text style={[styles.datePillText, { color: dateOption === 'today' ? theme.colors.primary : theme.colors.textSecondary, fontWeight: dateOption === 'today' ? '700' : '500' }]}>
                        Today
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.datePill,
                        { backgroundColor: theme.colors.background, borderColor: dateOption === 'yesterday' ? theme.colors.primary : theme.colors.border },
                        dateOption === 'yesterday' && { backgroundColor: theme.colors.primaryLight },
                      ]}
                      onPress={() => {
                        triggerHaptic();
                        setDateOption('yesterday');
                      }}
                    >
                      <Calendar size={12} color={dateOption === 'yesterday' ? theme.colors.primary : theme.colors.textSecondary} />
                      <Text style={[styles.datePillText, { color: dateOption === 'yesterday' ? theme.colors.primary : theme.colors.textSecondary, fontWeight: dateOption === 'yesterday' ? '700' : '500' }]}>
                        Yesterday
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 3. Category Selector */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>CATEGORY</Text>
                  <TouchableOpacity
                    style={[styles.categorySelector, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                    onPress={() => {
                      triggerHaptic();
                      setShowCategoryPicker(!showCategoryPicker);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.categoryLeft}>
                      <View style={[styles.categoryIconCircle, { backgroundColor: currentCatInfo.color + '15' }]}>
                        {renderCategoryIcon(category, 16, currentCatInfo.color)}
                      </View>
                      <Text style={[styles.categoryText, { color: theme.colors.textPrimary }]}>{currentCatInfo.label}</Text>
                    </View>
                    <ChevronRight size={15} color={theme.colors.textTertiary} />
                  </TouchableOpacity>

                  {/* Category Expanded Grid */}
                  {showCategoryPicker && (
                    <View style={[styles.categoryGrid, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                      {CATEGORIES.map((cat) => {
                        const isSelected = category === cat.id;
                        return (
                          <TouchableOpacity
                            key={cat.id}
                            style={[
                              styles.catGridItem,
                              isSelected && { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
                            ]}
                            onPress={() => {
                              triggerHaptic();
                              setCategory(cat.id);
                              setShowCategoryPicker(false);
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={[styles.catIconWrap, { backgroundColor: cat.color + '15' }]}>
                              {renderCategoryIcon(cat.id, 14, cat.color)}
                            </View>
                            <Text
                              style={[
                                styles.catGridText,
                                { color: theme.colors.textSecondary },
                                isSelected && { color: theme.colors.primary, fontWeight: '700' },
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

                {/* 4. Amount */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>AMOUNT</Text>
                  <View style={[styles.amountContainer, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                    <Text style={[styles.currencySymbol, { color: theme.colors.textPrimary }]}>{settings.currency}</Text>
                    <TextInput
                      style={[styles.amountInput, { color: theme.colors.textPrimary }]}
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
                        style={[styles.quickPill, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                        onPress={() => handleQuickAddAmount(inc)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.quickPillText, { color: theme.colors.textPrimary }]}>+{inc}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Error Banner */}
                {errorMsg && (
                  <View style={[styles.errorContainer, { backgroundColor: theme.colors.negativeLight, borderColor: theme.colors.negative }]}>
                    <Text style={[styles.errorText, { color: theme.colors.negative }]}>{errorMsg}</Text>
                  </View>
                )}
              </ScrollView>

              {/* Bottom Full-Width Save Expense Button */}
              <View style={[styles.footer, { borderTopColor: theme.colors.borderSubtle, backgroundColor: theme.colors.surface }]}>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    { backgroundColor: theme.colors.primary },
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
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  keyboardWrap: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  popupCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: Dimensions.get('window').height * 0.85,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formScroll: {
    maxHeight: 440,
  },
  formContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  textInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  predictiveRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  predictiveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  predictiveChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  datePillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  datePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
  },
  datePillText: {
    fontSize: 12,
  },
  categorySelector: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  catGridItem: {
    width: '31.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  catIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catGridText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  amountContainer: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '700',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    paddingVertical: 4,
  },
  quickPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  quickPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1,
  },
  quickPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  errorContainer: {
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  errorText: {
    fontSize: 11,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  saveButton: {
    height: 44,
    borderRadius: 9999,
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
