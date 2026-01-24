#!/bin/bash
# =============================================================================
# Deploy Terraform Infrastructure
# =============================================================================
# Wrapper script for terraform apply with safety checks.
#
# Usage:
#   ./scripts/deploy.sh dev          # Deploy to dev
#   ./scripts/deploy.sh prod         # Deploy to prod
#   ./scripts/deploy.sh dev plan     # Plan only (no apply)
#   ./scripts/deploy.sh prod apply   # Apply with auto-approve
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# Arguments
# -----------------------------------------------------------------------------
ENVIRONMENT="${1:-}"
ACTION="${2:-plan}"

if [[ -z "${ENVIRONMENT}" ]]; then
    echo -e "${RED}Error: Environment required${NC}"
    echo "Usage: $0 <dev|prod> [plan|apply]"
    exit 1
fi

if [[ "${ENVIRONMENT}" != "dev" && "${ENVIRONMENT}" != "prod" ]]; then
    echo -e "${RED}Error: Environment must be 'dev' or 'prod'${NC}"
    exit 1
fi

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"
ENV_DIR="${PROJECT_ROOT}/infra/terraform/envs/${ENVIRONMENT}"

echo "=================================================="
echo -e "${GREEN}Terraform Deployment${NC}"
echo "=================================================="
echo "Environment: ${ENVIRONMENT}"
echo "Action:      ${ACTION}"
echo "Directory:   ${ENV_DIR}"
echo "=================================================="
echo ""

# Check directory exists
if [[ ! -d "${ENV_DIR}" ]]; then
    echo -e "${RED}Error: Environment directory not found: ${ENV_DIR}${NC}"
    exit 1
fi

cd "${ENV_DIR}"

# -----------------------------------------------------------------------------
# Initialize
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Initializing Terraform...${NC}"
terraform init -upgrade

# -----------------------------------------------------------------------------
# Validate
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}Validating configuration...${NC}"
terraform validate

# -----------------------------------------------------------------------------
# Format Check
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}Checking formatting...${NC}"
if ! terraform fmt -check -recursive ../../modules; then
    echo -e "${YELLOW}Warning: Some files need formatting. Run 'terraform fmt -recursive'${NC}"
fi

# -----------------------------------------------------------------------------
# Plan
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}Creating execution plan...${NC}"
terraform plan -out=tfplan

if [[ "${ACTION}" == "plan" ]]; then
    echo ""
    echo -e "${GREEN}Plan complete. Review the changes above.${NC}"
    echo "To apply: $0 ${ENVIRONMENT} apply"
    exit 0
fi

# -----------------------------------------------------------------------------
# Apply
# -----------------------------------------------------------------------------
if [[ "${ACTION}" == "apply" ]]; then
    echo ""

    # Extra confirmation for prod
    if [[ "${ENVIRONMENT}" == "prod" ]]; then
        echo -e "${RED}=================================================="
        echo "WARNING: You are about to deploy to PRODUCTION!"
        echo "==================================================${NC}"
        echo ""
        read -p "Type 'yes' to confirm: " CONFIRM
        if [[ "${CONFIRM}" != "yes" ]]; then
            echo "Deployment cancelled."
            exit 1
        fi
    fi

    echo -e "${YELLOW}Applying changes...${NC}"
    terraform apply tfplan

    echo ""
    echo -e "${GREEN}=================================================="
    echo "Deployment Complete!"
    echo "==================================================${NC}"
    echo ""
    echo "Outputs:"
    terraform output
fi

# Cleanup
rm -f tfplan
