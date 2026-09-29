# VeloRoute 🚴‍♂️🗺️

100% Vibe coded, careful

VeloRoute is a modern, social-media-free web application built specifically for road cyclists. Its primary focus is planning, modifying, displaying, and navigating road bike routes, complete with GPX file manipulation, phone GPS turn-by-turn navigation, and support for a self-hosted OSRM routing backend.

---

## Project Workspace Structure

- **`frontend/`**: React 18, TypeScript, Vite, and Tailwind CSS client application.
- **`backend/`**: Docker Compose setup and instructions for self-hosting your own OSRM routing backend.

---

## What It Does

1. **Road Bike Route Planning:**
   - Click anywhere on the map to place waypoints and build custom road cycling routes.
   - Automatically snaps to bicycle-friendly paved roads using the OSRM routing engine (public or self-hosted).
   - Calculates total distance, elevation gain/loss, and estimated riding time.
   - Rearrange, reverse, or delete waypoints on the fly.

2. **GPX Import & Modification:**
   - Import existing `.gpx` route files via drag-and-drop or file picker.
   - Automatically parses trackpoints, elevation data, and waypoints.
   - Modify imported routes and export them back to clean `.gpx` files for your bike computer (Garmin, Wahoo, Hammerhead Karoo) or phone.

3. **Interactive Route Display & Elevation Profile:**
   - Smooth Leaflet map visualization with numbered waypoint markers.
   - Interactive SVG elevation profile chart: hover over any elevation point to instantly highlight its exact location on the map.

4. **Phone GPS Turn-by-Turn Navigation:**
   - Switch from **Planner Mode** to **Ride / Navigation Mode** when mounting your phone on your bike handlebars.
   - **Real-Time GPS Tracking:** Uses your phone's high-accuracy GPS (`navigator.geolocation`) to track your ride and speed.
   - **Screen Wake Lock API:** Automatically prevents your phone screen from dimming or locking while you ride.
   - **Web Speech API:** Audible voice turn-by-turn guidance (e.g., *"Turn right onto Hauptstrasse"*).
   - **GPS Simulator Mode:** Built-in simulation mode to test turn-by-turn navigation directly from your desktop browser.

---

## Architecture & Module Breakdown (`frontend/src/`)

- **`types/route.ts`** - Defines core data models (`BikeRoute`, `Waypoint`, `TurnInstruction`, `LatLng`).
- **`services/gpxService.ts`** - Handles parsing imported `.gpx` XML files into app routes and serializing routes back into valid `.gpx` XML files.
- **`services/routingService.ts`** - Connects to OSRM cycling routing APIs (configurable via `VITE_OSRM_URL`) and provides robust fallback geometry/elevation interpolation.
- **`components/Header.tsx`** - App navigation bar with title, quick stats, GPX import/export triggers, and mode toggler (Plan vs. Ride).
- **`components/MapView.tsx`** - Leaflet map wrapper rendering route polylines, clickable waypoint markers, and user GPS location markers.
- **`components/ElevationProfile.tsx`** - Canvas/SVG elevation graph with gradient filling and bi-directional hover synchronization with the map.
- **`components/RouteEditor.tsx`** - Sidebar panel for managing route title, waypoint list, and turn-by-turn cue sheets.
- **`components/NavigationHud.tsx`** - Handlebar mount HUD featuring huge turn arrows, distance countdown, audio voice cues, speed, wake lock status, and ride simulation.
- **`App.tsx`** - Main application orchestrating state between Plan mode and Ride navigation mode.

---

## Getting Started & Usage

### Prerequisites
- Node.js (v18 or higher)
- npm
- Docker & Docker Compose (optional, for self-hosted OSRM backend)

### 1. Running the Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

### 2. Running the Self-Hosted OSRM Backend (Optional)
To host your own OSRM routing server:
```bash
cd backend
# Place your region .pbf file in backend/data/map.pbf, run extraction, then:
docker-compose up -d
```
Then configure `frontend/.env` with `VITE_OSRM_URL=http://localhost:5000`.

### 3. Building for Production
```bash
cd frontend
npm run build
```
