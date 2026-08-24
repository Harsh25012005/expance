import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  UtensilsCrossed,
  ShoppingBag,
  Car,
  Receipt,
  Film,
  HeartPulse,
  Briefcase,
  Gift,
  CreditCard,
  Coffee,
  Sparkles,
  Zap,
  Tag,
} from 'lucide-react-native';
import { getCategoryDetails } from '../utils/formatters';

interface CategoryIconProps {
  categoryId: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'huge';
  customColor?: string;
  customBgColor?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  categoryId,
  size = 'md',
  customColor,
  customBgColor,
}) => {
  const details = getCategoryDetails(categoryId);

  const sizeConfig = {
    sm: { containerSize: 36, iconSize: 18, borderRadius: 10 },
    md: { containerSize: 48, iconSize: 24, borderRadius: 14 },
    lg: { containerSize: 58, iconSize: 30, borderRadius: 18 },
    xl: { containerSize: 72, iconSize: 38, borderRadius: 22 },
    huge: { containerSize: 88, iconSize: 48, borderRadius: 26 },
  }[size];

  const iconColor = customColor || details.color;
  const bgColor = customBgColor || details.bgColor;

  const renderIcon = (iconName: string) => {
    const props = { size: sizeConfig.iconSize, color: iconColor, strokeWidth: 2.2 };

    switch (iconName?.toLowerCase()) {
      case 'utensilscrossed':
      case 'food':
        return <UtensilsCrossed {...props} />;
      case 'shoppingbag':
      case 'shopping':
      case 'groceries':
        return <ShoppingBag {...props} />;
      case 'car':
      case 'transport':
        return <Car {...props} />;
      case 'receipt':
      case 'bills':
        return <Receipt {...props} />;
      case 'film':
      case 'entertainment':
        return <Film {...props} />;
      case 'heartpulse':
      case 'health':
        return <HeartPulse {...props} />;
      case 'briefcase':
      case 'work':
        return <Briefcase {...props} />;
      case 'gift':
      case 'personal':
        return <Gift {...props} />;
      case 'coffee':
        return <Coffee {...props} />;
      case 'sparkles':
        return <Sparkles {...props} />;
      case 'zap':
        return <Zap {...props} />;
      case 'creditcard':
      default:
        return <CreditCard {...props} />;
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          width: sizeConfig.containerSize,
          height: sizeConfig.containerSize,
          borderRadius: sizeConfig.borderRadius,
          backgroundColor: bgColor,
        },
      ]}
    >
      {renderIcon(details.icon)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
