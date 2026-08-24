import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Utensils,
  Car,
  ShoppingBag,
  Zap,
  Film,
  HeartPulse,
  Plane,
  GraduationCap,
  MoreHorizontal,
} from 'lucide-react-native';
import { CategoryType } from '../types/expense';
import { CATEGORY_MAP } from '../constants/categories';

interface CategoryIconProps {
  category: CategoryType;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBackground?: boolean;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  category,
  size = 'md',
  showBackground = true,
}) => {
  const info = CATEGORY_MAP[category] || CATEGORY_MAP.Other;

  const sizeConfig = {
    sm: { container: 32, icon: 15 },
    md: { container: 40, icon: 18 },
    lg: { container: 48, icon: 22 },
    xl: { container: 56, icon: 26 },
  }[size];

  const strokeWidth = 1.4;

  const renderIcon = (iconSize: number, iconColor: string) => {
    switch (category) {
      case 'Food':
        return <Utensils size={iconSize} color={iconColor} strokeWidth={strokeWidth} />;
      case 'Transport':
        return <Car size={iconSize} color={iconColor} strokeWidth={strokeWidth} />;
      case 'Shopping':
        return <ShoppingBag size={iconSize} color={iconColor} strokeWidth={strokeWidth} />;
      case 'Bills':
        return <Zap size={iconSize} color={iconColor} strokeWidth={strokeWidth} />;
      case 'Entertainment':
        return <Film size={iconSize} color={iconColor} strokeWidth={strokeWidth} />;
      case 'Health':
        return <HeartPulse size={iconSize} color={iconColor} strokeWidth={strokeWidth} />;
      case 'Travel':
        return <Plane size={iconSize} color={iconColor} strokeWidth={strokeWidth} />;
      case 'Education':
        return <GraduationCap size={iconSize} color={iconColor} strokeWidth={strokeWidth} />;
      case 'Other':
      default:
        return <MoreHorizontal size={iconSize} color={iconColor} strokeWidth={strokeWidth} />;
    }
  };

  if (!showBackground) {
    return renderIcon(sizeConfig.icon, info.color);
  }

  return (
    <View
      style={[
        styles.circle,
        {
          width: sizeConfig.container,
          height: sizeConfig.container,
          borderRadius: sizeConfig.container / 2,
          backgroundColor: info.bgColor,
        },
      ]}
    >
      {renderIcon(sizeConfig.icon, info.color)}
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
});
