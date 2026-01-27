'use client';

/**
 * Error Boundary Component
 *
 * Catches rendering errors in React component tree and displays
 * a user-friendly error UI with retry functionality.
 */

import React, { Component, type ReactNode, type ErrorInfo } from 'react';

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
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-boundary-icon">
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

            <h2 className="error-boundary-title">Something went wrong</h2>
            <p className="error-boundary-message">
              We encountered an unexpected error. Please try again or refresh the page.
            </p>

            {process.env.NODE_ENV === 'development' && error && (
              <div className="error-boundary-details">
                <code>{error.message}</code>
              </div>
            )}

            {showRetry && (
              <div className="error-boundary-actions">
                <button
                  onClick={this.handleRetry}
                  className="error-boundary-btn error-boundary-btn-primary"
                >
                  Try Again
                </button>
                <button
                  onClick={this.handleReload}
                  className="error-boundary-btn error-boundary-btn-secondary"
                >
                  Refresh Page
                </button>
              </div>
            )}
          </div>

          <style jsx>{`
            .error-boundary {
              min-height: 400px;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 24px;
              background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
              color: #fff;
              font-family:
                system-ui,
                -apple-system,
                sans-serif;
            }

            .error-boundary-content {
              text-align: center;
              max-width: 480px;
            }

            .error-boundary-icon {
              margin-bottom: 24px;
              color: #ef4444;
            }

            .error-boundary-title {
              font-size: 24px;
              font-weight: 600;
              margin: 0 0 12px;
            }

            .error-boundary-message {
              color: rgba(255, 255, 255, 0.7);
              margin: 0 0 24px;
              line-height: 1.6;
            }

            .error-boundary-details {
              background: rgba(239, 68, 68, 0.1);
              border: 1px solid rgba(239, 68, 68, 0.3);
              border-radius: 8px;
              padding: 12px 16px;
              margin-bottom: 24px;
              overflow-x: auto;
            }

            .error-boundary-details code {
              font-family: 'Monaco', 'Consolas', monospace;
              font-size: 13px;
              color: #ef4444;
              word-break: break-word;
            }

            .error-boundary-actions {
              display: flex;
              gap: 12px;
              justify-content: center;
              flex-wrap: wrap;
            }

            .error-boundary-btn {
              padding: 12px 24px;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s;
            }

            .error-boundary-btn-primary {
              background: linear-gradient(135deg, #3b82f6, #8b5cf6);
              border: none;
              color: #fff;
            }

            .error-boundary-btn-primary:hover {
              opacity: 0.9;
              transform: translateY(-1px);
            }

            .error-boundary-btn-secondary {
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.2);
              color: #fff;
            }

            .error-boundary-btn-secondary:hover {
              background: rgba(255, 255, 255, 0.1);
            }
          `}</style>
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
