#!/usr/bin/env bash
# start.sh — sobe o sistema completo (mysql + backend + frontend + nginx)
#
# Uso:
#   ./start.sh          → build + sobe tudo em background
#   ./start.sh --logs   → build + sobe tudo e acompanha os logs

set -euo pipefail
cd "$(dirname "$0")"

echo "==> Subindo containers (docker compose up -d --build)..."
docker compose up -d --build

echo "==> Aguardando backend responder em http://localhost:5000/api/health..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "==> Backend OK"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "==> Backend não respondeu a tempo. Verifique: docker compose logs backend"
    exit 1
  fi
  sleep 2
done

echo ""
echo "Sistema no ar:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:5000/api/health"
echo "  Nginx:    http://localhost:8080"
echo "  MySQL:    localhost:3307"
echo ""
docker compose ps

if [ "${1:-}" = "--logs" ]; then
  docker compose logs -f
fi
