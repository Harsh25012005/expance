import React, { useState, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import {
  PiggyBank,
  Plus,
  Trash2,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Plane,
  Shield,
  Laptop,
  Car,
  Home,
  CheckCircle2,
  Coins,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useExpenses } from '../context/ExpenseContext';
import { formatCurrency } from '../utils/formatters';
import { SavingsJar } from '../types/expense';

const JAR_ICONS = [
  { id: 'shield', label: 'Safety', Icon: Shield },
  { id: 'plane', label: 'Trip', Icon: Plane },
  { id: 'laptop', label: 'Tech', Icon: Laptop },
  { id: 'car', label: 'Vehicle', Icon: Car },
  { id: 'home', label: 'House', Icon: Home },
  { id: 'piggy', label: 'Savings', Icon: PiggyBank },
];

const JAR_COLORS = ['#4F46E5', '#059669', '#D97706', '#E11D48', '#7C3AED', '#0284C7'];

export const SavingsJarsSection: React.FC = memo(() => {
  const { savingsJars, addSavingsJar, depositToJar, withdrawFromJar, deleteSavingsJar, settings, theme } =
    useExpenses();

  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [selectedJarForAction, setSelectedJarForAction] = useState<SavingsJar | null>(null);
  const [actionType, setActionType] = useState<'deposit' | 'withdraw'>('deposit');
  const [actionAmount, setActionAmount] = useState<string>('');

  // Add Jar Form States
  const [title, setTitle] = useState<string>('');
  const [targetAmount, setTargetAmount] = useState<string>('');
  const [initialAmount, setInitialAmount] = useState<string>('');
  const [selectedIcon, setSelectedIcon] = useState<string>('piggy');
  const [selectedColor, setSelectedColor] = useState<string>(JAR_COLORS[0]);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
  };

  const handleOpenCreateModal = () => {
    triggerHaptic();
    setTitle('');
    setTargetAmount('');
    setInitialAmount('');
    setSelectedIcon('piggy');
    setSelectedColor(JAR_COLORS[0]);
    setIsAddModalOpen(true);
  };

  const handleCreateJar = async () => {
    const numTarget = parseFloat(targetAmount);
    const numInitial = parseFloat(initialAmount) || 0;

    if (!title.trim() || isNaN(numTarget) || numTarget <= 0) {
      return;
    }

    triggerHaptic();
    await addSavingsJar({
      title: title.trim(),
      targetAmount: numTarget,
      initialAmount: numInitial,
      categoryIcon: selectedIcon,
      color: selectedColor,
    });
    setIsAddModalOpen(false);
  };

  const handleConfirmAction = async () => {
    if (!selectedJarForAction) return;
    const num = parseFloat(actionAmount);
    if (isNaN(num) || num <= 0) return;

    triggerHaptic();
    if (actionType === 'deposit') {
      await depositToJar(selectedJarForAction.id, num);
    } else {
      await withdrawFromJar(selectedJarForAction.id, num);
    }

    if (settings.hapticsEnabled) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch {}
    }

    setSelectedJarForAction(null);
    setActionAmount('');
  };

  const renderJarIcon = (iconId: string, color: string, size: number = 18) => {
    const item = JAR_ICONS.find((i) => i.id === iconId) || JAR_ICONS[5];
    const IconComponent = item.Icon;
    return <IconComponent size={size} color={color} strokeWidth={2} />;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.badgeIcon, { backgroundColor: theme.colors.primaryLight }]}>
            <PiggyBank size={16} color={theme.colors.primary} strokeWidth={2} />
          </View>
          <View>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Savings Goal Jars</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {savingsJars.length} Active Goals & Sinking Funds
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: theme.colors.primaryLight }]}
          onPress={handleOpenCreateModal}
          activeOpacity={0.7}
        >
          <Plus size={14} color={theme.colors.primary} strokeWidth={2.5} />
          <Text style={[styles.createBtnText, { color: theme.colors.primary }]}>New Goal</Text>
        </TouchableOpacity>
      </View>

      {/* Jars Grid / Horizontal Scroll */}
      {savingsJars.length === 0 ? (
        <TouchableOpacity
          style={[styles.emptyJarCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.borderSubtle }]}
          onPress={handleOpenCreateModal}
          activeOpacity={0.7}
        >
          <PiggyBank size={32} color={theme.colors.textTertiary} strokeWidth={1.5} />
          <Text style={[styles.emptyJarTitle, { color: theme.colors.textPrimary }]}>No savings goals yet</Text>
          <Text style={[styles.emptyJarSubtitle, { color: theme.colors.textSecondary }]}>
            Create your first goal (e.g. Emergency Fund or Vacation)
          </Text>
        </TouchableOpacity>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.jarsScroll}>
          {savingsJars.map((jar) => {
            const pct = Math.min(100, Math.round((jar.currentAmount / jar.targetAmount) * 100));
            const isCompleted = jar.currentAmount >= jar.targetAmount;

            return (
              <View
                key={jar.id}
                style={[
                  styles.jarCard,
                  { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                ]}
              >
                {/* Top Row */}
                <View style={styles.jarTopRow}>
                  <View style={[styles.jarIconWrapper, { backgroundColor: jar.color + '20' }]}>
                    {renderJarIcon(jar.categoryIcon, jar.color)}
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      triggerHaptic();
                      deleteSavingsJar(jar.id);
                    }}
                    style={styles.deleteJarBtn}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={13} color={theme.colors.textTertiary} strokeWidth={1.5} />
                  </TouchableOpacity>
                </View>

                {/* Jar Title */}
                <Text style={[styles.jarTitleText, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                  {jar.title}
                </Text>

                {/* Amount Progress */}
                <Text style={[styles.jarAmountText, { color: theme.colors.textPrimary }]}>
                  {formatCurrency(jar.currentAmount, settings.currency)}
                </Text>
                <Text style={[styles.jarTargetText, { color: theme.colors.textSecondary }]}>
                  of {formatCurrency(jar.targetAmount, settings.currency)} ({pct}%)
                </Text>

                {/* Visual Liquid Bar */}
                <View style={[styles.jarProgressTrack, { backgroundColor: theme.isDark ? '#2D2D3E' : '#E5E5E2' }]}>
                  <View
                    style={[
                      styles.jarProgressFill,
                      {
                        width: `${pct}%`,
                        backgroundColor: jar.color,
                      },
                    ]}
                  />
                </View>

                {/* Action Buttons */}
                <View style={styles.jarActionButtonsRow}>
                  <TouchableOpacity
                    style={[styles.jarActionBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                    onPress={() => {
                      triggerHaptic();
                      setSelectedJarForAction(jar);
                      setActionType('deposit');
                    }}
                    activeOpacity={0.7}
                  >
                    <ArrowDownLeft size={13} color={theme.colors.positive} strokeWidth={2} />
                    <Text style={[styles.jarActionText, { color: theme.colors.textPrimary }]}>Add</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.jarActionBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                    onPress={() => {
                      triggerHaptic();
                      setSelectedJarForAction(jar);
                      setActionType('withdraw');
                    }}
                    activeOpacity={0.7}
                  >
                    <ArrowUpRight size={13} color={theme.colors.negative} strokeWidth={2} />
                    <Text style={[styles.jarActionText, { color: theme.colors.textPrimary }]}>Use</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ─── CREATE GOAL MODAL ─── */}
      <Modal visible={isAddModalOpen} transparent animationType="fade" onRequestClose={() => setIsAddModalOpen(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>Create Savings Goal</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)} style={styles.closeBtn}>
                <X size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>GOAL NAME</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.colors.background, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Japan Trip, Emergency Fund"
                placeholderTextColor={theme.colors.textTertiary}
              />

              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>TARGET AMOUNT ({settings.currency})</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.colors.background, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                value={targetAmount}
                onChangeText={setTargetAmount}
                placeholder="e.g. 1000"
                keyboardType="numeric"
                placeholderTextColor={theme.colors.textTertiary}
              />

              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>STARTING AMOUNT (OPTIONAL)</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.colors.background, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                value={initialAmount}
                onChangeText={setInitialAmount}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor={theme.colors.textTertiary}
              />

              {/* Icon Selector */}
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>ICON</Text>
              <View style={styles.iconsRow}>
                {JAR_ICONS.map((i) => {
                  const Icon = i.Icon;
                  const isSelected = selectedIcon === i.id;
                  return (
                    <TouchableOpacity
                      key={i.id}
                      style={[
                        styles.iconOption,
                        { backgroundColor: theme.colors.background, borderColor: isSelected ? selectedColor : theme.colors.border },
                      ]}
                      onPress={() => setSelectedIcon(i.id)}
                    >
                      <Icon size={18} color={isSelected ? selectedColor : theme.colors.textSecondary} />
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Color Selector */}
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>THEME COLOR</Text>
              <View style={styles.colorsRow}>
                {JAR_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorDot, { backgroundColor: c }, selectedColor === c && styles.colorDotSelected]}
                    onPress={() => setSelectedColor(c)}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleCreateJar}
                activeOpacity={0.85}
              >
                <Sparkles size={16} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Create Goal Jar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── DEPOSIT / WITHDRAW MODAL ─── */}
      <Modal
        visible={!!selectedJarForAction}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedJarForAction(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                {actionType === 'deposit' ? 'Add to Goal' : 'Use from Goal'}
              </Text>
              <TouchableOpacity onPress={() => setSelectedJarForAction(null)} style={styles.closeBtn}>
                <X size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.actionPrompt, { color: theme.colors.textSecondary }]}>
              {selectedJarForAction?.title} (Current: {formatCurrency(selectedJarForAction?.currentAmount || 0, settings.currency)})
            </Text>

            <TextInput
              style={[styles.textInput, { backgroundColor: theme.colors.background, color: theme.colors.textPrimary, borderColor: theme.colors.border, fontSize: 18, fontWeight: '700' }]}
              value={actionAmount}
              onChangeText={setActionAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              autoFocus
              placeholderTextColor={theme.colors.textTertiary}
            />

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: actionType === 'deposit' ? theme.colors.positive : theme.colors.primary }]}
              onPress={handleConfirmAction}
              activeOpacity={0.85}
            >
              <Text style={styles.submitBtnText}>
                {actionType === 'deposit' ? 'Deposit Funds' : 'Withdraw Funds'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
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
  badgeIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  createBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyJarCard: {
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyJarTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  emptyJarSubtitle: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  jarsScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  jarCard: {
    width: 175,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  jarTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  jarIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteJarBtn: {
    padding: 4,
  },
  jarTitleText: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  jarAmountText: {
    fontSize: 16,
    fontWeight: '800',
  },
  jarTargetText: {
    fontSize: 10,
    marginTop: 1,
    marginBottom: 10,
  },
  jarProgressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  jarProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  jarActionButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  jarActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  jarActionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    maxHeight: 520,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    maxHeight: 400,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 8,
  },
  textInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  iconsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  iconOption: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  colorDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  colorDotSelected: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 9999,
    marginTop: 14,
    marginBottom: 6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  actionPrompt: {
    fontSize: 13,
    marginBottom: 12,
  },
});
