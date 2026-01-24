/**
 * SEO Keywords for lead generation landing pages
 * Used in meta tags, content, and structured data
 */

// Primary keywords - highest search volume and relevance
export const primaryKeywords = [
  'lead generation',
  'get more leads',
  'sales leads',
  'qualified leads',
] as const;

// Secondary keywords - supporting terms
export const secondaryKeywords = [
  'appointment booking',
  'marketing funnel',
  'local leads',
  'customer acquisition',
  'conversion optimization',
] as const;

// Industry-specific keywords
export const industryKeywords = [
  'real estate leads',
  'home service leads',
  'contractor leads',
  'business leads',
] as const;

// Action-oriented keywords
export const actionKeywords = [
  'call booking',
  'online lead capture',
  'business growth',
  'generate leads',
] as const;

// Long-tail keywords for specific targeting
export const longTailKeywords = [
  'how to get more qualified leads',
  'best lead generation funnel',
  'capture leads online',
  'convert visitors to customers',
  'local business lead generation',
] as const;

// All keywords combined for meta tags
export const allKeywords = [
  ...primaryKeywords,
  ...secondaryKeywords,
  ...industryKeywords,
  ...actionKeywords,
] as const;

// Spanish keywords
export const spanishKeywords = [
  'generacion de leads',
  'obtener mas prospectos',
  'leads de ventas',
  'leads calificados',
  'embudo de marketing',
  'adquisicion de clientes',
  'leads inmobiliarios',
  'leads de servicios',
] as const;

/**
 * Get keywords based on locale
 */
export function getKeywordsByLocale(locale: 'en' | 'es'): readonly string[] {
  return locale === 'es' ? spanishKeywords : allKeywords;
}
