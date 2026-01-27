/**
 * Type declarations for web-vitals package
 * This allows TypeScript to recognize the dynamic import without requiring the full package types
 */

declare module 'web-vitals' {
  interface Metric {
    name: string;
    value: number;
    delta: number;
    id: string;
    navigationType?: string;
  }

  type ReportCallback = (metric: Metric) => void;

  export function onLCP(callback: ReportCallback): void;
  export function onFID(callback: ReportCallback): void;
  export function onCLS(callback: ReportCallback): void;
  export function onTTFB(callback: ReportCallback): void;
  export function onINP(callback: ReportCallback): void;
  export function onFCP(callback: ReportCallback): void;
}
