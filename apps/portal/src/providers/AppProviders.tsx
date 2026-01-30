'use client';

import QueryProvider from '@/providers/QueryProvider';
import StoreProvider from '@/providers/StoreProvider';
import { ToastProvider } from '@/components/Toast';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <QueryProvider>
        <ToastProvider>{children}</ToastProvider>
      </QueryProvider>
    </StoreProvider>
  );
}
