import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Navigation,
  Layers,
  ExternalLink,
  X,
  MapPin,
  Clock,
  ArrowRight,
  LocateFixed
} from 'lucide-react';
import { GOOGLE_MAPS_TILES, getGoogleMapsTileUrl } from './config';
import { fetchLiveRoute, type LiveRouteResult } from './routingService';
import {
  findNearestBusStop,
  resolveLocationCoords,
  getHaversineDistanceMeters,
  getRouteColorInfo,
  getStopShortCode,
  getStopsForRoute,
  getRouteSegmentStops,
  RUTGERS_BUS_STOPS,
  type BusStop
} from './transitDirectory';
import type { ClassItem, UpcomingClassResult } from './calendarSync';

export interface TransitMapProps {
  buses: any[];
  originCampus: string;
  destCampus: string;
  currentLocation?: string;
  targetLocation?: string;
  onSelectTargetLocation?: (loc: string) => void;
  selectedRoute: any | null;
  onSelectCampus?: (campus: string) => void;
  onClearSelectedRoute?: () => void;
  onSelectRoute?: (route: any) => void;
  planResult?: any;
  googleMapsApiKey?: string;
  appTheme?: 'dark' | 'light';
  onSwitchToRoutes?: () => void;
  classes?: ClassItem[];
  upcomingClassInfo?: UpcomingClassResult;
  onAutoRouteToNextClass?: () => void;
  userLocation?: { lat: number; lon: number } | null;
  zoomToLocationTrigger?: number;
}

export const CAMPUS_COORDINATES: Record<string, { lat: number; lon: number; name: string; desc: string }> = {
  "Busch": { lat: 40.5238, lon: -74.45826, name: "Busch Campus", desc: "Busch Student Center, Hill Center, Science Bldg, ARC" },
  "Livingston": { lat: 40.524, lon: -74.43663, name: "Livingston Campus", desc: "Livingston Plaza, Student Center, Quads" },
  "College Ave": { lat: 40.50366, lon: -74.4524, name: "College Avenue Campus", desc: "College Ave Student Center, The Yard, SAC, SoCam" },
  "Cook": { lat: 40.48551, lon: -74.4372, name: "Cook / Douglass Campus", desc: "College Hall, Red Oak Lane, Biel, Gibbons" }
};

// Normalized key getter
export const getCampusKey = (campusName: string): string => {
  if (!campusName) return "Busch";
  const c = campusName.toLowerCase();
  if (c.includes("col")) return "College Ave";
  if (c.includes("liv")) return "Livingston";
  if (c.includes("bus")) return "Busch";
  if (c.includes("cook") || c.includes("doug")) return "Cook";
  return "Busch";
};

// Fallback path coordinates connecting campuses along Rutgers transit highways
export const getFallbackRouteGeometry = (
  origin: string,
  dest: string,
  isBike: boolean = false,
  boardingStop?: BusStop,
  dropoffStop?: BusStop,
  routeName?: string
): [number, number][] => {
  if (boardingStop && dropoffStop) {
    const segmentStops = getRouteSegmentStops(routeName, boardingStop.name, dropoffStop.name);
    if (segmentStops.length >= 2) {
      return segmentStops.map(s => [s.lat, s.lon] as [number, number]);
    }
    if (boardingStop.lat !== dropoffStop.lat || boardingStop.lon !== dropoffStop.lon) {
      return [
        [boardingStop.lat, boardingStop.lon],
        [dropoffStop.lat, dropoffStop.lon]
      ];
    }
  }

  const o = getCampusKey(origin);
  const d = getCampusKey(dest);

  if (o === d) {
    const pt = CAMPUS_COORDINATES[o];
    return [[pt.lat, pt.lon], [pt.lat + 0.002, pt.lon + 0.002]];
  }

  if (isBike) {
    if ((o === "Busch" && d === "College Ave") || (o === "College Ave" && d === "Busch")) {
      const pts: [number, number][] = [
        [40.5233, -74.4586],
        [40.5160, -74.4640],
        [40.5090, -74.4610],
        [40.5055, -74.4540],
        [40.5028, -74.4518]
      ];
      return o === "Busch" ? pts : [...pts].reverse();
    }
  }

  const pairs: Record<string, [number, number][]> = {
    "Busch-Livingston": [
      [40.5233, -74.4586],
      [40.5245, -74.4480],
      [40.5238, -74.4420],
      [40.5241, -74.4357]
    ],
    "Busch-College Ave": [
      [40.5233, -74.4586],
      [40.5185, -74.4530],
      [40.5110, -74.4510],
      [40.5050, -74.4490],
      [40.5028, -74.4518]
    ],
    "Livingston-College Ave": [
      [40.5241, -74.4357],
      [40.5195, -74.4400],
      [40.5125, -74.4450],
      [40.5060, -74.4500],
      [40.5028, -74.4518]
    ],
    "College Ave-Cook": [
      [40.5028, -74.4518],
      [40.4955, -74.4445],
      [40.4900, -74.4410],
      [40.4851, -74.4376]
    ],
    "Busch-Cook": [
      [40.5233, -74.4586],
      [40.5140, -74.4470],
      [40.4980, -74.4430],
      [40.4851, -74.4376]
    ],
    "Livingston-Cook": [
      [40.5241, -74.4357],
      [40.5150, -74.4410],
      [40.4980, -74.4430],
      [40.4851, -74.4376]
    ]
  };

  const key1 = `${o}-${d}`;
  const key2 = `${d}-${o}`;

  if (pairs[key1]) return pairs[key1];
  if (pairs[key2]) return [...pairs[key2]].reverse();

  return [
    [CAMPUS_COORDINATES[o].lat, CAMPUS_COORDINATES[o].lon],
    [CAMPUS_COORDINATES[d].lat, CAMPUS_COORDINATES[d].lon]
  ];
};

