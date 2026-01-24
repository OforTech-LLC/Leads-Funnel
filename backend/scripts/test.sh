#!/bin/bash
# =============================================================================
# test.sh
# =============================================================================
# Run tests for the Swift backend.
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
VERBOSE=false
FILTER=""
COVERAGE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --filter|-f)
            FILTER="$2"
            shift 2
            ;;
        --coverage)
            COVERAGE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --verbose, -v      Verbose output"
            echo "  --filter, -f NAME  Run only tests matching NAME"
            echo "  --coverage         Generate code coverage report"
            echo "  --help             Show this help message"
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

log_info "Running tests..."

# Build test command
TEST_CMD="swift test"

if [ "${VERBOSE}" = true ]; then
    TEST_CMD="${TEST_CMD} --verbose"
fi

if [ -n "${FILTER}" ]; then
    TEST_CMD="${TEST_CMD} --filter ${FILTER}"
fi

if [ "${COVERAGE}" = true ]; then
    TEST_CMD="${TEST_CMD} --enable-code-coverage"
fi

# Run tests
log_info "Executing: ${TEST_CMD}"
echo ""

if eval "${TEST_CMD}"; then
    log_info "All tests passed!"

    # Generate coverage report if requested
    if [ "${COVERAGE}" = true ]; then
        log_info "Generating coverage report..."

        COVERAGE_PATH="${PROJECT_ROOT}/.build/debug/codecov"
        if [ -d "${COVERAGE_PATH}" ]; then
            xcrun llvm-cov report \
                "${PROJECT_ROOT}/.build/debug/LeadCaptureAPIPackageTests.xctest/Contents/MacOS/LeadCaptureAPIPackageTests" \
                -instr-profile="${COVERAGE_PATH}/default.profdata" \
                -ignore-filename-regex=".build|Tests" \
                2>/dev/null || log_warn "Could not generate coverage report"
        fi
    fi

    exit 0
else
    log_error "Tests failed!"
    exit 1
fi
