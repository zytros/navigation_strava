import React from 'react';
import { BikeRoute } from '../types/route';
import { Trash2, MapPin, Navigation as NavIcon, ChevronRight, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';

interface RouteEditorProps {
  route: BikeRoute;
  onTitleChange: (title: string) => void;
  onRemoveWaypoint: (id: string) => void;
  onUpdateWaypointName: (id: string, name: string) => void;
  onReorderWaypoints: (startIndex: number, endIndex: number) => void;
  isCalculating: boolean;
}

export const RouteEditor: React.FC<RouteEditorProps> = ({
  route,
  onTitleChange,
  onRemoveWaypoint,
  onUpdateWaypointName,
  onReorderWaypoints,
  isCalculating,
}) => {
  return (
    <div className="bg-slate-900/95 border-l border-slate-800 text-slate-100 flex flex-col h-full w-full max-w-sm shadow-2xl backdrop-blur z-20 overflow-hidden">
      {/* Title Input */}
      <div className="p-4 border-b border-slate-800">
        <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Route Title</label>
        <input
          type="text"
          value={route.title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500 font-medium transition"
          placeholder="Enter road bike route name..."
        />
      </div>

      {/* Tabs / Sections */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Waypoints Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-brand-500" />
              Waypoints ({route.waypoints.length})
            </h3>
            {isCalculating && (
              <span className="text-[10px] text-brand-500 animate-pulse font-medium">Calculating route...</span>
            )}
          </div>

          {route.waypoints.length === 0 ? (
            <div className="bg-slate-950/50 border border-dashed border-slate-800 rounded-xl p-6 text-center text-slate-400 text-xs">
              Click anywhere on the map to place waypoints and build your road bike route.
            </div>
          ) : (
            <div className="space-y-2">
              {route.waypoints.map((wpt, idx) => {
                const isStart = idx === 0;
                const isEnd = idx === route.waypoints.length - 1 && route.waypoints.length > 1;
                const badgeColor = isStart ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : isEnd ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-brand-500/20 text-brand-500 border-brand-500/30';

                return (
                  <div
                    key={wpt.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', idx.toString())}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const draggedIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
                      if (!isNaN(draggedIdx) && draggedIdx !== idx) {
                        onReorderWaypoints(draggedIdx, idx);
                      }
                    }}
                    className="flex items-center justify-between bg-slate-950/60 border border-slate-800/80 px-2.5 py-2 rounded-xl text-xs hover:border-slate-700 transition gap-2 group"
                  >
                    <div className="flex items-center gap-1.5 overflow-hidden flex-1">
                      <GripVertical className="w-4 h-4 text-slate-600 group-hover:text-slate-400 shrink-0 cursor-grab active:cursor-grabbing" />
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] border shrink-0 ${badgeColor}`}>
                        {isStart ? 'S' : isEnd ? 'F' : idx + 1}
                      </span>
                      <input
                        type="text"
                        value={wpt.name}
                        onChange={(e) => onUpdateWaypointName(wpt.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-transparent border border-transparent hover:border-slate-700 focus:border-brand-500 rounded px-1.5 py-0.5 text-xs text-slate-200 w-full focus:outline-none transition"
                      />
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {idx > 0 && (
                        <button
                          onClick={() => onReorderWaypoints(idx, idx - 1)}
                          className="text-slate-500 hover:text-slate-200 p-1 transition"
                          title="Move up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {idx < route.waypoints.length - 1 && (
                        <button
                          onClick={() => onReorderWaypoints(idx, idx + 1)}
                          className="text-slate-500 hover:text-slate-200 p-1 transition"
                          title="Move down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onRemoveWaypoint(wpt.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 transition"
                        title="Remove waypoint"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Turn-by-Turn Cue Sheet */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 mb-2">
            <NavIcon className="w-4 h-4 text-blue-400" />
            Turn Cue Sheet ({route.instructions.length})
          </h3>

          {route.instructions.length === 0 ? (
            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-center text-slate-500 text-xs">
              No turn cues generated yet.
            </div>
          ) : (
            <div className="space-y-2">
              {route.instructions.map((inst, i) => (
                <div key={i} className="flex items-start gap-2.5 bg-slate-950/40 border border-slate-800/60 p-2.5 rounded-xl text-xs">
                  <div className="bg-slate-800 p-1.5 rounded-lg text-brand-500 mt-0.5 shrink-0">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-200 font-medium leading-snug">{inst.text}</p>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      at {(inst.distance / 1000).toFixed(1)} km
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
