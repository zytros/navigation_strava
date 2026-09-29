# VeloRoute Self-Hosted Backends (OSRM & Elevation Microservice)

This directory contains the self-hosted routing (OSRM) and terrain elevation (Custom FastAPI Elevation) backend services for VeloRoute using Docker.

## Setup Instructions

### 1. OSRM Routing Backend

1. **Download OpenStreetMap Region Data (.pbf)**:
   Download the `.pbf` extract for your desired cycling region (e.g., Switzerland from [Geofabrik](https://download.geofabrik.de/)) and save it inside `backend/data/` as `map.pbf`.

2. **Extract, Partition, and Contract the OSM Data**:
   Run the OSRM preprocessing pipeline using Docker:
   ```bash
   # 1. Extract routing graph using bicycle profile
   docker run --rm -t -v "${PWD}/data:/data" osrm/osrm-backend osrm-extract -p /opt/bicycle.lua /data/map.pbf

   # 2. Partition graph (for MLD algorithm)
   docker run --rm -t -v "${PWD}/data:/data" osrm/osrm-backend osrm-partition /data/map.osrm

   # 3. Customize graph
   docker run --rm -t -v "${PWD}/data:/data" osrm/osrm-backend osrm-customize /data/map.osrm
   ```

3. **Run Services**:
   Start both OSRM and Elevation containers:
   ```bash
   docker-compose up --build -d
   ```

   - OSRM Routing API: `http://localhost:5000`
   - Elevation API: `http://localhost:8080/api/v1/lookup`

### 2. Configure Frontend

In your frontend environment configuration (`frontend/.env`), point your routing and elevation services to your self-hosted backend:
```env
VITE_OSRM_URL=http://localhost:5000
VITE_ELEVATION_URL=http://localhost:8080/api/v1/lookup
```
