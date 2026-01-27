# Key Rotation Procedures

This document outlines the procedures for rotating cryptographic keys and secrets in the Kanjona
Lead Generation Platform.

## Table of Contents

1. [Overview](#overview)
2. [AWS KMS Key Rotation](#aws-kms-key-rotation)
3. [JWT Signing Key Rotation](#jwt-signing-key-rotation)
4. [Secret Rotation Procedures](#secret-rotation-procedures)
5. [Emergency Key Compromise Response](#emergency-key-compromise-response)
6. [Rotation Schedule](#rotation-schedule)

---

## Overview

Key rotation is critical for maintaining security. Regular rotation limits the impact of potential
key compromise and ensures compliance with security best practices.

### Key Types in Use

| Key Type              | Purpose                       | Rotation Frequency | Auto-Rotation     |
| --------------------- | ----------------------------- | ------------------ | ----------------- |
| KMS CMK               | Encrypt DynamoDB data at rest | Annual             | Yes (AWS managed) |
| JWT Signing Key       | Admin API authentication      | 90 days            | Manual            |
| API Keys              | Third-party integrations      | 90 days            | Manual            |
| IP Hash Salt          | Lead deduplication            | 180 days           | Manual            |
| Cognito Client Secret | Admin authentication          | 90 days            | Manual            |

---

## AWS KMS Key Rotation

### Automatic Rotation (Recommended)

AWS KMS supports automatic annual key rotation for customer-managed keys (CMKs).

#### Enable Automatic Rotation

```bash
# Enable automatic rotation for a KMS key
aws kms enable-key-rotation \
  --key-id alias/kanjona-data-key \
  --region us-east-1

# Verify rotation is enabled
aws kms get-key-rotation-status \
  --key-id alias/kanjona-data-key \
  --region us-east-1
```

#### Terraform Configuration

```hcl
resource "aws_kms_key" "data_key" {
  description             = "Kanjona data encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true  # Enable automatic annual rotation

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM policies"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      }
    ]
  })

  tags = {
    Environment = var.environment
    Project     = "kanjona"
  }
}
```

### Manual Rotation (If Required)

For scenarios requiring immediate rotation:

```bash
# 1. Create new key
aws kms create-key \
  --description "Kanjona data key v2" \
  --region us-east-1

# 2. Update key alias to point to new key
aws kms update-alias \
  --alias-name alias/kanjona-data-key \
  --target-key-id <new-key-id> \
  --region us-east-1

# 3. Re-encrypt existing data (if necessary)
# Note: DynamoDB with KMS automatic encryption handles this transparently
```

### Verification

```bash
# List key versions
aws kms list-key-policies \
  --key-id alias/kanjona-data-key \
  --region us-east-1

# Check encryption status
aws kms describe-key \
  --key-id alias/kanjona-data-key \
  --region us-east-1
```

---

## JWT Signing Key Rotation

The Admin API uses JWT tokens for authentication. Key rotation requires careful coordination to
avoid authentication failures.

### Pre-Rotation Checklist

- [ ] Schedule rotation during low-traffic period
- [ ] Notify team members of upcoming rotation
- [ ] Prepare new key in AWS Secrets Manager
- [ ] Test rotation procedure in dev environment

### Rotation Procedure

#### 1. Generate New Key

```bash
# Generate a new RS256 key pair
openssl genrsa -out jwt-private-key-new.pem 2048
openssl rsa -in jwt-private-key-new.pem -pubout -out jwt-public-key-new.pem

# Or generate a new HS256 secret
openssl rand -base64 64 > jwt-secret-new.txt
```

#### 2. Store in AWS Secrets Manager

```bash
# Create new secret version
aws secretsmanager put-secret-value \
  --secret-id kanjona/jwt-signing-key \
  --secret-string file://jwt-secret-new.txt \
  --version-stages AWSPENDING \
  --region us-east-1
```

#### 3. Deploy with Dual-Key Support

During rotation, the application should accept tokens signed with both old and new keys:

```typescript
// Example: Verify with multiple keys
async function verifyToken(token: string): Promise<JwtPayload> {
  const keys = [process.env.JWT_SIGNING_KEY_CURRENT, process.env.JWT_SIGNING_KEY_PREVIOUS].filter(
    Boolean
  );

  for (const key of keys) {
    try {
      return jwt.verify(token, key) as JwtPayload;
    } catch {
      continue;
    }
  }
  throw new Error('Invalid token');
}
```

#### 4. Complete Rotation

```bash
# Promote pending to current
aws secretsmanager update-secret-version-stage \
  --secret-id kanjona/jwt-signing-key \
  --version-stage AWSCURRENT \
  --move-to-version-id <new-version-id> \
  --remove-from-version-id <old-version-id> \
  --region us-east-1

# Keep old key as AWSPREVIOUS for grace period
aws secretsmanager update-secret-version-stage \
  --secret-id kanjona/jwt-signing-key \
  --version-stage AWSPREVIOUS \
  --move-to-version-id <old-version-id> \
  --region us-east-1
```

#### 5. Update Lambda Environment

```bash
# Redeploy Lambda to pick up new secret
aws lambda update-function-configuration \
  --function-name kanjona-admin-api \
  --environment "Variables={JWT_KEY_VERSION=$(date +%s)}" \
  --region us-east-1
```

### Cognito JWT Verification

For Cognito-issued tokens, key rotation is handled automatically by Cognito. The application fetches
JWKS from Cognito:

```typescript
// JWKS endpoint (auto-rotated by Cognito)
const jwksUrl = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
```

---

## Secret Rotation Procedures

### Twilio Credentials

```bash
# 1. Generate new API key in Twilio Console
# 2. Update Secrets Manager
aws secretsmanager put-secret-value \
  --secret-id kanjona/twilio \
  --secret-string '{"accountSid":"ACxxx","apiKeySid":"SKxxx","apiKeySecret":"xxx"}' \
  --region us-east-1

# 3. Redeploy affected services
# 4. Revoke old API key in Twilio Console
```

### ElevenLabs API Key

```bash
# 1. Generate new API key in ElevenLabs dashboard
# 2. Update Secrets Manager
aws secretsmanager put-secret-value \
  --secret-id kanjona/elevenlabs \
  --secret-string '{"apiKey":"new-api-key"}' \
  --region us-east-1

# 3. Redeploy voice agent Lambda
# 4. Revoke old API key
```

### IP Hash Salt Rotation

The IP hash salt is used for rate limiting and deduplication. Rotation will reset rate limit
counters.

```bash
# 1. Generate new salt
NEW_SALT=$(openssl rand -base64 32)

# 2. Update in SSM Parameter Store
aws ssm put-parameter \
  --name "/kanjona/prod/ip-hash-salt" \
  --value "$NEW_SALT" \
  --type SecureString \
  --overwrite \
  --region us-east-1

# 3. Redeploy Lambda functions
```

**Note:** After salt rotation, existing rate limit records will no longer match. Plan rotation
during low-traffic periods.

### Cognito App Client Secret

```bash
# Rotate via AWS CLI
aws cognito-idp update-user-pool-client \
  --user-pool-id us-east-1_XXXXXX \
  --client-id xxxxxxxxxxxxxxxx \
  --generate-secret \
  --region us-east-1

# Update application configuration with new secret
```

---

## Emergency Key Compromise Response

If a key is suspected to be compromised:

### Immediate Actions

1. **Assess Impact**
   - Identify which key is compromised
   - Determine potential data exposure
   - Check access logs for suspicious activity

2. **Revoke Compromised Key**

   ```bash
   # Disable KMS key immediately
   aws kms disable-key --key-id <compromised-key-id>

   # Or schedule deletion
   aws kms schedule-key-deletion \
     --key-id <compromised-key-id> \
     --pending-window-in-days 7
   ```

3. **Rotate to New Key**
   - Follow rotation procedures above
   - Skip grace periods for dual-key support

4. **Invalidate Active Sessions**

   ```bash
   # For JWT: Update signing key immediately
   # For Cognito: Revoke tokens
   aws cognito-idp admin-user-global-sign-out \
     --user-pool-id <pool-id> \
     --username <username>
   ```

5. **Audit and Document**
   - Review CloudTrail logs
   - Document incident timeline
   - Update security procedures

### Post-Incident

- Conduct security review
- Update monitoring and alerts
- Review access controls
- Consider security audit

---

## Rotation Schedule

### Automated Rotations

| Secret       | Rotation Frequency | Method        |
| ------------ | ------------------ | ------------- |
| KMS CMK      | Annual             | AWS automatic |
| Cognito JWKS | Managed by AWS     | Automatic     |

### Manual Rotations

| Secret                | Rotation Frequency | Next Rotation     |
| --------------------- | ------------------ | ----------------- |
| JWT Signing Key       | 90 days            | Track in calendar |
| Twilio API Key        | 90 days            | Track in calendar |
| ElevenLabs API Key    | 90 days            | Track in calendar |
| IP Hash Salt          | 180 days           | Track in calendar |
| Cognito Client Secret | 90 days            | Track in calendar |

### Rotation Calendar Setup

Create calendar reminders:

```bash
# Example: Set up rotation reminders (add to your calendar system)
# - JWT Key Rotation: Every 90 days
# - API Keys Rotation: Every 90 days
# - IP Hash Salt Rotation: Every 180 days
```

### Monitoring Key Age

```bash
# Check secret age
aws secretsmanager describe-secret \
  --secret-id kanjona/jwt-signing-key \
  --query 'LastChangedDate' \
  --output text

# List all secrets with age
aws secretsmanager list-secrets \
  --query 'SecretList[*].[Name,LastChangedDate]' \
  --output table
```

---

## Best Practices

1. **Never hardcode secrets** - Always use AWS Secrets Manager or SSM Parameter Store
2. **Use separate keys per environment** - Dev and prod should have different keys
3. **Enable CloudTrail logging** - Track all key usage and rotation events
4. **Test rotation in dev first** - Validate procedure before production
5. **Maintain rotation documentation** - Keep this document updated
6. **Set up alerts** - Monitor for rotation failures and key usage anomalies

---

## Related Documentation

- [AWS KMS Key Rotation](https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html)
- [AWS Secrets Manager Rotation](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html)
- [Cognito Token Handling](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html)
