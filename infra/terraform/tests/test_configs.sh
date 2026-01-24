#!/bin/bash
# =============================================================================
# Terraform Configuration Tests
# =============================================================================
# This script contains custom tests for validating Terraform configuration
# values and ensuring they match the backend application expectations.
#
# This file is sourced by validate_all.sh
# =============================================================================

# Test DynamoDB configuration
test_dynamodb_config() {
    print_test "DynamoDB module configuration"

    local dynamodb_main="$TERRAFORM_ROOT/modules/dynamodb/main.tf"

    # Test 1: Primary key configuration
    if grep -q 'hash_key\s*=\s*"PK"' "$dynamodb_main" && \
       grep -q 'range_key\s*=\s*"SK"' "$dynamodb_main"; then
        print_pass "DynamoDB primary key: PK/SK configured correctly"
    else
        print_fail "DynamoDB primary key: expected hash_key=PK, range_key=SK"
    fi

    # Test 2: GSI1 configuration
    if grep -A5 'global_secondary_index' "$dynamodb_main" | grep -q 'name\s*=\s*"GSI1"' && \
       grep -A5 'global_secondary_index' "$dynamodb_main" | grep -q 'hash_key\s*=\s*"GSI1PK"' && \
       grep -A5 'global_secondary_index' "$dynamodb_main" | grep -q 'range_key\s*=\s*"GSI1SK"'; then
        print_pass "DynamoDB GSI1: configured with GSI1PK/GSI1SK keys"
    else
        print_fail "DynamoDB GSI1: expected GSI1 with hash_key=GSI1PK, range_key=GSI1SK"
    fi

    # Test 3: TTL configuration
    if grep -A2 'ttl {' "$dynamodb_main" | grep -q 'attribute_name\s*=\s*"ttl"' && \
       grep -A2 'ttl {' "$dynamodb_main" | grep -q 'enabled\s*=\s*true'; then
        print_pass "DynamoDB TTL: enabled on 'ttl' attribute"
    else
        print_fail "DynamoDB TTL: expected TTL enabled on 'ttl' attribute"
    fi

    # Test 4: Server-side encryption
    if grep -A2 'server_side_encryption' "$dynamodb_main" | grep -q 'enabled\s*=\s*true'; then
        print_pass "DynamoDB encryption: server-side encryption enabled"
    else
        print_fail "DynamoDB encryption: server-side encryption should be enabled"
    fi

    # Test 5: Billing mode
    if grep -q 'billing_mode\s*=\s*"PAY_PER_REQUEST"' "$dynamodb_main"; then
        print_pass "DynamoDB billing: PAY_PER_REQUEST (on-demand) mode"
    else
        print_fail "DynamoDB billing: expected PAY_PER_REQUEST billing mode"
    fi

    # Test 6: Required attributes defined
    local required_attrs=("PK" "SK" "GSI1PK" "GSI1SK")
    local all_attrs_found=true
    for attr in "${required_attrs[@]}"; do
        if ! grep -A2 'attribute {' "$dynamodb_main" | grep -q "name\s*=\s*\"$attr\""; then
            print_fail "DynamoDB attribute: $attr not defined"
            all_attrs_found=false
        fi
    done
    if [ "$all_attrs_found" = true ]; then
        print_pass "DynamoDB attributes: all required attributes defined (PK, SK, GSI1PK, GSI1SK)"
    fi
}

# Test EventBridge configuration
test_eventing_config() {
    print_test "EventBridge/Eventing module configuration"

    local eventing_main="$TERRAFORM_ROOT/modules/eventing/main.tf"

    # Test 1: Event bus exists
    if grep -q 'resource "aws_cloudwatch_event_bus"' "$eventing_main"; then
        print_pass "EventBridge: custom event bus defined"
    else
        print_fail "EventBridge: custom event bus not found"
    fi

    # Test 2: Lead created rule
    if grep -q 'source.*=.*\["kanjona.leads"\]' "$eventing_main" && \
       grep -q 'detail-type.*=.*\["lead.created"\]' "$eventing_main"; then
        print_pass "EventBridge rule: lead.created event pattern configured"
    else
        print_fail "EventBridge rule: expected source='kanjona.leads', detail-type='lead.created'"
    fi

    # Test 3: SQS dead-letter queue
    if grep -q 'resource "aws_sqs_queue" "dlq"' "$eventing_main" && \
       grep -q 'redrive_policy' "$eventing_main"; then
        print_pass "EventBridge SQS: dead-letter queue and redrive policy configured"
    else
        print_fail "EventBridge SQS: DLQ or redrive policy not found"
    fi

    # Test 4: SQS encryption
    if grep -q 'sqs_managed_sse_enabled\s*=\s*true' "$eventing_main"; then
        print_pass "EventBridge SQS: server-side encryption enabled"
    else
        print_fail "EventBridge SQS: server-side encryption should be enabled"
    fi
}

