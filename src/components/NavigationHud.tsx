import { useState, useEffect } from 'react';
import { BikeRoute, LatLng, TurnInstruction } from '../types/route';
import { Navigation, Volume2, VolumeX, Shield, Play, Pause, ArrowUp, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface NavigationHudProps {
  route: BikeRoute;
  onExit: () => void;
  onUpdateUserLocation: (loc: LatLng | null) => void;
}

export const NavigationHud: React.FC<NavigationHudProps> = ({
  route,
  onExit,
  onUpdateUserLocation,
}) => {
  const [, setCurrentLocIndex] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [speed, setSpeed] = useState(26.4); // km/h
  const [distanceToNextTurn, setDistanceToNextTurn] = useState(350); // meters

  // Request Screen Wake Lock for bike handlebar mount
  useEffect(() => {
    let wakeLock: any = null;
    async function requestWakeLock() {
      if ('wakeLock' in navigator) {
        try {
          wakeLock = await (navigator as any).wakeLock.request('screen');
          setWakeLockActive(true);
        } catch (err) {
          console.warn('Wake Lock request failed:', err);
        }
      }
    }
    requestWakeLock();

    return () => {
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, []);

  // Real GPS Watcher
  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!isSimulating) {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const spd = position.coords.speed ? position.coords.speed * 3.6 : 26.0; // convert m/s to km/h
          setSpeed(Math.round(spd * 10) / 10);
          onUpdateUserLocation({ lat, lng });
        }
      },
      (err) => console.warn('Geolocation error:', err),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isSimulating, onUpdateUserLocation]);

  // Simulation mode timer
  useEffect(() => {
    if (!isSimulating || route.trackPoints.length === 0) return;

    const interval = setInterval(() => {
      setCurrentLocIndex((prev) => {
        if (prev >= route.trackPoints.length - 1) {
          setIsSimulating(false);
          return prev;
        }
        const next = prev + 1;
        const pt = route.trackPoints[next];
        onUpdateUserLocation(pt);

        // Update distance to next turn
        setDistanceToNextTurn((d) => Math.max(0, d - 45));
        return next;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [isSimulating, route.trackPoints, onUpdateUserLocation]);

  // Current turn instruction finder
  const currentInstruction: TurnInstruction = route.instructions[0] || {
    text: 'Follow route ahead',
    distance: 0,
    type: 'straight',
    latLng: route.trackPoints[0] || { lat: 0, lng: 0 },
  };

  const speakInstruction = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const getTurnIcon = (type: TurnInstruction['type']) => {
    switch (type) {
      case 'right':
      case 'slight-right':
      case 'sharp-right':
        return <ArrowRight className="w-16 h-16 text-brand-500" />;
      case 'left':
      case 'slight-left':
      case 'sharp-left':
        return <ArrowLeft className="w-16 h-16 text-blue-400" />;
      case 'arrive':
        return <CheckCircle2 className="w-16 h-16 text-emerald-400" />;
      default:
        return <ArrowUp className="w-16 h-16 text-brand-500" />;
    }
  };

  return (
    <div className="absolute inset-0 bg-slate-950 text-slate-100 z-50 flex flex-col justify-between p-4 sm:p-6 overflow-hidden select-none">
      {/* Top Bar: Route Title & Quick Status */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 px-4 py-3 rounded-2xl backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="bg-brand-500/20 border border-brand-500/40 p-2 rounded-xl text-brand-500">
            <Navigation className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="font-bold text-sm sm:text-base text-slate-100 truncate max-w-[200px] sm:max-w-md">
              {route.title}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400">
                <Shield className="w-3 h-3" /> WakeLock {wakeLockActive ? 'Active' : 'Standby'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title={voiceEnabled ? 'Mute voice cues' : 'Enable voice cues'}
          >
            {voiceEnabled ? <Volume2 className="w-5 h-5 text-brand-500" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
          </button>

          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${
              isSimulating
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isSimulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span className="hidden sm:inline">{isSimulating ? 'Pause Sim' : 'Simulate Ride'}</span>
          </button>

          <button
            onClick={onExit}
            className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-xs font-bold border border-rose-500/40 transition"
          >
            Exit Ride
          </button>
        </div>
      </div>

      {/* Main Turn-by-Turn Guidance Card (Huge for handlebar mount readability) */}
      <div className="my-auto bg-gradient-to-b from-slate-900 to-slate-900/95 border-2 border-brand-500/50 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-brand-500/10 text-center max-w-2xl mx-auto w-full">
        <div className="flex justify-center mb-6">
          <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-inner">
            {getTurnIcon(currentInstruction.type)}
          </div>
        </div>

        <div className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-2">
          {distanceToNextTurn} <span className="text-2xl sm:text-3xl font-bold text-brand-500">m</span>
        </div>

        <h3 className="text-xl sm:text-2xl font-bold text-slate-100 mb-6 px-4 leading-snug">
          {currentInstruction.text}
        </h3>

        <button
          onClick={() => speakInstruction(currentInstruction.text)}
          className="px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 inline-flex items-center gap-2 transition"
        >
          <Volume2 className="w-4 h-4 text-brand-500" />
          Repeat Turn Audio
        </button>
      </div>

      {/* Bottom Bike Computer HUD metrics */}
      <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto w-full">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl text-center">
          <span className="text-xs uppercase tracking-wider text-slate-400 block mb-1">Speed</span>
          <div className="text-2xl sm:text-3xl font-black text-brand-500">
            {speed} <span className="text-xs font-normal text-slate-400">km/h</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl text-center">
          <span className="text-xs uppercase tracking-wider text-slate-400 block mb-1">Distance</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-100">
            {(route.distance / 1000).toFixed(1)} <span className="text-xs font-normal text-slate-400">km</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl text-center">
          <span className="text-xs uppercase tracking-wider text-slate-400 block mb-1">Elevation</span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">
            +{route.elevationGain} <span className="text-xs font-normal text-slate-400">m</span>
          </div>
        </div>
      </div>
    </div>
  );
};
