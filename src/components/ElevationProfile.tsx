/**
 * @file ElevationProfile.tsx
 * @description Renders an SVG elevation profile chart showing terrain profile, elevation gain/loss stats, and interactive cursor synchronization with the map.
 */

import React, { useState } from 'react';
import { LatLng } from '../types/route';

interface ElevationProfileProps {
  trackPoints: LatLng[];
  distance: number; // total distance in meters
  onHoverPoint?: (point: LatLng | null) => void;
}

/**
 * ElevationProfile component rendering an interactive SVG elevation chart with mouse hover tracking
 * that syncs cursor position with the corresponding geographic point on the map.
 */
export const ElevationProfile: React.FC<ElevationProfileProps> = ({
  trackPoints,
  distance,
  onHoverPoint,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (trackPoints.length < 2 || distance === 0) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-center text-slate-400 text-xs">
        Add waypoints on the map to generate the road elevation profile.
      </div>
    );
  }

  // Extract elevations
  const elevations = trackPoints.map(p => p.ele || 150);
  const minEle = Math.min(...elevations);
  const maxEle = Math.max(...elevations);
  const eleRange = Math.max(maxEle - minEle, 20);

  const width = 800;
  const height = 110;
  const padding = 25;

  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Calculate cumulative distances for each trackpoint
  const dists: number[] = [0];
  let cumDist = 0;
  for (let i = 1; i < trackPoints.length; i++) {
    const p1 = trackPoints[i - 1];
    const p2 = trackPoints[i];
    cumDist += calcDist(p1.lat, p1.lng, p2.lat, p2.lng);
    dists.push(cumDist);
  }
  const maxDist = dists[dists.length - 1] || 1;

  // Build SVG path points
  const points = trackPoints.map((_, i) => {
    const x = padding + (dists[i] / maxDist) * chartWidth;
    const y = height - padding - ((elevations[i] - minEle) / eleRange) * chartHeight;
    return { x, y };
  });

  const pathString = points.reduce((acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`), '');
  const areaString = `${pathString} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const svgX = (mouseX / rect.width) * width;

    // Find closest trackpoint by x coordinate
    let closestIdx = 0;
    let minDiff = Infinity;
    points.forEach((pt, idx) => {
      const diff = Math.abs(pt.x - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });

    setHoverIndex(closestIdx);
    if (onHoverPoint) {
      onHoverPoint(trackPoints[closestIdx]);
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    if (onHoverPoint) onHoverPoint(null);
  };

  const formatDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-3 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between text-xs text-slate-400 mb-1 px-1 font-medium">
        <span>Elevation Profile</span>
        <div className="flex items-center gap-3">
          <span>Min: <strong className="text-slate-200">{Math.round(minEle)}m</strong></span>
          <span>Max: <strong className="text-slate-200">{Math.round(maxEle)}m</strong></span>
        </div>
      </div>

      <div className="relative w-full overflow-hidden rounded-lg bg-slate-950/60 border border-slate-800/80">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-24 cursor-crosshair select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="eleGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#334155" strokeDasharray="3 3" strokeWidth="0.5" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#334155" strokeWidth="1" />

          {/* Area fill */}
          <path d={areaString} fill="url(#eleGradient)" />

          {/* Elevation line */}
          <path d={pathString} fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Hover indicator */}
          {hoverIndex !== null && points[hoverIndex] && (
            <g>
              <line
                x1={points[hoverIndex].x}
                y1={padding}
                x2={points[hoverIndex].x}
                y2={height - padding}
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <circle
                cx={points[hoverIndex].x}
                cy={points[hoverIndex].y}
                r="4.5"
                fill="#38bdf8"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            </g>
          )}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoverIndex !== null && trackPoints[hoverIndex] && (
          <div className="absolute top-2 right-2 bg-slate-900/90 border border-slate-700 text-slate-100 text-[10px] px-2 py-1 rounded shadow pointer-events-none flex items-center gap-2">
            <span>Dist: <strong>{formatDist(dists[hoverIndex])}</strong></span>
            <span>Ele: <strong className="text-brand-500">{Math.round(trackPoints[hoverIndex].ele || 0)}m</strong></span>
          </div>
        )}
      </div>

      <div className="flex justify-between text-[10px] text-slate-500 mt-1 px-1">
        <span>0 km</span>
        <span>{formatDist(distance / 2)}</span>
        <span>{formatDist(distance)}</span>
      </div>
    </div>
  );
};

function calcDist(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
