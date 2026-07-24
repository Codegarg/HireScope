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
            '--bg-deep': '#090C10',
            '--bg-surface': '#0F141B',
            '--bg-elevated': '#161C25',
            '--bg-card': 'rgba(255,255,255,0.03)',
            '--border': 'rgba(255,255,255,0.08)',
            '--border-strong': 'rgba(255,255,255,0.15)',
            '--primary': '#22C08E',
            '--primary-light': '#4CDBA8',
            '--primary-dark': '#0F9A6E',
            '--primary-glow': 'rgba(34, 192, 142, 0.35)',
            '--secondary': '#2E9BD6',
            '--accent': '#E8A63C',
            '--success': '#22C08E',
            '--success-light': '#4CDBA8',
            '--warning': '#E8A63C',
            '--error': '#E15B4F',
            '--error-light': '#E88B83',
            '--text-main': '#F5F1E8',
            '--text-sub': '#9B9587',
            '--text-muted': '#787368',
            '--text-faint': '#475569',
            '--blur': 'blur(20px)',
            '--radius-sm': '0.4rem',
            '--radius-md': '0.6rem',
            '--radius-lg': '0.85rem',
            '--radius-xl': '1.1rem',
            '--shadow-sm': '0 4px 16px rgba(0,0,0,0.3)',
            '--shadow-md': '0 8px 32px rgba(0,0,0,0.4)',
            '--shadow-lg': '0 20px 60px rgba(0,0,0,0.6)',
            '--gradient-primary': 'linear-gradient(135deg, #22C08E 0%, #2E9BD6 100%)',
            '--gradient-hero': 'linear-gradient(135deg, #22C08E 0%, #E8A63C 50%, #2E9BD6 100%)',
            '--gradient-text': 'linear-gradient(135deg, #F5F1E8 0%, #4CDBA8 100%)',
            '--nav-bg': 'rgba(9,12,16,0.8)',
            '--mesh-color-1': 'rgba(34, 192, 142, 0.15)',
            '--mesh-color-2': 'rgba(46, 155, 214, 0.15)',
            '--mesh-color-3': 'rgba(232, 166, 60, 0.1)',
            '--accent-glow': 'linear-gradient(45deg, #22C08E, #2E9BD6)',
            '--grid-color': 'rgba(34, 192, 142, 0.05)',
        }
    },
    light: {
        id: 'light',
        label: 'Light',
        icon: '☀️',
        vars: {
            '--bg-deep': '#F9FAFB',
            '--bg-surface': '#FFFFFF',
            '--bg-elevated': '#FFFFFF',
            '--bg-card': 'rgba(255, 255, 255, 0.95)',
            '--border': 'rgba(0, 0, 0, 0.08)',
            '--border-strong': 'rgba(0, 0, 0, 0.15)',
            '--primary': '#10B981',
            '--primary-light': '#047857',
            '--primary-dark': '#064E3B',
            '--primary-glow': 'rgba(16, 185, 129, 0.15)',
            '--secondary': '#3B82F6',
            '--accent': '#F59E0B',
            '--success': '#10B981',
            '--success-light': '#047857',
            '--warning': '#F59E0B',
            '--error': '#EF4444',
            '--error-light': '#B91C1C',
            '--text-main': '#0F172A',
            '--text-sub': '#334155',
            '--text-muted': '#475569',
            '--text-faint': '#64748B',
            '--blur': 'blur(20px)',
            '--radius-sm': '0.4rem',
            '--radius-md': '0.6rem',
            '--radius-lg': '0.85rem',
            '--radius-xl': '1.1rem',
            '--shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            '--shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            '--shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            '--gradient-primary': 'linear-gradient(135deg, #059669 0%, #2563EB 100%)',
            '--gradient-hero': 'linear-gradient(135deg, #047857 0%, #1D4ED8 100%)',
            '--gradient-text': 'linear-gradient(135deg, #065F46 0%, #1D4ED8 100%)',
            '--nav-bg': 'rgba(255, 255, 255, 0.85)',
            '--mesh-color-1': 'rgba(16, 185, 129, 0.05)',
            '--mesh-color-2': 'rgba(59, 130, 246, 0.05)',
            '--mesh-color-3': 'rgba(245, 158, 11, 0.05)',
            '--accent-glow': 'linear-gradient(45deg, #10B981, #3B82F6)',
            '--grid-color': 'rgba(16, 185, 129, 0.15)',
        }
    }
};

const THEME_ORDER = ['dark', 'light'];
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
        setTheme(theme.id === 'dark' ? THEMES.light : THEMES.dark);
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
