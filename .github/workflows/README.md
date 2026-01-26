# CI/CD Workflows

GitHub Actions workflows for the Kanjona platform.

## Workflows

### `ci.yml` - Continuous Integration
**Trigger:** Push to main/develop, Pull Requests

Runs on every code change:
- Frontend linting and type checking
- Frontend build verification
- Backend Swift tests
- Terraform format and validation
- Security vulnerability scanning (Trivy)

### `frontend-deploy.yml` - Frontend Deployment
**Trigger:** Push to main (apps/web changes) or manual

Deploys Next.js frontend:
1. Builds static export
2. Uploads to S3 bucket
3. Invalidates CloudFront cache

### `backend-deploy.yml` - Backend Deployment
**Trigger:** Push to main (backend changes) or manual

Deploys Swift/Vapor backend:
1. Runs Swift tests
2. Builds release binary
3. Packages for Lambda
4. Updates Lambda functions

### `terraform-deploy.yml` - Infrastructure Deployment
**Trigger:** Push to main (infra changes), PRs, or manual

Manages infrastructure:
1. Validates Terraform configuration
2. Generates plan
3. Applies changes (main branch only)

### `configure-features.yml` - Feature Configuration
**Trigger:** Manual only

Interactive workflow with dropdown menus:
- Toggle feature flags (voice agent, WAF, notifications, etc.)
- Update rate limiting configuration
- Sync API keys from GitHub secrets to AWS
- Commits changes to tfvars
- Triggers deployment

### `deploy-all.yml` - Full Stack Deployment
**Trigger:** Manual only

Orchestrates complete deployment:
1. Terraform infrastructure
2. Backend Lambda functions
3. Frontend static site

### `toggle-features.yml` - Infrastructure Feature Toggles
**Trigger:** Manual only

Quick toggle for infrastructure features:
- WAF, CloudFront logging
- Lambda memory, reserved concurrency
- Basic authentication

## Required Secrets

| Secret | Description | Required For |
|--------|-------------|--------------|
| `AWS_ACCESS_KEY_ID` | AWS access key | All deployments |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | All deployments |
| `AWS_REGION` | AWS region | All deployments |
| `DEV_CLOUDFRONT_DISTRIBUTION_ID` | Dev CloudFront ID | Frontend deploy |
| `PROD_CLOUDFRONT_DISTRIBUTION_ID` | Prod CloudFront ID | Frontend deploy |
| `TWILIO_ACCOUNT_SID` | Twilio account | Voice agent |
| `TWILIO_AUTH_TOKEN` | Twilio auth | Voice agent |
| `ELEVENLABS_API_KEY` | ElevenLabs key | Voice agent |

## Environments

Workflows use GitHub Environments for:
- Environment-specific secrets
- Required reviewers (prod)
- Deployment protection rules

Configure at: Settings → Environments

## Manual Triggers

All workflows can be manually triggered via:
- GitHub UI: Actions → Select Workflow → Run workflow
- GitHub CLI: `gh workflow run <workflow>.yml -f input=value`

## Workflow Dependencies

```
ci.yml (every push)
    │
    ├── frontend-deploy.yml (on success, main only)
    │       └── Uploads to S3 → Invalidates CloudFront
    │
    ├── backend-deploy.yml (on success, main only)
    │       └── Updates Lambda functions
    │
    └── terraform-deploy.yml (on success, main only)
            └── Applies infrastructure changes

deploy-all.yml (manual)
    ├── terraform-deploy.yml
    ├── backend-deploy.yml
    └── frontend-deploy.yml

configure-features.yml (manual)
    └── Updates SSM → Commits tfvars → terraform-deploy.yml
```
