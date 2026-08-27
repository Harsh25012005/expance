import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useExpenses } from '../context/ExpenseContext';
import { useShake } from '../context/ShakeContext';

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
  const { settings, theme } = useExpenses();
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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.left, !showAddButton && styles.leftFull]}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {headerTitle}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          {headerSubtitle}
        </Text>
      </View>

      {showAddButton && (
        <View style={styles.right}>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => openQuickAddModal({ triggeredByShake: false })}
            activeOpacity={0.8}
            accessibilityLabel="Add expense"
            accessibilityRole="button"
          >
            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
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
  },
  left: {
    flex: 1,
    marginRight: 12,
  },
  leftFull: {
    marginRight: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
