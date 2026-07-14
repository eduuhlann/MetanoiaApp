import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { Loading } from './Loading';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading: authLoading } = useAuth();
    const { profile, loading: profileLoading } = useProfile();
    const location = useLocation();

    if (authLoading || profileLoading) {
        return <Loading />;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (profile && !profile.onboarding_completed && location.pathname !== '/onboarding') {
        return <Navigate to="/onboarding" replace />;
    }

    if (profile && profile.onboarding_completed && location.pathname === '/onboarding') {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};