# Test API Gateway configuration
test_api_config() {
    print_test "API Gateway module configuration"

    local api_main="$TERRAFORM_ROOT/modules/api/main.tf"

    # Test 1: HTTP API v2
    if grep -q 'resource "aws_apigatewayv2_api"' "$api_main" && \
       grep -q 'protocol_type\s*=\s*"HTTP"' "$api_main"; then
        print_pass "API Gateway: HTTP API v2 configured"
    else
        print_fail "API Gateway: expected HTTP API v2"
    fi

    # Test 2: CORS configuration
    if grep -q 'cors_configuration' "$api_main" && \
       grep -q 'allow_methods.*POST.*OPTIONS' "$api_main"; then
        print_pass "API Gateway CORS: POST and OPTIONS methods allowed"
    else
        print_fail "API Gateway CORS: expected POST and OPTIONS methods"
    fi

    # Test 3: POST /lead route
    if grep -q 'route_key\s*=\s*"POST /lead"' "$api_main"; then
        print_pass "API Gateway route: POST /lead endpoint configured"
    else
        print_fail "API Gateway route: POST /lead endpoint not found"
    fi

    # Test 4: TLS configuration
    if grep -q 'security_policy\s*=\s*"TLS_1_2"' "$api_main"; then
        print_pass "API Gateway TLS: minimum TLS 1.2 enforced"
    else
        print_fail "API Gateway TLS: TLS 1.2 should be minimum"
    fi

    # Test 5: Auto deploy
    if grep -q 'auto_deploy\s*=\s*true' "$api_main"; then
        print_pass "API Gateway stage: auto_deploy enabled"
    else
        print_fail "API Gateway stage: auto_deploy should be enabled"
    fi
}

# Test Lambda configuration
test_lambda_config() {
    print_test "Lambda function configuration"

    local lambda_tf="$TERRAFORM_ROOT/modules/api/lambda.tf"

    # Test 1: Python runtime
    if grep -q 'runtime\s*=\s*"python3.12"' "$lambda_tf"; then
        print_pass "Lambda runtime: Python 3.12"
    else
        print_fail "Lambda runtime: expected python3.12"
    fi

    # Test 2: ARM64 architecture
    if grep -q 'architectures\s*=\s*\["arm64"\]' "$lambda_tf"; then
        print_pass "Lambda architecture: ARM64 (Graviton)"
    else
        print_fail "Lambda architecture: expected ARM64 for cost efficiency"
    fi

    # Test 3: X-Ray tracing option
    if grep -q 'tracing_config' "$lambda_tf"; then
        print_pass "Lambda tracing: X-Ray tracing configuration present"
    else
        print_fail "Lambda tracing: X-Ray tracing should be configurable"
    fi

    # Test 4: Reserved concurrency
    if grep -q 'reserved_concurrent_executions' "$lambda_tf"; then
        print_pass "Lambda concurrency: reserved concurrency configurable"
    else
        print_fail "Lambda concurrency: reserved_concurrent_executions not found"
    fi

    # Test 5: Environment variables
    local required_env_vars=("DYNAMODB_TABLE_NAME" "EVENT_BUS_NAME" "ENVIRONMENT")
    for var in "${required_env_vars[@]}"; do
        if grep -q "$var" "$lambda_tf"; then
            print_pass "Lambda env var: $var configured"
        else
            print_fail "Lambda env var: $var not found"
        fi
    done
}

