import { createContext, useContext, useState, useEffect } from 'react';

/**
 * ThemeContext — 4 premium themes for HireScope
 * Saves selected theme in localStorage for persistence.
 * Applies theme by setting data-theme attribute on <html> element.
 */

// Theme definitions — all values as CSS custom properties
export const THEMES = {
    dark: {
        id: 'dark',
        label: 'Dark',
        icon: '🌑',
        vars: {
            '--bg-deep': '#030014',
            '--bg-surface': '#0d0d1a',
            '--bg-elevated': '#13132b',
            '--bg-card': 'rgba(255,255,255,0.03)',
            '--border': 'rgba(255,255,255,0.08)',
            '--border-strong': 'rgba(255,255,255,0.15)',
            '--primary': '#7c3aed',
            '--primary-light': '#a78bfa',
            '--primary-dark': '#5b21b6',
            '--primary-glow': 'rgba(124,58,237,0.35)',
            '--secondary': '#4f46e5',
            '--accent': '#f59e0b',
            '--success': '#10b981',
            '--success-light': '#34d399',
            '--warning': '#f59e0b',
            '--error': '#ef4444',
            '--error-light': '#f87171',
            '--text-main': '#f8fafc',
            '--text-sub': '#cbd5e1',
            '--text-muted': '#94a3b8',
            '--text-faint': '#475569',
            '--blur': 'blur(20px)',
            '--radius-sm': '0.75rem',
            '--radius-md': '1rem',
            '--radius-lg': '1.5rem',
            '--radius-xl': '2rem',
            '--shadow-sm': '0 4px 16px rgba(0,0,0,0.3)',
            '--shadow-md': '0 8px 32px rgba(0,0,0,0.4)',
            '--shadow-lg': '0 20px 60px rgba(0,0,0,0.6)',
            '--gradient-primary': 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
            '--gradient-hero': 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #4f46e5 100%)',
            '--gradient-text': 'linear-gradient(135deg, #fff 0%, #a78bfa 100%)',
            '--nav-bg': 'rgba(10,10,20,0.8)',
        }
    },
    light: {
        id: 'light',
        label: 'Light',
        icon: '☀️',
        vars: {
            '--bg-deep': '#f8fafc',
            '--bg-surface': '#ffffff',
            '--bg-elevated': '#f1f5f9',
            '--bg-card': 'rgba(255,255,255,0.95)',
            '--border': 'rgba(15, 23, 42, 0.12)',
            '--border-strong': 'rgba(15, 23, 42, 0.22)',
            '--primary': '#7c3aed',
            '--primary-light': '#8b5cf6',
            '--primary-dark': '#5b21b6',
            '--primary-glow': 'rgba(124,58,237,0.15)',
            '--secondary': '#4f46e5',
            '--accent': '#f59e0b',
            '--success': '#059669',
            '--success-light': '#10b981',
            '--warning': '#d97706',
            '--error': '#dc2626',
            '--error-light': '#ef4444',
            '--text-main': '#020617',
            '--text-sub': '#0f172a',
            '--text-muted': '#1e293b',
            '--text-faint': '#334155',
            '--blur': 'blur(20px)',
            '--radius-sm': '0.75rem',
            '--radius-md': '1rem',
            '--radius-lg': '1.5rem',
            '--radius-xl': '2rem',
            '--shadow-sm': '0 4px 24px rgba(2, 6, 23, 0.1)',
            '--shadow-md': '0 12px 48px rgba(2, 6, 23, 0.15)',
            '--shadow-lg': '0 24px 80px rgba(2, 6, 23, 0.2)',
            '--gradient-primary': 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
            '--gradient-hero': 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #4f46e5 100%)',
            '--gradient-text': 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
            '--nav-bg': 'rgba(255,255,255,0.85)',
        }
    },
    midnight: {
        id: 'midnight',
        label: 'Midnight',
        icon: '🌊',
        vars: {
            '--bg-deep': '#020c1b',
            '--bg-surface': '#061428',
            '--bg-elevated': '#0a1f3a',
            '--bg-card': 'rgba(6,20,40,0.7)',
            '--border': 'rgba(56,189,248,0.12)',
            '--border-strong': 'rgba(56,189,248,0.25)',
            '--primary': '#0ea5e9',
            '--primary-light': '#38bdf8',
            '--primary-dark': '#0284c7',
            '--primary-glow': 'rgba(14,165,233,0.35)',
            '--secondary': '#6366f1',
            '--accent': '#f59e0b',
            '--success': '#10b981',
            '--success-light': '#34d399',
            '--warning': '#f59e0b',
            '--error': '#ef4444',
            '--error-light': '#f87171',
            '--text-main': '#e0f2fe',
            '--text-sub': '#bae6fd',
            '--text-muted': '#7dd3fc',
            '--text-faint': '#38bdf8',
            '--blur': 'blur(20px)',
            '--radius-sm': '0.75rem',
            '--radius-md': '1rem',
            '--radius-lg': '1.5rem',
            '--radius-xl': '2rem',
            '--shadow-sm': '0 4px 16px rgba(0,0,0,0.4)',
            '--shadow-md': '0 8px 32px rgba(0,0,0,0.5)',
            '--shadow-lg': '0 20px 60px rgba(0,0,0,0.7)',
            '--gradient-primary': 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
            '--gradient-hero': 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 50%, #6366f1 100%)',
            '--gradient-text': 'linear-gradient(135deg, #e0f2fe 0%, #38bdf8 100%)',
            '--nav-bg': 'rgba(2,12,27,0.85)',
        }
    },
    glass: {
        id: 'glass',
        label: 'Glass',
        icon: '💎',
        vars: {
            '--bg-deep': '#0a0a14',
            '--bg-surface': '#0f0f20',
            '--bg-elevated': '#16162e',
            '--bg-card': 'rgba(255,255,255,0.04)',
            '--border': 'rgba(255,255,255,0.1)',
            '--border-strong': 'rgba(255,255,255,0.2)',
            '--primary': '#c084fc',
            '--primary-light': '#e879f9',
            '--primary-dark': '#a855f7',
            '--primary-glow': 'rgba(192,132,252,0.4)',
            '--secondary': '#818cf8',
            '--accent': '#fb923c',
            '--success': '#4ade80',
            '--success-light': '#86efac',
            '--warning': '#fbbf24',
            '--error': '#f87171',
            '--error-light': '#fca5a5',
            '--text-main': '#faf5ff',
            '--text-sub': '#e9d5ff',
            '--text-muted': '#c4b5fd',
            '--text-faint': '#a78bfa',
            '--blur': 'blur(24px)',
            '--radius-sm': '0.75rem',
            '--radius-md': '1rem',
            '--radius-lg': '1.5rem',
            '--radius-xl': '2rem',
            '--shadow-sm': '0 4px 16px rgba(0,0,0,0.4)',
            '--shadow-md': '0 8px 32px rgba(0,0,0,0.5)',
            '--shadow-lg': '0 20px 60px rgba(0,0,0,0.7)',
            '--gradient-primary': 'linear-gradient(135deg, #c084fc 0%, #818cf8 100%)',
            '--gradient-hero': 'linear-gradient(135deg, #c084fc 0%, #e879f9 50%, #818cf8 100%)',
            '--gradient-text': 'linear-gradient(135deg, #faf5ff 0%, #e879f9 100%)',
            '--nav-bg': 'rgba(10,10,20,0.6)',
        }
    }
};

