import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggle}
      className="btn btn-outline theme-toggle-btn"
      title={isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
      aria-label="Toggle theme"
      style={{
        width: '36px',
        height: '36px',
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <span style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '36px',
        transform: isDark ? 'translateY(18px)' : 'translateY(-18px)',
        transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'absolute',
      }}>
        <Sun  size={15} style={{ color: '#f59e0b' }} />
        <Moon size={15} style={{ color: '#818cf8' }} />
      </span>
    </button>
  );
}