# Test IAM configuration (least privilege)
test_iam_config() {
    print_test "IAM configuration (least privilege)"

    local lambda_tf="$TERRAFORM_ROOT/modules/api/lambda.tf"

    # Test 1: No wildcard resources in DynamoDB permissions
    if ! grep -A10 'Sid.*=.*"DynamoDBWrite"' "$lambda_tf" | grep -q 'Resource\s*=\s*"\*"'; then
        print_pass "IAM DynamoDB: no wildcard (*) resources for write operations"
    else
        print_fail "IAM DynamoDB: wildcard (*) resources found, violates least privilege"
    fi

    # Test 2: Scoped EventBridge permissions
    if grep -q 'Sid.*=.*"EventBridgePutEvents"' "$lambda_tf" && \
       grep -A5 'EventBridgePutEvents' "$lambda_tf" | grep -q 'events:PutEvents'; then
        print_pass "IAM EventBridge: PutEvents permission scoped"
    else
        print_fail "IAM EventBridge: permission not properly scoped"
    fi

    # Test 3: Assume role policy restricted to Lambda
    if grep -A10 'assume_role_policy' "$lambda_tf" | grep -q 'Service\s*=\s*"lambda.amazonaws.com"'; then
        print_pass "IAM assume role: restricted to Lambda service"
    else
        print_fail "IAM assume role: should be restricted to lambda.amazonaws.com"
    fi
}

# Test WAF configuration
test_waf_config() {
    print_test "WAF module configuration"

    local waf_main="$TERRAFORM_ROOT/modules/waf/main.tf"

    # Test 1: CloudFront scope
    if grep -q 'scope\s*=\s*"CLOUDFRONT"' "$waf_main"; then
        print_pass "WAF scope: CLOUDFRONT (correct for CloudFront distributions)"
    else
        print_fail "WAF scope: expected CLOUDFRONT scope"
    fi

    # Test 2: Rate limiting rule
    if grep -q 'rate_based_statement' "$waf_main" && \
       grep -q 'aggregate_key_type\s*=\s*"IP"' "$waf_main"; then
        print_pass "WAF rate limiting: IP-based rate limiting configured"
    else
        print_fail "WAF rate limiting: IP-based rate limiting not found"
    fi

    # Test 3: AWS Managed Rules
    if grep -q 'AWSManagedRulesCommonRuleSet' "$waf_main" && \
       grep -q 'AWSManagedRulesKnownBadInputsRuleSet' "$waf_main"; then
        print_pass "WAF managed rules: Common and Known Bad Inputs rule sets"
    else
        print_fail "WAF managed rules: expected AWS managed rule sets"
    fi

    # Test 4: CloudWatch metrics enabled
    if grep -q 'cloudwatch_metrics_enabled\s*=\s*true' "$waf_main"; then
        print_pass "WAF metrics: CloudWatch metrics enabled"
    else
        print_fail "WAF metrics: CloudWatch metrics should be enabled"
    fi
}

