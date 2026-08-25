import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';

interface SafeAreaPageProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  topSpacing?: number;
  bottomSpacing?: number;
  backgroundColor?: string;
}

/**
 * Standard Safe Area wrapper for Expenza pages & full-screen modals.
 * Uses exact device safe-area insets so content is never hidden behind
 * the Android status bar, camera punch-holes, or bottom gesture navigation.
 */
export const SafeAreaPage: React.FC<SafeAreaPageProps> = ({
  children,
  style,
  edges = ['top', 'bottom', 'left', 'right'],
  topSpacing = 0,
  bottomSpacing = 0,
  backgroundColor = theme.colors.background,
}) => {
  const insets = useSafeAreaInsets();

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor,
    paddingTop: edges.includes('top') ? insets.top + topSpacing : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom + bottomSpacing : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  return <View style={[containerStyle, style]}>{children}</View>;
};
