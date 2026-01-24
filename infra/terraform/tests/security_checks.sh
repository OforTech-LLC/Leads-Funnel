#!/bin/bash
# =============================================================================
# Terraform Security Validation Script
# =============================================================================
# This script performs security-focused validation of Terraform configurations.
# It checks for common security issues and best practices.
#
# Usage: ./security_checks.sh [OPTIONS]
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

# Counters
CRITICAL_ISSUES=0
WARNINGS=0
PASSED=0

# Utility functions
print_header() {
    echo -e "\n${BLUE}=============================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=============================================================================${NC}\n"
}

print_critical() {
    echo -e "${RED}[CRITICAL]${NC} $1"
    ((CRITICAL_ISSUES++))
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    ((WARNINGS++))
}

print_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED++))
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# =============================================================================
# Security Checks
# =============================================================================

print_header "Terraform Security Validation"
print_info "Scanning: $TERRAFORM_ROOT"

# -----------------------------------------------------------------------------
# Check 1: No hardcoded secrets
# -----------------------------------------------------------------------------
print_header "Checking for Hardcoded Secrets"

# Common secret patterns
secret_patterns=(
    'password\s*=\s*"[^"$]+'
    'secret\s*=\s*"[^"$]+'
    'api_key\s*=\s*"[^"$]+'
    'access_key\s*=\s*"[A-Z0-9]{20}"'
    'secret_key\s*=\s*"[A-Za-z0-9/+=]{40}"'
    'private_key\s*=\s*"-----BEGIN'
    'token\s*=\s*"[^"$]+'
)

secrets_found=false
for pattern in "${secret_patterns[@]}"; do
    matches=$(find "$TERRAFORM_ROOT" -name "*.tf" -type f ! -path "*/.terraform/*" -exec grep -l "$pattern" {} \; 2>/dev/null || true)
    if [ -n "$matches" ]; then
        secrets_found=true
        for file in $matches; do
            # Skip if it's a variable definition
            if ! grep -q "variable.*{" "$file" 2>/dev/null; then
                print_critical "Potential hardcoded secret in: $file (pattern: $pattern)"
            fi
        done
    fi
done

if [ "$secrets_found" = false ]; then
    print_pass "No hardcoded secrets detected"
fi

# Check for AWS keys
aws_key_pattern='AKIA[0-9A-Z]{16}'
aws_keys=$(find "$TERRAFORM_ROOT" -name "*.tf" -type f ! -path "*/.terraform/*" -exec grep -l "$aws_key_pattern" {} \; 2>/dev/null || true)
if [ -n "$aws_keys" ]; then
    print_critical "Potential AWS access key found in: $aws_keys"
else
    print_pass "No AWS access keys detected"
fi

# -----------------------------------------------------------------------------
# Check 2: Encryption at rest
# -----------------------------------------------------------------------------
print_header "Checking Encryption Configuration"

# DynamoDB encryption
if grep -r 'server_side_encryption' "$TERRAFORM_ROOT/modules/dynamodb" 2>/dev/null | grep -q 'enabled\s*=\s*true'; then
    print_pass "DynamoDB: Server-side encryption enabled"
else
    print_critical "DynamoDB: Server-side encryption not found or disabled"
fi

# S3 bucket encryption
if grep -r 'server_side_encryption_configuration' "$TERRAFORM_ROOT/modules/static_site" 2>/dev/null | grep -q 'sse_algorithm'; then
    print_pass "S3: Server-side encryption configured"
else
    print_critical "S3: Server-side encryption not configured"
fi

# SQS encryption
if grep -r 'sqs_managed_sse_enabled\s*=\s*true' "$TERRAFORM_ROOT/modules/eventing" 2>/dev/null | grep -q 'true'; then
    print_pass "SQS: Server-side encryption enabled"
else
    print_warning "SQS: Server-side encryption not verified"
fi

# -----------------------------------------------------------------------------
# Check 3: Encryption in transit
# -----------------------------------------------------------------------------
print_header "Checking Transport Security"

# TLS 1.2 minimum for API Gateway
if grep -r 'security_policy\s*=\s*"TLS_1_2"' "$TERRAFORM_ROOT/modules/api" 2>/dev/null | grep -q 'TLS_1_2'; then
    print_pass "API Gateway: TLS 1.2 minimum enforced"
else
    print_warning "API Gateway: TLS 1.2 configuration not found"
fi

# CloudFront TLS
if grep -r 'minimum_protocol_version\s*=\s*"TLSv1.2' "$TERRAFORM_ROOT/modules/static_site" 2>/dev/null | grep -q 'TLSv1.2'; then
    print_pass "CloudFront: TLS 1.2 minimum enforced"
else
    print_warning "CloudFront: TLS 1.2 configuration not found"
fi

# HTTPS redirect
if grep -r 'viewer_protocol_policy\s*=\s*"redirect-to-https"' "$TERRAFORM_ROOT/modules/static_site" 2>/dev/null | grep -q 'redirect-to-https'; then
    print_pass "CloudFront: HTTP to HTTPS redirect enabled"
