import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useExpenses } from '../context/ExpenseContext';
import { useShake } from '../context/ShakeContext';
import { theme } from '../constants/theme';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showAddButton?: boolean;
  isHome?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showAddButton = true,
  isHome = false,
}) => {
  const { settings } = useExpenses();
  const { openQuickAddModal } = useShake();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = settings.userName?.trim() || 'Harsh';
  const headerTitle = isHome ? `${getGreeting()}, ${displayName}` : title || 'Expenza';
  const headerSubtitle = isHome ? "Here's where your money went this month." : subtitle || 'Track your daily finances';

  return (
    <View style={styles.container}>
      <View style={[styles.left, !showAddButton && styles.leftFull]}>
        <Text style={styles.title} numberOfLines={1}>
          {headerTitle}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {headerSubtitle}
        </Text>
      </View>

      {showAddButton && (
        <View style={styles.right}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => openQuickAddModal({ triggeredByShake: false })}
            activeOpacity={0.8}
            accessibilityLabel="Add expense"
            accessibilityRole="button"
          >
            <Plus size={16} color="#FFFFFF" strokeWidth={2} />
          </TouchableOpacity>
        </View>
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
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: theme.colors.background,
  },
  left: {
    flex: 1,
    marginRight: 12,
  },
  leftFull: {
    marginRight: 0,
  },
  title: {
    ...theme.typography.pageHeading,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    ...theme.typography.secondary,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
