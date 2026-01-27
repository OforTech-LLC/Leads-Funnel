import type { Metadata, Viewport } from 'next';
import QueryProvider from '@/providers/QueryProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Portal | Leads Funnel',
  description: 'Manage your leads and track your pipeline',
  robots: 'noindex, nofollow',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2563eb',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
