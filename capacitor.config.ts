import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'uk.adaptiveedge.watchlist',
  appName: 'Watchlist',
  webDir: 'dist/public',
  android: {
    allowMixedContent: false,
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a0f',
    },
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#0a0a0f',
    },
  },
};

export default config;
