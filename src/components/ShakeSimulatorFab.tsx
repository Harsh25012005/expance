import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Smartphone, Zap } from 'lucide-react-native';
import { useShake } from '../context/ShakeContext';
import { theme } from '../constants/theme';

export const ShakeSimulatorFab: React.FC = () => {
  const { simulateShake } = useShake();

  return (
    <TouchableOpacity
      style={styles.circleFab}
      onPress={simulateShake}
      activeOpacity={0.8}
      accessibilityLabel="Test shake gesture"
      accessibilityRole="button"
    >
      <Smartphone size={15} color={theme.colors.textPrimary} strokeWidth={1.5} />
      <Zap size={8} color={theme.colors.warning} strokeWidth={2} style={styles.zap} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  circleFab: {
    position: 'absolute',
    bottom: 74,
    right: 20,
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    zIndex: 99,
  },
  zap: {
    position: 'absolute',
    top: 6,
    right: 7,
  },
});
