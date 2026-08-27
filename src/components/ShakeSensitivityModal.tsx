import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import {
  Smartphone,
  Sparkles,
  Check,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExpenses } from '../context/ExpenseContext';
import { ShakeSensitivity } from '../types/expense';
import { theme } from '../constants/theme';

interface ShakeSensitivityModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ShakeSensitivityModal: React.FC<ShakeSensitivityModalProps> = ({
  visible,
  onClose,
}) => {
  const { settings, updateSettings } = useExpenses();
  const insets = useSafeAreaInsets();

  const selectedSensitivity = settings.shakeSensitivity || 'medium';

  // Backdrop Fade Animation & Sheet Slide Animation
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current;

  // Phone shake subtle continuous animation loop
  const phoneShakeAnim = useRef(new Animated.Value(0)).current;

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
  };

  useEffect(() => {
    if (visible) {
      // Fade in backdrop and slide sheet up
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0.45,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start();

      // Start continuous phone shake loop with dynamic amplitude
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
    } else {
      overlayOpacity.setValue(0);
      sheetTranslateY.setValue(300);
    }
  }, [visible, selectedSensitivity, overlayOpacity, sheetTranslateY, phoneShakeAnim]);

  const handleSensitivitySelect = async (sens: ShakeSensitivity) => {
    triggerHaptic();
    await updateSettings({ shakeSensitivity: sens });
  };

  const handleClose = () => {
    triggerHaptic();
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.modalRoot}>
        {/* Fading Backdrop */}
        <Animated.View
          style={[styles.backdrop, { opacity: overlayOpacity }]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>

        {/* Sliding Bottom Sheet */}
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              paddingBottom: Math.max(insets.bottom, 16) + 12,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>Shake Sensitivity</Text>
                <Animated.View
                  style={[
                    styles.phoneIconBubble,
                    { transform: [{ translateX: phoneShakeAnim }] },
                  ]}
                >
                  <Smartphone size={16} color={theme.colors.primary} strokeWidth={2} />
                </Animated.View>
              </View>
              <Text style={styles.subtitle}>
                Choose how easily Expenza should detect a shake.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <X size={16} color={theme.colors.textPrimary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            {/* 3 Selectable Cards (Low, Medium, High) */}
            <View style={styles.cardsList}>
              {/* 1. Low */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  selectedSensitivity === 'low' && styles.optionCardActive,
                ]}
                onPress={() => handleSensitivitySelect('low')}
                activeOpacity={0.75}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleCol}>
                    <Text style={styles.mainTitle}>Low</Text>
                    <Text style={styles.subTitle}>Gentle shakes</Text>
                  </View>
                  <View
                    style={[
                      styles.indicator,
                      selectedSensitivity === 'low' && styles.indicatorActive,
                    ]}
                  >
                    {selectedSensitivity === 'low' && (
                      <Check size={12} color={theme.colors.primary} strokeWidth={2.5} />
                    )}
                  </View>
                </View>
                <Text style={styles.desc}>
                  Less sensitive to accidental movement.
                </Text>
              </TouchableOpacity>

              {/* 2. Medium (Recommended) */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  selectedSensitivity === 'medium' && styles.optionCardActive,
                ]}
                onPress={() => handleSensitivitySelect('medium')}
                activeOpacity={0.75}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleCol}>
                    <View style={styles.badgeRow}>
                      <Text style={styles.mainTitle}>Medium</Text>
                      <View style={styles.recommendedBadge}>
                        <Sparkles size={10} color={theme.colors.primary} strokeWidth={2} />
                        <Text style={styles.recommendedBadgeText}>Recommended</Text>
                      </View>
                    </View>
                    <Text style={styles.subTitle}>Balanced</Text>
                  </View>
                  <View
                    style={[
                      styles.indicator,
                      selectedSensitivity === 'medium' && styles.indicatorActive,
                    ]}
                  >
                    {selectedSensitivity === 'medium' && (
                      <Check size={12} color={theme.colors.primary} strokeWidth={2.5} />
                    )}
                  </View>
                </View>
                <Text style={styles.desc}>
                  Recommended for most users.
                </Text>
              </TouchableOpacity>

              {/* 3. High */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  selectedSensitivity === 'high' && styles.optionCardActive,
                ]}
                onPress={() => handleSensitivitySelect('high')}
                activeOpacity={0.75}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleCol}>
                    <Text style={styles.mainTitle}>High</Text>
                    <Text style={styles.subTitle}>Quick response</Text>
                  </View>
                  <View
                    style={[
                      styles.indicator,
                      selectedSensitivity === 'high' && styles.indicatorActive,
                    ]}
                  >
                    {selectedSensitivity === 'high' && (
                      <Check size={12} color={theme.colors.primary} strokeWidth={2.5} />
                    )}
                  </View>
                </View>
                <Text style={styles.desc}>
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

          {/* Done Button */}
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={handleClose}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  bottomSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingHorizontal: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flex: 1,
    marginRight: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  title: {
    ...theme.typography.sectionHeading,
    fontSize: 18,
    color: theme.colors.textPrimary,
  },
  phoneIconBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    marginBottom: 14,
  },
  cardsList: {
    gap: 10,
    marginBottom: 16,
  },
  optionCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optionCardActive: {
    backgroundColor: theme.colors.accentLight,
    borderColor: theme.colors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitleCol: {
    flex: 1,
    marginRight: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mainTitle: {
    ...theme.typography.body,
    fontWeight: '600',
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.2)',
  },
  recommendedBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  subTitle: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: 1,
  },
  indicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorActive: {
    borderColor: theme.colors.primary,
    backgroundColor: '#FFFFFF',
  },
  desc: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  minimalLineSection: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    marginBottom: 8,
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
  doneBtn: {
    backgroundColor: theme.colors.textPrimary,
    paddingVertical: 13,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
