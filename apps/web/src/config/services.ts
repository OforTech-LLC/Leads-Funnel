/**
 * Service Funnel Configuration
 * 47 unique service funnels with colors, icons, and metadata
 */

export interface ServiceConfig {
  slug: string;
  icon: string;
  color: string;
  gradient: string;
  category: ServiceCategory;
}

export type ServiceCategory =
  | 'core'
  | 'home'
  | 'health'
  | 'legal'
  | 'business'
  | 'auto';

/**
 * All 47 service funnels
 */
export const services: ServiceConfig[] = [
  // CORE SERVICES (8)
  { slug: 'real-estate', icon: '🏡', color: '#1E3A5F', gradient: 'from-blue-900 to-blue-700', category: 'core' },
  { slug: 'life-insurance', icon: '🛡️', color: '#2563EB', gradient: 'from-blue-600 to-indigo-700', category: 'core' },
  { slug: 'construction', icon: '🏗️', color: '#EA580C', gradient: 'from-orange-600 to-amber-600', category: 'core' },
  { slug: 'moving', icon: '📦', color: '#F97316', gradient: 'from-orange-500 to-amber-500', category: 'core' },
  { slug: 'dentist', icon: '🦷', color: '#0D9488', gradient: 'from-teal-600 to-cyan-600', category: 'core' },
  { slug: 'plastic-surgeon', icon: '💎', color: '#D946EF', gradient: 'from-fuchsia-500 to-purple-600', category: 'core' },
  { slug: 'roofing', icon: '🏠', color: '#78716C', gradient: 'from-stone-600 to-stone-700', category: 'core' },
  { slug: 'cleaning', icon: '✨', color: '#A855F7', gradient: 'from-purple-500 to-violet-600', category: 'core' },

  // HOME SERVICES (19)
  { slug: 'hvac', icon: '❄️', color: '#06B6D4', gradient: 'from-cyan-500 to-blue-600', category: 'home' },
  { slug: 'plumbing', icon: '🔧', color: '#3B82F6', gradient: 'from-blue-500 to-blue-700', category: 'home' },
  { slug: 'electrician', icon: '⚡', color: '#EAB308', gradient: 'from-yellow-500 to-amber-600', category: 'home' },
  { slug: 'pest-control', icon: '🐜', color: '#65A30D', gradient: 'from-lime-600 to-green-700', category: 'home' },
  { slug: 'landscaping', icon: '🌿', color: '#22C55E', gradient: 'from-green-500 to-emerald-600', category: 'home' },
  { slug: 'pool-service', icon: '🏊', color: '#0EA5E9', gradient: 'from-sky-500 to-cyan-600', category: 'home' },
  { slug: 'home-remodeling', icon: '🔨', color: '#D97706', gradient: 'from-amber-600 to-orange-600', category: 'home' },
  { slug: 'solar', icon: '☀️', color: '#F59E0B', gradient: 'from-amber-500 to-orange-600', category: 'home' },
  { slug: 'locksmith', icon: '🔐', color: '#6B7280', gradient: 'from-gray-600 to-gray-700', category: 'home' },
  { slug: 'pressure-washing', icon: '💦', color: '#0891B2', gradient: 'from-cyan-600 to-blue-600', category: 'home' },
  { slug: 'water-damage-restoration', icon: '🌊', color: '#1D4ED8', gradient: 'from-blue-700 to-indigo-700', category: 'home' },
  { slug: 'mold-remediation', icon: '🦠', color: '#059669', gradient: 'from-emerald-600 to-teal-600', category: 'home' },
  { slug: 'flooring', icon: '🪵', color: '#92400E', gradient: 'from-amber-700 to-amber-900', category: 'home' },
  { slug: 'painting', icon: '🎨', color: '#EC4899', gradient: 'from-pink-500 to-rose-600', category: 'home' },
  { slug: 'windows-doors', icon: '🪟', color: '#0EA5E9', gradient: 'from-sky-500 to-blue-600', category: 'home' },
  { slug: 'fencing', icon: '🚧', color: '#78716C', gradient: 'from-stone-500 to-stone-700', category: 'home' },
  { slug: 'concrete', icon: '🧱', color: '#57534E', gradient: 'from-stone-600 to-stone-800', category: 'home' },
  { slug: 'junk-removal', icon: '🚛', color: '#84CC16', gradient: 'from-lime-500 to-green-600', category: 'home' },
  { slug: 'appliance-repair', icon: '🔌', color: '#6366F1', gradient: 'from-indigo-500 to-purple-600', category: 'home' },

  // HEALTH & BEAUTY (7)
  { slug: 'orthodontist', icon: '😁', color: '#14B8A6', gradient: 'from-teal-500 to-cyan-600', category: 'health' },
  { slug: 'dermatology', icon: '🩺', color: '#F472B6', gradient: 'from-pink-400 to-rose-500', category: 'health' },
  { slug: 'medspa', icon: '💆', color: '#D946EF', gradient: 'from-fuchsia-500 to-purple-600', category: 'health' },
  { slug: 'chiropractic', icon: '🦴', color: '#0891B2', gradient: 'from-cyan-600 to-teal-700', category: 'health' },
  { slug: 'physical-therapy', icon: '🏃', color: '#10B981', gradient: 'from-emerald-500 to-green-600', category: 'health' },
  { slug: 'hair-transplant', icon: '💇', color: '#8B5CF6', gradient: 'from-violet-500 to-purple-600', category: 'health' },
  { slug: 'cosmetic-dentistry', icon: '✨', color: '#06B6D4', gradient: 'from-cyan-500 to-teal-600', category: 'health' },

  // PROFESSIONAL & LEGAL (5)
  { slug: 'personal-injury-attorney', icon: '⚖️', color: '#18181B', gradient: 'from-gray-900 to-slate-800', category: 'legal' },
  { slug: 'immigration-attorney', icon: '🗽', color: '#1E3A8A', gradient: 'from-blue-800 to-indigo-900', category: 'legal' },
  { slug: 'criminal-defense-attorney', icon: '🛡️', color: '#7F1D1D', gradient: 'from-red-900 to-red-800', category: 'legal' },
  { slug: 'tax-accounting', icon: '📊', color: '#059669', gradient: 'from-emerald-600 to-teal-700', category: 'legal' },
  { slug: 'business-consulting', icon: '💼', color: '#4F46E5', gradient: 'from-indigo-600 to-purple-700', category: 'legal' },

  // BUSINESS SERVICES (4)
  { slug: 'commercial-cleaning', icon: '🧹', color: '#7C3AED', gradient: 'from-violet-600 to-purple-700', category: 'business' },
  { slug: 'security-systems', icon: '📹', color: '#DC2626', gradient: 'from-red-600 to-red-800', category: 'business' },
  { slug: 'it-services', icon: '💻', color: '#0EA5E9', gradient: 'from-sky-500 to-blue-600', category: 'business' },
  { slug: 'marketing-agency', icon: '📈', color: '#F97316', gradient: 'from-orange-500 to-red-600', category: 'business' },

  // AUTO SERVICES (4)
  { slug: 'auto-repair', icon: '🔩', color: '#EF4444', gradient: 'from-red-500 to-red-700', category: 'auto' },
  { slug: 'auto-detailing', icon: '🚙', color: '#3B82F6', gradient: 'from-blue-500 to-indigo-600', category: 'auto' },
  { slug: 'towing', icon: '🚚', color: '#F97316', gradient: 'from-orange-500 to-amber-600', category: 'auto' },
  { slug: 'auto-glass', icon: '🪟', color: '#06B6D4', gradient: 'from-cyan-500 to-blue-600', category: 'auto' },
];

