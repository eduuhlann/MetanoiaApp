import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, User, MessageCircle, BookOpen, Search, X, ExternalLink, Shield, Cake } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { discipleshipService } from '../services/features/discipleshipService';
import { Loading } from '../components/Loading';
import { cn } from '../lib/utils';

interface MemberProfile {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    banner_url: string | null;
    bio: string | null;
    role: 'leader' | 'member';
    birth_date: string | null;
}

const MembersPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [members, setMembers] = useState<MemberProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [connectingId, setConnectingId] = useState<string | null>(null);
    const [previewMember, setPreviewMember] = useState<MemberProfile | null>(null);
    const [birthdayUsers, setBirthdayUsers] = useState<{ id: string; username: string | null; display_name: string | null; avatar_url: string | null; birth_date: string; age: number }[]>([]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, display_name, avatar_url, banner_url, bio, role, birth_date')
                .neq('id', user?.id || '')
                .order('display_name', { ascending: true });
            if (!error && data) setMembers(data);
            setLoading(false);
        };
        load();

        const fetchBirthdays = async () => {
            try {
                const now = new Date();
                const currentMonth = now.getMonth() + 1;
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, username, display_name, avatar_url, birth_date')
                    .not('birth_date', 'is', null);

                if (error || !data) return;

                const monthBirthdays = data
                    .filter((p: any) => {
                        const date = new Date(p.birth_date);
                        return date.getMonth() + 1 === currentMonth;
                    })
                    .map((p: any) => {
                        const birthDate = new Date(p.birth_date);
                        let age = now.getFullYear() - birthDate.getFullYear();
                        const monthDiff = now.getMonth() - birthDate.getMonth();
                        if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
                            age--;
                        }
                        return { ...p, birth_date: p.birth_date, age };
                    })
                    .sort((a: any, b: any) => {
                        const dayA = new Date(a.birth_date).getDate();
                        const dayB = new Date(b.birth_date).getDate();
                        return dayA - dayB;
                    });
                setBirthdayUsers(monthBirthdays);
            } catch {
                // Column might not exist yet
            }
        };

        fetchBirthdays();
    }, [user]);

    const filtered = members.filter(m => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            m.display_name?.toLowerCase().includes(q) ||
            m.username?.toLowerCase().includes(q)
        );
    });

    const handleStartChat = async (memberId: string) => {
        if (!user) return;
        setConnectingId(memberId);
        try {
            await discipleshipService.getOrCreateConnection(user.id, memberId);
            navigate('/discipleship');
        } catch {
            setConnectingId(null);
        }
    };

    return (
        <div className="min-h-screen text-white" style={{ background: 'var(--bg-primary)' }}>
            <div className="max-w-2xl mx-auto px-6 py-6">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-[var(--accent-soft)] rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-bold tracking-tight">Membros</h1>
                    <span className="ml-auto text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>{filtered.length}</span>
                </div>

                <div className="mb-6 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <span className="text-[10px] font-bold tracking-[0.5em] uppercase" style={{ color: 'var(--text-muted)' }}>
                                {new Date().toLocaleDateString('pt-BR', { month: 'long' })}
                            </span>
                            <h2 className="text-xl font-bold tracking-tight mt-1">Aniversariantes</h2>
                        </div>
                    </div>
                    {birthdayUsers.length > 0 ? (
                        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                            {birthdayUsers.map((bUser, i) => {
                                const birthDay = new Date(bUser.birth_date).getDate();
                                const isToday = new Date().getDate() === birthDay;
                                return (
                                    <motion.div
                                        key={bUser.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="flex flex-col items-center gap-2 p-4 rounded-2xl shrink-0 min-w-[100px] transition-all"
                                        style={{
                                            background: isToday ? 'var(--border-strong)' : 'var(--bg-card)',
                                            border: isToday ? '1px solid var(--accent-hover)' : '1px solid var(--border)',
                                        }}
                                    >
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-full bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center">
                                                {bUser.avatar_url ? (
                                                    <img src={bUser.avatar_url} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="w-5 h-5 text-white/30" />
                                                )}
                                            </div>
                                            {isToday && (
                                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-solid)' }}>
                                                    <Cake className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[11px] font-bold truncate max-w-[80px]" style={{ color: 'var(--text-primary)' }}>
                                                {bUser.display_name || bUser.username || 'Usuário'}
                                            </p>
                                            <p className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>
                                                {birthDay}/{new Date(bUser.birth_date).getMonth() + 1}
                                            </p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-6 rounded-2xl text-center" style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)' }}>
                            <Cake className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-dim)' }} />
                            <p className="text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>
                                Nenhum aniversariante este mês
                            </p>
                            <p className="text-[10px] mt-1" style={{ color: 'var(--text-dim)' }}>
                                Adicione sua data de aniversário no perfil
                            </p>
                        </div>
                    )}
                </div>

                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Buscar membros..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                    />
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loading fullScreen={false} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--bg-card)' }}>
                            <User className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <p className="font-bold text-lg mb-2">
                            {searchQuery ? 'Nenhum membro encontrado' : 'Nenhum membro ainda'}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            {searchQuery ? 'Tente outro termo de busca.' : 'Em breve novos membros aparecerão aqui.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map((member, i) => (
                            <motion.div
                                key={member.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className="border rounded-2xl p-5 transition-all duration-300 hover:scale-[1.01]"
                                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                            >
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <button
                                        onClick={() => setPreviewMember(member)}
                                        className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden flex-shrink-0 transition-all duration-200 hover:ring-2 hover:ring-[var(--accent-solid)] hover:scale-105"
                                        style={{ background: 'var(--bg-card-hover)' }}
                                    >
                                        {member.avatar_url ? (
                                            <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <User className="w-5 h-5 sm:w-7 sm:h-7" style={{ color: 'var(--text-muted)' }} />
                                            </div>
                                        )}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <button
                                            onClick={() => setPreviewMember(member)}
                                            className="font-bold text-sm sm:text-base hover:underline truncate block text-left"
                                        >
                                            {member.display_name || member.username || 'Alguém'}
                                        </button>
                                        <p className="text-xs sm:text-sm truncate" style={{ color: 'var(--text-muted)' }}>
                                            @{member.username || 'username'}
                                        </p>
                                        {member.bio && (
                                            <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-dim)' }}>
                                                {member.bio}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                                        <button
                                            onClick={() => navigate('/devotionals')}
                                            className="p-2.5 sm:p-3 rounded-xl transition-all group"
                                            style={{ background: 'var(--bg-card-hover)' }}
                                            title="Devocionais"
                                        >
                                            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 group-hover:text-[var(--accent-solid)] transition-colors" style={{ color: 'var(--text-muted)' }} />
                                        </button>
                                        <button
                                            onClick={() => handleStartChat(member.id)}
                                            disabled={connectingId === member.id}
                                            className="p-2.5 sm:p-3 rounded-xl transition-all group"
                                            style={{ background: 'var(--bg-card-hover)' }}
                                            title="Conversar"
                                        >
                                            {connectingId === member.id ? (
                                                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-t-[var(--accent-solid)] rounded-full animate-spin" style={{ borderColor: 'var(--text-dim)' }} />
                                            ) : (
                                                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 group-hover:text-[var(--accent-solid)] transition-colors" style={{ color: 'var(--text-muted)' }} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Profile Preview Modal */}
            <AnimatePresence>
                {previewMember && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
                    >
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewMember(null)} />
                        <motion.div
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="relative w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden"
                            style={{ background: 'var(--surface-3)' }}
                        >
                            {/* Banner */}
                            <div className="relative h-40">
                                {previewMember.banner_url ? (
                                    <img src={previewMember.banner_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full" style={{ background: 'var(--surface-2)' }} />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-3)] via-transparent to-transparent" />
                                <button
                                    onClick={() => setPreviewMember(null)}
                                    className="absolute top-4 right-4 p-2 rounded-full transition-colors"
                                    style={{ background: 'var(--surface-5)' }}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Avatar + Info */}
                            <div className="px-6 -mt-12 pb-6 relative z-10">
                                <div className="flex flex-col items-center text-center">
                                    <div className="w-24 h-24 rounded-full border-4 overflow-hidden flex items-center justify-center" style={{ borderColor: 'var(--surface-3)', background: 'var(--surface-4)' }}>
                                        {previewMember.avatar_url ? (
                                            <img src={previewMember.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
                                        )}
                                    </div>
                                    <h2 className="text-xl font-bold mt-3 tracking-tight">{previewMember.display_name || previewMember.username || 'Alguém'}</h2>
                                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>@{previewMember.username || 'username'}</p>
                                    {previewMember.role === 'leader' && (
                                        <div className="flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full" style={{ background: 'var(--accent-soft)' }}>
                                            <Shield className="w-3 h-3" style={{ color: 'var(--accent-solid)' }} />
                                            <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--accent-solid)' }}>Líder</span>
                                        </div>
                                    )}
                                    {previewMember.bio && (
                                        <p className="text-sm mt-4 max-w-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                            {previewMember.bio}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-3 mt-6 w-full">
                                        <button
                                            onClick={() => { setPreviewMember(null); navigate(`/user/${previewMember.id}`); }}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all"
                                            style={{ background: 'var(--bg-card-hover)', color: 'var(--text-secondary)' }}
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            Ver Perfil
                                        </button>
                                        <button
                                            onClick={() => { setPreviewMember(null); handleStartChat(previewMember.id); }}
                                            disabled={connectingId === previewMember.id}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all"
                                            style={{ background: 'var(--accent-solid)', color: 'var(--text-on-accent)' }}
                                        >
                                            <MessageCircle className="w-4 h-4" />
                                            {connectingId === previewMember.id ? 'Conectando...' : 'Chat'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MembersPage;
