# Contributing to Kanjona

Thank you for your interest in contributing to Kanjona! This document provides guidelines and
instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Issue Guidelines](#issue-guidelines)

## Code of Conduct

### Our Standards

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the issue, not the person
- Accept responsibility for mistakes
- Prioritize the project's best interest

### Unacceptable Behavior

- Harassment or discrimination
- Trolling or insulting comments
- Publishing private information
- Unprofessional conduct

## Getting Started

### Prerequisites

- **Node.js 20+**: Frontend and API development
- **Swift 5.10+**: Backend development
- **Terraform 1.7+**: Infrastructure changes
- **AWS CLI**: Configured with appropriate credentials
- **Git**: Version control

### Initial Setup

1. **Fork the repository**

   Click the "Fork" button on GitHub to create your own copy.

2. **Clone your fork**

   ```bash
   git clone https://github.com/YOUR_USERNAME/Leads-Funnel.git
   cd Leads-Funnel
   ```

3. **Add upstream remote**

   ```bash
   git remote add upstream https://github.com/Elumirae/Leads-Funnel.git
   ```

4. **Install dependencies**

   ```bash
   npm install
   ```

5. **Set up pre-commit hooks**

   ```bash
   npm run prepare
   ```

6. **Create environment files**

   ```bash
   cp apps/web/.env.example apps/web/.env.local
   cp apps/api/.env.example apps/api/.env
   cp backend/.env.example backend/.env
   ```

### Project Structure Overview

```
Leads-Funnel/
├── apps/
│   ├── web/           # Next.js frontend (TypeScript)
│   └── api/           # Node.js admin API (TypeScript)
├── backend/           # Swift/Vapor backend
├── infra/terraform/   # Infrastructure as Code
└── packages/shared/   # Shared TypeScript types
```

## Development Workflow

### Branch Naming Convention

Use descriptive branch names with prefixes:

| Prefix      | Purpose           | Example                           |
| ----------- | ----------------- | --------------------------------- |
| `feature/`  | New features      | `feature/voice-agent-integration` |
| `fix/`      | Bug fixes         | `fix/rate-limit-bypass`           |
| `bugfix/`   | Bug fixes (alias) | `bugfix/fix-rate-limiting`        |
| `docs/`     | Documentation     | `docs/api-reference`              |
| `refactor/` | Code refactoring  | `refactor/spam-detection`         |
| `test/`     | Test improvements | `test/validation-edge-cases`      |
| `chore/`    | Maintenance tasks | `chore/update-dependencies`       |

### Working on a Feature

1. **Sync with upstream**

   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Write code
   - Add tests
   - Update documentation

4. **Run checks locally**

   ```bash
   # Lint and format
   npm run lint
   npm run format:check

   # Type check
   npm run type-check

   # Run tests
   npm test
   ```

5. **Commit your changes**

   ```bash
   git add .
   git commit -m "feat: add voice agent integration"
   ```

6. **Push to your fork**

   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request**

   Go to GitHub and create a PR against the `main` branch.

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes

**Examples**:

```
feat(api): add rate limit headers to responses

fix(web): resolve form validation race condition

docs(readme): update deployment instructions

test(spam): add edge cases for gibberish detection
```

## Code Style Guidelines

### TypeScript/JavaScript

We use ESLint and Prettier for consistent code style.

**Key Rules**:

- ESLint configuration in `.eslintrc`
- Prettier for formatting
- Use TypeScript strict mode
- Use `const` by default, `let` when necessary
- Prefer arrow functions for callbacks
- Use explicit types for function parameters and returns
- Avoid `any` type when possible
- Use async/await over raw promises

**Example**:

```typescript
// Good
export async function submitLead(payload: LeadPayload): Promise<LeadResponse> {
  const normalizedEmail = payload.email.toLowerCase().trim();

  try {
    const response = await api.post('/lead', {
      ...payload,
      email: normalizedEmail,
    });
    return response.data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Unexpected error', 500);
  }
}

// Avoid
export function submitLead(payload: any) {
  return new Promise((resolve, reject) => {
    api
      .post('/lead', payload)
      .then((res) => resolve(res.data))
      .catch((err) => reject(err));
  });
}
```

### Swift

We use swift-format for Swift code formatting.

**Key Rules**:

- Follow Swift API Design Guidelines
- Use SwiftFormat for formatting
- Document public APIs with doc comments
- Use `let` by default, `var` when necessary
- Prefer `guard` for early exits
- Use meaningful variable names

**Example**:

```swift
// Good
/// Analyze a submission for spam indicators
/// - Parameters:
///   - email: Email address to check
///   - notes: Optional message content
/// - Returns: Spam analysis result
public func analyze(email: String, notes: String?) -> SpamResult {
    guard !email.isEmpty else {
        return SpamResult(isSpam: false, confidence: 0, reasons: [])
    }

    var reasons: [String] = []
    var totalScore: Double = 0.0

    if QuarantineLists.isDisposableEmail(email) {
        reasons.append("Disposable email domain")
        totalScore += DetectionWeights.disposableEmail
    }

    return SpamResult(
        isSpam: totalScore >= spamThreshold,
        confidence: normalizedScore,
        reasons: reasons
    )
}
```

### Terraform

**Key Rules**:

- Run `terraform fmt` before committing
- Use `terraform validate` to check syntax
- Follow module naming conventions
- Use consistent naming: `snake_case` for resources
- Group related resources in files
- Add descriptions to variables
- Use modules for reusable components

**Example**:

```hcl
# Good
variable "environment" {
  description = "Deployment environment (dev, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "Environment must be 'dev' or 'prod'."
  }
}

resource "aws_dynamodb_table" "leads" {
  name           = "kanjona-leads-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "pk"
  range_key      = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  tags = local.common_tags
}
```

### CSS/Styling

- Use Tailwind CSS utility classes
- Follow mobile-first responsive design
- Use CSS custom properties for theming

## Pull Request Process

### Before Submitting

1. **Self-review your code**
   - Check for typos and formatting
   - Remove debug code and comments
   - Ensure tests pass

2. **Update documentation**
   - Add/update JSDoc comments
   - Update README if needed
   - Add CHANGELOG entry for significant changes

3. **Run all checks**
   ```bash
   npm run lint
   npm run type-check
   npm test
   ```

### PR Template

When creating a PR, include:

```markdown
## Description

Brief description of the changes.

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## How Has This Been Tested?

Describe the tests you ran.

## Checklist

- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review
- [ ] I have added tests for my changes
- [ ] All new and existing tests pass
- [ ] I have updated documentation as needed
```

### Review Process

1. **Automated checks run**
   - Linting
   - Type checking
   - Tests
   - Build verification

2. **Code review**
   - At least one approval required
   - Security-sensitive changes require two approvals

3. **Merge**
   - Squash and merge preferred
   - Branch deleted after merge

### Addressing Feedback

- Respond to all comments
- Push additional commits to address feedback
- Request re-review when ready
- Be open to suggestions

## Testing Requirements

### Test Coverage Expectations

| Component       | Minimum Coverage |
| --------------- | ---------------- |
| Frontend        | 70%              |
| API             | 80%              |
| Backend         | 80%              |
| Shared packages | 90%              |

### Running Tests

**Frontend**:

```bash
cd apps/web
npm test
npm run lint
npx tsc --noEmit
```

**Backend**:

```bash
cd backend
swift test
```

**Infrastructure**:

```bash
cd infra/terraform
terraform fmt -check -recursive
terraform validate
```

### Writing Tests

**Frontend (Vitest + React Testing Library)**:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LeadForm } from './LeadForm';

