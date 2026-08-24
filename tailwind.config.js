/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        sans: ["PlusJakartaSans_400Regular", "sans-serif"],
        "jakarta": ["PlusJakartaSans_400Regular", "sans-serif"],
        "jakarta-medium": ["PlusJakartaSans_500Medium", "sans-serif"],
        "jakarta-semibold": ["PlusJakartaSans_600SemiBold", "sans-serif"],
        "jakarta-bold": ["PlusJakartaSans_700Bold", "sans-serif"],
        "jakarta-extrabold": ["PlusJakartaSans_800ExtraBold", "sans-serif"],
        "outfit": ["Outfit_400Regular", "sans-serif"],
        "outfit-medium": ["Outfit_500Medium", "sans-serif"],
        "outfit-semibold": ["Outfit_600SemiBold", "sans-serif"],
        "outfit-bold": ["Outfit_700Bold", "sans-serif"],
      },
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        surface: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          700: '#334155',
          800: '#1e293b',
          850: '#151f32',
          900: '#0f172a',
          950: '#090d16',
        }
      }
    },
  },
  plugins: [],
};
