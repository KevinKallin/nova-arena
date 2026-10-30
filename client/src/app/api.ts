import { Capacitor } from '@capacitor/core';

function resolveApiUrl(): string {
  // On Android (emulator) the host machine is reachable at 10.0.2.2.
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    return 'http://10.0.2.2:5000';
  }
  // Web (ng serve / iOS simulator) talks to localhost.
  return 'http://localhost:5000';
}

export const API_URL = resolveApiUrl();