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
  { name: "Busch Student Center", campus: "Busch" as const, lat: 40.5238, lon: -74.45826 },
  { name: "Hill Center", campus: "Busch" as const, lat: 40.52192, lon: -74.4633 },
  { name: "Science Building", campus: "Busch" as const, lat: 40.52394, lon: -74.46422 },
  { name: "Allison Road Classrooms", campus: "Busch" as const, lat: 40.52356, lon: -74.46519 },

  // Livingston
  { name: "Livingston Plaza", campus: "Livingston" as const, lat: 40.52511, lon: -74.43858 },
  { name: "Livingston Student Center", campus: "Livingston" as const, lat: 40.524, lon: -74.43663 },
  { name: "Quads", campus: "Livingston" as const, lat: 40.51986, lon: -74.43357 },

  // College Ave
  { name: "College Avenue Student Center", campus: "College Ave" as const, lat: 40.50366, lon: -74.4524 },
  { name: "The Yard", campus: "College Ave" as const, lat: 40.49957, lon: -74.44824 },
  { name: "Student Activities Center", campus: "College Ave" as const, lat: 40.50391, lon: -74.44882 },
  { name: "SoCam Apts", campus: "College Ave" as const, lat: 40.49186, lon: -74.44309 },

  // Cook / Douglass
  { name: "College Hall", campus: "Cook" as const, lat: 40.48551, lon: -74.4372 },
  { name: "Red Oak Lane", campus: "Cook" as const, lat: 40.48299, lon: -74.43753 },
  { name: "Lipman Hall", campus: "Cook" as const, lat: 40.48129, lon: -74.43627 },
  { name: "Biel Road", campus: "Cook" as const, lat: 40.48, lon: -74.43252 },
  { name: "Henderson", campus: "Cook" as const, lat: 40.48095, lon: -74.42872 },
  { name: "Gibbons", campus: "Cook" as const, lat: 40.48523, lon: -74.43194 }
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
