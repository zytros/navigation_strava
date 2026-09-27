/**
 * @file MapView.tsx
 * @description Renders the Leaflet interactive map displaying the route polyline, waypoint markers, elevation hover point, and live user GPS location.
 */

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { BikeRoute, LatLng } from '../types/route';

interface MapViewProps {
  route: BikeRoute;
  onMapClick: (latLng: LatLng) => void;
  onRemoveWaypoint: (id: string) => void;
  onUpdateWaypointLocation: (id: string, latLng: LatLng) => void;
  hoverPoint?: LatLng | null;
  userLocation?: LatLng | null;
}

/**
 * MapView component wrapping Leaflet map initialization, polyline rendering for route paths,
 * draggable waypoint markers, live user GPS marker tracking, and elevation cursor hover highlights.
 */
export const MapView: React.FC<MapViewProps> = ({
  route,
  onMapClick,
  onRemoveWaypoint,
  onUpdateWaypointLocation,
  hoverPoint,
  userLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const waypointsLayerRef = useRef<L.LayerGroup | null>(null);
  const hoverMarkerRef = useRef<L.CircleMarker | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
      }).setView([47.3769, 8.5417], 13);

      L.control.zoom({ position: 'topright' }).addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      map.on('click', (e: L.LeafletMouseEvent) => {
        onMapClickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      waypointsLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Route Polyline & Waypoints Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Update Route Line
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    if (route.trackPoints.length > 0) {
      const latLngs = route.trackPoints.map(p => [p.lat, p.lng] as [number, number]);
      routeLayerRef.current = L.polyline(latLngs, {
        color: '#f97316',
        weight: 5,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
    }

    // Update Waypoints Markers
    if (waypointsLayerRef.current) {
      waypointsLayerRef.current.clearLayers();

      route.waypoints.forEach((wpt, index) => {
        const isStart = index === 0;
        const isEnd = index === route.waypoints.length - 1 && route.waypoints.length > 1;

        const color = isStart ? '#22c55e' : isEnd ? '#ef4444' : '#f97316';
        const label = isStart ? 'Start' : isEnd ? 'Finish' : `${index + 1}`;

        const customIcon = L.divIcon({
          className: 'custom-waypoint-icon',
          html: `<div style="background-color: ${color}; color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.3); border: 2px solid white; cursor: grab;">${label === 'Start' || label === 'Finish' ? label[0] : label}</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });

        // Make waypoint markers draggable
        const marker = L.marker([wpt.latLng.lat, wpt.latLng.lng], { 
          icon: customIcon,
          draggable: true 
        });

        marker.on('dragend', (e) => {
          const newPos = e.target.getLatLng();
          onUpdateWaypointLocation(wpt.id, { lat: newPos.lat, lng: newPos.lng });
        });

        marker.bindPopup(`
          <div style="font-family:sans-serif; font-size:12px;">
            <strong>${wpt.name}</strong><br/>
            <em>Drag marker on map to adjust route</em><br/>
            <button id="del-wpt-${wpt.id}" style="margin-top:6px; background:#ef4444; color:white; border:none; padding:3px 8px; border-radius:4px; cursor:pointer;">Remove Waypoint</button>
          </div>
        `);

        marker.on('popupopen', () => {
          const btn = document.getElementById(`del-wpt-${wpt.id}`);
          if (btn) {
            btn.onclick = () => {
              onRemoveWaypoint(wpt.id);
              map.closePopup();
            };
          }
        });

        if (waypointsLayerRef.current) {
          waypointsLayerRef.current.addLayer(marker);
        }
      });
    }
  }, [route, onRemoveWaypoint, onUpdateWaypointLocation]);

  // Hover point sync from elevation profile
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (hoverMarkerRef.current) {
      hoverMarkerRef.current.remove();
      hoverMarkerRef.current = null;
    }

    if (hoverPoint) {
      hoverMarkerRef.current = L.circleMarker([hoverPoint.lat, hoverPoint.lng], {
        radius: 8,
        color: '#ffffff',
        fillColor: '#38bdf8',
        fillOpacity: 1,
        weight: 2,
      }).addTo(map);
    }
  }, [hoverPoint]);

  // User GPS location marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    if (userLocation) {
      const userIcon = L.divIcon({
        className: 'user-gps-icon',
        html: `<div style="background-color: #38bdf8; width: 18px; height: 18px; border-radius: 50%; box-shadow: 0 0 0 6px rgba(56,189,248,0.4); border: 2px solid white; animation: pulse 2s infinite;"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon }).addTo(map);
    }
  }, [userLocation]);

  return <div ref={mapContainerRef} className="w-full h-full relative z-10" />;
};
