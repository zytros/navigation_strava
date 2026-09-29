/**
 * @file routingService.ts
 * @description Provides routing services connecting to the OSRM Cycling API for path calculation and the Open-Elevation API for terrain elevation data enrichment.
 */

import { Waypoint, BikeRoute, TurnInstruction, LatLng } from '../types/route';

/**
 * Fetches terrain elevation data (in meters) for an array of coordinates
 * using the Self-Hosted Open-Elevation backend, falling back to 350m if unavailable.
 */
async function fetchElevations(coords: LatLng[]): Promise<number[]> {
  if (coords.length === 0) return [];

  const batchSize = 100; // Batch size
  const elevations: number[] = new Array(coords.length).fill(350);

  for (let i = 0; i < coords.length; i += batchSize) {
    const chunk = coords.slice(i, i + batchSize);
    let success = false;

    // Try Self-Hosted Open-Elevation backend (e.g. http://localhost:8080/api/v1/lookup or VITE_ELEVATION_URL)
    const elevationBaseUrl = (import.meta as any).env?.VITE_ELEVATION_URL || 'http://localhost:8080/api/v1/lookup';
    try {
      const locations = chunk.map(c => ({ latitude: c.lat, longitude: c.lng }));
      const res = await fetch(elevationBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ locations }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.results && Array.isArray(data.results)) {
          data.results.forEach((item: { elevation: number }, idx: number) => {
            if (item && typeof item.elevation === 'number') {
              elevations[i + idx] = Math.round(item.elevation);
            }
          });
          success = true;
        }
      }
    } catch (err) {
      // Self-hosted server is offline or unreachable; fallback to 350m below
    }

    // If self-hosted backend failed or is offline, fallback to 350m default
    if (!success) {
      chunk.forEach((_, idx) => {
        elevations[i + idx] = 350;
      });
    }
  }

  return elevations;
}

/**
 * Calculates a road-bike route between a list of waypoints using the OSRM Cycling API,
 * enriches trackpoints with real terrain elevation data from Open-Elevation API,
 * calculates elevation gain/loss, total distance, estimated duration, and turn instructions.
 */
export async function calculateBikeRoute(waypoints: Waypoint[], title = 'My Road Bike Ride'): Promise<BikeRoute> {
  if (waypoints.length === 0) {
    return createEmptyRoute(title);
  }

  if (waypoints.length === 1) {
    const pt = waypoints[0].latLng;
    const [ele] = await fetchElevations([pt]);
    return {
      id: Math.random().toString(36).substring(2, 9),
      title,
      waypoints,
      trackPoints: [{ ...pt, ele: ele || 400 }],
      instructions: [{ text: 'Start at ' + waypoints[0].name, distance: 0, type: 'arrive', latLng: pt }],
      distance: 0,
      elevationGain: 0,
      elevationLoss: 0,
      estimatedDuration: 0,
      createdAt: Date.now(),
    };
  }

  try {
    // Construct OSRM request coordinates: {lng},{lat};{lng},{lat}
    const coordsStr = waypoints.map(w => `${w.latLng.lng},${w.latLng.lat}`).join(';');
    const osrmBaseUrl = (import.meta as any).env?.VITE_OSRM_URL || 'https://router.project-osrm.org';
    const url = `${osrmBaseUrl}/route/v1/bike/${coordsStr}?overview=full&geometries=geojson&steps=true`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('OSRM routing request failed');
    }

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) {
      throw new Error('No routes returned from OSRM');
    }

    const routeData = data.routes[0];
    const coordinates: [number, number][] = routeData.geometry.coordinates; // [lng, lat]
    
    const rawCoords: LatLng[] = coordinates.map(coord => ({
      lat: coord[1],
      lng: coord[0],
    }));

    // Fetch real terrain elevations along the OSRM route via Open-Elevation POST API
    const elevations = await fetchElevations(rawCoords);

    const trackPoints: LatLng[] = rawCoords.map((pt, idx) => ({
      ...pt,
      ele: elevations[idx] !== undefined ? elevations[idx] : 400,
    }));

    // Parse OSRM steps into turn instructions
    const instructions: TurnInstruction[] = [];
    let cumulativeDist = 0;

    if (routeData.legs) {
      routeData.legs.forEach((leg: any) => {
        if (leg.steps) {
          leg.steps.forEach((step: any) => {
            const maneuver = step.maneuver;
            const instructionText = formatOsrmInstruction(maneuver, step.name);
            const stepDist = step.distance || 0;

            let turnType: TurnInstruction['type'] = 'straight';
            const mod = maneuver.modifier || '';
            const type = maneuver.type || '';

            if (type === 'turn' || type === 'new name') {
              if (mod.includes('right')) {
                turnType = mod.includes('sharp') ? 'sharp-right' : mod.includes('slight') ? 'slight-right' : 'right';
              } else if (mod.includes('left')) {
                turnType = mod.includes('sharp') ? 'sharp-left' : mod.includes('slight') ? 'slight-left' : 'left';
              }
            } else if (type === 'arrive') {
              turnType = 'arrive';
            }

            const stepCoord = maneuver.location ? { lat: maneuver.location[1], lng: maneuver.location[0] } : trackPoints[0];

            instructions.push({
              text: instructionText,
              distance: Math.round(cumulativeDist),
              type: turnType,
              streetName: step.name || undefined,
              latLng: stepCoord,
            });

            cumulativeDist += stepDist;
          });
        }
      });
    }

    if (instructions.length === 0) {
      instructions.push({ text: 'Start ride', distance: 0, type: 'straight', latLng: trackPoints[0] });
      instructions.push({ text: 'Finish ride', distance: Math.round(routeData.distance), type: 'arrive', latLng: trackPoints[trackPoints.length - 1] });
    }

    let eleGain = 0;
    let eleLoss = 0;
    for (let i = 1; i < trackPoints.length; i++) {
      const diff = (trackPoints[i].ele || 0) - (trackPoints[i - 1].ele || 0);
      if (diff > 0) eleGain += diff;
      else eleLoss += Math.abs(diff);
    }

    return {
      id: Math.random().toString(36).substring(2, 9),
      title,
      waypoints,
      trackPoints,
      instructions,
      distance: routeData.distance, // meters
      elevationGain: Math.round(eleGain),
      elevationLoss: Math.round(eleLoss),
      estimatedDuration: routeData.duration || Math.round(routeData.distance / (26 * 1000 / 3600)),
      createdAt: Date.now(),
    };

  } catch (err) {
    console.warn('Routing API failed, using fallback route generator:', err);
    return createFallbackRoute(waypoints, title);
  }
}

