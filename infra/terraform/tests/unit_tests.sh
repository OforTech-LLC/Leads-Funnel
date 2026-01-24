#!/bin/bash
# =============================================================================
# Terraform Unit Tests (No Terraform Required)
# =============================================================================
# Fast, lightweight tests that validate Terraform file content without
# requiring terraform init or plan. Useful for CI/CD and pre-commit hooks.
#
# Usage: ./unit_tests.sh
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

# Counters
FAILED=0
PASSED=0

# Utility functions
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

print_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED++))
}

print_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED++))
}

# =============================================================================
# Test Functions
# =============================================================================

test_module_structure() {
    print_header "Module Structure Tests"

    local modules=("acm" "api" "dns" "dynamodb" "eventing" "monitoring" "ses" "static_site" "waf")
    local required_files=("main.tf" "variables.tf" "outputs.tf")

    for module in "${modules[@]}"; do
        local module_path="$TERRAFORM_ROOT/modules/$module"

        if [ -d "$module_path" ]; then
            local all_files_exist=true
            for file in "${required_files[@]}"; do
                if [ ! -f "$module_path/$file" ]; then
                    print_fail "Module $module: missing $file"
                    all_files_exist=false
                fi
            done
            if [ "$all_files_exist" = true ]; then
                print_pass "Module $module: has all required files"
            fi
        else
            print_fail "Module $module: directory not found"
        fi
    done
}

test_environment_structure() {
    print_header "Environment Structure Tests"

    local envs=("dev" "prod")
    local required_files=("main.tf" "variables.tf" "providers.tf" "backend.tf" "outputs.tf")

    for env in "${envs[@]}"; do
        local env_path="$TERRAFORM_ROOT/envs/$env"

        if [ -d "$env_path" ]; then
            local all_files_exist=true
            for file in "${required_files[@]}"; do
                if [ ! -f "$env_path/$file" ]; then
                    print_fail "Environment $env: missing $file"
                    all_files_exist=false
                fi
            done
            if [ "$all_files_exist" = true ]; then
                print_pass "Environment $env: has all required files"
            fi
        else
            print_fail "Environment $env: directory not found"
        fi
    done
}

test_dynamodb_schema() {
    print_header "DynamoDB Schema Tests"

    local dynamodb_main="$TERRAFORM_ROOT/modules/dynamodb/main.tf"

    # Test pk/sk configuration (lowercase to match Swift backend)
    if grep -q 'hash_key\s*=\s*"pk"' "$dynamodb_main"; then
        print_pass "DynamoDB: hash_key is pk (lowercase)"
    else
        print_fail "DynamoDB: hash_key should be pk (lowercase to match Swift backend)"
    fi

    if grep -q 'range_key\s*=\s*"sk"' "$dynamodb_main"; then
        print_pass "DynamoDB: range_key is sk (lowercase)"
    else
        print_fail "DynamoDB: range_key should be sk (lowercase to match Swift backend)"
    fi

    # Test GSI1 configuration
    if grep -q 'name\s*=\s*"GSI1"' "$dynamodb_main"; then
        print_pass "DynamoDB: GSI1 index defined"
    else
        print_fail "DynamoDB: GSI1 index not found"
    fi

    # Test TTL
    if grep -q 'attribute_name\s*=\s*"ttl"' "$dynamodb_main"; then
        print_pass "DynamoDB: TTL on 'ttl' attribute"
    else
        print_fail "DynamoDB: TTL attribute should be 'ttl'"
    fi

    # Test encryption
    if grep -A2 'server_side_encryption' "$dynamodb_main" | grep -q 'enabled\s*=\s*true'; then
        print_pass "DynamoDB: server-side encryption enabled"
    else
        print_fail "DynamoDB: server-side encryption should be enabled"
    fi

    # Test billing mode
    if grep -q 'billing_mode\s*=\s*"PAY_PER_REQUEST"' "$dynamodb_main"; then
        print_pass "DynamoDB: PAY_PER_REQUEST billing mode"
    else
        print_fail "DynamoDB: should use PAY_PER_REQUEST billing"
    fi
}

