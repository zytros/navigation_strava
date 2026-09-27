# VeloRoute Frontend (`frontend/`)

This directory contains the React 18, TypeScript, Vite, and Tailwind CSS frontend application for VeloRoute.

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
The development server runs at `http://localhost:3000` with local network access enabled for mobile phone testing on handlebar mounts.

### 3. Build for Production
```bash
npm run build
```

## Environment Configuration

To connect the frontend to your self-hosted OSRM backend instead of the public OSRM API, create a `.env` file in this directory with:
```env
VITE_OSRM_URL=http://localhost:5000
```
