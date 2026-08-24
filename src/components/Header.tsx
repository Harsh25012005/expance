import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Sparkles, Plus } from 'lucide-react-native';
import { theme } from '../constants/theme';
import { useShake } from '../context/ShakeContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showAddButton?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'ExpenseFlow',
  subtitle,
  showAddButton = true,
}) => {
  const { openQuickAddModal } = useShake();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={styles.brandRow}>
          <View style={styles.circleLogo}>
            <Sparkles size={13} color={theme.colors.primary} strokeWidth={1.4} />
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.subtitle}>{subtitle || today}</Text>
      </View>

      {showAddButton && (
        <TouchableOpacity
          style={styles.addPill}
          onPress={() => openQuickAddModal({ triggeredByShake: false })}
          activeOpacity={0.8}
          accessibilityLabel="Add expense"
          accessibilityRole="button"
        >
          <Plus size={14} color="#FFFFFF" strokeWidth={1.5} />
          <Text style={styles.addPillText}>Add</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  left: {
    flex: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleLogo: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    gap: 4,
  },
  addPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
});
