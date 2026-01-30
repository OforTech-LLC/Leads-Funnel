#!/bin/bash
# =============================================================================
# build-lambda.sh
# =============================================================================
# Build Swift Lambda function for AWS deployment.
# Supports both local builds and Docker-based cross-compilation for Linux.
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BUILD_DIR="${PROJECT_ROOT}/.build"
LAMBDA_DIR="${PROJECT_ROOT}/lambda"
EXECUTABLE_NAME="LeadCaptureAPI"

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
USE_DOCKER=false
BUILD_TYPE="release"
CLEAN_BUILD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --docker)
            USE_DOCKER=true
            shift
            ;;
        --debug)
            BUILD_TYPE="debug"
            shift
            ;;
        --clean)
            CLEAN_BUILD=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --docker    Build using Docker (for Linux deployment)"
            echo "  --debug     Build in debug mode"
            echo "  --clean     Clean build directory before building"
            echo "  --help      Show this help message"
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

# Clean if requested
if [ "${CLEAN_BUILD}" = true ]; then
    log_info "Cleaning build directory..."
    rm -rf "${BUILD_DIR}"
fi

# Create lambda output directory
mkdir -p "${LAMBDA_DIR}"

if [ "${USE_DOCKER}" = true ]; then
    log_info "Building Lambda function using Docker..."

    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi

    # Build using Swift Amazon Linux 2 image
    docker run --rm \
        -v "${PROJECT_ROOT}:/workspace" \
        -w /workspace \
        --platform linux/arm64 \
        swift:6.0-amazonlinux2 \
        bash -c "
            swift build -c ${BUILD_TYPE} \
                --static-swift-stdlib \
                -Xlinker -s
        "

    # Copy the binary
    BINARY_PATH="${BUILD_DIR}/${BUILD_TYPE}/${EXECUTABLE_NAME}"

else
    log_info "Building Lambda function locally..."

    # Check Swift version
    SWIFT_VERSION=$(swift --version | head -1)
    log_info "Swift version: ${SWIFT_VERSION}"

    # Build
    swift build -c "${BUILD_TYPE}"

    BINARY_PATH="${BUILD_DIR}/${BUILD_TYPE}/${EXECUTABLE_NAME}"
fi

# Check if binary exists
if [ ! -f "${BINARY_PATH}" ]; then
    log_error "Binary not found at ${BINARY_PATH}"
    exit 1
fi

log_info "Binary built successfully: ${BINARY_PATH}"

# Create Lambda deployment package
log_info "Creating Lambda deployment package..."

# For Lambda, we need to create a bootstrap file
BOOTSTRAP_PATH="${LAMBDA_DIR}/bootstrap"

if [ "${USE_DOCKER}" = true ]; then
    # Copy the binary as bootstrap
    cp "${BINARY_PATH}" "${BOOTSTRAP_PATH}"
else
    # For local builds (likely macOS), just copy for testing
    cp "${BINARY_PATH}" "${BOOTSTRAP_PATH}"
fi

chmod +x "${BOOTSTRAP_PATH}"

# Create zip package
ZIP_PATH="${LAMBDA_DIR}/lambda.zip"
log_info "Creating zip package..."

cd "${LAMBDA_DIR}"
zip -j "${ZIP_PATH}" bootstrap

# Show package info
ZIP_SIZE=$(du -h "${ZIP_PATH}" | cut -f1)
log_info "Lambda package created: ${ZIP_PATH} (${ZIP_SIZE})"

# Cleanup
rm -f "${BOOTSTRAP_PATH}"

log_info "Build complete!"
echo ""
echo "Deployment package: ${ZIP_PATH}"
echo ""
echo "To deploy to AWS Lambda:"
echo "  aws lambda update-function-code \\"
echo "    --function-name your-function-name \\"
echo "    --zip-file fileb://${ZIP_PATH}"
