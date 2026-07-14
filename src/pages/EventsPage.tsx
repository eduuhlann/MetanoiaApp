import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    ArrowLeft,
    Calendar,
    Clock,
    MapPin,
    Plus,
    Trash2,
    CheckCircle2,
    User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { supabase } from '../lib/supabase';
import PageTransition from '../components/PageTransition';

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
}

const EventsPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { profile } = useProfile();
    const isLeader = profile?.role === 'leader';

    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [locationStr, setLocationStr] = useState('');
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('events')
                .select('*, profiles!events_author_id_fkey(display_name, username)')
                .order('event_date', { ascending: true });

            if (error) throw error;

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
            }));

            setEvents(mapped);
        } catch (err) {
            console.error('Error fetching events:', err);
        } finally {
            setLoading(false);
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

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <PageTransition>
        <div className="min-h-screen text-white p-6 md:p-12 selection:bg-[#4B88A2]/30 selection:text-white" style={{ background: '#252627' }}>
            <div className="max-w-4xl mx-auto">
                <header className="flex items-center justify-between mb-16">
                    <div className="flex items-center gap-4 md:gap-12">
                        <button onClick={() => navigate('/dashboard')} className="p-3 rounded-2xl transition-all" style={{ background: 'rgba(75, 136, 162, 0.1)' }}>
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <span className="text-[10px] font-bold tracking-[0.5em] uppercase" style={{ color: 'rgba(211, 212, 217, 0.4)' }}>Encontros</span>
                            <h1 className="text-3xl sm:text-5xl font-serif italic tracking-tight">Eventos</h1>
                        </div>
                    </div>

                    {isLeader && (
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="p-3 rounded-2xl transition-all"
                            style={{ background: 'rgba(75, 136, 162, 0.1)' }}
                        >
                            <Plus size={24} className={showForm ? 'rotate-45 transition-transform' : 'transition-transform'} />
                        </button>
                    )}
                </header>

                <AnimatePresence>
                    {successMessage && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-8">
                            <div className="p-4 rounded-2xl text-white flex items-center gap-3 text-sm font-bold" style={{ background: 'rgba(75, 136, 162, 0.15)', border: '1px solid rgba(75, 136, 162, 0.25)' }}>
                                <CheckCircle2 size={18} /> {successMessage}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showForm && isLeader && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-12 overflow-hidden"
                        >
                            <div className="p-8 rounded-[2.5rem] space-y-6" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(75, 136, 162, 0.15)' }}>
                                <h3 className="text-lg font-bold tracking-tight">Novo Evento</h3>
                                
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="Nome do evento"
                                    className="w-full rounded-2xl py-4 px-5 focus:outline-none transition-all text-white placeholder:text-[rgba(211,212,217,0.3)] font-normal text-sm"
                                    style={{ background: 'rgba(75, 136, 162, 0.08)', border: '1px solid rgba(75, 136, 162, 0.15)' }}
                                />
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Descrição (opcional)"
                                    className="w-full rounded-2xl py-4 px-5 focus:outline-none transition-all text-white placeholder:text-[rgba(211,212,217,0.3)] font-normal text-sm resize-none min-h-[80px]"
                                    style={{ background: 'rgba(75, 136, 162, 0.08)', border: '1px solid rgba(75, 136, 162, 0.15)' }}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                        className="rounded-2xl py-4 px-5 focus:outline-none transition-all text-white text-sm [color-scheme:dark]"
                                        style={{ background: 'rgba(75, 136, 162, 0.08)', border: '1px solid rgba(75, 136, 162, 0.15)' }}
                                    />
                                    <input
                                        type="time"
                                        value={time}
                                        onChange={e => setTime(e.target.value)}
                                        className="rounded-2xl py-4 px-5 focus:outline-none transition-all text-white text-sm [color-scheme:dark]"
                                        style={{ background: 'rgba(75, 136, 162, 0.08)', border: '1px solid rgba(75, 136, 162, 0.15)' }}
                                    />
                                </div>
                                <input
                                    type="text"
                                    value={locationStr}
                                    onChange={e => setLocationStr(e.target.value)}
                                    placeholder="Local (opcional)"
                                    className="w-full rounded-2xl py-4 px-5 focus:outline-none transition-all text-white placeholder:text-[rgba(211,212,217,0.3)] font-normal text-sm"
                                    style={{ background: 'rgba(75, 136, 162, 0.08)', border: '1px solid rgba(75, 136, 162, 0.15)' }}
                                />
                                <button
                                    onClick={handleAddEvent}
                                    disabled={!title.trim() || !date}
                                    className="w-full py-4 rounded-2xl font-black text-xs tracking-[0.3em] uppercase hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 text-white"
                                    style={{ background: '#BB0A21' }}
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
                            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(75, 136, 162, 0.2)', borderTopColor: '#4B88A2' }} />
                        </div>
                    ) : events.length === 0 ? (
                        <div className="p-16 rounded-[2.5rem] text-center" style={{ border: '2px dashed rgba(75, 136, 162, 0.1)' }}>
                            <Calendar className="mx-auto mb-4" size={48} style={{ color: 'rgba(75, 136, 162, 0.2)' }} />
                            <p className="font-medium mb-2" style={{ color: 'rgba(211, 212, 217, 0.5)' }}>Nenhum evento ainda</p>
                            <p className="text-sm" style={{ color: 'rgba(211, 212, 217, 0.3)' }}>
                                {isLeader ? 'Crie seu primeiro evento clicando no botão +' : 'Aguarde os líderes postarem eventos'}
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
                                style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(75, 136, 162, 0.1)' }}
                            >
                                <div className="flex items-start gap-6">
                                    <div className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center shrink-0" style={{ background: 'rgba(75, 136, 162, 0.1)' }}>
                                        <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: 'rgba(75, 136, 162, 0.6)' }}>{new Date(event.event_date + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short' })}</span>
                                        <span className="text-xl font-black" style={{ color: '#FFF9FB' }}>{new Date(event.event_date + 'T00:00:00').getDate()}</span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-lg font-bold tracking-tight mb-1" style={{ color: '#FFF9FB' }}>{event.title}</h4>
                                        {event.description && <p className="text-sm mb-3 line-clamp-2" style={{ color: 'rgba(211, 212, 217, 0.5)' }}>{event.description}</p>}
                                        <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: 'rgba(211, 212, 217, 0.4)' }}>
                                            {event.event_time && (
                                                <span className="flex items-center gap-1.5"><Clock size={12} /> {event.event_time}</span>
                                            )}
                                            {event.location && (
                                                <span className="flex items-center gap-1.5"><MapPin size={12} /> {event.location}</span>
                                            )}
                                            <span className="flex items-center gap-1.5"><User size={12} /> {event.author_name}</span>
                                        </div>
                                    </div>

                                    {user?.id === event.author_id && (
                                        <button
                                            onClick={() => handleDeleteEvent(event.id)}
                                            className="p-3 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                                            style={{ color: 'rgba(187, 10, 33, 0.6)' }}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(187, 10, 33, 0.1)')}
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
        </PageTransition>
    );
};

export default EventsPage;
