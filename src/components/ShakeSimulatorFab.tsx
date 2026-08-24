import React, { useState } from 'react';
import { TouchableOpacity, Text, View, StyleSheet, Animated } from 'react-native';
import { SmartphoneNfc, Zap } from 'lucide-react-native';
import { useShake } from '../context/ShakeContext';

export const ShakeSimulatorFab: React.FC = () => {
  const { simulateShake, shakeSettings } = useShake();
  const [scale] = useState(new Animated.Value(1));

  if (!shakeSettings.enabled) return null;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1.1,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    simulateShake();
  };

  return (
    <Animated.View style={[styles.fabContainer, { transform: [{ scale }] }]}>
      <TouchableOpacity
        style={styles.fab}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        <SmartphoneNfc size={22} color="#090d16" strokeWidth={2.4} />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Shake</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 84,
    right: 20,
    zIndex: 999,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#34d399',
    gap: 8,
  },
  badge: {
    backgroundColor: '#090d16',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10b981',
    letterSpacing: 0.2,
  },
});
