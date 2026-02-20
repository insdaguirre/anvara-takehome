'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const THEME_STORAGE_KEY = 'theme';
const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)';
const THEME_CHANGED_EVENT = 'anvara-theme-changed';

function getStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch {
    return null;
  }
  return null;
}

function applyExplicitTheme(theme: Theme | null) {
  const root = document.documentElement;
  const systemTheme = window.matchMedia(SYSTEM_DARK_QUERY).matches ? 'dark' : 'light';
  const effectiveTheme = theme ?? systemTheme;

  if (theme === null) {
    root.removeAttribute('data-theme');
  } else {
    root.dataset.theme = theme;
  }

  root.classList.toggle('dark', effectiveTheme === 'dark');
}

export function ThemeToggle() {
  // Start with undefined to prevent hydration mismatch
  const [theme, setTheme] = useState<Theme | undefined>(undefined);

  // Initialize effective theme from explicit user choice or system preference.
  useEffect(() => {
    const mediaQuery = window.matchMedia(SYSTEM_DARK_QUERY);
    const syncThemeFromSource = () => {
      const stored = getStoredTheme();

      if (stored) {
        applyExplicitTheme(stored);
        setTheme(stored);
        return;
      }

      const systemTheme: Theme = mediaQuery.matches ? 'dark' : 'light';
      applyExplicitTheme(null);
      setTheme(systemTheme);
    };

    const updateFromSystem = () => {
      if (getStoredTheme()) {
        return;
      }
      syncThemeFromSource();
    };

    const handleThemeChanged = () => {
      syncThemeFromSource();
    };

    syncThemeFromSource();
    mediaQuery.addEventListener('change', updateFromSystem);
    window.addEventListener('storage', handleThemeChanged);
    window.addEventListener(THEME_CHANGED_EVENT, handleThemeChanged);

    return () => {
      mediaQuery.removeEventListener('change', updateFromSystem);
      window.removeEventListener('storage', handleThemeChanged);
      window.removeEventListener(THEME_CHANGED_EVENT, handleThemeChanged);
    };
  }, []);

  const toggleTheme = () => {
    if (!theme) return;
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    applyExplicitTheme(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // Ignore storage write errors.
    }
    window.dispatchEvent(new Event(THEME_CHANGED_EVENT));
  };

  // Show loading state during hydration
  if (!theme) {
    return (
      <button
        className="rounded p-2 text-[var(--color-foreground)] hover:bg-white/10 opacity-50"
        aria-label="Loading theme toggle"
        disabled
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="rounded p-2 text-[var(--color-foreground)] hover:bg-white/10 transition-colors"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        // Moon icon for dark mode
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        // Sun icon for light mode
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      )}
    </button>
  );
}
