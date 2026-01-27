'use client';

/**
 * Application Providers
 *
 * Wraps the app with Redux store provider and theme management.
 */

import { Provider } from 'react-redux';
import { store } from '@/store/store';
import { useEffect, useState, createContext, useContext, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Theme Context
// ---------------------------------------------------------------------------

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const saved = localStorage.getItem('admin-theme') as Theme | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.classList.toggle('dark', saved === 'dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('admin-theme', next);
      document.documentElement.classList.toggle('dark', next === 'dark');
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

// ---------------------------------------------------------------------------
// Root Providers
// ---------------------------------------------------------------------------

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeProvider>{children}</ThemeProvider>
    </Provider>
  );
}
