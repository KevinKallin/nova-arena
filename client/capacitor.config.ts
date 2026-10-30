import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.novaarena.app',
  appName: 'Nova Arena',
  webDir: 'dist/client/browser',
  server: {
    androidScheme: 'http',
    cleartext: true,
  },
};

export default config;