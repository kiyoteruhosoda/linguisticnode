#!/usr/bin/env bash
# scripts/run_tests.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"

log() { echo "[$(date +"%Y-%m-%d %H:%M:%S")] $*"; }

log "========================================"
log "LinguisticNode FULL TEST SUITE START"
log "Root: $ROOT_DIR"
log "========================================"
log "NOTE: This script intentionally validates test-related checks only."
log "NOTE: Release build/deploy verification must be executed in a separate release step."

########################################
# Frontend (React + TypeScript)
########################################
if [ ! -d "$FRONTEND_DIR" ]; then
  echo "Frontend directory not found: $FRONTEND_DIR"
  exit 1
fi

cd "$FRONTEND_DIR"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm not found."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  log "Installing frontend dependencies (npm ci)..."
  npm ci
fi

log "Running frontend lint..."
npm run lint

log "Running TypeScript build (includes type-check)..."
npx tsc -b

log "Running frontend tests with coverage..."
npm run test:coverage

log "Frontend coverage report directory:"
log "  $FRONTEND_DIR/coverage"

########################################
# Done
########################################
log "========================================"
log "LinguisticNode FULL TEST SUITE SUCCESS"
log "========================================"
