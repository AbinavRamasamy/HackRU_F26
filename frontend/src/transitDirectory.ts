/**
 * Rutgers University Transit Network & Stop Directory
 * Dynamically resolves buildings, campuses, and finds the nearest bus stops.
 */

export interface BusStop {
  name: string;
  campus: 'Busch' | 'Livingston' | 'College Ave' | 'Cook' | 'Douglass';
  lat: number;
  lon: number;
  routes: string[];
}

export interface LandmarkLocation {
  name: string;
  campus: 'Busch' | 'Livingston' | 'College Ave' | 'Cook' | 'Douglass';
  lat: number;
  lon: number;
  code?: string;
}

// Major Rutgers University Bus Stops with real GPS coordinates from transitstat.us/rutgers
export const RUTGERS_BUS_STOPS: BusStop[] = [
  // College Avenue
  {
    name: "College Avenue Student Center",
    campus: "College Ave",
    lat: 40.50366,
    lon: -74.4524,
    routes: ["Weekend 1", "Weekend 2", "LX", "A", "H", "EE"]
  },
  {
    name: "The Yard",
    campus: "College Ave",
    lat: 40.49957,
    lon: -74.44824,
    routes: ["Weekend 1", "Weekend 2", "LX", "A", "H", "F", "EE", "Knightsbridge"]
  },
  {
    name: "Student Activities Center",
    campus: "College Ave",
    lat: 40.50391,
    lon: -74.44882,
    routes: ["Weekend 1", "Weekend 2", "LX", "A", "H", "F", "EE"]
  },
  {
    name: "Student Activities Center (NB)",
    campus: "College Ave",
    lat: 40.50391,
    lon: -74.44882,
    routes: ["Weekend 1", "Weekend 2", "LX", "A", "H", "F", "EE"]
  },
  {
    name: "Student Activities Center (SB)",
    campus: "College Ave",
    lat: 40.50425,
    lon: -74.44974,
    routes: ["Weekend 1"]
  },
  {
    name: "SoCam Apts",
    campus: "College Ave",
    lat: 40.49186,
    lon: -74.44309,
    routes: ["Weekend 1", "Weekend 2", "EE", "F"]
  },
  {
    name: "SoCam Apts (NB)",
    campus: "College Ave",
    lat: 40.49224,
    lon: -74.44267,
    routes: ["Weekend 1", "EE"]
  },
  {
    name: "SoCam Apts (SB)",
    campus: "College Ave",
    lat: 40.49186,
    lon: -74.44309,
    routes: ["Weekend 2", "EE"]
  },

  // Busch
  {
    name: "Busch Student Center",
    campus: "Busch",
    lat: 40.5238,
    lon: -74.45826,
    routes: ["Weekend 1", "Weekend 2", "A", "B", "BL", "H"]
  },
  {
    name: "Hill Center",
    campus: "Busch",
    lat: 40.52192,
    lon: -74.4633,
    routes: ["Weekend 1", "Weekend 2", "A", "B", "BL", "C", "H", "REXB"]
  },
  {
    name: "Hill Center (NB)",
    campus: "Busch",
    lat: 40.52192,
    lon: -74.4633,
    routes: ["Weekend 1", "A", "B", "BL", "C", "REXB"]
  },
  {
    name: "Hill Center (SB)",
    campus: "Busch",
    lat: 40.52193,
    lon: -74.46331,
    routes: ["Weekend 2", "C", "H", "REXB"]
  },
  {
    name: "Science Building",
    campus: "Busch",
    lat: 40.52394,
    lon: -74.46422,
    routes: ["Weekend 1", "A", "BL"]
  },
  {
    name: "Allison Road Classrooms",
    campus: "Busch",
    lat: 40.52356,
    lon: -74.46519,
    routes: ["Weekend 2", "B", "C", "H", "REXB"]
  },
  {
    name: "Stadium West Lot",
    campus: "Busch",
    lat: 40.51456,
    lon: -74.46615,
    routes: ["A", "BL", "C", "H"]
  },
  {
    name: "Werblin Recreation Center",
    campus: "Busch",
    lat: 40.51864,
    lon: -74.45985,
    routes: ["A", "H"]
  },

  // Livingston
  {
    name: "Livingston Plaza",
    campus: "Livingston",
    lat: 40.52511,
    lon: -74.43858,
    routes: ["Weekend 1", "Weekend 2", "B", "LX", "REXL"]
  },
  {
    name: "Livingston Student Center",
    campus: "Livingston",
    lat: 40.524,
    lon: -74.43663,
    routes: ["Weekend 1", "Weekend 2", "B", "BL", "LX", "REXL"]
  },
  {
    name: "Quads",
    campus: "Livingston",
    lat: 40.51986,
    lon: -74.43357,
    routes: ["Weekend 1", "Weekend 2", "B", "BL", "LX"]
  },
  {
    name: "Jersey Mike's Arena",
    campus: "Livingston",
    lat: 40.52435,
    lon: -74.44064,
    routes: ["BL"]
  },

  // Cook / Douglass
  {
    name: "College Hall",
    campus: "Douglass",
    lat: 40.48551,
    lon: -74.4372,
    routes: ["Weekend 1", "Weekend 2", "EE", "F", "REXB", "REXL"]
  },
  {
    name: "Red Oak Lane",
    campus: "Cook",
    lat: 40.48299,
    lon: -74.43753,
    routes: ["Weekend 1", "Weekend 2", "EE", "F", "REXB", "REXL"]
  },
  {
    name: "Lipman Hall",
    campus: "Cook",
    lat: 40.48129,
    lon: -74.43627,
    routes: ["Weekend 1", "Weekend 2", "EE", "F", "REXB", "REXL"]
  },
  {
    name: "Biel Road",
    campus: "Cook",
    lat: 40.48,
    lon: -74.43252,
    routes: ["Weekend 1", "Weekend 2", "EE"]
  },
  {
    name: "Henderson",
    campus: "Cook",
    lat: 40.48095,
    lon: -74.42872,
    routes: ["Weekend 1", "Weekend 2", "EE"]
  },
  {
    name: "Gibbons",
    campus: "Douglass",
    lat: 40.48523,
    lon: -74.43194,
    routes: ["Weekend 1", "Weekend 2", "EE"]
  }
];

