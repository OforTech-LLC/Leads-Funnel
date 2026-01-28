'use client';

/**
 * Cookie Consent Banner Component
 * GDPR/CCPA compliant cookie consent with analytics and marketing toggles.
 * Stores consent in localStorage and gates GA4 loading accordingly.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { STORAGE_KEYS, CUSTOM_EVENTS } from '@/lib/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CookieConsentPreferences {
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

const STORAGE_KEY = STORAGE_KEYS.COOKIE_CONSENT;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStoredConsent(): CookieConsentPreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CookieConsentPreferences;
  } catch {
    return null;
  }
}

function storeConsent(prefs: CookieConsentPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage may be unavailable in some contexts
  }
}

/**
 * Dispatch a custom event so the GoogleAnalytics component can react
 * when consent changes at runtime.
 */
function dispatchConsentChange(prefs: CookieConsentPreferences) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CUSTOM_EVENTS.COOKIE_CONSENT_CHANGE, { detail: prefs }));
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CookieConsent() {
  const t = useTranslations('cookieConsent');

  const [visible, setVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);

  // On mount, check if consent already given
  useEffect(() => {
    const stored = getStoredConsent();
    if (!stored) {
      setVisible(true);
    }
  }, []);

  // Focus management: when banner appears, focus the dialog
  useEffect(() => {
    if (visible && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [visible]);

  // ---------------------------
  // Handlers
  // ---------------------------

  const accept = useCallback(() => {
    const prefs: CookieConsentPreferences = {
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
    };
    storeConsent(prefs);
    dispatchConsentChange(prefs);
    setVisible(false);
  }, []);

  const reject = useCallback(() => {
    const prefs: CookieConsentPreferences = {
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    };
    storeConsent(prefs);
    dispatchConsentChange(prefs);
    setVisible(false);
  }, []);

  const savePreferences = useCallback(() => {
    const prefs: CookieConsentPreferences = {
      analytics,
      marketing,
      timestamp: new Date().toISOString(),
    };
    storeConsent(prefs);
    dispatchConsentChange(prefs);
    setVisible(false);
    setShowPreferences(false);
  }, [analytics, marketing]);

  // ---------------------------
  // Render
  // ---------------------------

  if (!visible) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-label={t('title')}
      aria-modal="false"
      tabIndex={-1}
      style={styles.wrapper}
    >
      <div style={styles.container}>
        {/* Title */}
        <h2 style={styles.title}>{t('title')}</h2>

        {/* Description */}
        <p style={styles.description}>
          {t('description')}{' '}
          <Link href="/privacy" style={styles.privacyLink}>
            {t('privacyLink')}
          </Link>
        </p>

        {/* Preferences panel (toggled) */}
        {showPreferences && (
          <div style={styles.preferencesPanel}>
            {/* Analytics toggle */}
            <label style={styles.toggleRow}>
              <div>
                <span style={styles.toggleLabel}>{t('analytics')}</span>
                <span style={styles.toggleDesc}>{t('analyticsDesc')}</span>
              </div>
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                style={styles.checkbox}
                aria-label={t('analytics')}
              />
            </label>

            {/* Marketing toggle */}
            <label style={styles.toggleRow}>
              <div>
                <span style={styles.toggleLabel}>{t('marketing')}</span>
                <span style={styles.toggleDesc}>{t('marketingDesc')}</span>
              </div>
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                style={styles.checkbox}
                aria-label={t('marketing')}
              />
            </label>
          </div>
        )}

        {/* Buttons */}
        <div style={styles.buttons}>
          {showPreferences ? (
            <button onClick={savePreferences} style={styles.primaryBtn}>
              {t('save')}
            </button>
          ) : (
            <>
              <button onClick={accept} style={styles.primaryBtn}>
                {t('acceptAll')}
              </button>
              <button onClick={reject} style={styles.secondaryBtn}>
                {t('rejectNonEssential')}
              </button>
              <button onClick={() => setShowPreferences(true)} style={styles.tertiaryBtn}>
                {t('managePreferences')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles (glassmorphism dark theme with purple accents)
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    padding: '16px',
    display: 'flex',
    justifyContent: 'center',
  },
  container: {
    maxWidth: '720px',
    width: '100%',
    background: 'rgba(15, 15, 23, 0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  },
  title: {
    margin: '0 0 8px',
    fontSize: '18px',
    fontWeight: 700,
    color: '#f0f0f5',
  },
  description: {
    margin: '0 0 20px',
    fontSize: '14px',
    lineHeight: 1.6,
    color: '#a0a0b0',
  },
  privacyLink: {
    color: '#a78bfa',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
  preferencesPanel: {
    marginBottom: '20px',
    padding: '16px',
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  toggleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    cursor: 'pointer',
  },
  toggleLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    color: '#e0e0ee',
  },
  toggleDesc: {
    display: 'block',
    fontSize: '12px',
    color: '#888899',
    marginTop: '2px',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    accentColor: '#a78bfa',
    flexShrink: 0,
    cursor: 'pointer',
  },
  buttons: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '10px',
  },
  primaryBtn: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
    background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  secondaryBtn: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#d0d0dd',
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  tertiaryBtn: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#a78bfa',
    background: 'transparent',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
};

export default CookieConsent;
