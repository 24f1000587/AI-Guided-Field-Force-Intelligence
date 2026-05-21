# Syngenta Field Intelligence — Frontend

React + Vite frontend for the AI-Guided Field Force Intelligence System.

## Features

| Page | Route | Description |
|------|-------|-------------|
| **Dashboard** | `/` | System overview, anomaly summary, quick stats |
| **Visit Planner** | `visit-plan` | Enter Rep ID → AI-ranked list of retailers to visit today |
| **Next Best Action** | `nba` | Enter Retailer ID → AI recommendation for the visit |
| **Alerts** | `anomalies` | Stockout risk, demand spikes, dead stock, coverage gaps |
| **Grower Intel** | `growers` | Per-tehsil farmer profiles, crop stages, warm leads, WhatsApp stats |
| **Campaigns** | `campaigns` | Digital funnel, WhatsApp engagement, POS sales charts |

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Start the backend first
Make sure your FastAPI backend is running on `http://localhost:8000`
```bash
uvicorn main:app --reload --port 8000
```

### 3. Start the frontend dev server
```bash
npm run dev
```

The Vite dev server runs on **http://localhost:5173** and proxies all `/api/*` requests to the backend at `localhost:8000`.

### 4. Build for production
```bash
npm run build
npm run preview
```

## Environment

No `.env` required — the Vite proxy handles the backend URL automatically in dev.

For production, set the backend URL in `vite.config.js`:
```js
proxy: {
  '/api': {
    target: 'http://your-backend-url',
    ...
  }
}
```

## Data tested with
- REP IDs: `REP_0001` – `REP_0500`
- Retailer IDs: `RTL_00001` – `RTL_04000`
- Tehsils: `Patna_T001`, `Jaipur_T007`, `Bharatpur_T023`, `Hisar_T002`, etc.
- Date anchor: `2026-03-29` (latest data date)
