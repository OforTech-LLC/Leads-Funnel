#!/bin/bash
# =============================================================================
# Bootstrap Terraform State Infrastructure
# =============================================================================
# This script creates the S3 bucket and DynamoDB table required for
# Terraform remote state management.
#
# Run this ONCE before your first terraform init.
#
# Usage: ./scripts/bootstrap-state.sh
# =============================================================================

set -euo pipefail

# Configuration
PROJECT_NAME="kanjona-funnel"
AWS_REGION="${AWS_REGION:-us-east-1}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Resource names
BUCKET_NAME="${PROJECT_NAME}-terraform-state"
TABLE_NAME="${PROJECT_NAME}-terraform-locks"

echo "=================================================="
echo "Bootstrapping Terraform State Infrastructure"
echo "=================================================="
echo "Project:    ${PROJECT_NAME}"
echo "Region:     ${AWS_REGION}"
echo "Account:    ${ACCOUNT_ID}"
echo "Bucket:     ${BUCKET_NAME}"
echo "Table:      ${TABLE_NAME}"
echo "=================================================="
echo ""

# -----------------------------------------------------------------------------
# Create S3 Bucket
# -----------------------------------------------------------------------------
echo "Creating S3 bucket for state storage..."

if aws s3api head-bucket --bucket "${BUCKET_NAME}" 2>/dev/null; then
    echo "  Bucket already exists: ${BUCKET_NAME}"
else
    aws s3api create-bucket \
        --bucket "${BUCKET_NAME}" \
        --region "${AWS_REGION}" \
        $(if [ "${AWS_REGION}" != "us-east-1" ]; then echo "--create-bucket-configuration LocationConstraint=${AWS_REGION}"; fi)

    echo "  Created bucket: ${BUCKET_NAME}"
fi

# Enable versioning
echo "  Enabling versioning..."
aws s3api put-bucket-versioning \
    --bucket "${BUCKET_NAME}" \
    --versioning-configuration Status=Enabled

# Enable encryption
echo "  Enabling server-side encryption..."
aws s3api put-bucket-encryption \
    --bucket "${BUCKET_NAME}" \
    --server-side-encryption-configuration '{
        "Rules": [{
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "AES256"
            },
            "BucketKeyEnabled": true
        }]
    }'

# Block public access
echo "  Blocking public access..."
aws s3api put-public-access-block \
    --bucket "${BUCKET_NAME}" \
    --public-access-block-configuration '{
        "BlockPublicAcls": true,
        "IgnorePublicAcls": true,
        "BlockPublicPolicy": true,
        "RestrictPublicBuckets": true
    }'

# Add lifecycle rule for old versions
echo "  Adding lifecycle rule..."
aws s3api put-bucket-lifecycle-configuration \
    --bucket "${BUCKET_NAME}" \
    --lifecycle-configuration '{
        "Rules": [{
            "ID": "DeleteOldVersions",
            "Status": "Enabled",
            "NoncurrentVersionExpiration": {
                "NoncurrentDays": 90
            },
            "Filter": {}
        }]
    }'

echo "  S3 bucket configured successfully."
echo ""

# -----------------------------------------------------------------------------
# Create DynamoDB Table
# -----------------------------------------------------------------------------
echo "Creating DynamoDB table for state locking..."

if aws dynamodb describe-table --table-name "${TABLE_NAME}" --region "${AWS_REGION}" 2>/dev/null; then
    echo "  Table already exists: ${TABLE_NAME}"
else
    aws dynamodb create-table \
        --table-name "${TABLE_NAME}" \
        --attribute-definitions AttributeName=LockID,AttributeType=S \
        --key-schema AttributeName=LockID,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region "${AWS_REGION}" \
        --tags Key=Project,Value="${PROJECT_NAME}" Key=ManagedBy,Value=terraform

    echo "  Waiting for table to become active..."
    aws dynamodb wait table-exists --table-name "${TABLE_NAME}" --region "${AWS_REGION}"

    echo "  Created table: ${TABLE_NAME}"
fi

echo "  DynamoDB table configured successfully."
echo ""

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
echo "=================================================="
echo "Bootstrap Complete!"
echo "=================================================="
echo ""
echo "Update your backend.tf files with:"
echo ""
echo "  terraform {"
echo "    backend \"s3\" {"
echo "      bucket         = \"${BUCKET_NAME}\""
echo "      key            = \"env/<ENV>/terraform.tfstate\""
echo "      region         = \"${AWS_REGION}\""
echo "      dynamodb_table = \"${TABLE_NAME}\""
echo "      encrypt        = true"
echo "    }"
echo "  }"
echo ""
echo "Then run:"
echo "  cd infra/terraform/envs/dev"
echo "  terraform init"
echo "  terraform plan"
echo ""
