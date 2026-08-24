import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LayoutDashboard, Receipt, PieChart, Sliders } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { TabScreen } from '../types/expense';
import { theme } from '../constants/theme';
import { useExpenses } from '../context/ExpenseContext';

interface CustomTabBarProps {
  activeTab: TabScreen;
  onTabChange: (tab: TabScreen) => void;
}

const TABS: { id: TabScreen; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'settings', label: 'Settings' },
];

export const CustomTabBar: React.FC<CustomTabBarProps> = ({ activeTab, onTabChange }) => {
  const { settings } = useExpenses();

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

  const renderTabIcon = (tabId: TabScreen, isActive: boolean) => {
    const color = isActive ? theme.colors.primary : theme.colors.textSecondary;
    const strokeWidth = 1.4;
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
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabButton, isActive && styles.activeTabButton]}
              onPress={() => handlePress(tab.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isActive }}
            >
              <View style={[styles.iconCircle, isActive && styles.activeIconCircle]}>
                {renderTabIcon(tab.id, isActive)}
              </View>
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
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 14,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 999, // Pill capsule
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
    maxWidth: 380,
    justifyContent: 'space-between',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: 999,
  },
  activeTabButton: {
    backgroundColor: theme.colors.primaryLight,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  activeIconCircle: {},
  tabLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  activeTabLabel: {
    fontWeight: '600',
    color: theme.colors.primary,
  },
  inactiveTabLabel: {
    fontWeight: '400',
    color: theme.colors.textSecondary,
  },
});