else
    print_critical "CloudFront: HTTP to HTTPS redirect not configured"
fi

# SES TLS
if grep -r 'tls_policy\s*=\s*"Require"' "$TERRAFORM_ROOT/modules/ses" 2>/dev/null | grep -q 'Require'; then
    print_pass "SES: TLS required for delivery"
else
    print_warning "SES: TLS policy not set to Require"
fi

# -----------------------------------------------------------------------------
# Check 4: Public access
# -----------------------------------------------------------------------------
print_header "Checking Public Access Configuration"

# S3 public access block
public_access_settings=("block_public_acls" "block_public_policy" "ignore_public_acls" "restrict_public_buckets")
all_blocked=true

for setting in "${public_access_settings[@]}"; do
    if grep -r "$setting\s*=\s*true" "$TERRAFORM_ROOT/modules/static_site" 2>/dev/null | grep -q 'true'; then
        print_pass "S3: $setting = true"
    else
        print_critical "S3: $setting not set to true"
        all_blocked=false
    fi
done

if [ "$all_blocked" = true ]; then
    print_pass "S3: All public access blocked"
fi

# CloudFront OAC vs OAI
if grep -r 'aws_cloudfront_origin_access_control' "$TERRAFORM_ROOT/modules/static_site" 2>/dev/null | grep -q 'origin_access_control'; then
    print_pass "CloudFront: Using OAC (Origin Access Control) - recommended"
else
    if grep -r 'aws_cloudfront_origin_access_identity' "$TERRAFORM_ROOT/modules/static_site" 2>/dev/null | grep -q 'origin_access_identity'; then
        print_warning "CloudFront: Using legacy OAI - consider migrating to OAC"
    else
        print_critical "CloudFront: No origin access control configured"
    fi
fi

# -----------------------------------------------------------------------------
# Check 5: IAM least privilege
# -----------------------------------------------------------------------------
print_header "Checking IAM Configuration"

# Check for wildcard actions
wildcard_actions=$(grep -r '"Action"\s*:\s*"\*"' "$TERRAFORM_ROOT" 2>/dev/null || true)
if [ -n "$wildcard_actions" ]; then
    print_critical "IAM: Wildcard (*) actions found - violates least privilege"
    echo "$wildcard_actions" | head -5
else
    print_pass "IAM: No wildcard (*) actions found"
fi

# Check for wildcard resources in sensitive permissions
wildcard_resources=$(grep -r '"Resource"\s*:\s*"\*"' "$TERRAFORM_ROOT" 2>/dev/null || true)
if [ -n "$wildcard_resources" ]; then
    print_warning "IAM: Wildcard (*) resources found - review for necessity"
else
    print_pass "IAM: No wildcard (*) resources found"
fi

# Check assume role is restricted
if grep -r 'assume_role_policy' "$TERRAFORM_ROOT/modules/api" 2>/dev/null | grep -q 'assume_role_policy'; then
    if grep -A20 'assume_role_policy' "$TERRAFORM_ROOT/modules/api/lambda.tf" 2>/dev/null | grep -q 'lambda.amazonaws.com'; then
        print_pass "IAM: Lambda assume role restricted to Lambda service"
    else
        print_warning "IAM: Lambda assume role policy should be restricted"
    fi
fi

# -----------------------------------------------------------------------------
# Check 6: Logging and monitoring
# -----------------------------------------------------------------------------
print_header "Checking Logging Configuration"

# CloudWatch log groups exist
if grep -r 'aws_cloudwatch_log_group' "$TERRAFORM_ROOT/modules/api" 2>/dev/null | grep -q 'log_group'; then
    print_pass "Logging: CloudWatch log groups configured for Lambda"
else
    print_warning "Logging: CloudWatch log groups not found"
fi

# Log retention is set
if grep -r 'retention_in_days' "$TERRAFORM_ROOT" 2>/dev/null | grep -q 'retention_in_days'; then
    print_pass "Logging: Log retention period configured"
else
    print_warning "Logging: Log retention period not set (logs may accumulate indefinitely)"
fi

# API Gateway access logging
if grep -r 'access_log_settings' "$TERRAFORM_ROOT/modules/api" 2>/dev/null | grep -q 'access_log'; then
    print_pass "Logging: API Gateway access logging available"
else
    print_warning "Logging: API Gateway access logging not configured"
fi

# WAF logging
if grep -r 'aws_wafv2_web_acl_logging_configuration' "$TERRAFORM_ROOT/modules/waf" 2>/dev/null | grep -q 'logging_configuration'; then
    print_pass "Logging: WAF logging available"
else
    print_warning "Logging: WAF logging not configured"
fi

# -----------------------------------------------------------------------------
# Check 7: WAF and rate limiting
# -----------------------------------------------------------------------------
print_header "Checking WAF and Rate Limiting"

# WAF rate limiting
if grep -r 'rate_based_statement' "$TERRAFORM_ROOT/modules/waf" 2>/dev/null | grep -q 'rate_based'; then
    print_pass "WAF: Rate limiting rule configured"
