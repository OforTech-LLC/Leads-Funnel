/**
 * Localized Landing Page Configurations
 *
 * Returns service-specific content with translations based on locale.
 */

import { ServiceConfig } from '@/components/landing';
import { LandingPageConfig } from './landing-pages';

// Import translation files
import enMessages from '@/i18n/messages/en.json';
import esMessages from '@/i18n/messages/es.json';

type Locale = 'en' | 'es';

const messages: Record<Locale, typeof enMessages> = {
  en: enMessages,
  es: esMessages,
};

// =============================================================================
// Translation Types
// =============================================================================

/** Represents a translated benefit item */
interface TranslatedBenefitItem {
  title: string;
  description: string;
}

/** Represents a translated testimonial item */
interface TranslatedTestimonialItem {
  text: string;
  name: string;
  location: string;
}

/** Represents a translated FAQ item */
interface TranslatedFAQItem {
  question: string;
  answer: string;
}

/** Represents the structure of funnel-specific translations */
interface FunnelTranslations {
  meta?: {
    title?: string;
    description?: string;
  };
  hero?: {
    headline?: string;
    subheadline?: string;
  };
  benefits?: {
    title?: string;
    items?: TranslatedBenefitItem[];
  };
  testimonials?: {
    title?: string;
    items?: TranslatedTestimonialItem[];
  };
  faq?: {
    title?: string;
    items?: TranslatedFAQItem[];
  };
  cta?: {
    title?: string;
    subtitle?: string;
    button?: string;
  };
  form?: {
    title?: string;
    subtitle?: string;
  };
  trust?: {
    secure?: string;
    fast?: string;
    free?: string;
  };
}

// =============================================================================
// Service Base Configs (non-translatable: colors, icons, layout)
// =============================================================================

interface ServiceBaseConfig {
  gradient: string;
  accentColor: string;
  processVariant: 'horizontal' | 'timeline';
  testimonialsVariant: 'grid' | 'featured';
  benefitIcons: string[];
}

const serviceBaseConfigs: Record<string, ServiceBaseConfig> = {
  'real-estate': {
    gradient: 'linear-gradient(135deg, #1D4ED8, #3B82F6)',
    accentColor: '#3B82F6',
    processVariant: 'timeline',
    testimonialsVariant: 'featured',
    benefitIcons: ['Home', 'Search', 'FileCheck'],
  },
  solar: {
    gradient: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
    accentColor: '#F59E0B',
    processVariant: 'horizontal',
    testimonialsVariant: 'grid',
    benefitIcons: ['Sun', 'DollarSign', 'Leaf'],
  },
  hvac: {
    gradient: 'linear-gradient(135deg, #06B6D4, #22D3EE)',
    accentColor: '#06B6D4',
    processVariant: 'horizontal',
    testimonialsVariant: 'grid',
    benefitIcons: ['Wind', 'Thermometer', 'Shield'],
  },
  plumbing: {
    gradient: 'linear-gradient(135deg, #0EA5E9, #38BDF8)',
    accentColor: '#0EA5E9',
    processVariant: 'timeline',
    testimonialsVariant: 'grid',
    benefitIcons: ['Droplets', 'Wrench', 'Clock'],
  },
  roofing: {
    gradient: 'linear-gradient(135deg, #DC2626, #EF4444)',
    accentColor: '#DC2626',
    processVariant: 'horizontal',
    testimonialsVariant: 'featured',
    benefitIcons: ['Home', 'Shield', 'Award'],
  },
  electrician: {
    gradient: 'linear-gradient(135deg, #EAB308, #FACC15)',
    accentColor: '#EAB308',
    processVariant: 'horizontal',
    testimonialsVariant: 'grid',
    benefitIcons: ['Zap', 'Shield', 'Clock'],
  },
  'pest-control': {
    gradient: 'linear-gradient(135deg, #16A34A, #22C55E)',
    accentColor: '#16A34A',
    processVariant: 'timeline',
    testimonialsVariant: 'grid',
    benefitIcons: ['Bug', 'Shield', 'Home'],
  },
  dentist: {
    gradient: 'linear-gradient(135deg, #14B8A6, #2DD4BF)',
    accentColor: '#14B8A6',
    processVariant: 'horizontal',
    testimonialsVariant: 'featured',
    benefitIcons: ['Smile', 'Heart', 'Star'],
  },
  'personal-injury': {
    gradient: 'linear-gradient(135deg, #7C3AED, #8B5CF6)',
    accentColor: '#7C3AED',
    processVariant: 'timeline',
    testimonialsVariant: 'featured',
    benefitIcons: ['Scale', 'Shield', 'Award'],
  },
  'tax-services': {
    gradient: 'linear-gradient(135deg, #059669, #10B981)',
    accentColor: '#059669',
    processVariant: 'horizontal',
    testimonialsVariant: 'grid',
    benefitIcons: ['Calculator', 'FileText', 'DollarSign'],
  },
  'life-insurance': {
    gradient: 'linear-gradient(135deg, #6366F1, #818CF8)',
    accentColor: '#6366F1',
    processVariant: 'timeline',
    testimonialsVariant: 'featured',
    benefitIcons: ['Shield', 'Heart', 'Users'],
  },
  construction: {
    gradient: 'linear-gradient(135deg, #D97706, #F59E0B)',
    accentColor: '#D97706',
    processVariant: 'timeline',
    testimonialsVariant: 'grid',
    benefitIcons: ['Hammer', 'HardHat', 'Building'],
  },
};

