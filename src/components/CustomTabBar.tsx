import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LayoutDashboard, Receipt, PieChart, Sliders } from 'lucide-react-native';
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
    const color = isActive ? theme.colors.textPrimary : theme.colors.textTertiary;
    const strokeWidth = 1.5;
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
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isActive }}
            >
              <View style={styles.iconWrap}>
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
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.glassBackground,
    borderRadius: theme.borderRadius.container,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    width: '100%',
    maxWidth: 380,
    justifyContent: 'space-between',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: theme.borderRadius.md,
    minHeight: 48,
  },
  activeTabButton: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tabLabel: {
    ...theme.typography.caption,
    fontSize: 11,
  },
  activeTabLabel: {
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  inactiveTabLabel: {
    fontWeight: '400',
    color: theme.colors.textTertiary,
  },
});
