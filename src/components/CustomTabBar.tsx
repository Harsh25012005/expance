import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import {
  LayoutDashboard,
  ReceiptText,
  PieChart,
  Settings2,
  SmartphoneNfc,
  Plus,
} from 'lucide-react-native';
import { useShake } from '../context/ShakeContext';

export type TabScreen = 'home' | 'expenses' | 'analytics' | 'settings';

interface CustomTabBarProps {
  activeTab: TabScreen;
  onTabChange: (tab: TabScreen) => void;
}

export const CustomTabBar: React.FC<CustomTabBarProps> = ({
  activeTab,
  onTabChange,
}) => {
  const { openShakeModal } = useShake();

  const tabs: { id: TabScreen; label: string; icon: any }[] = [
    { id: 'home', label: 'Home', icon: LayoutDashboard },
    { id: 'expenses', label: 'Expenses', icon: ReceiptText },
    { id: 'analytics', label: 'Analytics', icon: PieChart },
    { id: 'settings', label: 'Settings', icon: Settings2 },
  ];

  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBar}>
        {/* Tab 1: Home */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onTabChange('home')}
          activeOpacity={0.7}
        >
          <LayoutDashboard
            size={22}
            color={activeTab === 'home' ? '#10b981' : '#64748b'}
            strokeWidth={activeTab === 'home' ? 2.4 : 2}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'home' && styles.tabLabelActive,
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Expenses */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onTabChange('expenses')}
          activeOpacity={0.7}
        >
          <ReceiptText
            size={22}
            color={activeTab === 'expenses' ? '#10b981' : '#64748b'}
            strokeWidth={activeTab === 'expenses' ? 2.4 : 2}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'expenses' && styles.tabLabelActive,
            ]}
          >
            Expenses
          </Text>
        </TouchableOpacity>

        {/* Center Shake Quick Add Button */}
        <View style={styles.centerButtonContainer}>
          <TouchableOpacity
            style={styles.centerButton}
            onPress={openShakeModal}
            activeOpacity={0.85}
          >
            <SmartphoneNfc size={26} color="#090d16" strokeWidth={2.4} />
          </TouchableOpacity>
        </View>

        {/* Tab 3: Analytics */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onTabChange('analytics')}
          activeOpacity={0.7}
        >
          <PieChart
            size={22}
            color={activeTab === 'analytics' ? '#10b981' : '#64748b'}
            strokeWidth={activeTab === 'analytics' ? 2.4 : 2}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'analytics' && styles.tabLabelActive,
            ]}
          >
            Analytics
          </Text>
        </TouchableOpacity>

        {/* Tab 4: Settings */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onTabChange('settings')}
          activeOpacity={0.7}
        >
          <Settings2
            size={22}
            color={activeTab === 'settings' ? '#10b981' : '#64748b'}
            strokeWidth={activeTab === 'settings' ? 2.4 : 2}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'settings' && styles.tabLabelActive,
            ]}
          >
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#0f172a',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#1e293b',
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  tabLabelActive: {
    color: '#10b981',
    fontWeight: '700',
  },
  centerButtonContainer: {
    top: -18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 3,
    borderColor: '#090d16',
  },
});
