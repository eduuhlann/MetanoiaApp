import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProfileProvider } from './contexts/ProfileContext';
import { PreferencesProvider } from './contexts/PreferencesContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AnimatePresence } from 'motion/react';
import ParticleBackground from './components/ParticleBackground';

import Auth from './pages/Auth';
import AuthCallback from './pages/AuthCallback';
import OnboardingFlow from './pages/OnboardingFlow';
import Dashboard from './pages/Dashboard';
import PlansPage from './pages/PlansPage';
import PrayerPage from './pages/PrayerPage';
import EventsPage from './pages/EventsPage';
import DevotionalsPage from './pages/DevotionalsPage';
import Settings from './pages/Settings';
import ProfilePage from './pages/ProfilePage';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/auth" element={<Navigate to="/login" replace />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/onboarding" element={
          <ProtectedRoute>
            <OnboardingFlow />
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/plans" element={
          <ProtectedRoute>
            <PlansPage />
          </ProtectedRoute>
        } />
        <Route path="/prayer" element={
          <ProtectedRoute>
            <PrayerPage />
          </ProtectedRoute>
        } />
        <Route path="/events" element={
          <ProtectedRoute>
            <EventsPage />
          </ProtectedRoute>
        } />
        <Route path="/devotionals" element={
          <ProtectedRoute>
            <DevotionalsPage />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <ProfileProvider>
          <PreferencesProvider>
            <ParticleBackground />
            <AnimatedRoutes />
          </PreferencesProvider>
        </ProfileProvider>
      </AuthProvider>
    </Router>
  );
}
