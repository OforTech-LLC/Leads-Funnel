import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

/**
 * Generate metadata for the privacy page
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return {
    title: locale === 'es' ? 'Politica de Privacidad | Kanjona' : 'Privacy Policy | Kanjona',
    description:
      locale === 'es'
        ? 'Lea nuestra politica de privacidad para entender como recopilamos, usamos y protegemos su informacion.'
        : 'Read our privacy policy to understand how we collect, use, and protect your information.',
  };
}

/**
 * Privacy Policy Page
 */
export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PrivacyContent />;
}

function PrivacyContent() {
  const t = useTranslations('privacy');

  return (
    <main style={styles.main}>
      <div style={styles.container}>
        <h1 style={styles.h1}>{t('title')}</h1>
        <p style={styles.lastUpdated}>{t('lastUpdated')}</p>

        <section style={styles.section}>
          <h2 style={styles.h2}>{t('intro.title')}</h2>
          <p style={styles.paragraph}>{t('intro.body')}</p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>{t('collect.title')}</h2>
          <p style={styles.paragraph}>{t('collect.body')}</p>
          <h3 style={styles.h3}>{t('collect.personal.title')}</h3>
          <ul style={styles.list}>
            <li style={styles.listItem}>{t('collect.personal.name')}</li>
            <li style={styles.listItem}>{t('collect.personal.email')}</li>
            <li style={styles.listItem}>{t('collect.personal.phone')}</li>
          </ul>
          <h3 style={styles.h3}>{t('collect.automatic.title')}</h3>
          <ul style={styles.list}>
            <li style={styles.listItem}>{t('collect.automatic.ip')}</li>
            <li style={styles.listItem}>{t('collect.automatic.cookies')}</li>
            <li style={styles.listItem}>{t('collect.automatic.browser')}</li>
            <li style={styles.listItem}>{t('collect.automatic.usage')}</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>{t('use.title')}</h2>
          <ul style={styles.list}>
            <li style={styles.listItem}>{t('use.matching')}</li>
            <li style={styles.listItem}>{t('use.delivery')}</li>
            <li style={styles.listItem}>{t('use.communication')}</li>
            <li style={styles.listItem}>{t('use.improvement')}</li>
            <li style={styles.listItem}>{t('use.legal')}</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>{t('sharing.title')}</h2>
          <p style={styles.paragraph}>{t('sharing.body')}</p>
          <ul style={styles.list}>
            <li style={styles.listItem}>{t('sharing.providers')}</li>
            <li style={styles.listItem}>{t('sharing.legal')}</li>
            <li style={styles.listItem}>{t('sharing.noSale')}</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>{t('retention.title')}</h2>
          <p style={styles.paragraph}>{t('retention.body')}</p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>{t('rights.title')}</h2>
          <p style={styles.paragraph}>{t('rights.body')}</p>
          <ul style={styles.list}>
            <li style={styles.listItem}>{t('rights.access')}</li>
            <li style={styles.listItem}>{t('rights.correction')}</li>
            <li style={styles.listItem}>{t('rights.deletion')}</li>
            <li style={styles.listItem}>{t('rights.optOut')}</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>{t('cookies.title')}</h2>
          <p style={styles.paragraph}>{t('cookies.body')}</p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>{t('contact.title')}</h2>
          <p style={styles.paragraph}>{t('contact.body')}</p>
          <p style={styles.paragraph}>{t('contact.email')}</p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>{t('changes.title')}</h2>
          <p style={styles.paragraph}>{t('changes.body')}</p>
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
  h3: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#333',
    marginBottom: '8px',
    marginTop: '16px',
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
