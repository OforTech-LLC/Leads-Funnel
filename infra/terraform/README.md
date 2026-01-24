# Terraform Infrastructure

Infrastructure as Code for kanjona-funnel deployments.

## Structure

- `modules/` - Reusable Terraform modules
- `envs/dev/` - Development environment configuration
- `envs/prod/` - Production environment configuration

## Usage

```bash
cd envs/dev
terraform init
terraform plan
terraform apply
```
