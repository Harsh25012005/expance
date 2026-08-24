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
} from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { useExpenses } from '../context/ExpenseContext';
import { SUPPORTED_CURRENCIES } from '../constants/categories';
import { ShakeSensitivity } from '../types/expense';
import { theme } from '../constants/theme';
import { AppLogo } from '../components/AppLogo';

type PermissionStatusType = 'granted' | 'denied' | 'undetermined' | 'checking';

export const OnboardingScreen: React.FC = () => {
  const { completeOnboarding } = useExpenses();

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [userName, setUserName] = useState<string>('');
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>('INR');
  const [selectedSensitivity, setSelectedSensitivity] = useState<ShakeSensitivity>('low');

  // Permissions state
  const [notifStatus, setNotifStatus] = useState<PermissionStatusType>('checking');
  const [motionStatus, setMotionStatus] = useState<PermissionStatusType>('checking');
  const [bgStatus, setBgStatus] = useState<'enabled' | 'restricted' | 'available'>('available');

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
  };

  // Check actual native permission statuses
  const checkAllPermissions = useCallback(async () => {
    try {
      // 1. Notification Permission Check
      const notifPerm = await Notifications.getPermissionsAsync();
      if (notifPerm.granted || notifPerm.status === 'granted') {
        setNotifStatus('granted');
      } else if (notifPerm.status === 'denied' && !notifPerm.canAskAgain) {
        setNotifStatus('denied');
      } else {
        setNotifStatus('undetermined');
      }
    } catch {
      setNotifStatus('undetermined');
    }

    try {
      // 2. Motion / Sensor Check
      const isAvailable = await Accelerometer.isAvailableAsync();
      if (isAvailable) {
        setMotionStatus('granted');
      } else {
        setMotionStatus('denied');
      }
    } catch {
      setMotionStatus('granted');
    }

    // 3. Background Activity Check
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
      const { granted, status, canAskAgain } = await Notifications.requestPermissionsAsync();
      if (granted || status === 'granted') {
        setNotifStatus('granted');
      } else if (status === 'denied' && !canAskAgain) {
        setNotifStatus('denied');
        Linking.openSettings().catch(() => {});
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

          {/* ──────────────── SCREEN 2: NAME (Step 1) ──────────────── */}
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

          {/* ──────────────── SCREEN 4: PERMISSIONS (Step 3 - NEW) ──────────────── */}
          {currentStep === 3 && (
            <View style={styles.stepContainer}>
              <View style={styles.upperContent}>
                <View style={styles.editorialHeader}>
                  <Text style={styles.pageHeading}>
                    Make Expenza work instantly
                  </Text>
                  <Text style={styles.pageSubtitle}>
                    Allow the permissions Expenza needs to quickly capture expenses when you shake your phone.
                  </Text>
                </View>

                {/* Clean Permission Rows Card */}
                <View style={styles.permissionsCard}>
                  {/* Row 1: Notifications */}
                  <View style={styles.permissionRow}>
                    <View style={styles.permissionIconCircle}>
                      <Bell size={18} color={theme.colors.textPrimary} strokeWidth={1.5} />
                    </View>
                    <View style={styles.permissionTextCol}>
                      <Text style={styles.permissionTitle}>Notifications</Text>
                      <Text style={styles.permissionDesc}>
                        Stay informed when an action needs your attention
                      </Text>
                    </View>
                    <View style={styles.permissionActionCol}>
                      {notifStatus === 'granted' ? (
                        <View style={styles.allowedBadge}>
                          <Check size={12} color={theme.colors.positive} strokeWidth={2.5} />
                          <Text style={styles.allowedBadgeText}>Allowed ✓</Text>
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
                        Detect when you shake your phone
                      </Text>
                    </View>
                    <View style={styles.permissionActionCol}>
                      {motionStatus === 'granted' ? (
                        <View style={styles.allowedBadge}>
                          <Check size={12} color={theme.colors.positive} strokeWidth={2.5} />
                          <Text style={styles.allowedBadgeText}>Allowed ✓</Text>
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
                      <Text style={styles.permissionTitle}>Background Activity</Text>
                      <Text style={styles.permissionDesc}>
                        {Platform.OS === 'android'
                          ? 'Keep shake detection available when supported by your device'
                          : 'iOS restricts background sensors; instant shake works whenever app is active'}
                      </Text>
                    </View>
                    <View style={styles.permissionActionCol}>
                      {Platform.OS === 'android' ? (
                        <View style={styles.allowedBadge}>
                          <Check size={12} color={theme.colors.positive} strokeWidth={2.5} />
                          <Text style={styles.allowedBadgeText}>Enabled ✓</Text>
                        </View>
                      ) : (
                        <View style={styles.infoBadge}>
                          <Text style={styles.infoBadgeText}>Active in app</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Informative Note */}
                <View style={styles.permissionNoteBox}>
                  <Info size={14} color={theme.colors.textSecondary} strokeWidth={1.5} />
                  <Text style={styles.permissionNoteText}>
                    {motionStatus !== 'granted'
                      ? 'Shake detection needs motion access to work.'
                      : 'You can customize shake sensitivity and preferences anytime in Settings.'}
                  </Text>
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

          {/* ──────────────── SCREEN 5: SENSITIVITY (Step 4) ──────────────── */}
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
                      Low sensitivity helps prevent accidental expense popups during normal phone movement.
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
    marginBottom: 24,
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
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  welcomeTopSection: {
    alignItems: 'flex-start',
  },
  welcomeLogoWrap: {
    marginBottom: 20,
    alignSelf: 'flex-start',
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
  /* Permissions Screen Styles */
  permissionsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  permissionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
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
    marginBottom: 2,
  },
  permissionDesc: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 15,
  },
  permissionActionCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  permissionDivider: {
    height: 1,
    backgroundColor: theme.colors.borderSubtle,
  },
  allowButton: {
    backgroundColor: theme.colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  allowButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  settingsButton: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  allowedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.positive,
  },
  infoBadge: {
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
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
  /* Sensitivity Screen Styles */
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
    paddingVertical: 14,
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
