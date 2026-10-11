import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.peakloader.shop',
  appName: 'PeakEsp Shop',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
