/**
 * ScarletHop API Configuration
 *
 * Centralized API base URL that falls back to http://localhost:8000 for local desktop web development,
 * but allows overriding via VITE_API_BASE_URL for:
 *  - Native iOS / Android testing on physical devices or emulators (e.g. http://192.168.1.50:8000)
 *  - Cloud production deployments (e.g. https://your-backend.onrender.com)
 */
export const API_BASE_URL: string = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
).replace(/\/$/, '');
