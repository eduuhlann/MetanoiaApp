import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    ArrowLeft,
    BookOpen,
    Plus,
    Trash2,
    CheckCircle2,
    Calendar,
    Users,
    User,
    Search,
    Send,
    X,
    Loader2,
    ChevronRight,
    ChevronLeft,
    Sparkles,
    Check,
    Clock,
    Upload,
    Camera,
    Image as ImageIcon,
    MessageCircle,
    ArrowRight,
    PenLine,
    Save
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { generateDevotional } from '../services/groqService';
import PageTransition from '../components/PageTransition';
import DevotionalChat from '../components/DevotionalChat';
import { cn } from '../lib/utils';

const BIBLE_BOOKS = [
    'Gênesis', 'Êxodo', 'Levítico', 'Números', 'Deuteronômio',
    'Josué', 'Juízes', 'Rute', '1 Samuel', '2 Samuel',
    '1 Reis', '2 Reis', '1 Crônicas', '2 Crônicas', 'Esdras',
    'Neemias', 'Ester', 'Jó', 'Salmos', 'Provérbios',
    'Eclesiastes', 'Cânticos', 'Isaías', 'Jeremias', 'Lamentações',
    'Ezequiel', 'Daniel', 'Oséias', 'Joel', 'Amós',
    'Obadias', 'Jonas', 'Miquéias', 'Naum', 'Habacuque',
    'Sofonias', 'Ageu', 'Zacarias', 'Malaquias',
    'Mateus', 'Marcos', 'Lucas', 'João', 'Atos',
    'Romanos', '1 Coríntios', '2 Coríntios', 'Gálatas', 'Efésios',
    'Filipenses', 'Colossenses', '1 Tessalonicenses', '2 Tessalonicenses',
    '1 Timóteo', '2 Timóteo', 'Tito', 'Filemom', 'Hebreus',
    'Tiago', '1 Pedro', '2 Pedro', '1 João', '2 João',
    '3 João', 'Judas', 'Apocalipse'
];

const DURATION_OPTIONS = [
    { days: 1, label: '1 Dia', desc: 'Devocional único' },
    { days: 3, label: '3 Dias', desc: 'Mini série' },
    { days: 5, label: '5 Dias', desc: 'Uma semana' },
    { days: 7, label: '7 Dias', desc: 'Duas semanas' },
    { days: 14, label: '14 Dias', desc: 'Quinzena' },
    { days: 30, label: '30 Dias', desc: 'Um mês' },
];

interface Devotional {
    id: string;
    creator_id: string;
    title: string;
    content: string;
    verse: string;
    book: string;
    theme: string;
    is_group: boolean;
    duration_days: number;
    daily_readings: any[];
    created_at: string;
    scheduled_for?: string | null;
    creator_name?: string;
    group?: {
        id: string;
        name: string;
        photo_url: string | null;
    };
}

interface ProfileSearchResult {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
}

type WizardStep = 'config' | 'preview' | 'mode' | 'schedule' | 'group-info' | 'invite' | 'result';

const DevotionalsPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [view, setView] = useState<'list' | 'wizard' | 'chat'>('list');
    const [wizardStep, setWizardStep] = useState<WizardStep>('config');
    const [activeChatGroupId, setActiveChatGroupId] = useState<string | null>(null);
    const [devotionals, setDevotionals] = useState<Devotional[]>([]);
    const [loading, setLoading] = useState(true);

    // Wizard state
    const [topic, setTopic] = useState('');
    const [book, setBook] = useState('');
    const [bookSearch, setBookSearch] = useState('');
    const [showBookSuggestions, setShowBookSuggestions] = useState(false);
    const [theme, setTheme] = useState('');
    const [durationDays, setDurationDays] = useState(1);
    const [generating, setGenerating] = useState(false);
    const [generatedTitle, setGeneratedTitle] = useState('');
    const [generatedContent, setGeneratedContent] = useState('');
    const [generatedVerse, setGeneratedVerse] = useState('');
    const [generatedDailyReadings, setGeneratedDailyReadings] = useState<any[]>([]);
    const [isGroup, setIsGroup] = useState<boolean | null>(null);
    const [groupName, setGroupName] = useState('');
    const [groupPhoto, setGroupPhoto] = useState<string | null>(null);
    const [groupPhotoFile, setGroupPhotoFile] = useState<File | null>(null);
    const [invitees, setInvitees] = useState<ProfileSearchResult[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [searchResults, setSearchResults] = useState<ProfileSearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [scheduledFor, setScheduledFor] = useState('');
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Journal state
    const [journalTab, setJournalTab] = useState<'devotionals' | 'diary'>('devotionals');
    const [selectedDevotional, setSelectedDevotional] = useState<Devotional | null>(null);
    const [journalEntries, setJournalEntries] = useState<Record<number, string>>({});
    const [journalSavingDay, setJournalSavingDay] = useState<number | null>(null);

    const filteredBooks = BIBLE_BOOKS.filter(b =>
        b.toLowerCase().includes(bookSearch.toLowerCase())
    ).slice(0, 8);

    const fetchDevotionals = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('devotionals')
                .select('*, profiles!devotionals_creator_id_fkey(display_name, username)')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Fetch groups for each devotional
            const mapped: Devotional[] = await Promise.all((data || []).map(async (d: any) => {
                let group = undefined;
                if (d.is_group) {
                    const { data: groupData } = await supabase
                        .from('devotional_groups')
                        .select('id, name, photo_url')
                        .eq('devotional_id', d.id)
                        .limit(1)
                        .single();
                    group = groupData || undefined;
                }
                return {
                    id: d.id,
                    creator_id: d.creator_id,
                    title: d.title,
                    content: d.content,
                    verse: d.verse || '',
                    book: d.book || '',
                    theme: d.theme || '',
                    is_group: d.is_group,
                    duration_days: d.duration_days || 1,
                    daily_readings: d.daily_readings || [],
                    created_at: d.created_at,
                    scheduled_for: d.scheduled_for || null,
                    creator_name: d.profiles?.display_name || d.profiles?.username || 'Desconhecido',
                    group,
                };
            }));

            setDevotionals(mapped);
        } catch (err) {
            console.error('Error fetching devotionals:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchDevotionals();
    }, [fetchDevotionals]);

    const handleGenerate = async () => {
        if (!topic.trim()) return;
        setGenerating(true);
        try {
            const result = await generateDevotional(topic, book, theme, durationDays);
            if (result) {
                setGeneratedTitle(result.title);
                setGeneratedContent(result.content);
                setGeneratedVerse(result.verse);
                setGeneratedDailyReadings(result.daily_readings || []);
                setWizardStep('preview');
            }
        } finally {
            setGenerating(false);
        }
    };

    const allUsersRef = useRef<ProfileSearchResult[]>([]);
    const [allUsersLoaded, setAllUsersLoaded] = useState(false);

    const loadAllUsers = async () => {
        if (allUsersLoaded) return;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, display_name, avatar_url')
                .neq('id', user?.id)
                .order('display_name', { ascending: true });
            if (!error && data) {
                allUsersRef.current = data;
                setAllUsersLoaded(true);
            }
        } catch (err) {
            console.error('Error loading users:', err);
        }
    };

    const fuzzyMatch = (text: string, query: string): boolean => {
        const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const t = (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (t.includes(q)) return true;
        const words = q.split(/\s+/).filter(Boolean);
        return words.length > 0 && words.every(w => t.includes(w));
    };

    const handleSearchUsers = async (query: string) => {
        setUserSearch(query);
        if (!allUsersLoaded) await loadAllUsers();

        const existingIds = invitees.map(i => i.id);

        if (!query.trim()) {
            setSearchResults(allUsersRef.current.filter(p => !existingIds.includes(p.id)).slice(0, 20));
            return;
        }

        const filtered = allUsersRef.current.filter(p => {
            if (existingIds.includes(p.id)) return false;
            return fuzzyMatch(p.username || '', query)
                || fuzzyMatch(p.display_name || '', query);
        });
        setSearchResults(filtered.slice(0, 20));
    };

    const handleFocusSearch = async () => {
        if (!allUsersLoaded) await loadAllUsers();
        if (!userSearch.trim()) {
            const existingIds = invitees.map(i => i.id);
            setSearchResults(allUsersRef.current.filter(p => !existingIds.includes(p.id)).slice(0, 20));
        }
    };

    const handleAddInvitee = (profile: ProfileSearchResult) => {
        setInvitees(prev => [...prev, profile]);
        setSearchResults([]);
        setUserSearch('');
    };

    const handleRemoveInvitee = (id: string) => {
        setInvitees(prev => prev.filter(i => i.id !== id));
    };

    const handleGroupPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) return;

        setGroupPhotoFile(file);
        const reader = new FileReader();
        reader.onload = (event) => {
            setGroupPhoto(event.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const uploadGroupPhoto = async (groupId: string): Promise<string | null> => {
        if (!groupPhotoFile || !user) return null;
        try {
            const ext = groupPhotoFile.name.split('.').pop();
            const path = `${user.id}/${groupId}.${ext}`;
            const { error } = await supabase.storage
                .from('devotional-photos')
                .upload(path, groupPhotoFile, { upsert: true });

            if (error) throw error;

            const { data } = supabase.storage.from('devotional-photos').getPublicUrl(path);
            return data?.publicUrl || null;
        } catch (err) {
            console.error('Error uploading group photo:', err);
            return null;
        }
    };

    const handleSaveDevotional = async () => {
        if (!user || !generatedTitle || !generatedContent) return;
        setSaving(true);
        try {
            const { data: devotional, error: insertError } = await supabase
                .from('devotionals')
                .insert({
                    creator_id: user.id,
                    title: generatedTitle,
                    content: generatedContent,
                    verse: generatedVerse,
                    book,
                    theme,
                    is_group: isGroup === true,
                    duration_days: durationDays,
                    daily_readings: generatedDailyReadings,
                    scheduled_for: scheduledFor || null,
                })
                .select()
                .single();

            if (insertError) throw insertError;

            // Create group if needed
            if (isGroup === true && devotional) {
                let photoUrl = null;
                const { data: newGroup, error: groupError } = await supabase
                    .from('devotional_groups')
                    .insert({
                        devotional_id: devotional.id,
                        creator_id: user.id,
                        name: groupName || `Grupo: ${generatedTitle}`,
                        photo_url: null,
                    })
                    .select()
                    .single();

                if (groupError) throw groupError;

                // Upload photo if exists
                if (groupPhotoFile && newGroup) {
                    photoUrl = await uploadGroupPhoto(newGroup.id);
                    if (photoUrl) {
                        await supabase
                            .from('devotional_groups')
                            .update({ photo_url: photoUrl })
                            .eq('id', newGroup.id);
                    }
                }

                // Send invites
                if (invitees.length > 0) {
                    const inviteInserts = invitees.map(invitee => ({
                        devotional_id: devotional.id,
                        inviter_id: user.id,
                        invitee_id: invitee.id,
                        status: 'pending' as const,
                    }));

                    const { error: inviteError } = await supabase
                        .from('devotional_invites')
                        .insert(inviteInserts);

                    if (inviteError) throw inviteError;
                }
            }

            setSuccessMessage(isGroup && invitees.length > 0
                ? `Devocional criado! ${invitees.length} convite(s) enviado(s).`
                : 'Devocional criado com sucesso!'
            );
            setTimeout(() => setSuccessMessage(null), 4000);

            resetWizard();
            setView('list');
            await fetchDevotionals();
        } catch (err) {
            console.error('Error saving devotional:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase
                .from('devotionals')
                .delete()
                .eq('id', id);
            if (error) throw error;
            await fetchDevotionals();
        } catch (err) {
            console.error('Error deleting devotional:', err);
        }
    };

    const resetWizard = () => {
        setTopic('');
        setBook('');
        setBookSearch('');
        setTheme('');
        setDurationDays(1);
        setGeneratedTitle('');
        setGeneratedContent('');
        setGeneratedVerse('');
        setGeneratedDailyReadings([]);
        setIsGroup(null);
        setGroupName('');
        setGroupPhoto(null);
        setGroupPhotoFile(null);
        setInvitees([]);
        setUserSearch('');
        setSearchResults([]);
        setScheduledFor('');
        setWizardStep('config');
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const fetchJournalEntries = async (devotionalId: string) => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('devotional_journal')
                .select('day_number, reflection')
                .eq('devotional_id', devotionalId)
                .eq('user_id', user.id);
            if (error) throw error;
            const entries: Record<number, string> = {};
            (data || []).forEach((e: any) => { entries[e.day_number] = e.reflection; });
            setJournalEntries(entries);
        } catch (err) {
            console.error('Error fetching journal:', err);
        }
    };

    const saveJournalEntry = async (devotionalId: string, dayNumber: number, reflection: string) => {
        if (!user) return;
        setJournalSavingDay(dayNumber);
        try {
            const { data: existing } = await supabase
                .from('devotional_journal')
                .select('id')
                .eq('devotional_id', devotionalId)
                .eq('user_id', user.id)
                .eq('day_number', dayNumber)
                .limit(1)
                .single();

            if (existing) {
                const { error } = await supabase
                    .from('devotional_journal')
                    .update({ reflection, updated_at: new Date().toISOString() })
                    .eq('id', existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('devotional_journal')
                    .insert({
                        devotional_id: devotionalId,
                        user_id: user.id,
                        day_number: dayNumber,
                        reflection,
                    });
                if (error) throw error;
            }
            setJournalEntries(prev => ({ ...prev, [dayNumber]: reflection }));
        } catch (err) {
            console.error('Error saving journal:', err);
        } finally {
            setJournalSavingDay(null);
        }
    };

    const inputStyle = {
        background: 'var(--bg-input)',
        border: '1px solid var(--border-strong)'
    };

    // Chat view
    if (view === 'chat' && activeChatGroupId) {
        return <DevotionalChat groupId={activeChatGroupId} onBack={() => { setView('list'); setActiveChatGroupId(null); }} />;
    }

    const stepIndex = ['config', 'preview', 'mode', 'schedule', 'group-info', 'invite', 'result'].indexOf(wizardStep);

    return (
        <PageTransition>
        <div className="min-h-screen text-white p-6 md:p-12 selection:bg-[var(--accent-hover)] selection:text-white" style={{ background: 'var(--bg-primary)' }}>
            <div className="max-w-4xl mx-auto">
                <header className="flex items-center justify-between mb-16">
                    <div className="flex items-center gap-4 md:gap-12">
                        <button onClick={() => {
                            if (view === 'wizard') {
                                if (wizardStep === 'config') { setView('list'); resetWizard(); }
                                else {
                                    const steps: WizardStep[] = ['config', 'preview', 'mode', 'schedule', 'group-info', 'invite', 'result'];
                                    const idx = steps.indexOf(wizardStep);
                                    setWizardStep(steps[Math.max(0, idx - 1)]);
                                }
                            } else {
                                navigate('/dashboard');
                            }
                        }} className="p-3 rounded-2xl transition-all" style={{ background: 'var(--border)' }}>
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <span className="text-[10px] font-bold tracking-[0.5em] uppercase" style={{ color: 'var(--text-muted)' }}>
                                {view === 'wizard' ? 'Novo Devocional' : 'Diário Espiritual'}
                            </span>
                            <h1 className="text-3xl sm:text-5xl font-serif italic tracking-tight">
                                {view === 'wizard'
                                    ? wizardStep === 'config' ? 'Configurar'
                                    : wizardStep === 'preview' ? 'Prévia'
                                    : wizardStep === 'mode' ? 'Modo'
                                    : wizardStep === 'schedule' ? 'Agendar'
                                    : wizardStep === 'group-info' ? 'Grupo'
                                    : wizardStep === 'invite' ? 'Convites'
                                    : 'Criar'
                                    : 'Devocionais'
                                }
                            </h1>
                        </div>
                    </div>

                    {view === 'list' && (
                        <button onClick={() => setView('wizard')} className="p-3 rounded-2xl transition-all" style={{ background: 'var(--border)' }}>
                            <Plus size={24} />
                        </button>
                    )}
                </header>

                <AnimatePresence>
                    {successMessage && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-8">
                            <div className="p-4 rounded-2xl text-white flex items-center gap-3 text-sm font-bold" style={{ background: 'var(--border-strong)', border: '1px solid var(--accent-soft)' }}>
                                <CheckCircle2 size={18} /> {successMessage}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                    {view === 'wizard' ? (
                        <motion.div
                            key="wizard"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            {/* Step indicators */}
                            <div className="flex items-center gap-2 mb-12 overflow-x-auto pb-2">
                                {(['config', 'preview', 'mode', 'schedule', 'group-info', 'invite', 'result'] as WizardStep[]).map((step, idx) => {
                                    const isCompleted = idx < stepIndex;
                                    const isCurrent = step === wizardStep;
                                    const isVisible = step === 'group-info' || step === 'invite' ? isGroup === true : true;
                                    if (!isVisible && !isCompleted) return null;
                                    return (
                                        <React.Fragment key={step}>
                                            <div className={cn(
                                                "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shrink-0",
                                                isCompleted ? "text-white" : isCurrent ? "text-white" : "text-white/20"
                                            )} style={{
                                                background: isCompleted ? 'var(--accent-solid)' : isCurrent ? 'var(--accent-hover)' : 'var(--bg-card-hover)',
                                                border: isCurrent ? '1px solid var(--accent-hover)' : '1px solid transparent'
                                            }}>
                                                {isCompleted ? <Check size={12} /> : idx + 1}
                                            </div>
                                            {idx < 6 && <div className="w-4 h-px shrink-0" style={{ background: isCompleted ? 'var(--accent-solid)' : 'var(--bg-elevated)' }} />}
                                        </React.Fragment>
                                    );
                                })}
                            </div>

                            {/* STEP 1: Config */}
                            {wizardStep === 'config' && (
                                <div className="space-y-6">
                                    <div className="p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)' }}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <Sparkles size={18} style={{ color: 'var(--accent-solid)' }} />
                                            <h3 className="text-lg font-bold tracking-tight">Sobre o que será o devocional?</h3>
                                        </div>
                                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                            Descreva o tema, situação ou reflexão que você quer explorar. A IA vai criar um devocional personalizado na NVI.
                                        </p>
                                        <textarea
                                            value={topic}
                                            onChange={e => setTopic(e.target.value)}
                                            placeholder="Ex: Estou passando por um momento difícil e preciso de paz..."
                                            className="w-full rounded-2xl py-4 px-5 focus:outline-none transition-all text-white placeholder:text-[var(--text-muted)] font-normal text-sm resize-none min-h-[120px]"
                                            style={inputStyle}
                                        />

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: 'var(--text-muted)' }}>Livro bíblico (opcional)</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={book}
                                                    onChange={e => { setBook(e.target.value); setBookSearch(e.target.value); setShowBookSuggestions(true); }}
                                                    onFocus={() => setShowBookSuggestions(true)}
                                                    onBlur={() => setTimeout(() => setShowBookSuggestions(false), 200)}
                                                    placeholder="Ex: Salmos, João, Romanos..."
                                                    className="w-full rounded-2xl py-4 px-5 focus:outline-none transition-all text-white placeholder:text-[var(--text-muted)] font-normal text-sm"
                                                    style={inputStyle}
                                                />
                                                {showBookSuggestions && bookSearch && (
                                                    <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-20 max-h-60 overflow-y-auto" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--accent-soft)' }}>
                                                        {filteredBooks.map(b => (
                                                            <button
                                                                key={b}
                                                                onMouseDown={() => { setBook(b); setBookSearch(b); setShowBookSuggestions(false); }}
                                                                className="w-full text-left px-5 py-3 text-sm hover:bg-white/5 transition-colors"
                                                                style={{ color: 'var(--text-primary)' }}
                                                            >
                                                                {b}
                                                            </button>
                                                        ))}
                                                        {filteredBooks.length === 0 && (
                                                            <p className="px-5 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum livro encontrado</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: 'var(--text-muted)' }}>Foco / Tema (opcional)</label>
                                            <input
                                                type="text"
                                                value={theme}
                                                onChange={e => setTheme(e.target.value)}
                                                placeholder="Ex: fé, coragem, perdão, gratidão..."
                                                className="w-full rounded-2xl py-4 px-5 focus:outline-none transition-all text-white placeholder:text-[var(--text-muted)] font-normal text-sm"
                                                style={inputStyle}
                                            />
                                        </div>

                                        {/* Duration selector */}
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: 'var(--text-muted)' }}>Quanto tempo?</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {DURATION_OPTIONS.map(opt => (
                                                    <button
                                                        key={opt.days}
                                                        onClick={() => setDurationDays(opt.days)}
                                                        className={cn(
                                                            "p-3 rounded-xl text-center transition-all border-2",
                                                            durationDays === opt.days
                                                                ? "border-[var(--accent-solid)] bg-[var(--accent-solid)]/10"
                                                                : "border-transparent bg-white/[0.03] hover:bg-white/5"
                                                        )}
                                                    >
                                                        <span className={cn("text-sm font-bold block", durationDays === opt.days ? "text-white" : "text-white/40")}>{opt.label}</span>
                                                        <span className="text-[10px] block mt-0.5" style={{ color: 'var(--text-muted)' }}>{opt.desc}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleGenerate}
                                            disabled={!topic.trim() || generating}
                                            className="w-full py-4 rounded-2xl font-black text-xs tracking-[0.3em] uppercase hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 text-[var(--text-on-accent)] flex items-center justify-center gap-3"
                                            style={{ background: 'var(--accent-solid)' }}
                                        >
                                            {generating ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" />
                                                    Gerando com IA...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles size={16} />
                                                    Gerar Devocional
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: Preview */}
                            {wizardStep === 'preview' && (
                                <div className="space-y-6">
                                    <div className="p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)' }}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <CheckCircle2 size={16} style={{ color: 'var(--accent-solid)' }} />
                                            <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: 'var(--accent-solid)' }}>Gerado pela IA • NVI</span>
                                        </div>
                                        <h3 className="text-xl font-serif italic">{generatedTitle}</h3>
                                        <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                                            {generatedContent}
                                        </div>
                                        {generatedVerse && (
                                            <div className="pt-3 flex items-center gap-2" style={{ borderTop: '1px solid var(--border)' }}>
                                                <BookOpen size={14} style={{ color: 'var(--text-secondary)' }} />
                                                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{generatedVerse}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Daily readings preview */}
                                    {generatedDailyReadings.length > 1 && (
                                        <div className="p-6 rounded-[2rem] space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)' }}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Clock size={14} style={{ color: 'var(--accent-solid)' }} />
                                                <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: 'var(--text-muted)' }}>
                                                    {generatedDailyReadings.length} dias de leitura
                                                </span>
                                            </div>
                                            {generatedDailyReadings.map((reading: any, idx: number) => (
                                                <div key={idx} className="p-4 rounded-xl" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-soft)', color: 'var(--accent-solid)' }}>Dia {reading.day}</span>
                                                        <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{reading.title}</span>
                                                    </div>
                                                    <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{reading.verse}</p>
                                                    <p className="text-[11px] mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{reading.reflection}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setWizardStep('config')}
                                            className="flex-1 py-4 rounded-2xl font-bold text-xs tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2"
                                            style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--bg-elevated)', color: 'var(--text-secondary)' }}
                                        >
                                            <ChevronLeft size={14} /> Refazer
                                        </button>
                                        <button
                                            onClick={() => setWizardStep('mode')}
                                            className="flex-1 py-4 rounded-2xl font-black text-xs tracking-[0.3em] uppercase transition-all text-white flex items-center justify-center gap-2"
                                            style={{ background: 'var(--accent-solid)' }}
                                        >
                                            Continuar <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: Mode (Solo/Group) */}
                            {wizardStep === 'mode' && (
                                <div className="space-y-6">
                                    <div className="p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)' }}>
                                        <h3 className="text-lg font-bold tracking-tight">Sozinho ou em grupo?</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                onClick={() => setIsGroup(false)}
                                                className={cn(
                                                    "p-6 rounded-2xl text-center transition-all",
                                                    isGroup === false ? "text-white" : "text-white/40 hover:text-white/60"
                                                )}
                                                style={{
                                                    background: isGroup === false ? 'var(--accent-soft)' : 'var(--bg-card)',
                                                    border: isGroup === false ? '1px solid var(--accent-hover)' : '1px solid var(--bg-card-hover)'
                                                }}
                                            >
                                                <User size={28} className="mx-auto mb-3" />
                                                <span className="text-sm font-bold block">Sozinho</span>
                                                <span className="text-[10px] block mt-1" style={{ color: 'var(--text-muted)' }}>Devocional pessoal</span>
                                            </button>
                                            <button
                                                onClick={() => setIsGroup(true)}
                                                className={cn(
                                                    "p-6 rounded-2xl text-center transition-all",
                                                    isGroup === true ? "text-white" : "text-white/40 hover:text-white/60"
                                                )}
                                                style={{
                                                    background: isGroup === true ? 'var(--accent-soft)' : 'var(--bg-card)',
                                                    border: isGroup === true ? '1px solid var(--accent-hover)' : '1px solid var(--bg-card-hover)'
                                                }}
                                            >
                                                <Users size={28} className="mx-auto mb-3" />
                                                <span className="text-sm font-bold block">Em Grupo</span>
                                                <span className="text-[10px] block mt-1" style={{ color: 'var(--text-muted)' }}>Crie um grupo</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setWizardStep('preview')}
                                            className="flex-1 py-4 rounded-2xl font-bold text-xs tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2"
                                            style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--bg-elevated)', color: 'var(--text-secondary)' }}
                                        >
                                            <ChevronLeft size={14} /> Voltar
                                        </button>
                                        <button
                                            onClick={() => setWizardStep('schedule')}
                                            disabled={isGroup === null}
                                            className="flex-1 py-4 rounded-2xl font-black text-xs tracking-[0.3em] uppercase transition-all disabled:opacity-20 text-[var(--text-on-accent)] flex items-center justify-center gap-2"
                                            style={{ background: 'var(--accent-solid)' }}
                                        >
                                            Continuar <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: Schedule */}
                            {wizardStep === 'schedule' && (
                                <div className="space-y-6">
                                    <div className="p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)' }}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <Calendar size={18} style={{ color: 'var(--accent-solid)' }} />
                                            <div>
                                                <h3 className="text-lg font-bold tracking-tight">Agendar Devocional</h3>
                                                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                                    Escolha quando disponibilizar este devocional, ou lance agora
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <button
                                                onClick={() => setScheduledFor('')}
                                                className={cn(
                                                    "p-5 rounded-2xl text-left transition-all",
                                                    !scheduledFor ? "text-white" : "text-white/40 hover:text-white/60"
                                                )}
                                                style={{
                                                    background: !scheduledFor ? 'var(--accent-soft)' : 'var(--bg-card)',
                                                    border: !scheduledFor ? '1px solid var(--accent-hover)' : '1px solid var(--bg-card-hover)'
                                                }}
                                            >
                                                <span className="text-sm font-bold block">Lançar Agora</span>
                                                <span className="text-[10px] block mt-1" style={{ color: 'var(--text-muted)' }}>Disponível imediatamente</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (!scheduledFor) {
                                                        const tomorrow = new Date();
                                                        tomorrow.setDate(tomorrow.getDate() + 1);
                                                        tomorrow.setHours(9, 0, 0, 0);
                                                        setScheduledFor(tomorrow.toISOString().slice(0, 16));
                                                    }
                                                }}
                                                className={cn(
                                                    "p-5 rounded-2xl text-left transition-all",
                                                    scheduledFor ? "text-white" : "text-white/40 hover:text-white/60"
                                                )}
                                                style={{
                                                    background: scheduledFor ? 'var(--accent-soft)' : 'var(--bg-card)',
                                                    border: scheduledFor ? '1px solid var(--accent-hover)' : '1px solid var(--bg-card-hover)'
                                                }}
                                            >
                                                <span className="text-sm font-bold block">Agendar</span>
                                                <span className="text-[10px] block mt-1" style={{ color: 'var(--text-muted)' }}>Escolher data e hora</span>
                                            </button>
                                        </div>

                                        {scheduledFor && (
                                            <div className="space-y-3 pt-2">
                                                <label className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: 'var(--text-muted)' }}>Data e hora de disponibilização</label>
                                                <input
                                                    type="datetime-local"
                                                    value={scheduledFor}
                                                    onChange={e => setScheduledFor(e.target.value)}
                                                    min={new Date().toISOString().slice(0, 16)}
                                                    className="w-full rounded-2xl py-4 px-5 focus:outline-none transition-all text-white font-normal text-sm"
                                                    style={{ ...inputStyle, colorScheme: 'dark' }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setWizardStep('mode')}
                                            className="flex-1 py-4 rounded-2xl font-bold text-xs tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2"
                                            style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--bg-elevated)', color: 'var(--text-secondary)' }}
                                        >
                                            <ChevronLeft size={14} /> Voltar
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (isGroup === false) {
                                                    setWizardStep('result');
                                                } else {
                                                    setWizardStep('group-info');
                                                }
                                            }}
                                            className="flex-1 py-4 rounded-2xl font-black text-xs tracking-[0.3em] uppercase transition-all text-[var(--text-on-accent)] flex items-center justify-center gap-2"
                                            style={{ background: 'var(--accent-solid)' }}
                                        >
                                            Continuar <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}



                            {/* STEP 5: Group Info (name + photo) */}
                            {wizardStep === 'group-info' && (
                                <div className="space-y-6">
                                    <div className="p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)' }}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <Users size={18} style={{ color: 'var(--accent-solid)' }} />
                                            <div>
                                                <h3 className="text-lg font-bold tracking-tight">Criar Grupo</h3>
                                                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                                    Dê um nome e uma foto pro seu grupo de devocional
                                                </p>
                                            </div>
                                        </div>

                                        {/* Group photo */}
                                        <div className="flex justify-center">
                                            <label className="relative cursor-pointer group">
                                                <div
                                                    className="w-28 h-28 rounded-full flex items-center justify-center transition-all overflow-hidden"
                                                    style={{
                                                        background: groupPhoto ? 'transparent' : 'var(--bg-input)',
                                                        border: groupPhoto ? '3px solid var(--accent-hover)' : '2px dashed var(--accent-soft)',
                                                    }}
                                                >
                                                    {groupPhoto ? (
                                                        <img src={groupPhoto} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="text-center">
                                                            <Camera size={28} className="mx-auto mb-2" style={{ color: 'var(--accent-hover)' }} />
                                                            <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--accent-hover)' }}>Adicionar Foto</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg" style={{ background: 'var(--accent-solid)' }}>
                                                    <Upload size={14} />
                                                </div>
                                                <input type="file" className="hidden" accept="image/*" onChange={handleGroupPhotoUpload} />
                                            </label>
                                        </div>

                                        {/* Group name */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: 'var(--text-muted)' }}>Nome do grupo</label>
                                            <input
                                                type="text"
                                                value={groupName}
                                                onChange={e => setGroupName(e.target.value)}
                                                placeholder={`Ex: Grupo ${generatedTitle}`}
                                                className="w-full rounded-2xl py-4 px-5 focus:outline-none transition-all text-white placeholder:text-[var(--text-muted)] font-normal text-sm"
                                                style={inputStyle}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setWizardStep('mode')}
                                            className="flex-1 py-4 rounded-2xl font-bold text-xs tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2"
                                            style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--bg-elevated)', color: 'var(--text-secondary)' }}
                                        >
                                            <ChevronLeft size={14} /> Voltar
                                        </button>
                                        <button
                                            onClick={() => setWizardStep('invite')}
                                            className="flex-1 py-4 rounded-2xl font-black text-xs tracking-[0.3em] uppercase transition-all text-[var(--text-on-accent)] flex items-center justify-center gap-2"
                                            style={{ background: 'var(--accent-solid)' }}
                                        >
                                            Convidar Pessoas <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 6: Invite members */}
                            {wizardStep === 'invite' && (
                                <div className="space-y-6">
                                    <div className="p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)' }}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <Users size={18} style={{ color: 'var(--accent-solid)' }} />
                                            <div>
                                                <h3 className="text-lg font-bold tracking-tight">Convidar Participantes</h3>
                                                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                                    Digite o nome de quem você quer convidar
                                                </p>
                                            </div>
                                        </div>

                                        <div className="relative">
                                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                                            <input
                                                type="text"
                                                value={userSearch}
                                                onChange={e => handleSearchUsers(e.target.value)}
                                                onFocus={handleFocusSearch}
                                                placeholder="Digite o nome de qualquer pessoa..."
                                                className="w-full rounded-2xl py-4 pl-11 pr-5 focus:outline-none transition-all text-white placeholder:text-[var(--text-muted)] font-normal text-sm"
                                                style={inputStyle}
                                            />
                                        </div>

                                        {/* Search results */}
                                        {searchResults.length > 0 && (
                                            <div className="rounded-2xl overflow-hidden max-h-72 overflow-y-auto" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                                                {searchResults.map(profile => (
                                                    <div
                                                        key={profile.id}
                                                        className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer"
                                                        style={{ borderBottom: '1px solid var(--bg-muted)' }}
                                                        onClick={() => handleAddInvitee(profile)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--border-strong)' }}>
                                                                {profile.avatar_url ? (
                                                                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                                                                ) : (
                                                                    <span className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                                                                        {(profile.display_name || profile.username || '?').charAt(0).toUpperCase()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{profile.display_name || 'Sem nome'}</p>
                                                                {profile.username && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>@{profile.username}</p>}
                                                            </div>
                                                        </div>
                                                        <Plus size={18} style={{ color: 'var(--accent-solid)' }} />
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Selected invitees */}
                                        {invitees.length > 0 && (
                                            <div className="space-y-3">
                                                <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: 'var(--text-muted)' }}>
                                                    Selecionados ({invitees.length})
                                                </span>
                                                <div className="flex flex-wrap gap-2">
                                                    {invitees.map(invitee => (
                                                        <div
                                                            key={invitee.id}
                                                            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full"
                                                            style={{ background: 'var(--border-strong)', border: '1px solid var(--accent-soft)' }}
                                                        >
                                                            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-hover)' }}>
                                                                {invitee.avatar_url ? (
                                                                    <img src={invitee.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                                                                ) : (
                                                                    <span className="text-[9px] font-bold" style={{ color: 'var(--accent-solid)' }}>
                                                                        {(invitee.display_name || invitee.username || '?').charAt(0).toUpperCase()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                                                                {invitee.display_name || invitee.username || '???'}
                                                            </span>
                                                            <button
                                                                onClick={() => handleRemoveInvitee(invitee.id)}
                                                                className="p-0.5 rounded-full hover:bg-white/10 transition-colors"
                                                                style={{ color: 'var(--danger)' }}
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setWizardStep('group-info')}
                                            className="flex-1 py-4 rounded-2xl font-bold text-xs tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2"
                                            style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--bg-elevated)', color: 'var(--text-secondary)' }}
                                        >
                                            <ChevronLeft size={14} /> Voltar
                                        </button>
                                        <button
                                            onClick={() => setWizardStep('result')}
                                            className="flex-1 py-4 rounded-2xl font-black text-xs tracking-[0.3em] uppercase transition-all text-[var(--text-on-accent)] flex items-center justify-center gap-2"
                                            style={{ background: 'var(--accent-solid)' }}
                                        >
                                            {invitees.length > 0 ? `Criar (${invitees.length})` : 'Pular'} <Check size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 7: Save */}
                            {wizardStep === 'result' && (
                                <div className="space-y-6">
                                    <div className="p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)' }}>
                                        <CheckCircle2 size={32} className="mx-auto" style={{ color: 'var(--accent-solid)' }} />
                                        <h3 className="text-xl font-serif italic text-center">{generatedTitle}</h3>
                                        <div className="text-sm leading-relaxed whitespace-pre-wrap text-center" style={{ color: 'var(--text-secondary)' }}>
                                            {generatedContent}
                                        </div>
                                        {generatedVerse && (
                                            <div className="pt-3 flex items-center justify-center gap-2" style={{ borderTop: '1px solid var(--border)' }}>
                                                <BookOpen size={14} style={{ color: 'var(--text-secondary)' }} />
                                                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{generatedVerse}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-center gap-4 text-xs flex-wrap" style={{ color: 'var(--text-muted)' }}>
                                            <span className="flex items-center gap-1.5"><Clock size={12} /> {durationDays} dia{durationDays > 1 ? 's' : ''}</span>
                                            {scheduledFor ? (
                                                <span className="flex items-center gap-1.5"><Calendar size={12} /> {new Date(scheduledFor).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                            ) : (
                                                <span className="flex items-center gap-1.5"><Calendar size={12} /> Agora</span>
                                            )}
                                            {isGroup ? (
                                                <span className="flex items-center gap-1.5"><Users size={12} /> {groupName || 'Grupo'} ({invitees.length} convidado{invitees.length !== 1 ? 's' : ''})</span>
                                            ) : (
                                                <span className="flex items-center gap-1.5"><User size={12} /> Pessoal</span>
                                            )}
                                            {book && <span className="flex items-center gap-1.5"><BookOpen size={12} /> {book}</span>}
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setWizardStep(isGroup ? 'invite' : 'schedule')}
                                            className="flex-1 py-4 rounded-2xl font-bold text-xs tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2"
                                            style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--bg-elevated)', color: 'var(--text-secondary)' }}
                                        >
                                            <ChevronLeft size={14} /> Voltar
                                        </button>
                                        <button
                                            onClick={handleSaveDevotional}
                                            disabled={saving}
                                            className="flex-1 py-4 rounded-2xl font-black text-xs tracking-[0.3em] uppercase transition-all disabled:opacity-20 text-[var(--text-on-accent)] flex items-center justify-center gap-2"
                                            style={{ background: 'var(--accent-solid)' }}
                                        >
                                            {saving ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <>
                                                    <Send size={14} />
                                                    Salvar Devocional
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        /* LIST VIEW */
                        <motion.div
                            key="list"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-4"
                        >
                            {/* Detail View */}
                            {selectedDevotional ? (
                                <div className="space-y-4">
                                    <button
                                        onClick={() => { setSelectedDevotional(null); setJournalEntries({}); }}
                                        className="flex items-center gap-2 text-sm font-bold transition-all hover:opacity-80"
                                        style={{ color: 'var(--accent-solid)' }}
                                    >
                                        <ChevronLeft size={16} /> Voltar aos devocionais
                                    </button>
                                    <div className="p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)' }}>
                                        <h3 className="text-xl font-serif italic">{selectedDevotional.title}</h3>
                                        <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                                            {selectedDevotional.content}
                                        </div>
                                        {selectedDevotional.verse && (
                                            <div className="pt-3 flex items-center gap-2" style={{ borderTop: '1px solid var(--border)' }}>
                                                <BookOpen size={14} style={{ color: 'var(--text-secondary)' }} />
                                                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{selectedDevotional.verse}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Daily readings + Journal */}
                                    {selectedDevotional.daily_readings.length > 0 && (
                                        <div className="p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)' }}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <PenLine size={16} style={{ color: 'var(--accent-solid)' }} />
                                                <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: 'var(--text-muted)' }}>Leituras e Diário</span>
                                            </div>
                                            {selectedDevotional.daily_readings.map((reading: any, idx: number) => (
                                                <div key={idx} className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-soft)', color: 'var(--accent-solid)' }}>Dia {reading.day}</span>
                                                        <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{reading.title}</span>
                                                    </div>
                                                    <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{reading.verse}</p>
                                                    <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{reading.reflection}</p>
                                                    <div className="pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                                                        <label className="text-[10px] font-bold tracking-[0.15em] uppercase block mb-2" style={{ color: 'var(--text-muted)' }}>Sua reflexão</label>
                                                        <textarea
                                                            value={journalEntries[reading.day] || ''}
                                                            onChange={e => setJournalEntries(prev => ({ ...prev, [reading.day]: e.target.value }))}
                                                            placeholder="Como essa leitura tocou seu coração..."
                                                            className="w-full rounded-xl py-3 px-4 focus:outline-none transition-all text-white placeholder:text-[var(--text-dim)] font-normal text-xs resize-none min-h-[80px]"
                                                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-strong)' }}
                                                        />
                                                        <button
                                                            onClick={() => saveJournalEntry(selectedDevotional.id, reading.day, journalEntries[reading.day] || '')}
                                                            disabled={journalSavingDay === reading.day || !(journalEntries[reading.day] || '').trim()}
                                                            className="mt-2 px-4 py-2 rounded-xl text-[10px] font-bold tracking-[0.15em] uppercase transition-all disabled:opacity-20 flex items-center gap-2"
                                                            style={{ background: 'var(--accent-soft)', color: 'var(--accent-solid)' }}
                                                        >
                                                            {journalSavingDay === reading.day ? (
                                                                <Loader2 size={12} className="animate-spin" />
                                                            ) : (
                                                                <Save size={12} />
                                                            )}
                                                            Salvar
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {/* Tabs */}
                                    <div className="flex gap-2 mb-6">
                                        <button
                                            onClick={() => setJournalTab('devotionals')}
                                            className={cn(
                                                "px-5 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-all",
                                                journalTab === 'devotionals' ? "text-white" : "text-white/30 hover:text-white/50"
                                            )}
                                            style={{
                                                background: journalTab === 'devotionals' ? 'var(--accent-soft)' : 'var(--bg-card)',
                                                border: journalTab === 'devotionals' ? '1px solid var(--accent-hover)' : '1px solid var(--bg-card-hover)'
                                            }}
                                        >
                                            Devocionais
                                        </button>
                                        <button
                                            onClick={() => setJournalTab('diary')}
                                            className={cn(
                                                "px-5 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-all",
                                                journalTab === 'diary' ? "text-white" : "text-white/30 hover:text-white/50"
                                            )}
                                            style={{
                                                background: journalTab === 'diary' ? 'var(--accent-soft)' : 'var(--bg-card)',
                                                border: journalTab === 'diary' ? '1px solid var(--accent-hover)' : '1px solid var(--bg-card-hover)'
                                            }}
                                        >
                                            Meu Diário
                                        </button>
                                    </div>

                                    {loading ? (
                                        <div className="flex items-center justify-center py-20">
                                            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent-soft)', borderTopColor: 'var(--accent-solid)' }} />
                                        </div>
                                    ) : journalTab === 'devotionals' ? (
                                        devotionals.length === 0 ? (
                                            <div className="p-16 rounded-[2.5rem] text-center" style={{ border: '2px dashed var(--border)' }}>
                                                <BookOpen className="mx-auto mb-4" size={48} style={{ color: 'var(--accent-soft)' }} />
                                                <p className="font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Nenhum devocional ainda</p>
                                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Crie seu primeiro devocional com ajuda da IA</p>
                                            </div>
                                        ) : (
                                            devotionals.map((dev, i) => (
                                                <motion.div
                                                    key={dev.id}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.05 }}
                                                    className="p-6 rounded-[2rem] group transition-all duration-300 cursor-pointer hover:border-[rgba(75,136,162,0.25)]"
                                                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                                                    onClick={() => {
                                                        setSelectedDevotional(dev);
                                                        fetchJournalEntries(dev.id);
                                                    }}
                                                >
                                                    <div className="flex items-start justify-between gap-4 mb-3">
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-xl font-serif mb-2">{dev.title}</h4>
                                                            <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                                                                <span className="flex items-center gap-1.5"><Calendar size={12} /> {formatDate(dev.created_at)}</span>
                                                                {dev.verse && (
                                                                    <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}><BookOpen size={12} /> {dev.verse}</span>
                                                                )}
                                                                {dev.duration_days > 1 && (
                                                                    <span className="flex items-center gap-1.5"><Clock size={12} /> {dev.duration_days} dias</span>
                                                                )}
                                                                {dev.scheduled_for && (
                                                                    <span className="flex items-center gap-1.5" style={{ color: 'rgba(255, 193, 7, 0.7)' }}>
                                                                        <Calendar size={12} /> Agendado: {new Date(dev.scheduled_for).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                                                    </span>
                                                                )}
                                                                {dev.is_group && (
                                                                    <span className="flex items-center gap-1.5"><Users size={12} /> {dev.group?.name || 'Grupo'}</span>
                                                                )}
                                                                {dev.creator_name && dev.creator_id !== user?.id && (
                                                                    <span className="flex items-center gap-1.5"><User size={12} /> {dev.creator_name}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {dev.is_group && dev.group && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setActiveChatGroupId(dev.group!.id); setView('chat'); }}
                                                                    className="p-3 rounded-xl transition-all hover:scale-110"
                                                                    style={{ background: 'var(--border-strong)', color: 'var(--accent-solid)' }}
                                                                    title="Abrir chat do grupo"
                                                                >
                                                                    <MessageCircle size={18} />
                                                                </button>
                                                            )}
                                                            {dev.creator_id === user?.id && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleDelete(dev.id); }}
                                                                    className="p-3 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                                                                    style={{ color: 'var(--danger)' }}
                                                                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--danger-soft)')}
                                                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                                                        {dev.content.length > 300 ? dev.content.slice(0, 300) + '...' : dev.content}
                                                    </p>
                                                </motion.div>
                                            ))
                                        )
                                    ) : (
                                        /* DIARY TAB */
                                        (() => {
                                            const devotionalEntries = devotionals.filter(d => d.duration_days > 1);
                                            if (devotionalEntries.length === 0) {
                                                return (
                                                    <div className="p-16 rounded-[2.5rem] text-center" style={{ border: '2px dashed var(--border)' }}>
                                                        <PenLine className="mx-auto mb-4" size={48} style={{ color: 'var(--accent-soft)' }} />
                                                        <p className="font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Nenhum diário ainda</p>
                                                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Crie um devocional multi-dia para开始 escrever reflexões</p>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div className="space-y-4">
                                                    {devotionalEntries.map((dev, i) => (
                                                        <motion.div
                                                            key={dev.id}
                                                            initial={{ opacity: 0, y: 20 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: i * 0.05 }}
                                                            className="p-6 rounded-[2rem] cursor-pointer hover:border-[rgba(75,136,162,0.25)] transition-all duration-300"
                                                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                                                            onClick={() => {
                                                                setSelectedDevotional(dev);
                                                                fetchJournalEntries(dev.id);
                                                            }}
                                                        >
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <PenLine size={16} style={{ color: 'var(--accent-solid)' }} />
                                                                <h4 className="text-lg font-serif">{dev.title}</h4>
                                                            </div>
                                                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                                {dev.duration_days} dias • Clique para escrever reflexões
                                                            </p>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            );
                                        })()
                                    )}
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
        </PageTransition>
    );
};

export default DevotionalsPage;
