import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import LeadForm from '@/components/LeadForm';
import { Footer } from '@/components/Footer';

/**
 * Generate static params for all locales
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Home Page Component
 * Landing page with lead capture form
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  // Enable static rendering
  setRequestLocale(locale);

  return <HomePageContent />;
}

/**
 * Home Page Content (Client Component wrapper)
 */
function HomePageContent() {
  const t = useTranslations('home');

  return (
    <main style={styles.main}>
      {/* Header with Language Switcher */}
      <header style={styles.header}>
        <LanguageSwitcher />
      </header>

      {/* Hero Section */}
      <section style={styles.hero}>
        <h1 style={styles.headline}>{t('headline')}</h1>
        <p style={styles.subheadline}>{t('subheadline')}</p>
      </section>

      {/* Features Section */}
      <section style={styles.features}>
        <h2 style={styles.featuresTitle}>{t('features.title')}</h2>
        <ul style={styles.featuresList}>
          <li style={styles.featureItem}>{t('features.qualified')}</li>
          <li style={styles.featureItem}>{t('features.conversion')}</li>
          <li style={styles.featureItem}>{t('features.booking')}</li>
          <li style={styles.featureItem}>{t('features.local')}</li>
        </ul>
      </section>

      {/* Lead Form Section */}
      <section style={styles.formSection}>
        <LeadForm />
      </section>

      {/* Footer with legal links */}
      <Footer showLanguageSwitcher={false} />
    </main>
  );
}

/**
 * Minimal inline styles
 */
const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'flex-end',
    backgroundColor: '#fff',
    borderBottom: '1px solid #eee',
  },
  hero: {
    padding: '48px 24px',
    textAlign: 'center',
    backgroundColor: '#fff',
    maxWidth: '800px',
    margin: '0 auto',
    width: '100%',
  },
  headline: {
    fontSize: '36px',
    fontWeight: '700',
    marginBottom: '16px',
    color: '#111',
    lineHeight: 1.2,
  },
  subheadline: {
    fontSize: '18px',
    color: '#666',
    maxWidth: '600px',
    margin: '0 auto',
    lineHeight: 1.6,
  },
  features: {
    padding: '32px 24px',
    backgroundColor: '#f9fafb',
    maxWidth: '800px',
    margin: '0 auto',
    width: '100%',
  },
  featuresTitle: {
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#111',
    textAlign: 'center',
  },
  featuresList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'grid',
    gap: '12px',
  },
  featureItem: {
    padding: '12px 16px',
    backgroundColor: '#fff',
    borderRadius: '4px',
    borderLeft: '4px solid #0070f3',
    fontSize: '14px',
    color: '#333',
  },
  formSection: {
    padding: '48px 24px',
    flex: 1,
  },
};
