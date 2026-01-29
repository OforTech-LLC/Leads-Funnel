#!/bin/bash
# =============================================================================
# Agent Gate - Pre-commit/Pre-PR Quality Gate
# =============================================================================
# This script enforces quality standards before code can be committed or
# a PR can be opened. It runs linting, type-checking, tests, and security
# checks across all parts of the codebase.
#
# Usage:
#   ./scripts/agent_gate.sh [--quick]
#
# Options:
#   --quick    Skip slow operations (full test suite, terraform validate)
#
# Exit codes:
#   0 - All checks passed
#   1 - One or more checks failed
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track failures
FAILURES=()

# Parse arguments
QUICK_MODE=false
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --quick) QUICK_MODE=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Helper functions
print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_failure() {
    echo -e "${RED}✗ $1${NC}"
    FAILURES+=("$1")
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════════════════╗"
echo "║                           AGENT GATE                                      ║"
echo "║                    Quality Enforcement Script                             ║"
echo "╚═══════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

if [ "$QUICK_MODE" = true ]; then
    print_warning "Running in QUICK mode - some checks will be skipped"
fi

# =============================================================================
# 1. Check for secrets/credentials
# =============================================================================
print_header "1. Security Check - Scanning for Secrets"

# Check for common secret patterns
SECRET_PATTERNS=(
    "PRIVATE.KEY"
    "api_key.*="
    "password.*="
    "secret.*="
    "AWS_ACCESS_KEY"
    "AWS_SECRET"
    "TWILIO_AUTH_TOKEN"
    "ELEVENLABS_API_KEY"
)

FOUND_SECRETS=false
for pattern in "${SECRET_PATTERNS[@]}"; do
    if grep -rni "$pattern" --include="*.ts" --include="*.tsx" --include="*.swift" --include="*.tf" \
        --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.build \
        --exclude="*.example" --exclude="*.sample" . 2>/dev/null | grep -v "process.env" | grep -v "var\." | grep -v "SSM" | grep -v "SecretsManager" | head -5; then
        FOUND_SECRETS=true
    fi
done

if [ "$FOUND_SECRETS" = true ]; then
    print_warning "Potential secrets found - please review above lines"
else
    print_success "No hardcoded secrets detected"
fi

# Check for .env files that shouldn't be committed
if git ls-files --error-unmatch .env .env.local .env.production 2>/dev/null; then
    print_failure "Found .env files staged for commit - remove from git"
else
    print_success "No .env files staged for commit"
fi

# =============================================================================
# 2. Web App Checks (Next.js/TypeScript)
# =============================================================================
print_header "2. Web App Checks"

if [ -d "apps/web" ]; then
    cd apps/web

    # ESLint
    print_info "Running ESLint..."
    if npm run lint 2>&1; then
        print_success "ESLint passed"
    else
        print_failure "ESLint failed"
    fi

    # TypeScript type check
    print_info "Running TypeScript type check..."
    if npm run type-check 2>&1; then
        print_success "TypeScript type check passed"
    else
        print_failure "TypeScript type check failed"
    fi

    # Build check (can catch additional issues)
    if [ "$QUICK_MODE" = false ]; then
        print_info "Running build check..."
        if npm run build 2>&1; then
            print_success "Build succeeded"
        else
            print_failure "Build failed"
        fi
    else
        print_warning "Skipping build check in quick mode"
    fi

    cd "$PROJECT_ROOT"
else
    print_warning "Web app directory not found at apps/web"
fi

# =============================================================================
# 3. Swift Backend Checks
# =============================================================================
print_header "3. Swift Backend Checks"

if [ -d "backend" ] || [ -d "apps/api-swift" ]; then
    BACKEND_DIR="backend"
    if [ -d "apps/api-swift" ]; then
        BACKEND_DIR="apps/api-swift"
    fi

    cd "$BACKEND_DIR"

    # Ensure Swift cache paths are writable in sandboxed environments
    export CLANG_MODULE_CACHE_PATH="$PROJECT_ROOT/.cache/clang"
    export SWIFTPM_DISABLE_SANDBOX=1
    mkdir -p "$CLANG_MODULE_CACHE_PATH"

    # Swift build (skip if dependencies cannot be fetched and no cache exists)
    SWIFT_DEPS_AVAILABLE=true
    if command -v git >/dev/null 2>&1; then
        if ! git ls-remote https://github.com/vapor/vapor.git -q >/dev/null 2>&1; then
            SWIFT_DEPS_AVAILABLE=false
        fi
    else
        SWIFT_DEPS_AVAILABLE=false
    fi

    if [ "$SWIFT_DEPS_AVAILABLE" = false ]; then
        print_warning "Skipping Swift build/tests - GitHub unreachable"
    else
        print_info "Running Swift build..."
        if swift build --build-path "$PROJECT_ROOT/.build" --disable-sandbox 2>&1; then
            print_success "Swift build passed"
        else
            print_failure "Swift build failed"
        fi

        # Swift tests
        if [ "$QUICK_MODE" = false ]; then
            print_info "Running Swift tests..."
            if swift test --build-path "$PROJECT_ROOT/.build" --disable-sandbox 2>&1; then
                print_success "Swift tests passed"
            else
                print_failure "Swift tests failed"
            fi
        else
            print_warning "Skipping Swift tests in quick mode"
        fi
    fi

    cd "$PROJECT_ROOT"
else
    print_warning "Swift backend directory not found"
fi

# =============================================================================
# 4. Terraform Checks
# =============================================================================
print_header "4. Terraform Checks"

if [ -d "infra/terraform" ]; then
    cd infra/terraform

    # Format check
    print_info "Checking Terraform formatting..."
    if terraform fmt -check -recursive 2>&1; then
        print_success "Terraform formatting is correct"
    else
        print_failure "Terraform files need formatting (run: terraform fmt -recursive)"
    fi

    # Validate each environment
    for env in envs/*/; do
        if [ -d "$env" ]; then
            ENV_NAME=$(basename "$env")
            print_info "Validating $ENV_NAME environment..."

            cd "$env"
            export TF_PLUGIN_CACHE_DIR="$PROJECT_ROOT/.terraform/plugin-cache"
            export TF_DATA_DIR="$(pwd)/.terraform"
            mkdir -p "$TF_PLUGIN_CACHE_DIR"

            # Initialize if needed
            if [ ! -d ".terraform" ]; then
                print_info "Initializing Terraform for $ENV_NAME..."
                terraform init -backend=false > /dev/null 2>&1
            fi

            if [ "$QUICK_MODE" = false ]; then
                if terraform validate 2>&1; then
                    print_success "Terraform validation passed for $ENV_NAME"
                else
                    print_failure "Terraform validation failed for $ENV_NAME"
                fi
            else
                print_warning "Skipping Terraform validate in quick mode"
            fi

            cd "$PROJECT_ROOT/infra/terraform"
        fi
    done

    cd "$PROJECT_ROOT"
else
    print_warning "Terraform directory not found at infra/terraform"
fi

# =============================================================================
# 5. Translation Completeness Check
# =============================================================================
print_header "5. Translation Completeness Check"

if [ -d "apps/web/src/i18n/messages" ]; then
    EN_FILE="apps/web/src/i18n/messages/en.json"
    ES_FILE="apps/web/src/i18n/messages/es.json"

    if [ -f "$EN_FILE" ] && [ -f "$ES_FILE" ]; then
        EN_KEYS=$(jq -r '[paths(scalars) | join(".")] | sort | .[]' "$EN_FILE" 2>/dev/null | wc -l)
        ES_KEYS=$(jq -r '[paths(scalars) | join(".")] | sort | .[]' "$ES_FILE" 2>/dev/null | wc -l)

        if [ "$EN_KEYS" -eq "$ES_KEYS" ]; then
            print_success "Translation files have matching key counts (EN: $EN_KEYS, ES: $ES_KEYS)"
        else
            print_warning "Translation key count mismatch (EN: $EN_KEYS, ES: $ES_KEYS)"
        fi
    else
        print_warning "Translation files not found"
    fi
else
    print_warning "Translation directory not found"
fi

# =============================================================================
# 6. Architecture Map Check
# =============================================================================
print_header "6. Documentation Check"

if [ -f "docs/ARCHITECTURE_MAP.md" ]; then
    print_success "Architecture Map exists"
else
    print_warning "Architecture Map missing at docs/ARCHITECTURE_MAP.md"
fi

# =============================================================================
# Summary
# =============================================================================
print_header "Summary"

if [ ${#FAILURES[@]} -eq 0 ]; then
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════════════════════╗"
    echo "║                        ALL CHECKS PASSED                                  ║"
    echo "╚═══════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    exit 0
else
    echo -e "${RED}"
    echo "╔═══════════════════════════════════════════════════════════════════════════╗"
    echo "║                     SOME CHECKS FAILED                                    ║"
    echo "╚═══════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo -e "${RED}Failed checks:${NC}"
    for failure in "${FAILURES[@]}"; do
        echo -e "  ${RED}• $failure${NC}"
    done
    exit 1
fi