function formatOsrmInstruction(maneuver: any, streetName: string): string {
  const type = maneuver.type;
  const modifier = maneuver.modifier || '';
  const name = streetName ? ` onto ${streetName}` : '';

  switch (type) {
    case 'depart': return `Head out${name}`;
    case 'arrive': return `Arrive at destination`;
    case 'turn': return `Turn ${modifier.replace('_', ' ')}${name}`;
    case 'merge': return `Merge${name}`;
    case 'ramp': return `Take ramp${name}`;
    case 'fork': return `Keep ${modifier}${name}`;
    case 'roundabout': return `Enter roundabout and take exit ${maneuver.exit || 1}${name}`;
    default: return `Continue${name}`;
  }
}

function createEmptyRoute(title: string): BikeRoute {
  return {
    id: Math.random().toString(36).substring(2, 9),
    title,
    waypoints: [],
    trackPoints: [],
    instructions: [],
    distance: 0,
    elevationGain: 0,
    elevationLoss: 0,
    estimatedDuration: 0,
    createdAt: Date.now(),
  };
}

async function createFallbackRoute(waypoints: Waypoint[], title: string): Promise<BikeRoute> {
  const trackPoints: LatLng[] = [];
  let totalDist = 0;

  for (let i = 0; i < waypoints.length; i++) {
    trackPoints.push(waypoints[i].latLng);
    if (i > 0) {
      const p1 = waypoints[i - 1].latLng;
      const p2 = waypoints[i].latLng;
      // Add intermediate interpolated points for smooth track
      const steps = 10;
      for (let s = 1; s < steps; s++) {
        const f = s / steps;
        trackPoints.push({
          lat: p1.lat + (p2.lat - p1.lat) * f,
          lng: p1.lng + (p2.lng - p1.lng) * f,
        });
      }
      totalDist += calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
    }
  }

  const elevations = await fetchElevations(trackPoints);
  const finalTrackPoints = trackPoints.map((pt, idx) => ({
    ...pt,
    ele: elevations[idx] !== undefined ? elevations[idx] : 400,
  }));

  let eleGain = 0;
  let eleLoss = 0;
  for (let i = 1; i < finalTrackPoints.length; i++) {
    const diff = (finalTrackPoints[i].ele || 0) - (finalTrackPoints[i - 1].ele || 0);
    if (diff > 0) eleGain += diff;
    else eleLoss += Math.abs(diff);
  }

  const instructions: TurnInstruction[] = waypoints.map((wpt, idx) => ({
    text: idx === 0 ? `Start at ${wpt.name}` : idx === waypoints.length - 1 ? `Arrive at ${wpt.name}` : `Pass through ${wpt.name}`,
    distance: Math.round((idx / (waypoints.length - 1 || 1)) * totalDist),
    type: idx === waypoints.length - 1 ? 'arrive' : 'straight',
    latLng: wpt.latLng,
  }));

  return {
    id: Math.random().toString(36).substring(2, 9),
    title,
    waypoints,
    trackPoints: finalTrackPoints,
    instructions,
    distance: totalDist,
    elevationGain: Math.round(eleGain),
    elevationLoss: Math.round(eleLoss),
    estimatedDuration: Math.round(totalDist / (26 * 1000 / 3600)),
    createdAt: Date.now(),
  };
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
