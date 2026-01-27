# =============================================================================
# VPC Module Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# VPC
# -----------------------------------------------------------------------------

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

# -----------------------------------------------------------------------------
# Subnets
# -----------------------------------------------------------------------------

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "List of public subnet IDs (empty if NAT Gateway disabled)"
  value       = var.enable_nat_gateway ? aws_subnet.public[*].id : []
}

output "private_subnet_cidrs" {
  description = "List of private subnet CIDR blocks"
  value       = aws_subnet.private[*].cidr_block
}

# -----------------------------------------------------------------------------
# Security Groups
# -----------------------------------------------------------------------------

output "lambda_security_group_id" {
  description = "Security group ID for Lambda functions"
  value       = aws_security_group.lambda.id
}

output "vpc_endpoints_security_group_id" {
  description = "Security group ID for VPC Interface Endpoints"
  value       = length(aws_security_group.vpc_endpoints) > 0 ? aws_security_group.vpc_endpoints[0].id : null
}

# -----------------------------------------------------------------------------
# VPC Endpoints
# -----------------------------------------------------------------------------

output "dynamodb_endpoint_id" {
  description = "ID of the DynamoDB VPC Endpoint"
  value       = var.enable_dynamodb_endpoint ? aws_vpc_endpoint.dynamodb[0].id : null
}

output "s3_endpoint_id" {
  description = "ID of the S3 VPC Endpoint"
  value       = var.enable_s3_endpoint ? aws_vpc_endpoint.s3[0].id : null
}

output "ssm_endpoint_id" {
  description = "ID of the SSM VPC Endpoint"
  value       = var.enable_ssm_endpoint ? aws_vpc_endpoint.ssm[0].id : null
}

output "secrets_endpoint_id" {
  description = "ID of the Secrets Manager VPC Endpoint"
  value       = var.enable_secrets_endpoint ? aws_vpc_endpoint.secretsmanager[0].id : null
}

output "logs_endpoint_id" {
  description = "ID of the CloudWatch Logs VPC Endpoint"
  value       = var.enable_logs_endpoint ? aws_vpc_endpoint.logs[0].id : null
}

# -----------------------------------------------------------------------------
# NAT Gateway
# -----------------------------------------------------------------------------

output "nat_gateway_ids" {
  description = "List of NAT Gateway IDs"
  value       = var.enable_nat_gateway ? aws_nat_gateway.main[*].id : []
}

output "nat_gateway_public_ips" {
  description = "List of NAT Gateway public IPs"
  value       = var.enable_nat_gateway ? aws_eip.nat[*].public_ip : []
}

# -----------------------------------------------------------------------------
# Lambda VPC Configuration
# -----------------------------------------------------------------------------

output "lambda_vpc_config" {
  description = "VPC configuration for Lambda functions"
  value = {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }
}
