import { GOOGLE_MAPS_API_KEY } from './config';

export interface RouteStep {
  instruction: string;
  subText: string;
  distance: string;
  duration: string;
  iconType: 'walk' | 'bus' | 'bike' | 'car' | 'turn-left' | 'turn-right' | 'destination';
  distanceMeters: number;
  durationSeconds: number;
}

export interface LiveRouteResult {
  coordinates: [number, number][]; // [lat, lon] for Leaflet
  distanceMiles: number;
  durationMinutes: number;
  steps: RouteStep[];
  provider: 'google' | 'osrm' | 'fallback';
}

// In-memory cache for fast switching between campuses
const routeCache = new Map<string, LiveRouteResult>();

/**
 * Format meters to human readable distance (mi / ft)
 */
export const formatDistance = (meters: number): string => {
  const miles = meters * 0.000621371;
  if (miles < 0.1) {
    const feet = Math.round(meters * 3.28084);
    return `${feet} ft`;
  }
  return `${miles.toFixed(1)} mi`;
};

/**
 * Format seconds to minutes
 */
export const formatDuration = (seconds: number): string => {
  const mins = Math.max(1, Math.round(seconds / 60));
  return `${mins} min`;
};

/**
 * Map OSRM maneuver type and modifier to human-friendly instruction & icon
 */
const parseOsrmManeuver = (
  step: any,
  index: number,
  totalSteps: number,
  travelMode: string
): { instruction: string; subText: string; iconType: RouteStep['iconType'] } => {
  const m = step.maneuver || {};
  const type = (m.type || '').toLowerCase();
  const modifier = (m.modifier || '').toLowerCase();
  const streetName = (step.name || '').trim();

  const isWalk = travelMode === 'walk';
  let iconType: RouteStep['iconType'] = isWalk ? 'walk' : travelMode === 'bike' ? 'bike' : 'car';
  let instruction = '';
  let subText = '';

  if (index === 0) {
    instruction = isWalk
      ? (streetName ? `Walk toward ${streetName}` : 'Depart along pedestrian walkway')
      : `Depart from starting point`;
    subText = streetName
      ? `Head toward ${streetName}`
      : (isWalk ? 'Follow campus footpath' : 'Follow campus roadway');
    iconType = isWalk ? 'walk' : travelMode === 'bike' ? 'bike' : 'car';
  } else if (index === totalSteps - 1 || type === 'arrive') {
    instruction = isWalk ? `Arrive at destination building` : `Arrive at destination campus`;
    subText = streetName ? `Destination is on ${streetName}` : 'Trip completed';
    iconType = 'destination';
  } else if (type === 'turn') {
    if (modifier.includes('left')) {
      instruction = `Turn left${streetName ? ` onto ${streetName}` : ''}`;
      iconType = 'turn-left';
    } else if (modifier.includes('right')) {
      instruction = `Turn right${streetName ? ` onto ${streetName}` : ''}`;
      iconType = 'turn-right';
    } else {
      instruction = isWalk
        ? `Walk straight${streetName ? ` on ${streetName}` : ''}`
        : `Continue straight${streetName ? ` on ${streetName}` : ''}`;
      iconType = isWalk ? 'walk' : 'car';
    }
    subText = isWalk ? `Walk for ${formatDistance(step.distance)}` : `Continue for ${formatDistance(step.distance)}`;
  } else if (type.includes('roundabout') || type.includes('rotary')) {
    instruction = `Take roundabout${streetName ? ` toward ${streetName}` : ''}`;
    iconType = modifier.includes('left') ? 'turn-left' : 'turn-right';
    subText = `Exit for ${formatDistance(step.distance)}`;
  } else if (type.includes('ramp') || type.includes('merge')) {
    instruction = isWalk
      ? `Follow connector path${streetName ? ` toward ${streetName}` : ''}`
      : `Merge onto ${streetName || 'connector highway'}`;
    iconType = isWalk ? 'walk' : 'car';
    subText = `Proceed for ${formatDistance(step.distance)}`;
  } else if (type === 'new name' || type === 'continue') {
    instruction = isWalk
      ? `Continue walking on ${streetName || 'pathway'}`
      : `Continue on ${streetName || 'roadway'}`;
    iconType = isWalk ? 'walk' : 'car';
    subText = `Follow path for ${formatDistance(step.distance)}`;
  } else {
    const formattedMod = modifier ? ` ${modifier}` : '';
    instruction = `${type.charAt(0).toUpperCase() + type.slice(1)}${formattedMod}${streetName ? ` on ${streetName}` : ''}`;
    iconType = modifier.includes('left') ? 'turn-left' : modifier.includes('right') ? 'turn-right' : (isWalk ? 'walk' : 'car');
    subText = `Proceed for ${formatDistance(step.distance)}`;
  }

  return { instruction, subText, iconType };
};

