import './global.css';
import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

import { ExpenseProvider } from './src/context/ExpenseContext';
import { ShakeProvider } from './src/context/ShakeContext';
import { Header } from './src/components/Header';
import { CustomTabBar } from './src/components/CustomTabBar';
import { QuickExpenseModal } from './src/components/QuickExpenseModal';
import { ShakeSimulatorFab } from './src/components/ShakeSimulatorFab';

import { HomeScreen } from './src/screens/HomeScreen';
import { AllExpensesScreen } from './src/screens/AllExpensesScreen';
import { AnalyticsScreen } from './src/screens/AnalyticsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { TabScreen } from './src/types/expense';
import { theme } from './src/constants/theme';

function MainApp() {
  const [activeTab, setActiveTab] = useState<TabScreen>('home');

  const renderCurrentScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen onNavigateToExpenses={() => setActiveTab('expenses')} />;
      case 'expenses':
        return <AllExpensesScreen />;
      case 'analytics':
        return <AnalyticsScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <HomeScreen onNavigateToExpenses={() => setActiveTab('expenses')} />;
    }
  };

  const getHeaderProps = () => {
    switch (activeTab) {
      case 'home':
        return {
          title: 'ExpenseFlow',
          showAddButton: true,
        };
      case 'expenses':
        return {
          title: 'Expenses History',
          subtitle: 'All recorded transactions',
          showAddButton: true,
        };
      case 'analytics':
        return {
          title: 'Analytics',
          subtitle: 'Spending patterns & trends',
          showAddButton: false,
        };
      case 'settings':
        return {
          title: 'Preferences',
          subtitle: 'Shake & data settings',
          showAddButton: false,
        };
    }
  };

  const headerProps = getHeaderProps();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Light Theme Status Bar (Dark text/icons) */}
      <StatusBar style="dark" />

      {/* Top Header */}
      <Header
        title={headerProps.title}
        subtitle={headerProps.subtitle}
        showAddButton={headerProps.showAddButton}
      />

      {/* Screen Body */}
      <View style={styles.screenContainer}>{renderCurrentScreen()}</View>

      {/* Floating Shake Test Simulator */}
      <ShakeSimulatorFab />

      {/* Glassmorphism Bottom Tab Bar */}
      <CustomTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Global Shake / Quick Add Modal */}
      <QuickExpenseModal />
    </SafeAreaView>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ExpenseProvider>
        <ShakeProvider>
          <MainApp />
        </ShakeProvider>
      </ExpenseProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
