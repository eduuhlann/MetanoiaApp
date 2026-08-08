import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    ArrowLeft,
    Calendar,
    Clock,
    MapPin,
    Plus,
    Trash2,
    CheckCircle2,
    User,
    Users,
    Check,
    Eye,
    EyeOff,
    ExternalLink,
    Camera,
    X,
    Image as ImageIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { supabase } from '../lib/supabase';
import { communityService } from '../services/features/communityService';
import PageTransition from '../components/PageTransition';
import { cn } from '../lib/utils';

interface EventPhoto {
    id: string;
    url: string;
    caption: string | null;
    user_id: string;
}

interface Event {
    id: string;
    author_id: string;
    author_name: string;
    title: string;
    description: string;
    event_date: string;
    event_time: string;
    location: string;
    created_at: string;
    photos: EventPhoto[];
}

const EventsPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { profile } = useProfile();
    const isLeader = profile?.role === 'leader';
    const [viewAsMember, setViewAsMember] = useState(false);
    const effectiveIsLeader = isLeader && !viewAsMember;

    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [locationStr, setLocationStr] = useState('');
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
    const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
    const photoInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

    // RSVP "Vou" (#82)
    const [rsvpMap, setRsvpMap] = useState<Record<string, string | null>>({});
    const [rsvpCounts, setRsvpCounts] = useState<Record<string, number>>({});
    const [rsvpToggling, setRsvpToggling] = useState<string | null>(null);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('events')
                .select('*, profiles!events_author_id_fkey(display_name, username)')
                .order('event_date', { ascending: true });

            if (error) throw error;

            const eventIds = (data || []).map((e: any) => e.id);

            let photosMap: Record<string, EventPhoto[]> = {};
            if (eventIds.length > 0) {
                const { data: photos } = await supabase
                    .from('event_photos')
                    .select('*')
                    .in('event_id', eventIds)
                    .order('created_at', { ascending: true });

                if (photos) {
                    photos.forEach((p: any) => {
                        if (!photosMap[p.event_id]) photosMap[p.event_id] = [];
                        photosMap[p.event_id].push(p);
                    });
                }
            }

            const mapped: Event[] = (data || []).map((e: any) => ({
                id: e.id,
                author_id: e.author_id,
                author_name: e.profiles?.display_name || e.profiles?.username || 'Desconhecido',
                title: e.title,
                description: e.description || '',
                event_date: e.event_date,
                event_time: e.event_time || '',
                location: e.location || '',
                created_at: e.created_at,
                photos: photosMap[e.id] || [],
            }));

            setEvents(mapped);

            // RSVP data
            if (eventIds.length > 0) {
                const [counts, userRsvps] = await Promise.all([
                    communityService.getRsvpCounts(eventIds),
                    user
                        ? supabase.from('event_rsvps').select('event_id, status').in('event_id', eventIds).eq('user_id', user.id)
                        : Promise.resolve({ data: null })
                ]);
                setRsvpCounts(counts);
                const map: Record<string, string | null> = {};
                (userRsvps.data || []).forEach((r: any) => { map[r.event_id] = r.status; });
                setRsvpMap(map);
            }
        } catch (err) {
            console.error('Error fetching events:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleRsvp = async (eventId: string) => {
        if (!user) return;
        setRsvpToggling(eventId);
        try {
            const status = await communityService.toggleRsvp(eventId, user.id);
            setRsvpMap(prev => ({ ...prev, [eventId]: status }));
            const counts = await communityService.getRsvpCounts([eventId]);
            setRsvpCounts(prev => ({ ...prev, ...counts }));
        } catch (err) {
            console.error('Error toggling RSVP:', err);
        } finally {
            setRsvpToggling(null);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const handleAddEvent = async () => {
        if (!title.trim() || !date || !user) return;
        try {
            const { error } = await supabase
                .from('events')
                .insert({
                    author_id: user.id,
                    title: title.trim(),
                    description: description.trim(),
                    event_date: date,
                    event_time: time || null,
                    location: locationStr.trim() || null,
                });

            if (error) throw error;

            setTitle(''); setDescription(''); setDate(''); setTime(''); setLocationStr('');
            setShowForm(false);
            setSuccessMessage('Evento adicionado com sucesso!');
            setTimeout(() => setSuccessMessage(null), 3000);
            await fetchEvents();
        } catch (err) {
            console.error('Error adding event:', err);
        }
    };

    const handleDeleteEvent = async (id: string) => {
        try {
            const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchEvents();
        } catch (err) {
            console.error('Error deleting event:', err);
        }
    };

    const handlePhotoUpload = async (eventId: string, file: File) => {
        if (!user || file.size > 10 * 1024 * 1024) return;
        setUploadingPhoto(eventId);
        try {
            const ext = file.name.split('.').pop() || 'jpg';
            const filePath = `${user.id}/${eventId}/${Date.now()}.${ext}`;

            const { error: uploadErr } = await supabase.storage
                .from('event-photos')
                .upload(filePath, file, { contentType: file.type });

            if (uploadErr) throw uploadErr;

            const { data } = supabase.storage.from('event-photos').getPublicUrl(filePath);
            const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

            const { error: insertErr } = await supabase
                .from('event_photos')
                .insert({
                    event_id: eventId,
                    user_id: user.id,
                    url: publicUrl,
                    caption: null,
                });

            if (insertErr) throw insertErr;
            await fetchEvents();
        } catch (err) {
            console.error('Error uploading photo:', err);
        } finally {
            setUploadingPhoto(null);
        }
    };

    const handleDeletePhoto = async (photoId: string) => {
        try {
            const { error } = await supabase
                .from('event_photos')
                .delete()
                .eq('id', photoId);

            if (error) throw error;
            await fetchEvents();
        } catch (err) {
            console.error('Error deleting photo:', err);
        }
    };

    const getMapsUrl = (location: string) => {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    };

    const getMapsEmbedUrl = (location: string) => {
        return `https://maps.google.com/maps?q=${encodeURIComponent(location)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <PageTransition>
        <div className="min-h-dvh text-white p-6 md:p-12 selection:bg-[var(--accent-soft)] selection:text-white" style={{ background: 'var(--bg-primary)' }}>
            <div className="max-w-4xl mx-auto">
                <header className="flex items-center justify-between mb-16">
                    <div className="flex items-center gap-4 md:gap-12">
                        <button onClick={() => navigate('/dashboard')} className="p-3 rounded-2xl transition-all" style={{ background: 'var(--border)' }}>
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <span className="text-[10px] font-bold tracking-[0.5em] uppercase" style={{ color: 'var(--text-muted)' }}>Encontros</span>
                            <h1 className="text-3xl sm:text-5xl font-serif italic tracking-tight">Eventos</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isLeader && (
                            <button
                                onClick={() => setViewAsMember(!viewAsMember)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                style={{
                                    background: viewAsMember ? 'var(--border-strong)' : 'var(--bg-card-hover)',
                                    border: viewAsMember ? '1px solid var(--accent-hover)' : '1px solid var(--border)',
                                    color: viewAsMember ? 'var(--accent-solid)' : 'var(--text-muted)'
                                }}
                                title={viewAsMember ? 'Voltar à visão de líder' : 'Ver como liderado'}
                            >
                                {viewAsMember ? <EyeOff size={14} /> : <Eye size={14} />}
                                <span className="hidden sm:inline">{viewAsMember ? 'Visão Líder' : 'Ver como Liderado'}</span>
                            </button>
                        )}
                        {effectiveIsLeader && (
                            <button
                                onClick={() => setShowForm(!showForm)}
                                className="p-3 rounded-2xl transition-all"
                                style={{ background: 'var(--border)' }}
                            >
                                <Plus size={24} className={showForm ? 'rotate-45 transition-transform' : 'transition-transform'} />
                            </button>
                        )}
                    </div>
                </header>

                <AnimatePresence>
                    {viewAsMember && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-8"
                        >
                            <div className="p-4 rounded-2xl flex items-center gap-3 text-sm font-bold" style={{ background: 'var(--border)', border: '1px solid var(--border-strong)', color: 'var(--accent-solid)' }}>
                                <Eye size={18} />
                                <span>Visualizando como liderado</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {successMessage && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-8">
                            <div className="p-4 rounded-2xl text-white flex items-center gap-3 text-sm font-bold" style={{ background: 'var(--border-strong)', border: '1px solid var(--accent-soft)' }}>
                                <CheckCircle2 size={18} /> {successMessage}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showForm && effectiveIsLeader && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-12 overflow-hidden"
                        >
                            <div className="p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)' }}>
                                <h3 className="text-lg font-bold tracking-tight">Novo Evento</h3>
                                
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="Nome do evento"
                                    className="w-full rounded-2xl py-4 px-5 focus:outline-none transition-all text-white placeholder:text-[var(--text-muted)] font-normal text-sm"
                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-strong)' }}
                                />
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Descrição (opcional)"
                                    className="w-full rounded-2xl py-4 px-5 focus:outline-none transition-all text-white placeholder:text-[var(--text-muted)] font-normal text-sm resize-none min-h-[80px]"
                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-strong)' }}
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                        className="rounded-2xl py-4 px-5 focus:outline-none transition-all text-white text-sm [color-scheme:dark]"
                                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-strong)' }}
                                    />
                                    <input
                                        type="time"
                                        value={time}
                                        onChange={e => setTime(e.target.value)}
                                        className="rounded-2xl py-4 px-5 focus:outline-none transition-all text-white text-sm [color-scheme:dark]"
                                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-strong)' }}
                                    />
                                </div>
                                <input
                                    type="text"
                                    value={locationStr}
                                    onChange={e => setLocationStr(e.target.value)}
                                    placeholder="Local (opcional)"
                                    className="w-full rounded-2xl py-4 px-5 focus:outline-none transition-all text-white placeholder:text-[var(--text-muted)] font-normal text-sm"
                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-strong)' }}
                                />
                                <button
                                    onClick={handleAddEvent}
                                    disabled={!title.trim() || !date}
                                    className="w-full py-4 rounded-2xl font-black text-xs tracking-[0.3em] uppercase hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 text-[var(--text-on-accent)]"
                                    style={{ background: 'var(--accent-solid)' }}
                                >
                                    Criar Evento
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent-soft)', borderTopColor: 'var(--accent-solid)' }} />
                        </div>
                    ) : events.length === 0 ? (
                        <div className="p-16 rounded-[2.5rem] text-center" style={{ border: '2px dashed var(--border)' }}>
                            <Calendar className="mx-auto mb-4" size={48} style={{ color: 'var(--accent-soft)' }} />
                            <p className="font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Nenhum evento ainda</p>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                {effectiveIsLeader ? 'Crie seu primeiro evento clicando no botão +' : 'Aguarde os líderes postarem eventos'}
                            </p>
                        </div>
                    ) : (
                        events.map((event, i) => (
                            <motion.div
                                key={event.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="p-6 rounded-[2rem] group transition-all duration-300"
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                            >
                                <div className="flex items-start gap-4 sm:gap-6">
                                    <div className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center shrink-0" style={{ background: 'var(--border)' }}>
                                        <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: 'var(--text-secondary)' }}>{new Date(event.event_date + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short' })}</span>
                                        <span className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{new Date(event.event_date + 'T00:00:00').getDate()}</span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-lg font-bold tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>{event.title}</h4>
                                        {event.description && <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{event.description}</p>}
                                        <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                                            {event.event_time && (
                                                <span className="flex items-center gap-1.5"><Clock size={12} /> {event.event_time}</span>
                                            )}
                                            {event.location && (
                                                <a
                                                    href={getMapsUrl(event.location)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 hover:text-[var(--accent-solid)] transition-colors"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <MapPin size={12} /> {event.location}
                                                    <ExternalLink size={9} className="opacity-50" />
                                                </a>
                                            )}
                                            <span className="flex items-center gap-1.5"><User size={12} /> {event.author_name}</span>
                                            <span className="flex items-center gap-1.5"><Users size={12} /> {rsvpCounts[event.id] || 0} confirmados</span>
                                        </div>

                                        {user && (
                                            <button
                                                onClick={() => handleToggleRsvp(event.id)}
                                                disabled={rsvpToggling === event.id}
                                                className={cn("mt-3 flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95", rsvpMap[event.id] === 'going' && "opacity-90")}
                                                style={rsvpMap[event.id] === 'going'
                                                    ? { background: 'var(--accent-solid)', color: 'var(--text-on-accent)' }
                                                    : { background: 'var(--bg-card-hover)', color: 'var(--text-muted)' }}
                                            >
                                                {rsvpToggling === event.id ? (
                                                    <div className="w-3 h-3 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                                                ) : (
                                                    <Check size={12} className={rsvpMap[event.id] === 'going' ? '' : 'opacity-60'} />
                                                )}
                                                {rsvpMap[event.id] === 'going' ? 'Confirmado' : 'Vou'}
                                            </button>
                                        )}

                                        {/* Map Embed */}
                                        {event.location && (
                                            <div className="mt-3 rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                                                <iframe
                                                    src={getMapsEmbedUrl(event.location)}
                                                    className="w-full h-32 border-0"
                                                    loading="lazy"
                                                    referrerPolicy="no-referrer-when-downgrade"
                                                    title={`Mapa: ${event.location}`}
                                                />
                                            </div>
                                        )}

                                        {/* Photos Gallery */}
                                        {event.photos.length > 0 && (
                                            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                {event.photos.slice(0, 4).map((photo) => (
                                                    <div
                                                        key={photo.id}
                                                        className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group/photo"
                                                        onClick={() => setLightboxPhoto(photo.url)}
                                                    >
                                                        <img src={photo.url} alt="" className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-all flex items-center justify-center">
                                                            <ImageIcon size={20} className="text-white" />
                                                        </div>
                                                        {user?.id === photo.user_id && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo.id); }}
                                                                className="absolute top-1 right-1 p-1.5 rounded-lg bg-black/50 opacity-100 md:opacity-0 md:group-hover/photo:opacity-100 transition-all"
                                                            >
                                                                <X size={12} className="text-white" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                {event.photos.length > 4 && (
                                                    <div className="aspect-square rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-card-hover)' }}>
                                                        <span className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>+{event.photos.length - 4}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Photo Upload Button */}
                                        {user && (
                                            <div className="mt-3">
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    ref={(el) => { if (el) photoInputRefs.current.set(event.id, el); }}
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handlePhotoUpload(event.id, file);
                                                        e.target.value = '';
                                                    }}
                                                />
                                                <button
                                                    onClick={() => photoInputRefs.current.get(event.id)?.click()}
                                                    disabled={uploadingPhoto === event.id}
                                                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all hover:scale-105 active:scale-95"
                                                    style={{ background: 'var(--bg-card-hover)', color: 'var(--text-muted)' }}
                                                >
                                                    {uploadingPhoto === event.id ? (
                                                        <div className="w-3 h-3 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                                                    ) : (
                                                        <Camera size={12} />
                                                    )}
                                                    {uploadingPhoto === event.id ? 'Enviando...' : 'Adicionar Foto'}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {user?.id === event.author_id && (
                                        <button
                                            onClick={() => handleDeleteEvent(event.id)}
                                            className="p-3 rounded-xl transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 active:scale-90"
                                            style={{ color: 'var(--danger)' }}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--danger-soft)')}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>

        {/* Lightbox */}
        <AnimatePresence>
            {lightboxPhoto && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center p-6"
                    onClick={() => setLightboxPhoto(null)}
                >
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
                    <motion.img
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        src={lightboxPhoto}
                        className="relative z-10 max-w-full max-h-[85vh] object-contain rounded-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button
                        onClick={() => setLightboxPhoto(null)}
                        className="absolute top-6 right-6 z-20 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all"
                    >
                        <X size={24} className="text-white" />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
        </PageTransition>
    );
};

export default EventsPage;
