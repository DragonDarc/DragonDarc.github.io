import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'dark' | 'light';
const THEME_KEY = 'mrlcom:theme:v1';

function savedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'light' ? '#f4f7fc' : '#07101f');
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

  useEffect(() => { applyTheme(theme); }, [theme]);
  useEffect(() => {
    const system = window.matchMedia('(prefers-color-scheme: light)');
    const sync = () => setTheme(savedTheme() ?? (system.matches ? 'light' : 'dark'));
    const onSystemChange = () => { if (!savedTheme()) sync(); };
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_KEY || event.key === null) sync();
    };
    system.addEventListener('change', onSystemChange);
    window.addEventListener('storage', onStorage);
    return () => {
      system.removeEventListener('change', onSystemChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch {}
  }

  return <button type="button" className="theme-toggle" onClick={toggle}
    aria-label="สลับโหมดมืดและสว่าง" aria-pressed={theme === 'dark'}
    title={theme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}>
    {theme === 'dark' ? <Moon size={19} aria-hidden="true" /> : <Sun size={19} aria-hidden="true" />}
    <span>{theme === 'dark' ? 'โหมดมืด' : 'โหมดสว่าง'}</span>
  </button>;
}
