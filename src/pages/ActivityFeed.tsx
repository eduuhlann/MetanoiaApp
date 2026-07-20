import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, User, MessageCircle, BookOpen, Search } from 'lucide-react';
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
    bio: string | null;
    role: 'leader' | 'member';
}

const MembersPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [members, setMembers] = useState<MemberProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [connectingId, setConnectingId] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, display_name, avatar_url, bio, role')
                .neq('id', user?.id || '')
                .order('display_name', { ascending: true });
            if (!error && data) setMembers(data);
            setLoading(false);
        };
        load();
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
        <div className="min-h-screen bg-[#252627] text-white">
            <div className="max-w-2xl mx-auto px-6 py-6">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-bold tracking-tight">Membros</h1>
                </div>

                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                        type="text"
                        placeholder="Buscar membros..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#4B88A2]/40 transition-colors"
                    />
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loading fullScreen={false} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-white/40 font-bold text-lg mb-2">
                            {searchQuery ? 'Nenhum membro encontrado' : 'Nenhum membro ainda'}
                        </p>
                        <p className="text-white/30 text-sm">
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
                                className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 hover:bg-white/[0.06] transition-colors"
                            >
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <button
                                        onClick={() => navigate(`/user/${member.id}`)}
                                        className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/10 overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-[#4B88A2] hover:scale-110 transition-all duration-200"
                                    >
                                        {member.avatar_url ? (
                                            <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <User className="w-5 h-5 sm:w-7 sm:h-7 text-white/30" />
                                            </div>
                                        )}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <button
                                            onClick={() => navigate(`/user/${member.id}`)}
                                            className="font-bold text-sm sm:text-base hover:underline truncate"
                                        >
                                            {member.display_name || member.username || 'Alguém'}
                                        </button>
                                        <p className="text-xs sm:text-sm text-white/30 truncate">
                                            @{member.username || 'username'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                                        <button
                                            onClick={() => navigate('/devotionals')}
                                            className="p-2.5 sm:p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-[#4B88A2]/20 hover:border-[#4B88A2]/30 transition-all group"
                                            title="Criar devocional"
                                        >
                                            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-white/40 group-hover:text-[#4B88A2] transition-colors" />
                                        </button>
                                        <button
                                            onClick={() => handleStartChat(member.id)}
                                            disabled={connectingId === member.id}
                                            className="p-2.5 sm:p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-[#4B88A2]/20 hover:border-[#4B88A2]/30 transition-all group"
                                            title="Conversar"
                                        >
                                            {connectingId === member.id ? (
                                                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-[#4B88A2] rounded-full animate-spin" />
                                            ) : (
                                                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white/40 group-hover:text-[#4B88A2] transition-colors" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MembersPage;
