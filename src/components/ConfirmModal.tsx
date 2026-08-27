import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { theme } from '../constants/theme';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  confirmLabel,
  confirmText,
  cancelLabel,
  cancelText,
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  const finalConfirmText = confirmText || confirmLabel || 'Confirm';
  const finalCancelText = cancelText || cancelLabel || 'Cancel';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              <View
                style={[
                  styles.iconWrapper,
                  isDestructive ? styles.iconDestructive : styles.iconNormal,
                ]}
              >
                <AlertTriangle
                  size={18}
                  color={isDestructive ? theme.colors.negative : theme.colors.primary}
                  strokeWidth={1.5}
                />
              </View>

              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onCancel}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelText}>{finalCancelText}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    isDestructive ? styles.confirmDestructive : styles.confirmNormal,
                  ]}
                  onPress={onConfirm}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmText}>{finalConfirmText}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.container,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 9999, // Fully rounded
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
  },
  iconDestructive: {
    backgroundColor: theme.colors.negativeLight,
    borderColor: theme.colors.negative,
  },
  iconNormal: {
    backgroundColor: theme.colors.accentLight,
    borderColor: theme.colors.primary,
  },
  title: {
    ...theme.typography.sectionHeading,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    ...theme.typography.secondary,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  actionRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9999, // Fully rounded
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  cancelText: {
    ...theme.typography.secondary,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9999, // Fully rounded
  },
  confirmNormal: {
    backgroundColor: theme.colors.textPrimary,
  },
  confirmDestructive: {
    backgroundColor: theme.colors.negative,
  },
  confirmText: {
    ...theme.typography.secondary,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
