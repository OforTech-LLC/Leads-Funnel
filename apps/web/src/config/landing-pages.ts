/**
 * Landing Page Configurations
 *
 * Service-specific content and configuration for landing pages.
 * Each service has unique copy, benefits, process steps, FAQs, and styling.
 */

import { ServiceConfig } from '@/components/landing';

// =============================================================================
// Types
// =============================================================================

interface Benefit {
  icon: string; // Lucide icon name
  title: string;
  description: string;
}

interface ProcessStep {
  number: number;
  title: string;
  description: string;
}

interface FAQ {
  question: string;
  answer: string;
}

interface Testimonial {
  quote: string;
  author: string;
  role?: string;
  rating: number;
}

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select';
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export interface LandingPageConfig {
  service: ServiceConfig;
  hero: {
    badge?: string;
    headline: string;
    subheadline?: string;
    description: string;
    primaryCta: string;
    secondaryCta?: string;
    stats?: Array<{ value: string; label: string }>;
  };
  benefits: {
    title: string;
    subtitle?: string;
    items: Benefit[];
  };
  process: {
    title: string;
    subtitle?: string;
    steps: ProcessStep[];
    variant: 'horizontal' | 'timeline';
  };
  testimonials: {
    title: string;
    subtitle?: string;
    items: Testimonial[];
    variant: 'grid' | 'featured';
  };
  faq: {
    title: string;
    subtitle?: string;
    items: FAQ[];
  };
  form: {
    title: string;
    subtitle?: string;
    fields: FormField[];
    submitText: string;
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
}

// =============================================================================
// Common Form Fields
// =============================================================================

const baseFormFields: FormField[] = [
  { name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'John Doe' },
  { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'john@example.com' },
  { name: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: '(305) 555-0123' },
];

// =============================================================================
// Service Configurations
// =============================================================================

export const landingPageConfigs: Record<string, LandingPageConfig> = {
  'real-estate': {
    service: {
      id: 'real-estate',
      name: 'Real Estate',
      tagline: 'Find Your Dream Home',
      description: 'Expert real estate services in Miami',
      ctaText: 'Get Your Free Home Valuation',
      phone: '(305) 555-0100',
      gradient: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
      accentColor: '#818cf8',
    },
    hero: {
      badge: '#1 Real Estate Agents in Miami',
      headline: 'Sell Your Home for Top Dollar',
      subheadline: 'Or find your dream home in Miami\'s best neighborhoods',
      description: 'Our experienced agents have helped over 1,000 families buy and sell homes in Miami. Get a free home valuation and discover what your property is really worth.',
      primaryCta: 'Get Free Home Valuation',
      secondaryCta: 'Browse Listings',
      stats: [
        { value: '1,000+', label: 'Homes Sold' },
        { value: '98%', label: 'Client Satisfaction' },
        { value: '15+', label: 'Years Experience' },
      ],
    },
    benefits: {
      title: 'Why Choose Our Real Estate Team',
      subtitle: 'We deliver results that exceed expectations',
      items: [
        {
          icon: 'TrendingUp',
          title: 'Sell for More',
          description: 'Our strategic pricing and marketing approach helps sellers get 10-15% more than the market average.',
        },
        {
          icon: 'Clock',
          title: 'Sell Faster',
          description: 'Homes we list sell 30% faster than the market average. Less time on market means less stress for you.',
        },
        {
          icon: 'Shield',
          title: 'Expert Negotiation',
          description: 'Our agents are trained negotiators who protect your interests and maximize your outcome.',
        },
        {
          icon: 'MapPin',
          title: 'Local Expertise',
          description: 'We know every Miami neighborhood inside and out. Our insights help you make smarter decisions.',
        },
      ],
    },
    process: {
      title: 'How It Works',
      subtitle: 'Simple steps to your real estate success',
      variant: 'horizontal',
      steps: [
        { number: 1, title: 'Free Consultation', description: 'Tell us about your goals. We\'ll create a personalized strategy for your situation.' },
        { number: 2, title: 'Property Valuation', description: 'Get an accurate assessment of your home\'s value based on current market data.' },
        { number: 3, title: 'Strategic Marketing', description: 'We showcase your property to qualified buyers through our extensive network.' },
        { number: 4, title: 'Successful Close', description: 'We handle all negotiations and paperwork to ensure a smooth transaction.' },
      ],
    },
    testimonials: {
      title: 'What Our Clients Say',
      subtitle: 'Real stories from real homeowners',
      variant: 'featured',
      items: [
        {
          quote: 'They sold our home in just 2 weeks for $50,000 over asking price. The whole process was seamless and stress-free. I couldn\'t recommend them more highly.',
          author: 'Maria Rodriguez',
          role: 'Homeowner, Coral Gables',
          rating: 5,
        },
        {
          quote: 'Found our dream home thanks to their dedication. They really listened to what we wanted and made it happen.',
          author: 'James & Sarah Chen',
          role: 'First-Time Buyers',
          rating: 5,
        },
        {
          quote: 'Professional, knowledgeable, and always available. The best real estate experience I\'ve ever had.',
          author: 'Robert Thompson',
          role: 'Investment Property Owner',
          rating: 5,
        },
      ],
    },
    faq: {
      title: 'Frequently Asked Questions',
      subtitle: 'Everything you need to know about buying or selling',
      items: [
        {
          question: 'How much is my home worth?',
          answer: 'We provide free, no-obligation home valuations. Our analysis considers recent sales, market trends, and your home\'s unique features to give you an accurate estimate.',
        },
        {
          question: 'What are your fees?',
          answer: 'Our commission is competitive with industry standards, and we only get paid when your home sells. During our consultation, we\'ll explain all costs transparently.',
        },
        {
          question: 'How long will it take to sell my home?',
          answer: 'On average, our listings sell within 30 days, which is 30% faster than the market average. The exact timeline depends on factors like price, location, and market conditions.',
        },
        {
          question: 'Do I need to make repairs before selling?',
          answer: 'Not necessarily. We\'ll advise you on which improvements offer the best return on investment. Sometimes small updates can significantly increase your sale price.',
        },
        {
          question: 'Can you help me buy and sell at the same time?',
          answer: 'Absolutely! We specialize in coordinating buy-sell transactions. We\'ll create a timeline that works for your situation and minimizes stress.',
        },
      ],
    },
    form: {
      title: 'Get Your Free Home Valuation',
      subtitle: 'Find out what your property is worth today',
      fields: [
        ...baseFormFields,
        { name: 'address', label: 'Property Address', type: 'text', required: true, placeholder: '123 Main St, Miami, FL' },
        {
          name: 'intent',
          label: 'I\'m looking to',
          type: 'select',
          required: true,
          options: [
            { value: '', label: 'Select an option' },
            { value: 'sell', label: 'Sell my home' },
            { value: 'buy', label: 'Buy a home' },
            { value: 'both', label: 'Buy and sell' },
            { value: 'invest', label: 'Investment property' },
          ],
        },
      ],
      submitText: 'Get My Free Valuation',
    },
    seo: {
      title: 'Miami Real Estate Agents | Buy & Sell Homes | Kanjona',
      description: 'Top-rated Miami real estate agents. Get a free home valuation, sell for top dollar, or find your dream home. Over 1,000 homes sold. Contact us today!',
      keywords: ['miami real estate', 'miami homes for sale', 'sell my house miami', 'miami realtor', 'best real estate agent miami'],
    },
  },

  'roofing': {
    service: {
      id: 'roofing',
      name: 'Roofing',
      tagline: 'Protect Your Home',
      description: 'Professional roofing services in Miami',
      ctaText: 'Get a Free Roof Inspection',
      phone: '(305) 555-0101',
      gradient: 'linear-gradient(135deg, #78350f, #b45309)',
      accentColor: '#d97706',
    },
    hero: {
      badge: 'Licensed & Insured Roofing Contractors',
      headline: 'Miami\'s Most Trusted Roofers',
      subheadline: 'Roof repairs, replacements, and inspections',
      description: 'From minor repairs to complete roof replacements, our certified team delivers quality workmanship backed by industry-leading warranties. Serving Miami for over 20 years.',
      primaryCta: 'Get Free Inspection',
      secondaryCta: 'Call Now',
      stats: [
        { value: '5,000+', label: 'Roofs Completed' },
        { value: '25+', label: 'Years Experience' },
        { value: 'A+', label: 'BBB Rating' },
      ],
    },
    benefits: {
      title: 'Why Miami Homeowners Choose Us',
      subtitle: 'Quality roofing you can trust',
      items: [
        {
          icon: 'Shield',
          title: 'Licensed & Insured',
          description: 'Fully licensed roofing contractor with comprehensive insurance. Your property is protected.',
        },
        {
          icon: 'Award',
          title: 'Certified Installers',
          description: 'GAF and Owens Corning certified. We use premium materials installed by trained professionals.',
        },
        {
          icon: 'Clock',
          title: 'Fast Response',
          description: 'Same-day estimates and emergency repairs available. We understand roofing issues can\'t wait.',
        },
        {
          icon: 'FileCheck',
          title: 'Warranty Protection',
          description: 'Manufacturer warranties plus our own workmanship guarantee. Your investment is protected for years.',
        },
      ],
    },
    process: {
      title: 'Our Simple Process',
      subtitle: 'From inspection to completion',
      variant: 'timeline',
      steps: [
        { number: 1, title: 'Free Inspection', description: 'We thoroughly inspect your roof and document any issues with photos.' },
        { number: 2, title: 'Detailed Estimate', description: 'Receive a transparent, itemized quote with no hidden fees or surprises.' },
        { number: 3, title: 'Expert Installation', description: 'Our certified crew completes the work efficiently and professionally.' },
        { number: 4, title: 'Final Walkthrough', description: 'We inspect the completed work with you to ensure your satisfaction.' },
      ],
    },
    testimonials: {
      title: 'Trusted by Miami Homeowners',
      subtitle: 'See what our customers have to say',
      variant: 'grid',
      items: [
        {
          quote: 'After Hurricane Irma, they replaced our entire roof in just 3 days. Professional, clean, and the roof looks amazing.',
          author: 'Carlos Mendez',
          role: 'Homeowner, Kendall',
          rating: 5,
        },
        {
          quote: 'Best roofers in Miami! They fixed a persistent leak that two other companies couldn\'t solve. Fair price, great work.',
          author: 'Patricia Williams',
          role: 'Homeowner, Coral Gables',
          rating: 5,
        },
        {
          quote: 'Very professional from start to finish. They helped with the insurance claim too. Highly recommend!',
          author: 'David Lee',
          role: 'Property Manager',
          rating: 5,
        },
      ],
    },
    faq: {
      title: 'Roofing FAQs',
      subtitle: 'Common questions about our services',
      items: [
        {
          question: 'How do I know if I need a new roof?',
          answer: 'Signs include missing or curling shingles, leaks, daylight through the roof boards, or a roof over 20 years old. We offer free inspections to assess your roof\'s condition.',
        },
        {
          question: 'Do you work with insurance companies?',
          answer: 'Yes! We have extensive experience with insurance claims and can help document damage, meet with adjusters, and ensure you get fair coverage.',
        },
        {
          question: 'What type of roofing materials do you use?',
          answer: 'We install all types including asphalt shingles, tile, metal, and flat roofing. We\'ll recommend the best option for your home and budget.',
        },
        {
          question: 'How long does a roof replacement take?',
          answer: 'Most residential roof replacements are completed in 1-3 days, depending on size and complexity. We\'ll give you a timeline during your estimate.',
        },
        {
          question: 'What warranties do you offer?',
          answer: 'We provide manufacturer warranties up to 50 years plus our own 10-year workmanship warranty. Your investment is fully protected.',
        },
      ],
    },
    form: {
      title: 'Schedule Your Free Inspection',
      subtitle: 'No obligation roof assessment',
      fields: [
        ...baseFormFields,
        { name: 'address', label: 'Property Address', type: 'text', required: true, placeholder: '123 Main St, Miami, FL' },
        {
          name: 'service',
          label: 'Service Needed',
          type: 'select',
          required: true,
          options: [
            { value: '', label: 'Select a service' },
            { value: 'inspection', label: 'Roof Inspection' },
            { value: 'repair', label: 'Roof Repair' },
            { value: 'replacement', label: 'Roof Replacement' },
            { value: 'storm', label: 'Storm Damage' },
            { value: 'other', label: 'Other' },
          ],
        },
      ],
      submitText: 'Get Free Inspection',
    },
    seo: {
      title: 'Miami Roofing Contractors | Roof Repair & Replacement | Kanjona',
      description: 'Licensed Miami roofing contractors. Free inspections, roof repairs, replacements, and storm damage. 25+ years experience. BBB A+ rated. Call today!',
      keywords: ['miami roofing', 'roof repair miami', 'roof replacement miami', 'roofing contractor miami', 'storm damage roof miami'],
    },
  },

  'dentist': {
    service: {
      id: 'dentist',
      name: 'Dentist',
      tagline: 'Your Smile, Our Priority',
      description: 'Comprehensive dental care in Miami',
      ctaText: 'Book Your Appointment',
      phone: '(305) 555-0102',
      gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
      accentColor: '#22d3ee',
    },
    hero: {
      badge: 'New Patients Welcome',
      headline: 'Get the Smile You Deserve',
      subheadline: 'Gentle, modern dentistry for the whole family',
      description: 'Experience dental care that puts your comfort first. From routine cleanings to cosmetic transformations, our team combines expertise with a gentle touch.',
      primaryCta: 'Book Appointment',
      secondaryCta: 'New Patient Special',
      stats: [
        { value: '15,000+', label: 'Happy Patients' },
        { value: '20+', label: 'Years Experience' },
        { value: '5.0', label: 'Google Rating' },
      ],
    },
    benefits: {
      title: 'Why Patients Love Our Practice',
      subtitle: 'Modern dentistry with a personal touch',
      items: [
        {
          icon: 'Heart',
          title: 'Gentle Care',
          description: 'Anxious about the dentist? We specialize in creating a calm, comfortable experience for every patient.',
        },
        {
          icon: 'Sparkles',
          title: 'Advanced Technology',
          description: 'Digital X-rays, same-day crowns, and laser dentistry mean less time in the chair and better results.',
        },
        {
          icon: 'Users',
          title: 'Family Friendly',
          description: 'From kids to grandparents, we provide comprehensive care for patients of all ages.',
        },
        {
          icon: 'CreditCard',
          title: 'Flexible Payments',
          description: 'We accept most insurance and offer financing options to make quality dental care affordable.',
        },
      ],
    },
    process: {
      title: 'Your Visit Experience',
      subtitle: 'What to expect at our office',
      variant: 'horizontal',
      steps: [
        { number: 1, title: 'Easy Scheduling', description: 'Book online or call. We offer early morning and evening appointments.' },
        { number: 2, title: 'Warm Welcome', description: 'Our friendly team ensures you feel comfortable from the moment you arrive.' },
        { number: 3, title: 'Thorough Exam', description: 'We take time to understand your needs and explain all treatment options.' },
        { number: 4, title: 'Personalized Care', description: 'Receive treatment tailored to your goals, comfort level, and budget.' },
      ],
    },
    testimonials: {
      title: 'Patient Testimonials',
      subtitle: 'Real experiences from real patients',
      variant: 'featured',
      items: [
        {
          quote: 'I was terrified of dentists for years. This team changed everything. They\'re so patient and gentle. Now I actually look forward to my appointments!',
          author: 'Jennifer Martinez',
          role: 'Patient since 2019',
          rating: 5,
        },
        {
          quote: 'Best dental experience I\'ve ever had. The office is beautiful, the staff is amazing, and my teeth have never looked better.',
          author: 'Michael Brown',
          role: 'Patient since 2020',
          rating: 5,
        },
        {
          quote: 'They take great care of our whole family. My kids actually enjoy coming here!',
          author: 'Lisa & Tom Garcia',
          role: 'Family Patients',
          rating: 5,
        },
      ],
    },
    faq: {
      title: 'Dental FAQs',
      subtitle: 'Your questions answered',
      items: [
        {
          question: 'Do you accept my insurance?',
          answer: 'We accept most major dental insurance plans. Our team will verify your benefits and explain your coverage before any treatment.',
        },
        {
          question: 'What if I\'m nervous about dental work?',
          answer: 'We specialize in treating anxious patients. We offer sedation options, take extra time to explain procedures, and always work at your comfort level.',
        },
        {
          question: 'How often should I visit the dentist?',
          answer: 'We recommend checkups and cleanings every 6 months for most patients. Some may benefit from more frequent visits depending on their oral health.',
        },
        {
          question: 'Do you offer cosmetic dentistry?',
          answer: 'Yes! We offer teeth whitening, veneers, Invisalign, and smile makeovers. Schedule a consultation to discuss your goals.',
        },
        {
          question: 'What is included in a new patient visit?',
          answer: 'Your first visit includes a comprehensive exam, digital X-rays, oral cancer screening, and a personalized treatment plan discussion.',
        },
      ],
    },
    form: {
      title: 'Book Your Appointment',
      subtitle: 'New patients: $99 exam, X-rays, and cleaning',
      fields: [
        ...baseFormFields,
        {
          name: 'service',
          label: 'I\'m interested in',
          type: 'select',
          required: true,
          options: [
            { value: '', label: 'Select a service' },
            { value: 'checkup', label: 'Checkup & Cleaning' },
            { value: 'cosmetic', label: 'Cosmetic Dentistry' },
            { value: 'emergency', label: 'Emergency Care' },
            { value: 'invisalign', label: 'Invisalign' },
            { value: 'other', label: 'Other' },
          ],
        },
        {
          name: 'insurance',
          label: 'Do you have dental insurance?',
          type: 'select',
          required: false,
          options: [
            { value: '', label: 'Select an option' },
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
            { value: 'unsure', label: 'Not sure' },
          ],
        },
      ],
      submitText: 'Book My Appointment',
    },
    seo: {
      title: 'Miami Dentist | Family & Cosmetic Dental Care | Kanjona',
      description: 'Top-rated Miami dentist. Gentle care for the whole family. New patient special: $99 exam, X-rays & cleaning. Book your appointment today!',
      keywords: ['miami dentist', 'dental care miami', 'cosmetic dentist miami', 'family dentist miami', 'invisalign miami'],
    },
  },

  // HVAC
  'hvac': {
    service: {
      id: 'hvac',
      name: 'HVAC',
      tagline: 'Stay Comfortable Year-Round',
      description: 'Expert heating and cooling services',
      ctaText: 'Get a Free Estimate',
      phone: '(305) 555-0103',
      gradient: 'linear-gradient(135deg, #0891b2, #0284c7)',
      accentColor: '#22d3ee',
    },
    hero: {
      badge: '24/7 Emergency Service Available',
      headline: 'AC Not Working? We\'ll Fix It Fast',
      subheadline: 'Expert HVAC repairs, installations, and maintenance',
      description: 'Don\'t suffer through another hot Miami day. Our certified technicians respond within 2 hours and fix most issues same-day. Serving Miami-Dade County for over 20 years.',
      primaryCta: 'Get Free Estimate',
      secondaryCta: 'Call Now',
      stats: [
        { value: '20,000+', label: 'Repairs Completed' },
        { value: '2hr', label: 'Response Time' },
        { value: '4.9★', label: 'Customer Rating' },
      ],
    },
    benefits: {
      title: 'Why Choose Our HVAC Services',
      subtitle: 'Trusted by Miami homeowners',
      items: [
        { icon: 'Clock', title: 'Fast Response', description: 'Same-day service available. We respond within 2 hours for emergencies.' },
        { icon: 'Shield', title: 'Licensed & Insured', description: 'Fully licensed HVAC contractor with comprehensive insurance coverage.' },
        { icon: 'BadgeDollarSign', title: 'Upfront Pricing', description: 'No surprises. We quote the price before we start and stick to it.' },
        { icon: 'Award', title: 'Satisfaction Guaranteed', description: 'Not happy? We\'ll make it right. 100% satisfaction guarantee on all work.' },
      ],
    },
    process: {
      title: 'Simple 4-Step Process',
      subtitle: 'Getting your AC fixed is easy',
      variant: 'horizontal',
      steps: [
        { number: 1, title: 'Call or Book Online', description: 'Reach us 24/7 by phone or schedule online.' },
        { number: 2, title: 'Fast Diagnosis', description: 'Technician arrives, diagnoses the issue, and provides upfront pricing.' },
        { number: 3, title: 'Expert Repair', description: 'We fix the problem right the first time using quality parts.' },
        { number: 4, title: 'Stay Cool', description: 'Enjoy reliable comfort with our maintenance plan.' },
      ],
    },
    testimonials: {
      title: 'What Our Customers Say',
      subtitle: 'Real reviews from Miami homeowners',
      variant: 'grid',
      items: [
        { quote: 'AC went out on the hottest day of the year. They were here in an hour and had it fixed within two. Amazing service!', author: 'Maria Santos', role: 'Homeowner, Kendall', rating: 5 },
        { quote: 'Fair prices, honest technicians. They could have sold me a new unit but instead fixed my old one for a fraction of the cost.', author: 'Tom Richardson', role: 'Homeowner, Coral Gables', rating: 5 },
        { quote: 'Best HVAC company in Miami. We use them for our rental properties. Always reliable and professional.', author: 'David Kim', role: 'Property Manager', rating: 5 },
      ],
    },
    faq: {
      title: 'HVAC FAQs',
      subtitle: 'Common questions answered',
      items: [
        { question: 'How quickly can you come out?', answer: 'For emergencies, we typically respond within 2 hours. For non-urgent issues, we can usually schedule you within 24 hours.' },
        { question: 'Do you offer financing?', answer: 'Yes! We offer 0% financing for qualified customers on new system installations. Ask about our payment plans.' },
        { question: 'What brands do you service?', answer: 'We service all major brands including Carrier, Trane, Lennox, Rheem, Goodman, and more.' },
        { question: 'How often should I service my AC?', answer: 'We recommend annual maintenance to keep your system running efficiently and catch small issues before they become big problems.' },
      ],
    },
    form: {
      title: 'Get Your Free Estimate',
      subtitle: 'No obligation, no pressure',
      fields: [
        ...baseFormFields,
        { name: 'address', label: 'Service Address', type: 'text', required: true, placeholder: '123 Main St, Miami, FL' },
        { name: 'service', label: 'Service Needed', type: 'select', required: true, options: [
          { value: '', label: 'Select a service' },
          { value: 'repair', label: 'AC Repair' },
          { value: 'install', label: 'New Installation' },
          { value: 'maintenance', label: 'Maintenance' },
          { value: 'emergency', label: 'Emergency Service' },
        ]},
      ],
      submitText: 'Get Free Estimate',
    },
    seo: {
      title: 'HVAC Repair & AC Installation Miami | 24/7 Service | Kanjona',
      description: 'Fast, reliable HVAC services in Miami. AC repair, installation, and maintenance. 2-hour response time, upfront pricing. Call for free estimate!',
      keywords: ['hvac miami', 'ac repair miami', 'air conditioning miami', 'hvac installation miami', 'emergency ac repair'],
    },
  },

  // Plumbing
  'plumbing': {
    service: {
      id: 'plumbing',
      name: 'Plumbing',
      tagline: 'Plumbing Done Right',
      description: 'Professional plumbing services',
      ctaText: 'Get a Free Quote',
      phone: '(305) 555-0104',
      gradient: 'linear-gradient(135deg, #0369a1, #0284c7)',
      accentColor: '#38bdf8',
    },
    hero: {
      badge: 'Licensed Master Plumbers',
      headline: 'Plumbing Problems Solved Fast',
      subheadline: 'Leaks, clogs, and repairs - we fix it all',
      description: 'From dripping faucets to major repairs, our licensed plumbers handle it all. Same-day service, upfront pricing, and a 100% satisfaction guarantee.',
      primaryCta: 'Get Free Quote',
      secondaryCta: 'Call Now',
      stats: [
        { value: '15,000+', label: 'Jobs Completed' },
        { value: '30+', label: 'Years Experience' },
        { value: 'A+', label: 'BBB Rating' },
      ],
    },
    benefits: {
      title: 'Why Miami Trusts Our Plumbers',
      subtitle: 'Quality work, fair prices',
      items: [
        { icon: 'Zap', title: 'Same-Day Service', description: 'Most repairs completed the same day you call. No more waiting around.' },
        { icon: 'Receipt', title: 'No Hidden Fees', description: 'Upfront pricing before any work begins. The quote is the price you pay.' },
        { icon: 'Shield', title: 'Licensed & Insured', description: 'Master plumbers with full licensing and insurance for your protection.' },
        { icon: 'ThumbsUp', title: 'Guaranteed Work', description: 'All repairs backed by our satisfaction guarantee. We stand behind our work.' },
      ],
    },
    process: {
      title: 'How It Works',
      subtitle: 'Simple, straightforward service',
      variant: 'timeline',
      steps: [
        { number: 1, title: 'Contact Us', description: 'Call or book online. Describe your plumbing issue.' },
        { number: 2, title: 'Get a Quote', description: 'We\'ll provide upfront pricing before starting work.' },
        { number: 3, title: 'We Fix It', description: 'Professional repair with quality parts and workmanship.' },
        { number: 4, title: 'Problem Solved', description: 'We clean up and ensure you\'re 100% satisfied.' },
      ],
    },
    testimonials: {
      title: 'Customer Reviews',
      subtitle: 'See what our customers say',
      variant: 'featured',
      items: [
        { quote: 'Had a major leak at 10pm. They came out immediately and fixed it. Can\'t recommend them enough!', author: 'Roberto Fernandez', role: 'Homeowner, Brickell', rating: 5 },
        { quote: 'Finally found honest plumbers! They fixed a problem two other companies said needed a $3,000 repair for just $200.', author: 'Susan Miller', role: 'Homeowner, Coconut Grove', rating: 5 },
        { quote: 'Professional, clean, and on time. These guys are the real deal. Will use again.', author: 'Marcus Johnson', role: 'Property Manager', rating: 5 },
      ],
    },
    faq: {
      title: 'Plumbing FAQs',
      subtitle: 'Questions? We have answers',
      items: [
        { question: 'Do you offer emergency plumbing services?', answer: 'Yes! We offer 24/7 emergency plumbing services. Call us anytime and we\'ll dispatch a plumber to you.' },
        { question: 'What types of plumbing do you handle?', answer: 'We handle everything from simple repairs to complete repiping. Leaks, clogs, water heaters, fixtures, drains, and more.' },
        { question: 'Do you give free estimates?', answer: 'Yes, we provide free estimates for all plumbing work. We\'ll diagnose the problem and give you an upfront price before starting.' },
        { question: 'Are your plumbers licensed?', answer: 'Absolutely. All our plumbers are licensed master plumbers with extensive training and background checks.' },
      ],
    },
    form: {
      title: 'Request a Free Quote',
      subtitle: 'Describe your plumbing issue',
      fields: [
        ...baseFormFields,
        { name: 'address', label: 'Service Address', type: 'text', required: true, placeholder: '123 Main St, Miami, FL' },
        { name: 'issue', label: 'Describe the Issue', type: 'textarea', required: true, placeholder: 'Tell us about your plumbing problem...' },
      ],
      submitText: 'Get My Free Quote',
    },
    seo: {
      title: 'Miami Plumber | 24/7 Plumbing Repairs | Licensed Plumbers | Kanjona',
      description: 'Licensed Miami plumbers for repairs, installations, and emergencies. Same-day service, upfront pricing, satisfaction guaranteed. Call for free estimate!',
      keywords: ['plumber miami', 'plumbing repair miami', 'emergency plumber miami', '24 hour plumber', 'licensed plumber miami'],
    },
  },

  // Electrician
  'electrician': {
    service: {
      id: 'electrician',
      name: 'Electrician',
      tagline: 'Safe, Reliable Electrical Work',
      description: 'Licensed electrical services',
      ctaText: 'Get a Free Estimate',
      phone: '(305) 555-0105',
      gradient: 'linear-gradient(135deg, #ca8a04, #eab308)',
      accentColor: '#fbbf24',
    },
    hero: {
      badge: 'Master Electricians - Available 24/7',
      headline: 'Electrical Services You Can Trust',
      subheadline: 'Repairs, upgrades, and installations done right',
      description: 'Don\'t risk DIY electrical work. Our licensed electricians handle everything from outlet repairs to panel upgrades safely and up to code.',
      primaryCta: 'Get Free Estimate',
      secondaryCta: 'Emergency Service',
      stats: [
        { value: '25+', label: 'Years Experience' },
        { value: '10,000+', label: 'Jobs Completed' },
        { value: '5.0★', label: 'Customer Rating' },
      ],
    },
    benefits: {
      title: 'Why Choose Our Electricians',
      subtitle: 'Safety and quality guaranteed',
      items: [
        { icon: 'Shield', title: 'Safety First', description: 'All work is done to code and passes inspection. Your family\'s safety is our priority.' },
        { icon: 'Award', title: 'Master Electricians', description: 'Licensed master electricians with ongoing training on latest techniques and codes.' },
        { icon: 'Clock', title: '24/7 Emergency Service', description: 'Electrical emergencies don\'t wait. Neither do we. Available around the clock.' },
        { icon: 'BadgeDollarSign', title: 'Fair Pricing', description: 'Competitive rates with upfront quotes. No surprise charges on your bill.' },
      ],
    },
    process: {
      title: 'Our Process',
      subtitle: 'Professional service from start to finish',
      variant: 'horizontal',
      steps: [
        { number: 1, title: 'Schedule Service', description: 'Call or book online. Describe your electrical needs.' },
        { number: 2, title: 'Assessment & Quote', description: 'We assess the job and provide an upfront, honest quote.' },
        { number: 3, title: 'Expert Work', description: 'Licensed electricians complete the work safely and to code.' },
        { number: 4, title: 'Inspection Ready', description: 'All work is documented and ready for inspection if needed.' },
      ],
    },
    testimonials: {
      title: 'Customer Testimonials',
      subtitle: 'What Miami homeowners say',
      variant: 'grid',
      items: [
        { quote: 'Upgraded our entire panel. Super professional, cleaned up everything, and the price was exactly what they quoted.', author: 'Ana Martinez', role: 'Homeowner, Doral', rating: 5 },
        { quote: 'Fixed a dangerous wiring issue the previous owner left. Possibly saved our house from a fire. Can\'t thank them enough.', author: 'James Wilson', role: 'New Homeowner', rating: 5 },
        { quote: 'Installed EV charger in our garage. Fast, clean work. Highly recommend for any electrical needs.', author: 'Sarah Chen', role: 'Tesla Owner', rating: 5 },
      ],
    },
    faq: {
      title: 'Electrical FAQs',
      subtitle: 'Common questions answered',
      items: [
        { question: 'When should I call an electrician?', answer: 'Call us for flickering lights, tripped breakers, warm outlets, burning smells, or any time you need new outlets, fixtures, or upgrades. Never DIY electrical work.' },
        { question: 'Do you handle commercial electrical work?', answer: 'Yes! We serve both residential and commercial clients. From office buildings to retail spaces, we handle it all.' },
        { question: 'Can you help with EV charger installation?', answer: 'Absolutely! We\'re certified to install all major EV charger brands. We\'ll assess your panel capacity and recommend the right setup.' },
        { question: 'Do you pull permits?', answer: 'Yes, we handle all necessary permits and inspections. All our work is done to code and properly documented.' },
      ],
    },
    form: {
      title: 'Get Your Free Estimate',
      subtitle: 'Tell us about your electrical needs',
      fields: [
        ...baseFormFields,
        { name: 'address', label: 'Service Address', type: 'text', required: true, placeholder: '123 Main St, Miami, FL' },
        { name: 'service', label: 'Service Type', type: 'select', required: true, options: [
          { value: '', label: 'Select a service' },
          { value: 'repair', label: 'Electrical Repair' },
          { value: 'panel', label: 'Panel Upgrade' },
          { value: 'installation', label: 'New Installation' },
          { value: 'ev', label: 'EV Charger' },
          { value: 'emergency', label: 'Emergency Service' },
        ]},
      ],
      submitText: 'Request Free Estimate',
    },
    seo: {
      title: 'Miami Electrician | Licensed Electrical Services | 24/7 | Kanjona',
      description: 'Licensed Miami electricians for repairs, installations, and emergencies. Panel upgrades, EV chargers, and more. Free estimates, upfront pricing.',
      keywords: ['electrician miami', 'electrical repair miami', 'panel upgrade miami', 'ev charger installation', '24 hour electrician'],
    },
  },

  // Pest Control
  'pest-control': {
    service: {
      id: 'pest-control',
      name: 'Pest Control',
      tagline: 'Pest-Free Living',
      description: 'Professional pest elimination',
      ctaText: 'Get a Free Inspection',
      phone: '(305) 555-0106',
      gradient: 'linear-gradient(135deg, #15803d, #22c55e)',
      accentColor: '#4ade80',
    },
    hero: {
      badge: 'Family & Pet Safe Treatments',
      headline: 'Get Rid of Pests for Good',
      subheadline: 'Effective, eco-friendly pest control',
      description: 'Ants, roaches, rodents, termites - we eliminate them all. Our treatments are safe for your family and pets while being deadly for pests.',
      primaryCta: 'Free Inspection',
      secondaryCta: 'Call Now',
      stats: [
        { value: '50,000+', label: 'Homes Protected' },
        { value: '99%', label: 'Success Rate' },
        { value: '30+', label: 'Years Experience' },
      ],
    },
    benefits: {
      title: 'Why Choose Us',
      subtitle: 'Effective pest control, guaranteed',
      items: [
        { icon: 'Heart', title: 'Safe for Family', description: 'Our treatments are EPA-approved and safe for children and pets.' },
        { icon: 'Target', title: 'Targeted Solutions', description: 'We identify the pest and apply the most effective treatment for elimination.' },
        { icon: 'CalendarCheck', title: 'Prevention Plans', description: 'Keep pests away year-round with our affordable maintenance programs.' },
        { icon: 'RefreshCw', title: 'Satisfaction Guarantee', description: 'Pests come back? So do we - at no extra charge.' },
      ],
    },
    process: {
      title: 'Our Process',
      subtitle: 'From inspection to pest-free',
      variant: 'timeline',
      steps: [
        { number: 1, title: 'Free Inspection', description: 'We thoroughly inspect your property to identify pests and entry points.' },
        { number: 2, title: 'Custom Plan', description: 'We create a treatment plan tailored to your specific pest problem.' },
        { number: 3, title: 'Treatment', description: 'Our trained technicians apply safe, effective treatments.' },
        { number: 4, title: 'Follow-Up', description: 'We return to ensure pests are eliminated and prevent future problems.' },
      ],
    },
    testimonials: {
      title: 'Customer Success Stories',
      subtitle: 'Pest-free and happy',
      variant: 'featured',
      items: [
        { quote: 'Had a terrible roach problem in our new house. After their treatment, we haven\'t seen a single one. Amazing results!', author: 'Monica Reyes', role: 'Homeowner, Hialeah', rating: 5 },
        { quote: 'They found and eliminated a termite colony before it caused major damage. Saved us thousands in repairs.', author: 'George Anderson', role: 'Homeowner, Coral Gables', rating: 5 },
        { quote: 'Finally got rid of the rats in our warehouse. Professional service and great follow-up.', author: 'Linda Torres', role: 'Business Owner', rating: 5 },
      ],
    },
    faq: {
      title: 'Pest Control FAQs',
      subtitle: 'Your questions answered',
      items: [
        { question: 'Are your treatments safe for pets?', answer: 'Yes! We use EPA-approved products that are safe for pets and children when used as directed. We\'ll provide specific guidelines for your situation.' },
        { question: 'How long until pests are gone?', answer: 'Most treatments show results within 24-48 hours. Some infestations may require follow-up treatments for complete elimination.' },
        { question: 'Do you offer termite protection?', answer: 'Yes! We offer both treatment for active infestations and preventative termite protection plans to keep your home safe.' },
        { question: 'What pests do you handle?', answer: 'We handle all common pests: ants, roaches, rodents, termites, bed bugs, mosquitoes, spiders, wasps, and more.' },
      ],
    },
    form: {
      title: 'Schedule Free Inspection',
      subtitle: 'Find out what\'s bugging you',
      fields: [
        ...baseFormFields,
        { name: 'address', label: 'Service Address', type: 'text', required: true, placeholder: '123 Main St, Miami, FL' },
        { name: 'pest', label: 'Type of Pest', type: 'select', required: true, options: [
          { value: '', label: 'Select pest type' },
          { value: 'roaches', label: 'Roaches' },
          { value: 'ants', label: 'Ants' },
          { value: 'rodents', label: 'Rodents' },
          { value: 'termites', label: 'Termites' },
          { value: 'other', label: 'Other / Not Sure' },
        ]},
      ],
      submitText: 'Get Free Inspection',
    },
    seo: {
      title: 'Miami Pest Control | Exterminators | Family Safe | Kanjona',
      description: 'Professional pest control in Miami. Safe treatments for roaches, ants, termites, rodents. Free inspection, satisfaction guaranteed. Call today!',
      keywords: ['pest control miami', 'exterminator miami', 'termite treatment miami', 'roach control', 'rat exterminator miami'],
    },
  },

  // Solar
  'solar': {
    service: {
      id: 'solar',
      name: 'Solar',
      tagline: 'Power Your Home with Sunshine',
      description: 'Solar panel installation',
      ctaText: 'Get Your Free Quote',
      phone: '(305) 555-0107',
      gradient: 'linear-gradient(135deg, #f59e0b, #f97316)',
      accentColor: '#fbbf24',
    },
    hero: {
      badge: 'Federal Tax Credit Available',
      headline: 'Go Solar, Save Thousands',
      subheadline: 'Miami\'s trusted solar installers',
      description: 'Stop paying rising electric bills. With Florida\'s abundant sunshine, solar pays for itself while increasing your home value. Get a free custom quote today.',
      primaryCta: 'Get Free Quote',
      secondaryCta: 'Calculate Savings',
      stats: [
        { value: '2,500+', label: 'Installations' },
        { value: '$30K', label: 'Avg. Savings' },
        { value: '25yr', label: 'Warranty' },
      ],
    },
    benefits: {
      title: 'Benefits of Going Solar',
      subtitle: 'Why Miami homeowners are switching',
      items: [
        { icon: 'BadgeDollarSign', title: 'Slash Electric Bills', description: 'Reduce or eliminate your monthly electric bill. Average savings of $150+/month.' },
        { icon: 'TrendingUp', title: 'Increase Home Value', description: 'Solar homes sell for 4% more on average. It\'s an investment that pays off.' },
        { icon: 'Leaf', title: 'Go Green', description: 'Reduce your carbon footprint while saving money. Good for you and the planet.' },
        { icon: 'Shield', title: 'Energy Independence', description: 'Protect yourself from rising utility rates and power outages with battery storage.' },
      ],
    },
    process: {
      title: 'Your Solar Journey',
      subtitle: 'From quote to power-on in 4 steps',
      variant: 'horizontal',
      steps: [
        { number: 1, title: 'Free Consultation', description: 'We analyze your energy usage and design a custom system.' },
        { number: 2, title: 'Custom Design', description: 'Our engineers design the optimal system for your roof and needs.' },
        { number: 3, title: 'Professional Install', description: 'Certified installers complete the job, typically in 1-2 days.' },
        { number: 4, title: 'Start Saving', description: 'We handle permits and utility connection. You start saving!' },
      ],
    },
    testimonials: {
      title: 'Happy Solar Customers',
      subtitle: 'Join thousands of Miami homeowners',
      variant: 'featured',
      items: [
        { quote: 'My electric bill went from $300/month to $0. The system paid for itself in 5 years. Best investment I\'ve made.', author: 'Carlos Mendez', role: 'Homeowner, Kendall', rating: 5 },
        { quote: 'Professional installation, great communication, and the savings are real. Highly recommend!', author: 'Jessica Wright', role: 'Homeowner, Pinecrest', rating: 5 },
        { quote: 'Added battery backup too. During the last hurricane, we were the only house on the block with power.', author: 'Michael Brown', role: 'Homeowner, Doral', rating: 5 },
      ],
    },
    faq: {
      title: 'Solar FAQs',
      subtitle: 'Common questions about solar',
      items: [
        { question: 'How much does solar cost?', answer: 'The average Miami home solar system costs $15,000-$25,000 before incentives. The 30% federal tax credit reduces this significantly. We offer $0 down financing.' },
        { question: 'How long until solar pays for itself?', answer: 'With Florida\'s sunshine and current incentives, most systems pay for themselves in 5-7 years, then provide free electricity for decades.' },
        { question: 'What happens during hurricanes?', answer: 'Our panels are rated for 150+ mph winds. With battery backup, you can maintain power during outages. Panels and batteries are insurable.' },
        { question: 'Do I need a new roof?', answer: 'If your roof is over 15 years old, we recommend considering a new roof first. We can bundle roofing + solar for savings.' },
      ],
    },
    form: {
      title: 'Get Your Free Solar Quote',
      subtitle: 'See how much you could save',
      fields: [
        ...baseFormFields,
        { name: 'address', label: 'Home Address', type: 'text', required: true, placeholder: '123 Main St, Miami, FL' },
        { name: 'electric_bill', label: 'Average Monthly Electric Bill', type: 'select', required: true, options: [
          { value: '', label: 'Select amount' },
          { value: '100-150', label: '$100-$150' },
          { value: '150-200', label: '$150-$200' },
          { value: '200-300', label: '$200-$300' },
          { value: '300+', label: '$300+' },
        ]},
      ],
      submitText: 'Get My Free Quote',
    },
    seo: {
      title: 'Miami Solar Installation | Solar Panels | Free Quote | Kanjona',
      description: 'Go solar in Miami. Professional installation, 25-year warranty, $0 down financing. Save thousands on electric bills. Get your free quote today!',
      keywords: ['solar miami', 'solar panel installation miami', 'solar company miami', 'solar installers', 'residential solar florida'],
    },
  },

  // Personal Injury Attorney
  'personal-injury-attorney': {
    service: {
      id: 'personal-injury-attorney',
      name: 'Personal Injury Attorney',
      tagline: 'Fight for Your Rights',
      description: 'Experienced personal injury lawyers',
      ctaText: 'Free Case Review',
      phone: '(305) 555-0108',
      gradient: 'linear-gradient(135deg, #dc2626, #b91c1c)',
      accentColor: '#f87171',
    },
    hero: {
      badge: 'No Fee Unless We Win',
      headline: 'Injured? Get the Compensation You Deserve',
      subheadline: 'Miami\'s top-rated personal injury attorneys',
      description: 'Don\'t face insurance companies alone. Our experienced attorneys have recovered over $500 million for injured victims. Free consultation, no fee unless we win.',
      primaryCta: 'Free Case Review',
      secondaryCta: 'Call 24/7',
      stats: [
        { value: '$500M+', label: 'Recovered' },
        { value: '5,000+', label: 'Cases Won' },
        { value: '98%', label: 'Success Rate' },
      ],
    },
    benefits: {
      title: 'Why Choose Our Firm',
      subtitle: 'We fight for what\'s right',
      items: [
        { icon: 'Scale', title: 'No Fee Unless We Win', description: 'You pay nothing unless we recover compensation. No hidden costs or surprise bills.' },
        { icon: 'Clock', title: '24/7 Availability', description: 'Accidents don\'t wait. Neither do we. Call anytime for immediate assistance.' },
        { icon: 'Users', title: 'Personal Attention', description: 'You\'ll work directly with experienced attorneys, not paralegals or assistants.' },
        { icon: 'Trophy', title: 'Proven Track Record', description: 'Over $500 million recovered. We know how to win against insurance companies.' },
      ],
    },
    process: {
      title: 'How We Work',
      subtitle: 'Your path to compensation',
      variant: 'timeline',
      steps: [
        { number: 1, title: 'Free Consultation', description: 'Tell us what happened. We\'ll evaluate your case at no cost.' },
        { number: 2, title: 'Investigation', description: 'We gather evidence, interview witnesses, and build your case.' },
        { number: 3, title: 'Negotiation', description: 'We negotiate aggressively with insurance companies on your behalf.' },
        { number: 4, title: 'Maximum Recovery', description: 'We fight for every dollar you deserve. Trial-ready if needed.' },
      ],
    },
    testimonials: {
      title: 'Client Success Stories',
      subtitle: 'Real results for real people',
      variant: 'featured',
      items: [
        { quote: 'After my car accident, they got me $750,000 when the insurance only offered $50,000. They changed my life.', author: 'Maria Santos', role: 'Car Accident Victim', rating: 5 },
        { quote: 'Professional, caring, and aggressive when needed. They treated me like family and got great results.', author: 'James Richardson', role: 'Slip & Fall Client', rating: 5 },
        { quote: 'The insurance company denied my claim. These attorneys fought for me and won. I can\'t thank them enough.', author: 'Patricia Williams', role: 'Medical Malpractice Client', rating: 5 },
      ],
    },
    faq: {
      title: 'Personal Injury FAQs',
      subtitle: 'Common questions about your case',
      items: [
        { question: 'How much does it cost to hire you?', answer: 'Nothing upfront. We work on contingency - you only pay if we win your case. The fee is a percentage of what we recover for you.' },
        { question: 'How long do I have to file a claim?', answer: 'In Florida, you typically have 2 years for most personal injury claims. But evidence disappears fast - contact us immediately after an accident.' },
        { question: 'What types of cases do you handle?', answer: 'Car accidents, truck accidents, motorcycle accidents, slip and falls, medical malpractice, wrongful death, and more.' },
        { question: 'Should I talk to the other insurance company?', answer: 'No! Insurance adjusters are trained to minimize your claim. Let us handle all communication to protect your rights.' },
      ],
    },
    form: {
      title: 'Get Your Free Case Review',
      subtitle: 'Tell us what happened',
      fields: [
        ...baseFormFields,
        { name: 'accident_type', label: 'Type of Accident', type: 'select', required: true, options: [
          { value: '', label: 'Select type' },
          { value: 'car', label: 'Car Accident' },
          { value: 'truck', label: 'Truck Accident' },
          { value: 'motorcycle', label: 'Motorcycle Accident' },
          { value: 'slip', label: 'Slip & Fall' },
          { value: 'other', label: 'Other' },
        ]},
        { name: 'description', label: 'What Happened?', type: 'textarea', required: true, placeholder: 'Briefly describe your accident...' },
      ],
      submitText: 'Get Free Case Review',
    },
    seo: {
      title: 'Miami Personal Injury Lawyers | No Fee Unless We Win | Kanjona',
      description: 'Experienced Miami personal injury attorneys. Car accidents, slip & falls, medical malpractice. $500M+ recovered. Free consultation, no fee unless we win.',
      keywords: ['personal injury lawyer miami', 'car accident attorney miami', 'injury lawyer', 'accident lawyer miami', 'slip and fall attorney'],
    },
  },

  // Plastic Surgeon
  'plastic-surgeon': {
    service: {
      id: 'plastic-surgeon',
      name: 'Plastic Surgeon',
      tagline: 'Enhance Your Natural Beauty',
      description: 'Board-certified plastic surgery',
      ctaText: 'Book Your Consultation',
      phone: '(305) 555-0109',
      gradient: 'linear-gradient(135deg, #ec4899, #d946ef)',
      accentColor: '#f472b6',
    },
    hero: {
      badge: 'Board Certified Plastic Surgeon',
      headline: 'Look and Feel Your Best',
      subheadline: 'Personalized cosmetic enhancement',
      description: 'Dr. Smith combines artistry with precision to deliver natural-looking results. From subtle enhancements to transformative procedures, achieve the look you\'ve always wanted.',
      primaryCta: 'Book Consultation',
      secondaryCta: 'View Gallery',
      stats: [
        { value: '15+', label: 'Years Experience' },
        { value: '5,000+', label: 'Procedures' },
        { value: '4.9★', label: 'Patient Rating' },
      ],
    },
    benefits: {
      title: 'Why Choose Our Practice',
      subtitle: 'Excellence in cosmetic surgery',
      items: [
        { icon: 'Award', title: 'Board Certified', description: 'Double board-certified by the American Board of Plastic Surgery.' },
        { icon: 'Sparkles', title: 'Natural Results', description: 'Our approach focuses on enhancing your natural beauty, not changing who you are.' },
        { icon: 'ShieldCheck', title: 'Safety First', description: 'State-of-the-art facility with the highest safety standards and protocols.' },
        { icon: 'Heart', title: 'Personalized Care', description: 'Every treatment plan is customized to your unique goals and anatomy.' },
      ],
    },
    process: {
      title: 'Your Journey',
      subtitle: 'From consultation to transformation',
      variant: 'horizontal',
      steps: [
        { number: 1, title: 'Consultation', description: 'Discuss your goals and explore options with Dr. Smith.' },
        { number: 2, title: 'Custom Plan', description: 'Receive a personalized treatment plan designed for your needs.' },
        { number: 3, title: 'Procedure', description: 'Expert care in our accredited surgical facility.' },
        { number: 4, title: 'Recovery & Results', description: 'Comprehensive aftercare support for optimal results.' },
      ],
    },
    testimonials: {
      title: 'Patient Stories',
      subtitle: 'Real transformations',
      variant: 'featured',
      items: [
        { quote: 'My breast augmentation results exceeded my expectations. Dr. Smith listened to exactly what I wanted and delivered beautifully.', author: 'Anonymous', role: 'Breast Augmentation Patient', rating: 5 },
        { quote: 'I was nervous about my facelift but the results are incredible. I look refreshed, not "done." So natural.', author: 'Anonymous', role: 'Facelift Patient', rating: 5 },
        { quote: 'After losing 100 pounds, I needed body contouring. The transformation has completed my weight loss journey.', author: 'Anonymous', role: 'Body Contouring Patient', rating: 5 },
      ],
    },
    faq: {
      title: 'Cosmetic Surgery FAQs',
      subtitle: 'Your questions answered',
      items: [
        { question: 'How do I know if I\'m a good candidate?', answer: 'Good candidates are healthy non-smokers with realistic expectations. We\'ll evaluate your medical history and goals during your consultation.' },
        { question: 'What financing options do you offer?', answer: 'We offer multiple financing options including CareCredit and Alphaeon. Many patients qualify for low or no-interest payment plans.' },
        { question: 'What is recovery like?', answer: 'Recovery varies by procedure. We provide detailed instructions and support throughout your healing process. Most patients return to work within 1-2 weeks.' },
        { question: 'Are results permanent?', answer: 'Results are long-lasting but not immune to aging. A healthy lifestyle helps maintain your results for many years.' },
      ],
    },
    form: {
      title: 'Schedule Your Consultation',
      subtitle: 'Take the first step',
      fields: [
        ...baseFormFields,
        { name: 'procedure', label: 'Procedure of Interest', type: 'select', required: true, options: [
          { value: '', label: 'Select procedure' },
          { value: 'breast', label: 'Breast Surgery' },
          { value: 'body', label: 'Body Contouring' },
          { value: 'face', label: 'Face & Neck' },
          { value: 'nonsurgical', label: 'Non-Surgical' },
          { value: 'other', label: 'Other / Not Sure' },
        ]},
      ],
      submitText: 'Book My Consultation',
    },
    seo: {
      title: 'Miami Plastic Surgeon | Board Certified | Cosmetic Surgery | Kanjona',
      description: 'Top Miami plastic surgeon. Breast augmentation, liposuction, facelift, and more. Board certified, natural results. Schedule your consultation today.',
      keywords: ['plastic surgeon miami', 'cosmetic surgery miami', 'breast augmentation miami', 'liposuction miami', 'facelift miami'],
    },
  },

  // Life Insurance
  'life-insurance': {
    service: {
      id: 'life-insurance',
      name: 'Life Insurance',
      tagline: 'Protect Your Family\'s Future',
      description: 'Affordable life insurance coverage',
      ctaText: 'Get a Free Quote',
      phone: '(305) 555-0110',
      gradient: 'linear-gradient(135deg, #1e40af, #3b82f6)',
      accentColor: '#60a5fa',
    },
    hero: {
      badge: 'Licensed Insurance Agents',
      headline: 'Protect What Matters Most',
      subheadline: 'Affordable life insurance for every budget',
      description: 'Don\'t leave your family\'s future to chance. Get the coverage you need at rates you can afford. Free quotes in minutes, no medical exam options available.',
      primaryCta: 'Get Free Quote',
      secondaryCta: 'Call an Agent',
      stats: [
        { value: '50,000+', label: 'Families Protected' },
        { value: '$500K', label: 'Starting Coverage' },
        { value: '$15/mo', label: 'Starting Price' },
      ],
    },
    benefits: {
      title: 'Why Get Life Insurance',
      subtitle: 'Peace of mind for you and your family',
      items: [
        { icon: 'Heart', title: 'Protect Your Family', description: 'Ensure your loved ones are financially secure if something happens to you.' },
        { icon: 'BadgeDollarSign', title: 'Affordable Coverage', description: 'Term life policies start at just $15/month. Get the protection you need at a price you can afford.' },
        { icon: 'Zap', title: 'Quick & Easy', description: 'Get quotes in minutes. Many policies require no medical exam and offer instant approval.' },
        { icon: 'Shield', title: 'Multiple Options', description: 'Term, whole life, universal - we help you find the right policy for your needs.' },
      ],
    },
    process: {
      title: 'Getting Covered is Simple',
      subtitle: 'Protection in 4 easy steps',
      variant: 'horizontal',
      steps: [
        { number: 1, title: 'Get a Quote', description: 'Answer a few questions to receive personalized quotes.' },
        { number: 2, title: 'Compare Options', description: 'Review policies from top-rated insurance companies.' },
        { number: 3, title: 'Apply Online', description: 'Complete your application in minutes, often with no medical exam.' },
        { number: 4, title: 'Get Protected', description: 'Coverage can begin as soon as your application is approved.' },
      ],
    },
    testimonials: {
      title: 'What Our Clients Say',
      subtitle: 'Real stories from real families',
      variant: 'grid',
      items: [
        { quote: 'I put this off for years thinking it would be expensive. Got $500K coverage for $25/month. So easy!', author: 'Michael Thompson', role: 'Father of 3', rating: 5 },
        { quote: 'The agent helped me understand my options and find the perfect policy. No pressure, just helpful advice.', author: 'Sarah Martinez', role: 'Small Business Owner', rating: 5 },
        { quote: 'When my husband passed, the policy saved our family financially. So grateful we got covered.', author: 'Linda Chen', role: 'Beneficiary', rating: 5 },
      ],
    },
    faq: {
      title: 'Life Insurance FAQs',
      subtitle: 'Common questions answered',
      items: [
        { question: 'How much life insurance do I need?', answer: 'A common rule is 10-12x your annual income. We\'ll help you calculate based on your debts, income replacement needs, and future expenses like college.' },
        { question: 'What\'s the difference between term and whole life?', answer: 'Term life covers you for a specific period (10-30 years) at lower cost. Whole life covers you for life and builds cash value but costs more.' },
        { question: 'Can I get coverage without a medical exam?', answer: 'Yes! Many policies offer simplified underwriting with no exam required. Coverage amounts up to $500K-$1M available.' },
        { question: 'What affects my premium?', answer: 'Age, health, smoking status, coverage amount, and term length. The younger and healthier you are, the lower your rates.' },
      ],
    },
    form: {
      title: 'Get Your Free Quote',
      subtitle: 'No obligation, no pressure',
      fields: [
        ...baseFormFields,
        { name: 'age', label: 'Your Age', type: 'select', required: true, options: [
          { value: '', label: 'Select age range' },
          { value: '18-30', label: '18-30' },
          { value: '31-40', label: '31-40' },
          { value: '41-50', label: '41-50' },
          { value: '51-60', label: '51-60' },
          { value: '61+', label: '61+' },
        ]},
        { name: 'coverage', label: 'Coverage Amount', type: 'select', required: true, options: [
          { value: '', label: 'Select amount' },
          { value: '250k', label: '$250,000' },
          { value: '500k', label: '$500,000' },
          { value: '1m', label: '$1,000,000' },
          { value: 'other', label: 'Not Sure' },
        ]},
      ],
      submitText: 'Get My Free Quote',
    },
    seo: {
      title: 'Life Insurance Miami | Affordable Coverage | Free Quotes | Kanjona',
      description: 'Get affordable life insurance in Miami. Compare quotes from top carriers. No exam options available. Protect your family today. Free quote in minutes!',
      keywords: ['life insurance miami', 'term life insurance', 'whole life insurance', 'affordable life insurance', 'life insurance quotes'],
    },
  },

  // Construction
  'construction': {
    service: {
      id: 'construction',
      name: 'Construction',
      tagline: 'Building Your Vision',
      description: 'General contracting services',
      ctaText: 'Get a Free Estimate',
      phone: '(305) 555-0111',
      gradient: 'linear-gradient(135deg, #78350f, #a16207)',
      accentColor: '#d97706',
    },
    hero: {
      badge: 'Licensed General Contractor',
      headline: 'Build Your Dream Project',
      subheadline: 'New construction, additions, and renovations',
      description: 'From concept to completion, we bring your vision to life. Licensed, insured, and committed to quality craftsmanship on every project.',
      primaryCta: 'Get Free Estimate',
      secondaryCta: 'View Portfolio',
      stats: [
        { value: '500+', label: 'Projects Completed' },
        { value: '25+', label: 'Years Experience' },
        { value: 'A+', label: 'BBB Rating' },
      ],
    },
    benefits: {
      title: 'Why Build With Us',
      subtitle: 'Quality construction you can trust',
      items: [
        { icon: 'Shield', title: 'Fully Licensed', description: 'Licensed general contractor with full insurance coverage and bond.' },
        { icon: 'Award', title: 'Quality Craftsmanship', description: 'We never cut corners. Premium materials and skilled tradespeople on every job.' },
        { icon: 'Clock', title: 'On-Time Delivery', description: 'We create detailed timelines and stick to them. Your project, delivered on schedule.' },
        { icon: 'Receipt', title: 'Transparent Pricing', description: 'Detailed estimates with no hidden fees. You know exactly what you\'re paying for.' },
      ],
    },
    process: {
      title: 'Our Construction Process',
      subtitle: 'From blueprint to reality',
      variant: 'timeline',
      steps: [
        { number: 1, title: 'Consultation', description: 'We discuss your vision, needs, and budget.' },
        { number: 2, title: 'Design & Planning', description: 'Detailed plans, permits, and timeline development.' },
        { number: 3, title: 'Construction', description: 'Expert crews execute the build with regular updates.' },
        { number: 4, title: 'Final Walkthrough', description: 'We ensure everything meets your expectations before handoff.' },
      ],
    },
    testimonials: {
      title: 'Client Projects',
      subtitle: 'Success stories from our builds',
      variant: 'featured',
      items: [
        { quote: 'They built our custom home exactly as we envisioned. Every detail was perfect. Truly craftsmen.', author: 'Robert & Maria Chen', role: 'Custom Home Build', rating: 5 },
        { quote: 'Our addition was completed on time and on budget. Communication was excellent throughout.', author: 'James Peterson', role: 'Home Addition', rating: 5 },
        { quote: 'From permits to final inspection, they handled everything. Professional from start to finish.', author: 'Amanda Foster', role: 'Commercial Build-Out', rating: 5 },
      ],
    },
    faq: {
      title: 'Construction FAQs',
      subtitle: 'Planning your project',
      items: [
        { question: 'How long will my project take?', answer: 'Timelines vary by project size. A bathroom remodel might take 2-3 weeks, while a custom home could take 6-12 months. We provide detailed schedules upfront.' },
        { question: 'Do you handle permits?', answer: 'Yes, we manage the entire permitting process. We know local codes and work with inspectors to ensure compliance.' },
        { question: 'What type of projects do you handle?', answer: 'New home construction, additions, major renovations, kitchen and bath remodels, and commercial build-outs.' },
        { question: 'How do payments work?', answer: 'We typically structure payments around project milestones. You\'ll receive a detailed payment schedule with your contract.' },
      ],
    },
    form: {
      title: 'Start Your Project',
      subtitle: 'Tell us about your vision',
      fields: [
        ...baseFormFields,
        { name: 'address', label: 'Project Location', type: 'text', required: true, placeholder: '123 Main St, Miami, FL' },
        { name: 'project_type', label: 'Project Type', type: 'select', required: true, options: [
          { value: '', label: 'Select project type' },
          { value: 'new_home', label: 'New Home Construction' },
          { value: 'addition', label: 'Home Addition' },
          { value: 'renovation', label: 'Major Renovation' },
          { value: 'commercial', label: 'Commercial Build-Out' },
          { value: 'other', label: 'Other' },
        ]},
        { name: 'description', label: 'Project Description', type: 'textarea', required: true, placeholder: 'Describe your project...' },
      ],
      submitText: 'Get Free Estimate',
    },
    seo: {
      title: 'Miami General Contractor | New Construction & Renovation | Kanjona',
      description: 'Licensed Miami general contractor. Custom homes, additions, renovations. 25+ years experience, quality craftsmanship. Get your free estimate today!',
      keywords: ['general contractor miami', 'construction company miami', 'home builder miami', 'renovation contractor', 'custom home builder'],
    },
  },

  // Moving
  'moving': {
    service: {
      id: 'moving',
      name: 'Moving',
      tagline: 'Stress-Free Moving',
      description: 'Professional moving services',
      ctaText: 'Get a Free Quote',
      phone: '(305) 555-0112',
      gradient: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
      accentColor: '#a78bfa',
    },
    hero: {
      badge: 'Licensed & Insured Movers',
      headline: 'Your Move, Made Easy',
      subheadline: 'Local and long-distance moving',
      description: 'Moving doesn\'t have to be stressful. Our professional team handles everything from packing to unloading, so you can focus on your new beginning.',
      primaryCta: 'Get Free Quote',
      secondaryCta: 'Call Now',
      stats: [
        { value: '20,000+', label: 'Moves Completed' },
        { value: '99%', label: 'On-Time Rate' },
        { value: '5.0★', label: 'Customer Rating' },
      ],
    },
    benefits: {
      title: 'Why Move With Us',
      subtitle: 'Professional moving you can trust',
      items: [
        { icon: 'Shield', title: 'Fully Insured', description: 'Your belongings are protected. Full valuation coverage available.' },
        { icon: 'Users', title: 'Professional Crew', description: 'Background-checked, trained movers who treat your stuff like their own.' },
        { icon: 'BadgeDollarSign', title: 'Transparent Pricing', description: 'No hidden fees. Your quote is your price, guaranteed.' },
        { icon: 'Package', title: 'Full Service', description: 'Packing, loading, transport, unloading - we handle it all.' },
      ],
    },
    process: {
      title: 'How Moving Works',
      subtitle: 'Simple, stress-free process',
      variant: 'horizontal',
      steps: [
        { number: 1, title: 'Free Quote', description: 'We assess your move and provide an accurate, binding quote.' },
        { number: 2, title: 'Prep & Pack', description: 'Optional packing services to make your move even easier.' },
        { number: 3, title: 'Moving Day', description: 'Our crew arrives on time, loads carefully, and transports safely.' },
        { number: 4, title: 'Delivery', description: 'We unload, place furniture, and ensure you\'re satisfied.' },
      ],
    },
    testimonials: {
      title: 'Happy Customers',
      subtitle: 'See why people love moving with us',
      variant: 'grid',
      items: [
        { quote: 'Moved our 4-bedroom house in one day. The crew was fast, careful, and friendly. Best movers ever!', author: 'Jennifer Williams', role: 'Local Move', rating: 5 },
        { quote: 'They moved us from Miami to Atlanta. Not a single item damaged. Worth every penny.', author: 'David & Lisa Park', role: 'Long-Distance Move', rating: 5 },
        { quote: 'Moved my elderly mother with such care and patience. These guys are the best.', author: 'Robert Thompson', role: 'Senior Move', rating: 5 },
      ],
    },
    faq: {
      title: 'Moving FAQs',
      subtitle: 'Plan your move with confidence',
      items: [
        { question: 'How far in advance should I book?', answer: 'We recommend booking 2-4 weeks ahead for local moves and 4-6 weeks for long-distance. Peak times (summer, end of month) book up faster.' },
        { question: 'Do you provide packing services?', answer: 'Yes! We offer full packing, partial packing, and unpacking services. We also sell packing supplies if you prefer to pack yourself.' },
        { question: 'How are prices calculated?', answer: 'Local moves are typically hourly based on crew size and truck size. Long-distance moves are based on weight and distance. We provide binding quotes.' },
        { question: 'What about insurance?', answer: 'Basic liability coverage is included. Full value protection is available for complete peace of mind.' },
      ],
    },
    form: {
      title: 'Get Your Free Quote',
      subtitle: 'No obligation estimate',
      fields: [
        ...baseFormFields,
        { name: 'from_address', label: 'Moving From', type: 'text', required: true, placeholder: 'Current address' },
        { name: 'to_address', label: 'Moving To', type: 'text', required: true, placeholder: 'Destination address' },
        { name: 'home_size', label: 'Home Size', type: 'select', required: true, options: [
          { value: '', label: 'Select size' },
          { value: 'studio', label: 'Studio/1BR' },
          { value: '2br', label: '2 Bedrooms' },
          { value: '3br', label: '3 Bedrooms' },
          { value: '4br', label: '4+ Bedrooms' },
          { value: 'office', label: 'Office/Commercial' },
        ]},
      ],
      submitText: 'Get Free Quote',
    },
    seo: {
      title: 'Miami Movers | Local & Long Distance Moving | Kanjona',
      description: 'Professional Miami movers. Local and long-distance moving services. Packing, loading, delivery. Licensed, insured, 5-star rated. Get your free quote!',
      keywords: ['movers miami', 'moving company miami', 'local movers', 'long distance movers miami', 'professional movers'],
    },
  },

  // Cleaning
  'cleaning': {
    service: {
      id: 'cleaning',
      name: 'Cleaning',
      tagline: 'A Cleaner Home, A Happier Life',
      description: 'Professional house cleaning',
      ctaText: 'Book Your Cleaning',
      phone: '(305) 555-0113',
      gradient: 'linear-gradient(135deg, #06b6d4, #22d3ee)',
      accentColor: '#67e8f9',
    },
    hero: {
      badge: 'Trusted by 10,000+ Miami Homes',
      headline: 'Come Home to Clean',
      subheadline: 'Professional house cleaning services',
      description: 'Reclaim your time and enjoy a spotless home. Our vetted, trained cleaners deliver consistent, thorough cleaning you can count on.',
      primaryCta: 'Book Now',
      secondaryCta: 'Get Pricing',
      stats: [
        { value: '10,000+', label: 'Homes Cleaned' },
        { value: '4.9★', label: 'Customer Rating' },
        { value: '100%', label: 'Satisfaction' },
      ],
    },
    benefits: {
      title: 'Why Choose Our Cleaning',
      subtitle: 'Trusted by Miami families',
      items: [
        { icon: 'ShieldCheck', title: 'Vetted Cleaners', description: 'Background-checked, trained professionals who respect your home.' },
        { icon: 'Sparkles', title: 'Thorough Cleaning', description: 'We follow detailed checklists to ensure nothing is missed.' },
        { icon: 'Clock', title: 'Flexible Scheduling', description: 'Book online 24/7. Weekly, bi-weekly, monthly, or one-time cleaning.' },
        { icon: 'Leaf', title: 'Eco-Friendly Options', description: 'Green cleaning products available upon request.' },
      ],
    },
    process: {
      title: 'How It Works',
      subtitle: 'Booking is easy',
      variant: 'horizontal',
      steps: [
        { number: 1, title: 'Book Online', description: 'Choose your service, date, and time in seconds.' },
        { number: 2, title: 'We Arrive', description: 'Your dedicated cleaner arrives on time, ready to work.' },
        { number: 3, title: 'We Clean', description: 'Thorough, detail-oriented cleaning from top to bottom.' },
        { number: 4, title: 'Enjoy', description: 'Come home to a sparkling clean space.' },
      ],
    },
    testimonials: {
      title: 'Happy Homes',
      subtitle: 'What our clients say',
      variant: 'featured',
      items: [
        { quote: 'Same cleaner every week for 2 years. She knows our home better than we do. Incredible service!', author: 'Maria Gonzalez', role: 'Weekly Client', rating: 5 },
        { quote: 'Deep cleaned before our party. Friends thought we hired a professional staging company!', author: 'Tom & Ashley Baker', role: 'One-Time Clean', rating: 5 },
        { quote: 'As a busy mom of 3, this service is a lifesaver. Worth every penny.', author: 'Jennifer Lee', role: 'Bi-Weekly Client', rating: 5 },
      ],
    },
    faq: {
      title: 'Cleaning FAQs',
      subtitle: 'Questions about our service',
      items: [
        { question: 'What\'s included in a standard cleaning?', answer: 'Dusting, vacuuming, mopping, bathroom sanitizing, kitchen cleaning, and general tidying. We can customize based on your priorities.' },
        { question: 'Do I need to provide supplies?', answer: 'No, our cleaners bring professional-grade supplies and equipment. Let us know if you prefer we use your products.' },
        { question: 'Will I have the same cleaner each time?', answer: 'Yes! We match you with a dedicated cleaner who learns your preferences and becomes familiar with your home.' },
        { question: 'What if I\'m not satisfied?', answer: 'We\'ll re-clean any areas you\'re not happy with at no extra charge. Your satisfaction is guaranteed.' },
      ],
    },
    form: {
      title: 'Book Your Cleaning',
      subtitle: 'Get instant pricing',
      fields: [
        ...baseFormFields,
        { name: 'address', label: 'Service Address', type: 'text', required: true, placeholder: '123 Main St, Miami, FL' },
        { name: 'bedrooms', label: 'Bedrooms', type: 'select', required: true, options: [
          { value: '', label: 'Select' },
          { value: '1', label: '1 Bedroom' },
          { value: '2', label: '2 Bedrooms' },
          { value: '3', label: '3 Bedrooms' },
          { value: '4', label: '4+ Bedrooms' },
        ]},
        { name: 'frequency', label: 'Frequency', type: 'select', required: true, options: [
          { value: '', label: 'Select' },
          { value: 'once', label: 'One-Time' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'biweekly', label: 'Bi-Weekly' },
          { value: 'monthly', label: 'Monthly' },
        ]},
      ],
      submitText: 'Get Instant Quote',
    },
    seo: {
      title: 'House Cleaning Miami | Professional Maid Service | Kanjona',
      description: 'Professional house cleaning in Miami. Vetted cleaners, flexible scheduling, satisfaction guaranteed. Weekly, bi-weekly, or one-time. Book online today!',
      keywords: ['house cleaning miami', 'maid service miami', 'cleaning service miami', 'home cleaning', 'deep cleaning miami'],
    },
  },

  // Landscaping
  'landscaping': {
    service: {
      id: 'landscaping',
      name: 'Landscaping',
      tagline: 'Beautiful Outdoor Living',
      description: 'Professional landscaping services',
      ctaText: 'Get a Free Design',
      phone: '(305) 555-0114',
      gradient: 'linear-gradient(135deg, #15803d, #22c55e)',
      accentColor: '#4ade80',
    },
    hero: {
      badge: 'Award-Winning Landscape Design',
      headline: 'Transform Your Outdoor Space',
      subheadline: 'Design, install, and maintain your dream landscape',
      description: 'From lush tropical gardens to modern outdoor living spaces, we create landscapes that enhance your lifestyle and property value.',
      primaryCta: 'Free Consultation',
      secondaryCta: 'View Portfolio',
      stats: [
        { value: '2,000+', label: 'Projects Completed' },
        { value: '30+', label: 'Years Experience' },
        { value: 'Award', label: 'Winning Designs' },
      ],
    },
    benefits: {
      title: 'Why Choose Our Landscaping',
      subtitle: 'Creating outdoor masterpieces',
      items: [
        { icon: 'Palette', title: 'Custom Design', description: 'Unique designs tailored to your property, style, and budget.' },
        { icon: 'Award', title: 'Expert Installation', description: 'Skilled crews with decades of experience installing landscapes.' },
        { icon: 'RefreshCw', title: 'Ongoing Maintenance', description: 'Keep your landscape beautiful with our maintenance programs.' },
        { icon: 'TrendingUp', title: 'Increase Value', description: 'Professional landscaping can increase property value by 10-15%.' },
      ],
    },
    process: {
      title: 'Our Design Process',
      subtitle: 'From vision to reality',
      variant: 'timeline',
      steps: [
        { number: 1, title: 'Consultation', description: 'We visit your property, discuss your vision, and assess the site.' },
        { number: 2, title: 'Design', description: 'Our designers create a custom plan with 3D renderings.' },
        { number: 3, title: 'Installation', description: 'Expert crews transform your space with quality materials.' },
        { number: 4, title: 'Maintenance', description: 'Optional ongoing care keeps your landscape thriving.' },
      ],
    },
    testimonials: {
      title: 'Client Transformations',
      subtitle: 'See the difference we make',
      variant: 'featured',
      items: [
        { quote: 'They turned our boring backyard into a tropical paradise. We feel like we\'re on vacation every day!', author: 'The Martinez Family', role: 'Backyard Redesign', rating: 5 },
        { quote: 'Professional, creative, and detail-oriented. Our front yard is now the envy of the neighborhood.', author: 'Robert Johnson', role: 'Front Yard Design', rating: 5 },
        { quote: 'From design to installation, everything was seamless. Worth the investment for our outdoor kitchen.', author: 'Sarah & Mike Wilson', role: 'Outdoor Living Space', rating: 5 },
      ],
    },
    faq: {
      title: 'Landscaping FAQs',
      subtitle: 'Planning your project',
      items: [
        { question: 'How much does landscaping cost?', answer: 'Costs vary widely based on scope. Basic landscaping might start at $5,000, while full outdoor living spaces can exceed $50,000. We provide detailed estimates.' },
        { question: 'When is the best time to landscape?', answer: 'In South Florida, we can landscape year-round. However, fall and winter are ideal for planting as plants establish roots before summer heat.' },
        { question: 'Do you handle irrigation systems?', answer: 'Yes, we design and install complete irrigation systems, including smart controllers for water efficiency.' },
        { question: 'What about ongoing maintenance?', answer: 'We offer weekly, bi-weekly, or monthly maintenance programs to keep your landscape looking its best year-round.' },
      ],
    },
    form: {
      title: 'Get Your Free Design',
      subtitle: 'Tell us about your project',
      fields: [
        ...baseFormFields,
        { name: 'address', label: 'Property Address', type: 'text', required: true, placeholder: '123 Main St, Miami, FL' },
        { name: 'project_type', label: 'Project Type', type: 'select', required: true, options: [
          { value: '', label: 'Select project type' },
          { value: 'full', label: 'Full Landscape Design' },
          { value: 'front', label: 'Front Yard Only' },
          { value: 'back', label: 'Backyard Only' },
          { value: 'outdoor_living', label: 'Outdoor Living Space' },
          { value: 'maintenance', label: 'Ongoing Maintenance' },
        ]},
        { name: 'description', label: 'Describe Your Vision', type: 'textarea', required: false, placeholder: 'Tell us about your dream outdoor space...' },
      ],
      submitText: 'Get Free Design',
    },
    seo: {
      title: 'Miami Landscaping | Landscape Design & Installation | Kanjona',
      description: 'Award-winning Miami landscaping company. Custom design, expert installation, ongoing maintenance. Transform your outdoor space. Free consultation!',
      keywords: ['landscaping miami', 'landscape design miami', 'landscaper miami', 'outdoor living', 'tropical landscaping'],
    },
  },

  // Pool Service
  'pool-service': {
    service: {
      id: 'pool-service',
      name: 'Pool Service',
      tagline: 'Crystal Clear Pools',
      description: 'Professional pool maintenance',
      ctaText: 'Get a Free Quote',
      phone: '(305) 555-0115',
      gradient: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
      accentColor: '#7dd3fc',
    },
    hero: {
      badge: 'Certified Pool Operators',
      headline: 'Enjoy Your Pool, Not the Work',
      subheadline: 'Professional pool cleaning and maintenance',
      description: 'Keep your pool sparkling clean and swim-ready year-round. Our certified technicians handle everything from weekly cleaning to equipment repairs.',
      primaryCta: 'Get Free Quote',
      secondaryCta: 'Call Now',
      stats: [
        { value: '3,000+', label: 'Pools Serviced' },
        { value: '15+', label: 'Years Experience' },
        { value: '99%', label: 'Client Retention' },
      ],
    },
    benefits: {
      title: 'Why Choose Our Pool Service',
      subtitle: 'Miami\'s trusted pool experts',
      items: [
        { icon: 'Droplets', title: 'Crystal Clear Water', description: 'Perfect chemical balance and filtration for water that\'s always swim-ready.' },
        { icon: 'Calendar', title: 'Reliable Service', description: 'Same day, same time, every week. You can count on us.' },
        { icon: 'Wrench', title: 'Equipment Experts', description: 'We service pumps, filters, heaters, and all pool equipment.' },
        { icon: 'Shield', title: 'Licensed & Insured', description: 'Certified pool operators with full insurance coverage.' },
      ],
    },
    process: {
      title: 'What We Do',
      subtitle: 'Comprehensive pool care',
      variant: 'horizontal',
      steps: [
        { number: 1, title: 'Test & Balance', description: 'Check and adjust chemical levels for safe, clear water.' },
        { number: 2, title: 'Skim & Brush', description: 'Remove debris and brush walls to prevent algae.' },
        { number: 3, title: 'Vacuum & Clean', description: 'Vacuum the bottom and clean the tile line.' },
        { number: 4, title: 'Inspect Equipment', description: 'Check pump, filter, and all equipment for proper operation.' },
      ],
    },
    testimonials: {
      title: 'Happy Pool Owners',
      subtitle: 'See what our clients say',
      variant: 'grid',
      items: [
        { quote: 'Best pool service we\'ve ever had. Always on time, always thorough. Our pool has never looked better!', author: 'The Garcia Family', role: 'Weekly Service', rating: 5 },
        { quote: 'They diagnosed and fixed a pump issue that two other companies missed. Saved us thousands.', author: 'Mark Thompson', role: 'Equipment Repair', rating: 5 },
        { quote: 'Reliable, professional, and fairly priced. Highly recommend!', author: 'Jennifer Wong', role: 'Monthly Service', rating: 5 },
      ],
    },
    faq: {
      title: 'Pool Service FAQs',
      subtitle: 'Questions about pool care',
      items: [
        { question: 'How often should I have my pool serviced?', answer: 'Weekly service is ideal for most residential pools. This maintains proper chemistry and prevents problems before they start.' },
        { question: 'What\'s included in weekly service?', answer: 'Chemical testing and balancing, skimming, brushing, vacuuming, filter check, and equipment inspection.' },
        { question: 'Do you service saltwater pools?', answer: 'Yes! We service all pool types including saltwater, chlorine, and mineral systems.' },
        { question: 'What about equipment repairs?', answer: 'We repair and replace pumps, filters, heaters, automation systems, and all pool equipment.' },
      ],
    },
    form: {
      title: 'Get Your Free Quote',
      subtitle: 'Pool service starting at $125/month',
      fields: [
        ...baseFormFields,
        { name: 'address', label: 'Pool Address', type: 'text', required: true, placeholder: '123 Main St, Miami, FL' },
        { name: 'pool_type', label: 'Pool Type', type: 'select', required: true, options: [
          { value: '', label: 'Select pool type' },
          { value: 'chlorine', label: 'Chlorine' },
          { value: 'saltwater', label: 'Saltwater' },
          { value: 'mineral', label: 'Mineral' },
          { value: 'unsure', label: 'Not Sure' },
        ]},
        { name: 'service', label: 'Service Needed', type: 'select', required: true, options: [
          { value: '', label: 'Select service' },
          { value: 'weekly', label: 'Weekly Maintenance' },
          { value: 'monthly', label: 'Monthly Maintenance' },
          { value: 'repair', label: 'Equipment Repair' },
          { value: 'one_time', label: 'One-Time Cleaning' },
        ]},
      ],
      submitText: 'Get Free Quote',
    },
    seo: {
      title: 'Pool Service Miami | Pool Cleaning & Maintenance | Kanjona',
      description: 'Professional pool service in Miami. Weekly cleaning, maintenance, and repairs. Certified pool operators, reliable service. Get your free quote today!',
      keywords: ['pool service miami', 'pool cleaning miami', 'pool maintenance', 'pool repair miami', 'swimming pool service'],
    },
  },

  // Home Remodeling
  'home-remodeling': {
    service: {
      id: 'home-remodeling',
      name: 'Home Remodeling',
      tagline: 'Reimagine Your Home',
      description: 'Kitchen & bath remodeling',
      ctaText: 'Get a Free Design',
      phone: '(305) 555-0116',
      gradient: 'linear-gradient(135deg, #7c3aed, #a855f7)',
      accentColor: '#c084fc',
    },
    hero: {
      badge: 'Award-Winning Designs',
      headline: 'Transform Your Living Space',
      subheadline: 'Kitchen, bathroom, and whole-home remodeling',
      description: 'From outdated to outstanding. Our design-build team creates beautiful, functional spaces that fit your lifestyle and budget.',
      primaryCta: 'Free Consultation',
      secondaryCta: 'View Projects',
      stats: [
        { value: '1,500+', label: 'Remodels Completed' },
        { value: '20+', label: 'Years Experience' },
        { value: 'NKBA', label: 'Certified Designers' },
      ],
    },
    benefits: {
      title: 'Why Remodel With Us',
      subtitle: 'Design-build excellence',
      items: [
        { icon: 'Palette', title: 'In-House Design', description: 'Certified designers create custom plans tailored to your style.' },
        { icon: 'Shield', title: 'Licensed & Bonded', description: 'Fully licensed contractor with comprehensive bond and insurance.' },
        { icon: 'Clock', title: 'On-Time Completion', description: 'We stick to schedules. Your project will finish when we say.' },
        { icon: 'BadgeDollarSign', title: 'Fixed Pricing', description: 'No surprises. Your quote is your price, guaranteed.' },
      ],
    },
    process: {
      title: 'Our Remodeling Process',
      subtitle: 'Stress-free transformation',
      variant: 'timeline',
      steps: [
        { number: 1, title: 'Design Consultation', description: 'Discuss your vision, needs, and budget with our design team.' },
        { number: 2, title: 'Custom Design', description: 'Receive 3D renderings and detailed plans for your approval.' },
        { number: 3, title: 'Expert Build', description: 'Our skilled craftsmen bring the design to life.' },
        { number: 4, title: 'Final Reveal', description: 'Walk through your transformed space with our team.' },
      ],
    },
    testimonials: {
      title: 'Client Transformations',
      subtitle: 'See the difference',
      variant: 'featured',
      items: [
        { quote: 'Our kitchen went from 1980s disaster to modern dream. The design team nailed exactly what we wanted!', author: 'Sarah & Mark Johnson', role: 'Kitchen Remodel', rating: 5 },
        { quote: 'Bathroom remodel was done in 3 weeks with zero mess. These guys are true professionals.', author: 'Patricia Williams', role: 'Bathroom Remodel', rating: 5 },
        { quote: 'Whole home renovation while we lived in it. They made it painless. Incredible work.', author: 'The Chen Family', role: 'Whole Home Remodel', rating: 5 },
      ],
    },
    faq: {
      title: 'Remodeling FAQs',
      subtitle: 'Plan your project',
      items: [
        { question: 'How much does a kitchen remodel cost?', answer: 'Kitchen remodels typically range from $25,000 for basic updates to $100,000+ for luxury renovations. We provide detailed estimates based on your specific project.' },
        { question: 'How long does a bathroom remodel take?', answer: 'Most bathroom remodels take 2-4 weeks depending on scope. Full gut renovations take longer than cosmetic updates.' },
        { question: 'Can we stay in our home during renovation?', answer: 'Usually yes! We create project plans that minimize disruption. For major renovations, we may recommend temporary relocation.' },
        { question: 'Do you handle permits?', answer: 'Yes, we manage all permits and inspections. We know local codes and ensure everything is done properly.' },
      ],
    },
    form: {
      title: 'Start Your Transformation',
      subtitle: 'Free design consultation',
      fields: [
        ...baseFormFields,
        { name: 'address', label: 'Property Address', type: 'text', required: true, placeholder: '123 Main St, Miami, FL' },
        { name: 'project', label: 'Project Type', type: 'select', required: true, options: [
          { value: '', label: 'Select project' },
          { value: 'kitchen', label: 'Kitchen Remodel' },
          { value: 'bathroom', label: 'Bathroom Remodel' },
          { value: 'whole_home', label: 'Whole Home' },
          { value: 'addition', label: 'Home Addition' },
          { value: 'other', label: 'Other' },
        ]},
      ],
      submitText: 'Get Free Consultation',
    },
    seo: {
      title: 'Home Remodeling Miami | Kitchen & Bath Renovation | Kanjona',
      description: 'Miami home remodeling experts. Kitchen, bathroom, and whole-home renovations. Award-winning design, quality craftsmanship. Free consultation!',
      keywords: ['home remodeling miami', 'kitchen remodel miami', 'bathroom remodel miami', 'renovation contractor', 'home renovation'],
    },
  },

  // Locksmith
  'locksmith': {
    service: {
      id: 'locksmith',
      name: 'Locksmith',
      tagline: 'Fast, Reliable Lock Services',
      description: '24/7 locksmith services',
      ctaText: 'Call Now',
      phone: '(305) 555-0117',
      gradient: 'linear-gradient(135deg, #64748b, #94a3b8)',
      accentColor: '#94a3b8',
    },
    hero: {
      badge: '24/7 Emergency Service',
      headline: 'Locked Out? We\'re On Our Way',
      subheadline: 'Fast, professional locksmith services',
      description: 'Locked out of your car, home, or business? Our licensed locksmiths arrive fast with the tools to solve any lock problem.',
      primaryCta: 'Call Now',
      secondaryCta: 'Get a Quote',
      stats: [
        { value: '15 min', label: 'Avg Response' },
        { value: '24/7', label: 'Availability' },
        { value: '50,000+', label: 'Customers Helped' },
      ],
    },
    benefits: {
      title: 'Why Call Us',
      subtitle: 'Your trusted locksmith',
      items: [
        { icon: 'Zap', title: '15-Minute Response', description: 'We\'re fast. Average arrival time is just 15 minutes.' },
        { icon: 'Clock', title: '24/7 Availability', description: 'Day or night, we\'re here when you need us.' },
        { icon: 'Shield', title: 'Licensed & Insured', description: 'Professional locksmiths you can trust.' },
        { icon: 'Receipt', title: 'Upfront Pricing', description: 'Know the cost before we start. No surprises.' },
      ],
    },
    process: {
      title: 'How It Works',
      subtitle: 'Simple, fast service',
      variant: 'horizontal',
      steps: [
        { number: 1, title: 'Call Us', description: 'Tell us your location and the problem.' },
        { number: 2, title: 'We Dispatch', description: 'A locksmith is sent to you immediately.' },
        { number: 3, title: 'Quote & Approve', description: 'You receive an upfront price before work begins.' },
        { number: 4, title: 'Problem Solved', description: 'We solve your lock issue quickly and professionally.' },
      ],
    },
    testimonials: {
      title: 'Customer Stories',
      subtitle: 'Fast help when needed',
      variant: 'grid',
      items: [
        { quote: 'Locked myself out at midnight. They arrived in 10 minutes and got me in quickly. Lifesavers!', author: 'Jessica Martin', role: 'Home Lockout', rating: 5 },
        { quote: 'Lost my car key with no spare. They made a new one on the spot. Amazing service!', author: 'Carlos Rodriguez', role: 'Car Key Replacement', rating: 5 },
        { quote: 'Upgraded all our office locks. Professional, efficient, and great prices.', author: 'Amanda Foster', role: 'Commercial Rekey', rating: 5 },
      ],
    },
    faq: {
      title: 'Locksmith FAQs',
      subtitle: 'Common questions',
      items: [
        { question: 'How fast can you get here?', answer: 'Our average response time is 15-20 minutes within our service area. We dispatch the closest available locksmith.' },
        { question: 'Can you make car keys?', answer: 'Yes! We make and program keys for most vehicles, including transponder and smart keys.' },
        { question: 'Do you rekey or replace locks?', answer: 'Both! Rekeying is often more economical if your locks are in good condition. We\'ll advise on the best option.' },
        { question: 'What forms of payment do you accept?', answer: 'We accept cash, all major credit cards, and most digital payment methods.' },
      ],
    },
    form: {
      title: 'Request Service',
      subtitle: 'Or call for immediate help',
      fields: [
        ...baseFormFields,
        { name: 'address', label: 'Service Location', type: 'text', required: true, placeholder: '123 Main St, Miami, FL' },
        { name: 'service', label: 'Service Needed', type: 'select', required: true, options: [
          { value: '', label: 'Select service' },
          { value: 'home_lockout', label: 'Home Lockout' },
          { value: 'car_lockout', label: 'Car Lockout' },
          { value: 'rekey', label: 'Lock Rekey' },
          { value: 'new_locks', label: 'New Lock Installation' },
          { value: 'car_key', label: 'Car Key Replacement' },
        ]},
      ],
      submitText: 'Request Service',
    },
    seo: {
      title: 'Miami Locksmith | 24/7 Emergency Lock Service | Kanjona',
      description: '24/7 Miami locksmith service. Home, car, and business lockouts. Fast 15-minute response, upfront pricing. Licensed and insured. Call now!',
      keywords: ['locksmith miami', '24 hour locksmith', 'car lockout miami', 'emergency locksmith', 'lock change miami'],
    },
  },

  // Pressure Washing
  'pressure-washing': {
    service: {
      id: 'pressure-washing',
      name: 'Pressure Washing',
      tagline: 'Restore Your Property\'s Beauty',
      description: 'Professional pressure cleaning',
      ctaText: 'Get a Free Quote',
      phone: '(305) 555-0118',
      gradient: 'linear-gradient(135deg, #0891b2, #06b6d4)',
      accentColor: '#22d3ee',
    },
    hero: {
      badge: 'Eco-Friendly Cleaning',
      headline: 'Make It Look New Again',
      subheadline: 'Professional pressure washing services',
      description: 'Years of dirt, mold, and stains removed in hours. We clean driveways, roofs, decks, fences, and more - safely and effectively.',
      primaryCta: 'Get Free Quote',
      secondaryCta: 'See Results',
      stats: [
        { value: '10,000+', label: 'Properties Cleaned' },
        { value: '5.0★', label: 'Customer Rating' },
        { value: 'Same Day', label: 'Service Available' },
      ],
    },
    benefits: {
      title: 'Why Choose Us',
      subtitle: 'Professional results guaranteed',
      items: [
        { icon: 'Sparkles', title: 'Dramatic Results', description: 'See the difference immediately. We restore surfaces to like-new condition.' },
        { icon: 'Shield', title: 'Safe Techniques', description: 'We use the right pressure and methods for each surface to prevent damage.' },
        { icon: 'Leaf', title: 'Eco-Friendly', description: 'Biodegradable cleaning solutions that are safe for your landscape.' },
        { icon: 'ThumbsUp', title: 'Satisfaction Guaranteed', description: 'Not happy? We\'ll re-clean at no charge.' },
      ],
    },
    process: {
      title: 'Our Process',
      subtitle: 'Professional cleaning made easy',
      variant: 'horizontal',
      steps: [
        { number: 1, title: 'Free Quote', description: 'We assess your property and provide an upfront price.' },
        { number: 2, title: 'Prep & Protect', description: 'We prepare the area and protect plants and surfaces.' },
        { number: 3, title: 'Clean', description: 'Professional-grade equipment removes years of buildup.' },
        { number: 4, title: 'Inspect', description: 'We do a final walkthrough to ensure your satisfaction.' },
      ],
    },
    testimonials: {
      title: 'Before & After Results',
      subtitle: 'See what our customers say',
      variant: 'featured',
      items: [
        { quote: 'My driveway looked 20 years younger! The before and after was unbelievable.', author: 'Robert Martinez', role: 'Driveway Cleaning', rating: 5 },
        { quote: 'Roof looked brand new after years of black streaks. Professional and careful work.', author: 'Linda Thompson', role: 'Roof Cleaning', rating: 5 },
        { quote: 'They cleaned our entire commercial building exterior. Incredible transformation!', author: 'James Wilson', role: 'Commercial Cleaning', rating: 5 },
      ],
    },
    faq: {
      title: 'Pressure Washing FAQs',
      subtitle: 'Common questions',
      items: [
        { question: 'Is pressure washing safe for all surfaces?', answer: 'Different surfaces require different techniques. We use soft washing for roofs and delicate surfaces, and higher pressure for concrete. We never damage surfaces.' },
        { question: 'How often should I pressure wash?', answer: 'Most homes benefit from annual cleaning. High-traffic areas like driveways may need more frequent cleaning.' },
        { question: 'Will it damage my plants?', answer: 'No! We pre-wet and protect plants. Our cleaning solutions are biodegradable and plant-safe.' },
        { question: 'How long does it take?', answer: 'A typical driveway takes 1-2 hours. Whole-house exterior might take half a day. We\'ll give you a time estimate.' },
      ],
    },
    form: {
      title: 'Get Your Free Quote',
      subtitle: 'Instant online estimates',
      fields: [
        ...baseFormFields,
        { name: 'address', label: 'Property Address', type: 'text', required: true, placeholder: '123 Main St, Miami, FL' },
        { name: 'surface', label: 'What Needs Cleaning?', type: 'select', required: true, options: [
          { value: '', label: 'Select surface' },
          { value: 'driveway', label: 'Driveway/Sidewalk' },
          { value: 'roof', label: 'Roof' },
          { value: 'house', label: 'House Exterior' },
          { value: 'deck', label: 'Deck/Patio' },
          { value: 'multiple', label: 'Multiple Areas' },
        ]},
      ],
      submitText: 'Get Free Quote',
    },
    seo: {
      title: 'Pressure Washing Miami | Power Washing Service | Kanjona',
      description: 'Professional pressure washing in Miami. Driveways, roofs, decks, and more. Eco-friendly, satisfaction guaranteed. Get your free quote today!',
      keywords: ['pressure washing miami', 'power washing miami', 'driveway cleaning', 'roof cleaning miami', 'exterior cleaning'],
    },
  },

  // Water Damage Restoration
  'water-damage-restoration': {
    service: {
      id: 'water-damage-restoration',
      name: 'Water Damage Restoration',
      tagline: 'Fast Response, Full Restoration',
      description: '24/7 water damage services',
      ctaText: 'Call Now',
      phone: '(305) 555-0119',
      gradient: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
      accentColor: '#60a5fa',
    },
    hero: {
      badge: '24/7 Emergency Response',
      headline: 'Water Damage? Act Fast',
      subheadline: 'Professional water damage restoration',
      description: 'Every minute counts with water damage. Our certified technicians respond within 60 minutes to minimize damage and get your property back to normal.',
      primaryCta: 'Emergency Call',
      secondaryCta: 'Free Inspection',
      stats: [
        { value: '60 min', label: 'Response Time' },
        { value: '24/7', label: 'Emergency Service' },
        { value: 'IICRC', label: 'Certified' },
      ],
    },
    benefits: {
      title: 'Why Choose Us',
      subtitle: 'Fast, professional restoration',
      items: [
        { icon: 'Zap', title: '60-Minute Response', description: 'We understand urgency. Our teams respond fast to minimize damage.' },
        { icon: 'Award', title: 'IICRC Certified', description: 'Industry-certified technicians using proven restoration methods.' },
        { icon: 'FileCheck', title: 'Insurance Experts', description: 'We work directly with insurance companies and help with claims.' },
        { icon: 'Shield', title: 'Full Restoration', description: 'From water extraction to rebuild, we handle the entire process.' },
      ],
    },
    process: {
      title: 'Our Restoration Process',
      subtitle: 'Proven methods for complete recovery',
      variant: 'timeline',
      steps: [
        { number: 1, title: 'Emergency Response', description: 'We arrive fast, assess damage, and stop the source.' },
        { number: 2, title: 'Water Extraction', description: 'Industrial equipment removes standing water quickly.' },
        { number: 3, title: 'Drying & Dehumidification', description: 'Professional drying prevents mold and further damage.' },
        { number: 4, title: 'Restoration', description: 'We repair and restore your property to pre-loss condition.' },
      ],
    },
    testimonials: {
      title: 'Recovery Stories',
      subtitle: 'From disaster to restored',
      variant: 'featured',
      items: [
        { quote: 'Pipe burst at 2am. They were here in 45 minutes and saved our hardwood floors. Amazing response!', author: 'The Martinez Family', role: 'Pipe Burst', rating: 5 },
        { quote: 'After the hurricane, they restored our entire first floor. Handled everything including insurance.', author: 'Robert Thompson', role: 'Flood Damage', rating: 5 },
        { quote: 'Water heater flooded our basement. They extracted, dried, and restored it perfectly.', author: 'Jennifer Lee', role: 'Water Heater Leak', rating: 5 },
      ],
    },
    faq: {
      title: 'Water Damage FAQs',
      subtitle: 'Important information',
      items: [
        { question: 'How fast should I act on water damage?', answer: 'Immediately! Mold can begin growing within 24-48 hours. The faster you act, the less damage and cost.' },
        { question: 'Will my insurance cover water damage?', answer: 'Most homeowner policies cover sudden water damage (burst pipes). We work with all insurers and help with the claims process.' },
        { question: 'How long does restoration take?', answer: 'Drying typically takes 3-5 days. Full restoration depends on the extent of damage but we work efficiently.' },
        { question: 'Do you handle mold too?', answer: 'Yes! If we find mold during restoration, we have certified mold remediation specialists to handle it.' },
      ],
    },
    form: {
      title: 'Get Emergency Help Now',
      subtitle: 'Or call for immediate response',
      fields: [
        ...baseFormFields,
        { name: 'address', label: 'Property Address', type: 'text', required: true, placeholder: '123 Main St, Miami, FL' },
        { name: 'damage_type', label: 'Type of Damage', type: 'select', required: true, options: [
          { value: '', label: 'Select type' },
          { value: 'pipe', label: 'Burst Pipe' },
          { value: 'appliance', label: 'Appliance Leak' },
          { value: 'roof', label: 'Roof Leak' },
          { value: 'flood', label: 'Flooding' },
          { value: 'sewage', label: 'Sewage Backup' },
        ]},
        { name: 'description', label: 'Describe the Situation', type: 'textarea', required: false, placeholder: 'Tell us what happened...' },
      ],
      submitText: 'Get Emergency Help',
    },
    seo: {
      title: 'Water Damage Restoration Miami | 24/7 Emergency | Kanjona',
      description: '24/7 water damage restoration in Miami. 60-minute response, IICRC certified. We handle extraction, drying, and full restoration. Call now!',
      keywords: ['water damage restoration miami', 'water damage repair', 'flood damage miami', 'emergency water removal', 'water extraction'],
    },
  },

  // Mold Remediation
  'mold-remediation': {
    service: {
      id: 'mold-remediation',
      name: 'Mold Remediation',
      tagline: 'Breathe Easy Again',
      description: 'Professional mold removal',
      ctaText: 'Free Inspection',
      phone: '(305) 555-0120',
      gradient: 'linear-gradient(135deg, #059669, #10b981)',
      accentColor: '#34d399',
    },
    hero: {
      badge: 'Certified Mold Specialists',
      headline: 'Mold Problem? We\'ll Eliminate It',
      subheadline: 'Safe, thorough mold remediation',
      description: 'Mold threatens your health and property. Our certified technicians identify, contain, and eliminate mold at its source - guaranteed.',
      primaryCta: 'Free Inspection',
      secondaryCta: 'Call Now',
      stats: [
        { value: '5,000+', label: 'Projects Completed' },
        { value: '100%', label: 'Mold Eliminated' },
        { value: 'Certified', label: 'Technicians' },
      ],
    },
    benefits: {
      title: 'Why Choose Our Mold Remediation',
      subtitle: 'Safe, effective, guaranteed',
      items: [
        { icon: 'ShieldCheck', title: 'Certified Experts', description: 'IICRC certified mold remediation specialists.' },
        { icon: 'Wind', title: 'Air Quality Testing', description: 'We test air quality before and after to verify results.' },
        { icon: 'Target', title: 'Source Elimination', description: 'We don\'t just clean mold - we eliminate the moisture source.' },
        { icon: 'FileCheck', title: 'Insurance Assistance', description: 'We work with your insurance and provide documentation.' },
      ],
    },
    process: {
      title: 'Our Remediation Process',
      subtitle: 'Proven methods for complete removal',
      variant: 'timeline',
      steps: [
        { number: 1, title: 'Inspection & Testing', description: 'Thorough inspection and air quality testing.' },
        { number: 2, title: 'Containment', description: 'We isolate affected areas to prevent spread.' },
        { number: 3, title: 'Remediation', description: 'Safe removal of mold and contaminated materials.' },
        { number: 4, title: 'Verification', description: 'Post-remediation testing confirms complete removal.' },
      ],
    },
    testimonials: {
      title: 'Success Stories',
      subtitle: 'Mold-free homes',
      variant: 'grid',
      items: [
        { quote: 'Found black mold in our bathroom. They removed it completely and fixed the moisture issue. Great work!', author: 'Maria Santos', role: 'Bathroom Mold', rating: 5 },
        { quote: 'Attic mold from a roof leak. They cleaned everything and our air quality test came back perfect.', author: 'David Chen', role: 'Attic Remediation', rating: 5 },
        { quote: 'Professional, thorough, and they explained everything. No more musty smell!', author: 'Jennifer Williams', role: 'Basement Mold', rating: 5 },
      ],
    },
    faq: {
      title: 'Mold Remediation FAQs',
      subtitle: 'Common questions',
      items: [
        { question: 'Is mold dangerous?', answer: 'Yes, certain molds can cause respiratory issues, allergies, and other health problems. Black mold (Stachybotrys) is particularly concerning.' },
        { question: 'How do I know if I have mold?', answer: 'Signs include musty odors, visible growth, water stains, and allergy symptoms that worsen at home. We offer free inspections.' },
        { question: 'Can I remove mold myself?', answer: 'Small areas (under 10 sq ft) might be DIY-able, but larger infestations require professional remediation to ensure complete removal.' },
        { question: 'How long does remediation take?', answer: 'Typically 1-5 days depending on the extent of contamination. We provide a timeline after inspection.' },
      ],
    },
    form: {
      title: 'Schedule Free Inspection',
      subtitle: 'Find out if you have a mold problem',
      fields: [
        ...baseFormFields,
        { name: 'address', label: 'Property Address', type: 'text', required: true, placeholder: '123 Main St, Miami, FL' },
        { name: 'symptoms', label: 'What are you experiencing?', type: 'select', required: true, options: [
          { value: '', label: 'Select symptoms' },
          { value: 'visible', label: 'Visible Mold Growth' },
          { value: 'smell', label: 'Musty Odor' },
          { value: 'health', label: 'Health Symptoms' },
          { value: 'water', label: 'Recent Water Damage' },
          { value: 'inspection', label: 'Just Want Inspection' },
        ]},
      ],
      submitText: 'Get Free Inspection',
    },
    seo: {
      title: 'Mold Remediation Miami | Mold Removal & Testing | Kanjona',
      description: 'Certified mold remediation in Miami. Free inspection, safe removal, air quality testing. Eliminate mold completely. Call for free inspection!',
      keywords: ['mold remediation miami', 'mold removal miami', 'black mold removal', 'mold testing', 'mold inspection miami'],
    },
  },

  // Flooring
  'flooring': {
    service: {
      id: 'flooring',
      name: 'Flooring',
      tagline: 'Transform Your Floors',
      description: 'Flooring installation & refinishing',
      ctaText: 'Get a Free Quote',
      phone: '(305) 555-0121',
      gradient: 'linear-gradient(135deg, #92400e, #b45309)',
      accentColor: '#d97706',
    },
    hero: {
      badge: 'Expert Flooring Installers',
      headline: 'Beautiful Floors, Expert Installation',
      subheadline: 'Hardwood, tile, laminate, and more',
      description: 'Transform any room with new flooring. From classic hardwood to modern luxury vinyl, we install all types with precision and care.',
      primaryCta: 'Get Free Quote',
      secondaryCta: 'View Options',
      stats: [
        { value: '10,000+', label: 'Floors Installed' },
        { value: '25+', label: 'Years Experience' },
        { value: '5.0★', label: 'Customer Rating' },
      ],
    },
    benefits: {
      title: 'Why Choose Our Flooring',
      subtitle: 'Quality installation guaranteed',
      items: [
        { icon: 'Palette', title: 'Wide Selection', description: 'Hardwood, tile, laminate, vinyl, carpet - we do it all.' },
        { icon: 'Award', title: 'Expert Installers', description: 'Factory-trained installers with decades of experience.' },
        { icon: 'BadgeDollarSign', title: 'Competitive Pricing', description: 'Quality materials and installation at fair prices.' },
        { icon: 'Shield', title: 'Warranty Protection', description: 'Manufacturer warranties plus our installation guarantee.' },
      ],
    },
    process: {
      title: 'Our Installation Process',
      subtitle: 'From selection to completion',
      variant: 'horizontal',
      steps: [
        { number: 1, title: 'Consultation', description: 'Discuss your needs and see our flooring options.' },
        { number: 2, title: 'Measurement', description: 'We measure your space and provide an exact quote.' },
        { number: 3, title: 'Installation', description: 'Professional installation with attention to detail.' },
        { number: 4, title: 'Final Walkthrough', description: 'We ensure you\'re 100% satisfied.' },
      ],
    },
    testimonials: {
      title: 'Happy Customers',
      subtitle: 'See what clients say',
      variant: 'featured',
      items: [
        { quote: 'They installed hardwood throughout our entire house. Flawless work and the floors are gorgeous!', author: 'The Garcia Family', role: 'Hardwood Installation', rating: 5 },
        { quote: 'Tile in kitchen and bathrooms looks amazing. Clean, professional work.', author: 'Patricia Anderson', role: 'Tile Installation', rating: 5 },
        { quote: 'Refinished our 50-year-old hardwood floors. They look brand new!', author: 'Robert Thompson', role: 'Floor Refinishing', rating: 5 },
      ],
    },
    faq: {
      title: 'Flooring FAQs',
      subtitle: 'Common questions',
      items: [
        { question: 'What type of flooring is best?', answer: 'It depends on the room and your lifestyle. Hardwood is classic but requires maintenance. LVP is durable and water-resistant. We\'ll help you choose.' },
        { question: 'How long does installation take?', answer: 'A typical room takes 1-2 days. Whole house installations might take a week. We\'ll give you a timeline.' },
        { question: 'Do you remove old flooring?', answer: 'Yes, we handle removal and disposal of existing flooring as part of our service.' },
        { question: 'Can hardwood floors be refinished?', answer: 'Yes! We refinish hardwood floors to restore their original beauty. Much more economical than replacement.' },
      ],
    },
    form: {
      title: 'Get Your Free Quote',
      subtitle: 'Tell us about your flooring project',
      fields: [
        ...baseFormFields,
        { name: 'address', label: 'Property Address', type: 'text', required: true, placeholder: '123 Main St, Miami, FL' },
        { name: 'flooring_type', label: 'Flooring Type', type: 'select', required: true, options: [
          { value: '', label: 'Select flooring' },
          { value: 'hardwood', label: 'Hardwood' },
          { value: 'tile', label: 'Tile' },
          { value: 'laminate', label: 'Laminate' },
          { value: 'lvp', label: 'Luxury Vinyl' },
          { value: 'carpet', label: 'Carpet' },
          { value: 'refinish', label: 'Refinishing' },
        ]},
      ],
      submitText: 'Get Free Quote',
    },
    seo: {
      title: 'Flooring Installation Miami | Hardwood, Tile, Vinyl | Kanjona',
      description: 'Professional flooring installation in Miami. Hardwood, tile, laminate, luxury vinyl. 25+ years experience. Free quotes, quality guaranteed!',
      keywords: ['flooring miami', 'hardwood floor installation', 'tile installation miami', 'flooring contractor', 'floor refinishing'],
    },
  },

  // Painting
  'painting': {
    service: {
      id: 'painting',
      name: 'Painting',
      tagline: 'Transform Your Space',
      description: 'Interior & exterior painting',
      ctaText: 'Get a Free Estimate',
      phone: '(305) 555-0122',
      gradient: 'linear-gradient(135deg, #7c3aed, #a855f7)',
      accentColor: '#c084fc',
    },
    hero: {
      badge: 'Licensed Professional Painters',
      headline: 'Expert Painting That Lasts',
      subheadline: 'Interior and exterior painting services',
      description: 'A fresh coat of paint transforms any space. Our professional painters deliver flawless results using premium materials and meticulous technique.',
      primaryCta: 'Free Estimate',
      secondaryCta: 'Call Now',
      stats: [
        { value: '8,000+', label: 'Projects Completed' },
        { value: '20+', label: 'Years Experience' },
        { value: '100%', label: 'Satisfaction' },
      ],
    },
    benefits: {
      title: 'Why Choose Our Painters',
      subtitle: 'Quality that shows',
      items: [
        { icon: 'Paintbrush', title: 'Expert Craftsmanship', description: 'Skilled painters with attention to detail and clean lines.' },
        { icon: 'Palette', title: 'Color Consultation', description: 'Help choosing the perfect colors for your space.' },
        { icon: 'Shield', title: 'Premium Materials', description: 'We use top-quality paints that look better and last longer.' },
        { icon: 'Sparkles', title: 'Clean & Careful', description: 'We protect your furniture and leave your space spotless.' },
      ],
    },
    process: {
      title: 'Our Painting Process',
      subtitle: 'Professional from start to finish',
      variant: 'horizontal',
      steps: [
        { number: 1, title: 'Estimate', description: 'Free on-site estimate with color consultation.' },
        { number: 2, title: 'Preparation', description: 'Proper prep including patching, sanding, and priming.' },
        { number: 3, title: 'Painting', description: 'Expert application with premium paints.' },
        { number: 4, title: 'Inspection', description: 'Final walkthrough ensures your satisfaction.' },
      ],
    },
    testimonials: {
      title: 'Client Reviews',
      subtitle: 'See the difference',
      variant: 'grid',
      items: [
        { quote: 'Painted our entire interior. Perfect lines, no drips, and they finished ahead of schedule!', author: 'Sarah Martinez', role: 'Interior Painting', rating: 5 },
        { quote: 'Exterior paint job looks incredible. The prep work they did made all the difference.', author: 'Michael Chen', role: 'Exterior Painting', rating: 5 },
        { quote: 'Cabinet painting turned our kitchen around. Looks like brand new cabinets!', author: 'Lisa Thompson', role: 'Cabinet Painting', rating: 5 },
      ],
    },
    faq: {
      title: 'Painting FAQs',
      subtitle: 'Common questions',
      items: [
        { question: 'How long does painting take?', answer: 'Interior rooms typically take 1-2 days each. Whole house exterior might take a week. We provide an accurate timeline.' },
        { question: 'What paint brands do you use?', answer: 'We use premium paints from Sherwin-Williams, Benjamin Moore, and others. Quality paint means better coverage and durability.' },
        { question: 'Do I need to move furniture?', answer: 'No, we handle all furniture moving and covering. We protect everything and put it back when done.' },
        { question: 'How long does exterior paint last?', answer: 'Quality exterior paint lasts 7-10 years with proper preparation. Cheap paint might only last 3-4 years.' },
      ],
    },
    form: {
      title: 'Get Your Free Estimate',
      subtitle: 'No obligation quote',
      fields: [
        ...baseFormFields,
        { name: 'address', label: 'Property Address', type: 'text', required: true, placeholder: '123 Main St, Miami, FL' },
        { name: 'project', label: 'Project Type', type: 'select', required: true, options: [
          { value: '', label: 'Select project' },
          { value: 'interior', label: 'Interior Painting' },
          { value: 'exterior', label: 'Exterior Painting' },
          { value: 'cabinet', label: 'Cabinet Painting' },
          { value: 'commercial', label: 'Commercial' },
          { value: 'both', label: 'Interior & Exterior' },
        ]},
      ],
      submitText: 'Get Free Estimate',
    },
    seo: {
      title: 'House Painters Miami | Interior & Exterior Painting | Kanjona',
      description: 'Professional painters in Miami. Interior, exterior, and cabinet painting. Premium materials, expert craftsmanship. Free estimates!',
      keywords: ['painters miami', 'house painting miami', 'interior painting', 'exterior painting miami', 'painting contractor'],
    },
  },

  // Windows & Doors
  'windows-doors': {
    service: {
      id: 'windows-doors',
      name: 'Windows & Doors',
      tagline: 'Upgrade Your Home',
      description: 'Window & door installation',
      ctaText: 'Get a Free Quote',
      phone: '(305) 555-0123',
      gradient: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
      accentColor: '#38bdf8',
    },
    hero: {
      badge: 'Impact Window Specialists',
      headline: 'Hurricane-Ready Windows & Doors',
      subheadline: 'Impact-rated products, expert installation',
      description: 'Protect your home and family with impact windows and doors. Energy efficient, noise-reducing, and built to withstand Miami storms.',
      primaryCta: 'Get Free Quote',
      secondaryCta: 'Schedule Consultation',
      stats: [
        { value: '15,000+', label: 'Windows Installed' },
        { value: '25+', label: 'Years Experience' },
        { value: 'Hurricane', label: 'Rated Products' },
      ],
    },
    benefits: {
      title: 'Why Upgrade Your Windows',
      subtitle: 'Protection and efficiency',
      items: [
        { icon: 'Shield', title: 'Hurricane Protection', description: 'Impact-rated windows and doors protect your home from storms.' },
        { icon: 'Thermometer', title: 'Energy Savings', description: 'Lower energy bills with better insulation and UV protection.' },
        { icon: 'Volume2', title: 'Noise Reduction', description: 'Significantly reduce outside noise for a quieter home.' },
        { icon: 'TrendingUp', title: 'Home Value', description: 'Impact windows increase your property value and lower insurance.' },
      ],
    },
    process: {
      title: 'Our Installation Process',
      subtitle: 'From quote to protection',
      variant: 'timeline',
      steps: [
        { number: 1, title: 'Consultation', description: 'We measure your openings and discuss your options.' },
        { number: 2, title: 'Selection', description: 'Choose from our wide range of styles and manufacturers.' },
        { number: 3, title: 'Permits', description: 'We handle all necessary permits and approvals.' },
        { number: 4, title: 'Installation', description: 'Professional installation with minimal disruption.' },
      ],
    },
    testimonials: {
      title: 'Protected Homes',
      subtitle: 'Client experiences',
      variant: 'featured',
      items: [
        { quote: 'Our new impact windows survived Hurricane Irma without a scratch. Best investment ever!', author: 'The Martinez Family', role: 'Whole House Windows', rating: 5 },
        { quote: 'Noticed the difference in our electric bill immediately. House is much quieter too.', author: 'Robert Johnson', role: 'Window Upgrade', rating: 5 },
        { quote: 'Insurance dropped by 40% after installing impact windows. They pay for themselves!', author: 'Sarah Chen', role: 'Impact Windows & Doors', rating: 5 },
      ],
    },
    faq: {
      title: 'Windows & Doors FAQs',
      subtitle: 'Common questions',
      items: [
        { question: 'Why should I get impact windows?', answer: 'Impact windows protect against hurricanes, reduce energy costs, lower insurance, increase home value, and reduce outside noise.' },
        { question: 'How much can I save on insurance?', answer: 'Most homeowners see 20-40% reduction in windstorm insurance premiums with impact windows throughout the home.' },
        { question: 'How long does installation take?', answer: 'Most whole-house installations are completed in 1-2 days. We work efficiently to minimize disruption.' },
        { question: 'Do you handle permits?', answer: 'Yes! We pull all necessary permits and schedule inspections as required by code.' },
      ],
    },
    form: {
      title: 'Get Your Free Quote',
      subtitle: 'No obligation estimate',
      fields: [
        ...baseFormFields,
        { name: 'address', label: 'Property Address', type: 'text', required: true, placeholder: '123 Main St, Miami, FL' },
        { name: 'project', label: 'Project Type', type: 'select', required: true, options: [
          { value: '', label: 'Select project' },
          { value: 'windows', label: 'Windows Only' },
          { value: 'doors', label: 'Doors Only' },
          { value: 'both', label: 'Windows & Doors' },
          { value: 'sliding', label: 'Sliding Glass Doors' },
          { value: 'entry', label: 'Entry Door' },
        ]},
      ],
      submitText: 'Get Free Quote',
    },
    seo: {
      title: 'Impact Windows Miami | Hurricane Windows & Doors | Kanjona',
      description: 'Impact windows and doors in Miami. Hurricane protection, energy efficiency, insurance savings. 25+ years experience. Free quotes!',
      keywords: ['impact windows miami', 'hurricane windows', 'impact doors miami', 'window replacement', 'sliding glass doors miami'],
    },
  },

  // Fencing
  'fencing': {
    service: {
      id: 'fencing',
      name: 'Fencing',
      tagline: 'Define Your Property',
      description: 'Professional fence installation',
      ctaText: 'Get a Free Quote',
      phone: '(305) 555-0124',
      gradient: 'linear-gradient(135deg, #65a30d, #84cc16)',
      accentColor: '#a3e635',
    },
    hero: {
      badge: 'Licensed Fence Contractors',
      headline: 'Quality Fences Built to Last',
      subheadline: 'Wood, vinyl, aluminum, and chain link',
      description: 'Add privacy, security, and curb appeal with a professionally installed fence. We build fences that withstand Miami weather and look great for years.',
      primaryCta: 'Free Quote',
      secondaryCta: 'View Styles',
      stats: [
        { value: '5,000+', label: 'Fences Installed' },
        { value: '20+', label: 'Years Experience' },
        { value: 'Licensed', label: '& Insured' },
      ],
    },
    benefits: {
      title: 'Why Choose Our Fencing',
      subtitle: 'Quality fences, expert installation',
      items: [
        { icon: 'Shield', title: 'Privacy & Security', description: 'Keep your property private and your family safe.' },
        { icon: 'Palette', title: 'Style Options', description: 'Wood, vinyl, aluminum, chain link - find your perfect style.' },
        { icon: 'Award', title: 'Quality Materials', description: 'Premium materials built to withstand Florida weather.' },
        { icon: 'Clock', title: 'Fast Installation', description: 'Most fences installed in 1-3 days.' },
      ],
    },
    process: {
      title: 'Our Process',
      subtitle: 'Simple fence installation',
      variant: 'horizontal',
      steps: [
        { number: 1, title: 'Free Quote', description: 'We measure your property and discuss options.' },
        { number: 2, title: 'Material Selection', description: 'Choose your style, material, and height.' },
        { number: 3, title: 'Utility Marking', description: 'We call 811 to mark underground utilities.' },
        { number: 4, title: 'Installation', description: 'Professional installation in 1-3 days.' },
      ],
    },
    testimonials: {
      title: 'Happy Homeowners',
      subtitle: 'See our work',
      variant: 'grid',
      items: [
        { quote: 'Beautiful wood fence installed in 2 days. Looks amazing and built solid!', author: 'Mike Rodriguez', role: 'Wood Privacy Fence', rating: 5 },
        { quote: 'Vinyl fence looks great and requires zero maintenance. Perfect for Florida!', author: 'Jennifer Williams', role: 'Vinyl Fence', rating: 5 },
        { quote: 'Aluminum pool fence was exactly what we needed. Code compliant and stylish.', author: 'David Chen', role: 'Pool Fence', rating: 5 },
      ],
    },
    faq: {
      title: 'Fencing FAQs',
      subtitle: 'Common questions',
      items: [
        { question: 'What fence material is best for Miami?', answer: 'Vinyl and aluminum are most weather-resistant. Pressure-treated wood is popular but requires maintenance. We\'ll help you choose.' },
        { question: 'Do I need a permit?', answer: 'Most fences require permits in Miami-Dade. We handle all permit applications as part of our service.' },
        { question: 'How long does installation take?', answer: 'Most residential fences are installed in 1-3 days depending on length and complexity.' },
        { question: 'Where exactly can I put my fence?', answer: 'Fences typically must be on your property line or inside it. We\'ll advise on setbacks and HOA requirements.' },
      ],
    },
    form: {
      title: 'Get Your Free Quote',
      subtitle: 'Custom fence estimate',
      fields: [
        ...baseFormFields,
        { name: 'address', label: 'Property Address', type: 'text', required: true, placeholder: '123 Main St, Miami, FL' },
        { name: 'material', label: 'Fence Material', type: 'select', required: true, options: [
          { value: '', label: 'Select material' },
          { value: 'wood', label: 'Wood' },
          { value: 'vinyl', label: 'Vinyl/PVC' },
          { value: 'aluminum', label: 'Aluminum' },
          { value: 'chain_link', label: 'Chain Link' },
          { value: 'unsure', label: 'Not Sure Yet' },
        ]},
      ],
      submitText: 'Get Free Quote',
    },
    seo: {
      title: 'Fence Installation Miami | Wood, Vinyl, Aluminum | Kanjona',
      description: 'Professional fence installation in Miami. Wood, vinyl, aluminum, and chain link. Licensed contractors, quality work. Get your free quote!',
      keywords: ['fence installation miami', 'fence contractor miami', 'vinyl fence miami', 'wood fence', 'pool fence installation'],
    },
  },

  // Concrete
  'concrete': {
    service: {
      id: 'concrete',
      name: 'Concrete',
      tagline: 'Strong Foundations',
      description: 'Concrete services',
      ctaText: 'Get a Free Quote',
      phone: '(305) 555-0125',
      gradient: 'linear-gradient(135deg, #57534e, #78716c)',
      accentColor: '#a8a29e',
    },
    hero: {
      badge: 'Licensed Concrete Contractors',
      headline: 'Concrete That Stands the Test of Time',
      subheadline: 'Driveways, patios, foundations, and more',
      description: 'From new driveways to foundation repairs, our experienced concrete contractors deliver quality work that lasts for decades.',
      primaryCta: 'Free Estimate',
      secondaryCta: 'Call Now',
      stats: [
        { value: '3,000+', label: 'Projects Completed' },
        { value: '30+', label: 'Years Experience' },
        { value: 'Licensed', label: 'Contractor' },
      ],
    },
    benefits: {
      title: 'Why Choose Our Concrete Work',
      subtitle: 'Quality that lasts',
      items: [
        { icon: 'Shield', title: 'Built to Last', description: 'Proper mix design and reinforcement for Florida conditions.' },
        { icon: 'Award', title: 'Expert Finishing', description: 'Smooth finishes, decorative stamping, and staining options.' },
        { icon: 'Clock', title: 'On-Time Completion', description: 'We stick to schedules and minimize disruption.' },
        { icon: 'FileCheck', title: 'Permit Handling', description: 'We pull permits and handle inspections.' },
      ],
    },
    process: {
      title: 'Our Process',
      subtitle: 'Professional concrete work',
      variant: 'timeline',
      steps: [
        { number: 1, title: 'Assessment', description: 'We evaluate your project and provide a detailed quote.' },
        { number: 2, title: 'Preparation', description: 'Site prep, forms, and reinforcement installation.' },
        { number: 3, title: 'Pour & Finish', description: 'Expert pouring and finishing techniques.' },
        { number: 4, title: 'Curing', description: 'Proper curing for maximum strength and durability.' },
      ],
    },
    testimonials: {
      title: 'Solid Work',
      subtitle: 'Client feedback',
      variant: 'featured',
      items: [
        { quote: 'New driveway looks amazing. Stamped pattern really upgraded our curb appeal!', author: 'The Rodriguez Family', role: 'Stamped Driveway', rating: 5 },
        { quote: 'Patio with fire pit area turned out perfect. Great attention to grading and drainage.', author: 'Mark & Lisa Thompson', role: 'Patio Installation', rating: 5 },
        { quote: 'Fixed our settling foundation. Professional work and fair pricing.', author: 'Patricia Williams', role: 'Foundation Repair', rating: 5 },
      ],
    },
    faq: {
      title: 'Concrete FAQs',
      subtitle: 'Common questions',
      items: [
        { question: 'How long does concrete last?', answer: 'Properly installed concrete can last 30+ years. Quality installation and finishing are key to longevity.' },
        { question: 'When can I use my new driveway?', answer: 'Light foot traffic after 24 hours, vehicles after 7 days. Full cure takes 28 days.' },
        { question: 'Can you match existing concrete?', answer: 'We can get close, but new concrete never perfectly matches old. We can stain to help blend.' },
        { question: 'What about decorative options?', answer: 'We offer stamped patterns, exposed aggregate, colored concrete, and staining.' },
      ],
    },
    form: {
      title: 'Get Your Free Quote',
      subtitle: 'Tell us about your project',
      fields: [
        ...baseFormFields,
        { name: 'address', label: 'Project Address', type: 'text', required: true, placeholder: '123 Main St, Miami, FL' },
        { name: 'project', label: 'Project Type', type: 'select', required: true, options: [
          { value: '', label: 'Select project' },
          { value: 'driveway', label: 'Driveway' },
          { value: 'patio', label: 'Patio/Walkway' },
          { value: 'pool_deck', label: 'Pool Deck' },
          { value: 'foundation', label: 'Foundation' },
          { value: 'repair', label: 'Concrete Repair' },
        ]},
      ],
      submitText: 'Get Free Quote',
    },
    seo: {
      title: 'Concrete Contractors Miami | Driveways, Patios, Foundations | Kanjona',
      description: 'Licensed concrete contractors in Miami. Driveways, patios, foundations, pool decks. 30+ years experience. Get your free quote today!',
      keywords: ['concrete contractor miami', 'driveway installation miami', 'concrete patio', 'stamped concrete miami', 'concrete repair'],
    },
  },

  // Junk Removal
  'junk-removal': {
    service: {
      id: 'junk-removal',
      name: 'Junk Removal',
      tagline: 'Clutter-Free Living',
      description: 'Fast junk removal services',
      ctaText: 'Book Pickup',
      phone: '(305) 555-0126',
      gradient: 'linear-gradient(135deg, #059669, #10b981)',
      accentColor: '#34d399',
    },
    hero: {
      badge: 'Same-Day Service Available',
      headline: 'We Take It All Away',
      subheadline: 'Fast, affordable junk removal',
      description: 'Furniture, appliances, yard waste, construction debris - we haul it all. Just point and we\'ll make it disappear. Eco-friendly disposal and donation.',
      primaryCta: 'Book Pickup',
      secondaryCta: 'Get Price Quote',
      stats: [
        { value: '50,000+', label: 'Loads Hauled' },
        { value: '2 hour', label: 'Arrival Window' },
        { value: '70%', label: 'Recycled/Donated' },
      ],
    },
    benefits: {
      title: 'Why Choose Our Junk Removal',
      subtitle: 'Fast, easy, eco-friendly',
      items: [
        { icon: 'Zap', title: 'Same-Day Service', description: 'Book by noon, we\'ll be there today. Fast and convenient.' },
        { icon: 'BadgeDollarSign', title: 'Upfront Pricing', description: 'See your price before we load. No hidden fees.' },
        { icon: 'Leaf', title: 'Eco-Friendly', description: 'We recycle and donate whenever possible. Good for the planet.' },
        { icon: 'Truck', title: 'We Do the Lifting', description: 'Just point to what goes. We handle all the heavy lifting.' },
      ],
    },
    process: {
      title: 'How It Works',
      subtitle: 'Junk removal made easy',
      variant: 'horizontal',
      steps: [
        { number: 1, title: 'Book Online', description: 'Schedule your 2-hour arrival window.' },
        { number: 2, title: 'We Arrive', description: 'Our truck and crew arrive on time.' },
        { number: 3, title: 'Quote & Approve', description: 'See the price, approve, and we load.' },
        { number: 4, title: 'Done!', description: 'We sweep up and your junk is gone.' },
      ],
    },
    testimonials: {
      title: 'Clutter-Free Customers',
      subtitle: 'See what they say',
      variant: 'grid',
      items: [
        { quote: 'Cleared out my entire garage in an hour. Amazing service and fair price!', author: 'Robert Martinez', role: 'Garage Cleanout', rating: 5 },
        { quote: 'Removed all the construction debris from our renovation. Fast and professional.', author: 'Sarah Chen', role: 'Construction Debris', rating: 5 },
        { quote: 'Estate cleanout after mom passed. They were respectful and efficient.', author: 'Jennifer Williams', role: 'Estate Cleanout', rating: 5 },
      ],
    },
    faq: {
      title: 'Junk Removal FAQs',
      subtitle: 'Common questions',
      items: [
        { question: 'What do you take?', answer: 'Almost everything! Furniture, appliances, electronics, yard waste, construction debris. We can\'t take hazardous waste or certain chemicals.' },
        { question: 'How is pricing determined?', answer: 'We price by volume - how much space your stuff takes in our truck. We show you the price before loading.' },
        { question: 'Do you donate items?', answer: 'Yes! We partner with local charities. Usable items are donated, reducing waste and helping the community.' },
        { question: 'Can you remove items from anywhere?', answer: 'Yes - basement, attic, backyard, wherever. We handle stairs and tight spaces.' },
      ],
    },
    form: {
      title: 'Book Your Pickup',
      subtitle: 'Schedule junk removal today',
      fields: [
        ...baseFormFields,
        { name: 'address', label: 'Pickup Address', type: 'text', required: true, placeholder: '123 Main St, Miami, FL' },
        { name: 'items', label: 'What Needs Removal?', type: 'select', required: true, options: [
          { value: '', label: 'Select type' },
          { value: 'furniture', label: 'Furniture' },
          { value: 'appliances', label: 'Appliances' },
          { value: 'yard', label: 'Yard Waste' },
          { value: 'construction', label: 'Construction Debris' },
          { value: 'mixed', label: 'Mixed Items' },
        ]},
      ],
      submitText: 'Book Pickup',
    },
    seo: {
      title: 'Junk Removal Miami | Same-Day Pickup | Kanjona',
      description: 'Fast junk removal in Miami. Furniture, appliances, debris - we take it all. Same-day service, upfront pricing, eco-friendly disposal. Book now!',
      keywords: ['junk removal miami', 'junk hauling miami', 'furniture removal', 'debris removal', 'estate cleanout miami'],
    },
  },

  // Appliance Repair
  'appliance-repair': {
    service: {
      id: 'appliance-repair',
      name: 'Appliance Repair',
      tagline: 'Fix It Fast',
      description: 'Home appliance repair',
      ctaText: 'Schedule Repair',
      phone: '(305) 555-0127',
      gradient: 'linear-gradient(135deg, #2563eb, #3b82f6)',
      accentColor: '#60a5fa',
    },
    hero: {
      badge: 'Factory-Certified Technicians',
      headline: 'Appliance Broken? We\'ll Fix It',
      subheadline: 'Same-day repair for all major brands',
      description: 'Refrigerator, washer, dryer, dishwasher, oven - we repair them all. Factory-certified technicians with same-day service available.',
      primaryCta: 'Schedule Repair',
      secondaryCta: 'Call Now',
      stats: [
        { value: '30,000+', label: 'Repairs Completed' },
        { value: '93%', label: 'First-Visit Fix' },
        { value: 'All Brands', label: 'Serviced' },
      ],
    },
    benefits: {
      title: 'Why Choose Us',
      subtitle: 'Expert appliance repair',
      items: [
        { icon: 'Award', title: 'Certified Technicians', description: 'Factory-trained on all major brands. We know your appliance.' },
        { icon: 'Zap', title: 'Same-Day Service', description: 'Most repairs completed the same day you call.' },
        { icon: 'Package', title: 'Parts on Truck', description: 'We stock common parts for faster repairs.' },
        { icon: 'Shield', title: '90-Day Warranty', description: 'All repairs backed by our warranty.' },
      ],
    },
    process: {
      title: 'How It Works',
      subtitle: 'Simple repair process',
      variant: 'horizontal',
      steps: [
        { number: 1, title: 'Schedule', description: 'Book your repair online or by phone.' },
        { number: 2, title: 'Diagnose', description: 'Technician arrives and diagnoses the issue.' },
        { number: 3, title: 'Quote', description: 'You approve the repair cost before work begins.' },
        { number: 4, title: 'Fix', description: 'We repair your appliance, often same-visit.' },
      ],
    },
    testimonials: {
      title: 'Fixed Appliances',
      subtitle: 'Happy customers',
      variant: 'featured',
      items: [
        { quote: 'Fridge was warm, they fixed it same day. Saved me from losing all my food!', author: 'Maria Santos', role: 'Refrigerator Repair', rating: 5 },
        { quote: 'Washer hasn\'t worked this well in years. Fair price and great service.', author: 'James Thompson', role: 'Washer Repair', rating: 5 },
        { quote: 'Oven stopped heating right before Thanksgiving. They saved our holiday!', author: 'The Chen Family', role: 'Oven Repair', rating: 5 },
      ],
    },
    faq: {
      title: 'Appliance Repair FAQs',
      subtitle: 'Common questions',
      items: [
        { question: 'What brands do you repair?', answer: 'All major brands including Samsung, LG, Whirlpool, GE, Maytag, Frigidaire, KitchenAid, and more.' },
        { question: 'Is it worth repairing or should I replace?', answer: 'We\'ll give you honest advice. If repair costs exceed 50% of replacement, we\'ll tell you.' },
        { question: 'Do you charge for diagnosis?', answer: 'We charge a diagnostic fee that\'s waived if you proceed with our repair. You only pay once.' },
        { question: 'What\'s covered under warranty?', answer: 'Parts and labor are covered for 90 days. If the same issue recurs, we\'ll fix it free.' },
      ],
    },
    form: {
      title: 'Schedule Your Repair',
      subtitle: 'Fast, expert service',
      fields: [
        ...baseFormFields,
        { name: 'address', label: 'Service Address', type: 'text', required: true, placeholder: '123 Main St, Miami, FL' },
        { name: 'appliance', label: 'Appliance Type', type: 'select', required: true, options: [
          { value: '', label: 'Select appliance' },
          { value: 'refrigerator', label: 'Refrigerator' },
          { value: 'washer', label: 'Washer' },
          { value: 'dryer', label: 'Dryer' },
          { value: 'dishwasher', label: 'Dishwasher' },
          { value: 'oven', label: 'Oven/Range' },
          { value: 'other', label: 'Other' },
        ]},
        { name: 'issue', label: 'What\'s the Problem?', type: 'textarea', required: true, placeholder: 'Describe the issue...' },
      ],
      submitText: 'Schedule Repair',
    },
    seo: {
      title: 'Appliance Repair Miami | Same-Day Service | All Brands | Kanjona',
      description: 'Fast appliance repair in Miami. Refrigerator, washer, dryer, dishwasher, oven. Same-day service, 90-day warranty. Schedule your repair today!',
      keywords: ['appliance repair miami', 'refrigerator repair', 'washer repair miami', 'dryer repair', 'dishwasher repair'],
    },
  },

  // Orthodontist
  'orthodontist': {
    service: {
      id: 'orthodontist',
      name: 'Orthodontist',
      tagline: 'Smile Confidently',
      description: 'Braces and Invisalign',
      ctaText: 'Free Consultation',
      phone: '(305) 555-0128',
      gradient: 'linear-gradient(135deg, #ec4899, #f472b6)',
      accentColor: '#f9a8d4',
    },
    hero: {
      badge: 'Board-Certified Orthodontist',
      headline: 'Get the Smile You\'ve Always Wanted',
      subheadline: 'Braces, Invisalign, and more',
      description: 'Transform your smile with expert orthodontic care. Whether you prefer traditional braces or clear Invisalign, we create beautiful, healthy smiles for all ages.',
      primaryCta: 'Free Consultation',
      secondaryCta: 'Call Us',
      stats: [
        { value: '10,000+', label: 'Smiles Created' },
        { value: '20+', label: 'Years Experience' },
        { value: '$0 Down', label: 'Financing Available' },
      ],
    },
    benefits: {
      title: 'Why Choose Our Orthodontics',
      subtitle: 'Expert care, beautiful results',
      items: [
        { icon: 'Award', title: 'Board Certified', description: 'Specialized training beyond dental school in orthodontics.' },
        { icon: 'Sparkles', title: 'Multiple Options', description: 'Traditional braces, clear braces, Invisalign - find your fit.' },
        { icon: 'Users', title: 'All Ages Welcome', description: 'We treat children, teens, and adults.' },
        { icon: 'BadgeDollarSign', title: 'Affordable Plans', description: '$0 down and low monthly payments available.' },
      ],
    },
    process: {
      title: 'Your Orthodontic Journey',
      subtitle: 'From consultation to confident smile',
      variant: 'timeline',
      steps: [
        { number: 1, title: 'Free Consultation', description: 'Comprehensive exam and treatment options discussion.' },
        { number: 2, title: 'Custom Plan', description: 'Digital treatment planning shows your future smile.' },
        { number: 3, title: 'Treatment Begins', description: 'Braces placed or Invisalign started.' },
        { number: 4, title: 'Beautiful Smile', description: 'Treatment complete - enjoy your new smile!' },
      ],
    },
    testimonials: {
      title: 'Smile Transformations',
      subtitle: 'Real results',
      variant: 'featured',
      items: [
        { quote: 'My Invisalign treatment was so easy. No one even knew I was straightening my teeth!', author: 'Amanda Foster', role: 'Invisalign Adult', rating: 5 },
        { quote: 'Both our kids got braces here. The team is so patient and kind with children.', author: 'The Martinez Family', role: 'Pediatric Braces', rating: 5 },
        { quote: 'At 45, I finally fixed my smile. Wish I had done it sooner. Life-changing!', author: 'Robert Thompson', role: 'Adult Braces', rating: 5 },
      ],
    },
    faq: {
      title: 'Orthodontic FAQs',
      subtitle: 'Common questions',
      items: [
        { question: 'Am I too old for braces?', answer: 'Never! We treat patients of all ages. Adult orthodontics is more popular than ever with options like Invisalign.' },
        { question: 'How long does treatment take?', answer: 'Most treatments take 12-24 months depending on complexity. We\'ll give you an estimate at your consultation.' },
        { question: 'Do you offer payment plans?', answer: 'Yes! We offer $0 down and affordable monthly payments. Most treatments cost less than you think.' },
        { question: 'Invisalign or braces - which is better?', answer: 'Both achieve great results. Invisalign is invisible and removable. Braces work for more complex cases. We\'ll recommend the best option.' },
      ],
    },
    form: {
      title: 'Schedule Free Consultation',
      subtitle: 'Start your smile journey',
      fields: [
        ...baseFormFields,
        { name: 'patient_age', label: 'Patient Age', type: 'select', required: true, options: [
          { value: '', label: 'Select age group' },
          { value: 'child', label: 'Child (Under 12)' },
          { value: 'teen', label: 'Teen (12-17)' },
          { value: 'adult', label: 'Adult (18+)' },
        ]},
        { name: 'interest', label: 'Interested In', type: 'select', required: true, options: [
          { value: '', label: 'Select treatment' },
          { value: 'invisalign', label: 'Invisalign' },
          { value: 'braces', label: 'Traditional Braces' },
          { value: 'clear_braces', label: 'Clear Braces' },
          { value: 'unsure', label: 'Not Sure' },
        ]},
      ],
      submitText: 'Book Free Consultation',
    },
    seo: {
      title: 'Orthodontist Miami | Braces & Invisalign | Free Consultation | Kanjona',
      description: 'Board-certified Miami orthodontist. Braces and Invisalign for all ages. Free consultation, $0 down financing. Get your perfect smile today!',
      keywords: ['orthodontist miami', 'braces miami', 'invisalign miami', 'teeth straightening', 'clear aligners miami'],
    },
  },

  // Dermatology
  'dermatology': {
    service: {
      id: 'dermatology',
      name: 'Dermatology',
      tagline: 'Healthy, Beautiful Skin',
      description: 'Medical & cosmetic dermatology',
      ctaText: 'Book Appointment',
      phone: '(305) 555-0129',
      gradient: 'linear-gradient(135deg, #f472b6, #ec4899)',
      accentColor: '#f9a8d4',
    },
    hero: {
      badge: 'Board-Certified Dermatologists',
      headline: 'Expert Care for Your Skin',
      subheadline: 'Medical and cosmetic dermatology',
      description: 'From acne to aging, skin cancer screenings to cosmetic treatments, our board-certified dermatologists deliver comprehensive skin care for all ages.',
      primaryCta: 'Book Appointment',
      secondaryCta: 'Call Us',
      stats: [
        { value: '25,000+', label: 'Patients Treated' },
        { value: '15+', label: 'Years Experience' },
        { value: '5.0★', label: 'Patient Rating' },
      ],
    },
    benefits: {
      title: 'Why Choose Our Dermatology',
      subtitle: 'Comprehensive skin care',
      items: [
        { icon: 'Award', title: 'Board Certified', description: 'Fellowship-trained dermatologists with specialized expertise.' },
        { icon: 'Microscope', title: 'Advanced Technology', description: 'Latest laser treatments and diagnostic equipment.' },
        { icon: 'Heart', title: 'Medical & Cosmetic', description: 'Full range of services from health to beauty.' },
        { icon: 'Calendar', title: 'Quick Appointments', description: 'New patients seen within a week.' },
      ],
    },
    process: {
      title: 'Your Visit',
      subtitle: 'Comprehensive skin evaluation',
      variant: 'horizontal',
      steps: [
        { number: 1, title: 'Book Appointment', description: 'Schedule online or call our office.' },
        { number: 2, title: 'Consultation', description: 'Thorough skin exam and discussion of concerns.' },
        { number: 3, title: 'Treatment Plan', description: 'Personalized plan for your specific needs.' },
        { number: 4, title: 'Follow-Up Care', description: 'Ongoing support and maintenance.' },
      ],
    },
    testimonials: {
      title: 'Patient Stories',
      subtitle: 'Real results',
      variant: 'grid',
      items: [
        { quote: 'Finally cleared my adult acne after years of struggling. Should have come here sooner!', author: 'Jessica Martinez', role: 'Acne Treatment', rating: 5 },
        { quote: 'Caught an early melanoma during my skin check. Literally saved my life.', author: 'Robert Thompson', role: 'Skin Cancer Screening', rating: 5 },
        { quote: 'The cosmetic treatments took years off my face. Natural-looking results.', author: 'Linda Chen', role: 'Cosmetic Dermatology', rating: 5 },
      ],
    },
    faq: {
      title: 'Dermatology FAQs',
      subtitle: 'Common questions',
      items: [
        { question: 'Do you accept insurance?', answer: 'Yes, we accept most major insurance plans for medical dermatology. Cosmetic procedures are typically out-of-pocket.' },
        { question: 'How often should I get a skin check?', answer: 'We recommend annual skin cancer screenings for most adults. More frequent checks if you have risk factors.' },
        { question: 'What cosmetic services do you offer?', answer: 'Botox, fillers, chemical peels, laser treatments, microneedling, and more. Schedule a consultation to discuss options.' },
        { question: 'Can you help with acne?', answer: 'Absolutely! We treat all types of acne from mild to severe, including acne scarring.' },
      ],
    },
    form: {
      title: 'Book Your Appointment',
      subtitle: 'New patients welcome',
      fields: [
        ...baseFormFields,
        { name: 'concern', label: 'Primary Concern', type: 'select', required: true, options: [
          { value: '', label: 'Select concern' },
          { value: 'skin_check', label: 'Skin Cancer Screening' },
          { value: 'acne', label: 'Acne' },
          { value: 'aging', label: 'Anti-Aging' },
          { value: 'rash', label: 'Rash/Irritation' },
          { value: 'cosmetic', label: 'Cosmetic Consultation' },
          { value: 'other', label: 'Other' },
        ]},
        { name: 'insurance', label: 'Insurance', type: 'select', required: false, options: [
          { value: '', label: 'Select insurance' },
          { value: 'yes', label: 'I have insurance' },
          { value: 'no', label: 'Self-pay' },
        ]},
      ],
      submitText: 'Book Appointment',
    },
    seo: {
      title: 'Dermatologist Miami | Skin Doctor | Medical & Cosmetic | Kanjona',
      description: 'Board-certified Miami dermatologists. Skin cancer screening, acne, anti-aging, cosmetic treatments. Accepting new patients. Book today!',
      keywords: ['dermatologist miami', 'skin doctor miami', 'dermatology', 'skin cancer screening', 'cosmetic dermatology'],
    },
  },

  // MedSpa
  'medspa': {
    service: {
      id: 'medspa',
      name: 'MedSpa',
      tagline: 'Rejuvenate & Refresh',
      description: 'Medical aesthetic treatments',
      ctaText: 'Book Treatment',
      phone: '(305) 555-0130',
      gradient: 'linear-gradient(135deg, #a855f7, #d946ef)',
      accentColor: '#e879f9',
    },
    hero: {
      badge: 'Physician-Led MedSpa',
      headline: 'Look Refreshed, Not Overdone',
      subheadline: 'Botox, fillers, and advanced aesthetics',
      description: 'Enhance your natural beauty with treatments tailored to you. Our medical team delivers subtle, natural-looking results that help you look as young as you feel.',
      primaryCta: 'Book Consultation',
      secondaryCta: 'View Treatments',
      stats: [
        { value: '20,000+', label: 'Treatments Done' },
        { value: '15+', label: 'Years Experience' },
        { value: 'Natural', label: 'Looking Results' },
      ],
    },
    benefits: {
      title: 'Why Choose Our MedSpa',
      subtitle: 'Expert aesthetic care',
      items: [
        { icon: 'UserCheck', title: 'Physician-Led', description: 'All treatments supervised by board-certified physicians.' },
        { icon: 'Sparkles', title: 'Natural Results', description: 'We enhance your features, not change them.' },
        { icon: 'Shield', title: 'Safe & Sterile', description: 'Medical-grade facility with highest safety standards.' },
        { icon: 'Heart', title: 'Personalized Care', description: 'Custom treatment plans for your unique goals.' },
      ],
    },
    process: {
      title: 'Your Aesthetic Journey',
      subtitle: 'From consultation to confidence',
      variant: 'horizontal',
      steps: [
        { number: 1, title: 'Consultation', description: 'Discuss your goals and concerns with our team.' },
        { number: 2, title: 'Custom Plan', description: 'Receive a personalized treatment recommendation.' },
        { number: 3, title: 'Treatment', description: 'Expert treatment in our comfortable facility.' },
        { number: 4, title: 'Reveal', description: 'See your refreshed, natural-looking results.' },
      ],
    },
    testimonials: {
      title: 'Client Transformations',
      subtitle: 'Natural, beautiful results',
      variant: 'featured',
      items: [
        { quote: 'My Botox looks so natural. Friends say I look refreshed but can\'t tell I had anything done!', author: 'Jennifer Martinez', role: 'Botox Client', rating: 5 },
        { quote: 'The lip filler is perfect - enhanced but not overdone. Exactly what I wanted.', author: 'Amanda Foster', role: 'Filler Client', rating: 5 },
        { quote: 'Laser treatment transformed my skin. I look 10 years younger!', author: 'Patricia Williams', role: 'Laser Treatment', rating: 5 },
      ],
    },
    faq: {
      title: 'MedSpa FAQs',
      subtitle: 'Common questions',
      items: [
        { question: 'Is Botox safe?', answer: 'Yes! When administered by trained professionals, Botox has an excellent safety record. It\'s FDA-approved and we\'ve done thousands of treatments.' },
        { question: 'How long do fillers last?', answer: 'Depending on the filler and area, results typically last 6-18 months. We\'ll explain expected duration for your treatment.' },
        { question: 'Will I look natural?', answer: 'Our philosophy is enhancement, not transformation. We want you to look like you - just refreshed and rejuvenated.' },
        { question: 'What\'s the downtime?', answer: 'Most treatments have minimal downtime. Botox and fillers - you can return to normal activities immediately. Some treatments may have a few days of recovery.' },
      ],
    },
    form: {
      title: 'Book Your Consultation',
      subtitle: 'Complimentary consultation',
      fields: [
        ...baseFormFields,
        { name: 'treatment', label: 'Interested In', type: 'select', required: true, options: [
          { value: '', label: 'Select treatment' },
          { value: 'botox', label: 'Botox/Dysport' },
          { value: 'fillers', label: 'Dermal Fillers' },
          { value: 'laser', label: 'Laser Treatments' },
          { value: 'skincare', label: 'Advanced Skincare' },
          { value: 'consultation', label: 'General Consultation' },
        ]},
      ],
      submitText: 'Book Consultation',
    },
    seo: {
      title: 'MedSpa Miami | Botox, Fillers, Laser | Kanjona',
      description: 'Miami\'s premier MedSpa. Botox, fillers, laser treatments. Physician-led, natural results. Complimentary consultations. Book your treatment today!',
      keywords: ['medspa miami', 'botox miami', 'fillers miami', 'laser treatment', 'cosmetic injections miami'],
    },
  },

  // Chiropractic
  'chiropractic': {
    service: {
      id: 'chiropractic',
      name: 'Chiropractic',
      tagline: 'Live Pain-Free',
      description: 'Chiropractic care',
      ctaText: 'Book Appointment',
      phone: '(305) 555-0131',
      gradient: 'linear-gradient(135deg, #16a34a, #22c55e)',
      accentColor: '#4ade80',
    },
    hero: {
      badge: 'Licensed Chiropractors',
      headline: 'Find Relief From Pain',
      subheadline: 'Natural healing through chiropractic care',
      description: 'Back pain, neck pain, headaches - we treat them without drugs or surgery. Our chiropractors use proven techniques to restore your body\'s natural function.',
      primaryCta: 'Book Appointment',
      secondaryCta: 'Call Us',
      stats: [
        { value: '50,000+', label: 'Adjustments' },
        { value: '20+', label: 'Years Experience' },
        { value: '95%', label: 'Patient Satisfaction' },
      ],
    },
    benefits: {
      title: 'Why Choose Chiropractic',
      subtitle: 'Natural pain relief',
      items: [
        { icon: 'Pill', title: 'Drug-Free Treatment', description: 'Address the cause of pain without medication.' },
        { icon: 'Scissors', title: 'Non-Surgical', description: 'Avoid invasive procedures with natural healing.' },
        { icon: 'Target', title: 'Root Cause Focus', description: 'We treat the source, not just the symptoms.' },
        { icon: 'Activity', title: 'Improve Function', description: 'Better mobility, flexibility, and quality of life.' },
      ],
    },
    process: {
      title: 'Your Path to Relief',
      subtitle: 'Personalized care for lasting results',
      variant: 'timeline',
      steps: [
        { number: 1, title: 'Consultation', description: 'Discuss your health history and pain concerns.' },
        { number: 2, title: 'Examination', description: 'Thorough evaluation including X-rays if needed.' },
        { number: 3, title: 'Treatment Plan', description: 'Customized plan to address your specific issues.' },
        { number: 4, title: 'Ongoing Care', description: 'Regular adjustments and exercises for lasting relief.' },
      ],
    },
    testimonials: {
      title: 'Pain Relief Stories',
      subtitle: 'Real results',
      variant: 'grid',
      items: [
        { quote: 'After years of back pain, I\'m finally pain-free. Wish I had come sooner!', author: 'Michael Thompson', role: 'Back Pain Patient', rating: 5 },
        { quote: 'My chronic headaches are gone. Chiropractic care changed my life.', author: 'Sarah Martinez', role: 'Headache Patient', rating: 5 },
        { quote: 'Avoided back surgery thanks to their treatment plan. Amazing results!', author: 'Robert Chen', role: 'Disc Patient', rating: 5 },
      ],
    },
    faq: {
      title: 'Chiropractic FAQs',
      subtitle: 'Common questions',
      items: [
        { question: 'Is chiropractic safe?', answer: 'Yes! Chiropractic has an excellent safety record. Our licensed chiropractors use proven, gentle techniques.' },
        { question: 'Does the adjustment hurt?', answer: 'Most patients feel relief, not pain. You may hear a popping sound, but the adjustment itself is typically comfortable.' },
        { question: 'How many visits will I need?', answer: 'It depends on your condition. Some issues resolve quickly, others need ongoing care. We\'ll give you an honest estimate.' },
        { question: 'Do you accept insurance?', answer: 'Yes, we accept most insurance plans including auto injury coverage. We\'ll verify your benefits.' },
      ],
    },
    form: {
      title: 'Book Your Appointment',
      subtitle: 'New patient special available',
      fields: [
        ...baseFormFields,
        { name: 'concern', label: 'Primary Concern', type: 'select', required: true, options: [
          { value: '', label: 'Select concern' },
          { value: 'back', label: 'Back Pain' },
          { value: 'neck', label: 'Neck Pain' },
          { value: 'headache', label: 'Headaches' },
          { value: 'auto', label: 'Auto Accident Injury' },
          { value: 'other', label: 'Other' },
        ]},
      ],
      submitText: 'Book Appointment',
    },
    seo: {
      title: 'Chiropractor Miami | Back Pain Relief | Kanjona',
      description: 'Miami chiropractor for back pain, neck pain, and headaches. Drug-free, non-surgical treatment. New patient special available. Book today!',
      keywords: ['chiropractor miami', 'back pain treatment', 'neck pain relief', 'chiropractic care miami', 'spinal adjustment'],
    },
  },

  // Physical Therapy
  'physical-therapy': {
    service: {
      id: 'physical-therapy',
      name: 'Physical Therapy',
      tagline: 'Move Better, Feel Better',
      description: 'Physical therapy services',
      ctaText: 'Start Therapy',
      phone: '(305) 555-0132',
      gradient: 'linear-gradient(135deg, #0891b2, #06b6d4)',
      accentColor: '#22d3ee',
    },
    hero: {
      badge: 'Licensed Physical Therapists',
      headline: 'Recover, Strengthen, Thrive',
      subheadline: 'Expert physical therapy for all conditions',
      description: 'Whether recovering from surgery, injury, or managing chronic pain, our physical therapists create personalized programs to get you moving again.',
      primaryCta: 'Start Therapy',
      secondaryCta: 'Call Us',
      stats: [
        { value: '20,000+', label: 'Patients Treated' },
        { value: '95%', label: 'Report Improvement' },
        { value: 'One-on-One', label: 'Sessions' },
      ],
    },
    benefits: {
      title: 'Why Choose Our PT',
      subtitle: 'Expert rehabilitation',
      items: [
        { icon: 'Users', title: 'One-on-One Care', description: 'Your session is dedicated to you - no sharing time.' },
        { icon: 'Target', title: 'Personalized Plans', description: 'Treatment tailored to your specific condition and goals.' },
        { icon: 'Award', title: 'Specialty Trained', description: 'PTs with advanced certifications in orthopedics, sports, and more.' },
        { icon: 'FileCheck', title: 'Insurance Accepted', description: 'We work with most insurance providers.' },
      ],
    },
    process: {
      title: 'Your Therapy Journey',
      subtitle: 'Path to recovery',
      variant: 'horizontal',
      steps: [
        { number: 1, title: 'Evaluation', description: 'Comprehensive assessment of your condition.' },
        { number: 2, title: 'Treatment Plan', description: 'Custom program designed for your goals.' },
        { number: 3, title: 'Active Therapy', description: 'Hands-on treatment and guided exercises.' },
        { number: 4, title: 'Home Program', description: 'Exercises to continue progress at home.' },
      ],
    },
    testimonials: {
      title: 'Recovery Stories',
      subtitle: 'Patient successes',
      variant: 'featured',
      items: [
        { quote: 'After knee replacement, they got me walking normally again. Exceeded my expectations!', author: 'Robert Martinez', role: 'Post-Surgery', rating: 5 },
        { quote: 'Shoulder injury healed completely. Their sports PT expertise made the difference.', author: 'David Chen', role: 'Sports Injury', rating: 5 },
        { quote: 'Chronic back pain finally under control after their comprehensive program.', author: 'Patricia Williams', role: 'Chronic Pain', rating: 5 },
      ],
    },
    faq: {
      title: 'Physical Therapy FAQs',
      subtitle: 'Common questions',
      items: [
        { question: 'Do I need a doctor\'s referral?', answer: 'Florida allows direct access to PT for most conditions. However, some insurance plans require a referral. We\'ll help you figure it out.' },
        { question: 'How long are sessions?', answer: 'Sessions are typically 45-60 minutes of one-on-one time with your therapist.' },
        { question: 'How many sessions will I need?', answer: 'It varies by condition. We\'ll give you an estimate after your evaluation. Most see improvement within 4-6 weeks.' },
        { question: 'What conditions do you treat?', answer: 'Post-surgical rehab, sports injuries, back/neck pain, joint replacements, work injuries, and more.' },
      ],
    },
    form: {
      title: 'Start Your Recovery',
      subtitle: 'Schedule your evaluation',
      fields: [
        ...baseFormFields,
        { name: 'condition', label: 'Condition', type: 'select', required: true, options: [
          { value: '', label: 'Select condition' },
          { value: 'surgery', label: 'Post-Surgery Rehab' },
          { value: 'sports', label: 'Sports Injury' },
          { value: 'back_neck', label: 'Back/Neck Pain' },
          { value: 'joint', label: 'Joint Pain' },
          { value: 'work', label: 'Work Injury' },
          { value: 'other', label: 'Other' },
        ]},
        { name: 'insurance', label: 'Insurance', type: 'select', required: false, options: [
          { value: '', label: 'Select insurance' },
          { value: 'yes', label: 'I have insurance' },
          { value: 'workers_comp', label: 'Workers\' Comp' },
          { value: 'auto', label: 'Auto Insurance' },
          { value: 'self_pay', label: 'Self-Pay' },
        ]},
      ],
      submitText: 'Schedule Evaluation',
    },
    seo: {
      title: 'Physical Therapy Miami | PT Rehab & Recovery | Kanjona',
      description: 'Expert physical therapy in Miami. Post-surgery rehab, sports injuries, back pain. One-on-one sessions, insurance accepted. Start your recovery today!',
      keywords: ['physical therapy miami', 'PT miami', 'physical therapist', 'sports rehab', 'post surgery rehab'],
    },
  },

  // Hair Transplant
  'hair-transplant': {
    service: {
      id: 'hair-transplant',
      name: 'Hair Transplant',
      tagline: 'Restore Your Confidence',
      description: 'Hair restoration surgery',
      ctaText: 'Free Consultation',
      phone: '(305) 555-0133',
      gradient: 'linear-gradient(135deg, #0f766e, #14b8a6)',
      accentColor: '#2dd4bf',
    },
    hero: {
      badge: 'Board-Certified Hair Restoration',
      headline: 'Get Your Hair Back',
      subheadline: 'Natural-looking hair restoration',
      description: 'Reclaim your hairline with advanced FUE and FUT techniques. Our board-certified surgeons deliver natural, permanent results that restore your confidence.',
      primaryCta: 'Free Consultation',
      secondaryCta: 'View Results',
      stats: [
        { value: '3,000+', label: 'Procedures' },
        { value: '98%', label: 'Satisfaction' },
        { value: 'Natural', label: 'Results' },
      ],
    },
    benefits: {
      title: 'Why Choose Our Hair Restoration',
      subtitle: 'Expert surgical results',
      items: [
        { icon: 'Award', title: 'Board Certified', description: 'Surgeons specializing in hair restoration.' },
        { icon: 'Sparkles', title: 'Natural Results', description: 'Hairlines that look completely natural.' },
        { icon: 'Shield', title: 'Permanent Solution', description: 'Transplanted hair lasts a lifetime.' },
        { icon: 'Heart', title: 'Personalized Care', description: 'Custom treatment plans for your hair loss pattern.' },
      ],
    },
    process: {
      title: 'Your Restoration Journey',
      subtitle: 'From consultation to full growth',
      variant: 'timeline',
      steps: [
        { number: 1, title: 'Consultation', description: 'Evaluate your hair loss and discuss options.' },
        { number: 2, title: 'Treatment Plan', description: 'Custom plan including number of grafts needed.' },
        { number: 3, title: 'Procedure', description: 'Minimally invasive surgery with local anesthesia.' },
        { number: 4, title: 'Growth', description: 'New hair grows naturally over 6-12 months.' },
      ],
    },
    testimonials: {
      title: 'Restoration Stories',
      subtitle: 'Real results',
      variant: 'featured',
      items: [
        { quote: 'My hairline looks exactly like it did 15 years ago. Can\'t believe the results!', author: 'Michael Thompson', role: 'FUE Patient', rating: 5 },
        { quote: 'The procedure was easier than I expected. No visible scarring and natural results.', author: 'David Martinez', role: 'Hairline Restoration', rating: 5 },
        { quote: 'Finally confident without a hat. Life-changing experience.', author: 'James Chen', role: 'Crown Restoration', rating: 5 },
      ],
    },
    faq: {
      title: 'Hair Transplant FAQs',
      subtitle: 'Common questions',
      items: [
        { question: 'Is the procedure painful?', answer: 'The procedure is done under local anesthesia. Most patients report minimal discomfort.' },
        { question: 'How long until I see results?', answer: 'New hair starts growing around 3 months and full results are visible at 12-18 months.' },
        { question: 'Is the result permanent?', answer: 'Yes! Transplanted hair is permanent and will grow naturally for life.' },
        { question: 'Am I a good candidate?', answer: 'Most men and women with pattern hair loss are candidates. Schedule a consultation to evaluate your specific situation.' },
      ],
    },
    form: {
      title: 'Schedule Free Consultation',
      subtitle: 'Start your restoration journey',
      fields: [
        ...baseFormFields,
        { name: 'hair_loss', label: 'Hair Loss Area', type: 'select', required: true, options: [
          { value: '', label: 'Select area' },
          { value: 'hairline', label: 'Receding Hairline' },
          { value: 'crown', label: 'Crown/Top' },
          { value: 'both', label: 'Both Areas' },
          { value: 'eyebrows', label: 'Eyebrows' },
        ]},
      ],
      submitText: 'Book Free Consultation',
    },
    seo: {
      title: 'Hair Transplant Miami | FUE Hair Restoration | Kanjona',
      description: 'Advanced hair transplant in Miami. FUE and FUT techniques, natural results, board-certified surgeons. Free consultation. Restore your confidence today!',
      keywords: ['hair transplant miami', 'hair restoration', 'FUE hair transplant', 'hair loss treatment', 'hair surgeon miami'],
    },
  },

  // Cosmetic Dentistry
  'cosmetic-dentistry': {
    service: {
      id: 'cosmetic-dentistry',
      name: 'Cosmetic Dentistry',
      tagline: 'Your Dream Smile',
      description: 'Cosmetic dental procedures',
      ctaText: 'Book Consultation',
      phone: '(305) 555-0134',
      gradient: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
      accentColor: '#7dd3fc',
    },
    hero: {
      badge: 'Smile Makeover Specialists',
      headline: 'Transform Your Smile',
      subheadline: 'Veneers, whitening, and smile makeovers',
      description: 'Create the smile you\'ve always dreamed of. Our cosmetic dentists combine artistry and technology to deliver stunning, natural-looking results.',
      primaryCta: 'Free Smile Consultation',
      secondaryCta: 'View Gallery',
      stats: [
        { value: '5,000+', label: 'Smiles Transformed' },
        { value: '20+', label: 'Years Experience' },
        { value: 'Top Rated', label: 'In Miami' },
      ],
    },
    benefits: {
      title: 'Why Choose Our Cosmetic Dentistry',
      subtitle: 'Artistry meets dentistry',
      items: [
        { icon: 'Palette', title: 'Artistic Eye', description: 'We design smiles that complement your facial features.' },
        { icon: 'Sparkles', title: 'Premium Materials', description: 'Top-quality veneers, crowns, and bonding materials.' },
        { icon: 'Zap', title: 'Advanced Technology', description: 'Digital smile design lets you preview your results.' },
        { icon: 'Shield', title: 'Long-Lasting Results', description: 'Quality work that maintains its beauty for years.' },
      ],
    },
    process: {
      title: 'Your Smile Journey',
      subtitle: 'From consultation to reveal',
      variant: 'horizontal',
      steps: [
        { number: 1, title: 'Consultation', description: 'Discuss your goals and see digital smile preview.' },
        { number: 2, title: 'Treatment Plan', description: 'Custom plan with timeline and investment.' },
        { number: 3, title: 'Treatment', description: 'Expert care with attention to every detail.' },
        { number: 4, title: 'Reveal', description: 'Your new smile debuts!' },
      ],
    },
    testimonials: {
      title: 'Smile Transformations',
      subtitle: 'Real patient results',
      variant: 'featured',
      items: [
        { quote: 'My veneers look completely natural. People compliment my smile daily!', author: 'Jennifer Martinez', role: 'Porcelain Veneers', rating: 5 },
        { quote: 'Whitening made a dramatic difference. So much more confident in photos now.', author: 'David Chen', role: 'Professional Whitening', rating: 5 },
        { quote: 'Full smile makeover changed my life. Worth every penny!', author: 'Amanda Foster', role: 'Smile Makeover', rating: 5 },
      ],
    },
    faq: {
      title: 'Cosmetic Dentistry FAQs',
      subtitle: 'Common questions',
      items: [
        { question: 'How long do veneers last?', answer: 'With proper care, porcelain veneers last 10-15 years or longer. We use only premium materials.' },
        { question: 'Is professional whitening better than at-home?', answer: 'Yes! Professional whitening is stronger, more even, and supervised for safety. Results in one visit.' },
        { question: 'Can you fix gaps without braces?', answer: 'Often yes! Veneers or bonding can close gaps quickly without orthodontic treatment.' },
        { question: 'Do you offer financing?', answer: 'Yes, we offer flexible financing options to make your dream smile affordable.' },
      ],
    },
    form: {
      title: 'Book Your Smile Consultation',
      subtitle: 'See your new smile digitally',
      fields: [
        ...baseFormFields,
        { name: 'concern', label: 'What Would You Like to Improve?', type: 'select', required: true, options: [
          { value: '', label: 'Select concern' },
          { value: 'whitening', label: 'Teeth Whitening' },
          { value: 'veneers', label: 'Veneers' },
          { value: 'gaps', label: 'Close Gaps' },
          { value: 'shape', label: 'Tooth Shape/Size' },
          { value: 'makeover', label: 'Full Smile Makeover' },
        ]},
      ],
      submitText: 'Book Consultation',
    },
    seo: {
      title: 'Cosmetic Dentist Miami | Veneers & Smile Makeovers | Kanjona',
      description: 'Miami cosmetic dentist. Porcelain veneers, teeth whitening, smile makeovers. Transform your smile with expert care. Free consultation!',
      keywords: ['cosmetic dentist miami', 'veneers miami', 'teeth whitening miami', 'smile makeover', 'porcelain veneers'],
    },
  },

  // Immigration Attorney
  'immigration-attorney': {
    service: {
      id: 'immigration-attorney',
      name: 'Immigration Attorney',
      tagline: 'Your Path to America',
      description: 'Immigration legal services',
      ctaText: 'Free Case Review',
      phone: '(305) 555-0135',
      gradient: 'linear-gradient(135deg, #1e40af, #3b82f6)',
      accentColor: '#60a5fa',
    },
    hero: {
      badge: 'Board-Certified Immigration Attorneys',
      headline: 'Navigate Immigration with Confidence',
      subheadline: 'Green cards, visas, citizenship, and more',
      description: 'Don\'t risk your future with paperwork mistakes. Our experienced immigration attorneys guide you through the complex process with expertise and care.',
      primaryCta: 'Free Case Review',
      secondaryCta: 'Call Now',
      stats: [
        { value: '10,000+', label: 'Cases Handled' },
        { value: '98%', label: 'Success Rate' },
        { value: '25+', label: 'Years Experience' },
      ],
    },
    benefits: {
      title: 'Why Choose Our Immigration Firm',
      subtitle: 'Experienced, dedicated representation',
      items: [
        { icon: 'Award', title: 'Board Certified', description: 'Specialized certification in immigration law.' },
        { icon: 'Languages', title: 'Multilingual Staff', description: 'We speak English, Spanish, Portuguese, and more.' },
        { icon: 'Shield', title: 'Proven Results', description: '98% success rate across all case types.' },
        { icon: 'Heart', title: 'Personal Attention', description: 'You work directly with your attorney, not assistants.' },
      ],
    },
    process: {
      title: 'How We Help',
      subtitle: 'From consultation to approval',
      variant: 'timeline',
      steps: [
        { number: 1, title: 'Case Review', description: 'Free evaluation of your immigration options.' },
        { number: 2, title: 'Strategy', description: 'Custom strategy for your specific situation.' },
        { number: 3, title: 'Application', description: 'We prepare and file all paperwork correctly.' },
        { number: 4, title: 'Approval', description: 'Support through interviews and final approval.' },
      ],
    },
    testimonials: {
      title: 'Client Success Stories',
      subtitle: 'Dreams achieved',
      variant: 'featured',
      items: [
        { quote: 'Got my green card approved after two other lawyers failed. They knew exactly what to do!', author: 'Maria Santos', role: 'Green Card Client', rating: 5 },
        { quote: 'Helped my whole family immigrate. Professional, caring, and effective.', author: 'The Rodriguez Family', role: 'Family Immigration', rating: 5 },
        { quote: 'H-1B approved on first try. Their expertise made the difference.', author: 'David Chen', role: 'Work Visa Client', rating: 5 },
      ],
    },
    faq: {
      title: 'Immigration FAQs',
      subtitle: 'Common questions',
      items: [
        { question: 'How long does a green card take?', answer: 'Timelines vary widely by category and country. Family-based can take 1-10+ years. Employment-based varies. We\'ll give you realistic expectations.' },
        { question: 'Can you help if I\'m undocumented?', answer: 'Yes, there may be options depending on your situation. Schedule a confidential consultation to discuss.' },
        { question: 'What\'s included in the consultation?', answer: 'We review your situation, explain your options, and outline a strategy. You\'ll leave knowing your path forward.' },
        { question: 'Do you handle deportation cases?', answer: 'Yes, we represent clients in removal proceedings and can often find relief options.' },
      ],
    },
    form: {
      title: 'Get Your Free Case Review',
      subtitle: 'Confidential consultation',
      fields: [
        ...baseFormFields,
        { name: 'case_type', label: 'Case Type', type: 'select', required: true, options: [
          { value: '', label: 'Select case type' },
          { value: 'green_card', label: 'Green Card' },
          { value: 'work_visa', label: 'Work Visa' },
          { value: 'family', label: 'Family Immigration' },
          { value: 'citizenship', label: 'Citizenship' },
          { value: 'deportation', label: 'Deportation Defense' },
          { value: 'other', label: 'Other' },
        ]},
      ],
      submitText: 'Get Free Review',
    },
    seo: {
      title: 'Immigration Attorney Miami | Green Card, Visa Lawyer | Kanjona',
      description: 'Experienced Miami immigration attorneys. Green cards, work visas, family immigration, citizenship. 98% success rate. Free case review!',
      keywords: ['immigration attorney miami', 'immigration lawyer', 'green card lawyer', 'visa attorney miami', 'immigration help'],
    },
  },

  // Criminal Defense Attorney
  'criminal-defense-attorney': {
    service: {
      id: 'criminal-defense-attorney',
      name: 'Criminal Defense Attorney',
      tagline: 'Protect Your Rights',
      description: 'Criminal defense legal services',
      ctaText: 'Free Consultation',
      phone: '(305) 555-0136',
      gradient: 'linear-gradient(135deg, #7c2d12, #c2410c)',
      accentColor: '#fb923c',
    },
    hero: {
      badge: 'Former Prosecutors on Your Side',
      headline: 'Aggressive Criminal Defense',
      subheadline: 'DUI, drug charges, felonies, and more',
      description: 'Facing criminal charges? Your future is at stake. Our former prosecutors know how the other side thinks and fight aggressively to protect your rights.',
      primaryCta: 'Free Consultation',
      secondaryCta: '24/7 Emergency Line',
      stats: [
        { value: '5,000+', label: 'Cases Handled' },
        { value: '90%', label: 'Cases Won/Reduced' },
        { value: 'Former', label: 'Prosecutors' },
      ],
    },
    benefits: {
      title: 'Why Choose Our Defense Team',
      subtitle: 'Fight back with experienced attorneys',
      items: [
        { icon: 'Scale', title: 'Former Prosecutors', description: 'We know how they build cases - and how to break them.' },
        { icon: 'Clock', title: '24/7 Availability', description: 'Arrests don\'t wait. Neither do we. Call anytime.' },
        { icon: 'Shield', title: 'Aggressive Defense', description: 'We fight hard to protect your freedom and future.' },
        { icon: 'FileCheck', title: 'Thorough Investigation', description: 'We investigate every detail to build your defense.' },
      ],
    },
    process: {
      title: 'How We Defend You',
      subtitle: 'From arrest to resolution',
      variant: 'timeline',
      steps: [
        { number: 1, title: 'Free Consultation', description: 'Discuss your case and options confidentially.' },
        { number: 2, title: 'Investigation', description: 'We gather evidence and build your defense.' },
        { number: 3, title: 'Strategy', description: 'Develop the best approach for your situation.' },
        { number: 4, title: 'Fight', description: 'Negotiate or go to trial - we\'re ready either way.' },
      ],
    },
    testimonials: {
      title: 'Defense Wins',
      subtitle: 'Real results',
      variant: 'grid',
      items: [
        { quote: 'DUI charges completely dismissed. They found issues with the traffic stop.', author: 'Anonymous', role: 'DUI Defense', rating: 5 },
        { quote: 'Felony reduced to misdemeanor. Saved my career and my future.', author: 'Anonymous', role: 'Felony Case', rating: 5 },
        { quote: 'Charges dropped before trial. Worth every penny for peace of mind.', author: 'Anonymous', role: 'Drug Charges', rating: 5 },
      ],
    },
    faq: {
      title: 'Criminal Defense FAQs',
      subtitle: 'Know your rights',
      items: [
        { question: 'Should I talk to police?', answer: 'No! Exercise your right to remain silent and ask for a lawyer. Anything you say can be used against you.' },
        { question: 'What should I do if arrested?', answer: 'Stay calm, don\'t resist, don\'t answer questions, and call us immediately. We can be there quickly.' },
        { question: 'Will this go on my record?', answer: 'It depends on the outcome. We fight for dismissals and reductions that minimize record impact.' },
        { question: 'Can you get charges dropped?', answer: 'Often yes, through investigation, negotiation, or challenging evidence. Every case is different.' },
      ],
    },
    form: {
      title: 'Get Your Free Consultation',
      subtitle: 'Confidential case review',
      fields: [
        ...baseFormFields,
        { name: 'charge_type', label: 'Charge Type', type: 'select', required: true, options: [
          { value: '', label: 'Select charge type' },
          { value: 'dui', label: 'DUI/DWI' },
          { value: 'drug', label: 'Drug Charges' },
          { value: 'theft', label: 'Theft/Fraud' },
          { value: 'assault', label: 'Assault/Violence' },
          { value: 'felony', label: 'Other Felony' },
          { value: 'misdemeanor', label: 'Misdemeanor' },
        ]},
      ],
      submitText: 'Get Free Consultation',
    },
    seo: {
      title: 'Criminal Defense Attorney Miami | DUI, Drug, Felony Lawyer | Kanjona',
      description: 'Aggressive Miami criminal defense attorneys. DUI, drug charges, felonies. Former prosecutors fighting for you. Free consultation, 24/7 availability.',
      keywords: ['criminal defense attorney miami', 'DUI lawyer miami', 'criminal lawyer', 'drug charges attorney', 'felony defense'],
    },
  },

  // Tax & Accounting
  'tax-accounting': {
    service: {
      id: 'tax-accounting',
      name: 'Tax & Accounting',
      tagline: 'Financial Clarity',
      description: 'Tax preparation and accounting',
      ctaText: 'Schedule Consultation',
      phone: '(305) 555-0137',
      gradient: 'linear-gradient(135deg, #15803d, #22c55e)',
      accentColor: '#4ade80',
    },
    hero: {
      badge: 'CPA Firm - IRS Enrolled Agents',
      headline: 'Taxes Done Right',
      subheadline: 'Tax preparation, planning, and accounting',
      description: 'Stop stressing about taxes. Our CPAs and enrolled agents ensure you pay only what you owe while maximizing deductions legally.',
      primaryCta: 'Schedule Consultation',
      secondaryCta: 'Call Us',
      stats: [
        { value: '5,000+', label: 'Returns Filed' },
        { value: '$5M+', label: 'Saved for Clients' },
        { value: '30+', label: 'Years Experience' },
      ],
    },
    benefits: {
      title: 'Why Choose Our CPA Firm',
      subtitle: 'Expert tax and accounting services',
      items: [
        { icon: 'Award', title: 'Licensed CPAs', description: 'Certified professionals with ongoing education.' },
        { icon: 'Shield', title: 'Audit Protection', description: 'We represent you if the IRS has questions.' },
        { icon: 'TrendingUp', title: 'Tax Planning', description: 'Year-round strategies to minimize your tax burden.' },
        { icon: 'Building', title: 'Business Services', description: 'Bookkeeping, payroll, and business tax expertise.' },
      ],
    },
    process: {
      title: 'How We Work',
      subtitle: 'Stress-free tax experience',
      variant: 'horizontal',
      steps: [
        { number: 1, title: 'Consultation', description: 'Review your situation and identify opportunities.' },
        { number: 2, title: 'Gather Documents', description: 'We guide you on what\'s needed.' },
        { number: 3, title: 'Preparation', description: 'Expert preparation maximizing deductions.' },
        { number: 4, title: 'Review & File', description: 'You approve before we file.' },
      ],
    },
    testimonials: {
      title: 'Client Success',
      subtitle: 'Real savings',
      variant: 'featured',
      items: [
        { quote: 'Saved me $8,000 over my previous preparer. Found deductions I never knew about!', author: 'Michael Thompson', role: 'Individual Client', rating: 5 },
        { quote: 'They handle all our business accounting and taxes. Saves us so much time and stress.', author: 'Sarah Chen', role: 'Business Owner', rating: 5 },
        { quote: 'Got me through an IRS audit without any additional tax owed. True professionals.', author: 'Robert Martinez', role: 'Audit Client', rating: 5 },
      ],
    },
    faq: {
      title: 'Tax & Accounting FAQs',
      subtitle: 'Common questions',
      items: [
        { question: 'How much do you charge?', answer: 'Fees depend on complexity. Simple returns start around $200. Business returns vary. We provide quotes upfront.' },
        { question: 'Can you help if I haven\'t filed in years?', answer: 'Yes! We specialize in helping clients catch up on back taxes and negotiate with the IRS.' },
        { question: 'Do you offer year-round service?', answer: 'Absolutely. Tax planning, bookkeeping, and accounting services are available all year.' },
        { question: 'What if I get audited?', answer: 'We stand behind our work and will represent you before the IRS at no additional charge for returns we prepared.' },
      ],
    },
    form: {
      title: 'Schedule Your Consultation',
      subtitle: 'Get expert tax help',
      fields: [
        ...baseFormFields,
        { name: 'service', label: 'Service Needed', type: 'select', required: true, options: [
          { value: '', label: 'Select service' },
          { value: 'individual', label: 'Individual Tax Return' },
          { value: 'business', label: 'Business Tax Return' },
          { value: 'bookkeeping', label: 'Bookkeeping' },
          { value: 'planning', label: 'Tax Planning' },
          { value: 'audit', label: 'Audit Help' },
        ]},
      ],
      submitText: 'Schedule Consultation',
    },
    seo: {
      title: 'CPA Miami | Tax Preparation & Accounting | Kanjona',
      description: 'Miami CPA firm for tax preparation, planning, and accounting. Individual and business taxes. IRS enrolled agents. Free consultation!',
      keywords: ['CPA miami', 'tax preparer miami', 'accountant miami', 'business tax', 'tax planning'],
    },
  },

  // Business Consulting
  'business-consulting': {
    service: {
      id: 'business-consulting',
      name: 'Business Consulting',
      tagline: 'Grow Your Business',
      description: 'Business strategy consulting',
      ctaText: 'Free Strategy Session',
      phone: '(305) 555-0138',
      gradient: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
      accentColor: '#a78bfa',
    },
    hero: {
      badge: 'Proven Growth Strategies',
      headline: 'Take Your Business to the Next Level',
      subheadline: 'Strategy, operations, and growth consulting',
      description: 'Stop guessing and start growing. Our consultants bring Fortune 500 experience to help small and mid-size businesses scale efficiently.',
      primaryCta: 'Free Strategy Session',
      secondaryCta: 'Learn More',
      stats: [
        { value: '500+', label: 'Businesses Helped' },
        { value: '40%', label: 'Avg Revenue Growth' },
        { value: 'Fortune 500', label: 'Experience' },
      ],
    },
    benefits: {
      title: 'Why Work With Us',
      subtitle: 'Results-driven consulting',
      items: [
        { icon: 'TrendingUp', title: 'Growth Focused', description: 'We focus on strategies that drive measurable growth.' },
        { icon: 'Target', title: 'Customized Approach', description: 'No cookie-cutter solutions - strategies built for your business.' },
        { icon: 'Award', title: 'Proven Track Record', description: 'Clients average 40% revenue growth.' },
        { icon: 'Users', title: 'Implementation Support', description: 'We help execute, not just advise.' },
      ],
    },
    process: {
      title: 'Our Consulting Process',
      subtitle: 'From strategy to execution',
      variant: 'timeline',
      steps: [
        { number: 1, title: 'Discovery', description: 'Deep dive into your business, market, and goals.' },
        { number: 2, title: 'Strategy', description: 'Develop customized growth strategy and roadmap.' },
        { number: 3, title: 'Implementation', description: 'Execute the plan with hands-on support.' },
        { number: 4, title: 'Optimization', description: 'Monitor, measure, and refine for continuous improvement.' },
      ],
    },
    testimonials: {
      title: 'Client Transformations',
      subtitle: 'Real business results',
      variant: 'featured',
      items: [
        { quote: 'Revenue doubled in 18 months. Their strategies transformed our business.', author: 'Michael Rodriguez', role: 'Tech Startup', rating: 5 },
        { quote: 'Finally have systems and processes that scale. Game changer for our growth.', author: 'Sarah Thompson', role: 'Service Business', rating: 5 },
        { quote: 'They helped us pivot successfully during difficult times. Strategic genius.', author: 'David Chen', role: 'Retail Business', rating: 5 },
      ],
    },
    faq: {
      title: 'Consulting FAQs',
      subtitle: 'Common questions',
      items: [
        { question: 'What size businesses do you work with?', answer: 'We work with businesses from $500K to $50M in revenue. Our strategies scale to your needs.' },
        { question: 'How long is a typical engagement?', answer: 'Engagements range from 3-month projects to ongoing advisory relationships depending on your goals.' },
        { question: 'What industries do you specialize in?', answer: 'We have deep experience in professional services, retail, technology, and healthcare industries.' },
        { question: 'Do you guarantee results?', answer: 'We tie our fees to your results. If you don\'t grow, you don\'t pay our full fee.' },
      ],
    },
    form: {
      title: 'Book Your Free Strategy Session',
      subtitle: 'No obligation, high value',
      fields: [
        ...baseFormFields,
        { name: 'company', label: 'Company Name', type: 'text', required: true, placeholder: 'Your Company' },
        { name: 'challenge', label: 'Biggest Challenge', type: 'select', required: true, options: [
          { value: '', label: 'Select challenge' },
          { value: 'growth', label: 'Revenue Growth' },
          { value: 'operations', label: 'Operations/Efficiency' },
          { value: 'strategy', label: 'Strategic Direction' },
          { value: 'hiring', label: 'Hiring/Team Building' },
          { value: 'other', label: 'Other' },
        ]},
      ],
      submitText: 'Book Strategy Session',
    },
    seo: {
      title: 'Business Consulting Miami | Growth Strategy | Kanjona',
      description: 'Miami business consultants. Strategy, operations, and growth consulting. Fortune 500 expertise for small business. Free strategy session!',
      keywords: ['business consultant miami', 'business consulting', 'growth strategy', 'business advisor', 'management consulting'],
    },
  },

  // Commercial Cleaning
  'commercial-cleaning': {
    service: {
      id: 'commercial-cleaning',
      name: 'Commercial Cleaning',
      tagline: 'Professional Workspaces',
      description: 'Commercial cleaning services',
      ctaText: 'Get a Quote',
      phone: '(305) 555-0139',
      gradient: 'linear-gradient(135deg, #0891b2, #06b6d4)',
      accentColor: '#22d3ee',
    },
    hero: {
      badge: 'Bonded & Insured',
      headline: 'A Clean Workplace, Every Day',
      subheadline: 'Office, retail, and commercial cleaning',
      description: 'Impress clients and keep employees healthy with professional commercial cleaning. Customized schedules, trained staff, and consistent results.',
      primaryCta: 'Get Free Quote',
      secondaryCta: 'Call Us',
      stats: [
        { value: '500+', label: 'Businesses Served' },
        { value: '99%', label: 'Retention Rate' },
        { value: 'Bonded', label: '& Insured' },
      ],
    },
    benefits: {
      title: 'Why Choose Our Commercial Cleaning',
      subtitle: 'Professional service you can trust',
      items: [
        { icon: 'ShieldCheck', title: 'Vetted Staff', description: 'Background-checked, trained cleaning professionals.' },
        { icon: 'Clock', title: 'Flexible Scheduling', description: 'After-hours, weekends, or whenever works for you.' },
        { icon: 'ClipboardCheck', title: 'Quality Assurance', description: 'Regular inspections ensure consistent quality.' },
        { icon: 'Leaf', title: 'Green Options', description: 'Eco-friendly cleaning products available.' },
      ],
    },
    process: {
      title: 'How We Work',
      subtitle: 'Customized cleaning programs',
      variant: 'horizontal',
      steps: [
        { number: 1, title: 'Walk-Through', description: 'We assess your space and understand your needs.' },
        { number: 2, title: 'Custom Quote', description: 'Detailed proposal tailored to your requirements.' },
        { number: 3, title: 'Service Begins', description: 'Trained team starts on your schedule.' },
        { number: 4, title: 'Quality Checks', description: 'Regular inspections maintain our standards.' },
      ],
    },
    testimonials: {
      title: 'Happy Businesses',
      subtitle: 'Client feedback',
      variant: 'grid',
      items: [
        { quote: 'Our office has never been cleaner. Employees and visitors notice the difference!', author: 'Robert Thompson', role: 'Office Manager', rating: 5 },
        { quote: 'Reliable, thorough, and professional. They make our retail space shine.', author: 'Sarah Martinez', role: 'Store Owner', rating: 5 },
        { quote: 'Switched to them after years of disappointment. Finally, consistency!', author: 'David Chen', role: 'Property Manager', rating: 5 },
      ],
    },
    faq: {
      title: 'Commercial Cleaning FAQs',
      subtitle: 'Common questions',
      items: [
        { question: 'What types of businesses do you clean?', answer: 'Offices, retail stores, medical facilities, warehouses, restaurants, and more. We customize for each type.' },
        { question: 'How often can you clean?', answer: 'Daily, weekly, bi-weekly, or monthly - whatever fits your needs and budget.' },
        { question: 'Are you insured?', answer: 'Yes! We carry comprehensive liability insurance and all employees are bonded.' },
        { question: 'Do you bring your own supplies?', answer: 'Yes, we provide all supplies and equipment. We can also use your preferred products if requested.' },
      ],
    },
    form: {
      title: 'Get Your Free Quote',
      subtitle: 'Custom cleaning proposal',
      fields: [
        ...baseFormFields,
        { name: 'business_name', label: 'Business Name', type: 'text', required: true, placeholder: 'Your Business' },
        { name: 'address', label: 'Business Address', type: 'text', required: true, placeholder: '123 Main St, Miami, FL' },
        { name: 'type', label: 'Business Type', type: 'select', required: true, options: [
          { value: '', label: 'Select type' },
          { value: 'office', label: 'Office' },
          { value: 'retail', label: 'Retail' },
          { value: 'medical', label: 'Medical/Dental' },
          { value: 'restaurant', label: 'Restaurant' },
          { value: 'warehouse', label: 'Warehouse' },
          { value: 'other', label: 'Other' },
        ]},
      ],
      submitText: 'Get Free Quote',
    },
    seo: {
      title: 'Commercial Cleaning Miami | Office Cleaning Services | Kanjona',
      description: 'Professional commercial cleaning in Miami. Offices, retail, medical facilities. Bonded & insured, flexible scheduling. Get your free quote!',
      keywords: ['commercial cleaning miami', 'office cleaning miami', 'janitorial services', 'business cleaning', 'professional cleaning'],
    },
  },

  // Auto Repair
  'auto-repair': {
    service: {
      id: 'auto-repair',
      name: 'Auto Repair',
      tagline: 'Keep Your Car Running',
      description: 'Auto repair and maintenance',
      ctaText: 'Schedule Service',
      phone: '(305) 555-0140',
      gradient: 'linear-gradient(135deg, #dc2626, #ef4444)',
      accentColor: '#f87171',
    },
    hero: {
      badge: 'ASE Certified Mechanics',
      headline: 'Honest Auto Repair You Can Trust',
      subheadline: 'All makes and models, fair prices',
      description: 'Tired of dealership prices and shady mechanics? Our ASE certified technicians fix it right the first time at fair prices. All work guaranteed.',
      primaryCta: 'Schedule Service',
      secondaryCta: 'Call Now',
      stats: [
        { value: '30,000+', label: 'Repairs Completed' },
        { value: '25+', label: 'Years Experience' },
        { value: 'All Brands', label: 'Serviced' },
      ],
    },
    benefits: {
      title: 'Why Choose Our Shop',
      subtitle: 'Honest, quality auto repair',
      items: [
        { icon: 'Award', title: 'ASE Certified', description: 'Technicians certified by the National Institute for Automotive Excellence.' },
        { icon: 'Receipt', title: 'Transparent Pricing', description: 'Upfront quotes, no surprise charges. We explain every repair.' },
        { icon: 'Shield', title: 'Warranty', description: '24-month/24,000-mile warranty on repairs.' },
        { icon: 'Clock', title: 'Fast Service', description: 'Most repairs completed same-day.' },
      ],
    },
    process: {
      title: 'Our Service Process',
      subtitle: 'Simple, transparent repairs',
      variant: 'horizontal',
      steps: [
        { number: 1, title: 'Schedule', description: 'Book online or call for an appointment.' },
        { number: 2, title: 'Diagnose', description: 'We identify the issue and explain it clearly.' },
        { number: 3, title: 'Approve', description: 'You approve the repair and cost before work begins.' },
        { number: 4, title: 'Repair', description: 'Quality repair with warranty protection.' },
      ],
    },
    testimonials: {
      title: 'Happy Customers',
      subtitle: 'Real reviews',
      variant: 'grid',
      items: [
        { quote: 'Finally found an honest mechanic! Fixed the issue two other shops couldn\'t diagnose.', author: 'Maria Santos', role: 'Honda Owner', rating: 5 },
        { quote: 'Fair prices and great work. They\'ve serviced all our family cars for years.', author: 'The Thompson Family', role: 'Regular Customers', rating: 5 },
        { quote: 'Dealership quoted $1,500. They fixed it for $400. Same quality, honest pricing.', author: 'Robert Chen', role: 'BMW Owner', rating: 5 },
      ],
    },
    faq: {
      title: 'Auto Repair FAQs',
      subtitle: 'Common questions',
      items: [
        { question: 'What brands do you work on?', answer: 'All makes and models - domestic and import. From Hondas to Mercedes, we service them all.' },
        { question: 'Do you offer warranties?', answer: 'Yes! 24-month/24,000-mile warranty on parts and labor for most repairs.' },
        { question: 'Can you match dealership prices?', answer: 'We\'re typically 30-50% less than dealerships with the same quality work and parts.' },
        { question: 'Do you offer loaner cars?', answer: 'We offer free shuttle service and can arrange rentals for longer repairs.' },
      ],
    },
    form: {
      title: 'Schedule Your Service',
      subtitle: 'Book your repair appointment',
      fields: [
        ...baseFormFields,
        { name: 'vehicle', label: 'Vehicle (Year Make Model)', type: 'text', required: true, placeholder: '2020 Honda Accord' },
        { name: 'service', label: 'Service Needed', type: 'select', required: true, options: [
          { value: '', label: 'Select service' },
          { value: 'oil', label: 'Oil Change' },
          { value: 'brakes', label: 'Brakes' },
          { value: 'diagnostic', label: 'Check Engine Light' },
          { value: 'ac', label: 'AC Repair' },
          { value: 'other', label: 'Other Repair' },
        ]},
        { name: 'issue', label: 'Describe the Issue', type: 'textarea', required: false, placeholder: 'What\'s happening with your vehicle?' },
      ],
      submitText: 'Schedule Service',
    },
    seo: {
      title: 'Auto Repair Miami | Mechanic Shop | All Makes & Models | Kanjona',
      description: 'Honest auto repair in Miami. ASE certified mechanics, all makes and models. Fair prices, 24-month warranty. Schedule your service today!',
      keywords: ['auto repair miami', 'mechanic miami', 'car repair', 'brake repair', 'oil change miami'],
    },
  },

  // Auto Detailing
  'auto-detailing': {
    service: {
      id: 'auto-detailing',
      name: 'Auto Detailing',
      tagline: 'Showroom Shine',
      description: 'Professional auto detailing',
      ctaText: 'Book Detail',
      phone: '(305) 555-0141',
      gradient: 'linear-gradient(135deg, #0f172a, #334155)',
      accentColor: '#64748b',
    },
    hero: {
      badge: 'Premium Mobile Detailing',
      headline: 'Make Your Car Look Brand New',
      subheadline: 'Professional detailing at your location',
      description: 'We come to you! From basic washes to full paint correction, our mobile detailing team brings showroom-quality results to your driveway or office.',
      primaryCta: 'Book Now',
      secondaryCta: 'View Packages',
      stats: [
        { value: '10,000+', label: 'Cars Detailed' },
        { value: 'Mobile', label: 'We Come to You' },
        { value: '5.0★', label: 'Rating' },
      ],
    },
    benefits: {
      title: 'Why Choose Our Detailing',
      subtitle: 'Premium mobile service',
      items: [
        { icon: 'MapPin', title: 'We Come to You', description: 'Home, office, or anywhere - we bring the detail shop to you.' },
        { icon: 'Sparkles', title: 'Premium Products', description: 'We use only professional-grade products and equipment.' },
        { icon: 'Shield', title: 'Paint Protection', description: 'Ceramic coatings and paint correction expertise.' },
        { icon: 'Clock', title: 'Convenient Scheduling', description: 'Book online, we work around your schedule.' },
      ],
    },
    process: {
      title: 'The Detail Process',
      subtitle: 'From dirty to showroom',
      variant: 'horizontal',
      steps: [
        { number: 1, title: 'Book Online', description: 'Choose your package and schedule.' },
        { number: 2, title: 'We Arrive', description: 'Our team arrives with everything needed.' },
        { number: 3, title: 'We Detail', description: 'Thorough cleaning inside and out.' },
        { number: 4, title: 'You Enjoy', description: 'Drive away in a like-new car.' },
      ],
    },
    testimonials: {
      title: 'Happy Car Owners',
      subtitle: 'Transformation stories',
      variant: 'featured',
      items: [
        { quote: 'My 5-year-old car looks better than when I bought it. The paint correction is incredible!', author: 'Michael Thompson', role: 'BMW Owner', rating: 5 },
        { quote: 'So convenient having them detail at my office. Car was perfect when I left work.', author: 'Sarah Martinez', role: 'Tesla Owner', rating: 5 },
        { quote: 'Interior deep clean removed stains I thought were permanent. Magic!', author: 'David Chen', role: 'SUV Owner', rating: 5 },
      ],
    },
    faq: {
      title: 'Detailing FAQs',
      subtitle: 'Common questions',
      items: [
        { question: 'How long does detailing take?', answer: 'Basic exterior wash takes 1-2 hours. Full interior and exterior detail takes 3-5 hours. Paint correction is a full day.' },
        { question: 'Do I need to provide water/power?', answer: 'We bring our own water and power for most services. Just need a place to park!' },
        { question: 'What is ceramic coating?', answer: 'A liquid polymer that bonds to paint, providing long-lasting protection and shine. Lasts 2-5 years.' },
        { question: 'Can you remove scratches?', answer: 'Many scratches can be reduced or eliminated with paint correction. We\'ll assess and advise honestly.' },
      ],
    },
    form: {
      title: 'Book Your Detail',
      subtitle: 'Schedule mobile detailing',
      fields: [
        ...baseFormFields,
        { name: 'address', label: 'Service Location', type: 'text', required: true, placeholder: 'Home or office address' },
        { name: 'vehicle', label: 'Vehicle Type', type: 'select', required: true, options: [
          { value: '', label: 'Select vehicle type' },
          { value: 'sedan', label: 'Sedan/Coupe' },
          { value: 'suv', label: 'SUV/Crossover' },
          { value: 'truck', label: 'Truck' },
          { value: 'van', label: 'Van/Minivan' },
          { value: 'luxury', label: 'Luxury/Exotic' },
        ]},
        { name: 'package', label: 'Service Package', type: 'select', required: true, options: [
          { value: '', label: 'Select package' },
          { value: 'exterior', label: 'Exterior Wash' },
          { value: 'interior', label: 'Interior Detail' },
          { value: 'full', label: 'Full Detail' },
          { value: 'premium', label: 'Premium (w/ Paint Correction)' },
          { value: 'ceramic', label: 'Ceramic Coating' },
        ]},
      ],
      submitText: 'Book My Detail',
    },
    seo: {
      title: 'Auto Detailing Miami | Mobile Car Detailing | Kanjona',
      description: 'Premium mobile auto detailing in Miami. We come to you! Interior, exterior, paint correction, ceramic coating. Book your detail today!',
      keywords: ['auto detailing miami', 'mobile detailing', 'car detailing', 'paint correction miami', 'ceramic coating'],
    },
  },

  // Towing
  'towing': {
    service: {
      id: 'towing',
      name: 'Towing',
      tagline: 'Help When You Need It',
      description: '24/7 towing services',
      ctaText: 'Call Now',
      phone: '(305) 555-0142',
      gradient: 'linear-gradient(135deg, #dc2626, #b91c1c)',
      accentColor: '#f87171',
    },
    hero: {
      badge: '24/7 Emergency Towing',
      headline: 'Stranded? We\'ll Get You Moving',
      subheadline: 'Fast, reliable towing services',
      description: 'Car trouble happens at the worst times. Our 24/7 dispatch means help is always just a call away. Fast arrival, fair prices, professional service.',
      primaryCta: 'Call Now',
      secondaryCta: 'Request Tow Online',
      stats: [
        { value: '20 min', label: 'Avg Response' },
        { value: '24/7', label: 'Availability' },
        { value: '50,000+', label: 'Tows Completed' },
      ],
    },
    benefits: {
      title: 'Why Call Us',
      subtitle: 'Fast, reliable towing',
      items: [
        { icon: 'Zap', title: '20-Minute Response', description: 'Fast dispatch gets you off the road quickly.' },
        { icon: 'Clock', title: '24/7 Service', description: 'Middle of the night? We\'re always available.' },
        { icon: 'BadgeDollarSign', title: 'Fair Pricing', description: 'Upfront quotes, no hidden fees or surprises.' },
        { icon: 'Truck', title: 'All Vehicles', description: 'Cars, trucks, motorcycles, boats - we tow it all.' },
      ],
    },
    process: {
      title: 'How It Works',
      subtitle: 'Quick, easy towing',
      variant: 'horizontal',
      steps: [
        { number: 1, title: 'Call or Request', description: 'Tell us your location and vehicle info.' },
        { number: 2, title: 'We Dispatch', description: 'Nearest truck heads your way immediately.' },
        { number: 3, title: 'Quote', description: 'You approve the price before we load.' },
        { number: 4, title: 'Tow', description: 'Safe, professional transport to your destination.' },
      ],
    },
    testimonials: {
      title: 'Rescued Drivers',
      subtitle: 'Real experiences',
      variant: 'grid',
      items: [
        { quote: 'Broke down at 2am. They arrived in 15 minutes and got me home safely. Lifesavers!', author: 'Maria Santos', role: 'Emergency Tow', rating: 5 },
        { quote: 'Fair price, friendly driver, careful with my car. Will use again if needed.', author: 'Robert Thompson', role: 'Vehicle Transport', rating: 5 },
        { quote: 'They handle all towing for our shop. Always reliable and professional.', author: 'David\'s Auto', role: 'Business Account', rating: 5 },
      ],
    },
    faq: {
      title: 'Towing FAQs',
      subtitle: 'Common questions',
      items: [
        { question: 'How fast can you get here?', answer: 'Our average response time is 20-30 minutes within our service area. We dispatch immediately.' },
        { question: 'How much does towing cost?', answer: 'Prices depend on distance and vehicle type. We provide quotes before loading. Typical local tows start around $75.' },
        { question: 'Can you tow all vehicle types?', answer: 'Yes! Cars, trucks, SUVs, motorcycles, RVs, and boats. Flatbed and wheel-lift available.' },
        { question: 'Do you take insurance?', answer: 'Yes, we work with all roadside assistance programs and insurance companies.' },
      ],
    },
    form: {
      title: 'Request a Tow',
      subtitle: 'Or call for immediate dispatch',
      fields: [
        ...baseFormFields,
        { name: 'location', label: 'Current Location', type: 'text', required: true, placeholder: 'Street address or intersection' },
        { name: 'destination', label: 'Where to Tow?', type: 'text', required: true, placeholder: 'Destination address' },
        { name: 'vehicle', label: 'Vehicle Type', type: 'select', required: true, options: [
          { value: '', label: 'Select vehicle' },
          { value: 'car', label: 'Car/Sedan' },
          { value: 'suv', label: 'SUV/Truck' },
          { value: 'motorcycle', label: 'Motorcycle' },
          { value: 'rv', label: 'RV/Large Vehicle' },
          { value: 'other', label: 'Other' },
        ]},
      ],
      submitText: 'Request Tow',
    },
    seo: {
      title: 'Towing Miami | 24/7 Emergency Tow Truck | Kanjona',
      description: '24/7 towing in Miami. Fast 20-minute response, fair prices, all vehicle types. Stranded? Call now for immediate dispatch!',
      keywords: ['towing miami', 'tow truck miami', '24 hour towing', 'emergency towing', 'roadside assistance'],
    },
  },

  // Auto Glass
  'auto-glass': {
    service: {
      id: 'auto-glass',
      name: 'Auto Glass',
      tagline: 'Clear Views, Safe Drives',
      description: 'Windshield repair & replacement',
      ctaText: 'Get Free Quote',
      phone: '(305) 555-0143',
      gradient: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
      accentColor: '#7dd3fc',
    },
    hero: {
      badge: 'Mobile Auto Glass Service',
      headline: 'Windshield Damaged? We Fix It Fast',
      subheadline: 'Mobile repair and replacement',
      description: 'Chips, cracks, and full replacements - we come to you! Most repairs in under an hour. Insurance approved and OEM quality glass.',
      primaryCta: 'Get Free Quote',
      secondaryCta: 'Call Now',
      stats: [
        { value: '20,000+', label: 'Windshields Fixed' },
        { value: 'Mobile', label: 'We Come to You' },
        { value: 'Insurance', label: 'Claims Handled' },
      ],
    },
    benefits: {
      title: 'Why Choose Our Auto Glass',
      subtitle: 'Convenient, quality service',
      items: [
        { icon: 'MapPin', title: 'Mobile Service', description: 'We come to your home, work, or anywhere convenient.' },
        { icon: 'Shield', title: 'OEM Quality', description: 'We use original equipment quality glass for perfect fit.' },
        { icon: 'FileCheck', title: 'Insurance Direct', description: 'We work with all insurance companies and handle claims.' },
        { icon: 'Clock', title: 'Fast Service', description: 'Most chips repaired in 30 minutes, replacements in 1 hour.' },
      ],
    },
    process: {
      title: 'How It Works',
      subtitle: 'Easy windshield service',
      variant: 'horizontal',
      steps: [
        { number: 1, title: 'Get Quote', description: 'Tell us your vehicle and damage type.' },
        { number: 2, title: 'Schedule', description: 'Pick a time and location that works for you.' },
        { number: 3, title: 'We Arrive', description: 'Our technician comes with everything needed.' },
        { number: 4, title: 'Fixed', description: 'Drive away with a clear, safe windshield.' },
      ],
    },
    testimonials: {
      title: 'Happy Drivers',
      subtitle: 'Customer experiences',
      variant: 'featured',
      items: [
        { quote: 'Replaced my windshield in my office parking lot. So convenient and great work!', author: 'Maria Santos', role: 'Full Replacement', rating: 5 },
        { quote: 'Small chip repaired in 20 minutes. Can\'t even tell where it was!', author: 'Robert Thompson', role: 'Chip Repair', rating: 5 },
        { quote: 'They handled my insurance claim completely. Paid nothing out of pocket.', author: 'Sarah Chen', role: 'Insurance Claim', rating: 5 },
      ],
    },
    faq: {
      title: 'Auto Glass FAQs',
      subtitle: 'Common questions',
      items: [
        { question: 'Can a chip be repaired or does it need replacement?', answer: 'Chips smaller than a quarter can usually be repaired. Cracks or larger damage typically require replacement.' },
        { question: 'Will insurance cover my windshield?', answer: 'Most comprehensive policies cover windshield repair (often with no deductible) and replacement. We verify coverage for you.' },
        { question: 'How long until I can drive after replacement?', answer: 'The adhesive needs about 1 hour to cure before driving. We\'ll let you know when it\'s safe.' },
        { question: 'Is the replacement glass as good as original?', answer: 'Yes! We use OEM quality glass that meets or exceeds original specifications.' },
      ],
    },
    form: {
      title: 'Get Your Free Quote',
      subtitle: 'Quick estimate for your vehicle',
      fields: [
        ...baseFormFields,
        { name: 'vehicle', label: 'Vehicle (Year Make Model)', type: 'text', required: true, placeholder: '2020 Honda Accord' },
        { name: 'damage', label: 'Type of Damage', type: 'select', required: true, options: [
          { value: '', label: 'Select damage type' },
          { value: 'chip', label: 'Small Chip' },
          { value: 'crack', label: 'Crack' },
          { value: 'replacement', label: 'Needs Replacement' },
          { value: 'other', label: 'Other Glass (Side, Back)' },
        ]},
        { name: 'insurance', label: 'Insurance Claim?', type: 'select', required: false, options: [
          { value: '', label: 'Select option' },
          { value: 'yes', label: 'Yes, using insurance' },
          { value: 'no', label: 'No, paying cash' },
          { value: 'unsure', label: 'Not sure' },
        ]},
      ],
      submitText: 'Get Free Quote',
    },
    seo: {
      title: 'Auto Glass Miami | Windshield Repair & Replacement | Kanjona',
      description: 'Mobile auto glass service in Miami. Windshield repair and replacement. Insurance claims handled. We come to you! Get your free quote today.',
      keywords: ['auto glass miami', 'windshield repair miami', 'windshield replacement', 'mobile windshield service', 'cracked windshield'],
    },
  },

  // Security Systems
  'security-systems': {
    service: {
      id: 'security-systems',
      name: 'Security Systems',
      tagline: 'Protect What Matters',
      description: 'Home and business security',
      ctaText: 'Free Security Assessment',
      phone: '(305) 555-0144',
      gradient: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
      accentColor: '#3b82f6',
    },
    hero: {
      badge: 'Professional Security Installation',
      headline: 'Smart Security for Peace of Mind',
      subheadline: 'Cameras, alarms, and monitoring',
      description: 'Protect your home or business with professional security systems. From smart cameras to 24/7 monitoring, we design and install complete security solutions.',
      primaryCta: 'Free Assessment',
      secondaryCta: 'Call Now',
      stats: [
        { value: '5,000+', label: 'Systems Installed' },
        { value: '24/7', label: 'Monitoring Available' },
        { value: '20+', label: 'Years Experience' },
      ],
    },
    benefits: {
      title: 'Why Choose Our Security',
      subtitle: 'Complete protection solutions',
      items: [
        { icon: 'Shield', title: 'Custom Design', description: 'Security plans tailored to your property and needs.' },
        { icon: 'Eye', title: 'Smart Technology', description: 'View cameras and control systems from your phone.' },
        { icon: 'Clock', title: '24/7 Monitoring', description: 'Professional monitoring with rapid emergency response.' },
        { icon: 'Award', title: 'Expert Installation', description: 'Licensed installers with proper setup and training.' },
      ],
    },
    process: {
      title: 'Getting Secured',
      subtitle: 'From assessment to protection',
      variant: 'horizontal',
      steps: [
        { number: 1, title: 'Free Assessment', description: 'We evaluate your property and security needs.' },
        { number: 2, title: 'Custom Design', description: 'Tailored system design with equipment recommendations.' },
        { number: 3, title: 'Installation', description: 'Professional installation with full training.' },
        { number: 4, title: 'Monitoring', description: 'Optional 24/7 professional monitoring activated.' },
      ],
    },
    testimonials: {
      title: 'Protected Properties',
      subtitle: 'Customer experiences',
      variant: 'grid',
      items: [
        { quote: 'Caught a package thief on camera. Police had the footage within minutes. System paid for itself!', author: 'Maria Santos', role: 'Home System', rating: 5 },
        { quote: 'Complete business security with access control. Know exactly who enters when.', author: 'Robert Thompson', role: 'Business Security', rating: 5 },
        { quote: 'Love checking cameras from my phone. Peace of mind when we\'re traveling.', author: 'The Chen Family', role: 'Smart Home', rating: 5 },
      ],
    },
    faq: {
      title: 'Security FAQs',
      subtitle: 'Common questions',
      items: [
        { question: 'Do I need professional monitoring?', answer: 'It\'s optional but recommended. Self-monitoring works if you can respond 24/7. Professional monitoring ensures response even when you can\'t.' },
        { question: 'Can I view cameras on my phone?', answer: 'Yes! All our camera systems include free apps for remote viewing from any smartphone or tablet.' },
        { question: 'Do you install in businesses?', answer: 'Absolutely! We design and install commercial security including access control, cameras, and alarm systems.' },
        { question: 'What about existing smart home devices?', answer: 'We integrate with most smart home platforms including Alexa, Google Home, and Apple HomeKit.' },
      ],
    },
    form: {
      title: 'Get Your Free Assessment',
      subtitle: 'No obligation security evaluation',
      fields: [
        ...baseFormFields,
        { name: 'address', label: 'Property Address', type: 'text', required: true, placeholder: '123 Main St, Miami, FL' },
        { name: 'property_type', label: 'Property Type', type: 'select', required: true, options: [
          { value: '', label: 'Select property type' },
          { value: 'home', label: 'Single Family Home' },
          { value: 'condo', label: 'Condo/Apartment' },
          { value: 'business', label: 'Business' },
          { value: 'multi', label: 'Multi-Family' },
        ]},
        { name: 'needs', label: 'What Do You Need?', type: 'select', required: true, options: [
          { value: '', label: 'Select needs' },
          { value: 'cameras', label: 'Security Cameras' },
          { value: 'alarm', label: 'Alarm System' },
          { value: 'both', label: 'Cameras + Alarm' },
          { value: 'full', label: 'Complete Security System' },
        ]},
      ],
      submitText: 'Get Free Assessment',
    },
    seo: {
      title: 'Security Systems Miami | Home & Business Security | Kanjona',
      description: 'Professional security systems in Miami. Cameras, alarms, 24/7 monitoring. Free assessment, expert installation. Protect your property today!',
      keywords: ['security systems miami', 'home security miami', 'security cameras', 'alarm system installation', 'business security'],
    },
  },

  // IT Services
  'it-services': {
    service: {
      id: 'it-services',
      name: 'IT Services',
      tagline: 'Technology That Works',
      description: 'IT support for businesses',
      ctaText: 'Get IT Support',
      phone: '(305) 555-0145',
      gradient: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
      accentColor: '#a78bfa',
    },
    hero: {
      badge: 'Managed IT Services',
      headline: 'IT Problems Solved, Business Protected',
      subheadline: 'Support, security, and cloud solutions',
      description: 'Stop technology headaches from slowing your business. Our managed IT services keep your systems running, secure, and optimized.',
      primaryCta: 'Get IT Assessment',
      secondaryCta: 'Call for Support',
      stats: [
        { value: '500+', label: 'Businesses Served' },
        { value: '15 min', label: 'Avg Response Time' },
        { value: '99.9%', label: 'Uptime Guaranteed' },
      ],
    },
    benefits: {
      title: 'Why Choose Our IT Services',
      subtitle: 'Reliable technology partnership',
      items: [
        { icon: 'HeadphonesIcon', title: 'Help Desk Support', description: '24/7 support for your team when issues arise.' },
        { icon: 'Shield', title: 'Cybersecurity', description: 'Protect your business from threats and breaches.' },
        { icon: 'Cloud', title: 'Cloud Solutions', description: 'Migration, management, and optimization of cloud services.' },
        { icon: 'TrendingUp', title: 'Proactive Monitoring', description: 'We catch issues before they become problems.' },
      ],
    },
    process: {
      title: 'Getting Started',
      subtitle: 'Your IT transformation',
      variant: 'timeline',
      steps: [
        { number: 1, title: 'Assessment', description: 'We audit your current IT infrastructure and needs.' },
        { number: 2, title: 'Strategy', description: 'Custom plan to improve reliability and security.' },
        { number: 3, title: 'Implementation', description: 'Deploy solutions with minimal disruption.' },
        { number: 4, title: 'Ongoing Support', description: 'Continuous monitoring and support.' },
      ],
    },
    testimonials: {
      title: 'Client Success',
      subtitle: 'IT that works',
      variant: 'featured',
      items: [
        { quote: 'Downtime went from hours per month to virtually zero. Huge productivity boost!', author: 'Sarah Martinez', role: 'Law Firm', rating: 5 },
        { quote: 'They caught a ransomware attack before it did damage. Worth every penny.', author: 'Robert Chen', role: 'Healthcare Practice', rating: 5 },
        { quote: 'Finally have IT that just works. Our team can focus on actual work now.', author: 'David Thompson', role: 'Financial Services', rating: 5 },
      ],
    },
    faq: {
      title: 'IT Services FAQs',
      subtitle: 'Common questions',
      items: [
        { question: 'What size businesses do you support?', answer: 'We work with businesses from 5 to 500 employees. Our solutions scale to your needs.' },
        { question: 'How fast do you respond to issues?', answer: 'Critical issues get 15-minute response. Regular support requests typically within 1-2 hours.' },
        { question: 'Can you support remote workers?', answer: 'Absolutely! We specialize in supporting hybrid and remote teams with secure, efficient solutions.' },
        { question: 'Do you offer cybersecurity?', answer: 'Yes! Security is core to everything we do. From endpoint protection to employee training.' },
      ],
    },
    form: {
      title: 'Get Your IT Assessment',
      subtitle: 'Free infrastructure review',
      fields: [
        ...baseFormFields,
        { name: 'company', label: 'Company Name', type: 'text', required: true, placeholder: 'Your Company' },
        { name: 'employees', label: 'Number of Employees', type: 'select', required: true, options: [
          { value: '', label: 'Select size' },
          { value: '1-10', label: '1-10' },
          { value: '11-25', label: '11-25' },
          { value: '26-50', label: '26-50' },
          { value: '51-100', label: '51-100' },
          { value: '100+', label: '100+' },
        ]},
        { name: 'need', label: 'Primary Need', type: 'select', required: true, options: [
          { value: '', label: 'Select need' },
          { value: 'support', label: 'IT Support/Help Desk' },
          { value: 'security', label: 'Cybersecurity' },
          { value: 'cloud', label: 'Cloud Migration' },
          { value: 'full', label: 'Full Managed IT' },
        ]},
      ],
      submitText: 'Get Free Assessment',
    },
    seo: {
      title: 'IT Services Miami | Managed IT Support | Kanjona',
      description: 'Managed IT services in Miami. Help desk support, cybersecurity, cloud solutions. Keep your business running. Free IT assessment!',
      keywords: ['IT services miami', 'managed IT', 'IT support miami', 'cybersecurity', 'cloud services miami'],
    },
  },

  // Marketing Agency
  'marketing-agency': {
    service: {
      id: 'marketing-agency',
      name: 'Marketing Agency',
      tagline: 'Grow Your Brand',
      description: 'Digital marketing services',
      ctaText: 'Get Marketing Plan',
      phone: '(305) 555-0146',
      gradient: 'linear-gradient(135deg, #db2777, #ec4899)',
      accentColor: '#f472b6',
    },
    hero: {
      badge: 'Results-Driven Marketing',
      headline: 'Marketing That Actually Works',
      subheadline: 'Digital marketing, SEO, and social media',
      description: 'Stop wasting money on marketing that doesn\'t deliver. We create data-driven campaigns that generate leads, customers, and revenue growth.',
      primaryCta: 'Get Free Strategy',
      secondaryCta: 'View Case Studies',
      stats: [
        { value: '300+', label: 'Clients Served' },
        { value: '10x', label: 'Avg ROI' },
        { value: '$50M+', label: 'Revenue Generated' },
      ],
    },
    benefits: {
      title: 'Why Choose Our Agency',
      subtitle: 'Marketing that delivers',
      items: [
        { icon: 'Target', title: 'Results Focused', description: 'We track ROI obsessively. Your success is our success.' },
        { icon: 'BarChart3', title: 'Data Driven', description: 'Decisions backed by analytics, not guesses.' },
        { icon: 'Rocket', title: 'Full Service', description: 'SEO, PPC, social, content, email - we do it all.' },
        { icon: 'Users', title: 'Dedicated Team', description: 'Your own account team, not rotating staff.' },
      ],
    },
    process: {
      title: 'Our Approach',
      subtitle: 'Strategy to results',
      variant: 'horizontal',
      steps: [
        { number: 1, title: 'Discovery', description: 'Understand your business, market, and goals.' },
        { number: 2, title: 'Strategy', description: 'Data-backed marketing plan and roadmap.' },
        { number: 3, title: 'Execute', description: 'Launch campaigns across chosen channels.' },
        { number: 4, title: 'Optimize', description: 'Continuous improvement for better results.' },
      ],
    },
    testimonials: {
      title: 'Client Results',
      subtitle: 'Real growth stories',
      variant: 'featured',
      items: [
        { quote: 'Leads increased 300% in 6 months. Best marketing investment we\'ve ever made.', author: 'Maria Santos', role: 'E-commerce', rating: 5 },
        { quote: 'They took us from page 10 to #1 on Google. Revenue doubled.', author: 'Robert Thompson', role: 'Service Business', rating: 5 },
        { quote: 'Social media finally driving real customers. Their content strategy is brilliant.', author: 'Sarah Chen', role: 'Restaurant Group', rating: 5 },
      ],
    },
    faq: {
      title: 'Marketing FAQs',
      subtitle: 'Common questions',
      items: [
        { question: 'What marketing services do you offer?', answer: 'SEO, PPC advertising, social media management, content marketing, email marketing, and web design.' },
        { question: 'How long until I see results?', answer: 'PPC can generate leads immediately. SEO typically takes 3-6 months. We set realistic expectations upfront.' },
        { question: 'What\'s your pricing model?', answer: 'We offer monthly retainers based on scope. Most clients invest $2,000-$10,000/month depending on services.' },
        { question: 'Do you require long contracts?', answer: 'We recommend 6-month commitments for SEO due to timeline, but PPC and social can be month-to-month.' },
      ],
    },
    form: {
      title: 'Get Your Free Marketing Strategy',
      subtitle: 'No obligation consultation',
      fields: [
        ...baseFormFields,
        { name: 'company', label: 'Company Name', type: 'text', required: true, placeholder: 'Your Company' },
        { name: 'website', label: 'Website', type: 'text', required: false, placeholder: 'www.yoursite.com' },
        { name: 'service', label: 'Service Interest', type: 'select', required: true, options: [
          { value: '', label: 'Select service' },
          { value: 'seo', label: 'SEO' },
          { value: 'ppc', label: 'PPC/Paid Ads' },
          { value: 'social', label: 'Social Media' },
          { value: 'content', label: 'Content Marketing' },
          { value: 'full', label: 'Full Service' },
        ]},
      ],
      submitText: 'Get Free Strategy',
    },
    seo: {
      title: 'Marketing Agency Miami | Digital Marketing | SEO | Kanjona',
      description: 'Results-driven Miami marketing agency. SEO, PPC, social media, content marketing. Generate leads and grow revenue. Free strategy session!',
      keywords: ['marketing agency miami', 'digital marketing miami', 'SEO agency', 'social media marketing', 'PPC management'],
    },
  },
};

export function getLandingPageConfig(serviceId: string): LandingPageConfig | undefined {
  return landingPageConfigs[serviceId];
}

export function getAllServiceIds(): string[] {
  return Object.keys(landingPageConfigs);
}
