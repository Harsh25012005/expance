export const lightColors = {
  // Backgrounds & Surfaces (Light Theme)
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
};

export const darkColors = {
  // Backgrounds & Surfaces (Dark Theme / OLED Pitch)
  background: '#0B0B0F',
  backgroundSecondary: '#14141C',
  surface: '#1A1A24',
  surfaceSubtle: '#222230',
  card: '#1A1A24',
  modalBackground: '#1A1A24',
  glassBackground: 'rgba(26, 26, 36, 0.94)',
  glassBorder: '#2D2D3E',

  // Typography
  textPrimary: '#F9FAFB', // Near white, high contrast
  textSecondary: '#9CA3AF', // Refined neutral gray
  textTertiary: '#6B7280', // Placeholder / subtle
  textMuted: '#6B7280',
  textInverse: '#171717',

  // Borders & Dividers (Max 1px)
  border: '#2A2A3A',
  borderSubtle: '#1F1F2C',
  borderActive: '#6366F1',

  // Primary Brand Accent (Electric Indigo in dark mode)
  primary: '#6366F1',
  primaryLight: 'rgba(99, 102, 241, 0.16)',
  primaryDark: '#4F46E5',
  accent: '#6366F1',
  accentLight: 'rgba(99, 102, 241, 0.16)',

  // Status Colors (Positive / Negative / Warning)
  positive: '#22C55E',
  positiveLight: 'rgba(34, 197, 94, 0.15)',
  positiveText: '#4ADE80',
  success: '#22C55E',
  successLight: 'rgba(34, 197, 94, 0.15)',
  successText: '#4ADE80',

  negative: '#EF4444',
  negativeLight: 'rgba(239, 68, 68, 0.15)',
  negativeText: '#F87171',
  danger: '#EF4444',
  dangerLight: 'rgba(239, 68, 68, 0.15)',
  dangerText: '#F87171',

  warning: '#F59E0B',
  warningLight: 'rgba(245, 158, 11, 0.15)',
  warningText: '#FBBF24',

  overlay: 'rgba(0, 0, 0, 0.65)',
};

const typography = {
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
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 48,
};

const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  container: 20,
  full: 9999,
  button: 9999,
  pill: 9999,
};

const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
};

export const getAppTheme = (isDark: boolean = false) => ({
  isDark,
  colors: isDark ? darkColors : lightColors,
  typography,
  spacing,
  borderRadius,
  shadows,
});

// Default theme instance for backward compatibility
export const theme = getAppTheme(false);
