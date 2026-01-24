#!/bin/bash
# =============================================================================
# Terraform Infrastructure Validation Script
# =============================================================================
# This script validates all Terraform configurations and modules.
# It performs syntax validation, configuration checks, and runs static analysis.
#
# Usage: ./validate_all.sh [OPTIONS]
#   -e, --env ENV    Specify environment (dev, prod) - default: dev
#   -v, --verbose    Enable verbose output
#   -h, --help       Show this help message
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_ROOT="$(dirname "$SCRIPT_DIR")"

# Default values
ENVIRONMENT="dev"
VERBOSE=false
FAILED_TESTS=0
PASSED_TESTS=0

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "  -e, --env ENV    Specify environment (dev, prod) - default: dev"
            echo "  -v, --verbose    Enable verbose output"
            echo "  -h, --help       Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Utility functions
print_header() {
    echo -e "\n${BLUE}=============================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=============================================================================${NC}\n"
}

print_test() {
    echo -e "${YELLOW}TEST:${NC} $1"
}

print_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_TESTS++))
}

print_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_TESTS++))
}

print_info() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${BLUE}[INFO]${NC} $1"
    fi
}

# Check if terraform is installed
check_terraform() {
    print_header "Checking Prerequisites"

    if ! command -v terraform &> /dev/null; then
        print_fail "Terraform is not installed"
        echo "Please install Terraform: https://www.terraform.io/downloads"
        exit 1
    fi

    local tf_version=$(terraform version -json 2>/dev/null | grep -o '"terraform_version":"[^"]*"' | cut -d'"' -f4)
    print_pass "Terraform is installed (version: $tf_version)"
}

# Validate module syntax
validate_module() {
    local module_name=$1
    local module_path="$TERRAFORM_ROOT/modules/$module_name"

    print_test "Validating module: $module_name"

    if [ ! -d "$module_path" ]; then
        print_fail "Module directory not found: $module_path"
        return 1
    fi

    # Check required files exist
    local required_files=("main.tf" "variables.tf" "outputs.tf")
    for file in "${required_files[@]}"; do
        if [ ! -f "$module_path/$file" ]; then
            print_fail "Missing required file: $module_name/$file"
            return 1
        fi
    done

    # Run terraform fmt check
    if ! terraform fmt -check -diff "$module_path" > /dev/null 2>&1; then
        print_fail "Module $module_name has formatting issues (run: terraform fmt)"
        return 1
    fi

    print_pass "Module $module_name: syntax valid, properly formatted"
    return 0
}

# Validate environment configuration
validate_environment() {
    local env=$1
    local env_path="$TERRAFORM_ROOT/envs/$env"

    print_test "Validating environment: $env"

    if [ ! -d "$env_path" ]; then
        print_fail "Environment directory not found: $env_path"
        return 1
    fi

    # Check required files
    local required_files=("main.tf" "variables.tf" "providers.tf" "backend.tf")
    for file in "${required_files[@]}"; do
        if [ ! -f "$env_path/$file" ]; then
            print_fail "Missing required file: $env/$file"
            return 1
        fi
    done

    # Run terraform init (if not already initialized)
    print_info "Running terraform init..."
    if ! terraform -chdir="$env_path" init -backend=false > /dev/null 2>&1; then
        print_fail "Terraform init failed for $env"
        return 1
    fi

    # Run terraform validate
    print_info "Running terraform validate..."
    if ! terraform -chdir="$env_path" validate > /dev/null 2>&1; then
        print_fail "Terraform validate failed for $env"
        terraform -chdir="$env_path" validate
        return 1
    fi

    # Check formatting
    if ! terraform fmt -check -diff "$env_path" > /dev/null 2>&1; then
        print_fail "Environment $env has formatting issues (run: terraform fmt)"
        return 1
    fi

    print_pass "Environment $env: configuration valid"
    return 0
}

# =============================================================================
# Main Test Execution
# =============================================================================

print_header "Terraform Infrastructure Validation"
echo "Environment: $ENVIRONMENT"
echo "Terraform Root: $TERRAFORM_ROOT"

# Check prerequisites
check_terraform

# Validate all modules
print_header "Module Validation"

modules=("acm" "api" "dns" "dynamodb" "eventing" "monitoring" "ses" "static_site" "waf")
for module in "${modules[@]}"; do
    validate_module "$module"
done

# Validate environments
print_header "Environment Validation"

for env in dev prod; do
    validate_environment "$env"
done

# Run custom validation tests
print_header "Custom Configuration Tests"

# Source the custom tests
if [ -f "$SCRIPT_DIR/test_configs.sh" ]; then
    source "$SCRIPT_DIR/test_configs.sh"
fi

# Summary
print_header "Test Summary"

echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "\n${RED}Some tests failed. Please fix the issues above.${NC}"
    exit 1
else
    echo -e "\n${GREEN}All tests passed!${NC}"
    exit 0
fi