test_lambda_configuration() {
    print_header "Lambda Configuration Tests"

    local lambda_tf="$TERRAFORM_ROOT/modules/api/lambda.tf"

    # Test runtime
    if grep -q 'runtime\s*=\s*"python3.12"' "$lambda_tf"; then
        print_pass "Lambda: Python 3.12 runtime"
    else
        print_fail "Lambda: should use python3.12 runtime"
    fi

    # Test architecture
    if grep -q 'architectures\s*=\s*\["arm64"\]' "$lambda_tf"; then
        print_pass "Lambda: ARM64 architecture"
    else
        print_fail "Lambda: should use ARM64 architecture"
    fi

    # Test timeout (30 seconds for multiple DynamoDB operations)
    if grep -q 'timeout\s*=\s*30' "$lambda_tf"; then
        print_pass "Lambda: 30 second timeout"
    else
        print_fail "Lambda: timeout should be 30 seconds for DynamoDB operations"
    fi

    # Test tracing config
    if grep -q 'tracing_config' "$lambda_tf"; then
        print_pass "Lambda: X-Ray tracing configurable"
    else
        print_fail "Lambda: X-Ray tracing should be configurable"
    fi
}

test_api_gateway_configuration() {
    print_header "API Gateway Configuration Tests"

    local api_main="$TERRAFORM_ROOT/modules/api/main.tf"

    # Test HTTP API
    if grep -q 'protocol_type\s*=\s*"HTTP"' "$api_main"; then
        print_pass "API Gateway: HTTP API protocol"
    else
        print_fail "API Gateway: should be HTTP API"
    fi

    # Test CORS
    if grep -q 'cors_configuration' "$api_main"; then
        print_pass "API Gateway: CORS configured"
    else
        print_fail "API Gateway: CORS should be configured"
    fi

    # Test POST /lead route
    if grep -q 'route_key\s*=\s*"POST /lead"' "$api_main"; then
        print_pass "API Gateway: POST /lead route"
    else
        print_fail "API Gateway: POST /lead route not found"
    fi

    # Test TLS
    if grep -q 'security_policy\s*=\s*"TLS_1_2"' "$api_main"; then
        print_pass "API Gateway: TLS 1.2 security policy"
    else
        print_fail "API Gateway: should use TLS_1_2 security policy"
    fi
}

test_eventbridge_configuration() {
    print_header "EventBridge Configuration Tests"

    local eventing_main="$TERRAFORM_ROOT/modules/eventing/main.tf"

    # Test event source
    if grep -q 'source.*=.*\["kanjona.leads"\]' "$eventing_main"; then
        print_pass "EventBridge: kanjona.leads source"
    else
        print_fail "EventBridge: source should be kanjona.leads"
    fi

    # Test detail type
    if grep -q 'detail-type.*=.*\["lead.created"\]' "$eventing_main"; then
        print_pass "EventBridge: lead.created detail-type"
    else
        print_fail "EventBridge: detail-type should be lead.created"
    fi

    # Test SQS encryption
    if grep -q 'sqs_managed_sse_enabled\s*=\s*true' "$eventing_main"; then
        print_pass "SQS: server-side encryption"
    else
        print_fail "SQS: should have server-side encryption"
    fi

    # Test DLQ
    if grep -q 'redrive_policy' "$eventing_main"; then
        print_pass "SQS: dead-letter queue configured"
    else
        print_fail "SQS: should have dead-letter queue"
    fi
}

test_static_site_security() {
    print_header "Static Site Security Tests"

    local static_main="$TERRAFORM_ROOT/modules/static_site/main.tf"

    # Test public access block
    local public_blocks=("block_public_acls" "block_public_policy" "ignore_public_acls" "restrict_public_buckets")
    for block in "${public_blocks[@]}"; do
        if grep -q "$block\s*=\s*true" "$static_main"; then
            print_pass "S3: $block = true"
        else
            print_fail "S3: $block should be true"
        fi
    done

    # Test OAC
    if grep -q 'aws_cloudfront_origin_access_control' "$static_main"; then
        print_pass "CloudFront: using OAC"
    else
        print_fail "CloudFront: should use OAC"
    fi

    # Test HTTPS redirect
    if grep -q 'viewer_protocol_policy\s*=\s*"redirect-to-https"' "$static_main"; then
        print_pass "CloudFront: HTTPS redirect"
    else
        print_fail "CloudFront: should redirect to HTTPS"
    fi

    # Test TLS version
    if grep -q 'minimum_protocol_version\s*=\s*"TLSv1.2_2021"' "$static_main"; then
        print_pass "CloudFront: TLS 1.2 minimum"
    else
        print_fail "CloudFront: should use TLSv1.2_2021"
    fi
}

