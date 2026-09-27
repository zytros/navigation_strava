import React, { useRef } from 'react';
import { Bike, Navigation, Upload, Download, PlusCircle, Trash2, RotateCcw } from 'lucide-react';
import { BikeRoute } from '../types/route';
import { parseGpxFile, exportRouteToGpx } from '../services/gpxService';

interface HeaderProps {
  route: BikeRoute;
  mode: 'plan' | 'ride';
  onModeChange: (mode: 'plan' | 'ride') => void;
  onRouteUpdate: (route: BikeRoute) => void;
  onClearRoute: () => void;
  onReverseRoute: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  route,
  mode,
  onModeChange,
  onRouteUpdate,
  onClearRoute,
  onReverseRoute,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const importedRoute = parseGpxFile(text, file.name);
        onRouteUpdate(importedRoute);
      } catch (err) {
        alert('Failed to parse GPX file. Please ensure it is a valid GPX format.');
        console.error(err);
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExport = () => {
    if (route.trackPoints.length === 0) {
      alert('No route to export!');
      return;
    }
    const gpxData = exportRouteToGpx(route);
    const blob = new Blob([gpxData], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${route.title.toLowerCase().replace(/\s+/g, '-')}.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDistance = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);
  const formatDuration = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md z-30 relative">
      {/* Brand & Title */}
      <div className="flex items-center gap-3">
        <div className="bg-brand-500 text-white p-2 rounded-xl shadow-lg shadow-brand-500/30 flex items-center justify-center">
          <Bike className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-wide flex items-center gap-2">
            VeloRoute
            <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-500 border border-brand-500/30">
              Road Bike
            </span>
          </h1>
          <p className="text-xs text-slate-400 hidden sm:block">Route Builder & Phone GPS Navigation</p>
        </div>
      </div>

      {/* Stats Quickbar */}
      {route.distance > 0 && (
        <div className="hidden md:flex items-center gap-6 bg-slate-800/80 px-4 py-1.5 rounded-xl border border-slate-700 text-xs">
          <div>
            <span className="text-slate-400 block">Distance</span>
            <span className="font-bold text-slate-200">{formatDistance(route.distance)}</span>
          </div>
          <div className="h-6 w-px bg-slate-700" />
          <div>
            <span className="text-slate-400 block">Elevation</span>
            <span className="font-bold text-emerald-400">+{route.elevationGain}m</span> /{' '}
            <span className="font-bold text-rose-400">-{route.elevationLoss}m</span>
          </div>
          <div className="h-6 w-px bg-slate-700" />
          <div>
            <span className="text-slate-400 block">Est. Time</span>
            <span className="font-bold text-slate-200">{formatDuration(route.estimatedDuration)}</span>
          </div>
        </div>
      )}

      {/* Action Controls & Mode Switcher */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".gpx"
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium border border-slate-700 transition"
          title="Import GPX route"
        >
          <Upload className="w-4 h-4 text-brand-500" />
          <span className="hidden sm:inline">Import GPX</span>
        </button>

        <button
          onClick={handleExport}
          disabled={route.trackPoints.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-medium border border-slate-700 transition"
          title="Export as GPX"
        >
          <Download className="w-4 h-4 text-brand-500" />
          <span className="hidden sm:inline">Export GPX</span>
        </button>

        {route.waypoints.length > 0 && mode === 'plan' && (
          <>
            <button
              onClick={onReverseRoute}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium border border-slate-700 transition"
              title="Reverse route direction"
            >
              <RotateCcw className="w-4 h-4 text-blue-400" />
              <span className="hidden lg:inline">Reverse</span>
            </button>
            <button
              onClick={onClearRoute}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-xs font-medium text-rose-400 border border-rose-500/30 transition"
              title="Clear route"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden lg:inline">Clear</span>
            </button>
          </>
        )}

        <div className="h-6 w-px bg-slate-700 mx-1" />

        {/* Mode Toggle Button */}
        {mode === 'plan' ? (
          <button
            onClick={() => onModeChange('ride')}
            disabled={route.trackPoints.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-amber-600 hover:from-brand-600 hover:to-amber-700 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-brand-500/25 transition"
          >
            <Navigation className="w-4 h-4 animate-pulse" />
            Start GPS Ride / Nav
          </button>
        ) : (
          <button
            onClick={() => onModeChange('plan')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-600 transition"
          >
            <PlusCircle className="w-4 h-4 text-brand-500" />
            Back to Planner
          </button>
        )}
      </div>
    </header>
  );
};
