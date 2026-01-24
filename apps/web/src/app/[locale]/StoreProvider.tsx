'use client';

/**
 * Redux Store Provider
 * Wraps the app with Redux Provider for client-side state management
 */

import { useRef } from 'react';
import { Provider } from 'react-redux';
import { makeStore, type AppStore } from '@/store';

interface StoreProviderProps {
  children: React.ReactNode;
}

/**
 * Store Provider Component
 * Creates a single store instance per client
 */
export function StoreProvider({ children }: StoreProviderProps) {
  // Use useRef to ensure we only create the store once
  const storeRef = useRef<AppStore | null>(null);

  if (!storeRef.current) {
    // Create the store instance the first time this renders
    storeRef.current = makeStore();
  }

  return <Provider store={storeRef.current}>{children}</Provider>;
}
