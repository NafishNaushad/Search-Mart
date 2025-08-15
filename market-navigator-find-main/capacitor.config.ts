import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.searchmart.app',
  appName: 'SearchMart',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    },
    StatusBar: {
      style: 'DARK'
    },
    Keyboard: {
      // 'body' is not a valid KeyboardResize in this plugin version; use 'native' for similar behavior
      resize: 'body' as any, // Use enum if imported, fallback to string for config
      style: 'Dark' as any, // Use enum if imported, fallback to string for config
      resizeOnFullScreen: true
    }
  }
};

export default config;
