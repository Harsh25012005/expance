import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  X,
  Sparkles,
  SmartphoneNfc,
  CheckCircle2,
  FileSpreadsheet,
  Zap,
  Tag,
  CreditCard,
  Banknote,
  QrCode,
  Globe,
} from 'lucide-react-native';
import { useExpense } from '../context/ExpenseContext';
import { useShake } from '../context/ShakeContext';
import { CATEGORIES, QUICK_REMARKS } from '../constants/categories';
import { CategoryIcon } from './CategoryIcon';

export const QuickExpenseModal: React.FC = () => {
  const { isShakeModalOpen, closeShakeModal } = useShake();
  const { addExpense, currency, sheetConfig } = useExpense();

  const [remark, setRemark] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('food');
  const [paymentMethod, setPaymentMethod] = useState<string>('UPI');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reset fields when modal opens
  useEffect(() => {
    if (isShakeModalOpen) {
      setRemark('');
      setAmount('');
      setSelectedCategory('food');
      setPaymentMethod('UPI');
      setToastMessage(null);
    }
  }, [isShakeModalOpen]);

  const handleSave = async () => {
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Missing Amount', 'Please enter a valid expense amount.');
      return;
    }

    if (!remark.trim()) {
      Alert.alert('Missing Remark', 'Please enter what this expense is for (Remark).');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await addExpense({
        remark: remark.trim(),
        amount: parseFloat(amount),
        category: selectedCategory,
        paymentMethod,
      });

      setToastMessage(result.message);

      // Close modal smoothly after brief feedback
      setTimeout(() => {
        setIsSubmitting(false);
        closeShakeModal();
      }, 700);
    } catch (err: any) {
      setIsSubmitting(false);
      Alert.alert('Error', err?.message || 'Could not save expense');
    }
  };

  const handleQuickAmount = (val: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + val).toString());
  };

  const paymentOptions = [
    { id: 'UPI', label: 'UPI / QR', icon: QrCode },
    { id: 'Cash', label: 'Cash', icon: Banknote },
    { id: 'Card', label: 'Card', icon: CreditCard },
    { id: 'Online', label: 'Online', icon: Globe },
  ];

  return (
    <Modal
      visible={isShakeModalOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={closeShakeModal}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoid}
          >
            <View style={styles.modalCard}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                  <View style={styles.shakeBadge}>
                    <SmartphoneNfc size={20} color="#10b981" />
                  </View>
                  <View>
                    <Text style={styles.headerTitle}>Quick Shake Expense</Text>
                    <Text style={styles.headerSubtitle}>
                      {sheetConfig.isConnected ? 'Auto-syncs with Google Sheet' : 'Instant Save & Track'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={closeShakeModal}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* Toast Message if any */}
              {toastMessage && (
                <View style={styles.toastBanner}>
                  <CheckCircle2 size={18} color="#10b981" />
                  <Text style={styles.toastText}>{toastMessage}</Text>
                </View>
              )}

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {/* 1. AMOUNT FIELD */}
                <View style={styles.fieldSection}>
                  <Text style={styles.fieldLabel}>EXPENSE AMOUNT ({currency})</Text>
                  <View style={styles.amountInputContainer}>
                    <Text style={styles.currencySymbol}>{currency}</Text>
                    <TextInput
                      style={styles.amountInput}
                      placeholder="0.00"
                      placeholderTextColor="#475569"
                      keyboardType="numeric"
                      value={amount}
                      onChangeText={setAmount}
                      autoFocus={true}
                      selectionColor="#10b981"
                    />
                  </View>

                  {/* Quick Add Increment Pills */}
                  <View style={styles.quickPillsRow}>
                    {[100, 200, 500, 1000, 2000].map((inc) => (
                      <TouchableOpacity
                        key={inc}
                        style={styles.quickPill}
                        onPress={() => handleQuickAmount(inc)}
                      >
                        <Text style={styles.quickPillText}>+{currency}{inc}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* 2. REMARK FIELD */}
                <View style={styles.fieldSection}>
                  <View style={styles.labelRow}>
                    <Text style={styles.fieldLabel}>REMARK / NOTE</Text>
                    <Text style={styles.requiredBadge}>Required</Text>
                  </View>
                  <View style={styles.remarkInputContainer}>
                    <Tag size={18} color="#64748b" style={styles.inputPrefixIcon} />
                    <TextInput
                      style={styles.remarkInput}
                      placeholder="e.g., Starbucks Coffee, Uber ride, Dinner"
                      placeholderTextColor="#64748b"
                      value={remark}
                      onChangeText={setRemark}
                      selectionColor="#10b981"
                    />
                  </View>

                  {/* Quick Remark Suggestions */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.suggestionChipsContainer}
                  >
                    {QUICK_REMARKS.map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={[
                          styles.suggestionChip,
                          remark === item && styles.suggestionChipSelected,
                        ]}
                        onPress={() => setRemark(item)}
                      >
                        <Text
                          style={[
                            styles.suggestionChipText,
                            remark === item && styles.suggestionChipTextSelected,
                          ]}
                        >
                          {item}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* 3. CATEGORY SELECTOR */}
                <View style={styles.fieldSection}>
                  <Text style={styles.fieldLabel}>CATEGORY</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryScroll}
                  >
                    {CATEGORIES.map((cat) => {
                      const isSelected = selectedCategory === cat.id;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[
                            styles.categoryCard,
                            isSelected && { borderColor: cat.color, backgroundColor: '#1e293b' },
                          ]}
                          onPress={() => setSelectedCategory(cat.id)}
                        >
                          <CategoryIcon categoryId={cat.id} size="md" />
                          <Text
                            style={[
                              styles.categoryCardName,
                              isSelected && { color: '#f8fafc', fontWeight: '700' },
                            ]}
                            numberOfLines={1}
                          >
                            {cat.name.split(' ')[0]}
                          </Text>
                          {isSelected && (
                            <View
                              style={[styles.categoryCheckBadge, { backgroundColor: cat.color }]}
                            >
                              <CheckCircle2 size={12} color="#ffffff" />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* 4. PAYMENT METHOD SELECTOR */}
                <View style={styles.fieldSection}>
                  <Text style={styles.fieldLabel}>PAYMENT METHOD</Text>
                  <View style={styles.paymentMethodRow}>
                    {paymentOptions.map((opt) => {
                      const isSelected = paymentMethod === opt.id;
                      const IconComp = opt.icon;
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={[
                            styles.paymentOption,
                            isSelected && styles.paymentOptionSelected,
                          ]}
                          onPress={() => setPaymentMethod(opt.id)}
                        >
                          <IconComp
                            size={16}
                            color={isSelected ? '#10b981' : '#94a3b8'}
                          />
                          <Text
                            style={[
                              styles.paymentOptionText,
                              isSelected && styles.paymentOptionTextSelected,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>

              {/* SAVE BUTTON */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={isSubmitting}
                  activeOpacity={0.8}
                >
                  {isSubmitting ? (
                    <View style={styles.buttonContent}>
                      <ActivityIndicator size="small" color="#090d16" />
                      <Text style={styles.saveButtonText}>Saving to Google Sheet...</Text>
                    </View>
                  ) : (
                    <View style={styles.buttonContent}>
                      <FileSpreadsheet size={22} color="#090d16" strokeWidth={2.4} />
                      <Text style={styles.saveButtonText}>Save Expense & Sync</Text>
                      <Sparkles size={18} color="#090d16" />
                    </View>
                  )}
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(9, 13, 22, 0.75)',
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    width: '100%',
    maxHeight: '90%',
  },
  modalCard: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#334155',
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 25,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shakeBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 12,
    padding: 10,
    marginHorizontal: 20,
    marginTop: 12,
    gap: 8,
  },
  toastText: {
    color: '#34d399',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 18,
  },
  fieldSection: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.8,
  },
  requiredBadge: {
    fontSize: 10,
    color: '#f59e0b',
    fontWeight: '600',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#10b981',
    paddingHorizontal: 16,
    height: 64,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '700',
    color: '#10b981',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    height: '100%',
  },
  quickPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  quickPill: {
    backgroundColor: '#1e293b',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  quickPillText: {
    fontSize: 12,
    color: '#38bdf8',
    fontWeight: '600',
  },
  remarkInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
    height: 52,
  },
  inputPrefixIcon: {
    marginRight: 10,
  },
  remarkInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '500',
  },
  suggestionChipsContainer: {
    gap: 8,
    paddingTop: 6,
    paddingBottom: 2,
  },
  suggestionChip: {
    backgroundColor: '#1e293b',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  suggestionChipSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10b981',
  },
  suggestionChipText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  suggestionChipTextSelected: {
    color: '#34d399',
    fontWeight: '600',
  },
  categoryScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  categoryCard: {
    width: 80,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 6,
    position: 'relative',
  },
  categoryCardName: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
    textAlign: 'center',
  },
  categoryCheckBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  paymentOptionSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
  },
  paymentOptionText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  paymentOptionTextSelected: {
    color: '#10b981',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  saveButton: {
    backgroundColor: '#10b981',
    borderRadius: 18,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#090d16',
    letterSpacing: -0.2,
  },
});
