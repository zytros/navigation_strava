export interface LatLng {
  lat: number;
  lng: number;
  ele?: number; // elevation in meters
}

export interface Waypoint {
  id: string;
  latLng: LatLng;
  name: string;
}

export interface TurnInstruction {
  text: string;
  distance: number; // meters from start
  type: 'straight' | 'slight-right' | 'right' | 'sharp-right' | 'slight-left' | 'left' | 'sharp-left' | 'uturn' | 'arrive';
  streetName?: string;
  latLng: LatLng;
}

export interface BikeRoute {
  id: string;
  title: string;
  waypoints: Waypoint[];
  trackPoints: LatLng[]; // Detailed route coordinates (from routing or GPX)
  instructions: TurnInstruction[];
  distance: number; // total meters
  elevationGain: number; // meters
  elevationLoss: number; // meters
  estimatedDuration: number; // seconds (estimated at ~26 km/h road bike speed)
  createdAt: number;
}
