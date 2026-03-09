import React, { useState } from 'react';
import { BookOpen, Heart, Calendar, Users, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Components
import Devotional from './components/Devotional';
import PrayerRequests from './components/PrayerRequests';
import Schedule from './components/Schedule';
import Discipleship from './components/Discipleship';
import Wall from './components/Wall';
import Auth from './components/Auth';

type Tab = 'devotional' | 'prayer' | 'schedule' | 'groups' | 'wall';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('devotional');

  if (!isAuthenticated) {
    return <Auth onLogin={() => setIsAuthenticated(true)} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'devotional': return <Devotional />;
      case 'prayer': return <PrayerRequests />;
      case 'schedule': return <Schedule />;
      case 'groups': return <Discipleship />;
      case 'wall': return <Wall />;
      default: return <Devotional />;
    }
  };

  const navItems = [
    { id: 'devotional', icon: BookOpen, label: 'Devocional' },
    { id: 'prayer', icon: Heart, label: 'Oração' },
    { id: 'schedule', icon: Calendar, label: 'Agenda' },
    { id: 'groups', icon: Users, label: 'Grupos' },
    { id: 'wall', icon: MessageSquare, label: 'Mural' },
  ];

  return (
    <div className="min-h-screen bg-app-snow flex justify-center font-sans text-app-dark">
      <div className="w-full max-w-md bg-white shadow-2xl relative flex flex-col h-screen overflow-hidden">
        
        {/* Header */}
        <header className="bg-app-crimson text-white p-4 shadow-md z-10 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-wide">Jovens App</h1>
          <button 
            onClick={() => setIsAuthenticated(false)}
            className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            title="Sair"
          >
            <span className="text-sm font-bold">S</span>
          </button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-app-snow relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom Navigation */}
        <nav className="bg-white border-t border-app-gray pb-safe">
          <div className="flex justify-around items-center p-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as Tab)}
                  className={`flex flex-col items-center p-2 rounded-xl transition-colors ${
                    isActive ? 'text-app-crimson' : 'text-app-dark/60 hover:text-app-teal'
                  }`}
                >
                  <div className={`relative p-1 ${isActive ? 'bg-app-crimson/10 rounded-lg' : ''}`}>
                    <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className={`text-[10px] mt-1 font-medium ${isActive ? 'font-bold' : ''}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