/**
 * Fetch live route using Google Maps Directions API or free OSRM live routing engine
 */
export async function fetchLiveRoute(
  originLat: number,
  originLon: number,
  destLat: number,
  destLon: number,
  transitType: 'bus' | 'bike' | 'car' | 'walk' = 'bus',
  routeName: string = ''
): Promise<LiveRouteResult> {
  const cacheKey = `${originLat.toFixed(4)},${originLon.toFixed(4)}_${destLat.toFixed(4)},${destLon.toFixed(4)}_${transitType}_${routeName}`;
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  // 1. Try Google Maps Directions API if API key is present
  if (GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY.trim() !== '') {
    try {
      const mode = transitType === 'walk'
        ? 'walking'
        : transitType === 'bike'
        ? 'bicycling'
        : transitType === 'bus'
        ? 'transit'
        : 'driving';
      const googleUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLon}&destination=${destLat},${destLon}&mode=${mode}&key=${GOOGLE_MAPS_API_KEY.trim()}`;
      
      const res = await fetch(googleUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const leg = route.legs[0];

          // Decode polyline or parse points
          const coordinates: [number, number][] = [];
          if (leg.steps) {
            leg.steps.forEach((s: any) => {
              if (s.start_location) {
                coordinates.push([s.start_location.lat, s.start_location.lng]);
              }
              if (s.end_location) {
                coordinates.push([s.end_location.lat, s.end_location.lng]);
              }
            });
          }

          const steps: RouteStep[] = (leg.steps || []).map((s: any) => ({
            instruction: s.html_instructions ? s.html_instructions.replace(/<[^>]*>?/gm, '') : 'Proceed along route',
            subText: s.distance?.text ? `${s.distance.text} • ${s.duration?.text || ''}` : 'Follow directions',
            distance: s.distance?.text || '0.5 mi',
            duration: s.duration?.text || '2 min',
            iconType: transitType === 'walk' ? 'walk' : transitType === 'bike' ? 'bike' : 'car',
            distanceMeters: s.distance?.value || 800,
            durationSeconds: s.duration?.value || 120
          }));

          const result: LiveRouteResult = {
            coordinates,
            distanceMiles: Number(((leg.distance?.value || 4000) * 0.000621371).toFixed(1)),
            durationMinutes: transitType === 'walk'
              ? Math.max(1, Math.round((leg.duration?.value || 300) / 60))
              : Math.max(5, Math.round((leg.duration?.value || 900) / 60)),
            steps,
            provider: 'google'
          };

          routeCache.set(cacheKey, result);
          return result;
        }
      }
    } catch (err) {
      console.warn("Google Directions API failed or blocked by CORS, falling back to free OSRM engine:", err);
    }
  }

  // 2. Free High-Precision OSRM Live Routing Engine (Zero API Key, 100% Free)
  try {
    const osrmProfile = transitType === 'walk' ? 'foot' : transitType === 'bike' ? 'bike' : 'driving';
    const osrmUrl = `https://router.project-osrm.org/route/v1/${osrmProfile}/${originLon},${originLat};${destLon},${destLat}?overview=full&geometries=geojson&steps=true`;

    const res = await fetch(osrmUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];

        // Convert [lon, lat] GeoJSON coordinates to [lat, lon] for Leaflet
        const coordinates: [number, number][] = (route.geometry?.coordinates || []).map(
          ([lon, lat]: [number, number]) => [lat, lon]
        );

        const totalSteps = (leg.steps || []).length;
        const steps: RouteStep[] = (leg.steps || []).map((s: any, idx: number) => {
          const { instruction, subText, iconType } = parseOsrmManeuver(s, idx, totalSteps, transitType);
          return {
            instruction: (idx === 1 && routeName && transitType === 'bus') ? `Board ${routeName}` : instruction,
            subText,
            distance: formatDistance(s.distance || 0),
            duration: formatDuration(s.duration || 60),
            iconType: (idx === 1 && transitType === 'bus') ? 'bus' : iconType,
            distanceMeters: s.distance || 0,
            durationSeconds: s.duration || 60
          };
        });

        const totalDistanceMiles = Number(((leg.distance || 4000) * 0.000621371).toFixed(1));
        const totalDurationMins = transitType === 'bus' 
          ? Math.max(8, Math.round((leg.duration || 600) / 60) + 4) // include bus dwell & stops
          : transitType === 'walk'
          ? Math.max(1, Math.round((leg.distance || 400) / 80)) // ~3.0 mph walking pace
          : Math.max(4, Math.round((leg.duration || 600) / 60));

        const result: LiveRouteResult = {
          coordinates,
          distanceMiles: totalDistanceMiles,
          durationMinutes: totalDurationMins,
          steps,
          provider: 'osrm'
        };

        routeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.warn("OSRM routing request failed, falling back to corridor geometry:", err);
  }

  // 3. Fallback static coordinates
  const fallbackCoords: [number, number][] = [
    [originLat, originLon],
    [(originLat + destLat) / 2, (originLon + destLon) / 2],
    [destLat, destLon]
  ];

  const fallbackDistMiles = transitType === 'walk' ? 0.3 : 2.5;
  const fallbackDurMins = transitType === 'walk' ? 6 : 16;

  return {
    coordinates: fallbackCoords,
    distanceMiles: fallbackDistMiles,
    durationMinutes: fallbackDurMins,
    steps: transitType === 'walk' ? [
      {
        instruction: 'Walk along campus pathway',
        subText: 'Follow walkways toward your target facility',
        distance: '0.1 mi',
        duration: '2 min',
        iconType: 'walk',
        distanceMeters: 160,
        durationSeconds: 120
      },
      {
        instruction: 'Continue on pedestrian crosswalk',
        subText: 'Direct path to building entrance',
        distance: '0.2 mi',
        duration: '4 min',
        iconType: 'walk',
        distanceMeters: 320,
        durationSeconds: 240
      },
      {
        instruction: 'Arrive at destination building',
        subText: 'Enter through main entrance',
        distance: '50 ft',
        duration: '1 min',
        iconType: 'destination',
        distanceMeters: 15,
        durationSeconds: 30
      }
    ] : [
      {
        instruction: `Depart from origin`,
        subText: 'Follow campus walkway to transit shelter',
        distance: '0.1 mi',
        duration: '2 min',
        iconType: 'walk',
        distanceMeters: 160,
        durationSeconds: 120
      },
      {
        instruction: routeName ? `Board ${routeName}` : 'Board transit line',
        subText: 'Direct connection to destination campus',
        distance: '2.3 mi',
        duration: '12 min',
        iconType: transitType === 'bike' ? 'bike' : 'bus',
        distanceMeters: 3700,
        durationSeconds: 720
      },
      {
        instruction: `Arrive at destination campus`,
        subText: 'Proceed to your classroom or facility',
        distance: '0.1 mi',
        duration: '2 min',
        iconType: 'destination',
        distanceMeters: 160,
        durationSeconds: 120
      }
    ],
    provider: 'fallback'
  };
}
