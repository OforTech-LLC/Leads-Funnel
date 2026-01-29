'use client';

/**
 * Error Boundary Component
 *
 * Catches rendering errors in React component tree and displays
 * a user-friendly error UI with retry functionality.
 */

import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback UI to render on error */
  fallback?: ReactNode;
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Whether to show a retry button */
  showRetry?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary for catching and handling React rendering errors
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Store error info for display
    this.setState({ errorInfo });

    // Log error to console for debugging
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

    // Call optional error callback (for analytics/monitoring)
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to analytics if available
    this.logErrorToAnalytics(error, errorInfo);
  }

  private logErrorToAnalytics(error: Error, errorInfo: ErrorInfo): void {
    // Send to analytics/monitoring service
    // This could be Sentry, LogRocket, or custom analytics
    try {
      if (
        typeof window !== 'undefined' &&
        (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
      ) {
        (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', 'exception', {
          description: error.message,
          fatal: false,
          component_stack: errorInfo.componentStack?.slice(0, 500),
        });
      }
    } catch (analyticsError) {
      console.error('[ErrorBoundary] Failed to log to analytics:', analyticsError);
    }
  }

  private handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, showRetry = true } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div className={styles.errorBoundary}>
          <div className={styles.errorBoundaryContent}>
            <div className={styles.errorBoundaryIcon}>
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <h2 className={styles.errorBoundaryTitle}>Something went wrong</h2>
            <p className={styles.errorBoundaryMessage}>
              We encountered an unexpected error. Please try again or refresh the page.
            </p>

            {process.env.NODE_ENV === 'development' && error && (
              <div className={styles.errorBoundaryDetails}>
                <code>{error.message}</code>
              </div>
            )}

            {showRetry && (
              <div className={styles.errorBoundaryActions}>
                <button
                  onClick={this.handleRetry}
                  className={`${styles.errorBoundaryBtn} ${styles.errorBoundaryBtnPrimary}`}
                >
                  Try Again
                </button>
                <button
                  onClick={this.handleReload}
                  className={`${styles.errorBoundaryBtn} ${styles.errorBoundaryBtnSecondary}`}
                >
                  Refresh Page
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}

/**
 * Higher-order component to wrap a component with ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const ComponentWithErrorBoundary = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return ComponentWithErrorBoundary;
}

export default ErrorBoundary;