else
    print_warning "WAF: Rate limiting not found"
fi

# WAF managed rules
if grep -r 'AWSManagedRulesCommonRuleSet' "$TERRAFORM_ROOT/modules/waf" 2>/dev/null | grep -q 'Common'; then
    print_pass "WAF: AWS Managed Common Rules enabled"
else
    print_warning "WAF: AWS Managed Common Rules not found"
fi

if grep -r 'AWSManagedRulesKnownBadInputsRuleSet' "$TERRAFORM_ROOT/modules/waf" 2>/dev/null | grep -q 'KnownBadInputs'; then
    print_pass "WAF: AWS Managed Known Bad Inputs Rules enabled"
else
    print_warning "WAF: AWS Managed Known Bad Inputs Rules not found"
fi

# API Gateway throttling
if grep -r 'throttling_burst_limit' "$TERRAFORM_ROOT/modules/api" 2>/dev/null | grep -q 'throttling'; then
    print_pass "API Gateway: Throttling configured"
else
    print_warning "API Gateway: Throttling not configured"
fi

# -----------------------------------------------------------------------------
# Check 8: Deletion protection
# -----------------------------------------------------------------------------
print_header "Checking Data Protection"

# DynamoDB deletion protection variable
if grep -r 'deletion_protection_enabled' "$TERRAFORM_ROOT/modules/dynamodb" 2>/dev/null | grep -q 'deletion_protection'; then
    print_pass "DynamoDB: Deletion protection configurable"
else
    print_warning "DynamoDB: Deletion protection not configurable"
fi

# DynamoDB PITR
if grep -r 'point_in_time_recovery' "$TERRAFORM_ROOT/modules/dynamodb" 2>/dev/null | grep -q 'point_in_time'; then
    print_pass "DynamoDB: Point-in-Time Recovery configurable"
else
    print_warning "DynamoDB: Point-in-Time Recovery not configurable"
fi

# S3 versioning
if grep -r 'versioning_configuration' "$TERRAFORM_ROOT/modules/static_site" 2>/dev/null | grep -q 'Enabled'; then
    print_pass "S3: Versioning enabled"
else
    print_warning "S3: Versioning not enabled"
fi

# -----------------------------------------------------------------------------
# Check 9: Network security
# -----------------------------------------------------------------------------
print_header "Checking Network Configuration"

# CloudFront IPv6
if grep -r 'is_ipv6_enabled\s*=\s*true' "$TERRAFORM_ROOT/modules/static_site" 2>/dev/null | grep -q 'true'; then
    print_pass "CloudFront: IPv6 enabled"
else
    print_info "CloudFront: IPv6 not enabled (optional)"
fi

# CORS configuration
if grep -r 'cors_configuration' "$TERRAFORM_ROOT/modules/api" 2>/dev/null | grep -q 'cors'; then
    print_pass "API Gateway: CORS configuration present"

    # Check if allow_origins is not *
    if grep -A10 'cors_configuration' "$TERRAFORM_ROOT/modules/api/main.tf" 2>/dev/null | grep -q 'allow_origins\s*=\s*\["\*"\]'; then
        print_warning "API Gateway: CORS allows all origins (*) - consider restricting"
    else
        print_pass "API Gateway: CORS origins not set to wildcard"
    fi
else
    print_warning "API Gateway: CORS configuration not found"
fi

# -----------------------------------------------------------------------------
# Check 10: Sensitive data handling
# -----------------------------------------------------------------------------
print_header "Checking Sensitive Data Handling"

# Check for sensitive variable marking
sensitive_vars=$(grep -r 'sensitive\s*=\s*true' "$TERRAFORM_ROOT" 2>/dev/null || true)
if [ -n "$sensitive_vars" ]; then
    print_pass "Variables: Sensitive variables are marked"
else
    print_info "Variables: No sensitive variable markers found (consider marking passwords, keys)"
fi

# Check for tfvars in gitignore
if [ -f "$TERRAFORM_ROOT/../.gitignore" ]; then
    if grep -q '\.tfvars' "$TERRAFORM_ROOT/../.gitignore" 2>/dev/null; then
        print_pass "Git: .tfvars files excluded from version control"
    else
        print_warning "Git: Consider adding *.tfvars to .gitignore"
    fi
fi

# =============================================================================
# Summary
# =============================================================================

print_header "Security Scan Summary"

echo -e "Critical Issues: ${RED}$CRITICAL_ISSUES${NC}"
echo -e "Warnings:        ${YELLOW}$WARNINGS${NC}"
echo -e "Passed:          ${GREEN}$PASSED${NC}"

if [ $CRITICAL_ISSUES -gt 0 ]; then
    echo -e "\n${RED}CRITICAL ISSUES FOUND! Please address these before deploying.${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "\n${YELLOW}Warnings found. Review these for potential improvements.${NC}"
    exit 0
else
    echo -e "\n${GREEN}All security checks passed!${NC}"
    exit 0
fi
