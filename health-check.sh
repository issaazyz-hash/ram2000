#!/usr/bin/env bash
# Quick health check: backend port 3000, /api/auth/login, frontend dist

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
FAIL=0

echo "=== Health Check ==="

# 1) Backend listening on 3000
if command -v curl &>/dev/null; then
  if curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "http://127.0.0.1:3000/health" 2>/dev/null | grep -qE '^200$'; then
    echo "[OK] Backend responds on port 3000 (health)"
  else
    echo "[FAIL] Backend not responding on port 3000"
    FAIL=1
  fi
else
  if (ss -tulpn 2>/dev/null || netstat -an 2>/dev/null) | grep -qE '[:.]3000\s'; then
    echo "[OK] Port 3000 is in use (backend likely running)"
  else
    echo "[WARN] Port 3000 not in use or curl not available"
    FAIL=1
  fi
fi

# 2) POST /api/auth/login exists (OPTIONS or GET health from same host)
if command -v curl &>/dev/null; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://127.0.0.1:3000/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"x","password":"y"}' 2>/dev/null || echo "000")
  if [[ "$CODE" == "401" || "$CODE" == "400" || "$CODE" == "200" ]]; then
    echo "[OK] POST /api/auth/login exists (response code: $CODE)"
  else
    echo "[FAIL] POST /api/auth/login not reachable (code: $CODE)"
    FAIL=1
  fi
fi

# 3) Frontend dist exists
if [[ -d "$ROOT/frontend/dist" && -f "$ROOT/frontend/dist/index.html" ]]; then
  echo "[OK] Frontend dist exists (frontend/dist/index.html)"
else
  echo "[FAIL] Frontend dist missing. Run: cd frontend && npm run build"
  FAIL=1
fi

echo "=== End ==="
[[ $FAIL -eq 0 ]] && echo "All checks passed." || echo "Some checks failed."
exit $FAIL
