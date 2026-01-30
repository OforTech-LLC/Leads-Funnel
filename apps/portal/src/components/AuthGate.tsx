'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/auth';

type AuthGateStatus = 'checking' | 'authenticated';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthGateStatus>('checking');

  useEffect(() => {
    let active = true;

    const verify = async () => {
      const user = await getCurrentUser();
      if (!active) return;
      if (user) {
        setStatus('authenticated');
        return;
      }
      const returnTo = window.location.pathname + window.location.search + window.location.hash;
      const loginUrl = new URL('/login', window.location.origin);
      loginUrl.searchParams.set('returnTo', returnTo);
      window.location.href = loginUrl.toString();
    };

    verify().catch(() => {
      if (!active) return;
      window.location.href = '/login';
    });

    return () => {
      active = false;
    };
  }, []);

  if (status !== 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Checking session...</div>
      </div>
    );
  }

  return <>{children}</>;
}
