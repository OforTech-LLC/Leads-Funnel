#!/bin/bash
# =============================================================================
# Upload Static Site to S3
# =============================================================================
# Uploads static site content to S3 and invalidates CloudFront cache.
#
# Usage:
#   ./scripts/upload-site.sh dev ./apps/web/dist
#   ./scripts/upload-site.sh prod ./apps/web/out
# =============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# -----------------------------------------------------------------------------
# Arguments
# -----------------------------------------------------------------------------
ENVIRONMENT="${1:-}"
SOURCE_DIR="${2:-}"

if [[ -z "${ENVIRONMENT}" || -z "${SOURCE_DIR}" ]]; then
    echo -e "${RED}Error: Missing arguments${NC}"
    echo "Usage: $0 <dev|prod> <source_directory>"
    echo ""
    echo "Examples:"
    echo "  $0 dev ./apps/web/dist"
    echo "  $0 prod ./apps/web/out"
    exit 1
fi

if [[ ! -d "${SOURCE_DIR}" ]]; then
    echo -e "${RED}Error: Source directory not found: ${SOURCE_DIR}${NC}"
    exit 1
fi

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
PROJECT_NAME="kanjona-funnel"
BUCKET_NAME="${PROJECT_NAME}-${ENVIRONMENT}-site-origin"
AWS_REGION="${AWS_REGION:-us-east-1}"

echo "=================================================="
echo -e "${GREEN}Static Site Upload${NC}"
echo "=================================================="
echo "Environment: ${ENVIRONMENT}"
echo "Source:      ${SOURCE_DIR}"
echo "Bucket:      ${BUCKET_NAME}"
echo "=================================================="
echo ""

# -----------------------------------------------------------------------------
# Upload to S3
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Uploading files to S3...${NC}"

# Sync with appropriate content types and cache headers
aws s3 sync "${SOURCE_DIR}" "s3://${BUCKET_NAME}" \
    --delete \
    --cache-control "max-age=31536000,public" \
    --exclude "*.html" \
    --exclude "*.json"

# HTML files - no cache (or short cache)
aws s3 sync "${SOURCE_DIR}" "s3://${BUCKET_NAME}" \
    --exclude "*" \
    --include "*.html" \
    --cache-control "max-age=0,no-cache,no-store,must-revalidate" \
    --content-type "text/html"

# JSON files - short cache
aws s3 sync "${SOURCE_DIR}" "s3://${BUCKET_NAME}" \
    --exclude "*" \
    --include "*.json" \
    --cache-control "max-age=300,public" \
    --content-type "application/json"

echo -e "${GREEN}Upload complete.${NC}"
echo ""

# -----------------------------------------------------------------------------
# Get CloudFront Distribution ID
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Getting CloudFront distribution ID...${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"
ENV_DIR="${PROJECT_ROOT}/infra/terraform/envs/${ENVIRONMENT}"

cd "${ENV_DIR}"

DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id 2>/dev/null || echo "")

if [[ -z "${DISTRIBUTION_ID}" ]]; then
    echo -e "${YELLOW}Warning: Could not get CloudFront distribution ID from Terraform.${NC}"
    echo "Skipping cache invalidation."
    exit 0
fi

echo "Distribution ID: ${DISTRIBUTION_ID}"
echo ""

# -----------------------------------------------------------------------------
# Invalidate CloudFront Cache
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Invalidating CloudFront cache...${NC}"

INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "${DISTRIBUTION_ID}" \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)

echo "Invalidation ID: ${INVALIDATION_ID}"
echo ""

# Wait for invalidation to complete (optional)
echo -e "${YELLOW}Waiting for invalidation to complete...${NC}"
aws cloudfront wait invalidation-completed \
    --distribution-id "${DISTRIBUTION_ID}" \
    --id "${INVALIDATION_ID}"

echo ""
echo -e "${GREEN}=================================================="
echo "Site Upload Complete!"
echo "==================================================${NC}"
echo ""
echo "Site URL: https://$(terraform output -raw site_url 2>/dev/null | sed 's|https://||' || echo 'kanjona.com')"
echo ""
