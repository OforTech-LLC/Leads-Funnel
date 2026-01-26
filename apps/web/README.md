# Kanjona Frontend

Next.js 15 frontend application for the multi-funnel lead generation platform.

## Features

- **47 Service Funnel Pages**: Each with unique branding and content
- **Internationalization**: Full EN/ES support via next-intl
- **Animations**: Framer Motion for smooth interactions
- **Mobile-First**: Responsive design optimized for all devices
- **Static Export**: Pre-rendered pages for CloudFront/S3 deployment
- **Redux**: State management for lead form submissions

## Directory Structure

```
src/
├── app/                        # Next.js App Router
│   ├── [locale]/               # Locale-based routing
│   │   ├── [service]/          # Dynamic funnel pages
│   │   │   └── page.tsx        # Funnel page component
│   │   └── page.tsx            # Home page
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
│   └── LeadForm.tsx            # Main lead form component
│
├── config/
│   └── services.ts             # 47 service configurations
│
├── i18n/
│   ├── messages/
│   │   ├── en.json             # English translations
│   │   └── es.json             # Spanish translations
│   └── request.ts              # next-intl configuration
│
├── lib/
│   ├── api.ts                  # API client for lead submission
│   ├── animations.ts           # Animation utilities
│   ├── design-tokens.ts        # Design system tokens
│   ├── utm.ts                  # UTM parameter tracking
│   └── validators.ts           # Form validation
│
└── store/
    ├── hooks.ts                # Typed Redux hooks
    ├── index.ts                # Store configuration
    └── leadSlice.ts            # Lead form state slice
```

## Development

```bash
# Install dependencies (from root)
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

## Environment Variables

```env
# API endpoint
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080

# Analytics (optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

## Adding a New Funnel

1. Add service config to `src/config/services.ts`
2. Add translations to `src/i18n/messages/en.json` and `es.json`
3. The page is automatically generated via dynamic routing

## Build Output

The build generates static HTML files in the `out/` directory:
- `/en/` - English pages
- `/es/` - Spanish pages
- Each service gets its own page (e.g., `/en/real-estate/`)
