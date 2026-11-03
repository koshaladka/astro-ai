#!/usr/bin/env bash
# Подтянуть main на prod и перезапустить app из GHCR-образа (без next build на VPS).
# Основной путь деплоя — GitHub Actions (.github/workflows/deploy-prod.yml).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f "$HOME/.ssh/config" ]] || ! grep -q "Host astro-vps" "$HOME/.ssh/config" 2>/dev/null; then
  bash "$ROOT/scripts/setup-astro-ssh.sh"
fi

IMAGE="${ASTRO_IMAGE:-ghcr.io/koshaladka/astro-ai:latest}"

ssh astro-vps "set -euo pipefail
  cd /opt/astro-ai
  git fetch origin main
  git checkout -B main origin/main 2>/dev/null || git checkout -B main FETCH_HEAD
  git pull --ff-only origin main
  export ASTRO_IMAGE='$IMAGE'
  docker pull \"\$ASTRO_IMAGE\"
  docker compose -f docker-compose.prod.yml up -d
  git log -1 --oneline
"
curl -sS "https://104.253.18.4/api/health"
echo
