# Changelog

All notable changes to the Kanjona platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-01-27

### Security

- Fixed cursor pagination HMAC timing attack with `timingSafeEqual`
- HMAC-signed pagination cursors applied to all 8 database modules
- Admin auth fail-closed when SSM allowlist unavailable
- CORS origin allowlist (fail-closed in production)
- OAuth state parameter protection on all three apps
- SameSite=lax cookies for OAuth compatibility
- Admin login error allowlist (prevents content injection)
- Export download authorization check
- Note length and count limits prevent DynamoDB abuse
- Audit logs no longer store raw PII
- Portal CSP headers added
- Download URL validation before window.open

### Changed

- Upgraded Node.js to 22 across all Lambda runtimes, CI/CD, and TypeScript targets
- Backend modularity refactor: centralized AWS clients, shared cursor module, structured logging,
  typed error classes
- Frontend coupling fixes: unified LeadStatus types via @kanjona/shared, consistent API clients and
  auth patterns
- Terraform modularity: safe `try()` index access, explicit `depends_on`, variable validation,
  parameterized subdomains

### Fixed

- Admin Cognito MFA enforced (was OPTIONAL)
- custom:role removed from client write_attributes
- API Gateway JWT authorizer added to admin routes
- SES/SNS permissions scoped to specific ARNs
- Export rate limit race condition (atomic DynamoDB throttle)
- Notification dedup race condition (conditional write lock)
- XSS sanitization uses HTML entity encoding (not blocklist)

---

## [1.0.0] - 2026-01-26

### Overview

Initial production release of the Kanjona multi-funnel lead generation platform with comprehensive
security hardening, 47 service verticals, and full infrastructure automation.

### Added

#### Frontend

- **47 Service Funnel Pages**: Complete landing pages for all service verticals
- **Bilingual Support**: Full English and Spanish internationalization via next-intl
- **Animation System**: Framer Motion components for smooth interactions
  - CardTilt: 3D tilt effect on hover
  - FadeIn: Scroll-triggered fade animations
  - FloatingElements: Background floating shapes
  - GradientMesh: Animated gradient backgrounds
  - MagneticButton: Magnetic cursor effect
  - StaggerChildren: Staggered child animations
  - SuccessAnimation: Form submission success
- **State Management**: Redux Toolkit for lead form state
- **SEO Optimization**: Dynamic metadata, robots.txt, and sitemap generation
- **Static Export**: Pre-rendered pages for CloudFront/S3 deployment
- **Responsive Design**: Mobile-first approach with Tailwind CSS

#### Backend (Swift/Vapor)

- **Lead Capture API**: High-performance lead submission endpoint
- **Rate Limiting**: 5 requests per minute per IP per funnel with sliding window
- **Spam Detection**: Multi-layered detection system
  - Disposable email domain detection
  - Suspicious TLD filtering
  - Spam keyword pattern matching
  - Test email pattern detection
  - Honeypot field support
  - User agent analysis
  - Gibberish content detection
  - Excessive link detection
  - Rapid submission velocity checks
- **Idempotency Support**: Prevents duplicate lead submissions
- **Validation Service**: Comprehensive input validation and sanitization
- **Security Headers Middleware**: Full HTTP security headers
- **CORS Middleware**: Strict origin validation
- **Error Handling**: Structured error responses with proper HTTP status codes

#### Admin API (Node.js/TypeScript)

- **Cognito Authentication**: Secure admin access via AWS Cognito
- **Lead Management**: CRUD operations for lead data
- **GDPR Compliance**: Data export and deletion capabilities
- **Audit Logging**: Track admin actions for compliance
- **Data Retention**: Automated retention policy enforcement

#### Infrastructure (Terraform)

- **Multi-Environment Support**: Separate dev and prod configurations
- **Modular Architecture**: 20+ reusable Terraform modules
  - ACM (SSL certificates)
  - Admin API Gateway
  - Admin Cognito
  - Admin Exports
  - Admin SSM
  - API Gateway
  - CloudTrail
  - DNS (Route 53)
  - DynamoDB
  - EventBridge
  - Lambda
  - Monitoring
  - Secrets Manager
  - SES (Email)
  - SSM Parameter Store
  - Static Site (CloudFront + S3)
  - Synthetics (Canary monitoring)
  - VPC
  - WAF
