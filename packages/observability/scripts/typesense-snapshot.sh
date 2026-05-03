#!/bin/bash
# Typesense Snapshot Backup Script
# Part of the AACsearch Disaster Recovery stack
#
# Schedule: Every 6 hours (0 */6 * * *)
# Uploads snapshots to S3 and maintains a latest-snapshot pointer.
#
# Prerequisites:
#   - TYPESENSE_ADMIN_KEY env var set
#   - AWS CLI installed and configured
#   - S3 bucket aacsearch-backups exists
#   - curl and tar available

set -euo pipefail

SNAPSHOT_DIR=/tmp/typesense-snapshot
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
S3_BUCKET=${S3_BUCKET:-s3://aacsearch-backups/typesense/}
TYPESENSE_HOST=${TYPESENSE_HOST:-http://localhost:8108}
TYPESENSE_API_KEY=${TYPESENSE_ADMIN_KEY:-}

if [ -z "$TYPESENSE_API_KEY" ]; then
    echo "ERROR: TYPESENSE_ADMIN_KEY environment variable is required"
    exit 1
fi

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting Typesense snapshot..."

# Remove old snapshot directory if exists
rm -rf "$SNAPSHOT_DIR"
mkdir -p "$SNAPSHOT_DIR"

# Trigger Typesense snapshot via API
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Requesting snapshot..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    "$TYPESENSE_HOST/snapshots" \
    -H "X-TYPESENSE-API-KEY: $TYPESENSE_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"snapshot_path\": \"$SNAPSHOT_DIR\"}")

if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
    echo "ERROR: Snapshot request failed with HTTP $HTTP_CODE"
    exit 1
fi

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Snapshot created. Compressing..."

# Compress
tar -czf /tmp/typesense-$TIMESTAMP.tar.gz -C "$SNAPSHOT_DIR" .
SIZE=$(stat -f%z /tmp/typesense-$TIMESTAMP.tar.gz 2>/dev/null || stat -c%s /tmp/typesense-$TIMESTAMP.tar.gz 2>/dev/null || echo "unknown")
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Snapshot size: $SIZE bytes"

# Upload to S3
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Uploading to S3..."
aws s3 cp /tmp/typesense-$TIMESTAMP.tar.gz "$S3_BUCKET" --no-progress

# Update latest pointer
echo "$TIMESTAMP" | aws s3 cp - "$S3_BUCKET/latest-snapshot.txt"
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Latest pointer updated: $TIMESTAMP"

# Cleanup
rm -rf "$SNAPSHOT_DIR" /tmp/typesense-$TIMESTAMP.tar.gz

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Typesense snapshot completed successfully"
