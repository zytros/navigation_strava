# VeloRoute Self-Hosted OSRM Backend

This directory contains the self-hosted OSRM (Open Source Routing Machine) backend configuration for VeloRoute using Docker.

## Setup Instructions

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

3. **Run the OSRM Routing Server**:
   ```bash
   docker-compose up -d
   ```

   The OSRM API will be available at `http://localhost:5000`.

4. **Configure Frontend**:
   In your frontend environment configuration (`frontend/.env`), point your routing service to your self-hosted backend:
   ```env
   VITE_OSRM_URL=http://localhost:5000
   ```
