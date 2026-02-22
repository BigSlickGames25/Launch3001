# LAUNCHER – Neon Lander 3D (Prototype)

## Web (Three.js + Vite)
```bash
cd apps/web
npm i
npm run dev -- --host
```

Open the LAN URL on your phone.

Tilt:
- iOS: tap **Enable Tilt** and allow motion permission.
- Some devices require HTTPS for sensor access.

If iOS says motion is denied:
- iPhone Settings -> Safari -> Motion & Orientation Access -> On
- In Safari, open the site settings for this page and set Motion & Orientation Access to Allow
- Use HTTPS when opening from another device (LAN `http://...` may be blocked for sensors)

## Optional API (Mongo + Redis + Docker)
From repo root:
```bash
docker compose up --build
```

Health:
- http://localhost:8080/health
Scores:
- GET http://localhost:8080/api/scores
- POST http://localhost:8080/api/scores  { "name":"Brent", "score":1234, "level":7 }

## GitHub Pages (No Workflow File)
This repo now publishes from `main` -> `/docs` (no `.github/workflows/pages.yml`).

To refresh the hosted site after web changes:
```powershell
cd apps/web
$env:VITE_BASE_PATH='/Launch3001/'
npm run build
cd ..
if (Test-Path ../docs) { Remove-Item ../docs -Recurse -Force }
New-Item -ItemType Directory -Path ../docs | Out-Null
Copy-Item dist/* ../docs -Recurse -Force
```