test_waf_configuration() {
    print_header "WAF Configuration Tests"

    local waf_main="$TERRAFORM_ROOT/modules/waf/main.tf"

    # Test scope
    if grep -q 'scope\s*=\s*"CLOUDFRONT"' "$waf_main"; then
        print_pass "WAF: CLOUDFRONT scope"
    else
        print_fail "WAF: should have CLOUDFRONT scope"
    fi

    # Test rate limiting
    if grep -q 'rate_based_statement' "$waf_main"; then
        print_pass "WAF: rate limiting configured"
    else
        print_fail "WAF: should have rate limiting"
    fi

    # Test managed rules
    if grep -q 'AWSManagedRulesCommonRuleSet' "$waf_main"; then
        print_pass "WAF: AWS Common Rules"
    else
        print_fail "WAF: should use AWS Common Rules"
    fi

    if grep -q 'AWSManagedRulesKnownBadInputsRuleSet' "$waf_main"; then
        print_pass "WAF: AWS Known Bad Inputs Rules"
    else
        print_fail "WAF: should use AWS Known Bad Inputs Rules"
    fi
}

test_iam_least_privilege() {
    print_header "IAM Least Privilege Tests"

    local lambda_tf="$TERRAFORM_ROOT/modules/api/lambda.tf"

    # Check no wildcard actions in custom policy
    if ! grep -A50 'aws_iam_role_policy.*lambda_custom' "$lambda_tf" | grep -q '"Action"\s*:\s*"\*"'; then
        print_pass "IAM: no wildcard (*) actions in Lambda policy"
    else
        print_fail "IAM: wildcard (*) actions found"
    fi

    # Check assume role restricted to Lambda
    if grep -A15 'assume_role_policy' "$lambda_tf" | grep -q 'lambda.amazonaws.com'; then
        print_pass "IAM: assume role restricted to Lambda"
    else
        print_fail "IAM: assume role should be restricted to Lambda"
    fi
}

test_no_hardcoded_secrets() {
    print_header "Hardcoded Secrets Tests"

    local tf_files=$(find "$TERRAFORM_ROOT" -name "*.tf" -type f ! -path "*/.terraform/*")
    local secret_found=false

    # Check for AWS access keys
    if echo "$tf_files" | xargs grep -l 'AKIA[0-9A-Z]\{16\}' 2>/dev/null; then
        print_fail "Found potential AWS access key"
        secret_found=true
    fi

    # Check for hardcoded passwords (not in variable blocks)
    for file in $tf_files; do
        if grep -v "variable" "$file" | grep -q 'password\s*=\s*"[^"$][^"]*"'; then
            print_fail "Potential hardcoded password in: $file"
            secret_found=true
        fi
    done

    if [ "$secret_found" = false ]; then
        print_pass "No hardcoded secrets detected"
    fi
}

test_naming_conventions() {
    print_header "Naming Convention Tests"

    local modules=("dynamodb" "api" "eventing" "static_site" "waf")

    for module in "${modules[@]}"; do
        local main_tf="$TERRAFORM_ROOT/modules/$module/main.tf"
        if [ -f "$main_tf" ]; then
            if grep -q '"\${var.project_name}-\${var.environment}-' "$main_tf"; then
                print_pass "Module $module: uses standard naming"
            else
                print_fail "Module $module: should use \${project_name}-\${environment} prefix"
            fi
        fi
    done
}

# =============================================================================
# Main Execution
# =============================================================================

echo -e "${BLUE}=============================================================================${NC}"
echo -e "${BLUE}Terraform Unit Tests${NC}"
echo -e "${BLUE}=============================================================================${NC}"
echo ""
echo "Terraform Root: $TERRAFORM_ROOT"

# Run all tests
test_module_structure
test_environment_structure
test_dynamodb_schema
test_lambda_configuration
test_api_gateway_configuration
test_eventbridge_configuration
test_static_site_security
test_waf_configuration
test_iam_least_privilege
test_no_hardcoded_secrets
test_naming_conventions

# Summary
echo -e "\n${BLUE}=============================================================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}=============================================================================${NC}"
echo ""
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"

if [ $FAILED -gt 0 ]; then
    echo -e "\n${RED}Some tests failed. Please review the issues above.${NC}"
    exit 1
else
    echo -e "\n${GREEN}All unit tests passed!${NC}"
    exit 0
fi
