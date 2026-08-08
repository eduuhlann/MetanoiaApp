import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, MessageCircle, User, BadgeCheck, Heart, Loader2, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { discipleshipService } from '../services/features/discipleshipService';
import { communityService } from '../services/features/communityService';
import { Loading } from '../components/Loading';
import { cn } from '../lib/utils';

interface PublicProfile {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    banner_url: string | null;
    bio: string | null;
    is_verified?: boolean;
}

const PublicProfilePage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [startingChat, setStartingChat] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followToggling, setFollowToggling] = useState(false);
    const [followCounts, setFollowCounts] = useState<{ followers: number; following: number }>({ followers: 0, following: 0 });

    useEffect(() => {
        const fetchProfile = async () => {
            if (!userId) return;
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, display_name, avatar_url, banner_url, bio, is_verified')
                .eq('id', userId)
                .single();
            if (!error && data) setProfile(data);
            setLoading(false);

            if (user && userId && userId !== user.id) {
                setIsFollowing(await communityService.isFollowing(user.id, userId));
            }
            if (userId) {
                setFollowCounts(await communityService.getFollowCounts(userId));
            }
        };
        fetchProfile();
    }, [userId, user]);

    const handleToggleFollow = async () => {
        if (!user || !userId || userId === user.id) return;
        setFollowToggling(true);
        try {
            const nowFollowing = await communityService.toggleFollow(user.id, userId);
            setIsFollowing(nowFollowing);
            const counts = await communityService.getFollowCounts(userId);
            setFollowCounts(counts);
        } catch (err) {
            console.error('Error toggling follow:', err);
        } finally {
            setFollowToggling(false);
        }
    };

    const handleStartChat = async () => {
        if (!user || !userId || userId === user.id) return;
        setStartingChat(true);
        try {
            await discipleshipService.getOrCreateConnection(user.id, userId);
            navigate('/discipleship');
        } catch (err) {
            console.error('Error starting chat:', err);
        } finally {
            setStartingChat(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-dvh bg-[var(--bg-primary)] flex items-center justify-center">
                <Loading fullScreen={false} />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-dvh bg-[var(--bg-primary)] text-white flex flex-col items-center justify-center gap-4">
                <p className="text-white/60 font-bold">Perfil não encontrado</p>
                <Link to="/dashboard" className="text-sm text-[var(--accent-solid)] hover:underline">Voltar ao início</Link>
            </div>
        );
    }

    const isOwnProfile = user?.id === userId;

    return (
        <div className="min-h-dvh bg-[var(--bg-primary)] text-white">
            {/* Banner */}
            <div className="relative h-48 md:h-64 w-full">
                {profile.banner_url ? (
                    <img
                        src={profile.banner_url}
                        alt="Banner"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-white/5" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-transparent to-transparent" />
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-[max(env(safe-area-inset-top),1rem)] left-4 p-2 bg-black/40 backdrop-blur-sm rounded-full hover:bg-black/60 transition-colors z-10"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
            </div>

            {/* Avatar + Info */}
            <div className="max-w-2xl mx-auto px-6 -mt-16 relative z-10">
                <div className="flex flex-col items-center text-center">
                    <div className="w-28 h-28 rounded-full border-4 border-[var(--bg-primary)] bg-white/10 overflow-hidden flex items-center justify-center">
                        {profile.avatar_url ? (
                            <img
                                src={profile.avatar_url}
                                alt={profile.username || ''}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <User className="w-12 h-12 text-white/30" />
                        )}
                    </div>
                    <h1 className="text-2xl font-bold mt-4 tracking-tight">
                        {profile.display_name || profile.username || 'Usuário'}
                        {profile.is_verified && <BadgeCheck className="inline w-6 h-6 ml-2 -mt-1" style={{ color: 'var(--accent-solid)' }} />}
                    </h1>
                    {profile.username && profile.display_name && (
                        <p className="text-white/40 text-sm mt-1">@{profile.username}</p>
                    )}
                    {profile.bio && (
                        <p className="text-white/60 text-sm mt-4 max-w-md leading-relaxed italic">
                            {profile.bio}
                        </p>
                    )}

                    <div className="flex items-center gap-4 mt-5 text-sm">
                        <span className="flex items-center gap-1.5 text-white/50 font-bold">
                            <Users className="w-4 h-4" />
                            <span className="text-white">{followCounts.followers}</span> seguidores
                        </span>
                        <span className="text-white/20">•</span>
                        <span className="flex items-center gap-1.5 text-white/50 font-bold">
                            <User className="w-4 h-4" />
                            <span className="text-white">{followCounts.following}</span> seguindo
                        </span>
                    </div>

                    {!isOwnProfile && user && (
                        <div className="flex items-center gap-3 mt-6">
                            <button
                                onClick={handleToggleFollow}
                                disabled={followToggling}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all border",
                                    isFollowing
                                        ? "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                                        : "bg-[var(--accent-solid)] text-[var(--text-on-accent)] border-transparent hover:bg-[var(--text-secondary)] active:scale-95"
                                )}
                            >
                                {followToggling ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Heart className={cn("w-4 h-4", isFollowing && "fill-red-500 text-red-500")} />
                                )}
                                {isFollowing ? 'Seguindo' : 'Seguir'}
                            </button>
                            <button
                                onClick={handleStartChat}
                                disabled={startingChat}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all",
                                    startingChat
                                        ? "bg-white/10 text-white/40 cursor-not-allowed"
                                        : "bg-[var(--accent-solid)] text-[var(--text-on-accent)] hover:bg-[var(--text-secondary)] active:scale-95"
                                )}
                            >
                                <MessageCircle className="w-4 h-4" />
                                {startingChat ? 'Conectando...' : 'Iniciar Chat'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PublicProfilePage;
