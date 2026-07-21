import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, MessageCircle, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { discipleshipService } from '../services/features/discipleshipService';
import { Loading } from '../components/Loading';
import { cn } from '../lib/utils';
import SpotifyWidget from '../components/SpotifyWidget';

interface PublicProfile {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    banner_url: string | null;
    bio: string | null;
}

const PublicProfilePage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [startingChat, setStartingChat] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!userId) return;
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, display_name, avatar_url, banner_url, bio')
                .eq('id', userId)
                .single();
            if (!error && data) setProfile(data);
            setLoading(false);
        };
        fetchProfile();
    }, [userId]);

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
            <div className="min-h-screen bg-[#252627] flex items-center justify-center">
                <Loading fullScreen={false} />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-[#252627] text-white flex flex-col items-center justify-center gap-4">
                <p className="text-white/60 font-bold">Perfil não encontrado</p>
                <Link to="/dashboard" className="text-sm text-[#4B88A2] hover:underline">Voltar ao início</Link>
            </div>
        );
    }

    const isOwnProfile = user?.id === userId;

    return (
        <div className="min-h-screen bg-[#252627] text-white">
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
                <div className="absolute inset-0 bg-gradient-to-t from-[#252627] via-transparent to-transparent" />
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-4 left-4 p-2 bg-black/40 backdrop-blur-sm rounded-full hover:bg-black/60 transition-colors z-10"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
            </div>

            {/* Avatar + Info */}
            <div className="max-w-2xl mx-auto px-6 -mt-16 relative z-10">
                <div className="flex flex-col items-center text-center">
                    <div className="w-28 h-28 rounded-full border-4 border-[#252627] bg-white/10 overflow-hidden flex items-center justify-center">
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
                    </h1>
                    {profile.username && profile.display_name && (
                        <p className="text-white/40 text-sm mt-1">@{profile.username}</p>
                    )}
                    {profile.bio && (
                        <p className="text-white/60 text-sm mt-4 max-w-md leading-relaxed italic">
                            {profile.bio}
                        </p>
                    )}

                    <div className="w-full max-w-md mt-6">
                        <SpotifyWidget userId={userId || ''} />
                    </div>

                    {!isOwnProfile && user && (
                        <button
                            onClick={handleStartChat}
                            disabled={startingChat}
                            className={cn(
                                "mt-6 flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all",
                                startingChat
                                    ? "bg-white/10 text-white/40 cursor-not-allowed"
                                    : "bg-[#4B88A2] text-white hover:bg-[#3a6d85] active:scale-95"
                            )}
                        >
                            <MessageCircle className="w-4 h-4" />
                            {startingChat ? 'Conectando...' : 'Iniciar Chat'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PublicProfilePage;
