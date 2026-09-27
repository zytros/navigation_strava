# VeloRoute - Road Bike Route Planner & Phone GPS Navigation

## Project Overview

VeloRoute is a specialized cycling web application designed for road cyclists to create, modify, display, and navigate custom road bike routes. Unlike social media-driven platforms, VeloRoute focuses purely on route planning, GPX manipulation, and reliable phone GPS turn-by-turn navigation.

- **Main Technologies:**
  - **Frontend:** React 18, TypeScript, Vite, Tailwind CSS (located in `frontend/`)
  - **Mapping:** Leaflet (`leaflet`, `@types/leaflet`) with CartoDB/OpenStreetMap tile layers
  - **Routing:** OSRM Cycling API (supports public OSRM or self-hosted backend via `VITE_OSRM_URL`) and Open-Elevation API
  - **Backend (Self-Hosted):** Dockerized OSRM routing engine (located in `backend/`)
  - **GPX Engine:** In-browser XML DOMParser and serializer for track and waypoint manipulation
  - **Mobile Web APIs:** Geolocation API (`navigator.geolocation.watchPosition`), Screen Wake Lock API (`navigator.wakeLock`), and Web Speech API (`window.speechSynthesis`) for voice guidance.

- **Architecture:**
  - `frontend/src/types/`: TypeScript definitions (`BikeRoute`, `Waypoint`, `TurnInstruction`, `LatLng`)
  - `frontend/src/services/`: Business logic for GPX parsing/export (`gpxService.ts`) and road-bike OSRM routing (`routingService.ts`)
  - `frontend/src/components/`: Modular React components (`Header`, `MapView`, `RouteEditor`, `ElevationProfile`, `NavigationHud`)
  - `frontend/src/App.tsx`: Central state orchestration between Plan mode and Ride/Navigation mode
  - `backend/`: Docker Compose and setup instructions for self-hosting OSRM

---

## Building and Running

### Prerequisites
- Node.js (v18+ recommended)
- npm
- Docker & Docker Compose (optional, for self-hosted OSRM backend)

### Key Commands

- **Install Frontend Dependencies:**
  ```bash
  cd frontend
  npm install
  ```

- **Run Frontend Development Server (with local network access for phone testing):**
  ```bash
  cd frontend
  npm run dev
  ```

- **Build Frontend for Production:**
  ```bash
  cd frontend
  npm run build
  ```

- **Run Self-Hosted OSRM Backend (Docker):**
  ```bash
  cd backend
  docker-compose up -d
  ```

---

## Development Conventions

- **Type Safety:** Strict TypeScript checking is enabled (`"strict": true`). Always define explicit interfaces for route data, waypoints, and navigation instructions.
- **Styling:** Tailwind CSS utility classes are used exclusively for styling. Maintain the dark-themed obsidian palette (`slate-900`, `slate-950`, and energetic road-bike orange `brand-500`).
- **Mobile Responsiveness:** Components are designed mobile-first, ensuring smooth operation both on desktop browsers (for precise route planning) and smartphone screens mounted on handlebar stems (for GPS navigation).
