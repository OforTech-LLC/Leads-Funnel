#!/bin/bash
# =============================================================================
# Terraform Plan Validation Script
# =============================================================================
# This script creates a Terraform plan and validates the planned resources
# against expected configurations. It does NOT apply any changes.
#
# Usage: ./validate_plan.sh [OPTIONS]
#   -e, --env ENV    Specify environment (dev, prod) - default: dev
#   -o, --output     Output plan to file
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
OUTPUT_FILE=""
FAILED_TESTS=0
PASSED_TESTS=0

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "  -e, --env ENV    Specify environment (dev, prod) - default: dev"
            echo "  -o, --output     Output plan to file"
            echo "  -h, --help       Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

ENV_PATH="$TERRAFORM_ROOT/envs/$ENVIRONMENT"

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

# Check prerequisites
print_header "Checking Prerequisites"

if ! command -v terraform &> /dev/null; then
    echo -e "${RED}Terraform is not installed${NC}"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Warning: jq is not installed. Some advanced validations will be skipped.${NC}"
    echo "Install jq: brew install jq (macOS) or apt-get install jq (Linux)"
    JQ_AVAILABLE=false
else
    JQ_AVAILABLE=true
fi

# Initialize Terraform
print_header "Initializing Terraform"

cd "$ENV_PATH"

if [ ! -d ".terraform" ]; then
    echo "Running terraform init..."
    terraform init -backend=false > /dev/null 2>&1
fi

# Create plan
print_header "Creating Terraform Plan"

PLAN_FILE=$(mktemp)
PLAN_JSON=$(mktemp)

echo "Creating plan (this may take a moment)..."

# Create plan without applying
if terraform plan -out="$PLAN_FILE" -input=false > /dev/null 2>&1; then
    print_pass "Terraform plan created successfully"
else
    print_fail "Terraform plan failed"
    terraform plan -input=false
    exit 1
fi

# Convert plan to JSON for analysis
if [ "$JQ_AVAILABLE" = true ]; then
    terraform show -json "$PLAN_FILE" > "$PLAN_JSON"
fi

# =============================================================================
# Plan Validation Tests
# =============================================================================

print_header "Validating Plan Resources"

