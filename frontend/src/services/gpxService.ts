/**
 * @file gpxService.ts
 * @description Provides services for parsing GPX XML strings into BikeRoute objects and serializing BikeRoute objects into GPX XML files.
 */

import { LatLng, Waypoint, BikeRoute, TurnInstruction } from '../types/route';
import { processElevationData } from './elevationUtils';

/**
 * Parses an XML GPX string into a structured BikeRoute object.
 * Extracts track points (<trkpt>), route points (<rtept>), waypoints (<wpt>),
 * calculates cumulative distance, elevation gain/loss, and generates turn instructions.
 */
export function parseGpxFile(gpxText: string, fileName: string): BikeRoute {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(gpxText, 'text/xml');

  const trackPoints: LatLng[] = [];
  const waypoints: Waypoint[] = [];

  // Parse track points (<trkpt>)
  const trkpts = xmlDoc.getElementsByTagName('trkpt');
  for (let i = 0; i < trkpts.length; i++) {
    const pt = trkpts[i];
    const lat = parseFloat(pt.getAttribute('lat') || '0');
    const lng = parseFloat(pt.getAttribute('lon') || '0');
    const eleTag = pt.getElementsByTagName('ele')[0];
    const ele = eleTag ? parseFloat(eleTag.textContent || '0') : undefined;

    trackPoints.push({ lat, lng, ele });
  }

  // If no track points, try route points (<rtept>)
  if (trackPoints.length === 0) {
    const rtepts = xmlDoc.getElementsByTagName('rtept');
    for (let i = 0; i < rtepts.length; i++) {
      const pt = rtepts[i];
      const lat = parseFloat(pt.getAttribute('lat') || '0');
      const lng = parseFloat(pt.getAttribute('lon') || '0');
      const eleTag = pt.getElementsByTagName('ele')[0];
      const ele = eleTag ? parseFloat(eleTag.textContent || '0') : undefined;

      trackPoints.push({ lat, lng, ele });
    }
  }

  // Parse waypoints (<wpt>)
  const wpts = xmlDoc.getElementsByTagName('wpt');
  for (let i = 0; i < wpts.length; i++) {
    const pt = wpts[i];
    const lat = parseFloat(pt.getAttribute('lat') || '0');
    const lng = parseFloat(pt.getAttribute('lon') || '0');
    const nameTag = pt.getElementsByTagName('name')[0];
    const name = nameTag ? nameTag.textContent || `Waypoint ${i + 1}` : `Waypoint ${i + 1}`;
    const eleTag = pt.getElementsByTagName('ele')[0];
    const ele = eleTag ? parseFloat(eleTag.textContent || '0') : undefined;

    waypoints.push({
      id: Math.random().toString(36).substring(2, 9),
      latLng: { lat, lng, ele },
      name,
    });
  }

  // If we have trackpoints but no explicit waypoints, generate control waypoints (Start, Midpoints, End)
  if (waypoints.length === 0 && trackPoints.length > 0) {
    const start = trackPoints[0];
    const end = trackPoints[trackPoints.length - 1];
    waypoints.push({
      id: Math.random().toString(36).substring(2, 9),
      latLng: start,
      name: 'Start',
    });

    if (trackPoints.length > 10) {
      const midIdx = Math.floor(trackPoints.length / 2);
      waypoints.push({
        id: Math.random().toString(36).substring(2, 9),
        latLng: trackPoints[midIdx],
        name: 'Checkpoint',
      });
    }

    waypoints.push({
      id: Math.random().toString(36).substring(2, 9),
      latLng: end,
      name: 'Finish',
    });
  }

  // Smooth elevations and compute gain/loss using processElevationData
  const { points: smoothedTrackPoints, elevationGain: eleGain, elevationLoss: eleLoss } = processElevationData(trackPoints);

  // Calculate total distance
  let totalDist = 0;
  for (let i = 1; i < smoothedTrackPoints.length; i++) {
    const p1 = smoothedTrackPoints[i - 1];
    const p2 = smoothedTrackPoints[i];
    totalDist += calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
  }

  // Generate basic turn instructions if none exist
  const instructions: TurnInstruction[] = [];
  if (trackPoints.length > 0) {
    instructions.push({
      text: 'Start ride from ' + (waypoints[0]?.name || 'Start'),
      distance: 0,
      type: 'straight',
      latLng: trackPoints[0],
    });

    // Sample a few points for simulated turn cues
    const step = Math.max(1, Math.floor(trackPoints.length / 5));
    for (let i = step; i < trackPoints.length - 1; i += step) {
      const pt = trackPoints[i];
      const types: TurnInstruction['type'][] = ['right', 'left', 'slight-right', 'slight-left'];
      const tType = types[Math.floor(Math.random() * types.length)];
      instructions.push({
        text: `Turn ${tType.replace('-', ' ')} onto Road #${Math.floor(i * 13) % 99}`,
        distance: Math.round(i * (totalDist / trackPoints.length)),
        type: tType,
        latLng: pt,
      });
    }

    instructions.push({
      text: 'Arrive at destination',
      distance: Math.round(totalDist),
      type: 'arrive',
      latLng: trackPoints[trackPoints.length - 1],
    });
  }

  // Clean title from filename
  const cleanTitle = fileName.replace(/\.gpx$/i, '').replace(/[-_]/g, ' ');

  return {
    id: Math.random().toString(36).substring(2, 9),
    title: cleanTitle || 'Imported GPX Route',
    waypoints,
    trackPoints,
    instructions,
    distance: totalDist,
    elevationGain: Math.round(eleGain),
    elevationLoss: Math.round(eleLoss),
    estimatedDuration: Math.round(totalDist / (26 * 1000 / 3600)), // 26 km/h avg road bike speed
    createdAt: Date.now(),
  };
}

/**
 * Generates GPX XML string from a BikeRoute.
 */
export function exportRouteToGpx(route: BikeRoute): string {
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="VeloRoute - Road Bike Planner" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(route.title)}</name>
    <time>${new Date(route.createdAt).toISOString()}</time>
  </metadata>
`;

  // Waypoints
  route.waypoints.forEach((wpt, index) => {
    gpx += `  <wpt lat="${wpt.latLng.lat}" lon="${wpt.latLng.lng}">
    ${wpt.latLng.ele !== undefined ? `<ele>${wpt.latLng.ele}</ele>` : ''}
    <name>${escapeXml(wpt.name || `Waypoint ${index + 1}`)}</name>
  </wpt>\n`;
  });

  // Track
  gpx += `  <trk>
    <name>${escapeXml(route.title)}</name>
    <trkseg>\n`;

  route.trackPoints.forEach((pt) => {
    gpx += `      <trkpt lat="${pt.lat}" lon="${pt.lng}">
        ${pt.ele !== undefined ? `<ele>${pt.ele}</ele>` : ''}
      </trkpt>\n`;
  });

  gpx += `    </trkseg>
  </trk>
</gpx>`;

  return gpx;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}

function escapeXml(str: string): string {
  return str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
