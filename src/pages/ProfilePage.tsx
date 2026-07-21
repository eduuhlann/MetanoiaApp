import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    ArrowLeft,
    Camera,
    Save,
    User,
    Upload,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import PageTransition from '../components/PageTransition';
import ImageCropModal from '../components/ImageCropModal';
import getCroppedImg from '../utils/imageUtils';
import SpotifyWidget from '../components/SpotifyWidget';

const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { profile, updateProfile } = useProfile();
    const [displayName, setDisplayName] = useState(profile?.display_name || profile?.username || user?.user_metadata?.username || '');
    const [username, setUsername] = useState(profile?.username || user?.user_metadata?.username || '');
    const [bio, setBio] = useState(profile?.bio || '');
    
    const meta = user?.user_metadata || {};
    const getBestUrl = () => profile?.avatar_url || meta.avatar_url || meta.picture || meta.avatar || meta.photoURL || '';

    const [avatarUrl, setAvatarUrl] = useState(getBestUrl());
    const [previewUrl, setPreviewUrl] = useState(getBestUrl());
    const [bannerUrl, setBannerUrl] = useState(profile?.banner_url || '');
    const [bannerPreviewUrl, setBannerPreviewUrl] = useState(profile?.banner_url || '');
    
    const [isSaving, setIsSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);

    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [cropAspect, setCropAspect] = useState(1);
    const [cropType, setCropType] = useState<'avatar' | 'banner'>('avatar');

    const [searchParams, setSearchParams] = useSearchParams();
    const [spotifyConnected, setSpotifyConnected] = useState(false);
    const [spotifyChecking, setSpotifyChecking] = useState(true);

    useEffect(() => {
        if (profile) {
            setDisplayName(profile.display_name || profile.username || '');
            setUsername(profile.username || '');
            setBio(profile.bio || '');
            const bestUrl = profile.avatar_url || meta.avatar_url || meta.picture || meta.avatar || meta.photoURL || '';
            setAvatarUrl(bestUrl);
            setPreviewUrl(bestUrl);
            setBannerUrl(profile.banner_url || '');
            setBannerPreviewUrl(profile.banner_url || '');
        }
    }, [profile]);

    useEffect(() => {
        const spotifyStatus = searchParams.get('spotify');
        if (spotifyStatus === 'connected') {
            setSpotifyConnected(true);
            setSearchParams({});
        } else if (spotifyStatus === 'error') {
            setError('Erro ao conectar com Spotify.');
            setSearchParams({});
        }
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        if (!user) return;
        supabase
            .from('spotify_tokens')
            .select('user_id')
            .eq('user_id', user.id)
            .maybeSingle()
            .then(({ data }) => {
                setSpotifyConnected(!!data);
                setSpotifyChecking(false);
            });
    }, [user]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        if (file.size > 20 * 1024 * 1024) {
            setError('Arquivo muito grande. Máximo 20MB.');
            return;
        }

        if (file.type === 'image/gif') {
            uploadGif(file, type);
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setImageToCrop(reader.result as string);
            setCropType(type);
            setCropAspect(type === 'banner' ? 2048 / 1152 : 1);
            setCropModalOpen(true);
        };
        reader.readAsDataURL(file);
    };

    const uploadGif = async (file: File, type: 'avatar' | 'banner') => {
        if (!user) return;
        setUploading(true);
        setError('');
        try {
            const ext = file.type === 'image/gif' ? 'gif' : 'jpg';
            const filePath = `${user.id}/${type}.${ext}`;
            const bucket = type === 'avatar' ? 'avatars' : 'banners';

            const { error: uploadErr } = await supabase.storage
                .from(bucket)
                .upload(filePath, file, { upsert: true, contentType: file.type });

            if (uploadErr) {
                const dataUrl = URL.createObjectURL(file);
                if (type === 'avatar') {
                    setAvatarUrl(dataUrl);
                    setPreviewUrl(dataUrl);
                } else {
                    setBannerUrl(dataUrl);
                    setBannerPreviewUrl(dataUrl);
                }
            } else {
                const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
                const publicUrl = `${data.publicUrl}?t=${Date.now()}`;
                if (type === 'avatar') {
                    setAvatarUrl(publicUrl);
                    setPreviewUrl(publicUrl);
                } else {
                    setBannerUrl(publicUrl);
                    setBannerPreviewUrl(publicUrl);
                }
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao processar GIF.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (bannerInputRef.current) bannerInputRef.current.value = '';
        }
    };

    const onCropComplete = async (croppedAreaPixels: any) => {
        if (!imageToCrop || !user) return;
        
        setCropModalOpen(false);
        setUploading(true);
        setError('');

        try {
            const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
            if (!croppedBlob) throw new Error('Falha ao processar imagem');

            const isGif = imageToCrop.startsWith('data:image/gif') || imageToCrop.includes('gif');
            const ext = isGif ? 'gif' : 'jpg';
            const filePath = `${user.id}/${cropType}.${ext}`;
            const bucket = cropType === 'avatar' ? 'avatars' : 'banners';
            const contentType = isGif ? 'image/gif' : 'image/jpeg';

            const { error: uploadErr } = await supabase.storage
                .from(bucket)
                .upload(filePath, croppedBlob, { upsert: true, contentType });

            if (uploadErr) {
                const dataUrl = URL.createObjectURL(croppedBlob);
                if (cropType === 'avatar') {
                    setAvatarUrl(dataUrl);
                    setPreviewUrl(dataUrl);
                } else {
                    setBannerUrl(dataUrl);
                    setBannerPreviewUrl(dataUrl);
                }
            } else {
                const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
                const publicUrl = `${data.publicUrl}?t=${Date.now()}`;
                if (cropType === 'avatar') {
                    setAvatarUrl(publicUrl);
                    setPreviewUrl(publicUrl);
                } else {
                    setBannerUrl(publicUrl);
                    setBannerPreviewUrl(publicUrl);
                }
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao processar imagem.');
        } finally {
            setUploading(false);
            setImageToCrop(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (bannerInputRef.current) bannerInputRef.current.value = '';
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError('');
        setSuccess(false);
        try {
            const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '_');
            
            if (cleanUsername !== profile?.username) {
                const { data: existingUser, error: checkError } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('username', cleanUsername)
                    .single();

                if (existingUser && existingUser.id !== user?.id) {
                    setError('Este nome de usuário já está em uso.');
                    setIsSaving(false);
                    return;
                }
                
                if (checkError && checkError.code !== 'PGRST116') {
                    throw checkError;
                }
            }

            await updateProfile({ 
                display_name: displayName,
                username: cleanUsername, 
                bio, 
                avatar_url: avatarUrl || null,
                banner_url: bannerUrl || null,
            });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar perfil.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <PageTransition>
        <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden font-sans selection:bg-white/20">

            <div className="max-w-4xl mx-auto px-0 py-4 md:py-8 md:pt-12 mb-20 relative z-10">
                <header className="flex items-center gap-6 mb-10">
                    <button 
                        onClick={() => navigate('/settings')} 
                        className="group ml-0 md:ml-0 p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-2xl transition-all text-white/50 hover:text-white"
                    >
                        <ArrowLeft size={22} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-serif font-black italic -rotate-1 tracking-tighter">Editar Perfil</h1>
                    </div>
                </header>

                <div className="bg-[#0a0a0a] rounded-[2.5rem] overflow-hidden border border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative">
                    
                    <div className="relative group/banner z-10">
                        <input
                            ref={bannerInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*,.gif"
                            onChange={(e) => handleFileChange(e, 'banner')}
                        />
                        <div 
                            className="w-full h-48 md:h-64 relative cursor-pointer overflow-hidden transition-all bg-black/40"
                            onClick={() => bannerInputRef.current?.click()}
                            style={bannerPreviewUrl && bannerPreviewUrl.startsWith('#') ? { backgroundColor: bannerPreviewUrl } : {}}
                        >
                            {bannerPreviewUrl && !bannerPreviewUrl.startsWith('#') ? (
                                <img src={bannerPreviewUrl} alt="Banner" className="w-full h-full object-cover" />
                            ) : !bannerPreviewUrl && (
                                <div className="w-full h-full flex flex-col items-center justify-center text-white/20 bg-[#0d0d0d]">
                                    <Upload size={32} className="mb-2" />
                                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Adicionar Banner</span>
                                </div>
                            )}
                            {uploading && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-10">
                                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/banner:opacity-100 transition-all flex flex-col items-center justify-center backdrop-blur-sm">
                                <Camera size={28} className="text-white mb-2" />
                                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-white">Alterar Banner</span>
                            </div>
                            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none" />
                        </div>
                    </div>

                    <div className="absolute top-28 md:top-44 left-8 z-20">
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*,.gif"
                            onChange={(e) => handleFileChange(e, 'avatar')}
                        />
                        <div className="relative group/avatar">
                            <div 
                                className="w-36 h-36 rounded-full bg-[#0a0a0a] p-2 cursor-pointer relative z-10"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    fileInputRef.current?.click();
                                }}
                            >
                                <div 
                                    className="w-full h-full rounded-full bg-[#121212] overflow-hidden relative border border-white/5 group-hover/avatar:border-white/20 transition-all font-sans"
                                    style={{ isolation: 'isolate', transform: 'translateZ(0)', WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}
                                >
                                    {previewUrl ? (
                                        <img 
                                            src={previewUrl} 
                                            alt="Avatar" 
                                            className="w-full h-full object-cover rounded-full" 
                                            referrerPolicy="no-referrer"
                                            crossOrigin="anonymous"
                                            onError={() => setPreviewUrl('')} 
                                        />
                                    ) : (
                                        <User size={48} className="text-white/20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                    )}
                                    {uploading && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-all flex flex-col items-center justify-center backdrop-blur-sm pb-1">
                                        <Camera size={24} className="text-white mb-1" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-20 px-5 sm:px-8 pb-8 flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-white/5 relative z-10">
                        <div className="flex flex-col">
                            <h2 className="text-3xl font-bold tracking-tight font-sans">
                                {displayName || username || user?.email?.split('@')[0]}
                            </h2>
                            <p className="text-white/40 text-sm mt-1 font-normal font-sans lowercase tracking-wide flex items-center gap-1">
                                @{username || 'usuario'}
                            </p>
                        </div>

                        <div className="flex flex-col items-end gap-3">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleSave}
                                disabled={isSaving || uploading}
                                className="px-8 py-3.5 bg-white text-black hover:bg-white/90 rounded-2xl font-black text-xs tracking-[0.1em] uppercase transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                            >
                                {isSaving ? (
                                    <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                ) : (
                                    <Save size={16} />
                                )}
                                Salvar Perfil
                            </motion.button>
                        </div>
                    </div>

                    <div className="p-5 sm:p-8 space-y-8 relative z-10">
                        <AnimatePresence>
                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }} 
                                    animate={{ opacity: 1, height: 'auto' }} 
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 flex items-center gap-3 text-sm font-medium mb-8">
                                        <AlertCircle size={18} /> {error}
                                    </div>
                                </motion.div>
                            )}
                            {success && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }} 
                                    animate={{ opacity: 1, height: 'auto' }} 
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-400 flex items-center gap-3 text-sm font-medium mb-8">
                                        <CheckCircle2 size={18} /> Sucesso! Alterações salvas.
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-normal tracking-[0.2em] text-white/40 uppercase ml-1 block">
                                        Nome de Exibição
                                    </label>
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="w-full bg-[#121212] border border-white/5 focus:border-sky-400/30 focus:bg-[#161616] rounded-2xl py-4 px-5 focus:outline-none transition-all text-white placeholder:text-white/10 font-normal font-sans text-sm"
                                        placeholder="Como você quer ser chamado"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-normal tracking-[0.2em] text-white/40 uppercase ml-1 block">
                                        Usuário
                                    </label>
                                    <div className="relative group flex items-center">
                                        <span className="absolute left-5 text-white/20 text-sm">@</span>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                                            className="w-full bg-[#121212] border border-white/5 focus:border-sky-400/30 focus:bg-[#161616] rounded-2xl py-4 pl-9 pr-5 focus:outline-none transition-all text-white placeholder:text-white/10 font-normal font-sans text-sm lowercase"
                                            placeholder="seu_id_unico"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <div className="flex items-center justify-between ml-1 mb-1">
                                    <label className="text-[10px] font-normal tracking-[0.2em] text-white/40 uppercase">
                                        Sobre Mim
                                    </label>
                                    <span className="text-[10px] font-bold text-white/20">
                                        {bio.length}/160
                                    </span>
                                </div>
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value.slice(0, 160))}
                                    className="w-full bg-[#121212] border border-white/5 focus:border-sky-400/30 focus:bg-[#161616] rounded-2xl py-4 px-5 focus:outline-none transition-all text-white placeholder:text-white/10 font-normal font-sans text-sm resize-none leading-relaxed min-h-[120px]"
                                    placeholder="Escreva algo sobre você..."
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-normal tracking-[0.2em] text-white/40 uppercase ml-1 block">
                                    Spotify
                                </label>
                                {spotifyConnected ? (
                                    <div className="space-y-3">
                                        <SpotifyWidget userId={user?.id || ''} />
                                        <p className="text-[10px] text-white/20 ml-1">
                                            Seu status do Spotify está visível no seu perfil público.
                                        </p>
                                    </div>
                                ) : (
                                    <a
                                        href={`${window.location.hostname === 'localhost' ? 'https://metanoiaapp-ten.vercel.app' : ''}/api/spotify/auth?userId=${user?.id || ''}`}
                                        className={cn(
                                            "flex items-center gap-3 p-4 bg-[#1DB954]/10 border border-[#1DB954]/20 rounded-2xl transition-all hover:bg-[#1DB954]/20 group",
                                            spotifyChecking && "opacity-50 pointer-events-none"
                                        )}
                                    >
                                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#1DB954] flex-shrink-0" fill="currentColor">
                                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                                        </svg>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-[#1DB954] group-hover:text-[#1ed760] transition-colors">
                                                Conectar Spotify
                                            </p>
                                            <p className="text-[10px] text-white/30">
                                                Mostrar o que você está ouvindo no seu perfil
                                            </p>
                                        </div>
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ImageCropModal
                isOpen={cropModalOpen}
                onClose={() => setCropModalOpen(false)}
                image={imageToCrop || ''}
                aspect={cropAspect}
                isBanner={cropType === 'banner'}
                title={cropType === 'banner' ? 'Personalizar arte do banner' : 'Ajustar Avatar'}
                onCropComplete={onCropComplete}
            />
        </div>
        </PageTransition>
    );
};

export default ProfilePage;
