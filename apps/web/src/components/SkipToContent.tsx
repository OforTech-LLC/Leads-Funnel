'use client';

/**
 * Skip to Content Link (WCAG 2.4.1 - Bypass Blocks)
 *
 * Client Component because it uses onFocus/onBlur event handlers
 * for showing/hiding the link. Server Components cannot have event handlers.
 */

const skipLinkStyles: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  borderWidth: '0',
  textDecoration: 'none',
};

const skipLinkFocusStyles: React.CSSProperties = {
  position: 'fixed',
  top: '16px',
  left: '16px',
  width: 'auto',
  height: 'auto',
  padding: '8px 16px',
  margin: '0',
  overflow: 'visible',
  clip: 'auto',
  whiteSpace: 'normal',
  borderWidth: '0',
  zIndex: 200,
  backgroundColor: '#ffffff',
  color: '#000000',
  borderRadius: '8px',
  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)',
  fontSize: '14px',
  fontWeight: 600,
  textDecoration: 'none',
};

export function SkipToContent() {
  return (
    <a
      href="#main-content"
      style={skipLinkStyles}
      onFocus={(e) => {
        Object.assign(e.currentTarget.style, skipLinkFocusStyles);
      }}
      onBlur={(e) => {
        Object.assign(e.currentTarget.style, skipLinkStyles);
      }}
    >
      Skip to content
    </a>
  );
}