// Default config for services without specific base config
const defaultBaseConfig: ServiceBaseConfig = {
  gradient: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
  accentColor: '#8B5CF6',
  processVariant: 'horizontal',
  testimonialsVariant: 'grid',
  benefitIcons: ['Star', 'Shield', 'Check'],
};

// =============================================================================
// Common Form Fields (with translations)
// =============================================================================

function getBaseFormFields(locale: Locale) {
  const t = messages[locale].form;
  return [
    {
      name: 'name',
      label: t.name.label,
      type: 'text' as const,
      required: true,
      placeholder: t.name.placeholder,
    },
    {
      name: 'email',
      label: t.email.label,
      type: 'email' as const,
      required: true,
      placeholder: t.email.placeholder,
    },
    {
      name: 'phone',
      label: t.phone.label,
      type: 'tel' as const,
      required: false,
      placeholder: t.phone.placeholder,
    },
    {
      name: 'message',
      label: t.message.label,
      type: 'textarea' as const,
      required: false,
      placeholder: t.message.placeholder,
    },
  ];
}

// =============================================================================
// Get Localized Config
// =============================================================================

/**
 * Retrieves a localized landing page configuration for a specific service.
 *
 * @param serviceId - The unique identifier for the service (e.g., 'real-estate', 'solar')
 * @param locale - The locale code ('en' or 'es')
 * @returns The complete landing page configuration with translated content, or null if no translations exist
 */