# Test Static Site configuration
test_static_site_config() {
    print_test "Static Site (CloudFront + S3) configuration"

    local static_main="$TERRAFORM_ROOT/modules/static_site/main.tf"

    # Test 1: S3 public access blocked
    if grep -q 'block_public_acls\s*=\s*true' "$static_main" && \
       grep -q 'block_public_policy\s*=\s*true' "$static_main" && \
       grep -q 'ignore_public_acls\s*=\s*true' "$static_main" && \
       grep -q 'restrict_public_buckets\s*=\s*true' "$static_main"; then
        print_pass "S3 security: all public access blocked"
    else
        print_fail "S3 security: public access should be completely blocked"
    fi

    # Test 2: S3 versioning enabled
    if grep -q 'versioning_configuration' "$static_main" && \
       grep -q 'status\s*=\s*"Enabled"' "$static_main"; then
        print_pass "S3 versioning: enabled"
    else
        print_fail "S3 versioning: should be enabled"
    fi

    # Test 3: S3 encryption
    if grep -q 'server_side_encryption_configuration' "$static_main" && \
       grep -q 'sse_algorithm\s*=\s*"AES256"' "$static_main"; then
        print_pass "S3 encryption: AES256 server-side encryption"
    else
        print_fail "S3 encryption: should use AES256"
    fi

    # Test 4: CloudFront OAC (not legacy OAI)
    if grep -q 'aws_cloudfront_origin_access_control' "$static_main"; then
        print_pass "CloudFront: using OAC (Origin Access Control)"
    else
        print_fail "CloudFront: should use OAC instead of legacy OAI"
    fi

    # Test 5: HTTPS redirect
    if grep -q 'viewer_protocol_policy\s*=\s*"redirect-to-https"' "$static_main"; then
        print_pass "CloudFront: HTTP to HTTPS redirect enabled"
    else
        print_fail "CloudFront: should redirect HTTP to HTTPS"
    fi

    # Test 6: TLS version
    if grep -q 'minimum_protocol_version\s*=\s*"TLSv1.2_2021"' "$static_main"; then
        print_pass "CloudFront TLS: minimum TLSv1.2_2021"
    else
        print_fail "CloudFront TLS: should use minimum TLSv1.2_2021"
    fi

    # Test 7: SPA error handling
    if grep -q 'custom_error_response' "$static_main" && \
       grep -q 'error_code\s*=\s*403' "$static_main" && \
       grep -q 'error_code\s*=\s*404' "$static_main"; then
        print_pass "CloudFront SPA: custom error responses for 403/404"
    else
        print_fail "CloudFront SPA: should handle 403/404 for SPA routing"
    fi
}

# Test SES configuration
test_ses_config() {
    print_test "SES module configuration"

    local ses_main="$TERRAFORM_ROOT/modules/ses/main.tf"

    # Test 1: Domain identity
    if grep -q 'resource "aws_ses_domain_identity"' "$ses_main"; then
        print_pass "SES: domain identity configured"
    else
        print_fail "SES: domain identity not found"
    fi

    # Test 2: DKIM configuration
    if grep -q 'resource "aws_ses_domain_dkim"' "$ses_main"; then
        print_pass "SES DKIM: DKIM signing configured"
    else
        print_fail "SES DKIM: DKIM should be configured"
    fi

    # Test 3: TLS policy
    if grep -q 'tls_policy\s*=\s*"Require"' "$ses_main"; then
        print_pass "SES TLS: TLS required for delivery"
    else
        print_fail "SES TLS: TLS should be required"
    fi

    # Test 4: Configuration set
    if grep -q 'resource "aws_ses_configuration_set"' "$ses_main" && \
       grep -q 'reputation_metrics_enabled\s*=\s*true' "$ses_main"; then
        print_pass "SES config set: reputation metrics enabled"
    else
        print_fail "SES config set: reputation metrics should be enabled"
    fi
}

# Test Monitoring configuration
test_monitoring_config() {
    print_test "Monitoring module configuration"

    local monitoring_main="$TERRAFORM_ROOT/modules/monitoring/main.tf"

    # Test 1: SNS topic for alerts
    if grep -q 'resource "aws_sns_topic"' "$monitoring_main"; then
        print_pass "Monitoring: SNS topic for alerts"
    else
        print_fail "Monitoring: SNS topic not found"
    fi

    # Test 2: Lambda error alarm
    if grep -q 'metric_name.*=.*"Errors"' "$monitoring_main" && \
       grep -q 'namespace.*=.*"AWS/Lambda"' "$monitoring_main"; then
        print_pass "Monitoring: Lambda errors alarm configured"
    else
        print_fail "Monitoring: Lambda errors alarm not found"
    fi

    # Test 3: API Gateway 5xx alarm
    if grep -q 'metric_name.*=.*"5xx"' "$monitoring_main"; then
        print_pass "Monitoring: API Gateway 5xx alarm configured"
    else
        print_fail "Monitoring: API Gateway 5xx alarm not found"
    fi

    # Test 4: DynamoDB throttle alarm
    if grep -q 'metric_name.*=.*"ThrottledRequests"' "$monitoring_main"; then
        print_pass "Monitoring: DynamoDB throttle alarm configured"
    else
        print_fail "Monitoring: DynamoDB throttle alarm not found"
    fi

    # Test 5: SQS DLQ alarm
    if grep -q 'ApproximateNumberOfMessagesVisible' "$monitoring_main"; then
        print_pass "Monitoring: SQS DLQ alarm configured"
    else
        print_fail "Monitoring: SQS DLQ alarm not found"
    fi
}

