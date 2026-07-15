import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeType = 'classic-dark' | 'royal-purple' | 'midnight-blue' | 'pure-monochrome';
export type WallpaperType = 'particles' | 'mesh' | 'aurora' | 'gradient' | 'none' | 'custom';
export type DashboardLayoutItem = 'nav';

export interface CustomWallpaper {
    type: 'image' | 'video';
    url: string;
}

export interface UserPreferences {
    theme: ThemeType;
    wallpaper: WallpaperType;
    customWallpaper?: CustomWallpaper;
    dashboardLayout: DashboardLayoutItem[];
    menuOrder?: string[];
    uploadedWallpapers?: CustomWallpaper[];
    glassStyle?: 'crystal' | 'frosted' | 'solid';
    dashboardStyle?: 'cards' | 'dock';
}

const defaultPreferences: UserPreferences = {
    theme: 'classic-dark',
    wallpaper: 'particles',
    dashboardLayout: ['nav'],
    menuOrder: ['plans', 'discipleship', 'events', 'customize'],
    uploadedWallpapers: [],
    glassStyle: 'frosted',
    dashboardStyle: 'dock'
};

interface PreferencesContextType {
    preferences: UserPreferences;
    updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
    resetPreferences: () => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const PREFERENCES_KEY = '@metanoia_user_preferences';

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [preferences, setPreferences] = useState<UserPreferences>(() => {
        const saved = localStorage.getItem(PREFERENCES_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.dashboardLayout) {
                    parsed.dashboardLayout = parsed.dashboardLayout.filter((item: any) => item === 'nav');
                }
                if (parsed.menuOrder) {
                    parsed.menuOrder = parsed.menuOrder.filter((item: string) => item !== 'journey');
                }
                return { ...defaultPreferences, ...parsed };
            } catch (e) {
                console.error("Failed to parse user preferences", e);
            }
        }
        return defaultPreferences;
    });

    useEffect(() => {
        localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
        document.documentElement.setAttribute('data-theme', preferences.theme);
    }, [preferences]);

    const updatePreference = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
        setPreferences(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const resetPreferences = () => {
        setPreferences(defaultPreferences);
    };

    return (
        <PreferencesContext.Provider value={{ preferences, updatePreference, resetPreferences }}>
            {children}
        </PreferencesContext.Provider>
    );
};

export const usePreferences = () => {
    const context = useContext(PreferencesContext);
    if (!context) {
        throw new Error('usePreferences must be used within a PreferencesProvider');
    }
    return context;
};
