'use client';

/**
 * Shared Footer Component
 * Displays copyright, legal links (including CCPA "Do Not Sell"), and optional language switcher.
 * Used across all funnel pages and the main page layout.
 */

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import LanguageSwitcher from '@/components/LanguageSwitcher';

interface FooterProps {
  /** Optional accent color for branding */
  accentColor?: string;
  /** Whether to show the language switcher in the footer */
  showLanguageSwitcher?: boolean;
}

export function Footer({ accentColor = '#0070f3', showLanguageSwitcher = false }: FooterProps) {
  const t = useTranslations('footer');
  const currentYear = new Date().getFullYear();

  return (
    <footer style={footerStyles.footer}>
      <div style={footerStyles.container}>
        {/* Branding */}
        <div style={footerStyles.brand}>
          <Link href="/" style={{ ...footerStyles.brandLink, color: accentColor }}>
            Kanjona
          </Link>
        </div>

        {/* Legal links */}
        <nav style={footerStyles.links} aria-label="Footer navigation">
          <Link href="/privacy" style={footerStyles.link}>
            {t('privacy')}
          </Link>
          <span style={footerStyles.separator}>|</span>
          <Link href="/terms" style={footerStyles.link}>
            {t('terms')}
          </Link>
          <span style={footerStyles.separator}>|</span>
          <Link href="/privacy#ccpa" style={footerStyles.link}>
            {t('doNotSell')}
          </Link>
        </nav>

        {/* Language switcher */}
        {showLanguageSwitcher && (
          <div style={footerStyles.langSwitcher}>
            <LanguageSwitcher />
          </div>
        )}

        {/* Copyright */}
        <p style={footerStyles.copyright}>
          &copy; {currentYear} Kanjona. {t('copyright')}
        </p>
      </div>
    </footer>
  );
}

const footerStyles = {
  footer: {
    padding: '40px 24px',
    backgroundColor: '#111',
    color: '#888',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '16px',
  } as React.CSSProperties,
  brand: {
    marginBottom: '4px',
  } as React.CSSProperties,
  brandLink: {
    fontWeight: 600,
    fontSize: '18px',
    textDecoration: 'none',
  } as React.CSSProperties,
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
  } as React.CSSProperties,
  link: {
    color: '#aaa',
    textDecoration: 'none',
    fontSize: '14px',
    transition: 'color 0.2s',
  } as React.CSSProperties,
  separator: {
    color: '#555',
    fontSize: '14px',
  } as React.CSSProperties,
  langSwitcher: {
    marginTop: '4px',
  } as React.CSSProperties,
  copyright: {
    fontSize: '13px',
    color: '#666',
    margin: 0,
  } as React.CSSProperties,
};

export default Footer;