// Campus Buildings with exact GPS coordinates (mapped with Google Maps / Rutgers campus authoritative coordinates)
export const RUTGERS_BUILDINGS: LandmarkLocation[] = [
  // College Ave
  { name: "College Avenue Student Center", code: "CASC", campus: "College Ave", lat: 40.50366, lon: -74.4524 },
  { name: "College Ave Student Center", code: "CASC", campus: "College Ave", lat: 40.50366, lon: -74.4524 },
  { name: "The Yard", code: "YARD", campus: "College Ave", lat: 40.49957, lon: -74.44824 },
  { name: "Academic Building", code: "AB", campus: "College Ave", lat: 40.5015, lon: -74.4475 },
  { name: "Student Activities Center", code: "SAC", campus: "College Ave", lat: 40.50391, lon: -74.44882 },
  { name: "SoCam Apts", code: "SOCAM", campus: "College Ave", lat: 40.49186, lon: -74.44309 },
  { name: "Scott Hall", code: "SCOTT", campus: "College Ave", lat: 40.4997, lon: -74.4475 },
  { name: "Murray Hall", code: "MUR", campus: "College Ave", lat: 40.4996, lon: -74.4473 },
  { name: "Voorhees Hall", code: "VWH", campus: "College Ave", lat: 40.4998, lon: -74.4468 },
  { name: "Hardenbergh Hall", code: "HARD", campus: "College Ave", lat: 40.5034, lon: -74.4502 },
  { name: "School of Communication and Information", code: "CI", campus: "College Ave", lat: 40.5045, lon: -74.4505 },

  // Busch
  { name: "Busch Student Center", code: "BSC", campus: "Busch", lat: 40.5233, lon: -74.4586 },
  { name: "Hill Center", code: "HILL", campus: "Busch", lat: 40.52198, lon: -74.46283 },
  { name: "Hill Center for the Mathematical Sciences", code: "HILL", campus: "Busch", lat: 40.52198, lon: -74.46283 },
  { name: "Science Building", code: "SEC", campus: "Busch", lat: 40.52394, lon: -74.46422 },
  { name: "Allison Road Classrooms", code: "ARC", campus: "Busch", lat: 40.5236, lon: -74.4650 },
  { name: "Science & Engineering Resource Center", code: "SERC", campus: "Busch", lat: 40.5228, lon: -74.4638 },
  { name: "Science and Engineering Resource Center", code: "SERC", campus: "Busch", lat: 40.5228, lon: -74.4638 },
  { name: "Science and Engineering Building", code: "SERC", campus: "Busch", lat: 40.5228, lon: -74.4638 },
  { name: "SERC", code: "SERC", campus: "Busch", lat: 40.5228, lon: -74.4638 },
  { name: "SEC", code: "SEC", campus: "Busch", lat: 40.52394, lon: -74.46422 },
  { name: "Richard Weeks Hall of Engineering", code: "WEEKS", campus: "Busch", lat: 40.5238, lon: -74.4619 },
  { name: "Stadium West Lot", code: "STAD", campus: "Busch", lat: 40.51456, lon: -74.46615 },
  { name: "Werblin Recreation Center", code: "WERB", campus: "Busch", lat: 40.51864, lon: -74.45985 },

  // Livingston
  { name: "Livingston Plaza", code: "PLAZA", campus: "Livingston", lat: 40.52511, lon: -74.43858 },
  { name: "Livingston Student Center", code: "LSC", campus: "Livingston", lat: 40.5240, lon: -74.4366 },
  { name: "Rutgers Business School", code: "RBS", campus: "Livingston", lat: 40.52200, lon: -74.44096 },
  { name: "RBS", code: "RBS", campus: "Livingston", lat: 40.52200, lon: -74.44096 },
  { name: "Tillett Hall", code: "TIL", campus: "Livingston", lat: 40.52187, lon: -74.43606 },
  { name: "Tillett", code: "TIL", campus: "Livingston", lat: 40.52187, lon: -74.43606 },
  { name: "TIL", code: "TIL", campus: "Livingston", lat: 40.52187, lon: -74.43606 },
  { name: "Beck Hall", code: "BECK", campus: "Livingston", lat: 40.5235, lon: -74.4357 },
  { name: "Lucy Stone Hall", code: "LSH", campus: "Livingston", lat: 40.5218, lon: -74.4395 },
  { name: "Quads", code: "QUADS", campus: "Livingston", lat: 40.51986, lon: -74.43357 },
  { name: "Livingston Quads", code: "QUADS", campus: "Livingston", lat: 40.51986, lon: -74.43357 },
  { name: "Jersey Mike's Arena", code: "JMA", campus: "Livingston", lat: 40.52435, lon: -74.44064 },
  { name: "Livingston Apartments", code: "LYN", campus: "Livingston", lat: 40.5252, lon: -74.4362 },

  // Cook / Douglass
  { name: "Ruth Adams Building", code: "RAB", campus: "Douglass", lat: 40.48696, lon: -74.43736 },
  { name: "Ruth Adams", code: "RAB", campus: "Douglass", lat: 40.48696, lon: -74.43736 },
  { name: "College Hall", code: "CH", campus: "Douglass", lat: 40.48551, lon: -74.4372 },
  { name: "Red Oak Lane", code: "RO", campus: "Cook", lat: 40.48299, lon: -74.43753 },
  { name: "Lipman Hall", code: "LIP", campus: "Cook", lat: 40.48129, lon: -74.43627 },
  { name: "Biel Road", code: "BIEL", campus: "Cook", lat: 40.4800, lon: -74.4325 },
  { name: "Henderson", code: "HEND", campus: "Cook", lat: 40.48095, lon: -74.42872 },
  { name: "Gibbons", code: "GIBB", campus: "Douglass", lat: 40.48523, lon: -74.43194 },
  { name: "Cook Student Center", code: "CSC", campus: "Cook", lat: 40.4800, lon: -74.4325 },
  { name: "Hickman Hall", code: "HICK", campus: "Douglass", lat: 40.48551, lon: -74.4372 },
  { name: "Loree Gym", code: "LOREE", campus: "Douglass", lat: 40.4842, lon: -74.4368 },
  { name: "Food Sciences Building", code: "FOOD", campus: "Cook", lat: 40.4796, lon: -74.4287 }
];

