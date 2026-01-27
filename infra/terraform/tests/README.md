# Terraform Infrastructure Tests

This directory contains test scripts for validating the Terraform infrastructure configurations.

## Overview

The test suite validates:

- Terraform syntax and formatting
- Resource configurations
- Security best practices
- Backend code compatibility (DynamoDB schema alignment)
- Naming conventions
- IAM least privilege

## Test Scripts

### 1. `validate_all.sh` - Comprehensive Validation

The main test script that runs all validations.

```bash
# Run all validations
./validate_all.sh

# Run for specific environment
./validate_all.sh -e prod

# Verbose output
./validate_all.sh -v

# Show help
./validate_all.sh -h
```

**What it checks:**

- Terraform installation
- Module syntax validation
- Environment configuration validation
- Terraform formatting (terraform fmt)
- Custom configuration tests (via test_configs.sh)

### 2. `test_configs.sh` - Configuration Tests

Detailed tests for resource configurations. This file is sourced by `validate_all.sh`.

**Tests included:**

- DynamoDB configuration (keys, GSI, TTL, encryption)
- EventBridge/SQS configuration (event patterns, DLQ)
- API Gateway configuration (CORS, routes, TLS)
- Lambda configuration (runtime, architecture, environment)
- IAM policies (least privilege)
- WAF configuration (rules, rate limiting)
- Static site configuration (S3, CloudFront)
- SES configuration (DKIM, TLS)
- Monitoring configuration (alarms)
- Naming conventions
- Security best practices
- Backend compatibility checks

### 3. `validate_plan.sh` - Plan Validation

Creates a Terraform plan and validates the planned resources.

```bash
# Validate dev environment plan
./validate_plan.sh

# Validate prod environment plan
./validate_plan.sh -e prod

# Save plan to file
./validate_plan.sh -o myplan.tfplan
```

**Requires:** `jq` for JSON parsing (optional but recommended)

**What it checks:**

- Plan creation success
- Required resources are present
- Resource configuration values
- Resource counts and types

### 4. `security_checks.sh` - Security Validation

Focused security validation script.

```bash
# Run security checks
./security_checks.sh

# Verbose output
./security_checks.sh -v
```

**What it checks:**

- Hardcoded secrets detection
- Encryption at rest (DynamoDB, S3, SQS)
- Encryption in transit (TLS configuration)
- Public access configuration
- IAM least privilege
- Logging configuration
- WAF and rate limiting
- Deletion protection
- Network security
- Sensitive data handling

## Prerequisites

### Required

- **Terraform** >= 1.0.0

### Recommended

- **jq** - For JSON parsing in plan validation

  ```bash
  # macOS
  brew install jq

  # Linux (Debian/Ubuntu)
  apt-get install jq
  ```

## Running Tests

### Quick Start

```bash
# Navigate to tests directory
cd infra/terraform/tests

# Make scripts executable
chmod +x *.sh

# Run all tests
./validate_all.sh
```

### CI/CD Integration

Add to your CI pipeline:

```yaml
# GitHub Actions example
- name: Validate Terraform
  run: |
    cd infra/terraform/tests
    chmod +x *.sh
    ./validate_all.sh -e ${{ github.ref == 'refs/heads/main' && 'prod' || 'dev' }}

- name: Security Scan
  run: |
    cd infra/terraform/tests
    ./security_checks.sh
```

### Pre-commit Hook

Add to `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: local
    hooks:
      - id: terraform-validate
        name: Terraform Validate
        entry: infra/terraform/tests/validate_all.sh
        language: script
        files: '\.tf$'
        pass_filenames: false
```

## Test Results

Tests use exit codes:

- `0` - All tests passed
- `1` - One or more tests failed

Color-coded output:

- **GREEN** [PASS] - Test passed
- **RED** [FAIL] - Test failed
- **YELLOW** [WARNING] - Warning (non-blocking)
- **BLUE** [INFO] - Informational

## Backend Compatibility

The tests verify that Terraform configurations match what the backend application expects:

### DynamoDB Schema Alignment

| Backend Expectation        | Terraform Configuration          |
| -------------------------- | -------------------------------- |
| Primary Key: `PK` (String) | `hash_key = "PK"`, `type = "S"`  |
| Sort Key: `SK` (String)    | `range_key = "SK"`, `type = "S"` |
| GSI Name: `GSI1`           | `name = "GSI1"`                  |
| GSI Hash Key: `GSI1PK`     | `hash_key = "GSI1PK"`            |
| GSI Range Key: `GSI1SK`    | `range_key = "GSI1SK"`           |
| TTL Attribute: `ttl`       | `attribute_name = "ttl"`         |

### EventBridge Event Pattern

| Backend Expectation         | Terraform Configuration          |
| --------------------------- | -------------------------------- |
| Source: `kanjona.leads`     | `source = ["kanjona.leads"]`     |
| Detail Type: `lead.created` | `detail-type = ["lead.created"]` |

## Adding New Tests

### To test_configs.sh

Add a new test function:

```bash
test_my_new_check() {
    print_test "Description of my check"

    local file_path="$TERRAFORM_ROOT/modules/mymodule/main.tf"

    if grep -q 'expected_pattern' "$file_path"; then
        print_pass "Check passed message"
    else
        print_fail "Check failed message"
    fi
}

# Call at the bottom of the file
test_my_new_check
```

### To security_checks.sh

Follow the existing pattern with severity levels:

- `print_critical` - Security issue, blocks deployment
- `print_warning` - Potential issue, review recommended
- `print_pass` - Check passed

## Troubleshooting

### "Terraform is not installed"

Install Terraform: https://www.terraform.io/downloads

### "jq is not installed"

Install jq for plan validation (optional):

```bash
brew install jq  # macOS
apt-get install jq  # Linux
```

### Formatting failures

Run `terraform fmt -recursive` in the terraform directory:

```bash
terraform fmt -recursive infra/terraform/
```

### Init failures

Ensure you have valid AWS credentials or use `-backend=false`:

```bash
terraform init -backend=false
```

## Module Coverage

| Module      | validate_all | test_configs | security_checks |
| ----------- | ------------ | ------------ | --------------- |
| acm         | X            | -            | -               |
| api         | X            | X            | X               |
| dns         | X            | -            | -               |
| dynamodb    | X            | X            | X               |
| eventing    | X            | X            | X               |
| monitoring  | X            | X            | X               |
| ses         | X            | X            | X               |
| static_site | X            | X            | X               |
| waf         | X            | X            | X               |

## License

Part of the Leads-Funnel project.