describe('LeadForm', () => {
  it('validates email format', async () => {
    render(<LeadForm onSubmit={vi.fn()} />);

    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'invalid' } });
    fireEvent.blur(emailInput);

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
  });
});
```

**API (Vitest)**:

```typescript
import { describe, it, expect } from 'vitest';
import { analyzeLeadSecurity } from './security';

describe('analyzeLeadSecurity', () => {
  it('flags disposable email domains', () => {
    const result = analyzeLeadSecurity(
      { email: 'test@mailinator.com', name: 'Test' },
      '192.168.1.1',
      'test-salt',
      60
    );

    expect(result.suspicious).toBe(true);
    expect(result.reasons).toContain('disposable_email_domain');
  });
});
```

**Backend (Swift Testing)**:

```swift
import Testing
@testable import LeadCaptureAPI

struct SpamDetectorTests {
    let detector = SpamDetectorService()

    @Test func detectsDisposableEmail() {
        let result = detector.analyze(
            email: "test@mailinator.com",
            name: nil,
            company: nil,
            notes: nil,
            ip: nil,
            userAgent: nil
        )

        #expect(result.isSpam == true)
        #expect(result.reasons.contains("Disposable email domain"))
    }
}
```

## Documentation

### Code Documentation

- Add JSDoc comments to all public functions
- Include parameter descriptions and return types
- Add examples for complex functions

````typescript
/**
 * Submit a lead to the API
 *
 * @param payload - The lead data to submit
 * @returns Promise resolving to the API response
 * @throws {ApiError} When the API returns an error
 *
 * @example
 * ```typescript
 * const response = await submitLead({
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   source: 'real-estate'
 * });
 * ```
 */
export async function submitLead(payload: LeadPayload): Promise<LeadResponse> {
  // ...
}
````

### README Updates

Update relevant READMEs when:

- Adding new features
- Changing configuration
- Modifying setup steps
- Adding new dependencies

### CHANGELOG

Add entries to CHANGELOG.md for:

- New features
- Bug fixes
- Breaking changes
- Deprecations

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

## Issue Guidelines

### Creating Issues

**Bug Reports**:

- Clear title describing the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details (browser, OS, etc.)
- Screenshots if applicable

**Feature Requests**:

- Clear description of the feature
- Use case / problem it solves
- Proposed solution (optional)
- Alternatives considered

### Issue Labels

| Label              | Description                |
| ------------------ | -------------------------- |
| `bug`              | Something isn't working    |
| `enhancement`      | New feature request        |
| `documentation`    | Documentation improvements |
| `good first issue` | Good for newcomers         |
| `help wanted`      | Extra attention needed     |
| `security`         | Security-related issues    |
| `wontfix`          | Won't be addressed         |

## Security

- **Never commit secrets or credentials**
- Use environment variables for sensitive data
- Report security issues privately (see [SECURITY.md](./SECURITY.md))
- Use Secrets Manager in production

---

## Questions?

If you have questions about contributing:

1. Check existing issues and documentation
2. Open a discussion on GitHub
3. Reach out to the maintainers

Thank you for contributing to Kanjona!
