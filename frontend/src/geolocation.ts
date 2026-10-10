export interface ResolvedLocation {
  campus: "Busch" | "Livingston" | "College Ave" | "Cook";
  locationName: string;
  distanceKm: number;
  distanceMiles: string;
  isNearRutgers: boolean;
  coords: {
    lat: number;
    lon: number;
  };
}

export const RUTGERS_LANDMARKS = [
  // Busch
  { name: "Busch Student Center", campus: "Busch" as const, lat: 40.5233, lon: -74.4586 },
  { name: "Hill Center", campus: "Busch" as const, lat: 40.5218, lon: -74.4626 },
  { name: "Science Building", campus: "Busch" as const, lat: 40.5230, lon: -74.4635 },
  { name: "Allison Road Classrooms", campus: "Busch" as const, lat: 40.5242, lon: -74.4646 },

  // Livingston
  { name: "Livingston Plaza", campus: "Livingston" as const, lat: 40.5273, lon: -74.4398 },
  { name: "Livingston Student Center", campus: "Livingston" as const, lat: 40.5241, lon: -74.4357 },
  { name: "Quads", campus: "Livingston" as const, lat: 40.5214, lon: -74.4348 },

  // College Ave
  { name: "College Avenue Student Center", campus: "College Ave" as const, lat: 40.5028, lon: -74.4518 },
  { name: "The Yard", campus: "College Ave" as const, lat: 40.5015, lon: -74.4485 },
  { name: "Student Activities Center", campus: "College Ave" as const, lat: 40.4990, lon: -74.4445 },
  { name: "SoCam Apts", campus: "College Ave" as const, lat: 40.4918, lon: -74.4436 },

  // Cook / Douglass
  { name: "College Hall", campus: "Cook" as const, lat: 40.4851, lon: -74.4376 },
  { name: "Red Oak Lane", campus: "Cook" as const, lat: 40.4815, lon: -74.4348 },
  { name: "Lipman Hall", campus: "Cook" as const, lat: 40.4835, lon: -74.4365 },
  { name: "Biel Road", campus: "Cook" as const, lat: 40.4802, lon: -74.4312 },
  { name: "Henderson", campus: "Cook" as const, lat: 40.4780, lon: -74.4360 },
  { name: "Gibbons", campus: "Cook" as const, lat: 40.4770, lon: -74.4370 }
];

export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function resolveNearestRutgersCampus(userLat: number, userLon: number): ResolvedLocation {
  let nearest = RUTGERS_LANDMARKS[0];
  let minDistance = Infinity;

  for (const landmark of RUTGERS_LANDMARKS) {
    const dist = calculateDistanceKm(userLat, userLon, landmark.lat, landmark.lon);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = landmark;
    }
  }

  const miles = minDistance * 0.621371;
  const isNear = miles <= 25.0; // Within central New Jersey / RU area

  return {
    campus: nearest.campus,
    locationName: nearest.name,
    distanceKm: minDistance,
    distanceMiles: miles < 0.1 ? "<0.1 mi" : `${miles.toFixed(1)} mi`,
    isNearRutgers: isNear,
    coords: {
      lat: userLat,
      lon: userLon
    }
  };
}

export function requestBrowserLocation(
  onSuccess: (loc: ResolvedLocation) => void,
  onError: (err: GeolocationPositionError | { code: number; message: string }) => void
) {
  if (typeof window === "undefined" || !navigator.geolocation) {
    onError({ code: 0, message: "Geolocation is not supported by your browser." });
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const resolved = resolveNearestRutgersCampus(pos.coords.latitude, pos.coords.longitude);
      onSuccess(resolved);
    },
    (err) => {
      onError(err);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000
    }
  );
}