# Test naming conventions
test_naming_conventions() {
    print_test "Resource naming conventions"

    # Check that resources use project_name and environment in names
    local modules=("dynamodb" "api" "eventing" "static_site" "waf" "ses" "monitoring")
    local pattern='"\${var.project_name}-\${var.environment}-'

    for module in "${modules[@]}"; do
        local module_path="$TERRAFORM_ROOT/modules/$module/main.tf"
        if [ -f "$module_path" ]; then
            if grep -q "$pattern" "$module_path"; then
                print_pass "Naming convention: $module uses \${project_name}-\${environment} prefix"
            else
                print_fail "Naming convention: $module should use \${project_name}-\${environment} prefix"
            fi
        fi
    done
}

# Test security best practices
test_security_best_practices() {
    print_test "Security best practices"

    # Test 1: No hardcoded secrets
    local all_tf_files=$(find "$TERRAFORM_ROOT" -name "*.tf" -type f ! -path "*/.terraform/*")
    local secret_patterns=("password\s*=\s*\"[^\"]+\"" "secret\s*=\s*\"[^\"]+\"" "api_key\s*=\s*\"[^\"]+\"")

    local secrets_found=false
    for pattern in "${secret_patterns[@]}"; do
        if echo "$all_tf_files" | xargs grep -l "$pattern" 2>/dev/null | grep -v "variable" | grep -q .; then
            secrets_found=true
            print_fail "Security: potential hardcoded secrets found"
            break
        fi
    done
    if [ "$secrets_found" = false ]; then
        print_pass "Security: no hardcoded secrets detected"
    fi

    # Test 2: Deletion protection in prod
    local prod_main="$TERRAFORM_ROOT/envs/prod/main.tf"
    if grep -q 'enable_deletion_protection\s*=\s*true' "$prod_main" || \
       grep -q 'enable_deletion_protection\s*=\s*var' "$prod_main"; then
        print_pass "Security: deletion protection available for prod"
    else
        print_fail "Security: deletion protection should be enabled in prod"
    fi
}

# Test DynamoDB backend compatibility
test_dynamodb_backend_compatibility() {
    print_test "DynamoDB configuration matches backend expectations"

    local dynamodb_main="$TERRAFORM_ROOT/modules/dynamodb/main.tf"

    # The backend code expects:
    # - PK/SK as primary key (String type)
    # - GSI1 with GSI1PK/GSI1SK keys
    # - TTL attribute named "ttl"

    # Test 1: PK attribute is String type
    if grep -B1 'name = "PK"' "$dynamodb_main" | grep -q 'type = "S"' || \
       grep -A1 'name = "PK"' "$dynamodb_main" | grep -q 'type = "S"'; then
        print_pass "Backend compat: PK attribute is String type"
    else
        print_fail "Backend compat: PK should be String type (S)"
    fi

    # Test 2: GSI1 index name matches backend code
    # Backend uses: indexName: "GSI1"
    if grep -A3 'global_secondary_index' "$dynamodb_main" | grep -q 'name\s*=\s*"GSI1"'; then
        print_pass "Backend compat: GSI1 index name matches backend expectation"
    else
        print_fail "Backend compat: GSI1 index name should be 'GSI1' (backend expects this)"
    fi

    # Test 3: GSI1 projection type is ALL (backend needs full item)
    if grep -A10 'global_secondary_index' "$dynamodb_main" | grep -q 'projection_type\s*=\s*"ALL"'; then
        print_pass "Backend compat: GSI1 projects ALL attributes"
    else
        print_fail "Backend compat: GSI1 should project ALL attributes for backend queries"
    fi
}

# =============================================================================
# Run All Custom Tests
# =============================================================================

test_dynamodb_config
test_eventing_config
test_api_config
test_lambda_config
test_iam_config
test_waf_config
test_static_site_config
test_ses_config
test_monitoring_config
test_naming_conventions
test_security_best_practices
test_dynamodb_backend_compatibility
