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
import PlanDetails from './pages/PlanDetails';
import AiPlanGenerator from './pages/AiPlanGenerator';
import PrayerPage from './pages/PrayerPage';
import EventsPage from './pages/EventsPage';
import DevotionalsPage from './pages/DevotionalsPage';
import Discipleship from './pages/Discipleship';
import Settings from './pages/Settings';
import ProfilePage from './pages/ProfilePage';
import BiblePage from './pages/BiblePage';
import PublicProfilePage from './pages/PublicProfilePage';
import MembersPage from './pages/ActivityFeed';
import NotFound from './pages/NotFound';
import MaintenancePage from './pages/MaintenancePage';
import { DiscipleshipListener } from './components/DiscipleshipListener';

const MAINTENANCE_MODE = import.meta.env.VITE_MAINTENANCE_MODE === 'true';

function AnimatedRoutes() {
  const location = useLocation();

  if (MAINTENANCE_MODE && location.pathname !== '/maintenance') {
    return <MaintenancePage />;
  }

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
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
        <Route path="/plans/ai-generator" element={
          <ProtectedRoute>
            <AiPlanGenerator />
          </ProtectedRoute>
        } />
        <Route path="/plans/:id" element={
          <ProtectedRoute>
            <PlanDetails />
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
        <Route path="/discipleship" element={
          <ProtectedRoute>
            <Discipleship />
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
        <Route path="/bible" element={
          <ProtectedRoute>
            <BiblePage />
          </ProtectedRoute>
        } />
        <Route path="/bible/:book" element={
          <ProtectedRoute>
            <BiblePage />
          </ProtectedRoute>
        } />
        <Route path="/bible/:book/:chapter" element={
          <ProtectedRoute>
            <BiblePage />
          </ProtectedRoute>
        } />
        <Route path="/user/:userId" element={
          <ProtectedRoute>
            <PublicProfilePage />
          </ProtectedRoute>
        } />
        <Route path="/feed" element={
          <ProtectedRoute>
            <MembersPage />
          </ProtectedRoute>
        } />
        <Route path="*" element={<NotFound />} />
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
            <DiscipleshipListener />
            <AnimatedRoutes />
          </PreferencesProvider>
        </ProfileProvider>
      </AuthProvider>
    </Router>
  );
}
