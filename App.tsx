import './global.css';
import React, { useState, useEffect, useMemo } from 'react';
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
import { ShakeProvider, useShake } from './src/context/ShakeContext';
import { Header } from './src/components/Header';
import { CustomTabBar } from './src/components/CustomTabBar';
import { QuickExpenseModal } from './src/components/QuickExpenseModal';
import { SetBudgetModal } from './src/components/SetBudgetModal';
import { AppLogo } from './src/components/AppLogo';
import { setupReminderChannel } from './src/utils/reminderService';

import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { AllExpensesScreen } from './src/screens/AllExpensesScreen';
import { AnalyticsScreen } from './src/screens/AnalyticsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { TabScreen } from './src/types/expense';

function SplashScreen() {
  const { theme } = useExpenses();
  return (
    <View style={[styles.splashContainer, { backgroundColor: theme.colors.background }]}>
      <AppLogo size="large" />
      <Text style={[styles.splashTitle, { color: theme.colors.textPrimary }]}>Expenza</Text>
      <Text style={[styles.splashSubtitle, { color: theme.colors.textSecondary }]}>Track your spending, effortlessly.</Text>
      <ActivityIndicator size="small" color={theme.colors.textSecondary} style={styles.splashSpinner} />
    </View>
  );
}

function MainApp() {
  const [activeTab, setActiveTab] = useState<TabScreen>('home');
  const { isDark, theme } = useExpenses();
  const { navigationTarget, clearNavigationTarget, isSetBudgetModalOpen, closeSetBudgetModal } = useShake();

  useEffect(() => {
    if (navigationTarget) {
      setActiveTab(navigationTarget);
      clearNavigationTarget();
    }
  }, [navigationTarget, clearNavigationTarget]);

  const headerProps = useMemo(() => {
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
      default:
        return {
          isHome: true,
          showAddButton: true,
        };
    }
  }, [activeTab]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
      {/* Dynamic Theme Status Bar */}
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Top Header */}
      <Header
        title={headerProps.title}
        subtitle={headerProps.subtitle}
        showAddButton={headerProps.showAddButton}
        isHome={headerProps.isHome}
      />

      {/* Screen Body with 0ms Instant Tab Transitions */}
      <View style={[styles.screenContainer, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.tabPane, activeTab !== 'home' && styles.hiddenPane]}>
          <HomeScreen onNavigateToExpenses={() => setActiveTab('expenses')} />
        </View>
        <View style={[styles.tabPane, activeTab !== 'expenses' && styles.hiddenPane]}>
          <AllExpensesScreen />
        </View>
        <View style={[styles.tabPane, activeTab !== 'analytics' && styles.hiddenPane]}>
          <AnalyticsScreen />
        </View>
        <View style={[styles.tabPane, activeTab !== 'settings' && styles.hiddenPane]}>
          <SettingsScreen />
        </View>
      </View>

      {/* Glassmorphism Bottom Tab Bar */}
      <CustomTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Global Set Budget Modal for Deep Links & Home Widget */}
      <SetBudgetModal visible={isSetBudgetModalOpen} onClose={closeSetBudgetModal} />
    </SafeAreaView>
  );
}

function RootApp() {
  const { settings, loading, isDark } = useExpenses();

  if (loading) {
    return <SplashScreen />;
  }

  // If user has not completed onboarding, show the 5-step onboarding experience
  if (!settings.onboardingCompleted) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
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

  useEffect(() => {
    setupReminderChannel().catch(() => {});
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.splashFallback}>
        <ActivityIndicator size="small" color="#4F46E5" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ExpenseProvider>
        <ShakeProvider>
          <RootApp />
          {/* Global Shake / Add Expense Popup Modal */}
          <QuickExpenseModal />
        </ShakeProvider>
      </ExpenseProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  splashFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F7F5',
  },
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  splashTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 18,
    letterSpacing: -0.5,
  },
  splashSubtitle: {
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  splashSpinner: {
    marginTop: 28,
  },
  screenContainer: {
    flex: 1,
  },
  tabPane: {
    flex: 1,
  },
  hiddenPane: {
    display: 'none',
  },
});
