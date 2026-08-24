import './global.css';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
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

import { ExpenseProvider, useExpenses } from './src/context/ExpenseContext';
import { ShakeProvider } from './src/context/ShakeContext';
import { Header } from './src/components/Header';
import { CustomTabBar } from './src/components/CustomTabBar';
import { QuickExpenseModal } from './src/components/QuickExpenseModal';
import { AppLogo } from './src/components/AppLogo';

import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { AllExpensesScreen } from './src/screens/AllExpensesScreen';
import { AnalyticsScreen } from './src/screens/AnalyticsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { TabScreen } from './src/types/expense';
import { theme } from './src/constants/theme';

function SplashScreen() {
  return (
    <View style={styles.splashContainer}>
      <AppLogo size="large" />
      <Text style={styles.splashTitle}>Expenza</Text>
      <Text style={styles.splashSubtitle}>Track your spending, effortlessly.</Text>
      <ActivityIndicator size="small" color={theme.colors.textSecondary} style={styles.splashSpinner} />
    </View>
  );
}

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
          isHome: true,
          showAddButton: true,
        };
      case 'expenses':
        return {
          title: 'Expenses',
          subtitle: 'All recorded transactions',
          showAddButton: true,
        };
      case 'analytics':
        return {
          title: 'Insights',
          subtitle: 'Spending patterns & trends',
          showAddButton: false,
        };
      case 'settings':
        return {
          title: 'Settings',
          subtitle: 'Preferences & data management',
          showAddButton: false,
        };
    }
  };

  const headerProps = getHeaderProps();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Light Theme Status Bar */}
      <StatusBar style="dark" />

      {/* Top Header */}
      <Header
        title={headerProps.title}
        subtitle={headerProps.subtitle}
        showAddButton={headerProps.showAddButton}
        isHome={headerProps.isHome}
      />

      {/* Screen Body */}
      <View style={styles.screenContainer}>{renderCurrentScreen()}</View>

      {/* Glassmorphism Bottom Tab Bar */}
      <CustomTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Global Shake / Quick Add Popup Modal */}
      <QuickExpenseModal />
    </SafeAreaView>
  );
}

function RootApp() {
  const { settings, loading } = useExpenses();

  if (loading) {
    return <SplashScreen />;
  }

  // If user has not completed onboarding, show the 5-step onboarding experience
  if (!settings.onboardingCompleted) {
    return (
      <>
        <StatusBar style="dark" />
        <OnboardingScreen />
      </>
    );
  }

  return <MainApp />;
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
    return <SplashScreen />;
  }

  return (
    <SafeAreaProvider>
      <ExpenseProvider>
        <ShakeProvider>
          <RootApp />
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
  splashContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  splashTitle: {
    ...theme.typography.display,
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 18,
    letterSpacing: -0.5,
  },
  splashSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  splashSpinner: {
    marginTop: 28,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
