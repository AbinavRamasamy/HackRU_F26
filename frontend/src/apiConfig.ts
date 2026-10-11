import { Capacitor } from '@capacitor/core';

/**
 * ScarletHop API Configuration
 *
 * Automatically resolves the backend API base URL based on device type:
 * 1. Mobile devices (iOS/Android native Capacitor app or mobile browser):
 *    - Uses VITE_API_BASE_URL_MOBILE if provided in .env
 *    - Or automatically uses the host LAN IP (e.g. 10.75.175.144) on port 8000
 * 2. Laptop / Desktop (local development in desktop browser):
 *    - Uses VITE_API_BASE_URL_DESKTOP if provided in .env
 *    - Defaults to http://localhost:8000 (avoiding IPv6 resolution delays via 127.0.0.1 fallback)
 * 3. Master Override:
 *    - If VITE_API_BASE_URL is explicitly set, it will be used as a global override.
 */

/**
 * Detects whether the current client is a mobile device
 * (Capacitor native iOS/Android shell, mobile user agent, or touch mobile viewport).
 */
export const isMobileDevice = (): boolean => {
  // 1. Capacitor native shell (iOS / Android app)
  if (Capacitor.isNativePlatform()) {
    return true;
  }
  const platform = Capacitor.getPlatform();
  if (platform === 'ios' || platform === 'android') {
    return true;
  }

  // 2. Mobile User Agent check
  if (typeof navigator !== 'undefined') {
    const ua = (navigator.userAgent || navigator.vendor || '').toLowerCase();
    if (/android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(ua)) {
      return true;
    }
    // Modern iPad (iPadOS 13+) requests desktop Safari UA but supports touch points
    if (/macintosh/i.test(ua) && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1) {
      return true;
    }
  }

  // 3. Screen dimensions & touch pointer (phones/tablets in browser)
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    const isSmallScreen = window.innerWidth <= 820;
    if (isCoarse && isSmallScreen) {
      return true;
    }
  }

  return false;
};

/**
 * Returns the detected device category: 'mobile' or 'desktop'
 */
export const getDeviceType = (): 'mobile' | 'desktop' => {
  return isMobileDevice() ? 'mobile' : 'desktop';
};

/**
 * Resolves the appropriate backend API base URL based on device type.
 */
export const resolveBaseUrl = (): string => {
  const genericEnvUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  const mobileEnvUrl = import.meta.env.VITE_API_BASE_URL_MOBILE?.trim();
  const desktopEnvUrl = import.meta.env.VITE_API_BASE_URL_DESKTOP?.trim();

  // If a global override is explicitly configured (e.g. production cloud URL):
  if (genericEnvUrl) {
    return genericEnvUrl.replace(/\/$/, '');
  }

  const isMobile = isMobileDevice();

  if (isMobile) {
    if (mobileEnvUrl) {
      return mobileEnvUrl.replace(/\/$/, '');
    }

    // If running in a mobile web browser, use current host's LAN IP if available
    if (typeof window !== 'undefined' && window.location) {
      const { hostname } = window.location;
      if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.includes('capacitor')) {
        return `http://${hostname}:8000`;
      }
    }

    // Default LAN IP fallback for mobile (e.g. physical device or Capacitor simulator)
    return 'http://10.75.175.144:8000';
  }

  // Laptop / Desktop environment:
  if (desktopEnvUrl) {
    return desktopEnvUrl.replace(/\/$/, '');
  }

  return 'http://localhost:8000';
};

export const API_BASE_URL: string = resolveBaseUrl();

// Debug log to browser/Capacitor console for instant verification
if (typeof console !== 'undefined' && console.log) {
  console.log(`[ScarletHop] Target API Base URL: ${API_BASE_URL} (Device: ${getDeviceType()})`);
}

