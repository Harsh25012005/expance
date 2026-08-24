import React from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet } from 'react-native';

export type LogoSize = 'small' | 'medium' | 'large' | number;

interface AppLogoProps {
  size?: LogoSize;
  style?: StyleProp<ImageStyle>;
}

export const AppLogo: React.FC<AppLogoProps> = ({ size = 'medium', style }) => {
  let dimension = 48;

  if (typeof size === 'number') {
    dimension = size;
  } else {
    switch (size) {
      case 'small':
        dimension = 26;
        break;
      case 'medium':
        dimension = 48;
        break;
      case 'large':
        dimension = 84;
        break;
      default:
        dimension = 48;
    }
  }

  return (
    <Image
      source={require('../../assets/logo.png')}
      style={[
        styles.logo,
        {
          width: dimension,
          height: dimension,
        },
        style,
      ]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="Expenza Logo"
    />
  );
};

const styles = StyleSheet.create({
  logo: {
    alignSelf: 'center',
  },
});