/**
 * Get service by slug
 */
export function getServiceBySlug(slug: string): ServiceConfig | undefined {
  return services.find((s) => s.slug === slug);
}

/**
 * Get services by category
 */
export function getServicesByCategory(category: ServiceCategory): ServiceConfig[] {
  return services.filter((s) => s.category === category);
}

/**
 * All service slugs for static generation
 */
export function getAllServiceSlugs(): string[] {
  return services.map((s) => s.slug);
}

/**
 * Category metadata
 */
export const categoryMeta: Record<ServiceCategory, { name: string; icon: string; color: string }> = {
  core: { name: 'Core Services', icon: '⭐', color: '#1E3A5F' },
  home: { name: 'Home Services', icon: '🏠', color: '#3B82F6' },
  health: { name: 'Health & Beauty', icon: '❤️', color: '#0D9488' },
  legal: { name: 'Professional & Legal', icon: '⚖️', color: '#18181B' },
  business: { name: 'Business Services', icon: '💼', color: '#4F46E5' },
  auto: { name: 'Auto Services', icon: '🚗', color: '#EF4444' },
};

/**
 * Get all categories with their services count
 */
export function getCategoriesWithCounts(): Array<{ category: ServiceCategory; count: number; meta: (typeof categoryMeta)[ServiceCategory] }> {
  const categories = Object.keys(categoryMeta) as ServiceCategory[];
  return categories.map((category) => ({
    category,
    count: services.filter((s) => s.category === category).length,
    meta: categoryMeta[category],
  }));
}
