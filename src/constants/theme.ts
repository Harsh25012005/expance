export const theme = {
  colors: {
    // Backgrounds & Surfaces (Light Theme Only)
    background: '#F7F7F5', // Warm light neutral
    backgroundSecondary: '#F1F1EF',
    surface: '#FFFFFF',
    surfaceSubtle: '#FAFAF9',
    card: '#FFFFFF',
    modalBackground: '#FFFFFF',
    glassBackground: 'rgba(255, 255, 255, 0.94)',
    glassBorder: '#E7E7E4',

    // Typography
    textPrimary: '#171717', // Near black, high contrast
    textSecondary: '#737373', // Refined neutral gray
    textTertiary: '#A3A3A3', // Placeholder / subtle
    textMuted: '#A3A3A3',
    textInverse: '#FFFFFF',

    // Borders & Dividers (Max 1px)
    border: '#E7E7E4',
    borderSubtle: '#F1F1EF',
    borderActive: '#4F46E5',

    // Primary Brand Accent (Muted refined indigo)
    primary: '#4F46E5',
    primaryLight: '#EEF2FF',
    primaryDark: '#3730A3',
    accent: '#4F46E5',
    accentLight: '#EEF2FF',

    // Status Colors (Positive / Negative)
    positive: '#16A34A',
    positiveLight: '#F0FDF4',
    positiveText: '#15803D',
    success: '#16A34A',
    successLight: '#F0FDF4',
    successText: '#15803D',

    negative: '#DC2626',
    negativeLight: '#FEF2F2',
    negativeText: '#B91C1C',
    danger: '#DC2626',
    dangerLight: '#FEF2F2',
    dangerText: '#B91C1C',

    warning: '#D97706',
    warningLight: '#FFFBEB',
    warningText: '#B45309',

    overlay: 'rgba(23, 23, 23, 0.4)',
  },
  typography: {
    display: {
      fontSize: 30,
      fontWeight: '600' as const,
      lineHeight: 36,
      letterSpacing: -0.6,
    },
    pageHeading: {
      fontSize: 24,
      fontWeight: '600' as const,
      lineHeight: 30,
      letterSpacing: -0.4,
    },
    sectionHeading: {
      fontSize: 17,
      fontWeight: '600' as const,
      lineHeight: 22,
      letterSpacing: -0.2,
    },
    bodyLarge: {
      fontSize: 15,
      fontWeight: '500' as const,
      lineHeight: 21,
    },
    body: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    secondary: {
      fontSize: 13,
      fontWeight: '400' as const,
      lineHeight: 18,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
    },
    label: {
      fontSize: 11,
      fontWeight: '600' as const,
      lineHeight: 14,
      letterSpacing: 0.6,
    },
    amount: {
      fontSize: 32,
      fontWeight: '700' as const,
      lineHeight: 38,
      letterSpacing: -0.8,
    },
    amountSmall: {
      fontSize: 22,
      fontWeight: '600' as const,
      lineHeight: 28,
      letterSpacing: -0.4,
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 40,
    massive: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    container: 20,
    full: 999,
  },
  // STRICT RULE: No shadows anywhere.
  shadows: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
  },
};