// Calculate dynamic arrival clock (e.g. 5:18 PM)
const getArrivalClock = (minutes: number) => {
  const d = new Date();
  d.setMinutes(d.getMinutes() + (minutes || 15));
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

export const TransitMap: React.FC<TransitMapProps> = ({
  buses,
  originCampus,
  destCampus,
  currentLocation,
  targetLocation,
  onSelectTargetLocation,
  selectedRoute,
  onSelectCampus,
  onClearSelectedRoute,
  onSelectRoute,
  planResult,
  googleMapsApiKey,
  appTheme = 'dark',
  onSwitchToRoutes,
  classes = [],
  upcomingClassInfo,
  onAutoRouteToNextClass,
  userLocation,
  zoomToLocationTrigger
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);

  // Map Provider Themes: Google Maps Dark (default in dark mode), Google Maps Standard (default in light mode), Google Satellite
  const [mapTheme, setMapTheme] = useState<'google-dark' | 'google-standard' | 'google-satellite'>(
    appTheme === 'light' ? 'google-standard' : 'google-dark'
  );

  // Automatically sync map style when app theme toggles
  useEffect(() => {
    setMapTheme(appTheme === 'light' ? 'google-standard' : 'google-dark');
  }, [appTheme]);

  const prevRouteFitKeyRef = useRef<string | null>(null);
  // Live real-time road route fetched via Google Maps API or free OSRM engine
  const [liveRoute, setLiveRoute] = useState<LiveRouteResult | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(13);
  const currentZoomThreshold = 14.5;
  const isZoomedOut = currentZoom < currentZoomThreshold;

  // 1. DYNAMIC NEAREST-STOP CALCULATION (ZERO HARDCODING):
  // Dynamically resolve exact coordinates for current location and target location/building
  const origTarget = React.useMemo(() => {
    return resolveLocationCoords(currentLocation || originCampus, originCampus);
  }, [currentLocation, originCampus]);

  const destTarget = React.useMemo(() => {
    return resolveLocationCoords(targetLocation || destCampus, destCampus);
  }, [targetLocation, destCampus]);

  // Geodesic distance minimization against all candidate stops served by the route (or explicit stop from selected itinerary)
  const boardingStop: BusStop = React.useMemo(() => {
    if (selectedRoute?.stop_name) {
      const explicitStop = RUTGERS_BUS_STOPS.find(s =>
        s.name.toLowerCase() === selectedRoute.stop_name.toLowerCase() ||
        s.name.toLowerCase().includes(selectedRoute.stop_name.toLowerCase()) ||
        selectedRoute.stop_name.toLowerCase().includes(s.name.toLowerCase())
      );
      if (explicitStop) return explicitStop;
    }
    return findNearestBusStop(origTarget, origTarget.campus || originCampus, selectedRoute?.name);
  }, [origTarget, originCampus, selectedRoute?.name, selectedRoute?.stop_name]);

  const dropoffStop: BusStop = React.useMemo(() => {
    return findNearestBusStop(destTarget, destTarget.campus || destCampus, selectedRoute?.name);
  }, [destTarget, destCampus, selectedRoute?.name]);

  // All stops along the selected route sequence for the interactive stop buttons
  const routeStops = React.useMemo(() => {
    if (!selectedRoute?.name) return [];
    return getStopsForRoute(selectedRoute.name);
  }, [selectedRoute?.name]);

  // Stops strictly on the active journey segment between boarding and drop-off
  const routeSegmentStops = React.useMemo(() => {
    if (!selectedRoute?.name) return [];
    return getRouteSegmentStops(selectedRoute.name, boardingStop.name, dropoffStop.name);
  }, [selectedRoute?.name, boardingStop.name, dropoffStop.name]);

  const isBike = React.useMemo(() => {
    return (selectedRoute?.type || '').toLowerCase().includes('bike') ||
      (selectedRoute?.name || '').toLowerCase().includes('bike') ||
      (selectedRoute?.name || '').toLowerCase().includes('scooter');
  }, [selectedRoute]);

  const walkDistMeters = React.useMemo(() => {
    return getHaversineDistanceMeters(dropoffStop.lat, dropoffStop.lon, destTarget.lat, destTarget.lon);
  }, [dropoffStop, destTarget]);


  // Global click delegate for Leaflet HTML popups
  useEffect(() => {
    (window as any).__selectTransitStop = (name: string) => {
      if (onSelectTargetLocation) {
        onSelectTargetLocation(name);
      }
    };
    return () => {
      delete (window as any).__selectTransitStop;
    };
  }, [onSelectTargetLocation]);

  // Fetch actual live road / pedestrian routing from origin to destination
  useEffect(() => {
    if (!selectedRoute) {
      setLiveRoute(null);
      return;
    }

    const isPureWalk = (selectedRoute.type || '').toLowerCase() === 'walking path' ||
      (selectedRoute.name || '').toLowerCase() === 'campus pedestrian walk' ||
      (selectedRoute.name || '').toLowerCase() === 'direct walk' ||
      (selectedRoute.name || '').toLowerCase() === 'campus walk' ||
      ((selectedRoute.type || '').toLowerCase().includes('walk') && !(selectedRoute.type || '').toLowerCase().includes('bus'));
    const isBike = (selectedRoute.type || '').toLowerCase().includes('bike') ||
      (selectedRoute.name || '').toLowerCase().includes('bike') ||
      (selectedRoute.name || '').toLowerCase().includes('scooter');
    const isCar = (selectedRoute.name || '').toLowerCase().includes('knight') ||
      (selectedRoute.name || '').toLowerCase().includes('escort');
    const mode: 'bus' | 'bike' | 'car' | 'walk' = isPureWalk ? 'walk' : isBike ? 'bike' : isCar ? 'car' : 'bus';

    const originLat = isPureWalk ? (userLocation?.lat ?? origTarget.lat) : boardingStop.lat;
    const originLon = isPureWalk ? (userLocation?.lon ?? origTarget.lon) : boardingStop.lon;
    const destLat = isPureWalk ? destTarget.lat : dropoffStop.lat;
    const destLon = isPureWalk ? destTarget.lon : dropoffStop.lon;

    fetchLiveRoute(originLat, originLon, destLat, destLon, mode, selectedRoute.name)
      .then((res) => {
        setLiveRoute(res);
      })
      .catch((err) => {
        console.warn("Failed to fetch live route:", err);
      });
  }, [
    selectedRoute,
    boardingStop.lat,
    boardingStop.lon,
    dropoffStop.lat,
    dropoffStop.lon,
    userLocation?.lat,
    userLocation?.lon,
    origTarget.lat,
    origTarget.lon,
    destTarget.lat,
    destTarget.lon
  ]);

  const isSelectedWalk = (selectedRoute?.type || '').toLowerCase().includes('walk') ||
    (selectedRoute?.name || '').toLowerCase().includes('walk') ||
    (selectedRoute?.name || '').toLowerCase().includes('pedestrian');

  const walkingDistMeters = getHaversineDistanceMeters(
    userLocation?.lat ?? origTarget.lat,
    userLocation?.lon ?? origTarget.lon,
    destTarget.lat,
    destTarget.lon
  );
  const fallbackWalkingMinutes = Math.max(1, Math.round(walkingDistMeters / 80.4));

  const effectiveDurationMinutes = isSelectedWalk
    ? (liveRoute?.durationMinutes || selectedRoute?.estimated_minutes || fallbackWalkingMinutes)
    : (selectedRoute?.estimated_minutes || liveRoute?.durationMinutes || 16);
  const effectiveDistanceMiles = liveRoute?.distanceMiles || (isSelectedWalk ? Number((walkingDistMeters * 0.000621371).toFixed(1)) : 2.4);

  // Helper to create Google Maps tile layer
  const createGoogleTileLayer = (theme: typeof mapTheme) => {
    if (theme === 'google-satellite') {
      return L.tileLayer(getGoogleMapsTileUrl('hybrid', googleMapsApiKey), {
        maxZoom: 20,
        subdomains: GOOGLE_MAPS_TILES.subdomains
      });
    }

    if (theme === 'google-standard') {
      return L.tileLayer(getGoogleMapsTileUrl('roadmap', googleMapsApiKey), {
        maxZoom: 20,
        subdomains: GOOGLE_MAPS_TILES.subdomains,
        className: 'google-maps-standard-tiles'
      });
    }

    // Default: Google Maps in Dark Mode
    return L.tileLayer(getGoogleMapsTileUrl('roadmap', googleMapsApiKey), {
      maxZoom: 20,
      subdomains: GOOGLE_MAPS_TILES.subdomains,
      className: 'google-maps-dark-tiles'
    });
  };

  // Initialize Leaflet map with Google Maps provider
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Centered around Rutgers University New Brunswick
    const map = L.map(mapContainerRef.current, {
      center: [40.5100, -74.4480],
      zoom: 13,
      zoomControl: false,
      attributionControl: false
    });

    const googleTiles = createGoogleTileLayer('google-dark');
    googleTiles.addTo(map);
    tileLayerRef.current = googleTiles;

    // Zoom control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Track zoom events to smoothly toggle between overall campus view and inner stop view
    const onZoom = () => {
      setCurrentZoom(map.getZoom());
    };
    map.on('zoomend', onZoom);
    map.on('zoom', onZoom);
    setCurrentZoom(map.getZoom());

    markersLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Responsive: Invalidate map bounds on container resize (mobile tab changes / orientation changes)
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    const onWindowResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', onWindowResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', onWindowResize);
      map.off('zoomend', onZoom);
      map.off('zoom', onZoom);
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  // Update Google Maps Tiles when theme toggles
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const newTiles = createGoogleTileLayer(mapTheme);
    newTiles.addTo(map);
    tileLayerRef.current = newTiles;
  }, [mapTheme, googleMapsApiKey]);

  // Zoom to Current User Location when triggered by location pill click
  useEffect(() => {
    if (!zoomToLocationTrigger) return;
    const map = mapInstanceRef.current;
    if (!map) return;

    let targetLat: number | null = null;
    let targetLon: number | null = null;

    if (userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lon === 'number') {
      targetLat = userLocation.lat;
      targetLon = userLocation.lon;
    } else if (origTarget && typeof origTarget.lat === 'number' && typeof origTarget.lon === 'number') {
      targetLat = origTarget.lat;
      targetLon = origTarget.lon;
    } else {
      const campKey = getCampusKey(originCampus);
      if (CAMPUS_COORDINATES[campKey]) {
        targetLat = CAMPUS_COORDINATES[campKey].lat;
        targetLon = CAMPUS_COORDINATES[campKey].lon;
      }
    }

    if (targetLat !== null && targetLon !== null) {
      map.flyTo([targetLat, targetLon], 16.5, {
        animate: true,
        duration: 1.1
      });
      setCurrentZoom(16.5);
    }
  }, [zoomToLocationTrigger, userLocation, origTarget, originCampus]);

  // Update Campus Markers, Bus Stop Navigation Pins & Real-time Bus Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    const isLight = appTheme === 'light';
    const markerBg = isLight ? 'rgba(255, 255, 255, 0.94)' : 'rgba(28, 28, 30, 0.94)';
    const textPrimary = isLight ? '#0F172A' : '#FFFFFF';
    const textSecondary = isLight ? '#475569' : 'rgba(255, 255, 255, 0.85)';
    const shadowColor = isLight ? 'rgba(15, 23, 42, 0.12)' : 'rgba(0, 0, 0, 0.65)';
    const destAccent = isLight ? '#0A84FF' : '#FF375F';

    // 0. Current User GPS Location Marker (Apple-style Pulsing Blue Dot)
    if (userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lon === 'number') {
      const userDotIcon = L.divIcon({
        className: 'apple-user-location-marker',
        html: `
          <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%); pointer-events: auto;">
            <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: rgba(10, 132, 255, 0.35); animation: pulseUserHalo 2s infinite ease-out;"></div>
            <div style="position: absolute; width: 14px; height: 14px; border-radius: 50%; background: #0A84FF; border: 2.5px solid #FFFFFF; box-shadow: 0 2px 10px rgba(10, 132, 255, 0.75);"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const userMarker = L.marker([userLocation.lat, userLocation.lon], {
        icon: userDotIcon,
        zIndexOffset: 10000
      });
      userMarker.bindPopup(`
        <div style="font-family: -apple-system, sans-serif; color: #1c1c1e; padding: 2px;">
          <div style="font-size: 12px; font-weight: 700; color: #0A84FF;">📍 Current Location</div>
          <div style="font-size: 11px; color: #444; margin-top: 2px;">${currentLocation || originCampus}</div>
        </div>
      `);
      markersGroup.addLayer(userMarker);
    }

    // 1. When Zoomed Out (< 14.5) AND no specific route is active: show overall campus names overview
    const showCampusOverview = !selectedRoute && isZoomedOut;
    if (showCampusOverview) {
      Object.entries(CAMPUS_COORDINATES).forEach(([key, info]) => {
        const isOrigin = getCampusKey(originCampus) === key;
        const isDest = getCampusKey(destCampus) === key;

        const badgeColor = isOrigin ? '#30D158' : isDest ? destAccent : '#0A84FF';
        const label = isOrigin ? 'START' : isDest ? 'DEST' : 'CAMPUS';

        const campusIcon = L.divIcon({
          className: 'apple-campus-overview-marker',
          html: `
            <div style="
              display: flex;
              align-items: center;
              gap: 6px;
              padding: 5px 12px;
              background: ${markerBg};
              backdrop-filter: blur(20px);
              -webkit-backdrop-filter: blur(20px);
              border: 1.5px solid ${isOrigin || isDest ? badgeColor : (isLight ? 'rgba(15,23,42,0.14)' : 'rgba(255,255,255,0.2)')};
              box-shadow: 0 4px 18px ${shadowColor}, 0 0 14px ${isOrigin || isDest ? badgeColor + '77' : 'transparent'};
              border-radius: 9999px;
              cursor: pointer;
              white-space: nowrap;
              transform: translate(-50%, -50%);
            ">
              <span style="
                width: 9px;
                height: 9px;
                border-radius: 50%;
                background: ${badgeColor};
                box-shadow: 0 0 10px ${badgeColor};
              "></span>
              <span style="font-size: 12.5px; font-weight: 700; color: ${textPrimary}; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                ${key}
              </span>
              ${(isOrigin || isDest) && selectedRoute ? `
                <span style="
                  font-size: 9.5px;
                  font-weight: 800;
                  color: ${isOrigin ? '#000' : '#fff'};
                  background: ${badgeColor};
                  padding: 1.5px 6px;
                  border-radius: 4px;
                ">${label}</span>
              ` : ''}
            </div>
          `,
          iconSize: [120, 30],
          iconAnchor: [60, 15]
        });

        const marker = L.marker([info.lat, info.lon], { icon: campusIcon });
        marker.on('click', () => {
          if (onSelectCampus) onSelectCampus(key);
        });
        markersGroup.addLayer(marker);
      });
    } else {
      // 2. Zoomed In (>= 14.75): Show detailed inner locations (Boarding, Dropoff, Intermediate stops, Destination building)
      if (selectedRoute) {
        const isWalk = (selectedRoute.type || '').toLowerCase().includes('walk') ||
          (selectedRoute.name || '').toLowerCase().includes('walk') ||
          (selectedRoute.name || '').toLowerCase().includes('pedestrian');

        if (isWalk) {
          // Walking Route: Direct pedestrian navigation between buildings
          const startCode = getStopShortCode(origTarget.name) || origTarget.name;
          const startIcon = L.divIcon({
            className: 'apple-campus-map-marker',
            html: `
              <div style="
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 2.5px 8px 2.5px 4px;
                background: ${markerBg};
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1.5px solid #30D158;
                box-shadow: 0 4px 14px ${shadowColor}, 0 0 10px rgba(48, 209, 88, 0.4);
                border-radius: 9999px;
                cursor: pointer;
                transform: translate(-50%, -50%);
                white-space: nowrap;
              ">
                <span style="font-size: 11px;">🟢</span>
                <span style="font-size: 11px; font-weight: 700; color: ${textPrimary}; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                  ${startCode}
                </span>
              </div>
            `,
            iconSize: [60, 24],
            iconAnchor: [30, 12]
          });
          const startMarker = L.marker([origTarget.lat, origTarget.lon], { icon: startIcon });
          startMarker.bindPopup(`
            <div style="font-family: -apple-system, sans-serif; color: #1c1c1e; padding: 2px;">
              <div style="font-size: 12.5px; font-weight: 700; color: #30D158;">🟢 Walk Start</div>
              <div style="font-size: 12px; font-weight: 600; margin-top: 2px;">${origTarget.name}</div>
            </div>
          `);
          markersGroup.addLayer(startMarker);

          const destCode = getStopShortCode(destTarget.name) || destTarget.name;
          const destBuildingIcon = L.divIcon({
            className: 'google-dest-building-marker',
            html: `
              <div style="
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 2.5px 8px;
                background: ${markerBg};
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1.5px solid #0A84FF;
                box-shadow: 0 4px 14px ${shadowColor}, 0 0 10px rgba(10, 132, 255, 0.4);
                border-radius: 9999px;
                cursor: pointer;
                transform: translate(-50%, -50%);
                white-space: nowrap;
              ">
                <span style="font-size: 11px;">🏁</span>
                <span style="font-size: 11px; font-weight: 700; color: ${textPrimary}; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                  ${destCode}
                </span>
              </div>
            `,
            iconSize: [60, 24],
            iconAnchor: [30, 12]
          });
          const dMarker = L.marker([destTarget.lat, destTarget.lon], { icon: destBuildingIcon });
          dMarker.bindPopup(`
            <div style="font-family: -apple-system, sans-serif; color: #1c1c1e; padding: 2px;">
              <div style="font-size: 12.5px; font-weight: 700; color: #0A84FF;">🏁 Walk Destination</div>
              <div style="font-size: 12px; font-weight: 600; margin-top: 2px;">${destTarget.name}</div>
            </div>
          `);
          markersGroup.addLayer(dMarker);
        } else {
          // Transit / Bus Route: Boarding, Dropoff, and intermediate stop pins
          // Boarding Stop Marker (Compact Apple Icon Pin)
          const boardingCode = getStopShortCode(boardingStop.name);
          const boardingIcon = L.divIcon({
            className: 'apple-campus-map-marker',
            html: `
              <div style="
                display: inline-flex;
                align-items: center;
                gap: 3.5px;
                padding: 2.5px 7px 2.5px 3.5px;
                background: ${markerBg};
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1.5px solid #30D158;
                box-shadow: 0 4px 14px ${shadowColor}, 0 0 10px rgba(48, 209, 88, 0.4);
                border-radius: 9999px;
                cursor: pointer;
                transform: translate(-50%, -50%);
                white-space: nowrap;
              ">
                <span style="
                  width: 17px;
                  height: 17px;
                  border-radius: 50%;
                  background: #30D158;
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 9.5px;
                  color: #000;
                  font-weight: 900;
                ">▲</span>
                <span style="font-size: 11px; font-weight: 700; color: ${textPrimary}; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                  ${boardingCode}
                </span>
              </div>
            `,
            iconSize: [60, 24],
            iconAnchor: [30, 12]
          });
          const bMarker = L.marker([boardingStop.lat, boardingStop.lon], { icon: boardingIcon });
          bMarker.bindPopup(`
            <div style="font-family: -apple-system, sans-serif; color: #1c1c1e; padding: 2px;">
              <div style="font-size: 12.5px; font-weight: 700; color: #30D158;">🟢 Boarding Stop</div>
              <div style="font-size: 12px; font-weight: 600; margin-top: 2px;">${boardingStop.name}</div>
              <div style="font-size: 10.5px; color: #666; margin-top: 1px;">${boardingStop.campus} Campus</div>
            </div>
          `);
          markersGroup.addLayer(bMarker);

          // Drop-Off Stop Marker (Compact Apple Icon Pin)
          const dropoffCode = getStopShortCode(dropoffStop.name);
          const dropoffIcon = L.divIcon({
            className: 'apple-campus-map-marker',
            html: `
              <div style="
                display: inline-flex;
                align-items: center;
                gap: 3.5px;
                padding: 2.5px 7px 2.5px 3.5px;
                background: ${markerBg};
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1.5px solid ${destAccent};
                box-shadow: 0 4px 14px ${shadowColor}, 0 0 10px ${destAccent}66;
                border-radius: 9999px;
                cursor: pointer;
                transform: translate(-50%, -50%);
                white-space: nowrap;
              ">
                <span style="
                  width: 17px;
                  height: 17px;
                  border-radius: 50%;
                  background: ${destAccent};
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 9.5px;
                  color: #fff;
                  font-weight: 900;
                ">▼</span>
                <span style="font-size: 11px; font-weight: 700; color: ${textPrimary}; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                  ${dropoffCode}
                </span>
              </div>
            `,
            iconSize: [60, 24],
            iconAnchor: [30, 12]
          });
          const dMarker = L.marker([dropoffStop.lat, dropoffStop.lon], { icon: dropoffIcon });
          dMarker.bindPopup(`
            <div style="font-family: -apple-system, sans-serif; color: #1c1c1e; padding: 2px;">
              <div style="font-size: 12.5px; font-weight: 700; color: ${destAccent};">📍 Drop-off Stop</div>
              <div style="font-size: 12px; font-weight: 600; margin-top: 2px;">${dropoffStop.name}</div>
              <div style="font-size: 10.5px; color: #666; margin-top: 1px;">${dropoffStop.campus} Campus</div>
            </div>
          `);
          markersGroup.addLayer(dMarker);

          // Intermediate stops along the selected route (Interactive Apple Stop Glyphs)
          routeStops.forEach((st) => {
            if (st.name === boardingStop.name || st.name === dropoffStop.name) return;
            const code = getStopShortCode(st.name);
            const isOnSegment = routeSegmentStops.some(s => s.name.toLowerCase() === st.name.toLowerCase());

            const stopGlyphIcon = L.divIcon({
              className: 'apple-stop-glyph-marker',
              html: `
                <div style="
                  display: inline-flex;
                  align-items: center;
                  gap: 3px;
                  padding: 2.5px 6px;
                  background: ${markerBg};
                  backdrop-filter: blur(16px);
                  border: ${isOnSegment ? '1.5px solid #0A84FF' : (isLight ? '1px solid rgba(15, 23, 42, 0.14)' : '1px solid rgba(255, 255, 255, 0.22)')};
                  border-radius: 9999px;
                  box-shadow: ${isOnSegment ? `0 2px 10px rgba(10, 132, 255, 0.4), 0 2px 8px ${shadowColor}` : `0 2px 8px ${shadowColor}`};
                  cursor: pointer;
                  transform: translate(-50%, -50%);
                  white-space: nowrap;
                ">
                  <span style="font-size: 9.5px;">🚏</span>
                  <span style="font-size: 9.5px; font-weight: ${isOnSegment ? '700' : '600'}; color: ${isOnSegment ? '#0A84FF' : textSecondary}; font-family: -apple-system, sans-serif;">
                    ${code}
                  </span>
                </div>
              `,
              iconSize: [52, 22],
              iconAnchor: [26, 11]
            });

            const sMarker = L.marker([st.lat, st.lon], { icon: stopGlyphIcon });
            sMarker.on('click', () => {
              if (onSelectTargetLocation) {
                onSelectTargetLocation(st.name);
              }
            });
            sMarker.bindPopup(`
              <div style="font-family: -apple-system, sans-serif; color: #1c1c1e; padding: 2px;">
                <div style="font-size: 12px; font-weight: 700; color: #0A84FF;">🚏 ${st.name}</div>
                <div style="font-size: 10.5px; color: #666; margin-top: 2px;">Route ${selectedRoute.name} Stop</div>
                <button onclick="window.__selectTransitStop && window.__selectTransitStop('${st.name}')" style="
                  margin-top: 6px;
                  width: 100%;
                  padding: 4px 8px;
                  background: #0A84FF;
                  color: #fff;
                  border: none;
                  border-radius: 6px;
                  font-size: 11px;
                  font-weight: 700;
                  cursor: pointer;
                ">
                  Route to this Stop ➔
                </button>
              </div>
            `);
            markersGroup.addLayer(sMarker);
          });

          // Final Target Destination Building Marker (if separate structure from bus stop)
          if (walkDistMeters > 35 && destTarget.name !== dropoffStop.name) {
            const destCode = getStopShortCode(destTarget.name) || destTarget.name;
            const destBuildingIcon = L.divIcon({
              className: 'google-dest-building-marker',
              html: `
                <div style="
                  display: inline-flex;
                  align-items: center;
                  gap: 4px;
                  padding: 2.5px 7px;
                  background: ${markerBg};
                  border: 1.5px solid #0A84FF;
                  border-radius: 9999px;
                  box-shadow: 0 4px 14px ${shadowColor};
                  white-space: nowrap;
                  transform: translate(-50%, -50%);
                ">
                  <span style="font-size: 10px;">🏁</span>
                  <span style="font-size: 10.5px; font-weight: 700; color: ${textPrimary}; font-family: -apple-system, sans-serif;">
                    ${destCode}
                  </span>
                </div>
              `,
              iconSize: [60, 24],
              iconAnchor: [30, 12]
            });
            markersGroup.addLayer(L.marker([destTarget.lat, destTarget.lon], { icon: destBuildingIcon }));
          }
        }

        // Render all other network stops in RUTGERS_BUS_STOPS so stops like Quads, Science Building, etc. are always present
        const renderedStopNames = isWalk
          ? new Set<string>()
          : new Set([
              boardingStop.name.toLowerCase(),
              dropoffStop.name.toLowerCase(),
              ...routeStops.map(s => s.name.toLowerCase())
            ]);

        RUTGERS_BUS_STOPS.forEach((st) => {
          if (renderedStopNames.has(st.name.toLowerCase())) return;
          if (st.name.includes('(SB)') || st.name.includes('(NB)')) return;

          const code = getStopShortCode(st.name);
          const otherStopIcon = L.divIcon({
            className: 'apple-stop-network-marker',
            html: `
              <div style="
                display: inline-flex;
                align-items: center;
                gap: 2.5px;
                padding: 2px 5.5px;
                background: ${markerBg};
                backdrop-filter: blur(14px);
                border: 1px solid ${isLight ? 'rgba(15, 23, 42, 0.14)' : 'rgba(255, 255, 255, 0.2)'};
                border-radius: 9999px;
                box-shadow: 0 2px 6px ${shadowColor};
                cursor: pointer;
                transform: translate(-50%, -50%);
                white-space: nowrap;
              ">
                <span style="font-size: 8.5px;">🚏</span>
                <span style="font-size: 9px; font-weight: 600; color: ${textSecondary}; font-family: -apple-system, sans-serif;">
                  ${code}
                </span>
              </div>
            `,
            iconSize: [50, 20],
            iconAnchor: [25, 10]
          });

          const oMarker = L.marker([st.lat, st.lon], { icon: otherStopIcon });
          oMarker.on('click', () => {
            if (onSelectTargetLocation) onSelectTargetLocation(st.name);
          });
          oMarker.bindPopup(`
            <div style="font-family: -apple-system, sans-serif; color: #1c1c1e; padding: 2px;">
              <div style="font-size: 12px; font-weight: 700; color: #0A84FF;">🚏 ${st.name}</div>
              <div style="font-size: 10.5px; color: #666; margin-top: 2px;">${st.campus} Campus</div>
              <div style="font-size: 9.5px; color: #888; margin-top: 1px;">Routes: ${st.routes.join(', ')}</div>
              <button onclick="window.__selectTransitStop && window.__selectTransitStop('${st.name}')" style="
                margin-top: 6px;
                width: 100%;
                padding: 4px 8px;
                background: #0A84FF;
                color: #fff;
                border: none;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 700;
                cursor: pointer;
              ">
                Route to this Stop ➔
              </button>
            </div>
          `);
          markersGroup.addLayer(oMarker);
        });
      } else {
        // No active route selected: render all Rutgers bus stops (Quads, Science Building, BSC, LSC, The Yard, etc.)
        RUTGERS_BUS_STOPS.forEach((st) => {
          if (st.name.includes('(SB)') || st.name.includes('(NB)')) return;

          const code = getStopShortCode(st.name);
          const stopGlyphIcon = L.divIcon({
            className: 'apple-stop-glyph-marker',
            html: `
              <div style="
                display: inline-flex;
                align-items: center;
                gap: 3px;
                padding: 2.5px 6px;
                background: ${markerBg};
                backdrop-filter: blur(16px);
                border: 1px solid ${isLight ? 'rgba(15, 23, 42, 0.14)' : 'rgba(255, 255, 255, 0.22)'};
                border-radius: 9999px;
                box-shadow: 0 2px 8px ${shadowColor};
                cursor: pointer;
                transform: translate(-50%, -50%);
                white-space: nowrap;
              ">
                <span style="font-size: 9.5px;">🚏</span>
                <span style="font-size: 9.5px; font-weight: 600; color: ${textSecondary}; font-family: -apple-system, sans-serif;">
                  ${code}
                </span>
              </div>
            `,
            iconSize: [52, 22],
            iconAnchor: [26, 11]
          });

          const sMarker = L.marker([st.lat, st.lon], { icon: stopGlyphIcon });
          sMarker.on('click', () => {
            if (onSelectTargetLocation) onSelectTargetLocation(st.name);
          });
          sMarker.bindPopup(`
            <div style="font-family: -apple-system, sans-serif; color: #1c1c1e; padding: 2px;">
              <div style="font-size: 12px; font-weight: 700; color: #0A84FF;">🚏 ${st.name}</div>
              <div style="font-size: 10.5px; color: #666; margin-top: 2px;">${st.campus} Campus</div>
              <div style="font-size: 9.5px; color: #888; margin-top: 1px;">Routes: ${st.routes.join(', ')}</div>
              <button onclick="window.__selectTransitStop && window.__selectTransitStop('${st.name}')" style="
                margin-top: 6px;
                width: 100%;
                padding: 4px 8px;
                background: #0A84FF;
                color: #fff;
                border: none;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 700;
                cursor: pointer;
              ">
                Route to this Stop ➔
              </button>
            </div>
          `);
          markersGroup.addLayer(sMarker);
        });
      }
    }

    // 2. Real-time Live Buses Markers (Color-coded using official Transitstat.us palette)
    buses.forEach((b) => {
      if (!b.lat || !b.lon) return;

      const colorInfo = getRouteColorInfo(b.route);

      const busIcon = L.divIcon({
        className: 'apple-bus-map-marker',
        html: `
          <div style="
            display: inline-flex;
            align-items: center;
            gap: 3px;
            padding: 2.5px 7px;
            background: ${colorInfo.bg};
            color: ${colorInfo.text};
            font-size: 10px;
            font-weight: 800;
            font-family: -apple-system, sans-serif;
            border-radius: 6px;
            box-shadow: 0 3px 12px rgba(0,0,0,0.55), 0 0 12px ${colorInfo.bg}77;
            cursor: pointer;
            transform: translate(-50%, -50%);
            white-space: nowrap;
          ">
            <span>🚌</span>
            <span>${colorInfo.shortName}</span>
            <span style="opacity: 0.92; font-weight: 600; font-size: 9px; margin-left: 2px;">${b.eta_mins}m</span>
          </div>
        `,
        iconSize: [56, 22],
        iconAnchor: [28, 11]
      });

      const marker = L.marker([b.lat, b.lon], { icon: busIcon });
      marker.bindPopup(`
        <div style="font-family: -apple-system, sans-serif; color: #1c1c1e; padding: 2px;">
          <div style="font-size: 13px; font-weight: 700; color: ${colorInfo.bg};">Route ${b.route}</div>
          <div style="font-size: 11px; font-weight: 600; margin-top: 2px;">To ${b.destination}</div>
          <div style="font-size: 10px; color: #666; margin-top: 2px;">Next: ${b.next_stop} • ETA: ${b.eta_mins} min</div>
          <div style="font-size: 10px; color: #10b981; font-weight: 600; margin-top: 3px;">● ${b.occupancy}</div>
        </div>
      `);
      markersGroup.addLayer(marker);
    });
  }, [buses, originCampus, destCampus, selectedRoute, boardingStop, dropoffStop, destTarget, origTarget, walkDistMeters, routeStops, routeSegmentStops, isZoomedOut, onSelectTargetLocation, onSelectCampus, userLocation, currentLocation]);

  // Handle Route Navigation Layer with Real Road Geometry & Walking Connectors
  useEffect(() => {
    const map = mapInstanceRef.current;
    const routeGroup = routeLayerRef.current;
    if (!map || !routeGroup) return;

    routeGroup.clearLayers();

    if (!selectedRoute) {
      return;
    }

    const isPureWalk = (selectedRoute.type || '').toLowerCase() === 'walking path' ||
      (selectedRoute.name || '').toLowerCase() === 'campus pedestrian walk' ||
      (selectedRoute.name || '').toLowerCase() === 'direct walk' ||
      (selectedRoute.name || '').toLowerCase() === 'campus walk' ||
      ((selectedRoute.type || '').toLowerCase().includes('walk') && !(selectedRoute.type || '').toLowerCase().includes('bus'));
    const isBike = (selectedRoute.type || '').toLowerCase().includes('bike') || (selectedRoute.name || '').toLowerCase().includes('bike');

    // Use actual road/pathway coordinates from live routing engine if loaded, else fallback
    const pathCoords: [number, number][] = (liveRoute && liveRoute.coordinates.length > 0)
      ? liveRoute.coordinates
      : isPureWalk
      ? [[userLocation?.lat ?? origTarget.lat, userLocation?.lon ?? origTarget.lon], [destTarget.lat, destTarget.lon]]
      : getFallbackRouteGeometry(originCampus, destCampus, isBike, boardingStop, dropoffStop, selectedRoute?.name);

    // Glowing navigation route line (transitstat.us route color, bike green, or pedestrian blue)
    const routeColor = isPureWalk ? '#0A84FF' : isBike ? '#34A853' : getRouteColorInfo(selectedRoute.name).bg;

    // Outer glow casing
    const glowPolyline = L.polyline(pathCoords, {
      color: routeColor,
      weight: isPureWalk ? 8 : 10,
      opacity: 0.45,
      lineCap: 'round',
      lineJoin: 'round'
    });

    // Core sharp road / footpath line
    const corePolyline = L.polyline(pathCoords, {
      color: '#FFFFFF',
      weight: 4.5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: isPureWalk ? '4, 6' : isBike ? '6, 8' : undefined
    });

    routeGroup.addLayer(glowPolyline);
    routeGroup.addLayer(corePolyline);

    // If taking a bus, draw pedestrian walking connectors from origin building to boarding stop and drop-off to dest building
    if (!isPureWalk) {
      const boardDistMeters = getHaversineDistanceMeters(
        userLocation?.lat ?? origTarget.lat,
        userLocation?.lon ?? origTarget.lon,
        boardingStop.lat,
        boardingStop.lon
      );
      if (boardDistMeters > 30 && origTarget.name !== boardingStop.name) {
        const walkToBoard = L.polyline([
          [userLocation?.lat ?? origTarget.lat, userLocation?.lon ?? origTarget.lon],
          [boardingStop.lat, boardingStop.lon]
        ], {
          color: '#30D158',
          weight: 3.5,
          opacity: 0.9,
          dashArray: '5, 7',
          lineCap: 'round',
          lineJoin: 'round'
        });
        routeGroup.addLayer(walkToBoard);
      }

      if (walkDistMeters > 35 && destTarget.name !== dropoffStop.name) {
        const walkPolyline = L.polyline([
          [dropoffStop.lat, dropoffStop.lon],
          [destTarget.lat, destTarget.lon]
        ], {
          color: '#FF9500',
          weight: 3.5,
          opacity: 0.9,
          dashArray: '5, 7',
          lineCap: 'round',
          lineJoin: 'round'
        });
        routeGroup.addLayer(walkPolyline);
      }
    }

    // Animated Traveler / Active Nav Pin along the real road path
    const midIdx = Math.floor(pathCoords.length / 2);
    const midCoord = pathCoords[midIdx] || pathCoords[0];

    const travelerIcon = L.divIcon({
      className: 'google-traveler-pin',
      html: `
        <div style="
          position: relative;
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: translate(-50%, -50%);
        ">
          <div style="
            position: absolute;
            width: 26px;
            height: 26px;
            border-radius: 50%;
            background: ${routeColor};
            opacity: 0.4;
            animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></div>
          <div style="
            position: relative;
            width: 15px;
            height: 15px;
            border-radius: 50%;
            background: #ffffff;
            border: 3.5px solid ${routeColor};
            box-shadow: 0 0 12px ${routeColor};
          "></div>
        </div>
      `,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });

    const travelerMarker = L.marker([midCoord[0], midCoord[1]], { icon: travelerIcon });
    routeGroup.addLayer(travelerMarker);

    // Animate bounds to smoothly fit the entire route path and its stops
    const liveCoordCount = liveRoute?.coordinates?.length || 0;
    const routeFitKey = `${selectedRoute?.name}_${originCampus}_${destCampus}_${boardingStop?.name}_${dropoffStop?.name}_${destTarget.name}_${origTarget.name}_${liveCoordCount}_${pathCoords.length}`;
    if (prevRouteFitKeyRef.current !== routeFitKey) {
      prevRouteFitKeyRef.current = routeFitKey;
      const bounds = L.latLngBounds(pathCoords);
      bounds.extend([boardingStop.lat, boardingStop.lon]);
      bounds.extend([dropoffStop.lat, dropoffStop.lon]);
      bounds.extend([origTarget.lat, origTarget.lon]);
      bounds.extend([destTarget.lat, destTarget.lon]);
      routeSegmentStops.forEach((st) => bounds.extend([st.lat, st.lon]));

      const isMobile = window.innerWidth <= 768;
      const paddingOptions = isMobile
        ? {
          paddingTopLeft: [24, 95] as [number, number],
          paddingBottomRight: [24, 110] as [number, number]
        }
        : {
          paddingTopLeft: [50, 70] as [number, number],
          paddingBottomRight: [50, 80] as [number, number]
        };

      map.fitBounds(bounds, {
        ...paddingOptions,
        maxZoom: 17,
        animate: true,
        duration: 0.8
      });
    }
  }, [
    selectedRoute,
    liveRoute,
    originCampus,
    destCampus,
    boardingStop,
    dropoffStop,
    origTarget,
    destTarget,
    routeSegmentStops,
    walkDistMeters,
    isBike
  ]);

  const isSelectedBike = (selectedRoute?.type || '').toLowerCase().includes('bike') ||
    (selectedRoute?.name || '').toLowerCase().includes('bike') ||
    (selectedRoute?.name || '').toLowerCase().includes('scooter');
  const isIntraCampus = originCampus === destCampus;

  // Determine if walking mode should be used in Google Maps
  const isPedestrian = isSelectedWalk || (!selectedRoute && isIntraCampus);
  const gmapsTravelMode = isPedestrian ? 'walking' : isSelectedBike ? 'bicycling' : 'transit';

  // Origin: exact GPS user coordinates if available, otherwise origin target building/stop
  const gmapsOriginLat = isPedestrian
    ? (userLocation?.lat ?? origTarget.lat)
    : (userLocation?.lat ?? boardingStop.lat);
  const gmapsOriginLon = isPedestrian
    ? (userLocation?.lon ?? origTarget.lon)
    : (userLocation?.lon ?? boardingStop.lon);

  // Destination: target destination building
  const gmapsDestLat = destTarget.lat;
  const gmapsDestLon = destTarget.lon;

  // Deep links to Google Maps directly with exact walking / biking / transit travelmode
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${gmapsOriginLat},${gmapsOriginLon}&destination=${gmapsDestLat},${gmapsDestLon}&travelmode=${gmapsTravelMode}`;

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      borderRadius: '20px',
      border: '1px solid var(--apple-border)',
      boxShadow: 'var(--apple-shadow-lg)'
    }}>
      {/* Map Canvas */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />

      {/* Top Left (Localhost) / Top (Mobile) Map Button: Next Class Route */}
      {!selectedRoute && (upcomingClassInfo?.nextClass || (classes && classes.length > 0)) && (() => {
        const targetClass = upcomingClassInfo?.nextClass || classes[0];
        if (!targetClass) return null;

        const isOnline = targetClass.location === '(Online)' || targetClass.campus === '(Online)';

        return (
          <div
            className="next-class-map-btn"
            onClick={() => {
              if (targetClass.zoom_link) {
                const safeZoomUrl = targetClass.zoom_link.startsWith('http://') || targetClass.zoom_link.startsWith('https://')
                  ? targetClass.zoom_link
                  : `https://${targetClass.zoom_link}`;
                window.open(safeZoomUrl, '_blank', 'noopener,noreferrer');
              } else if (!isOnline) {
                onAutoRouteToNextClass?.();
              }
            }}
            style={{
              padding: '9px 14px',
              borderRadius: '16px',
              background: 'var(--apple-accent-subtle)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid var(--apple-border-focus)',
              boxShadow: '0 8px 28px rgba(0, 0, 0, 0.45), 0 0 16px var(--apple-accent-glow)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: '10.5px',
                color: 'var(--apple-accent)',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '2px'
              }}>
                Next Class
              </div>
              <div style={{
                fontSize: '12.5px',
                fontWeight: 600,
                color: 'var(--apple-label-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {targetClass.course} • {targetClass.startTime} ({targetClass.campus || targetClass.location || 'Rutgers'})
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              {targetClass.zoom_link && (() => {
                const zoomUrl = targetClass.zoom_link as string;
                const safeUrl = zoomUrl.startsWith('http://') || zoomUrl.startsWith('https://')
                  ? zoomUrl
                  : `https://${zoomUrl}`;
                return (
                  <a
                    href={safeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(safeUrl, '_blank', 'noopener,noreferrer');
                    }}
                    className="apple-btn-primary"
                    style={{
                      padding: '5px 12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      borderRadius: '9999px',
                      background: 'linear-gradient(135deg, #0b84fe 0%, #0056b3 100%)',
                      color: '#fff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      textDecoration: 'none',
                      boxShadow: '0 2px 10px rgba(11, 132, 254, 0.4)'
                    }}
                    title="Open Zoom Call"
                  >
                    📹 Zoom
                  </a>
                );
              })()}
              {!isOnline && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAutoRouteToNextClass?.();
                  }}
                  className="apple-btn-primary"
                  style={{
                    padding: '5px 12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '9999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'linear-gradient(135deg, var(--apple-accent) 0%, var(--apple-accent-dark) 100%)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px var(--apple-accent-glow)'
                  }}
                  title="Route to next class"
                >
                  <span>Route</span>
                  <ArrowRight size={11} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* ========================================================
          BOTTOM NAVIGATION BAR (GOOGLE NAVIGATION DOCK)
          ======================================================== */}
      <div style={{
        position: 'absolute',
        bottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
        left: '12px',
        right: '12px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        pointerEvents: 'none'
      }}>
        {/* Left: Navigation Dock or Campus Quick Focus */}
        {selectedRoute ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'var(--apple-glass-overlay)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid var(--apple-border)',
            borderRadius: '14px',
            padding: '7px 14px',
            boxShadow: 'var(--apple-shadow-md)',
            pointerEvents: 'auto'
          }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--apple-glass-text)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, display: 'flex', alignItems: 'center', gap: '5px' }}>
                {isSelectedWalk && <span style={{ fontSize: '14px' }}>🚶</span>}
                <span>~{effectiveDurationMinutes} min</span>
                {isSelectedWalk && <span style={{ fontSize: '11px', fontWeight: 700, color: '#0A84FF', marginLeft: '2px' }}>walk</span>}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--apple-label-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <Clock size={10} />
                <span>Arrive {getArrivalClock(effectiveDurationMinutes)} • {effectiveDistanceMiles} mi</span>
              </div>
            </div>

            <button
              onClick={onClearSelectedRoute}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 11px',
                borderRadius: '9999px',
                background: '#EA4335',
                color: '#fff',
                border: 'none',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(234, 67, 53, 0.4)'
              }}
              title="Exit Navigation Mode"
            >
              <X size={12} strokeWidth={2.8} />
              <span>End</span>
            </button>
          </div>
        ) : (
          /* Campus Focus Pills */
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: 'var(--apple-glass-overlay)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            padding: '4px 6px',
            borderRadius: '9999px',
            border: '1px solid var(--apple-border)',
            boxShadow: 'var(--apple-shadow-md)',
            pointerEvents: 'auto'
          }}>
            <button
              onClick={() => {
                const map = mapInstanceRef.current;
                if (!map) return;
                let targetLat: number | null = null;
                let targetLon: number | null = null;
                if (userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lon === 'number') {
                  targetLat = userLocation.lat;
                  targetLon = userLocation.lon;
                } else if (origTarget && typeof origTarget.lat === 'number') {
                  targetLat = origTarget.lat;
                  targetLon = origTarget.lon;
                } else {
                  const campKey = getCampusKey(originCampus);
                  if (CAMPUS_COORDINATES[campKey]) {
                    targetLat = CAMPUS_COORDINATES[campKey].lat;
                    targetLon = CAMPUS_COORDINATES[campKey].lon;
                  }
                }
                if (targetLat !== null && targetLon !== null) {
                  map.flyTo([targetLat, targetLon], 16.5, { animate: true, duration: 1.1 });
                  setCurrentZoom(16.5);
                }
              }}
              className="apple-segment-btn"
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: userLocation ? '#0A84FF' : 'var(--apple-glass-text)'
              }}
              title="Zoom to My Location"
            >
              <LocateFixed size={11} color="#0A84FF" />
              <span>Me</span>
            </button>
            {["Busch", "Livingston", "College Ave", "Cook"].map((camp) => (
              <button
                key={camp}
                onClick={() => {
                  const map = mapInstanceRef.current;
                  const coord = CAMPUS_COORDINATES[camp];
                  if (map && coord) {
                    map.flyTo([coord.lat, coord.lon], 15, { duration: 0.8 });
                  }
                }}
                className="apple-segment-btn"
                style={{ padding: '3px 9px', fontSize: '11px', height: '24px', color: 'var(--apple-glass-text)' }}
              >
                {camp}
              </button>
            ))}
          </div>
        )}

        {/* Right: Dark Frosted Glass Overlay Buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          pointerEvents: 'auto'
        }}>
          {/* Quick toggle to Routes & Schedule view on mobile */}
          {onSwitchToRoutes && (
            <button
              onClick={onSwitchToRoutes}
              className="apple-btn-dark-glass"
              style={{ fontSize: '11px', padding: '5px 12px', height: '28px', gap: '5px' }}
              title="Open Directions & Schedule"
            >
              <span>📋 Routes</span>
            </button>
          )}

          {/* Quick Route Switcher if planResult is present and idle */}
          {planResult && planResult.routes && onSelectRoute && !selectedRoute && (
            <button
              onClick={() => onSelectRoute(planResult.routes[0])}
              className="apple-btn-dark-glass"
              style={{ fontSize: '11px', padding: '5px 12px', height: '28px', gap: '5px' }}
            >
              <Navigation size={12} color="#1A73E8" />
              <span>Start Navigation</span>
            </button>
          )}

          {/* Toggle between Google Dark, Google Standard, and Google Satellite */}
          <button
            onClick={() => setMapTheme(prev =>
              prev === 'google-dark' ? 'google-standard' : prev === 'google-standard' ? 'google-satellite' : 'google-dark'
            )}
            className="apple-btn-dark-glass"
            style={{ fontSize: '11px', padding: '5px 12px', height: '28px', gap: '5px' }}
            title="Switch Google Maps Style"
          >
            <Layers size={13} color={appTheme === 'light' ? '#0A84FF' : '#FFFFFF'} />
            <span>
              {mapTheme === 'google-dark' ? 'Google Dark' : mapTheme === 'google-standard' ? 'Google Light' : 'Google Satellite'}
            </span>
          </button>

          {/* Open directly in Google Maps */}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="apple-btn-dark-glass"
            style={{ fontSize: '11px', padding: '5px 12px', height: '28px', gap: '5px', textDecoration: 'none' }}
            title={isPedestrian ? "Open walking directions to target location in Google Maps" : isSelectedBike ? "Open cycling directions in Google Maps" : "Open transit directions in Google Maps"}
          >
            <MapPin size={13} color={isPedestrian ? '#30D158' : appTheme === 'light' ? '#0A84FF' : '#EA4335'} />
            <span>{isPedestrian ? 'Walk in Maps' : isSelectedBike ? 'Bike in Maps' : 'Google Maps'}</span>
            <ExternalLink size={10} color={appTheme === 'light' ? '#0A84FF' : 'currentColor'} style={{ opacity: 0.7 }} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default TransitMap;
