import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface UserProfile {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    banner_url: string | null;
    bio: string | null;
    discord_decoration_url: string | null;
    role: 'leader' | 'member';
    onboarding_completed: boolean;
    birth_date: string | null;
}

interface ProfileContextType {
    profile: UserProfile | null;
    loading: boolean;
    updateProfile: (updates: Partial<Omit<UserProfile, 'id'>>) => Promise<void>;
    refreshProfile: () => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const prevUserId = useRef<string | null>(null);

    const fetchProfile = useCallback(async () => {
        if (!user) {
            setProfile(null);
            prevUserId.current = null;
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching profile:', error);
            } else {
                setProfile(data ?? null);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user?.id === prevUserId.current) return;
        prevUserId.current = user?.id ?? null;
        fetchProfile();
    }, [fetchProfile, user?.id]);

    const updateProfile = async (updates: Partial<Omit<UserProfile, 'id'>>) => {
        if (!user) return;
        const { error } = await supabase
            .from('profiles')
            .upsert({ id: user.id, ...updates });

        if (error) {
            throw new Error(error.message);
        }
        await fetchProfile();
    };

    return (
        <ProfileContext.Provider value={{ profile, loading, updateProfile, refreshProfile: fetchProfile }}>
            {children}
        </ProfileContext.Provider>
    );
};

export const useProfile = () => {
    const ctx = useContext(ProfileContext);
    if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
    return ctx;
};