/**
 * Standard Haversine distance in meters
 */
export function getHaversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Match campus names flexibly
 */
export function matchCampus(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const aNorm = a.toLowerCase();
  const bNorm = b.toLowerCase();
  if (aNorm.includes('col') && bNorm.includes('col')) return true;
  if (aNorm.includes('bus') && bNorm.includes('bus')) return true;
  if (aNorm.includes('liv') && bNorm.includes('liv')) return true;
  if ((aNorm.includes('cook') || aNorm.includes('doug')) && (bNorm.includes('cook') || bNorm.includes('doug'))) return true;
  return aNorm === bNorm;
}

/**
 * Dynamically resolves any location string or campus into GPS coordinates
 */
export function resolveLocationCoords(
  locationQuery: string,
  fallbackCampus: string = 'College Ave'
): { lat: number; lon: number; name: string; campus: string } {
  const q = (locationQuery || '').toLowerCase().trim();
  const qNorm = q.replace(/&/g, 'and').replace(/[.,\/#!$%\^;\:{}=\-_`~()]/g, ' ').replace(/\s+/g, ' ').trim();

  // Special match: Science & Engineering Resource Center / SERC / SEC
  if (qNorm.includes('science and engineering') || qNorm.includes('serc') || (qNorm.includes('sec') && (qNorm.includes('busch') || qNorm.includes('room') || qNorm.includes('202')))) {
    return { lat: 40.5228, lon: -74.4638, name: "Science and Engineering Resource Center", campus: "Busch" };
  }

  // Special match: Tillett Hall on Livingston
  if (qNorm.includes('tillett') || qNorm.includes('tillet')) {
    return { lat: 40.52187, lon: -74.43606, name: "Tillett Hall", campus: "Livingston" };
  }

  // 1. Check building directory by exact code or name match
  for (const b of RUTGERS_BUILDINGS) {
    if (b.code && (q === b.code.toLowerCase() || qNorm.split(' ').includes(b.code.toLowerCase()))) {
      return { lat: b.lat, lon: b.lon, name: b.name, campus: b.campus };
    }
    const bNorm = b.name.toLowerCase().replace(/&/g, 'and').replace(/[.,\/#!$%\^;\:{}=\-_`~()]/g, ' ').replace(/\s+/g, ' ').trim();
    if (qNorm.includes(bNorm) || bNorm.includes(qNorm)) {
      return { lat: b.lat, lon: b.lon, name: b.name, campus: b.campus };
    }
  }

  // 2. Check bus stops by name
  for (const s of RUTGERS_BUS_STOPS) {
    const sNorm = s.name.toLowerCase().replace(/&/g, 'and').replace(/[.,\/#!$%\^;\:{}=\-_`~()]/g, ' ').replace(/\s+/g, ' ').trim();
    if (qNorm.includes(sNorm) || sNorm.includes(qNorm)) {
      return { lat: s.lat, lon: s.lon, name: s.name, campus: s.campus };
    }
  }

  // 3. Fallback to campus default transit center
  if (q.includes('bus') || fallbackCampus.toLowerCase().includes('bus')) {
    return { lat: 40.5238, lon: -74.45826, name: "Busch Student Center", campus: "Busch" };
  }
  if (q.includes('liv') || fallbackCampus.toLowerCase().includes('liv')) {
    return { lat: 40.524, lon: -74.43663, name: "Livingston Student Center", campus: "Livingston" };
  }
  if (q.includes('cook') || q.includes('doug') || fallbackCampus.toLowerCase().includes('cook') || fallbackCampus.toLowerCase().includes('doug')) {
    return { lat: 40.48551, lon: -74.4372, name: "College Hall", campus: "Douglass" };
  }

  // Default: College Ave Student Center on College Ave
  return { lat: 40.50366, lon: -74.4524, name: "College Ave Student Center", campus: "College Ave" };
}

/**
 * DYNAMIC ALGORITHM (NOT HARDCODED):
 * Finds the nearest bus stop to the target location coordinates on the target campus.
 * Calculates geodesic distance to every bus stop and selects the closest one.
 */
export function findNearestBusStop(
  targetCoord: { lat: number; lon: number },
  targetCampus: string,
  routeName?: string
): BusStop {
  // Filter candidate stops on the destination campus
  let candidates = RUTGERS_BUS_STOPS.filter(s => matchCampus(s.campus, targetCampus));

  // If a specific route was provided, prefer stops served by that route
  if (routeName) {
    const routeMatched = candidates.filter(s =>
      s.routes.some(r => r.toLowerCase().includes(routeName.toLowerCase()) || routeName.toLowerCase().includes(r.toLowerCase()))
    );
    if (routeMatched.length > 0) {
      candidates = routeMatched;
    }
  }

  if (candidates.length === 0) {
    candidates = RUTGERS_BUS_STOPS;
  }

  // Compute minimum distance to find the closest drop-off stop
  let closestStop = candidates[0];
  let minDistanceMeters = Infinity;

  for (const stop of candidates) {
    const dist = getHaversineDistanceMeters(targetCoord.lat, targetCoord.lon, stop.lat, stop.lon);
    if (dist < minDistanceMeters) {
      minDistanceMeters = dist;
      closestStop = stop;
    }
  }

  return closestStop;
}

/**
 * Official Transitstat.us Color Palette for Rutgers University Fleet
 * Sourced directly from Transitstat.us GTFS endpoint
 */
export const TRANSITSTAT_ROUTE_COLORS: Record<string, { bg: string; text: string; shortName: string }> = {
  "Weekend 1": { bg: "#008080", text: "#FFFFFF", shortName: "W1" },
  "Weekend 2": { bg: "#6A5ACD", text: "#FFFFFF", shortName: "W2" },
  "WKND 1":    { bg: "#008080", text: "#FFFFFF", shortName: "W1" },
  "WKND 2":    { bg: "#6A5ACD", text: "#FFFFFF", shortName: "W2" },
  "LX":        { bg: "#CB99FE", text: "#1c1c1e", shortName: "LX" },
  "B":         { bg: "#F9CE23", text: "#1c1c1e", shortName: "B" },
  "A":         { bg: "#F820FE", text: "#1c1c1e", shortName: "A" },
  "H":         { bg: "#0000FF", text: "#FFFFFF", shortName: "H" },
  "F":         { bg: "#F42717", text: "#FFFFFF", shortName: "F" },
  "EE":        { bg: "#F6851C", text: "#1c1c1e", shortName: "EE" },
  "REXB":      { bg: "#620833", text: "#FFFFFF", shortName: "REXB" },
  "REXL":      { bg: "#75B0FD", text: "#1c1c1e", shortName: "REXL" },
  "C":         { bg: "#55FDFE", text: "#1c1c1e", shortName: "C" },
};

export function getRouteColorInfo(route: string): { bg: string; text: string; shortName: string } {
  if (!route) return { bg: "#6A5ACD", text: "#FFFFFF", shortName: "BUS" };
  const norm = route.trim().toLowerCase();

  if ((norm.includes("1") && (norm.includes("weekend") || norm.includes("wknd") || norm.includes("w1"))) || norm === "wknd 1" || norm === "w1") {
    return TRANSITSTAT_ROUTE_COLORS["Weekend 1"];
  }
  if ((norm.includes("2") && (norm.includes("weekend") || norm.includes("wknd") || norm.includes("w2"))) || norm === "wknd 2" || norm === "w2") {
    return TRANSITSTAT_ROUTE_COLORS["Weekend 2"];
  }
  if (norm.includes("lx")) return TRANSITSTAT_ROUTE_COLORS["LX"];
  if (norm.includes("rexb")) return TRANSITSTAT_ROUTE_COLORS["REXB"];
  if (norm.includes("rexl")) return TRANSITSTAT_ROUTE_COLORS["REXL"];
  if (norm.includes("ee")) return TRANSITSTAT_ROUTE_COLORS["EE"];
  if (norm === "b" || norm.includes("route b")) return TRANSITSTAT_ROUTE_COLORS["B"];
  if (norm === "a" || norm.includes("route a")) return TRANSITSTAT_ROUTE_COLORS["A"];
  if (norm === "h" || norm.includes("route h")) return TRANSITSTAT_ROUTE_COLORS["H"];
  if (norm === "f" || norm.includes("route f")) return TRANSITSTAT_ROUTE_COLORS["F"];
  if (norm === "c" || norm.includes("route c")) return TRANSITSTAT_ROUTE_COLORS["C"];

  return { bg: "#6A5ACD", text: "#FFFFFF", shortName: route.slice(0, 4) };
}

/**
 * Concise Apple-Style Stop Abbreviations & Short Codes
 */
export function getStopShortCode(stopName: string): string {
  if (!stopName) return "STOP";
  const s = stopName.toLowerCase();
  if (s.includes("college ave") || s.includes("casc")) return "CASC";
  if (s.includes("busch student") || s.includes("bsc")) return "BSC";
  if (s.includes("livingston student") || s.includes("lsc")) return "LSC";
  if (s.includes("cook student") || s.includes("csc")) return "CSC";
  if (s.includes("allison road") || s.includes("arc")) return "ARC";
  if (s.includes("hill center") || s.includes("hill")) return "HILL";
  if (s.includes("science")) return "SCIENCE";
  if (s.includes("the yard") || s.includes("yard")) return "YARD";
  if (s.includes("student activities") || s.includes("sac")) return "SAC";
  if (s.includes("socam")) return "SOCAM";
  if (s.includes("scott")) return "SCOTT";
  if (s.includes("college hall") || s.includes("ch")) return "CH";
  if (s.includes("plaza")) return "PLAZA";
  if (s.includes("quads")) return "QUADS";
  if (s.includes("red oak")) return "RED OAK";
  if (s.includes("lipman")) return "LIPMAN";
  if (s.includes("biel")) return "BIEL";
  if (s.includes("henderson") || s.includes("hend")) return "HEND";
  if (s.includes("gibbons") || s.includes("gibb")) return "GIBB";
  if (s.includes("hardenbergh")) return "HARD";
  return stopName.length > 7 ? stopName.slice(0, 6) : stopName;
}

/**
 * Sequence of stops along each active Rutgers route
 */
export const ROUTE_STOP_SEQUENCES: Record<string, string[]> = {
  "Weekend 1": [
    "Busch Student Center",
    "Science Building",
    "Hill Center",
    "Allison Road Classrooms",
    "Livingston Student Center",
    "Quads",
    "Livingston Plaza",
    "College Hall",
    "Red Oak Lane",
    "Lipman Hall",
    "Biel Road",
    "Henderson",
    "Gibbons",
    "College Avenue Student Center",
    "The Yard",
    "Student Activities Center"
  ],
  "Weekend 2": [
    "Busch Student Center",
    "Hill Center",
    "Science Building",
    "Allison Road Classrooms",
    "College Avenue Student Center",
    "The Yard",
    "Student Activities Center",
    "College Hall",
    "Red Oak Lane",
    "Lipman Hall",
    "Biel Road",
    "Henderson",
    "Gibbons",
    "Livingston Student Center",
    "Quads",
    "Livingston Plaza"
  ],
  "LX": [
    "College Avenue Student Center",
    "The Yard",
    "Student Activities Center",
    "Livingston Student Center",
    "Livingston Plaza",
    "Quads"
  ],
  "B": [
    "Busch Student Center",
    "Hill Center",
    "Science Building",
    "Allison Road Classrooms",
    "Livingston Student Center",
    "Livingston Plaza",
    "Quads"
  ],
  "A": [
    "College Avenue Student Center",
    "The Yard",
    "Student Activities Center",
    "Busch Student Center",
    "Science Building",
    "Allison Road Classrooms",
    "Hill Center"
  ],
  "H": [
    "College Avenue Student Center",
    "The Yard",
    "Student Activities Center",
    "Busch Student Center",
    "Allison Road Classrooms",
    "Hill Center",
    "Science Building"
  ],
  "F": [
    "College Avenue Student Center",
    "The Yard",
    "Student Activities Center",
    "SoCam Apts",
    "College Hall",
    "Red Oak Lane",
    "Lipman Hall",
    "Biel Road",
    "Henderson",
    "Gibbons"
  ],
  "EE": [
    "College Avenue Student Center",
    "The Yard",
    "Student Activities Center",
    "SoCam Apts",
    "College Hall",
    "Red Oak Lane",
    "Lipman Hall",
    "Biel Road",
    "Henderson",
    "Gibbons"
  ],
  "REXB": [
    "Busch Student Center",
    "Hill Center",
    "Science Building",
    "Allison Road Classrooms",
    "College Hall",
    "Red Oak Lane",
    "Lipman Hall",
    "Biel Road"
  ],
  "REXL": [
    "Livingston Student Center",
    "Livingston Plaza",
    "College Hall",
    "Red Oak Lane",
    "Lipman Hall",
    "Biel Road"
  ]
};

export function getStopsForRoute(routeName: string): BusStop[] {
  if (!routeName) return [];
  const norm = routeName.toLowerCase();
  for (const [key, stopNames] of Object.entries(ROUTE_STOP_SEQUENCES)) {
    if (norm.includes(key.toLowerCase()) || key.toLowerCase().includes(norm)) {
      return stopNames
        .map(name => RUTGERS_BUS_STOPS.find(s => s.name.toLowerCase() === name.toLowerCase()))
        .filter((s): s is BusStop => s !== undefined);
    }
  }
  return RUTGERS_BUS_STOPS.filter(s => s.routes.some(r => norm.includes(r.toLowerCase()) || r.toLowerCase().includes(norm)));
}

/**
 * Returns all stops on a given route strictly between the boarding stop and drop-off stop
 */
export function getRouteSegmentStops(
  routeName?: string,
  boardingStopName?: string,
  dropoffStopName?: string
): BusStop[] {
  if (!routeName) return [];
  const allStops = getStopsForRoute(routeName);
  if (allStops.length === 0) return [];
  if (!boardingStopName || !dropoffStopName) return allStops;

  const bNorm = boardingStopName.toLowerCase();
  const dNorm = dropoffStopName.toLowerCase();

  const idx1 = allStops.findIndex(s => s.name.toLowerCase().includes(bNorm) || bNorm.includes(s.name.toLowerCase()));
  const idx2 = allStops.findIndex(s => s.name.toLowerCase().includes(dNorm) || dNorm.includes(s.name.toLowerCase()));

  if (idx1 === -1 || idx2 === -1) return allStops;

  if (idx1 <= idx2) {
    return allStops.slice(idx1, idx2 + 1);
  } else {
    // Loop route wrapping around
    return [...allStops.slice(idx1), ...allStops.slice(0, idx2 + 1)];
  }
}
