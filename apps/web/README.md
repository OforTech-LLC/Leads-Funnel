# Kanjona Frontend

Next.js 15 frontend application for the Kanjona multi-funnel lead generation platform.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Directory Structure](#directory-structure)
- [Getting Started](#getting-started)
- [Components](#components)
- [State Management](#state-management)
- [Internationalization](#internationalization)
- [Styling](#styling)
- [SEO](#seo)
- [Build and Deployment](#build-and-deployment)
- [Adding a New Funnel](#adding-a-new-funnel)

## Overview

The Kanjona frontend is a statically-exported Next.js 15 application that provides 47 unique service
funnel landing pages with full bilingual support (English/Spanish).

### Key Features

- **47 Service Funnel Pages**: Each with unique branding and content
- **Internationalization**: Full EN/ES support via next-intl
- **Animations**: Framer Motion for smooth interactions
- **Mobile-First**: Responsive design optimized for all devices
- **Static Export**: Pre-rendered pages for CloudFront/S3 deployment
- **Redux**: State management for lead form submissions
- **SEO Optimized**: Dynamic metadata, JSON-LD, and sitemap

### Technology Stack

| Category   | Technology              |
| ---------- | ----------------------- |
| Framework  | Next.js 15 (App Router) |
| Language   | TypeScript              |
| UI Library | React 19                |
| Animations | Framer Motion           |
| State      | Redux Toolkit           |
| Styling    | Tailwind CSS            |
| i18n       | next-intl               |
| Forms      | React Hook Form + Zod   |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         App Router                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [locale]/                                                │   │
│  │  ├── page.tsx           (Home page)                      │   │
│  │  └── [service]/         (Dynamic funnel pages)           │   │
│  │      └── page.tsx       (Funnel page component)          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Components                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │  Funnel       │  │  Animations   │  │  Common       │       │
│  │  Components   │  │  Components   │  │  Components   │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Services                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │  API Client   │  │  Config       │  │  Validators   │       │
│  │  (lib/api.ts) │  │  (services.ts)│  │  (lib/)       │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     State Management                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Redux Store                                              │   │
│  │  └── leadSlice (form state, submission status)           │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
src/
├── app/                        # Next.js App Router
│   ├── [locale]/               # Locale-based routing
│   │   ├── [service]/          # Dynamic funnel pages
│   │   │   └── page.tsx        # Funnel page component
│   │   ├── page.tsx            # Home page
│   │   ├── layout.tsx          # Root layout
│   │   └── StoreProvider.tsx   # Redux provider
│   ├── robots.ts               # SEO robots.txt
│   └── sitemap.ts              # SEO sitemap
│
├── components/
│   ├── animations/             # Reusable animation components
│   │   ├── CardTilt.tsx        # 3D tilt effect on hover
│   │   ├── FadeIn.tsx          # Fade in on scroll
│   │   ├── FloatingElements.tsx # Background floating shapes
│   │   ├── GradientMesh.tsx    # Animated gradient background
│   │   ├── LoadingSpinner.tsx  # Form submission spinner
│   │   ├── MagneticButton.tsx  # Magnetic cursor effect
│   │   ├── StaggerChildren.tsx # Staggered child animations
│   │   └── SuccessAnimation.tsx # Form success animation
│   │
│   ├── funnel/                 # Funnel page sections
│   │   ├── FunnelHero.tsx      # Hero section with CTA
│   │   ├── FunnelBenefits.tsx  # Benefits/features grid
│   │   ├── FunnelForm.tsx      # Lead capture form
│   │   ├── FunnelTestimonials.tsx # Social proof section
│   │   └── FunnelFAQ.tsx       # FAQ accordion
│   │
│   ├── LeadForm.tsx            # Main lead form component
│   └── LanguageSwitcher.tsx    # Language toggle component
│
├── config/
│   └── services.ts             # 47 service configurations
│
├── i18n/
│   ├── messages/
│   │   ├── en.json             # English translations
│   │   └── es.json             # Spanish translations
│   ├── request.ts              # next-intl configuration
│   ├── routing.ts              # Locale routing config
│   └── navigation.ts           # Navigation utilities
│
├── lib/
│   ├── api.ts                  # API client for lead submission
│   ├── animations.ts           # Animation utilities
│   ├── design-tokens.ts        # Design system tokens
│   ├── utm.ts                  # UTM parameter tracking
│   └── validators.ts           # Form validation schemas
│
├── seo/
│   ├── keywords.ts             # SEO keywords per service
│   ├── metadata.ts             # Dynamic metadata generation
│   └── jsonld.ts               # JSON-LD structured data
│
└── store/
    ├── hooks.ts                # Typed Redux hooks
    ├── index.ts                # Store configuration
    └── leadSlice.ts            # Lead form state slice
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
# From project root
npm install

# Or from apps/web directory
cd apps/web
npm install
```

### Development

```bash
# Start development server
npm run dev

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Format
npm run format
```

### Environment Variables

Create `.env.local`:

```env
# API endpoint
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080

# Analytics (optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Feature flags (optional)
NEXT_PUBLIC_ENABLE_VOICE_AGENT=false
```

## Components

### Animation Components

Located in `src/components/animations/`:

| Component          | Description                  | Props                                        |
| ------------------ | ---------------------------- | -------------------------------------------- |
| `CardTilt`         | 3D tilt effect on hover      | `children`, `className`, `tiltAmount`        |
| `FadeIn`           | Fade in on scroll            | `children`, `delay`, `duration`, `direction` |
| `FloatingElements` | Background floating shapes   | `count`, `colors`                            |
| `GradientMesh`     | Animated gradient background | `colors`, `speed`                            |
| `LoadingSpinner`   | Form submission spinner      | `size`, `color`                              |
| `MagneticButton`   | Magnetic cursor effect       | `children`, `strength`                       |
| `StaggerChildren`  | Staggered child animations   | `children`, `staggerDelay`                   |
| `SuccessAnimation` | Form success animation       | `onComplete`                                 |

**Example Usage**:

```tsx
import { FadeIn } from '@/components/animations/FadeIn';
import { CardTilt } from '@/components/animations/CardTilt';

function FeatureCard() {
  return (
    <FadeIn delay={0.2} direction="up">
      <CardTilt tiltAmount={10}>
        <div className="p-6 bg-white rounded-xl shadow-lg">
          <h3>Feature Title</h3>
          <p>Feature description...</p>
        </div>
      </CardTilt>
    </FadeIn>
  );
}
```

### Funnel Components

Located in `src/components/funnel/`:

| Component            | Description                                      |
| -------------------- | ------------------------------------------------ |
| `FunnelHero`         | Hero section with headline, subheadline, and CTA |
| `FunnelBenefits`     | Grid of service benefits with icons              |
| `FunnelForm`         | Lead capture form with validation                |
| `FunnelTestimonials` | Customer testimonials carousel                   |
| `FunnelFAQ`          | Frequently asked questions accordion             |

**Page Composition**:

```tsx
// Example funnel page structure
function FunnelPage({ service, locale }) {
  return (
    <>
      <FunnelHero service={service} locale={locale} />
      <FunnelBenefits service={service} locale={locale} />
      <FunnelTestimonials service={service} locale={locale} />
      <FunnelForm service={service} locale={locale} />
      <FunnelFAQ service={service} locale={locale} />
    </>
  );
}
```

## State Management

### Redux Store

The application uses Redux Toolkit for state management.

**Store Configuration** (`src/store/index.ts`):

```typescript
import { configureStore } from '@reduxjs/toolkit';
import leadReducer from './leadSlice';

export const store = configureStore({
  reducer: {
    lead: leadReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Lead Slice

Manages form state and submission status (`src/store/leadSlice.ts`):

```typescript
interface LeadState {
  formData: {
    name: string;
    email: string;
    phone: string;
    message: string;
  };
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  leadId: string | null;
}
```

**Actions**:

- `setFormData`: Update form fields
- `submitLead`: Async thunk for API submission
- `resetForm`: Clear form state

**Usage**:

```typescript
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { submitLead, setFormData } from '@/store/leadSlice';

function LeadForm() {
  const dispatch = useAppDispatch();
  const { status, error } = useAppSelector((state) => state.lead);

  const handleSubmit = async (data) => {
    await dispatch(submitLead(data));
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

## Internationalization

### Configuration

The app uses next-intl for internationalization with two locales:

- `en` - English (default)
- `es` - Spanish

**Locale Routing** (`src/i18n/routing.ts`):

```typescript
export const locales = ['en', 'es'] as const;
export const defaultLocale = 'en';
```

### Translation Files

Located in `src/i18n/messages/`:

**Structure**:

```json
{
  "common": {
    "submit": "Submit",
    "loading": "Loading...",
    "success": "Success!"
  },
  "real-estate": {
    "hero": {
      "headline": "Find Your Dream Home",
      "subheadline": "Expert real estate agents ready to help"
    },
    "benefits": {
      "title": "Why Choose Us",
      "items": [...]
    },
    "form": {
      "title": "Get a Free Consultation"
    }
  }
}
```

**Usage in Components**:

```typescript
import { useTranslations } from 'next-intl';

function HeroSection({ service }) {
  const t = useTranslations(service);

  return (
    <div>
      <h1>{t('hero.headline')}</h1>
      <p>{t('hero.subheadline')}</p>
    </div>
  );
}
```

### Language Switcher

```tsx
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

// In header/navigation
<LanguageSwitcher />;
```

## Styling

### Tailwind CSS

The project uses Tailwind CSS with a custom configuration.

**Design Tokens** (`src/lib/design-tokens.ts`):

```typescript
export const colors = {
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    // ...
    900: '#0c4a6e',
  },
  // Per-service colors
  services: {
    'real-estate': '#2563eb',
    'life-insurance': '#7c3aed',
    // ...
  },
};

export const gradients = {
  'real-estate': 'from-blue-500 to-blue-700',
  'life-insurance': 'from-violet-500 to-purple-700',
  // ...
};
```

**Responsive Breakpoints**:

```css
/* Mobile first */
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

### Service Theming

Each service has its own color scheme:

```tsx
// Dynamic gradient based on service
<div className={`bg-gradient-to-r ${service.gradient}`}>
  {/* Content */}
</div>

// Dynamic accent color
<button style={{ backgroundColor: service.color }}>
  Get Started
</button>
```

## SEO

### Dynamic Metadata

Generated per page (`src/seo/metadata.ts`):

```typescript
export function generateFunnelMetadata(service: string, locale: string) {
  return {
    title: `${service.name} Services | Kanjona`,
    description: `Professional ${service.name} services...`,
    keywords: getKeywords(service, locale),
    openGraph: {
      title: `${service.name} Services`,
      description: `...`,
      images: [`/og/${service.slug}.png`],
    },
  };
}
```

### JSON-LD Structured Data

Generated for rich snippets (`src/seo/jsonld.ts`):

```typescript
export function generateServiceJsonLd(service: string, locale: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    description: '...',
    provider: {
      '@type': 'Organization',
      name: 'Kanjona',
    },
  };
}
```

### Sitemap

Auto-generated for all pages (`src/app/sitemap.ts`):

```
https://kanjona.com/en/
https://kanjona.com/es/
https://kanjona.com/en/real-estate
https://kanjona.com/es/real-estate
...
```

## Build and Deployment

### Build Commands

```bash
# Development build
npm run dev

# Production build
npm run build

# Analyze bundle
npm run analyze
```

### Build Output

The build generates static HTML files in the `out/` directory:

```
out/
├── en/
│   ├── index.html
│   ├── real-estate/
│   │   └── index.html
│   ├── life-insurance/
│   │   └── index.html
│   └── ... (47 services)
├── es/
│   ├── index.html
│   ├── real-estate/
│   │   └── index.html
│   └── ...
├── _next/
│   ├── static/
│   └── ...
└── sitemap.xml
```

### Deployment

The static export is deployed to:

1. **S3**: Static file hosting
2. **CloudFront**: CDN distribution with custom domain

Deployment is automated via GitHub Actions.

## Adding a New Funnel

### 1. Add Service Configuration

Edit `src/config/services.ts`:

```typescript
export const services = [
  // ... existing services
  {
    slug: 'new-service',
    name: 'New Service',
    icon: '🆕',
    color: '#FF5733',
    gradient: 'from-orange-500 to-red-600',
    category: 'business',
  },
];
```

### 2. Add Translations

Edit `src/i18n/messages/en.json`:

```json
{
  "new-service": {
    "hero": {
      "headline": "Professional New Service",
      "subheadline": "Expert solutions for your needs"
    },
    "benefits": {
      "title": "Why Choose Us",
      "items": [
        {
          "title": "Benefit 1",
          "description": "Description..."
        }
      ]
    },
    "testimonials": { ... },
    "faq": { ... },
    "form": {
      "title": "Get a Free Quote"
    }
  }
}
```

Repeat for `es.json` with Spanish translations.

### 3. Add SEO Keywords (Optional)

Edit `src/seo/keywords.ts`:

```typescript
export const keywords = {
  // ... existing
  'new-service': {
    en: ['new service', 'professional help', ...],
    es: ['nuevo servicio', 'ayuda profesional', ...],
  },
};
```

### 4. Verify Build

```bash
npm run build
# Check out/en/new-service/index.html exists
```

### 5. Update Terraform (If Needed)

Add to `infra/terraform/shared/funnels.tf`:

```hcl
locals {
  funnel_ids = [
    "new-service",
    // ... existing
  ]
}
```

---

## Troubleshooting

### Common Issues

**Build fails with translation error**:

- Ensure all service keys exist in both `en.json` and `es.json`
- Check for JSON syntax errors

**Animations not working**:

- Verify Framer Motion is properly imported
- Check for hydration mismatches

**API submission fails**:

- Verify `NEXT_PUBLIC_API_BASE_URL` is set correctly
- Check CORS configuration in backend

### Performance Tips

- Use `next/image` for optimized images
- Lazy load below-the-fold components
- Minimize client-side JavaScript

---

For more information, see the [main README](../../README.md).
