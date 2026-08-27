import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import {
  Camera,
  Image as ImageIcon,
  X,
  Sparkles,
  CheckCircle2,
  ScanLine,
  Receipt,
  Edit3,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { CategoryType } from '../types/expense';
import { useExpenses } from '../context/ExpenseContext';
import { formatCurrency } from '../utils/formatters';
import { parseReceiptText, ParsedReceiptData } from '../utils/receiptParser';
import { CATEGORIES } from '../constants/categories';

interface ParsedReceiptResult {
  merchant: string;
  amount: number;
  category: CategoryType;
  date: string;
  tax?: number;
  rawImageUri?: string;
}

interface ReceiptScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onReceiptScanned: (result: ParsedReceiptResult) => void;
}

// Safe dynamic loader to prevent crashes if native module is not in the currently running APK
async function getSafeImagePicker(): Promise<typeof import('expo-image-picker') | null> {
  try {
    const picker = require('expo-image-picker');
    return picker;
  } catch (err) {
    console.warn('[ImagePicker] Native module not compiled in current development binary:', err);
    return null;
  }
}

// Safe dynamic ML Kit loader
async function recognizeReceiptImage(imageUri: string): Promise<string | null> {
  try {
    const TextRecognition = require('@react-native-ml-kit/text-recognition').default;
    if (TextRecognition && typeof TextRecognition.recognize === 'function') {
      const result = await TextRecognition.recognize(imageUri);
      return result.text || '';
    }
  } catch (err) {
    console.warn('[MLKit] Native ML Kit module not compiled in current development binary:', err);
  }
  return null;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  visible,
  onClose,
  onReceiptScanned,
}) => {
  const { theme, settings } = useExpenses();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [parsedResult, setParsedResult] = useState<ParsedReceiptResult | null>(null);

  // Editable fields for user adjustment
  const [editableMerchant, setEditableMerchant] = useState<string>('');
  const [editableAmount, setEditableAmount] = useState<string>('');
  const [editableCategory, setEditableCategory] = useState<CategoryType>('Shopping');

  // Laser scanning animation line
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setSelectedImage(null);
      setIsScanning(false);
      setParsedResult(null);
      setScanProgress(0);
      setEditableMerchant('');
      setEditableAmount('');
      setEditableCategory('Shopping');
    }
  }, [visible]);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
  };

  const startLaserAnimation = () => {
    laserAnim.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Run Google ML Kit Text Recognition on the captured photo
  const processImageOCR = async (imageUri: string) => {
    setIsScanning(true);
    setScanProgress(0.2);
    startLaserAnimation();

    const progressInterval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 0.9) {
          clearInterval(progressInterval);
          return 0.95;
        }
        return prev + 0.2;
      });
    }, 250);

    try {
      // 1. Run Real Google ML Kit Text Recognition on the photo
      const rawText = await recognizeReceiptImage(imageUri);

      // 2. Intelligently parse receipt line items, merchant, amount, category & date
      let parsed: ParsedReceiptData;
      if (rawText && rawText.trim().length > 0) {
        parsed = parseReceiptText(rawText);
      } else {
        parsed = {
          merchant: 'Receipt Purchase',
          amount: 0,
          category: 'Shopping',
          date: new Date().toISOString(),
          confidence: 0,
        };
      }

      clearInterval(progressInterval);
      setIsScanning(false);
      laserAnim.stopAnimation();

      setParsedResult({
        merchant: parsed.merchant,
        amount: parsed.amount,
        category: parsed.category,
        date: parsed.date,
        tax: parsed.tax,
        rawImageUri: imageUri,
      });

      setEditableMerchant(parsed.merchant);
      setEditableAmount(parsed.amount > 0 ? parsed.amount.toString() : '');
      setEditableCategory(parsed.category);

      if (settings.hapticsEnabled) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        } catch {}
      }
    } catch (err) {
      clearInterval(progressInterval);
      setIsScanning(false);
      laserAnim.stopAnimation();
      console.error('Receipt recognition error:', err);
    }
  };

  const handlePickFromGallery = async () => {
    triggerHaptic();
    try {
      const picker = await getSafeImagePicker();
      if (!picker || !picker.launchImageLibraryAsync) {
        Alert.alert(
          'Rebuild Dev Client Needed',
          'Camera/Gallery native module requires an APK rebuild. Run "npx expo run:android" to compile it.',
          [{ text: 'OK' }]
        );
        return;
      }

      const permission = await picker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Permission to access photos is needed to scan receipts.');
        return;
      }

      const result = await picker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        const uri = result.assets[0].uri;
        setSelectedImage(uri);
        processImageOCR(uri);
      }
    } catch (e) {
      console.warn('Error selecting receipt photo:', e);
      Alert.alert(
        'Native Module Notice',
        'Camera native code requires an APK rebuild. Run "npx expo run:android" to compile native libraries.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleTakePhoto = async () => {
    triggerHaptic();
    try {
      const picker = await getSafeImagePicker();
      if (!picker || !picker.launchCameraAsync) {
        Alert.alert(
          'Rebuild Dev Client Needed',
          'Camera native module requires an APK rebuild. Run "npx expo run:android" to compile it.',
          [{ text: 'OK' }]
        );
        return;
      }

      const permission = await picker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Camera permission is needed to snap a receipt.');
        return;
      }

      const result = await picker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        const uri = result.assets[0].uri;
        setSelectedImage(uri);
        processImageOCR(uri);
      }
    } catch (e) {
      console.warn('Error taking receipt photo:', e);
      Alert.alert(
        'Native Module Notice',
        'Camera native code requires an APK rebuild. Run "npx expo run:android" to compile native libraries.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleApplyResult = () => {
    if (parsedResult) {
      triggerHaptic();
      const finalAmount = parseFloat(editableAmount) || parsedResult.amount || 0;
      onReceiptScanned({
        merchant: editableMerchant.trim() || parsedResult.merchant,
        amount: finalAmount,
        category: editableCategory || parsedResult.category,
        date: parsedResult.date,
        tax: parsedResult.tax,
        rawImageUri: parsedResult.rawImageUri,
      });
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {/* Top Bar */}
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.borderSubtle }]}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.scannerBadge, { backgroundColor: theme.colors.primaryLight }]}>
                <ScanLine size={16} color={theme.colors.primary} strokeWidth={2} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>AI Receipt Scanner</Text>
                <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>Google ML Kit On-Device OCR</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: theme.colors.backgroundSecondary }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={16} color={theme.colors.textSecondary} strokeWidth={1.75} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Viewfinder Preview Box */}
            <View style={[styles.viewfinderBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
              {selectedImage ? (
                <View style={styles.imagePreviewWrapper}>
                  <Image source={{ uri: selectedImage }} style={styles.previewImage} resizeMode="cover" />
                  
                  {isScanning && (
                    <Animated.View
                      style={[
                        styles.laserScanningLine,
                        {
                          transform: [
                            {
                              translateY: laserAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [10, 190],
                              }),
                            },
                          ],
                        },
                      ]}
                    />
                  )}
                </View>
              ) : (
                <View style={styles.emptyViewfinderContent}>
                  <Receipt size={42} color={theme.colors.textTertiary} strokeWidth={1.25} />
                  <Text style={[styles.emptyPromptTitle, { color: theme.colors.textPrimary }]}>
                    Snap or upload any bill receipt
                  </Text>
                  <Text style={[styles.emptyPromptSubtitle, { color: theme.colors.textSecondary }]}>
                    Reads merchant name, total price & category using on-device ML
                  </Text>
                </View>
              )}
            </View>

            {/* Scanning In-Progress Indicator */}
            {isScanning && (
              <View style={[styles.scanningBanner, { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary }]}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={[styles.scanningText, { color: theme.colors.primary }]}>
                  Reading text with Google ML Kit... ({Math.round(scanProgress * 100)}%)
                </Text>
              </View>
            )}

            {/* Extracted Parsed Results Card */}
            {parsedResult && !isScanning && (
              <View style={[styles.resultsCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                <View style={styles.resultBadgeRow}>
                  <CheckCircle2 size={16} color={theme.colors.positive} strokeWidth={2} />
                  <Text style={[styles.resultSuccessLabel, { color: theme.colors.positive }]}>Receipt Extracted with ML Kit</Text>
                </View>

                {/* Editable Merchant */}
                <View style={styles.resultItemRow}>
                  <Text style={[styles.resultLabel, { color: theme.colors.textSecondary }]}>Merchant</Text>
                  <TextInput
                    style={[styles.resultInput, { color: theme.colors.textPrimary, borderColor: theme.colors.borderSubtle }]}
                    value={editableMerchant}
                    onChangeText={setEditableMerchant}
                    placeholder="Merchant name"
                    placeholderTextColor={theme.colors.textTertiary}
                  />
                </View>

                {/* Editable Total Amount */}
                <View style={styles.resultItemRow}>
                  <Text style={[styles.resultLabel, { color: theme.colors.textSecondary }]}>Total Amount</Text>
                  <View style={styles.amountInputWrap}>
                    <Text style={[styles.currencyPrefix, { color: theme.colors.textPrimary }]}>{settings.currency}</Text>
                    <TextInput
                      style={[styles.resultAmountInput, { color: theme.colors.textPrimary, borderColor: theme.colors.borderSubtle }]}
                      value={editableAmount}
                      onChangeText={setEditableAmount}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      placeholderTextColor={theme.colors.textTertiary}
                    />
                  </View>
                </View>

                {/* Category Pills Selector */}
                <View style={styles.categoryRowBlock}>
                  <Text style={[styles.resultLabel, { color: theme.colors.textSecondary, marginBottom: 6 }]}>Category</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryPillsScroll}>
                    {CATEGORIES.map((cat) => {
                      const isSelected = editableCategory === cat.id;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[
                            styles.categoryPill,
                            { backgroundColor: isSelected ? theme.colors.primaryLight : theme.colors.surface, borderColor: isSelected ? theme.colors.primary : theme.colors.border },
                          ]}
                          onPress={() => {
                            triggerHaptic();
                            setEditableCategory(cat.id);
                          }}
                        >
                          <Text style={[styles.categoryPillText, { color: isSelected ? theme.colors.primary : theme.colors.textSecondary, fontWeight: isSelected ? '700' : '500' }]}>
                            {cat.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <TouchableOpacity
                  style={[styles.applyResultBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={handleApplyResult}
                  activeOpacity={0.85}
                >
                  <Sparkles size={16} color="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.applyResultBtnText}>Apply to Expense</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Capture Buttons */}
            {!parsedResult && !isScanning && (
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={[styles.captureBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={handleTakePhoto}
                  activeOpacity={0.85}
                >
                  <Camera size={18} color="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.captureBtnText}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.galleryBtn, { backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.border }]}
                  onPress={handlePickFromGallery}
                  activeOpacity={0.85}
                >
                  <ImageIcon size={18} color={theme.colors.textPrimary} strokeWidth={2} />
                  <Text style={[styles.galleryBtnText, { color: theme.colors.textPrimary }]}>Choose Photo</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: Dimensions.get('window').height * 0.85,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scannerBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    maxHeight: 480,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  viewfinderBox: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 16,
  },
  emptyViewfinderContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyPromptTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
  },
  emptyPromptSubtitle: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 16,
  },
  imagePreviewWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  laserScanningLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  scanningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  scanningText: {
    fontSize: 13,
    fontWeight: '600',
  },
  resultsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  resultBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  resultSuccessLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  resultItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  resultLabel: {
    fontSize: 13,
  },
  resultInput: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 8,
    minWidth: 140,
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  currencyPrefix: {
    fontSize: 15,
    fontWeight: '700',
  },
  resultAmountInput: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 8,
    minWidth: 90,
  },
  categoryRowBlock: {
    paddingVertical: 10,
  },
  categoryPillsScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 12,
  },
  applyResultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 9999,
    marginTop: 14,
  },
  applyResultBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  captureBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 9999,
  },
  captureBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  galleryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 9999,
    borderWidth: 1,
  },
  galleryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
