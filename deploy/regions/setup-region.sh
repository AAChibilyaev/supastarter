#!/bin/bash
# AACsearch — Region deploy setup script
# Usage: ./deploy/regions/<region>/setup.sh [eu|us|ru]
set -euo pipefail

REGION="${1:-eu}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.$REGION"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: Environment file not found: $ENV_FILE"
  echo "Usage: $0 [eu|us|ru]"
  exit 1
fi

echo "=== AACsearch — Deploying $REGION region ==="
echo "Project: $PROJECT_DIR"
echo "Env:     $ENV_FILE"
echo ""

# Validate required env vars
echo "Validating environment..."
source "$ENV_FILE"
: "${TYPESENSE_ADMIN_API_KEY:?Required}"
: "${DB_PASSWORD:?Required}"
: "${MINIO_ROOT_PASSWORD:?Required}"
: "${NEXT_PUBLIC_SAAS_URL:?Required}"
: "${BETTER_AUTH_SECRET:?Required}"
: "${SEARCH_CRON_SECRET:?Required}"

echo "✓ Environment validated"

# Build the Docker image
echo ""
echo "Building AACsearch app image..."
cd "$PROJECT_DIR"
docker compose -f "$PROJECT_DIR/docker-compose.production.yml" build app

# Start the region stack
echo ""
echo "Starting $REGION region stack..."
docker compose \
  -f "$PROJECT_DIR/deploy/regions/common/docker-compose.base.yml" \
  -f "$SCRIPT_DIR/docker-compose.yml" \
  --env-file "$ENV_FILE" \
  up -d

echo ""
echo "✓ $REGION region deployed successfully"
echo "  App URL: $NEXT_PUBLIC_SAAS_URL"
echo "  Typesense: http://localhost:8108 (local container)"
echo "  Postgres: localhost:5432"
echo ""

# Show running status
docker compose \
  -f "$PROJECT_DIR/deploy/regions/common/docker-compose.base.yml" \
  -f "$SCRIPT_DIR/docker-compose.yml" \
  --env-file "$ENV_FILE" \
  ps