- **Feature Flags**: SSM Parameter Store-based configuration
- **Secrets Management**: AWS Secrets Manager integration
- **Monitoring**: CloudWatch dashboards, alarms, and metrics

#### CI/CD

- **GitHub Actions Workflows**: Automated testing and deployment
- **Pre-commit Hooks**: Husky + lint-staged for code quality
- **Multi-stage Pipelines**: Build, test, and deploy stages
- **Feature Flag Configuration**: Workflow for toggling features

### Security

#### Defense in Depth

- **WAF Protection**: AWS WAF with OWASP Core Rule Set (production)
- **Rate Limiting**: IP-based with per-funnel isolation
- **Honeypot Fields**: Silent bot detection with fake success responses
- **Spam Scoring**: Weighted scoring system with configurable thresholds

#### Data Protection

- **PII Hashing**: Sensitive data hashed before logging
- **IP Anonymization**: GDPR-compliant IP address handling
- **Encryption**: TLS 1.2+ in transit, AES-256 at rest
- **Secure Logging**: SecureLogger utility prevents PII leakage

#### HTTP Security

- **X-Frame-Options**: DENY (prevent clickjacking)
- **X-Content-Type-Options**: nosniff (prevent MIME sniffing)
- **X-XSS-Protection**: 1; mode=block (legacy XSS protection)
- **Content-Security-Policy**: Restrictive default policy
- **Referrer-Policy**: strict-origin-when-cross-origin
- **Permissions-Policy**: Disable unnecessary browser features
- **Strict-Transport-Security**: HSTS enforcement (production)
- **Cache-Control**: no-store, private for API responses

#### Authentication

- **API Key Authentication**: Optional machine-to-machine access
- **Cognito Integration**: JWT-based admin authentication
- **Minimal IAM Permissions**: Least-privilege principle

### Documentation

- **README.md**: Comprehensive project documentation
- **SECURITY.md**: Security features and vulnerability reporting
- **CONTRIBUTING.md**: Contribution guidelines and code style
- **CHANGELOG.md**: Release history (this file)
- **apps/web/README.md**: Frontend documentation
- **apps/api/README.md**: Admin API documentation

### Service Categories

#### Core Services (8)

- Real Estate
- Life Insurance
- Construction
- Moving
- Dentist
- Plastic Surgeon
- Roofing
- Cleaning

#### Home Services (19)

- HVAC
- Plumbing
- Electrician
- Pest Control
- Landscaping
- Pool Service
- Home Remodeling
- Solar
- Locksmith
- Pressure Washing
- Water Damage Restoration
- Mold Remediation
- Flooring
- Painting
- Windows & Doors
- Fencing
- Concrete
- Junk Removal
- Appliance Repair

#### Health & Beauty (7)

- Orthodontist
- Dermatology
- MedSpa
- Chiropractic
- Physical Therapy
- Hair Transplant
- Cosmetic Dentistry

#### Professional & Legal (5)

- Personal Injury Attorney
- Immigration Attorney
- Criminal Defense Attorney
- Tax & Accounting
- Business Consulting

#### Business Services (4)

- Commercial Cleaning
- Security Systems
- IT Services
- Marketing Agency

#### Auto Services (4)

- Auto Repair
- Auto Detailing
- Towing
- Auto Glass

### Technical Stack

| Component      | Technology                       |
| -------------- | -------------------------------- |
| Frontend       | Next.js 15, React 19, TypeScript |
| Animations     | Framer Motion                    |
| State          | Redux Toolkit                    |
| i18n           | next-intl                        |
| Backend        | Swift 5.10, Vapor                |
| Admin API      | Node.js 22, TypeScript           |
| Database       | DynamoDB                         |
| Events         | EventBridge                      |
| Infrastructure | Terraform 1.7+                   |
| CI/CD          | GitHub Actions                   |
| CDN            | CloudFront                       |
| Auth           | Cognito                          |
| Security       | WAF, Secrets Manager             |

---

## Version History Summary

| Version | Date       | Highlights                                         |
| ------- | ---------- | -------------------------------------------------- |
| 1.0.0   | 2026-01-26 | Initial production release with security hardening |

---

## Migration Notes

### Upgrading to 1.0.0

This is the initial release. No migration required.

### Breaking Changes

None (initial release).

---

## Contributors

- Development Team
- Security Review Team
- Infrastructure Team

---

For detailed information about specific changes, see the commit history on GitHub.
