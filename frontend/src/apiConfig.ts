/**
 * ScarletHop API Configuration
 *
 * Centralized API base URL:
 * 1. Uses VITE_API_BASE_URL if explicitly provided in .env
 * 2. If running in a web browser on a LAN IP or network hostname (e.g. 192.168.x.x or computer-name.local),
 *    automatically points to that same host on port 8000
 * 3. Otherwise defaults directly to http://127.0.0.1:8000 (avoiding IPv6 localhost resolution delays)
 */
const resolveBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/$/, '');
  }

  if (typeof window !== 'undefined' && window.location) {
    const { hostname } = window.location;
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.includes('capacitor')) {
      return `http://${hostname}:8000`;
    }
  }

  return 'http://127.0.0.1:8000';
};

export const API_BASE_URL: string = resolveBaseUrl();
