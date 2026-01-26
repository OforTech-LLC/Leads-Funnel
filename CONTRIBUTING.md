# Contributing to Kanjona

## Development Setup

### Prerequisites

- Node.js 20+
- Swift 5.10+
- Terraform 1.7+
- AWS CLI
- GitHub CLI

### Getting Started

```bash
# Clone the repository
git clone https://github.com/Elumirae/Leads-Funnel.git
cd Leads-Funnel

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Start development
npm run dev          # Frontend
cd backend && swift run  # Backend
```

## Code Style

### TypeScript/JavaScript
- ESLint configuration in `.eslintrc`
- Prettier for formatting
- Use TypeScript strict mode

### Swift
- Follow Swift API Design Guidelines
- Use SwiftFormat for formatting
- Document public APIs with doc comments

### Terraform
- Run `terraform fmt` before committing
- Use `terraform validate` to check syntax
- Follow module naming conventions

## Git Workflow

### Branch Naming

```
feature/add-new-funnel
bugfix/fix-rate-limiting
chore/update-dependencies
docs/improve-readme
```

### Commit Messages

Follow conventional commits:

```
feat: add voice agent integration
fix: correct rate limiting window
docs: update API documentation
chore: upgrade dependencies
test: add spam detector tests
```

### Pull Requests

1. Create a feature branch
2. Make your changes
3. Run tests locally
4. Push and create PR
5. Wait for CI checks
6. Request review

## Testing

### Frontend

```bash
cd apps/web
npm test
npm run lint
npx tsc --noEmit
```

### Backend

```bash
cd backend
swift test
```

### Infrastructure

```bash
cd infra/terraform
terraform fmt -check -recursive
terraform validate
```

## Adding a New Funnel

1. **Add service config** (`apps/web/src/config/services.ts`):
```typescript
{
  slug: 'new-service',
  name: 'New Service',
  icon: '🆕',
  color: '#FF5733',
  gradient: 'from-orange-500 to-red-600',
  category: 'business',
}
```

2. **Add translations** (`apps/web/src/i18n/messages/en.json`):
```json
"new-service": {
  "hero": { "headline": "...", "subheadline": "..." },
  "benefits": { ... },
  "testimonials": { ... },
  "faq": { ... },
  ...
}
```

3. **Add to funnel list** (`infra/terraform/shared/funnels.tf`):
```hcl
locals {
  funnel_ids = [
    "new-service",
    ...
  ]
}
```

4. **Run build** to verify:
```bash
npm run build
```

## Documentation

- Update README files when adding features
- Add JSDoc/doc comments to public APIs
- Keep CHANGELOG updated

## Security

- Never commit secrets or credentials
- Use environment variables for sensitive data
- Report security issues privately

## Questions?

Open an issue on GitHub or reach out to the maintainers.
