import { useState, useEffect, useCallback } from 'react';
import { BikeRoute, LatLng, Waypoint } from './types/route';
import { calculateBikeRoute } from './services/routingService';
import { Header } from './components/Header';
import { MapView } from './components/MapView';
import { RouteEditor } from './components/RouteEditor';
import { ElevationProfile } from './components/ElevationProfile';
import { NavigationHud } from './components/NavigationHud';

const INITIAL_WAYPOINTS: Waypoint[] = [
  { id: 'w1', latLng: { lat: 47.3769, lng: 8.5417 }, name: 'Zurich Central' },
  { id: 'w2', latLng: { lat: 47.3500, lng: 8.6000 }, name: 'Lake Greifensee' },
  { id: 'w3', latLng: { lat: 47.3200, lng: 8.5600 }, name: 'Uetliberg Foothills' },
];

export function App() {
  const [route, setRoute] = useState<BikeRoute>({
    id: 'default-route',
    title: 'Zurich Alpine Road Loop',
    waypoints: INITIAL_WAYPOINTS,
    trackPoints: [],
    instructions: [],
    distance: 0,
    elevationGain: 0,
    elevationLoss: 0,
    estimatedDuration: 0,
    createdAt: Date.now(),
  });

  const [mode, setMode] = useState<'plan' | 'ride'>('plan');
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [hoverPoint, setHoverPoint] = useState<LatLng | null>(null);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);

  // Recalculate route whenever waypoints change
  const updateRouteWithWaypoints = useCallback(async (waypoints: Waypoint[], currentTitle: string) => {
    setIsCalculating(true);
    try {
      const updated = await calculateBikeRoute(waypoints, currentTitle);
      setRoute(updated);
    } catch (err) {
      console.error('Failed to calculate route:', err);
    } finally {
      setIsCalculating(false);
    }
  }, []);

  // Initial load calculation
  useEffect(() => {
    updateRouteWithWaypoints(INITIAL_WAYPOINTS, 'Zurich Alpine Road Loop');
  }, [updateRouteWithWaypoints]);

  const handleMapClick = async (latLng: LatLng) => {
    const newWaypoint: Waypoint = {
      id: Math.random().toString(36).substring(2, 9),
      latLng,
      name: `Waypoint ${route.waypoints.length + 1}`,
    };

    let newWaypoints: Waypoint[];

    if (route.waypoints.length < 2) {
      newWaypoints = [...route.waypoints, newWaypoint];
    } else {
      let bestSegmentIdx = -1;
      let minDistance = Infinity;

      for (let i = 0; i < route.waypoints.length - 1; i++) {
        const p1 = route.waypoints[i].latLng;
        const p2 = route.waypoints[i + 1].latLng;
        const segDist = distanceToSegment(latLng, p1, p2);
        if (segDist < minDistance) {
          minDistance = segDist;
          bestSegmentIdx = i;
        }
      }

      const THRESHOLD_METERS = 5000; // 5 km threshold for route proximity

      if (bestSegmentIdx !== -1 && minDistance < THRESHOLD_METERS) {
        newWaypoints = [
          ...route.waypoints.slice(0, bestSegmentIdx + 1),
          newWaypoint,
          ...route.waypoints.slice(bestSegmentIdx + 1),
        ];
      } else {
        newWaypoints = [...route.waypoints, newWaypoint];
      }
    }

    const labeledWaypoints = newWaypoints.map((w, idx) => ({
      ...w,
      name: idx === 0 ? 'Start' : idx === newWaypoints.length - 1 ? 'Finish' : `Waypoint ${idx + 1}`,
    }));

    await updateRouteWithWaypoints(labeledWaypoints, route.title);
  };

  const handleRemoveWaypoint = async (id: string) => {
    const newWaypoints = route.waypoints.filter(w => w.id !== id);
    await updateRouteWithWaypoints(newWaypoints, route.title);
  };

  const handleUpdateWaypointLocation = async (id: string, latLng: LatLng) => {
    const newWaypoints = route.waypoints.map(w => w.id === id ? { ...w, latLng } : w);
    await updateRouteWithWaypoints(newWaypoints, route.title);
  };

  const handleUpdateWaypointName = async (id: string, name: string) => {
    const newWaypoints = route.waypoints.map(w => w.id === id ? { ...w, name } : w);
    setRoute(prev => ({ ...prev, waypoints: newWaypoints }));
  };

  const handleClearRoute = () => {
    setRoute({
      id: Math.random().toString(36).substring(2, 9),
      title: 'New Road Ride',
      waypoints: [],
      trackPoints: [],
      instructions: [],
      distance: 0,
      elevationGain: 0,
      elevationLoss: 0,
      estimatedDuration: 0,
      createdAt: Date.now(),
    });
  };

  const handleReverseRoute = async () => {
    const reversedWaypoints = [...route.waypoints].reverse().map((w, idx) => ({
      ...w,
      name: idx === 0 ? 'Start' : idx === route.waypoints.length - 1 ? 'Finish' : `Waypoint ${idx + 1}`,
    }));
    await updateRouteWithWaypoints(reversedWaypoints, `${route.title} (Reverse)`);
  };

  const handleReorderWaypoints = async (startIndex: number, endIndex: number) => {
    const result = Array.from(route.waypoints);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    const labeledWaypoints = result.map((w, idx) => ({
      ...w,
      name: idx === 0 ? 'Start' : idx === result.length - 1 ? 'Finish' : (w.name === 'Start' || w.name === 'Finish' || w.name.startsWith('Waypoint ') ? `Waypoint ${idx + 1}` : w.name),
    }));

    await updateRouteWithWaypoints(labeledWaypoints, route.title);
  };

  const handleTitleChange = (title: string) => {
    setRoute(prev => ({ ...prev, title }));
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950">
      {/* Header */}
      <Header
        route={route}
        mode={mode}
        onModeChange={setMode}
        onRouteUpdate={(newRoute) => setRoute(newRoute)}
        onClearRoute={handleClearRoute}
        onReverseRoute={handleReverseRoute}
      />

      {/* Main Content Area */}
      <div className="flex-1 relative flex overflow-hidden">
        {mode === 'ride' ? (
          <NavigationHud
            route={route}
            onExit={() => setMode('plan')}
            onUpdateUserLocation={setUserLocation}
          />
        ) : (
          <>
            {/* Map View */}
            <div className="flex-1 h-full relative">
              <MapView
                route={route}
                onMapClick={handleMapClick}
                onRemoveWaypoint={handleRemoveWaypoint}
                onUpdateWaypointLocation={handleUpdateWaypointLocation}
                hoverPoint={hoverPoint}
                userLocation={userLocation}
              />

              {/* Elevation Profile Overlay at bottom-left */}
              <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-[500px] z-20 pointer-events-auto">
                <ElevationProfile
                  trackPoints={route.trackPoints}
                  distance={route.distance}
                  onHoverPoint={setHoverPoint}
                />
              </div>
            </div>

            {/* Route Editor Sidebar */}
            <RouteEditor
              route={route}
              onTitleChange={handleTitleChange}
              onRemoveWaypoint={handleRemoveWaypoint}
              onUpdateWaypointName={handleUpdateWaypointName}
              onReorderWaypoints={handleReorderWaypoints}
              isCalculating={isCalculating}
            />
          </>
        )}
      </div>
    </div>
  );
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

function distanceToSegment(p: LatLng, p1: LatLng, p2: LatLng): number {
  const A = p.lat - p1.lat;
  const B = p.lng - p1.lng;
  const C = p2.lat - p1.lat;
  const D = p2.lng - p1.lng;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx, yy;
  if (param < 0) {
    xx = p1.lat;
    yy = p1.lng;
  } else if (param > 1) {
    xx = p2.lat;
    yy = p2.lng;
  } else {
    xx = p1.lat + param * C;
    yy = p1.lng + param * D;
  }

  return calculateDistance(p.lat, p.lng, xx, yy);
}

export default App;
