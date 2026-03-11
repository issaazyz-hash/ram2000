#!/usr/bin/env bash
# Production startup: backend (pm2) + frontend build + serve on 4173
# Run from project root (directory containing backend/ and frontend/)

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "=== Installing backend dependencies ==="
(cd backend && npm install --production=false)

echo "=== Starting backend with PM2 ==="
(cd backend && pm2 delete backend 2>/dev/null || true)
(cd backend && pm2 start server.js --name backend)
echo "Backend started (port 3000). Check: pm2 logs backend"

echo "=== Installing frontend dependencies ==="
(cd frontend && npm install)

echo "=== Building frontend (production) ==="
(cd frontend && npm run build)

echo "=== Serving frontend on port 4173 ==="
(cd frontend && pm2 delete frontend 2>/dev/null || true)
(cd frontend && pm2 start npx --name frontend -- serve -s dist -l 4173)
echo "Frontend served at http://0.0.0.0:4173 (pm2 name: frontend)"

echo "=== Done. Frontend: http://187.124.20.147:4173 | Backend API: http://187.124.20.147:3000 ==="
