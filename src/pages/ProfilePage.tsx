import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    ArrowLeft,
    Camera,
    Save,
    User,
    Upload,
    AlertCircle,
    CheckCircle2,
    Cake
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import PageTransition from '../components/PageTransition';
import ImageCropModal from '../components/ImageCropModal';
import getCroppedImg from '../utils/imageUtils';

const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { profile, updateProfile } = useProfile();
    const [displayName, setDisplayName] = useState(profile?.display_name || profile?.username || user?.user_metadata?.username || '');
    const [username, setUsername] = useState(profile?.username || user?.user_metadata?.username || '');
    const [bio, setBio] = useState(profile?.bio || '');
    const [birthDate, setBirthDate] = useState(profile?.birth_date || '');
    
    const meta = user?.user_metadata || {};
    const getBestUrl = () => profile?.avatar_url || meta.avatar_url || meta.picture || meta.avatar || meta.photoURL || '';

    const [avatarUrl, setAvatarUrl] = useState(getBestUrl());
    const [previewUrl, setPreviewUrl] = useState(getBestUrl());
    const [bannerUrl, setBannerUrl] = useState(profile?.banner_url || '');
    const [bannerPreviewUrl, setBannerPreviewUrl] = useState(profile?.banner_url || '');
    
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);

    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [cropAspect, setCropAspect] = useState(1);
    const [cropType, setCropType] = useState<'avatar' | 'banner'>('avatar');

    useEffect(() => {
        if (profile) {
            setDisplayName(profile.display_name || profile.username || '');
            setUsername(profile.username || '');
            setBio(profile.bio || '');
            setBirthDate(profile.birth_date || '');
            const bestUrl = profile.avatar_url || meta.avatar_url || meta.picture || meta.avatar || meta.photoURL || '';
            setAvatarUrl(bestUrl);
            setPreviewUrl(bestUrl);
            setBannerUrl(profile.banner_url || '');
            setBannerPreviewUrl(profile.banner_url || '');
        }
    }, [profile]);

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
        setSaved(false);
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
                birth_date: birthDate || null,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar perfil.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <PageTransition>
        <div className="h-dvh bg-[var(--surface-1)] text-white overflow-y-auto overflow-x-hidden font-sans selection:bg-white/20">

            <div className="max-w-4xl mx-auto px-0 py-4 md:py-8 md:pt-12 mb-20 relative z-10">
                <header className="flex items-center gap-6 mb-10">
                    <button 
                        onClick={() => navigate('/settings')} 
                        className="group ml-0 md:ml-0 p-3 bg-white/5 hover:bg-white/10 border border-[var(--border)] hover:border-white/10 rounded-2xl transition-all text-white/50 hover:text-white"
                    >
                        <ArrowLeft size={22} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-serif font-black italic -rotate-1 tracking-tighter">Editar Perfil</h1>
                    </div>
                </header>

                <div className="bg-[var(--surface-2)] rounded-[2.5rem] overflow-hidden border border-[var(--border)] shadow-[0_0_50px_var(--shadow)] relative">
                    
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
                                <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-dim)] bg-[var(--surface-3)]">
                                    <Upload size={32} className="mb-2" />
                                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Adicionar Banner</span>
                                </div>
                            )}
                            {uploading && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-10">
                                    <div className="w-8 h-8 border-2 border-[var(--border-strong)] border-t-white rounded-full animate-spin" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-100 md:opacity-0 md:group-hover/banner:opacity-100 transition-all flex flex-col items-center justify-center backdrop-blur-sm">
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
                                className="w-36 h-36 rounded-full bg-[var(--surface-2)] p-2 cursor-pointer relative z-10"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    fileInputRef.current?.click();
                                }}
                            >
                                <div 
                                    className="w-full h-full rounded-full bg-[var(--surface-3)] overflow-hidden relative border border-[var(--border)] group-hover/avatar:border-[var(--border-strong)] transition-all font-sans"
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
                                        <User size={48} className="text-[var(--text-dim)] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                    )}
                                    {uploading && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                            <div className="w-6 h-6 border-2 border-[var(--border-strong)] border-t-white rounded-full animate-spin" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/50 opacity-100 md:opacity-0 md:group-hover/avatar:opacity-100 transition-all flex flex-col items-center justify-center backdrop-blur-sm pb-1">
                                        <Camera size={24} className="text-white mb-1" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-20 px-5 sm:px-8 pb-8 flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-[var(--border)] relative z-10">
                        <div className="flex flex-col">
                            <h2 className="text-3xl font-bold tracking-tight font-sans">
                                {displayName || username || user?.email?.split('@')[0]}
                            </h2>
                            <p className="text-white/40 text-sm mt-1 font-normal font-sans lowercase tracking-wide flex items-center gap-1">
                                @{username || 'usuario'}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <input
                                    ref={(el) => {
                                        if (el) {
                                            el.value = birthDate;
                                        }
                                    }}
                                    type="date"
                                    value={birthDate}
                                    onChange={(e) => setBirthDate(e.target.value)}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                                />
                                <div className="px-5 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[var(--border-strong)] rounded-2xl font-bold text-xs tracking-[0.1em] uppercase transition-all flex items-center gap-2 text-white/60 hover:text-white">
                                    <Cake size={15} />
                                    {birthDate ? new Date(birthDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : 'Aniversário'}
                                </div>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleSave}
                                disabled={isSaving || uploading}
                                className={`px-8 py-3.5 rounded-2xl font-black text-xs tracking-[0.1em] uppercase transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] ${
                                    saved ? 'bg-[var(--accent-solid)] text-[var(--text-on-accent)]' : 'bg-white text-black hover:bg-white/90'
                                }`}
                            >
                                {isSaving ? (
                                    <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                ) : saved ? (
                                    <CheckCircle2 size={16} />
                                ) : (
                                    <Save size={16} />
                                )}
                                {saved ? 'Salvo' : 'Salvar'}
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
                                        className="w-full bg-[var(--surface-3)] border border-[var(--border)] focus:border-[var(--accent-hover)] focus:bg-[var(--surface-4)] rounded-2xl py-4 px-5 focus:outline-none transition-all text-white placeholder:text-[var(--text-dim)] font-normal font-sans text-sm"
                                        placeholder="Como você quer ser chamado"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-normal tracking-[0.2em] text-white/40 uppercase ml-1 block">
                                        Usuário
                                    </label>
                                    <div className="relative group flex items-center">
                                        <span className="absolute left-5 text-[var(--text-dim)] text-sm">@</span>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                                            className="w-full bg-[var(--surface-3)] border border-[var(--border)] focus:border-[var(--accent-hover)] focus:bg-[var(--surface-4)] rounded-2xl py-4 pl-9 pr-5 focus:outline-none transition-all text-white placeholder:text-[var(--text-dim)] font-normal font-sans text-sm lowercase"
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
                                    <span className="text-[10px] font-bold text-[var(--text-dim)]">
                                        {bio.length}/160
                                    </span>
                                </div>
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value.slice(0, 160))}
                                    className="w-full bg-[var(--surface-3)] border border-[var(--border)] focus:border-[var(--accent-hover)] focus:bg-[var(--surface-4)] rounded-2xl py-4 px-5 focus:outline-none transition-all text-white placeholder:text-[var(--text-dim)] font-normal font-sans text-sm resize-none leading-relaxed min-h-[120px]"
                                    placeholder="Escreva algo sobre você..."
                                />
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
