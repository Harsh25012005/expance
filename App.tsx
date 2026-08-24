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
import { CustomTabBar, TabScreen } from './src/components/CustomTabBar';
import { QuickExpenseModal } from './src/components/QuickExpenseModal';
import { GoogleSheetSetupModal } from './src/components/GoogleSheetSetupModal';
import { ShakeSimulatorFab } from './src/components/ShakeSimulatorFab';

import { HomeScreen } from './src/screens/HomeScreen';
import { AllExpensesScreen } from './src/screens/AllExpensesScreen';
import { AnalyticsScreen } from './src/screens/AnalyticsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

function MainApp() {
  const [activeTab, setActiveTab] = useState<TabScreen>('home');
  const [isSheetModalOpen, setIsSheetModalOpen] = useState<boolean>(false);

  const renderCurrentScreen = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeScreen
            onNavigateToExpenses={() => setActiveTab('expenses')}
            onOpenSheetModal={() => setIsSheetModalOpen(true)}
          />
        );
      case 'expenses':
        return <AllExpensesScreen />;
      case 'analytics':
        return <AnalyticsScreen />;
      case 'settings':
        return (
          <SettingsScreen onOpenSheetModal={() => setIsSheetModalOpen(true)} />
        );
      default:
        return (
          <HomeScreen
            onNavigateToExpenses={() => setActiveTab('expenses')}
            onOpenSheetModal={() => setIsSheetModalOpen(true)}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />

      {/* Persistent Top Header */}
      <Header onOpenSheetModal={() => setIsSheetModalOpen(true)} />

      {/* Main Screen Body */}
      <View style={styles.screenContainer}>{renderCurrentScreen()}</View>

      {/* Floating Shake Simulator Button */}
      <ShakeSimulatorFab />

      {/* Bottom Floating Navigation Bar */}
      <CustomTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Global Shake-to-Add Popup Modal (accessible from any position/screen) */}
      <QuickExpenseModal />

      {/* Google Sheets Setup & Connection Modal */}
      <GoogleSheetSetupModal
        visible={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
      />
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
        <ActivityIndicator size="large" color="#10b981" />
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
    backgroundColor: '#090d16',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#090d16',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#090d16',
  },
});
