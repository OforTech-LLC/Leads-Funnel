'use client';

import { useEffect, useState } from 'react';
import { checkAuth } from '@/lib/auth';

type AuthGateStatus = 'checking' | 'authenticated';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthGateStatus>('checking');

  useEffect(() => {
    let active = true;

    const verify = async () => {
      const result = await checkAuth();
      if (!active) return;
      if (result.authenticated) {
        setStatus('authenticated');
        return;
      }
      window.location.href = '/login?expired=1';
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
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <p className="text-sm text-[var(--text-secondary)]">Checking session...</p>
      </div>
    );
  }

  return <>{children}</>;
}
