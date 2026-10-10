/**
 * ScarletHop Application Configuration
 *
 * GOOGLE MAPS API KEY CONFIGURATION:
 * 1. You can add your API key in `frontend/.env` as:
 *    VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
 *
 * 2. Or you can paste it directly below:
 */
export const GOOGLE_MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "") as string;

// Fallback CARTO key if used
export const CARTO_API_KEY = (import.meta.env.VITE_CARTO_API_KEY || "") as string;

/**
 * Google Maps Tile Provider URLs
 * Subdomains: mt0, mt1, mt2, mt3
 */
export const GOOGLE_MAPS_TILES = {
  roadmap: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
  satellite: 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
  hybrid: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
  terrain: 'https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
  traffic: 'https://{s}.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}',
  subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
};

/**
 * Helper to build Google Maps tile URL with optional API key
 */
export const getGoogleMapsTileUrl = (theme: 'roadmap' | 'satellite' | 'hybrid' | 'traffic' = 'roadmap', apiKey?: string): string => {
  const key = apiKey || GOOGLE_MAPS_API_KEY;
  const baseUrl = GOOGLE_MAPS_TILES[theme] || GOOGLE_MAPS_TILES.roadmap;
  if (key && key.trim() !== '') {
    return `${baseUrl}&key=${encodeURIComponent(key.trim())}`;
  }
  return baseUrl;
};
