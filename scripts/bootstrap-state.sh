#!/bin/bash
# =============================================================================
# Bootstrap Terraform State
# =============================================================================
# Creates S3 bucket and DynamoDB table for Terraform remote state.
# Run this ONCE per AWS account/region before running `terraform init`.
# =============================================================================

set -e

REGION="us-east-1"
PROJECT_NAME="kanjona"
BUCKET_NAME="${PROJECT_NAME}-terraform-state-$(date +%s)" # Unique bucket name
TABLE_NAME="${PROJECT_NAME}-terraform-locks"

echo "🚀 Bootstrapping Terraform State Infrastructure..."
echo "Region: $REGION"
echo "Bucket: $BUCKET_NAME"
echo "Table:  $TABLE_NAME"

# 1. Create S3 Bucket
echo "→ Creating S3 bucket..."
if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    echo "  Bucket already exists."
else
    aws s3api create-bucket \
        --bucket "$BUCKET_NAME" \
        --region "$REGION"
    
    # Enable Versioning
    aws s3api put-bucket-versioning \
        --bucket "$BUCKET_NAME" \
        --versioning-configuration Status=Enabled
        
    # Enable Encryption
    aws s3api put-bucket-encryption \
        --bucket "$BUCKET_NAME" \
        --server-side-encryption-configuration '{"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]}'
        
    # Block Public Access
    aws s3api put-public-access-block \
        --bucket "$BUCKET_NAME" \
        --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
        
    echo "✅ Bucket created."
fi

# 2. Create DynamoDB Table
echo "→ Creating DynamoDB table for locking..."
if aws dynamodb describe-table --table-name "$TABLE_NAME" --region "$REGION" >/dev/null 2>&1; then
    echo "  Table already exists."
else
    aws dynamodb create-table \
        --table-name "$TABLE_NAME" \
        --attribute-definitions AttributeName=LockID,AttributeType=S \
        --key-schema AttributeName=LockID,KeyType=HASH \
        --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=1 \
        --region "$REGION"
        
    echo "✅ Table created."
fi

echo "================================================================="
echo "🎉 Bootstrap Complete!"
echo "Update infra/terraform/backend.tf with:"
echo "bucket = \"$BUCKET_NAME\""
echo "dynamodb_table = \"$TABLE_NAME\""
echo "================================================================="