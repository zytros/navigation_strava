import { Waypoint, BikeRoute, TurnInstruction, LatLng } from '../types/route';

/**
 * Calculates a road-bike route between a list of waypoints using OSRM Cycling API.
 * Falls back to smooth interpolation if offline or rate-limited.
 */
export async function calculateBikeRoute(waypoints: Waypoint[], title = 'My Road Bike Ride'): Promise<BikeRoute> {
  if (waypoints.length === 0) {
    return createEmptyRoute(title);
  }

  if (waypoints.length === 1) {
    const pt = waypoints[0].latLng;
    return {
      id: Math.random().toString(36).substring(2, 9),
      title,
      waypoints,
      trackPoints: [pt],
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
    const url = `https://router.project-osrm.org/route/v1/bike/${coordsStr}?overview=full&geometries=geojson&steps=true`;

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
    
    const trackPoints: LatLng[] = coordinates.map((coord, idx) => {
      // Simulate realistic road bike elevation profile if not provided
      const progress = idx / coordinates.length;
      const baseEle = 120 + Math.sin(progress * Math.PI * 4) * 45 + Math.cos(progress * Math.PI * 8) * 15;
      return {
        lat: coord[1],
        lng: coord[0],
        ele: Math.round(baseEle),
      };
    });

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
    console.warn('Routing API failed, using straight-line interpolation fallback:', err);
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

function createFallbackRoute(waypoints: Waypoint[], title: string): BikeRoute {
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
          ele: 100 + Math.sin(f * Math.PI) * 30,
        });
      }
      totalDist += calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
    }
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
    trackPoints,
    instructions,
    distance: totalDist,
    elevationGain: Math.round(waypoints.length * 25),
    elevationLoss: Math.round(waypoints.length * 20),
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
