import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { LayoutDashboard, Receipt, PieChart, Sliders } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { TabScreen } from '../types/expense';
import { useExpenses } from '../context/ExpenseContext';
import { theme } from '../constants/theme';

interface CustomTabBarProps {
  activeTab: TabScreen;
  onTabChange: (tab: TabScreen) => void;
}

const TABS: { id: TabScreen; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'analytics', label: 'Insights' },
  { id: 'settings', label: 'Settings' },
];

const TabButton: React.FC<{
  tab: typeof TABS[0];
  isActive: boolean;
  onPress: () => void;
}> = ({ tab, isActive, onPress }) => {
  // Subtle scale, opacity, and small vertical movement (180-250ms duration)
  const scaleAnim = useRef(new Animated.Value(isActive ? 1.06 : 1.0)).current;
  const translateYAnim = useRef(new Animated.Value(isActive ? -1.5 : 0)).current;
  const opacityAnim = useRef(new Animated.Value(isActive ? 1.0 : 0.7)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: isActive ? 1.06 : 1.0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: isActive ? -1.5 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: isActive ? 1.0 : 0.7,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isActive]);

  const renderTabIcon = (tabId: TabScreen, active: boolean) => {
    const color = active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)';
    const strokeWidth = active ? 2.1 : 1.75;
    const size = 18;

    switch (tabId) {
      case 'home':
        return <LayoutDashboard size={size} color={color} strokeWidth={strokeWidth} />;
      case 'expenses':
        return <Receipt size={size} color={color} strokeWidth={strokeWidth} />;
      case 'analytics':
        return <PieChart size={size} color={color} strokeWidth={strokeWidth} />;
      case 'settings':
      default:
        return <Sliders size={size} color={color} strokeWidth={strokeWidth} />;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.activeTabButton]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: isActive }}
    >
      <Animated.View
        style={[
          styles.iconWrap,
          {
            transform: [
              { scale: scaleAnim },
              { translateY: translateYAnim },
            ],
            opacity: opacityAnim,
          },
        ]}
      >
        {renderTabIcon(tab.id, isActive)}
      </Animated.View>
      <Text
        style={[
          styles.tabLabel,
          isActive ? styles.activeTabLabel : styles.inactiveTabLabel,
        ]}
        numberOfLines={1}
      >
        {tab.label}
      </Text>
    </TouchableOpacity>
  );
};

export const CustomTabBar: React.FC<CustomTabBarProps> = ({ activeTab, onTabChange }) => {
  const { settings } = useExpenses();
  const insets = useSafeAreaInsets();

  const handlePress = (tabId: TabScreen) => {
    if (tabId !== activeTab) {
      if (settings.hapticsEnabled) {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        } catch {}
      }
      onTabChange(tabId);
    }
  };

  return (
    <View style={[styles.wrapper, { bottom: Math.max(insets.bottom, 12) + 4 }]}>
      <View style={styles.container}>
        {TABS.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onPress={() => handlePress(tab.id)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 10,
  },
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary, // Exact Set Budget button blue color
    borderRadius: 100,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    width: '100%',
    maxWidth: 380,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 100,
    minHeight: 46,
  },
  activeTabButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  tabLabel: {
    ...theme.typography.caption,
    fontSize: 11,
    includeFontPadding: false,
  },
  activeTabLabel: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inactiveTabLabel: {
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.65)',
  },
});
