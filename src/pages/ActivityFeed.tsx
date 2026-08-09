import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, User, Users, MessageCircle, BookOpen, Search, X, ExternalLink, Shield, Cake, BadgeCheck, Heart, Share2, Loader2, Send, Sparkles, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { discipleshipService } from '../services/features/discipleshipService';
import { communityService, FeedPost } from '../services/features/communityService';
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
    is_verified?: boolean;
}

const MembersPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [members, setMembers] = useState<MemberProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [connectingId, setConnectingId] = useState<string | null>(null);
    const [previewMember, setPreviewMember] = useState<MemberProfile | null>(null);
    const [previewPosts, setPreviewPosts] = useState<FeedPost[]>([]);
    const [previewPostsLoading, setPreviewPostsLoading] = useState(false);
    const [birthdayUsers, setBirthdayUsers] = useState<{ id: string; username: string | null; display_name: string | null; avatar_url: string | null; birth_date: string; age: number }[]>([]);

    // Feed da comunidade (#80, #81)
    const [tab, setTab] = useState<'members' | 'feed'>('members');
    const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
    const [feedContent, setFeedContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionIndex, setMentionIndex] = useState(0);
    const composerRef = useRef<HTMLTextAreaElement>(null);

    // Seguir usuários (#79)
    const [following, setFollowing] = useState<Set<string>>(new Set());
    const [followToggling, setFollowToggling] = useState<string | null>(null);

    // Filtros de membros (#89)
    const [filter, setFilter] = useState<'all' | 'leaders' | 'verified'>('all');

    // Link de convite (#90)
    const [inviteCopied, setInviteCopied] = useState(false);

    useEffect(() => {
        if (!user) return;
        const loadFollowing = async () => {
            const { data } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
            setFollowing(new Set((data || []).map((f: any) => f.following_id)));
        };
        loadFollowing();
    }, [user]);

    useEffect(() => {
        const loadPreviewPosts = async () => {
            if (!previewMember) { setPreviewPosts([]); setPreviewPostsLoading(false); return; }
            setPreviewPostsLoading(true);
            const posts = await communityService.getFeedPosts(100);
            setPreviewPosts(posts.filter(p => p.author_id === previewMember.id));
            setPreviewPostsLoading(false);
        };
        loadPreviewPosts();
    }, [previewMember?.id]);

    useEffect(() => {
        const loadFeed = async () => {
            const posts = await communityService.getFeedPosts(50);
            setFeedPosts(posts);
        };
        loadFeed();
        const channel = supabase
            .channel('feed-posts-changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feed_posts' }, async () => {
                const posts = await communityService.getFeedPosts(50);
                setFeedPosts(posts);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, display_name, avatar_url, banner_url, bio, role, birth_date, is_verified')
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
        if (filter === 'leaders' && m.role !== 'leader') return false;
        if (filter === 'verified' && !m.is_verified) return false;
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            m.display_name?.toLowerCase().includes(q) ||
            m.username?.toLowerCase().includes(q)
        );
    });

    const mentionMatches = useMemo(() => {
        if (!mentionQuery) return [];
        const q = mentionQuery.toLowerCase();
        return members.filter(m => (m.username || '').toLowerCase().includes(q)).slice(0, 5);
    }, [mentionQuery, members]);

    const handleComposerChange = (value: string) => {
        setFeedContent(value);
        const atIdx = value.lastIndexOf('@');
        if (atIdx !== -1 && atIdx === value.slice(0, value.length).lastIndexOf('@') && value[atIdx] === '@' && !value.slice(atIdx + 1).includes(' ')) {
            setMentionQuery(value.slice(atIdx + 1));
        } else {
            setMentionQuery('');
        }
        setMentionIndex(0);
    };

    const insertMention = (username: string) => {
        const parts = feedContent.split('@');
        parts.pop();
        const next = parts.join('@') + '@' + username + ' ';
        setFeedContent(next);
        setMentionQuery('');
        composerRef.current?.focus();
    };

    const handlePublish = async () => {
        if (!user || !feedContent.trim()) return;
        setIsPosting(true);
        try {
            await communityService.createFeedPost(user.id, 'post', feedContent.trim());
            setFeedContent('');
            setMentionQuery('');
            const posts = await communityService.getFeedPosts(50);
            setFeedPosts(posts);
        } catch { } finally {
            setIsPosting(false);
        }
    };

    const handleToggleFollow = async (targetId: string) => {
        if (!user) return;
        setFollowToggling(targetId);
        try {
            const nowFollowing = await communityService.toggleFollow(user.id, targetId);
            setFollowing(prev => {
                const next = new Set(prev);
                if (nowFollowing) next.add(targetId); else next.delete(targetId);
                return next;
            });
        } catch { } finally {
            setFollowToggling(null);
        }
    };

    const handleCopyInvite = async () => {
        try {
            await navigator.clipboard.writeText(`${window.location.origin}/dashboard`);
            setInviteCopied(true);
            setTimeout(() => setInviteCopied(false), 2000);
        } catch { }
    };

    const renderMentions = (content: string | null) => {
        if (!content) return null;
        const parts = content.split(/(@[a-zA-Z0-9_.-]+)/g);
        return parts.map((part, i) => {
            if (part.startsWith('@') && part.length > 1) {
                return <span key={i} className="font-bold" style={{ color: 'var(--accent-solid)' }}>{part}</span>;
            }
            return <span key={i}>{part}</span>;
        });
    };

    const handleStartChat = async (memberId: string, member?: MemberProfile | null) => {
        if (!user) return;
        setConnectingId(memberId);
        try {
            await discipleshipService.getOrCreateConnection(user.id, memberId);
            try {
                sessionStorage.setItem('pendingChat', JSON.stringify({
                    id: memberId,
                    username: member?.username || null,
                    display_name: member?.display_name || null,
                    avatar_url: member?.avatar_url || null,
                }));
            } catch { /* storage unavailable — state/URL fallback still works */ }
            navigate(`/discipleship?chat=${memberId}`, {
                state: {
                    openChatWith: {
                        id: memberId,
                        username: member?.username || null,
                        display_name: member?.display_name || null,
                        avatar_url: member?.avatar_url || null,
                    },
                },
            });
        } catch {
            setConnectingId(null);
        }
    };

    return (
        <div className="min-h-dvh text-white" style={{ background: 'var(--bg-primary)' }}>
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-[var(--accent-soft)] rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-bold tracking-tight">{tab === 'members' ? 'Membros' : 'Feed da Comunidade'}</h1>
                    <div className="ml-auto flex items-center gap-2">
                        <button
                            onClick={handleCopyInvite}
                            className="p-2 rounded-xl transition-all"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                            title="Copiar link de convite"
                        >
                            {inviteCopied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
                        </button>
                        <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
                            {tab === 'members' ? filtered.length : feedPosts.length}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-6 p-1 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    {(['members', 'feed'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={cn("flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2", tab === t ? "text-white" : "text-white/40")}
                            style={tab === t ? { background: 'var(--accent-solid)', color: 'var(--text-on-accent)' } : {}}
                        >
                            {t === 'members' ? <Users className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                            {t === 'members' ? 'Membros' : 'Feed'}
                        </button>
                    ))}
                </div>

                {tab === 'feed' && (
                    <div className="mb-8 space-y-4">
                        <div className="rounded-3xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                            <textarea
                                ref={composerRef}
                                value={feedContent}
                                onChange={(e) => handleComposerChange(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePublish(); }
                                }}
                                placeholder="Compartilhe com a comunidade... use @ para mencionar alguém"
                                rows={3}
                                className="w-full bg-transparent resize-none outline-none text-sm placeholder:text-white/30 font-medium"
                            />
                            {mentionQuery && mentionMatches.length > 0 && (
                                <div className="mt-2 rounded-xl overflow-hidden" style={{ background: 'var(--surface-3)', border: '1px solid var(--border-strong)' }}>
                                    {mentionMatches.map((m, i) => (
                                        <button
                                            key={m.id}
                                            onMouseEnter={() => setMentionIndex(i)}
                                            onClick={() => insertMention(m.username || '')}
                                            className={cn("w-full flex items-center gap-2 px-3 py-2 text-left text-sm", mentionIndex === i && "bg-white/5")}
                                        >
                                            <div className="w-6 h-6 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                                                {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover" /> : <User className="w-3 h-3 text-white/40" />}
                                            </div>
                                            <span className="font-bold">@{m.username}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div className="flex items-center justify-between mt-3">
                                <span className="text-[10px] text-white/30">Enter para publicar</span>
                                <button
                                    onClick={handlePublish}
                                    disabled={!feedContent.trim() || isPosting}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-95"
                                    style={{ background: 'var(--accent-solid)', color: 'var(--text-on-accent)' }}
                                >
                                    {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    Publicar
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {feedPosts.length === 0 ? (
                                <div className="text-center py-16">
                                    <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm font-bold text-white/50">Nenhuma publicação ainda</p>
                                    <p className="text-xs text-white/30 mt-1">Seja o primeiro a compartilhar</p>
                                </div>
                            ) : feedPosts.map((post, i) => (
                                <motion.div
                                    key={post.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                                    className="rounded-3xl p-4"
                                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <button onClick={() => navigate(`/user/${post.author_id}`)} className="w-10 h-10 rounded-full overflow-hidden bg-white/10 flex items-center justify-center flex-shrink-0">
                                            {post.author?.avatar_url ? <img src={post.author.avatar_url} className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-white/40" />}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <button onClick={() => navigate(`/user/${post.author_id}`)} className="font-bold text-sm hover:underline truncate block">
                                                {post.author?.display_name || post.author?.username || 'Alguém'}
                                                {post.author?.is_verified && <BadgeCheck className="inline w-4 h-4 ml-1 -mt-0.5" style={{ color: 'var(--accent-solid)' }} />}
                                            </button>
                                            <p className="text-[10px] text-white/30">
                                                @{post.author?.username} · {new Date(post.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                            </p>
                                        </div>
                                        {post.type === 'devotional' && (
                                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest" style={{ background: 'var(--accent-soft)', color: 'var(--accent-solid)' }}>
                                                <BookOpen className="w-3 h-3" /> Devocional
                                            </span>
                                        )}
                                        {post.type === 'event' && (
                                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-500/15 text-blue-400">
                                                <Sparkles className="w-3 h-3" /> Evento
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{renderMentions(post.content)}</p>
                                    {post.devotional && (
                                        <div className="mt-3 p-3 rounded-2xl flex items-center gap-2" style={{ background: 'var(--surface-3)' }}>
                                            <BookOpen className="w-4 h-4" style={{ color: 'var(--accent-solid)' }} />
                                            <span className="text-xs font-bold">{post.devotional.title}</span>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {tab === 'members' && (
                <>
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

                <div className="flex items-center gap-2 mb-4 overflow-x-auto custom-scrollbar">
                    {([
                        { id: 'all', label: 'Todos' },
                        { id: 'leaders', label: 'Líderes' },
                        { id: 'verified', label: 'Verificados' },
                    ] as { id: typeof filter; label: string }[]).map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5", filter === f.id ? "text-white" : "text-white/40 hover:text-white/70")}
                            style={filter === f.id ? { background: 'var(--accent-solid)', color: 'var(--text-on-accent)' } : { background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                        >
                            {f.id === 'verified' && <BadgeCheck className="w-3.5 h-3.5" />}
                            {f.id === 'leaders' && <Shield className="w-3.5 h-3.5" />}
                            {f.label}
                        </button>
                    ))}
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
                                            {member.is_verified && <BadgeCheck className="inline w-4 h-4 ml-1 -mt-0.5" style={{ color: 'var(--accent-solid)' }} />}
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
                                            onClick={() => handleToggleFollow(member.id)}
                                            disabled={followToggling === member.id}
                                            className={cn("p-2.5 sm:p-3 rounded-xl transition-all group", following.has(member.id) && "opacity-70")}
                                            style={{ background: 'var(--bg-card-hover)' }}
                                            title={following.has(member.id) ? 'Deixar de seguir' : 'Seguir'}
                                        >
                                            {followToggling === member.id ? (
                                                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" style={{ color: 'var(--text-dim)' }} />
                                            ) : (
                                                <Heart className={cn("w-4 h-4 sm:w-5 sm:h-5 transition-colors", following.has(member.id) && "fill-red-500 text-red-500")} style={{ color: following.has(member.id) ? undefined : 'var(--text-muted)' }} />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => navigate('/devotionals', {
                                                state: { startDevotionalWith: member },
                                            })}
                                            className="p-2.5 sm:p-3 rounded-xl transition-all group"
                                            style={{ background: 'var(--bg-card-hover)' }}
                                            title="Fazer devocional juntos"
                                        >
                                            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 group-hover:text-[var(--accent-solid)] transition-colors" style={{ color: 'var(--text-muted)' }} />
                                        </button>
                                        <button
                                            onClick={() => handleStartChat(member.id, member)}
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
                </>
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
                            className="relative w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
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
                                    <h2 className="text-xl font-bold mt-3 tracking-tight">{previewMember.display_name || previewMember.username || 'Alguém'}
                                        {previewMember.is_verified && <BadgeCheck className="inline w-5 h-5 ml-1.5 -mt-1" style={{ color: 'var(--accent-solid)' }} />}
                                    </h2>
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
                                            onClick={() => handleToggleFollow(previewMember.id)}
                                            disabled={followToggling === previewMember.id}
                                            className={cn("flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all", following.has(previewMember.id) ? "opacity-70" : "")}
                                            style={{ background: 'var(--bg-card-hover)', color: 'var(--text-secondary)' }}
                                        >
                                            {followToggling === previewMember.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Heart className={cn("w-4 h-4", following.has(previewMember.id) && "fill-red-500 text-red-500")} />
                                            )}
                                            {following.has(previewMember.id) ? 'Seguindo' : 'Seguir'}
                                        </button>
                                        <button
                                            onClick={() => { setPreviewMember(null); navigate(`/user/${previewMember.id}`); }}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all"
                                            style={{ background: 'var(--bg-card-hover)', color: 'var(--text-secondary)' }}
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            Ver Perfil
                                        </button>
                                        <button
                                            onClick={() => { setPreviewMember(null); handleStartChat(previewMember.id, previewMember); }}
                                            disabled={connectingId === previewMember.id}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all"
                                            style={{ background: 'var(--accent-solid)', color: 'var(--text-on-accent)' }}
                                        >
                                            <MessageCircle className="w-4 h-4" />
                                            {connectingId === previewMember.id ? 'Conectando...' : 'Chat'}
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-8 text-left">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Sparkles className="w-4 h-4" style={{ color: 'var(--accent-solid)' }} />
                                        <h3 className="text-sm font-bold tracking-tight">Publicações</h3>
                                        <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>{previewPosts.length}</span>
                                    </div>
                                    {previewPostsLoading ? (
                                        <div className="flex justify-center py-8">
                                            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
                                        </div>
                                    ) : previewPosts.length === 0 ? (
                                        <p className="text-xs py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                                            Nenhuma publicação ainda
                                        </p>
                                    ) : (
                                        <div className="space-y-3 pb-2">
                                            {previewPosts.map(post => (
                                                <div key={post.id} className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                                                    {post.type === 'devotional' && (
                                                        <div className="flex items-center gap-1.5 mb-2">
                                                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest" style={{ background: 'var(--accent-soft)', color: 'var(--accent-solid)' }}>
                                                                <BookOpen className="w-3 h-3" /> Devocional
                                                            </span>
                                                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                                                {new Date(post.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <p className="text-xs leading-relaxed whitespace-pre-wrap">{post.content}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
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
