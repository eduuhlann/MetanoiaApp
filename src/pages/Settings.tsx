import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    ArrowLeft,
    User,
    Shield,
    LogOut,
    ChevronRight,
    Info,
    MessageSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import PageTransition from '../components/PageTransition';

type SettingsTab = 'main' | 'security' | 'legal' | 'feedback';

const Settings: React.FC = () => {
    const navigate = useNavigate();
    const { signOut } = useAuth();
    const [activeTab, setActiveTab] = useState<SettingsTab>('main');

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const SettingItem = ({
        icon: Icon,
        title,
        subtitle,
        onClick,
        destructive = false,
        badge = null
    }: any) => (
        <button
            onClick={onClick}
            className={cn(
                "w-full p-6 flex items-center justify-between group transition-all border-b border-white/5 last:border-0",
                destructive ? "hover:bg-red-500/5" : "hover:bg-white/5"
            )}
        >
            <div className="flex items-center gap-6">
                <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                    destructive ? "bg-red-500/10 text-red-500" : "bg-white/5 text-white/40 group-hover:text-white"
                )}>
                    <Icon size={22} />
                </div>
                <div className="text-left">
                    <h4 className={cn(
                        "font-bold text-lg tracking-tight",
                        destructive ? "text-red-500" : "text-white"
                    )}>{title}</h4>
                    {subtitle && <p className="text-white/40 text-xs font-light tracking-wide">{subtitle}</p>}
                </div>
            </div>
            <div className="flex items-center gap-4">
                {badge && (
                    <span className="px-2 py-1 bg-white/10 rounded-md text-[8px] font-black tracking-widest uppercase">
                        {badge}
                    </span>
                )}
                {!destructive && <ChevronRight size={18} className="text-white/10 group-hover:text-white transition-colors" />}
            </div>
        </button>
    );

    const SettingSection = ({ title, children }: any) => (
        <div className="mb-12">
            <h3 className="text-[10px] font-black tracking-[0.4em] text-white/20 uppercase mb-4 px-6 italic">
                {title}
            </h3>
            <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden">
                {children}
            </div>
        </div>
    );

    const handleBack = () => {
        if (activeTab === 'main') {
            navigate('/dashboard');
        } else {
            setActiveTab('main');
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'security':
                return (
                    <div className="p-8 text-center">
                        <Shield size={48} className="mx-auto text-white/20 mb-4" />
                        <p className="text-white/40">Configurações de segurança em breve.</p>
                    </div>
                );
            case 'legal':
                return (
                    <div className="p-8 text-center">
                        <Info size={48} className="mx-auto text-white/20 mb-4" />
                        <p className="text-white/40">Termos e Privacidade em breve.</p>
                    </div>
                );
            case 'feedback':
                return (
                    <div className="p-8 text-center">
                        <MessageSquare size={48} className="mx-auto text-white/20 mb-4" />
                        <p className="text-white/40">Sistema de feedback em breve.</p>
                    </div>
                );
            default:
                return (
                    <div className="space-y-12">
                        <SettingSection title="Conta & Perfil">
                            <SettingItem
                                icon={User}
                                title="Editar Perfil"
                                subtitle="Avatar, Banner e Nome"
                                onClick={() => navigate('/profile')}
                            />
                            <SettingItem
                                icon={Shield}
                                title="Segurança"
                                subtitle="Gerenciar sua senha e acesso"
                                onClick={() => setActiveTab('security')}
                            />
                        </SettingSection>

                        <SettingSection title="Apoio, Comunidade & Legal">
                            <SettingItem
                                icon={MessageSquare}
                                title="Enviar Feedback"
                                subtitle="Ideias, bugs ou sugestões"
                                onClick={() => setActiveTab('feedback')}
                            />
                            <SettingItem
                                icon={Info}
                                title="Termos e Privacidade"
                                onClick={() => setActiveTab('legal')}
                            />
                        </SettingSection>

                        <div className="space-y-4 px-6 pb-20">
                            <button
                                onClick={handleSignOut}
                                className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-white/10 transition-all group"
                            >
                                <LogOut size={20} className="text-white/40 group-hover:text-white transition-colors" />
                                Sair da Conta
                            </button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <PageTransition>
        <div className="min-h-screen bg-black text-white p-6 md:p-12 overflow-x-hidden">
            <div className="max-w-3xl mx-auto">
                <header className="flex items-center justify-between mb-16">
                    <div className="flex items-center gap-4 md:gap-12">
                        <button onClick={handleBack} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all">
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <span className="text-[10px] font-bold tracking-[0.5em] text-white/20 uppercase">Ajustes Metanoia</span>
                            <h1 className="text-2xl sm:text-4xl font-black italic -rotate-1 tracking-tighter">
                                {activeTab === 'main' ? 'Configurações' : 'Ajustes'}
                            </h1>
                        </div>
                    </div>
                </header>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        {renderContent()}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
        </PageTransition>
    );
};

export default Settings;
