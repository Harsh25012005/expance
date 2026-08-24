import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Smartphone, Zap } from 'lucide-react-native';
import { useShake } from '../context/ShakeContext';

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
      <Smartphone size={16} color="#0F172A" strokeWidth={1.4} />
      <Zap size={9} color="#EAB308" strokeWidth={1.5} style={styles.zap} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  circleFab: {
    position: 'absolute',
    bottom: 74,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    zIndex: 99,
  },
  zap: {
    position: 'absolute',
    top: 7,
    right: 8,
  },
});
