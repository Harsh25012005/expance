import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Linking,
  AppState,
  AppStateStatus,
} from 'react-native';
import {
  ArrowRight,
  Check,
  Receipt,
  Bell,
  Activity,
  Zap,
  Info,
  AlertCircle,
  Smartphone,
  Sparkles,
} from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExpenses } from '../context/ExpenseContext';
import { SUPPORTED_CURRENCIES } from '../constants/categories';
import { ShakeSensitivity } from '../types/expense';
import { theme } from '../constants/theme';
import { AppLogo } from '../components/AppLogo';

type PermissionStatusType = 'granted' | 'denied' | 'undetermined' | 'checking';

export const OnboardingScreen: React.FC = () => {
  const { completeOnboarding } = useExpenses();
  const insets = useSafeAreaInsets();

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [userName, setUserName] = useState<string>('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>('INR');
  const [selectedSensitivity, setSelectedSensitivity] = useState<ShakeSensitivity>('medium');

  // Permissions state
  const [notifStatus, setNotifStatus] = useState<PermissionStatusType>('checking');
  const [motionStatus, setMotionStatus] = useState<PermissionStatusType>('checking');
  const [bgStatus, setBgStatus] = useState<'enabled' | 'restricted' | 'available'>('available');

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Phone shake subtle animation for sensitivity screen
  const phoneShakeAnim = useRef(new Animated.Value(0)).current;
  // Sensitivity preview progress track animation (Low = 50%, Medium = 100%)
  const previewProgressAnim = useRef(new Animated.Value(100)).current;

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
  };

  // Continuous subtle loop animation while on Step 4 with dynamic amplitude based on sensitivity
  useEffect(() => {
    if (currentStep === 4) {
      const amp = selectedSensitivity === 'low' ? 3 : selectedSensitivity === 'medium' ? 5 : 8;
      const dur = selectedSensitivity === 'low' ? 190 : selectedSensitivity === 'medium' ? 160 : 130;
      phoneShakeAnim.setValue(0);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(phoneShakeAnim, { toValue: -amp, duration: dur, useNativeDriver: true }),
          Animated.timing(phoneShakeAnim, { toValue: amp, duration: dur + 30, useNativeDriver: true }),
          Animated.timing(phoneShakeAnim, { toValue: -Math.round(amp * 0.6), duration: dur, useNativeDriver: true }),
          Animated.timing(phoneShakeAnim, { toValue: Math.round(amp * 0.6), duration: dur + 20, useNativeDriver: true }),
          Animated.timing(phoneShakeAnim, { toValue: 0, duration: dur - 20, useNativeDriver: true }),
          Animated.delay(450),
        ])
      );
      loop.start();
      return () => {
        loop.stop();
      };
    }
  }, [currentStep, selectedSensitivity, phoneShakeAnim]);

  const handleSensitivitySelect = (sens: ShakeSensitivity) => {
    triggerHaptic();
    setSelectedSensitivity(sens);
  };

  // Check actual native permission statuses
  const checkAllPermissions = useCallback(async () => {
    try {
      const notifPerm = await Notifications.getPermissionsAsync();
      if (notifPerm.granted || notifPerm.status === 'granted') {
        setNotifStatus('granted');
      } else if (notifPerm.status === 'denied') {
        setNotifStatus('denied');
      } else {
        setNotifStatus('undetermined');
      }
    } catch {
      setNotifStatus('undetermined');
    }

    try {
      const isAvailable = await Accelerometer.isAvailableAsync();
      if (isAvailable) {
        setMotionStatus('granted');
      } else {
        setMotionStatus('denied');
      }
    } catch {
      setMotionStatus('granted');
    }

    if (Platform.OS === 'android') {
      setBgStatus('enabled');
    } else {
      setBgStatus('restricted');
    }
  }, []);

  useEffect(() => {
    checkAllPermissions();

    const appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        checkAllPermissions();
      }
    });

    return () => {
      appStateSub.remove();
    };
  }, [checkAllPermissions]);

  const handleRequestNotification = async () => {
    triggerHaptic();
    try {
      const { granted, status } = await Notifications.requestPermissionsAsync();
      if (granted || status === 'granted') {
        setNotifStatus('granted');
      } else {
        setNotifStatus('denied');
      }
    } catch (err) {
      console.warn('Error requesting notification permission:', err);
      setNotifStatus('denied');
    }
  };

  const handleRequestMotion = async () => {
    triggerHaptic();
    try {
      const isAvailable = await Accelerometer.isAvailableAsync();
      if (isAvailable) {
        setMotionStatus('granted');
      } else {
        setMotionStatus('denied');
      }
    } catch {
      setMotionStatus('granted');
    }
  };

  const transitionToStep = (nextStep: number) => {
    // Validate Step 1 (Name field is strictly mandatory)
    if (currentStep === 1 && nextStep === 2) {
      const trimmed = userName.trim();
      if (!trimmed) {
        setNameError('Please enter your name.');
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        } catch {}
        return;
      }
    }

    triggerHaptic();
    if (nextStep === 3) {
      checkAllPermissions();
    }

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
      userName: userName.trim(),
      currency: curr.symbol,
      currencyCode: curr.code,
      shakeSensitivity: selectedSensitivity,
      trackingStyle: 'Personal',
    });
  };

  const progressWidth = previewProgressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.safeContainer, { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 16) }]}>
        {/* Top Progress Indicator: 5 steps */}
        <View style={styles.topBar}>
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
          {/* ──────────────── SCREEN 1: WELCOME (Step 0) ──────────────── */}
          {currentStep === 0 && (
            <View style={styles.stepContainer}>
              <View style={styles.welcomeTopSection}>
                <View style={styles.welcomeLogoWrap}>
                  <AppLogo size={64} />
                </View>

                <View style={styles.editorialHeader}>
                  <Text style={styles.displayHeadline}>
                    Your money,{"\n"}made simple.
                  </Text>
                  <Text style={styles.displaySubtitle}>
                    Track everyday spending without slowing down your day.
                  </Text>
                </View>
              </View>

              <View style={styles.visualContainer}>
                <View style={styles.geometricFrame}>
                  <View style={styles.mockCardBack} />
                  <View style={styles.mockCardFront}>
                    <View style={styles.mockCardTop}>
                      <View style={styles.mockTag}>
                        <Receipt size={16} color={theme.colors.primary} strokeWidth={1.75} />
                        <Text style={styles.mockTagText}>Coffee & Bakery</Text>
                      </View>
                      <Text style={styles.mockAmount}>$4.50</Text>
                    </View>
                    <View style={styles.mockDivider} />
                    <View style={styles.mockBottom}>
                      <Text style={styles.mockMeta}>Today, 10:45 AM</Text>
                      <View style={styles.mockCheck}>
                        <Check size={12} color="#FFFFFF" strokeWidth={2.5} />
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

          {/* ──────────────── SCREEN 2: NAME (Step 1) ──────────────── */}
          {currentStep === 1 && (
            <View style={styles.stepContainer}>
              <View style={styles.upperContent}>
                <View style={styles.editorialHeader}>
                  <Text style={styles.pageHeading}>What should we call you?</Text>
                  <Text style={styles.pageSubtitle}>
                    We'll personalize your daily greetings and monthly reviews.
                  </Text>
                </View>

                <View style={styles.inputArea}>
                  <Text style={styles.inputLabel}>YOUR NAME *</Text>
                  <TextInput
                    style={[
                      styles.minimalTextInput,
                      !!nameError && styles.inputErrorBorder,
                    ]}
                    placeholder="Enter your name"
                    placeholderTextColor={theme.colors.textTertiary}
                    value={userName}
                    onChangeText={(val) => {
                      setUserName(val);
                      if (nameError && val.trim().length > 0) {
                        setNameError(null);
                      }
                    }}
                    autoFocus
                    returnKeyType="next"
                    onSubmitEditing={() => transitionToStep(2)}
                  />
                  {nameError && (
                    <View style={styles.errorRow}>
                      <AlertCircle size={13} color={theme.colors.negative} strokeWidth={1.75} />
                      <Text style={styles.errorText}>{nameError}</Text>
                    </View>
                  )}
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

          {/* ──────────────── SCREEN 3: CURRENCY (Step 2) ──────────────── */}
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
                        <View style={[styles.currSymbolBadge, isSelected && styles.currSymbolBadgeSelected]}>
                          <Text style={[styles.currSymbolText, isSelected && styles.currSymbolTextSelected]}>
                            {curr.symbol}
                          </Text>
                        </View>
                        <View style={styles.currTextCol}>
                          <Text style={[styles.currNameText, isSelected && styles.currNameTextSelected]}>
                            {curr.name}
                          </Text>
                          <Text style={styles.currCodeText}>{curr.code}</Text>
                        </View>
                      </View>

                      <View style={[styles.currCheckCircle, isSelected && styles.currCheckCircleSelected]}>
                        {isSelected && (
                          <Check size={12} color={theme.colors.primary} strokeWidth={2.5} />
                        )}
                      </View>
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

          {/* ──────────────── SCREEN 4: PERMISSIONS (Step 3) ──────────────── */}
          {currentStep === 3 && (
            <View style={styles.stepContainer}>
              <View style={styles.upperContent}>
                <View style={styles.editorialHeader}>
                  <Text style={styles.pageHeading}>
                    Make Expenza work instantly
                  </Text>
                  <Text style={styles.pageSubtitle}>
                    Grant permissions to enable instant shake detection and quick expense tracking.
                  </Text>
                </View>

                {/* Clean Permission List Card */}
                <View style={styles.permissionCard}>
                  {/* Row 1: Notifications */}
                  <View style={styles.permissionRow}>
                    <View style={styles.permissionIconCircle}>
                      <Bell size={18} color={theme.colors.textPrimary} strokeWidth={1.5} />
                    </View>
                    <View style={styles.permissionTextCol}>
                      <Text style={styles.permissionTitle}>Notifications</Text>
                      <Text style={styles.permissionDesc}>
                        Prompt you when a physical shake is detected
                      </Text>
                    </View>
                    <View style={styles.permissionActionCol}>
                      {notifStatus === 'granted' ? (
                        <View style={styles.allowedBadge}>
                          <Check size={12} color={theme.colors.positive} strokeWidth={2.5} />
                          <Text style={styles.allowedBadgeText}>Allowed</Text>
                        </View>
                      ) : notifStatus === 'denied' ? (
                        <TouchableOpacity
                          style={styles.settingsButton}
                          onPress={() => Linking.openSettings()}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.settingsButtonText}>Settings</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.allowButton}
                          onPress={handleRequestNotification}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.allowButtonText}>Allow</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <View style={styles.permissionDivider} />

                  {/* Row 2: Motion / Sensors */}
                  <View style={styles.permissionRow}>
                    <View style={styles.permissionIconCircle}>
                      <Activity size={18} color={theme.colors.textPrimary} strokeWidth={1.5} />
                    </View>
                    <View style={styles.permissionTextCol}>
                      <Text style={styles.permissionTitle}>Motion & Sensors</Text>
                      <Text style={styles.permissionDesc}>
                        Detect physical shake gestures accurately
                      </Text>
                    </View>
                    <View style={styles.permissionActionCol}>
                      {motionStatus === 'granted' ? (
                        <View style={styles.allowedBadge}>
                          <Check size={12} color={theme.colors.positive} strokeWidth={2.5} />
                          <Text style={styles.allowedBadgeText}>Allowed</Text>
                        </View>
                      ) : motionStatus === 'denied' ? (
                        <TouchableOpacity
                          style={styles.settingsButton}
                          onPress={() => Linking.openSettings()}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.settingsButtonText}>Settings</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.allowButton}
                          onPress={handleRequestMotion}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.allowButtonText}>Allow</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <View style={styles.permissionDivider} />

                  {/* Row 3: Background Activity */}
                  <View style={styles.permissionRow}>
                    <View style={styles.permissionIconCircle}>
                      <Zap size={18} color={theme.colors.textPrimary} strokeWidth={1.5} />
                    </View>
                    <View style={styles.permissionTextCol}>
                      <Text style={styles.permissionTitle}>Background Service</Text>
                      <Text style={styles.permissionDesc}>
                        Allow shake trigger when screen is off or app is closed
                      </Text>
                    </View>
                    <View style={styles.permissionActionCol}>
                      {Platform.OS === 'android' ? (
                        <View style={styles.allowedBadge}>
                          <Check size={12} color={theme.colors.positive} strokeWidth={2.5} />
                          <Text style={styles.allowedBadgeText}>Enabled</Text>
                        </View>
                      ) : (
                        <View style={styles.infoBadge}>
                          <Text style={styles.infoBadgeText}>Active in app</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.bottomCtaContainer}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => transitionToStep(4)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryButtonText}>Continue</Text>
                  <ArrowRight size={16} color="#FFFFFF" strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ──────────────── SCREEN 5: SENSITIVITY REDESIGN (Step 4) ──────────────── */}
          {currentStep === 4 && (
            <View style={styles.stepContainer}>
              <ScrollView
                style={styles.sensitivityScroll}
                contentContainerStyle={styles.sensitivityScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Header Section */}
                <View style={styles.sensitivityTopHeader}>
                  <View style={styles.sensitivityTitleRow}>
                    <Text style={styles.pageHeading}>Shake Sensitivity</Text>
                  </View>
                  <Text style={styles.pageSubtitle}>
                    Choose how easily Expenza should detect a shake.
                  </Text>
                </View>

                {/* 3 Clean Selectable Cards (Low, Medium, High) */}
                <View style={styles.sensitivityCardsList}>
                  {/* 1. Low */}
                  <TouchableOpacity
                    style={[
                      styles.sensitivityOptionCard,
                      selectedSensitivity === 'low' && styles.sensitivityOptionCardActive,
                    ]}
                    onPress={() => handleSensitivitySelect('low')}
                    activeOpacity={0.75}
                  >
                    <View style={styles.optionCardHeader}>
                      <View style={styles.optionTitleCol}>
                        <Text style={styles.optionMainTitle}>Low</Text>
                        <Text style={styles.optionSubtitle}>Gentle shakes</Text>
                      </View>
                      <View
                        style={[
                          styles.selectionIndicator,
                          selectedSensitivity === 'low' && styles.selectionIndicatorActive,
                        ]}
                      >
                        {selectedSensitivity === 'low' && (
                          <Check size={12} color={theme.colors.primary} strokeWidth={2.5} />
                        )}
                      </View>
                    </View>
                    <Text style={styles.optionDescription}>
                      Less sensitive to accidental movement.
                    </Text>
                  </TouchableOpacity>

                  {/* 2. Medium (Recommended) */}
                  <TouchableOpacity
                    style={[
                      styles.sensitivityOptionCard,
                      selectedSensitivity === 'medium' && styles.sensitivityOptionCardActive,
                    ]}
                    onPress={() => handleSensitivitySelect('medium')}
                    activeOpacity={0.75}
                  >
                    <View style={styles.optionCardHeader}>
                      <View style={styles.optionTitleCol}>
                        <View style={styles.titleWithBadgeRow}>
                          <Text style={styles.optionMainTitle}>Medium</Text>
                          <View style={styles.recommendedBadge}>
                            <Sparkles size={11} color={theme.colors.primary} strokeWidth={2} />
                            <Text style={styles.recommendedBadgeText}>Recommended</Text>
                          </View>
                        </View>
                        <Text style={styles.optionSubtitle}>Balanced</Text>
                      </View>
                      <View
                        style={[
                          styles.selectionIndicator,
                          selectedSensitivity === 'medium' && styles.selectionIndicatorActive,
                        ]}
                      >
                        {selectedSensitivity === 'medium' && (
                          <Check size={12} color={theme.colors.primary} strokeWidth={2.5} />
                        )}
                      </View>
                    </View>
                    <Text style={styles.optionDescription}>
                      Recommended for most users.
                    </Text>
                  </TouchableOpacity>

                  {/* 3. High */}
                  <TouchableOpacity
                    style={[
                      styles.sensitivityOptionCard,
                      selectedSensitivity === 'high' && styles.sensitivityOptionCardActive,
                    ]}
                    onPress={() => handleSensitivitySelect('high')}
                    activeOpacity={0.75}
                  >
                    <View style={styles.optionCardHeader}>
                      <View style={styles.optionTitleCol}>
                        <Text style={styles.optionMainTitle}>High</Text>
                        <Text style={styles.optionSubtitle}>Quick response</Text>
                      </View>
                      <View
                        style={[
                          styles.selectionIndicator,
                          selectedSensitivity === 'high' && styles.selectionIndicatorActive,
                        ]}
                      >
                        {selectedSensitivity === 'high' && (
                          <Check size={12} color={theme.colors.primary} strokeWidth={2.5} />
                        )}
                      </View>
                    </View>
                    <Text style={styles.optionDescription}>
                      Detects lighter shakes and responds faster.
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Minimal Sensitivity Line Track (No large card) */}
                <View style={styles.minimalLineSection}>
                  <View style={styles.minimalLineLabelsRow}>
                    <Text
                      style={[
                        styles.minimalLineLabel,
                        selectedSensitivity === 'low' && styles.minimalLineLabelActive,
                      ]}
                    >
                      Low
                    </Text>
                    <Text
                      style={[
                        styles.minimalLineLabel,
                        selectedSensitivity === 'medium' && styles.minimalLineLabelActive,
                      ]}
                    >
                      Medium
                    </Text>
                    <Text
                      style={[
                        styles.minimalLineLabel,
                        selectedSensitivity === 'high' && styles.minimalLineLabelActive,
                      ]}
                    >
                      High
                    </Text>
                  </View>

                  <View style={styles.minimalLineTrackWrap}>
                    <View style={styles.minimalLineTrack} />
                    <View style={styles.minimalDotsRow}>
                      <View
                        style={[
                          styles.minimalDot,
                          selectedSensitivity === 'low' && styles.minimalDotActive,
                        ]}
                      />
                      <View
                        style={[
                          styles.minimalDot,
                          selectedSensitivity === 'medium' && styles.minimalDotActive,
                        ]}
                      />
                      <View
                        style={[
                          styles.minimalDot,
                          selectedSensitivity === 'high' && styles.minimalDotActive,
                        ]}
                      />
                    </View>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.bottomCtaContainer}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleFinish}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryButtonText}>Start Tracking</Text>
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
    justifyContent: 'flex-end',
    marginBottom: 20,
    minHeight: 20,
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
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  welcomeTopSection: {
    alignItems: 'flex-start',
  },
  welcomeLogoWrap: {
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  upperContent: {
    paddingTop: 4,
  },
  editorialHeader: {
    marginBottom: 18,
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
    marginBottom: 6,
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
    paddingVertical: 16,
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
  inputErrorBorder: {
    borderColor: theme.colors.negative,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  errorText: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.negative,
    fontWeight: '500',
  },
  /* Currency Selection Styles */
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
    paddingVertical: 12,
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
    gap: 14,
  },
  currSymbolBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currSymbolBadgeSelected: {
    backgroundColor: '#FFFFFF',
  },
  currSymbolText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  currSymbolTextSelected: {
    color: theme.colors.primary,
  },
  currTextCol: {
    gap: 2,
  },
  currNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  currNameTextSelected: {
    color: theme.colors.textPrimary,
  },
  currCodeText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  currCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currCheckCircleSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#FFFFFF',
  },
  /* Permissions Screen Styles */
  permissionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginTop: 16,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  permissionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionTextCol: {
    flex: 1,
  },
  permissionTitle: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontSize: 14,
    marginBottom: 2,
  },
  permissionDesc: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  permissionActionCol: {
    alignItems: 'flex-end',
  },
  permissionDivider: {
    height: 1,
    backgroundColor: theme.colors.borderSubtle,
    marginVertical: 12,
  },
  allowButton: {
    backgroundColor: theme.colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  allowButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  settingsButton: {
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  settingsButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  allowedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.positiveLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  allowedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.positive,
  },
  infoBadge: {
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  infoBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textTertiary,
  },
  permissionNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  permissionNoteText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  /* Sensitivity Redesign Styles */
  sensitivityScroll: {
    flex: 1,
  },
  sensitivityScrollContent: {
    paddingBottom: 16,
  },
  sensitivityTopHeader: {
    marginBottom: 14,
  },
  sensitivityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  shakeIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 9999,
    backgroundColor: theme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sensitivityCardsList: {
    gap: 10,
    marginBottom: 20,
  },
  sensitivityOptionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sensitivityOptionCardActive: {
    backgroundColor: theme.colors.accentLight,
    borderColor: theme.colors.primary,
  },
  optionCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  optionTitleCol: {
    flex: 1,
    marginRight: 10,
  },
  titleWithBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 1,
  },
  optionMainTitle: {
    ...theme.typography.sectionHeading,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  optionSubtitle: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: 1,
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.2)',
  },
  recommendedBadgeText: {
    ...theme.typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  selectionIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionIndicatorActive: {
    borderColor: theme.colors.primary,
    backgroundColor: '#FFFFFF',
  },
  optionDescription: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  /* Minimal Sensitivity Line Track */
  minimalLineSection: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 4,
  },
  minimalLineLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  minimalLineLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textTertiary,
  },
  minimalLineLabelActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  minimalLineTrackWrap: {
    position: 'relative',
    height: 14,
    justifyContent: 'center',
  },
  minimalLineTrack: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: 2,
    backgroundColor: theme.colors.border,
    borderRadius: 1,
  },
  minimalDotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  minimalDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  minimalDotActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  bottomCtaContainer: {
    paddingTop: 8,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.textPrimary,
    height: 52,
    borderRadius: 9999, // Fully rounded button
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
