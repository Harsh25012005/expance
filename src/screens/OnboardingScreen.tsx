import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import {
  ArrowRight,
  Check,
  Smartphone,
  Sparkles,
  Zap,
  Receipt,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useExpenses } from '../context/ExpenseContext';
import { SUPPORTED_CURRENCIES } from '../constants/categories';
import { ShakeSensitivity } from '../types/expense';
import { theme } from '../constants/theme';

export const OnboardingScreen: React.FC = () => {
  const { completeOnboarding } = useExpenses();

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [userName, setUserName] = useState<string>('');
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>('INR');
  const [selectedSensitivity, setSelectedSensitivity] = useState<ShakeSensitivity>('low');

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const phoneShakeAnim = useRef(new Animated.Value(0)).current;

  // Shake animation loop for step 3 (Screen 4)
  useEffect(() => {
    if (currentStep === 3) {
      Animated.loop(
        Animated.sequence([
          Animated.delay(800),
          Animated.timing(phoneShakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
          Animated.timing(phoneShakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
          Animated.timing(phoneShakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
          Animated.timing(phoneShakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
          Animated.timing(phoneShakeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
          Animated.delay(1200),
        ])
      ).start();
    } else {
      phoneShakeAnim.setValue(0);
    }
  }, [currentStep]);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
  };

  const transitionToStep = (nextStep: number) => {
    triggerHaptic();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -16,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStep(nextStep);
      slideAnim.setValue(16);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleFinish = async () => {
    triggerHaptic();
    const curr =
      SUPPORTED_CURRENCIES.find((c) => c.code === selectedCurrencyCode) ||
      SUPPORTED_CURRENCIES[0];

    await completeOnboarding({
      userName: userName.trim() || 'Harsh',
      currency: curr.symbol,
      currencyCode: curr.code,
      shakeSensitivity: selectedSensitivity,
      trackingStyle: 'Personal',
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.safeContainer}>
        {/* Top Header & Progress Indicator */}
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <View style={styles.brandDot} />
            <Text style={styles.brandName}>ExpenseFlow</Text>
          </View>

          {/* Subtle Dots: ● ○ ○ ○ ○ */}
          <View style={styles.progressDots}>
            {[0, 1, 2, 3, 4].map((step) => {
              const isActive = step === currentStep;
              return (
                <View
                  key={step}
                  style={[
                    styles.dot,
                    isActive ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              );
            })}
          </View>
        </View>

        {/* Step Content with Motion */}
        <Animated.View
          style={[
            styles.stepContentWrapper,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* ──────────────── SCREEN 1: WELCOME ──────────────── */}
          {currentStep === 0 && (
            <View style={styles.stepContainer}>
              <View style={styles.editorialHeader}>
                <Text style={styles.displayHeadline}>
                  Your money,{"\n"}made simple.
                </Text>
                <Text style={styles.displaySubtitle}>
                  Track everyday spending without slowing down your day.
                </Text>
              </View>

              {/* Minimal geometric financial visual */}
              <View style={styles.visualContainer}>
                <View style={styles.geometricFrame}>
                  <View style={styles.mockCardBack} />
                  <View style={styles.mockCardFront}>
                    <View style={styles.mockCardTop}>
                      <View style={styles.mockTag}>
                        <Receipt size={13} color={theme.colors.primary} strokeWidth={1.5} />
                        <Text style={styles.mockTagText}>Coffee & Pastry</Text>
                      </View>
                      <Text style={styles.mockAmount}>₹180</Text>
                    </View>
                    <View style={styles.mockDivider} />
                    <View style={styles.mockBottom}>
                      <Text style={styles.mockMeta}>Food · 9:41 AM</Text>
                      <View style={styles.mockCheck}>
                        <Check size={11} color="#FFFFFF" strokeWidth={2} />
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.bottomCtaContainer}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => transitionToStep(1)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryButtonText}>Get Started</Text>
                  <ArrowRight size={16} color="#FFFFFF" strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ──────────────── SCREEN 2: NAME (UPWARD POSITIONED) ──────────────── */}
          {currentStep === 1 && (
            <View style={styles.stepContainer}>
              <View style={styles.upperContent}>
                <View style={styles.editorialHeader}>
                  <Text style={styles.pageHeading}>
                    First, what should we call you?
                  </Text>
                  <Text style={styles.pageSubtitle}>
                    We'll use your name to personalize your dashboard.
                  </Text>
                </View>

                <View style={styles.inputArea}>
                  <Text style={styles.inputLabel}>YOUR NAME</Text>
                  <TextInput
                    style={styles.minimalTextInput}
                    placeholder="Your name"
                    placeholderTextColor={theme.colors.textTertiary}
                    value={userName}
                    onChangeText={setUserName}
                    autoFocus
                    returnKeyType="next"
                    onSubmitEditing={() => transitionToStep(2)}
                  />
                </View>
              </View>

              <View style={styles.bottomCtaContainer}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => transitionToStep(2)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryButtonText}>Continue</Text>
                  <ArrowRight size={16} color="#FFFFFF" strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ──────────────── SCREEN 3: CURRENCY ──────────────── */}
          {currentStep === 2 && (
            <View style={styles.stepContainer}>
              <View style={styles.editorialHeader}>
                <Text style={styles.pageHeading}>Choose your currency</Text>
                <Text style={styles.pageSubtitle}>
                  We'll use this for all your expense amounts.
                </Text>
              </View>

              <ScrollView
                style={styles.currencyListScroll}
                showsVerticalScrollIndicator={false}
              >
                {SUPPORTED_CURRENCIES.map((curr) => {
                  const isSelected = selectedCurrencyCode === curr.code;
                  return (
                    <TouchableOpacity
                      key={curr.code}
                      style={[
                        styles.currencyRow,
                        isSelected && styles.currencyRowSelected,
                      ]}
                      onPress={() => {
                        triggerHaptic();
                        setSelectedCurrencyCode(curr.code);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.currLeft}>
                        <Text style={styles.currSymbolText}>{curr.symbol}</Text>
                        <Text style={styles.currCodeText}>{curr.code}</Text>
                        <Text style={styles.currNameText}>{curr.name}</Text>
                      </View>

                      {isSelected && (
                        <View style={styles.currCheckCircle}>
                          <Check size={12} color={theme.colors.primary} strokeWidth={2.5} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.bottomCtaContainer}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => transitionToStep(3)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryButtonText}>Continue</Text>
                  <ArrowRight size={16} color="#FFFFFF" strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ──────────────── SCREEN 4: SHAKE FEATURE ──────────────── */}
          {currentStep === 3 && (
            <View style={styles.stepContainer}>
              <View style={styles.editorialHeader}>
                <Text style={styles.displayHeadline}>
                  One shake.{"\n"}One expense.
                </Text>
                <Text style={styles.displaySubtitle}>
                  Record an expense instantly without searching through the app.
                </Text>
              </View>

              <View style={styles.visualContainer}>
                <Animated.View
                  style={[
                    styles.phoneMockupFrame,
                    {
                      transform: [{ translateX: phoneShakeAnim }],
                    },
                  ]}
                >
                  <View style={styles.phoneSpeaker} />
                  <View style={styles.phoneInnerScreen}>
                    <View style={styles.mockWaveBadge}>
                      <Zap size={13} color={theme.colors.primary} strokeWidth={1.5} />
                      <Text style={styles.mockWaveText}>Shake detected</Text>
                    </View>
                    <View style={styles.mockSheetPreview}>
                      <Text style={styles.mockSheetTitle}>Add expense</Text>
                      <View style={styles.mockSheetInputPlaceholder} />
                    </View>
                  </View>
                </Animated.View>
              </View>

              <View style={styles.bottomCtaContainer}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => transitionToStep(4)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryButtonText}>Set up shake</Text>
                  <ArrowRight size={16} color="#FFFFFF" strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ──────────────── SCREEN 5: SENSITIVITY (UPWARD POSITIONED) ──────────────── */}
          {currentStep === 4 && (
            <View style={styles.stepContainer}>
              <View style={styles.upperContent}>
                <View style={styles.editorialHeader}>
                  <Text style={styles.pageHeading}>
                    How sensitive should shake detection be?
                  </Text>
                  <Text style={styles.pageSubtitle}>
                    Start with Low to prevent accidental triggers.
                  </Text>
                </View>

                {/* Equal width 3 options with 1px border and no shadow */}
                <View style={styles.sensitivityArea}>
                  <View style={styles.equalSegmentsRow}>
                    {(
                      [
                        { id: 'low', label: 'Low' },
                        { id: 'medium', label: 'Medium' },
                        { id: 'high', label: 'High' },
                      ] as const
                    ).map((item) => {
                      const isSelected = selectedSensitivity === item.id;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[
                            styles.equalSegmentBtn,
                            isSelected && styles.equalSegmentBtnActive,
                          ]}
                          onPress={() => {
                            triggerHaptic();
                            setSelectedSensitivity(item.id);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.equalSegmentText,
                              isSelected && styles.equalSegmentTextActive,
                            ]}
                          >
                            {item.label}
                          </Text>
                          {isSelected && (
                            <Check size={12} color={theme.colors.primary} strokeWidth={2.5} style={styles.checkIconSmall} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Recommendation Card directly below */}
                  <View style={styles.recommendationCard}>
                    <View style={styles.recommendationBadge}>
                      <Text style={styles.recommendationBadgeText}>✓ Recommended</Text>
                    </View>
                    <Text style={styles.recommendationBody}>
                      Low sensitivity helps prevent accidental expense popups during normal movement.
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.bottomCtaContainer}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleFinish}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryButtonText}>Finish Setup</Text>
                  <ArrowRight size={16} color="#FFFFFF" strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  safeContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  brandName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  progressDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: theme.colors.textPrimary,
    width: 14,
  },
  dotInactive: {
    backgroundColor: theme.colors.border,
  },
  stepContentWrapper: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  upperContent: {
    paddingTop: 8,
  },
  editorialHeader: {
    marginBottom: 20,
  },
  displayHeadline: {
    ...theme.typography.display,
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  displaySubtitle: {
    ...theme.typography.bodyLarge,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  pageHeading: {
    ...theme.typography.pageHeading,
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  pageSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  visualContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  geometricFrame: {
    width: '100%',
    maxWidth: 320,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  mockCardBack: {
    position: 'absolute',
    top: 10,
    width: '90%',
    height: 90,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  mockCardFront: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  mockCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mockTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mockTagText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  mockAmount: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  mockDivider: {
    height: 1,
    backgroundColor: theme.colors.borderSubtle,
    marginVertical: 12,
  },
  mockBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mockMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  mockCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.positive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputArea: {
    marginTop: 10,
  },
  inputLabel: {
    ...theme.typography.label,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  minimalTextInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  currencyListScroll: {
    flex: 1,
    marginVertical: 12,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  currencyRowSelected: {
    backgroundColor: theme.colors.accentLight,
    borderColor: theme.colors.primary,
  },
  currLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currSymbolText: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    width: 28,
  },
  currCodeText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  currNameText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  currCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneMockupFrame: {
    width: 200,
    height: 240,
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    alignItems: 'center',
  },
  phoneSpeaker: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    marginBottom: 16,
  },
  phoneInnerScreen: {
    width: '100%',
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    padding: 10,
    justifyContent: 'space-between',
  },
  mockWaveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'center',
  },
  mockWaveText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  mockSheetPreview: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  mockSheetTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  mockSheetInputPlaceholder: {
    height: 18,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 6,
  },
  sensitivityArea: {
    marginTop: 6,
  },
  equalSegmentsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  equalSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: theme.colors.surface,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  equalSegmentBtnActive: {
    backgroundColor: theme.colors.accentLight,
    borderColor: theme.colors.primary,
  },
  equalSegmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  equalSegmentTextActive: {
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  checkIconSmall: {
    marginLeft: 2,
  },
  recommendationCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  recommendationBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  recommendationBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  recommendationBody: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  bottomCtaContainer: {
    paddingTop: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.textPrimary,
    height: 52,
    borderRadius: 14,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
