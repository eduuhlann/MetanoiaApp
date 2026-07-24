import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    ArrowLeft,
    User,
    Shield,
    LogOut,
    ChevronRight,
    Info,
    MessageSquare,
    Search,
    CheckCircle2,
    XCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import PageTransition from '../components/PageTransition';

type SettingsTab = 'main' | 'security' | 'legal' | 'feedback' | 'promote_leader';

const Settings: React.FC = () => {
    const navigate = useNavigate();
    const { signOut } = useAuth();
    const { profile } = useProfile();
    const [activeTab, setActiveTab] = useState<SettingsTab>('main');
    const [leaderSearchQuery, setLeaderSearchQuery] = useState('');
    const [leaderSearchResults, setLeaderSearchResults] = useState<any[]>([]);
    const [promoteSuccess, setPromoteSuccess] = useState<string | null>(null);
    const [promoteError, setPromoteError] = useState<string | null>(null);

    const isLeader = profile?.role === 'leader';

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const handleLeaderSearch = async (query: string) => {
        setLeaderSearchQuery(query);
        setPromoteSuccess(null);
        setPromoteError(null);
        if (query.length >= 3) {
            const { data } = await supabase
                .from('profiles')
                .select('id, username, display_name, avatar_url, role')
                .ilike('username', `%${query}%`)
                .neq('id', profile?.id || '')
                .limit(10);
            setLeaderSearchResults(data || []);
        } else {
            setLeaderSearchResults([]);
        }
    };

    const handlePromoteToLeader = async (userId: string, username: string) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: 'leader' })
                .eq('id', userId);
            if (error) throw error;
            setLeaderSearchResults(prev => prev.map(u => u.id === userId ? { ...u, role: 'leader' } : u));
            setPromoteSuccess(`${username} agora é líder!`);
            setPromoteError(null);
            setTimeout(() => setPromoteSuccess(null), 3000);
        } catch (err: any) {
            setPromoteError(err.message || 'Erro ao promover usuário.');
            setPromoteSuccess(null);
        }
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
            case 'promote_leader':
                return (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 mb-6">
                            <button onClick={() => setActiveTab('main')} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all">
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h3 className="text-lg font-bold tracking-tight">Dar Acesso de Líder</h3>
                                <p className="text-xs text-white/40">Promova um membro para líder</p>
                            </div>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                            <input
                                type="text"
                                autoFocus
                                placeholder="Buscar por @usuário..."
                                value={leaderSearchQuery}
                                onChange={(e) => handleLeaderSearch(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-0 focus:border-white/30 transition-all font-medium"
                            />
                        </div>

                        {promoteSuccess && (
                            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-400 flex items-center gap-3 text-sm font-medium">
                                <CheckCircle2 size={18} /> {promoteSuccess}
                            </div>
                        )}
                        {promoteError && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 flex items-center gap-3 text-sm font-medium">
                                <XCircle size={18} /> {promoteError}
                            </div>
                        )}

                        <div className="space-y-2">
                            {leaderSearchResults.map(user => (
                                <div key={user.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center">
                                            {user.avatar_url ? (
                                                <img src={user.avatar_url} className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-5 h-5 text-white/20" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">{user.display_name || user.username}</p>
                                            <p className="text-[11px] text-white/40">@{user.username}</p>
                                        </div>
                                    </div>
                                    {user.role === 'leader' ? (
                                        <span className="px-3 py-1.5 bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40">
                                            Já é líder
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => handlePromoteToLeader(user.id, user.username)}
                                            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                                            style={{ background: 'var(--border-strong)', color: 'var(--accent-solid)', border: '1px solid var(--accent-soft)' }}
                                        >
                                            Tornar Líder
                                        </button>
                                    )}
                                </div>
                            ))}
                            {leaderSearchQuery.length >= 3 && leaderSearchResults.length === 0 && (
                                <div className="text-center py-8 opacity-30">
                                    <Search className="w-10 h-10 mx-auto mb-3" />
                                    <p className="text-sm font-bold">Nenhum usuário encontrado</p>
                                </div>
                            )}
                        </div>
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

                        {isLeader && (
                            <SettingSection title="Liderança">
                                <SettingItem
                                    icon={Shield}
                                    title="Dar Acesso de Líder"
                                    subtitle="Promova um membro para líder"
                                    onClick={() => setActiveTab('promote_leader')}
                                />
                            </SettingSection>
                        )}

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
