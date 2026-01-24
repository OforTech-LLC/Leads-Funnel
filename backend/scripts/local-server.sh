#!/bin/bash
# =============================================================================
# local-server.sh
# =============================================================================
# Run the API locally for development and testing.
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parse arguments
PORT=8080
BUILD_MODE="debug"

while [[ $# -gt 0 ]]; do
    case $1 in
        --port|-p)
            PORT="$2"
            shift 2
            ;;
        --release)
            BUILD_MODE="release"
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --port, -p PORT   Port to run on (default: 8080)"
            echo "  --release         Build in release mode"
            echo "  --help            Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Change to project root
cd "${PROJECT_ROOT}"

# Set environment variables for local development
export API_STAGE="dev"
export DEBUG_ENABLED="true"
export RATE_LIMIT_ENABLED="false"
export QUARANTINE_ENABLED="true"
export EVENTS_ENABLED="false"
export AWS_REGION="${AWS_REGION:-us-east-1}"
export DYNAMODB_TABLE_NAME="${DYNAMODB_TABLE_NAME:-kanjona-leads-dev}"
export EVENT_BUS_NAME="${EVENT_BUS_NAME:-kanjona-leads-dev}"
export CORS_ALLOWED_ORIGINS="*"

log_info "Building in ${BUILD_MODE} mode..."

# Build the project
swift build -c "${BUILD_MODE}"

log_info "Starting local server on port ${PORT}..."
log_info "Environment:"
echo "  API_STAGE: ${API_STAGE}"
echo "  DEBUG_ENABLED: ${DEBUG_ENABLED}"
echo "  AWS_REGION: ${AWS_REGION}"
echo "  DYNAMODB_TABLE_NAME: ${DYNAMODB_TABLE_NAME}"
echo ""

# Note: This requires the local server code in main.swift to be uncommented
log_warn "Note: Local server mode requires uncommenting code in main.swift"
log_warn "Currently, the @main entry point is the Lambda handler."
echo ""

# For now, just run the built binary (which will be the Lambda handler)
# In a full implementation, you would have a separate local server target
log_info "To test locally, use SAM Local or modify main.swift for Vapor server"

echo ""
echo "Example test requests:"
echo ""
echo "  # Health check"
echo "  curl http://localhost:${PORT}/health"
echo ""
echo "  # Create lead"
echo "  curl -X POST http://localhost:${PORT}/lead \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"email\":\"test@example.com\",\"name\":\"Test User\"}'"
echo ""
