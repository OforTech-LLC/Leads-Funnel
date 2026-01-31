import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

/**
 * Generate metadata for the terms page
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return {
    title: locale === 'es' ? 'Terminos de Servicio | Kanjona' : 'Terms of Service | Kanjona',
    description:
      locale === 'es'
        ? 'Lea nuestros terminos de servicio que rigen el uso de la plataforma Kanjona.'
        : 'Read our terms of service governing the use of the Kanjona platform.',
  };
}

/**
 * Terms of Service Page
 */
export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <TermsContent />;
}

function TermsContent() {
  const t = useTranslations('terms');

  return (
    <main style={styles.main}>
      <div style={styles.container}>
        <h1 style={styles.h1}>{t('title')}</h1>
        <p style={styles.lastUpdated}>{t('lastUpdated')}</p>

        <section style={styles.section}>
          <h2 style={styles.h2}>{t('acceptance.title')}</h2>
          <p style={styles.paragraph}>{t('acceptance.body')}</p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>{t('description.title')}</h2>
          <p style={styles.paragraph}>{t('description.body')}</p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>{t('obligations.title')}</h2>
          <p style={styles.paragraph}>{t('obligations.body')}</p>
          <ul style={styles.list}>
            <li style={styles.listItem}>{t('obligations.accurate')}</li>
            <li style={styles.listItem}>{t('obligations.lawful')}</li>
            <li style={styles.listItem}>{t('obligations.noAbuse')}</li>
            <li style={styles.listItem}>{t('obligations.noAutomate')}</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>{t('privacySection.title')}</h2>
          <p style={styles.paragraph}>{t('privacySection.body')}</p>
          <Link href="/privacy" style={styles.link}>
            {t('privacySection.link')}
          </Link>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>{t('liability.title')}</h2>
          <p style={styles.paragraph}>{t('liability.body')}</p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>{t('indemnification.title')}</h2>
          <p style={styles.paragraph}>{t('indemnification.body')}</p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>{t('termination.title')}</h2>
          <p style={styles.paragraph}>{t('termination.body')}</p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>{t('governing.title')}</h2>
          <p style={styles.paragraph}>{t('governing.body')}</p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>{t('changes.title')}</h2>
          <p style={styles.paragraph}>{t('changes.body')}</p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>{t('contact.title')}</h2>
          <p style={styles.paragraph}>{t('contact.body')}</p>
          <p style={styles.paragraph}>{t('contact.email')}</p>
        </section>

        <div style={styles.backLink}>
          <Link href="/" style={styles.link}>
            {t('backHome')}
          </Link>
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: '100vh',
    backgroundColor: '#fff',
  },
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '48px 24px 80px',
  },
  h1: {
    fontSize: '36px',
    fontWeight: 700,
    color: '#111',
    marginBottom: '8px',
    lineHeight: 1.2,
  },
  lastUpdated: {
    fontSize: '14px',
    color: '#888',
    marginBottom: '40px',
  },
  section: {
    marginBottom: '36px',
  },
  h2: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#111',
    marginBottom: '12px',
    marginTop: '32px',
  },
  paragraph: {
    fontSize: '16px',
    lineHeight: 1.7,
    color: '#444',
    marginBottom: '12px',
  },
  list: {
    paddingLeft: '24px',
    marginBottom: '12px',
  },
  listItem: {
    fontSize: '16px',
    lineHeight: 1.7,
    color: '#444',
    marginBottom: '6px',
  },
  backLink: {
    marginTop: '48px',
    paddingTop: '24px',
    borderTop: '1px solid #eee',
  },
  link: {
    color: '#0070f3',
    textDecoration: 'none',
    fontWeight: 500,
  },
};