export function getLocalizedLandingPageConfig(
  serviceId: string,
  locale: Locale
): LandingPageConfig | null {
  const t = messages[locale];
  const funnelTranslations = (t.funnels as Record<string, FunnelTranslations>)?.[serviceId];

  if (!funnelTranslations) {
    console.warn(`No translations found for service: ${serviceId}, locale: ${locale}`);
    return null;
  }

  const baseConfig = serviceBaseConfigs[serviceId] || defaultBaseConfig;

  // Build the localized config
  const config: LandingPageConfig = {
    service: {
      id: serviceId,
      name: funnelTranslations.meta?.title?.split('|')[0]?.trim() || serviceId,
      tagline: funnelTranslations.hero?.subheadline || '',
      description: funnelTranslations.meta?.description || '',
      ctaText: funnelTranslations.cta?.button || t.form.submit,
      phone: '(800) 555-0199',
      gradient: baseConfig.gradient,
      accentColor: baseConfig.accentColor,
    },
    hero: {
      badge:
        funnelTranslations.trust?.fast || (locale === 'es' ? 'Respuesta Rápida' : 'Fast Response'),
      headline: funnelTranslations.hero?.headline || '',
      subheadline: funnelTranslations.hero?.subheadline || '',
      description: funnelTranslations.meta?.description || '',
      primaryCta: funnelTranslations.cta?.button || t.form.submit,
      secondaryCta: locale === 'es' ? 'Llamar Ahora' : 'Call Now',
      stats: [
        { value: '500+', label: locale === 'es' ? 'Clientes Satisfechos' : 'Happy Clients' },
        { value: '4.9', label: locale === 'es' ? 'Calificación Promedio' : 'Average Rating' },
        { value: '24/7', label: locale === 'es' ? 'Soporte' : 'Support' },
      ],
    },
    benefits: {
      title:
        funnelTranslations.benefits?.title ||
        (locale === 'es' ? '¿Por Qué Elegirnos?' : 'Why Choose Us?'),
      subtitle:
        locale === 'es'
          ? 'Descubre los beneficios de trabajar con nosotros'
          : 'Discover the benefits of working with us',
      items: (funnelTranslations.benefits?.items || []).map(
        (item: TranslatedBenefitItem, index: number) => ({
          icon: baseConfig.benefitIcons[index] || 'Star',
          title: item.title || '',
          description: item.description || '',
        })
      ),
    },
    process: {
      title: locale === 'es' ? '¿Cómo Funciona?' : 'How It Works',
      subtitle:
        locale === 'es'
          ? 'Simple y fácil en solo unos pasos'
          : 'Simple and easy in just a few steps',
      steps: [
        {
          number: 1,
          title: locale === 'es' ? 'Contáctanos' : 'Contact Us',
          description:
            locale === 'es'
              ? 'Completa el formulario o llámanos'
              : 'Fill out the form or give us a call',
        },
        {
          number: 2,
          title: locale === 'es' ? 'Consulta Gratis' : 'Free Consultation',
          description: locale === 'es' ? 'Discutimos tus necesidades' : 'We discuss your needs',
        },
        {
          number: 3,
          title: locale === 'es' ? 'Obtén Resultados' : 'Get Results',
          description:
            locale === 'es' ? 'Comenzamos a trabajar para ti' : 'We start working for you',
        },
      ],
      variant: baseConfig.processVariant,
    },
    testimonials: {
      title:
        funnelTranslations.testimonials?.title ||
        (locale === 'es' ? 'Lo Que Dicen Nuestros Clientes' : 'What Our Clients Say'),
      subtitle:
        locale === 'es'
          ? 'Historias reales de clientes satisfechos'
          : 'Real stories from satisfied clients',
      items: (funnelTranslations.testimonials?.items || []).map(
        (item: TranslatedTestimonialItem) => ({
          quote: item.text || '',
          author: item.name || '',
          role: item.location || '',
          rating: 5,
        })
      ),
      variant: baseConfig.testimonialsVariant,
    },
    faq: {
      title:
        funnelTranslations.faq?.title ||
        (locale === 'es' ? 'Preguntas Frecuentes' : 'Frequently Asked Questions'),
      subtitle:
        locale === 'es'
          ? 'Encuentra respuestas a preguntas comunes'
          : 'Find answers to common questions',
      items: (funnelTranslations.faq?.items || []).map((item: TranslatedFAQItem) => ({
        question: item.question || '',
        answer: item.answer || '',
      })),
    },
    form: {
      title: funnelTranslations.form?.title || t.form.title,
      subtitle: funnelTranslations.form?.subtitle || t.form.subtitle,
      fields: getBaseFormFields(locale),
      submitText: funnelTranslations.cta?.button || t.form.submit,
    },
    seo: {
      title: funnelTranslations.meta?.title || '',
      description: funnelTranslations.meta?.description || '',
      keywords: [],
    },
  };

  return config;
}

/**
 * Returns a list of all available service IDs from the translation files.
 *
 * @returns Array of service ID strings that have funnel translations defined
 */
export function getAvailableServiceIds(): string[] {
  // Get all funnel keys from English translations
  return Object.keys(enMessages.funnels || {});
}