const THEME_ORDER = ['dark', 'light', 'midnight', 'glass'];
const STORAGE_KEY = 'hirescope_theme';

export const ThemeContext = createContext({
    theme: THEMES.dark,
    cycleTheme: () => { },
    setThemeById: () => { },
});

// Apply theme CSS variables directly to :root
function applyTheme(themeObj) {
    const root = document.documentElement;
    root.setAttribute('data-theme', themeObj.id);
    Object.entries(themeObj.vars).forEach(([key, val]) => {
        root.style.setProperty(key, val);
    });
}

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return THEMES[saved] || THEMES.dark;
    });

    // Apply on mount + on change
    useEffect(() => {
        applyTheme(theme);
        localStorage.setItem(STORAGE_KEY, theme.id);
    }, [theme]);

    const cycleTheme = () => {
        const currentIndex = THEME_ORDER.indexOf(theme.id);
        const nextIndex = (currentIndex + 1) % THEME_ORDER.length;
        setTheme(THEMES[THEME_ORDER[nextIndex]]);
    };

    const setThemeById = (id) => {
        if (THEMES[id]) setTheme(THEMES[id]);
    };

    return (
        <ThemeContext.Provider value={{ theme, cycleTheme, setThemeById }}>
            {children}
        </ThemeContext.Provider>
    );
};

// Convenience hook
export const useTheme = () => useContext(ThemeContext);
