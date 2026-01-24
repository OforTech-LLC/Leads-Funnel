'use client';

/**
 * Language Switcher Component
 * Allows users to switch between supported locales
 */

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';

export function LanguageSwitcher() {
  const t = useTranslations('language');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  /**
   * Handle locale change
   */
  const handleLocaleChange = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div style={styles.container}>
      <span style={styles.label}>{t('switch')}:</span>
      <div style={styles.buttons}>
        {routing.locales.map((loc) => (
          <button
            key={loc}
            onClick={() => handleLocaleChange(loc)}
            disabled={locale === loc}
            style={{
              ...styles.button,
              ...(locale === loc ? styles.activeButton : {}),
            }}
            aria-current={locale === loc ? 'true' : undefined}
            aria-label={`Switch to ${t(loc)}`}
          >
            {loc.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Minimal inline styles
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    color: '#666',
  },
  buttons: {
    display: 'flex',
    gap: '4px',
  },
  button: {
    padding: '6px 12px',
    fontSize: '14px',
    fontWeight: '500',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  activeButton: {
    backgroundColor: '#0070f3',
    color: '#fff',
    borderColor: '#0070f3',
    cursor: 'default',
  },
};

export default LanguageSwitcher;