if [ "$JQ_AVAILABLE" = true ]; then

    # Test 1: DynamoDB table is planned
    print_test "DynamoDB table resource"
    if jq -e '.planned_values.root_module.child_modules[] | select(.address | contains("module.dynamodb")) | .resources[] | select(.type == "aws_dynamodb_table")' "$PLAN_JSON" > /dev/null 2>&1; then
        print_pass "DynamoDB table resource planned"
    else
        print_fail "DynamoDB table resource not found in plan"
    fi

    # Test 2: API Gateway resources
    print_test "API Gateway resources"
    if jq -e '.planned_values.root_module.child_modules[] | select(.address | contains("module.api")) | .resources[] | select(.type == "aws_apigatewayv2_api")' "$PLAN_JSON" > /dev/null 2>&1; then
        print_pass "API Gateway HTTP API planned"
    else
        print_fail "API Gateway HTTP API not found in plan"
    fi

    # Test 3: Lambda function
    print_test "Lambda function resource"
    if jq -e '.planned_values.root_module.child_modules[] | select(.address | contains("module.api")) | .resources[] | select(.type == "aws_lambda_function")' "$PLAN_JSON" > /dev/null 2>&1; then
        print_pass "Lambda function planned"
    else
        print_fail "Lambda function not found in plan"
    fi

    # Test 4: EventBridge event bus
    print_test "EventBridge event bus"
    if jq -e '.planned_values.root_module.child_modules[] | select(.address | contains("module.eventing")) | .resources[] | select(.type == "aws_cloudwatch_event_bus")' "$PLAN_JSON" > /dev/null 2>&1; then
        print_pass "EventBridge event bus planned"
    else
        print_fail "EventBridge event bus not found in plan"
    fi

    # Test 5: CloudFront distribution
    print_test "CloudFront distribution"
    if jq -e '.planned_values.root_module.child_modules[] | select(.address | contains("module.static_site")) | .resources[] | select(.type == "aws_cloudfront_distribution")' "$PLAN_JSON" > /dev/null 2>&1; then
        print_pass "CloudFront distribution planned"
    else
        print_fail "CloudFront distribution not found in plan"
    fi

    # Test 6: S3 bucket for site
    print_test "S3 bucket for static site"
    if jq -e '.planned_values.root_module.child_modules[] | select(.address | contains("module.static_site")) | .resources[] | select(.type == "aws_s3_bucket")' "$PLAN_JSON" > /dev/null 2>&1; then
        print_pass "S3 bucket for static site planned"
    else
        print_fail "S3 bucket not found in plan"
    fi

    # Test 7: ACM certificate
    print_test "ACM certificate"
    if jq -e '.planned_values.root_module.child_modules[] | select(.address | contains("module.acm")) | .resources[] | select(.type == "aws_acm_certificate")' "$PLAN_JSON" > /dev/null 2>&1; then
        print_pass "ACM certificate planned"
    else
        print_fail "ACM certificate not found in plan"
    fi

    # Test 8: Route53 records (DNS module)
    print_test "Route53 DNS records"
    if jq -e '.planned_values.root_module.child_modules[] | select(.address | contains("module.dns")) | .resources[] | select(.type == "aws_route53_record")' "$PLAN_JSON" > /dev/null 2>&1; then
        print_pass "Route53 records planned"
    else
        print_fail "Route53 records not found in plan"
    fi

    # Test 9: IAM roles
    print_test "IAM roles for Lambda"
    if jq -e '.planned_values.root_module.child_modules[] | select(.address | contains("module.api")) | .resources[] | select(.type == "aws_iam_role")' "$PLAN_JSON" > /dev/null 2>&1; then
        print_pass "IAM roles planned"
    else
        print_fail "IAM roles not found in plan"
    fi

    # Test 10: CloudWatch log groups
    print_test "CloudWatch log groups"
    if jq -e '.planned_values.root_module.child_modules[] | .resources[] | select(.type == "aws_cloudwatch_log_group")' "$PLAN_JSON" > /dev/null 2>&1; then
        print_pass "CloudWatch log groups planned"
    else
        print_fail "CloudWatch log groups not found in plan"
    fi

    # Validate specific configurations from plan
    print_header "Validating Resource Configurations"

    # DynamoDB billing mode
    print_test "DynamoDB billing mode"
    billing_mode=$(jq -r '.planned_values.root_module.child_modules[] | select(.address | contains("module.dynamodb")) | .resources[] | select(.type == "aws_dynamodb_table") | .values.billing_mode' "$PLAN_JSON" 2>/dev/null)
    if [ "$billing_mode" = "PAY_PER_REQUEST" ]; then
        print_pass "DynamoDB billing mode: PAY_PER_REQUEST"
    else
        print_fail "DynamoDB billing mode: expected PAY_PER_REQUEST, got $billing_mode"
    fi

    # Lambda runtime
    print_test "Lambda runtime version"
    lambda_runtime=$(jq -r '.planned_values.root_module.child_modules[] | select(.address | contains("module.api")) | .resources[] | select(.type == "aws_lambda_function") | .values.runtime' "$PLAN_JSON" 2>/dev/null)
    if [ "$lambda_runtime" = "python3.12" ]; then
        print_pass "Lambda runtime: python3.12"
    else
        print_fail "Lambda runtime: expected python3.12, got $lambda_runtime"
    fi

    # Lambda architecture
    print_test "Lambda architecture"
    lambda_arch=$(jq -r '.planned_values.root_module.child_modules[] | select(.address | contains("module.api")) | .resources[] | select(.type == "aws_lambda_function") | .values.architectures[0]' "$PLAN_JSON" 2>/dev/null)
    if [ "$lambda_arch" = "arm64" ]; then
        print_pass "Lambda architecture: arm64 (Graviton)"
    else
        print_fail "Lambda architecture: expected arm64, got $lambda_arch"
    fi

    # CloudFront viewer protocol policy
    print_test "CloudFront HTTPS redirect"
    viewer_policy=$(jq -r '.planned_values.root_module.child_modules[] | select(.address | contains("module.static_site")) | .resources[] | select(.type == "aws_cloudfront_distribution") | .values.default_cache_behavior[0].viewer_protocol_policy' "$PLAN_JSON" 2>/dev/null)
    if [ "$viewer_policy" = "redirect-to-https" ]; then
        print_pass "CloudFront: HTTP to HTTPS redirect"
    else
        print_fail "CloudFront: expected redirect-to-https, got $viewer_policy"
    fi

    # Count total resources
    print_header "Resource Summary"
    total_resources=$(jq '[.planned_values.root_module.child_modules[].resources[]] | length' "$PLAN_JSON" 2>/dev/null)
    echo "Total resources planned: $total_resources"

    # List resource types
    echo -e "\nResource types:"
    jq -r '[.planned_values.root_module.child_modules[].resources[].type] | group_by(.) | map({type: .[0], count: length}) | sort_by(-.count)[] | "  \(.count)x \(.type)"' "$PLAN_JSON" 2>/dev/null

else
    echo -e "${YELLOW}Skipping JSON-based plan analysis (jq not available)${NC}"
    echo "Running basic terraform plan show instead..."
    terraform show "$PLAN_FILE"
fi

# Cleanup
rm -f "$PLAN_FILE" "$PLAN_JSON"

# Output plan to file if requested
if [ -n "$OUTPUT_FILE" ]; then
    print_header "Exporting Plan"
    terraform plan -out="$OUTPUT_FILE" -input=false > /dev/null 2>&1
    echo "Plan saved to: $OUTPUT_FILE"
fi

# Summary
print_header "Validation Summary"

echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "\n${RED}Some validations failed. Please review the issues above.${NC}"
    exit 1
else
    echo -e "\n${GREEN}All plan validations passed!${NC}"
    exit 0
fi
