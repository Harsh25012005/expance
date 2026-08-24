export const theme = {
  colors: {
    background: '#F8FAFC',
    backgroundSecondary: '#F1F5F9',
    card: '#FFFFFF',
    modalBackground: '#FFFFFF',
    glassBackground: '#FFFFFF',
    glassBorder: '#E2E8F0',

    // Primary & Accents
    primary: '#2563EB',
    primaryLight: '#EFF6FF',
    primaryDark: '#1D4ED8',
    primarySubtle: '#DBEAFE',

    // Status Colors
    success: '#10B981',
    successLight: '#ECFDF5',
    successText: '#065F46',

    danger: '#EF4444',
    dangerLight: '#FEF2F2',
    dangerText: '#991B1B',

    warning: '#F59E0B',
    warningLight: '#FFFBEB',
    warningText: '#92400E',

    // Typography
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    textInverse: '#FFFFFF',

    // Borders & Dividers
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    borderActive: '#2563EB',

    overlay: 'rgba(15, 23, 42, 0.45)',
  },
  typography: {
    hero: {
      fontSize: 32,
      fontWeight: '600' as const,
      lineHeight: 38,
      letterSpacing: -0.5,
    },
    title1: {
      fontSize: 22,
      fontWeight: '600' as const,
      lineHeight: 28,
      letterSpacing: -0.3,
    },
    title2: {
      fontSize: 17,
      fontWeight: '600' as const,
      lineHeight: 22,
    },
    bodyLarge: {
      fontSize: 15,
      fontWeight: '500' as const,
      lineHeight: 20,
    },
    body: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 19,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
    },
    small: {
      fontSize: 11,
      fontWeight: '500' as const,
      lineHeight: 14,
    },
  },
  borderRadius: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    circle: 999,
    pill: 999,
  },
  shadows: {
    subtle: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    card: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    float: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    modal: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
  },
};
