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
    ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { generateDevotional } from '../services/groqService';
import PageTransition from '../components/PageTransition';
import DevotionalChat from '../components/DevotionalChat';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

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

type WizardStep = 'config' | 'preview' | 'mode' | 'group-info' | 'invite' | 'result';

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
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

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
        setWizardStep('config');
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const inputStyle = {
        background: 'rgba(75, 136, 162, 0.08)',
        border: '1px solid rgba(75, 136, 162, 0.15)'
    };

    // Chat view
    if (view === 'chat' && activeChatGroupId) {
        return <DevotionalChat groupId={activeChatGroupId} onBack={() => { setView('list'); setActiveChatGroupId(null); }} />;
    }

    const stepIndex = ['config', 'preview', 'mode', 'group-info', 'invite', 'result'].indexOf(wizardStep);

    return (
        <PageTransition>
        <div className="min-h-screen text-white p-6 md:p-12 selection:bg-[#4B88A2]/30 selection:text-white" style={{ background: '#252627' }}>
            <div className="max-w-4xl mx-auto">
                <header className="flex items-center justify-between mb-16">
                    <div className="flex items-center gap-4 md:gap-12">
                        <button onClick={() => {
                            if (view === 'wizard') {
                                if (wizardStep === 'config') { setView('list'); resetWizard(); }
                                else {
                                    const steps: WizardStep[] = ['config', 'preview', 'mode', 'group-info', 'invite', 'result'];
                                    const idx = steps.indexOf(wizardStep);
                                    setWizardStep(steps[Math.max(0, idx - 1)]);
                                }
                            } else {
                                navigate('/dashboard');
                            }
                        }} className="p-3 rounded-2xl transition-all" style={{ background: 'rgba(75, 136, 162, 0.1)' }}>
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <span className="text-[10px] font-bold tracking-[0.5em] uppercase" style={{ color: 'rgba(211, 212, 217, 0.4)' }}>
                                {view === 'wizard' ? 'Novo Devocional' : 'Diário Espiritual'}
                            </span>
                            <h1 className="text-3xl sm:text-5xl font-serif italic tracking-tight">
                                {view === 'wizard'
                                    ? wizardStep === 'config' ? 'Configurar'
                                    : wizardStep === 'preview' ? 'Prévia'
                                    : wizardStep === 'mode' ? 'Modo'
                                    : wizardStep === 'group-info' ? 'Grupo'
                                    : wizardStep === 'invite' ? 'Convites'
                                    : 'Criar'
                                    : 'Devocionais'
                                }
                            </h1>
                        </div>
                    </div>

                    {view === 'list' && (
                        <button onClick={() => setView('wizard')} className="p-3 rounded-2xl transition-all" style={{ background: 'rgba(75, 136, 162, 0.1)' }}>
                            <Plus size={24} />
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
                                {(['config', 'preview', 'mode', 'group-info', 'invite', 'result'] as WizardStep[]).map((step, idx) => {
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
                                                background: isCompleted ? '#4B88A2' : isCurrent ? 'rgba(75, 136, 162, 0.3)' : 'rgba(255,255,255,0.05)',
                                                border: isCurrent ? '1px solid rgba(75, 136, 162, 0.5)' : '1px solid transparent'
                                            }}>
                                                {isCompleted ? <Check size={12} /> : idx + 1}
                                            </div>
                                            {idx < 5 && <div className="w-4 h-px shrink-0" style={{ background: isCompleted ? '#4B88A2' : 'rgba(255,255,255,0.08)' }} />}
                                        </React.Fragment>
                                    );
                                })}
                            </div>

                            {/* STEP 1: Config */}
                            {wizardStep === 'config' && (
                                <div className="space-y-6">
                                    <div className="p-8 rounded-[2.5rem] space-y-6" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(75, 136, 162, 0.15)' }}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <Sparkles size={18} style={{ color: '#4B88A2' }} />
                                            <h3 className="text-lg font-bold tracking-tight">Sobre o que será o devocional?</h3>
                                        </div>
                                        <p className="text-sm" style={{ color: 'rgba(211, 212, 217, 0.5)' }}>
                                            Descreva o tema, situação ou reflexão que você quer explorar. A IA vai criar um devocional personalizado na NVI.
                                        </p>
                                        <textarea
                                            value={topic}
                                            onChange={e => setTopic(e.target.value)}
                                            placeholder="Ex: Estou passando por um momento difícil e preciso de paz..."
                                            className="w-full rounded-2xl py-4 px-5 focus:outline-none transition-all text-white placeholder:text-[rgba(211,212,217,0.3)] font-normal text-sm resize-none min-h-[120px]"
                                            style={inputStyle}
                                        />

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: 'rgba(211, 212, 217, 0.4)' }}>Livro bíblico (opcional)</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={book}
                                                    onChange={e => { setBook(e.target.value); setBookSearch(e.target.value); setShowBookSuggestions(true); }}
                                                    onFocus={() => setShowBookSuggestions(true)}
                                                    onBlur={() => setTimeout(() => setShowBookSuggestions(false), 200)}
                                                    placeholder="Ex: Salmos, João, Romanos..."
                                                    className="w-full rounded-2xl py-4 px-5 focus:outline-none transition-all text-white placeholder:text-[rgba(211,212,217,0.3)] font-normal text-sm"
                                                    style={inputStyle}
                                                />
                                                {showBookSuggestions && bookSearch && (
                                                    <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-20 max-h-60 overflow-y-auto" style={{ background: 'rgba(37, 38, 39, 0.98)', border: '1px solid rgba(75, 136, 162, 0.2)' }}>
                                                        {filteredBooks.map(b => (
                                                            <button
                                                                key={b}
                                                                onMouseDown={() => { setBook(b); setBookSearch(b); setShowBookSuggestions(false); }}
                                                                className="w-full text-left px-5 py-3 text-sm hover:bg-white/5 transition-colors"
                                                                style={{ color: 'rgba(211, 212, 217, 0.8)' }}
                                                            >
                                                                {b}
                                                            </button>
                                                        ))}
                                                        {filteredBooks.length === 0 && (
                                                            <p className="px-5 py-3 text-sm" style={{ color: 'rgba(211, 212, 217, 0.3)' }}>Nenhum livro encontrado</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: 'rgba(211, 212, 217, 0.4)' }}>Foco / Tema (opcional)</label>
                                            <input
                                                type="text"
                                                value={theme}
                                                onChange={e => setTheme(e.target.value)}
                                                placeholder="Ex: fé, coragem, perdão, gratidão..."
                                                className="w-full rounded-2xl py-4 px-5 focus:outline-none transition-all text-white placeholder:text-[rgba(211,212,217,0.3)] font-normal text-sm"
                                                style={inputStyle}
                                            />
                                        </div>

                                        {/* Duration selector */}
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: 'rgba(211, 212, 217, 0.4)' }}>Quanto tempo?</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {DURATION_OPTIONS.map(opt => (
                                                    <button
                                                        key={opt.days}
                                                        onClick={() => setDurationDays(opt.days)}
                                                        className={cn(
                                                            "p-3 rounded-xl text-center transition-all border-2",
                                                            durationDays === opt.days
                                                                ? "border-[#4B88A2] bg-[#4B88A2]/10"
                                                                : "border-transparent bg-white/[0.03] hover:bg-white/5"
                                                        )}
                                                    >
                                                        <span className={cn("text-sm font-bold block", durationDays === opt.days ? "text-white" : "text-white/40")}>{opt.label}</span>
                                                        <span className="text-[10px] block mt-0.5" style={{ color: 'rgba(211,212,217,0.3)' }}>{opt.desc}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleGenerate}
                                            disabled={!topic.trim() || generating}
                                            className="w-full py-4 rounded-2xl font-black text-xs tracking-[0.3em] uppercase hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 text-white flex items-center justify-center gap-3"
                                            style={{ background: '#BB0A21' }}
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
                                    <div className="p-8 rounded-[2.5rem] space-y-4" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(75, 136, 162, 0.15)' }}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <CheckCircle2 size={16} style={{ color: '#4B88A2' }} />
                                            <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: '#4B88A2' }}>Gerado pela IA • NVI</span>
                                        </div>
                                        <h3 className="text-xl font-serif italic">{generatedTitle}</h3>
                                        <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(211, 212, 217, 0.7)' }}>
                                            {generatedContent}
                                        </div>
                                        {generatedVerse && (
                                            <div className="pt-3 flex items-center gap-2" style={{ borderTop: '1px solid rgba(75, 136, 162, 0.1)' }}>
                                                <BookOpen size={14} style={{ color: 'rgba(75, 136, 162, 0.6)' }} />
                                                <span className="text-sm font-bold" style={{ color: 'rgba(75, 136, 162, 0.8)' }}>{generatedVerse}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Daily readings preview */}
                                    {generatedDailyReadings.length > 1 && (
                                        <div className="p-6 rounded-[2rem] space-y-3" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(75, 136, 162, 0.15)' }}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Clock size={14} style={{ color: '#4B88A2' }} />
                                                <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: 'rgba(211, 212, 217, 0.4)' }}>
                                                    {generatedDailyReadings.length} dias de leitura
                                                </span>
                                            </div>
                                            {generatedDailyReadings.map((reading: any, idx: number) => (
                                                <div key={idx} className="p-4 rounded-xl" style={{ background: 'rgba(75, 136, 162, 0.05)', border: '1px solid rgba(75, 136, 162, 0.08)' }}>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(75, 136, 162, 0.2)', color: '#4B88A2' }}>Dia {reading.day}</span>
                                                        <span className="text-xs font-bold" style={{ color: '#FFF9FB' }}>{reading.title}</span>
                                                    </div>
                                                    <p className="text-xs font-bold" style={{ color: 'rgba(75, 136, 162, 0.8)' }}>{reading.verse}</p>
                                                    <p className="text-[11px] mt-1 line-clamp-2" style={{ color: 'rgba(211, 212, 217, 0.5)' }}>{reading.reflection}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setWizardStep('config')}
                                            className="flex-1 py-4 rounded-2xl font-bold text-xs tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2"
                                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(211, 212, 217, 0.6)' }}
                                        >
                                            <ChevronLeft size={14} /> Refazer
                                        </button>
                                        <button
                                            onClick={() => setWizardStep('mode')}
                                            className="flex-1 py-4 rounded-2xl font-black text-xs tracking-[0.3em] uppercase transition-all text-white flex items-center justify-center gap-2"
                                            style={{ background: '#4B88A2' }}
                                        >
                                            Continuar <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: Mode (Solo/Group) */}
                            {wizardStep === 'mode' && (
                                <div className="space-y-6">
                                    <div className="p-8 rounded-[2.5rem] space-y-6" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(75, 136, 162, 0.15)' }}>
                                        <h3 className="text-lg font-bold tracking-tight">Sozinho ou em grupo?</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                onClick={() => setIsGroup(false)}
                                                className={cn(
                                                    "p-6 rounded-2xl text-center transition-all",
                                                    isGroup === false ? "text-white" : "text-white/40 hover:text-white/60"
                                                )}
                                                style={{
                                                    background: isGroup === false ? 'rgba(75, 136, 162, 0.2)' : 'rgba(255,255,255,0.03)',
                                                    border: isGroup === false ? '1px solid rgba(75, 136, 162, 0.4)' : '1px solid rgba(255,255,255,0.05)'
                                                }}
                                            >
                                                <User size={28} className="mx-auto mb-3" />
                                                <span className="text-sm font-bold block">Sozinho</span>
                                                <span className="text-[10px] block mt-1" style={{ color: 'rgba(211,212,217,0.4)' }}>Devocional pessoal</span>
                                            </button>
                                            <button
                                                onClick={() => setIsGroup(true)}
                                                className={cn(
                                                    "p-6 rounded-2xl text-center transition-all",
                                                    isGroup === true ? "text-white" : "text-white/40 hover:text-white/60"
                                                )}
                                                style={{
                                                    background: isGroup === true ? 'rgba(75, 136, 162, 0.2)' : 'rgba(255,255,255,0.03)',
                                                    border: isGroup === true ? '1px solid rgba(75, 136, 162, 0.4)' : '1px solid rgba(255,255,255,0.05)'
                                                }}
                                            >
                                                <Users size={28} className="mx-auto mb-3" />
                                                <span className="text-sm font-bold block">Em Grupo</span>
                                                <span className="text-[10px] block mt-1" style={{ color: 'rgba(211,212,217,0.4)' }}>Crie um grupo</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setWizardStep('preview')}
                                            className="flex-1 py-4 rounded-2xl font-bold text-xs tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2"
                                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(211, 212, 217, 0.6)' }}
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
                                            disabled={isGroup === null}
                                            className="flex-1 py-4 rounded-2xl font-black text-xs tracking-[0.3em] uppercase transition-all disabled:opacity-20 text-white flex items-center justify-center gap-2"
                                            style={{ background: '#BB0A21' }}
                                        >
                                            Continuar <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: Group Info (name + photo) */}
                            {wizardStep === 'group-info' && (
                                <div className="space-y-6">
                                    <div className="p-8 rounded-[2.5rem] space-y-6" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(75, 136, 162, 0.15)' }}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <Users size={18} style={{ color: '#4B88A2' }} />
                                            <div>
                                                <h3 className="text-lg font-bold tracking-tight">Criar Grupo</h3>
                                                <p className="text-xs mt-1" style={{ color: 'rgba(211, 212, 217, 0.4)' }}>
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
                                                        background: groupPhoto ? 'transparent' : 'rgba(75, 136, 162, 0.08)',
                                                        border: groupPhoto ? '3px solid rgba(75, 136, 162, 0.4)' : '2px dashed rgba(75, 136, 162, 0.2)',
                                                    }}
                                                >
                                                    {groupPhoto ? (
                                                        <img src={groupPhoto} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="text-center">
                                                            <Camera size={28} className="mx-auto mb-2" style={{ color: 'rgba(75, 136, 162, 0.3)' }} />
                                                            <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'rgba(75, 136, 162, 0.3)' }}>Adicionar Foto</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg" style={{ background: '#4B88A2' }}>
                                                    <Upload size={14} />
                                                </div>
                                                <input type="file" className="hidden" accept="image/*" onChange={handleGroupPhotoUpload} />
                                            </label>
                                        </div>

                                        {/* Group name */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: 'rgba(211, 212, 217, 0.4)' }}>Nome do grupo</label>
                                            <input
                                                type="text"
                                                value={groupName}
                                                onChange={e => setGroupName(e.target.value)}
                                                placeholder={`Ex: Grupo ${generatedTitle}`}
                                                className="w-full rounded-2xl py-4 px-5 focus:outline-none transition-all text-white placeholder:text-[rgba(211,212,217,0.3)] font-normal text-sm"
                                                style={inputStyle}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setWizardStep('mode')}
                                            className="flex-1 py-4 rounded-2xl font-bold text-xs tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2"
                                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(211, 212, 217, 0.6)' }}
                                        >
                                            <ChevronLeft size={14} /> Voltar
                                        </button>
                                        <button
                                            onClick={() => setWizardStep('invite')}
                                            className="flex-1 py-4 rounded-2xl font-black text-xs tracking-[0.3em] uppercase transition-all text-white flex items-center justify-center gap-2"
                                            style={{ background: '#BB0A21' }}
                                        >
                                            Convidar Pessoas <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 5: Invite members */}
                            {wizardStep === 'invite' && (
                                <div className="space-y-6">
                                    <div className="p-8 rounded-[2.5rem] space-y-6" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(75, 136, 162, 0.15)' }}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <Users size={18} style={{ color: '#4B88A2' }} />
                                            <div>
                                                <h3 className="text-lg font-bold tracking-tight">Convidar Participantes</h3>
                                                <p className="text-xs mt-1" style={{ color: 'rgba(211, 212, 217, 0.4)' }}>
                                                    Digite o nome de quem você quer convidar
                                                </p>
                                            </div>
                                        </div>

                                        <div className="relative">
                                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'rgba(211, 212, 217, 0.3)' }} />
                                            <input
                                                type="text"
                                                value={userSearch}
                                                onChange={e => handleSearchUsers(e.target.value)}
                                                onFocus={handleFocusSearch}
                                                placeholder="Digite o nome de qualquer pessoa..."
                                                className="w-full rounded-2xl py-4 pl-11 pr-5 focus:outline-none transition-all text-white placeholder:text-[rgba(211,212,217,0.3)] font-normal text-sm"
                                                style={inputStyle}
                                            />
                                        </div>

                                        {/* Search results */}
                                        {searchResults.length > 0 && (
                                            <div className="rounded-2xl overflow-hidden max-h-72 overflow-y-auto" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(75, 136, 162, 0.1)' }}>
                                                {searchResults.map(profile => (
                                                    <div
                                                        key={profile.id}
                                                        className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer"
                                                        style={{ borderBottom: '1px solid rgba(75, 136, 162, 0.05)' }}
                                                        onClick={() => handleAddInvitee(profile)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(75, 136, 162, 0.15)' }}>
                                                                {profile.avatar_url ? (
                                                                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                                                                ) : (
                                                                    <span className="text-sm font-bold" style={{ color: 'rgba(75, 136, 162, 0.6)' }}>
                                                                        {(profile.display_name || profile.username || '?').charAt(0).toUpperCase()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold" style={{ color: '#FFF9FB' }}>{profile.display_name || 'Sem nome'}</p>
                                                                {profile.username && <p className="text-xs" style={{ color: 'rgba(211, 212, 217, 0.4)' }}>@{profile.username}</p>}
                                                            </div>
                                                        </div>
                                                        <Plus size={18} style={{ color: '#4B88A2' }} />
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Selected invitees */}
                                        {invitees.length > 0 && (
                                            <div className="space-y-3">
                                                <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: 'rgba(211, 212, 217, 0.4)' }}>
                                                    Selecionados ({invitees.length})
                                                </span>
                                                <div className="flex flex-wrap gap-2">
                                                    {invitees.map(invitee => (
                                                        <div
                                                            key={invitee.id}
                                                            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full"
                                                            style={{ background: 'rgba(75, 136, 162, 0.15)', border: '1px solid rgba(75, 136, 162, 0.2)' }}
                                                        >
                                                            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(75, 136, 162, 0.3)' }}>
                                                                {invitee.avatar_url ? (
                                                                    <img src={invitee.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                                                                ) : (
                                                                    <span className="text-[9px] font-bold" style={{ color: '#4B88A2' }}>
                                                                        {(invitee.display_name || invitee.username || '?').charAt(0).toUpperCase()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-xs font-bold" style={{ color: 'rgba(211, 212, 217, 0.8)' }}>
                                                                {invitee.display_name || invitee.username || '???'}
                                                            </span>
                                                            <button
                                                                onClick={() => handleRemoveInvitee(invitee.id)}
                                                                className="p-0.5 rounded-full hover:bg-white/10 transition-colors"
                                                                style={{ color: 'rgba(187, 10, 33, 0.6)' }}
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
                                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(211, 212, 217, 0.6)' }}
                                        >
                                            <ChevronLeft size={14} /> Voltar
                                        </button>
                                        <button
                                            onClick={() => setWizardStep('result')}
                                            className="flex-1 py-4 rounded-2xl font-black text-xs tracking-[0.3em] uppercase transition-all text-white flex items-center justify-center gap-2"
                                            style={{ background: '#BB0A21' }}
                                        >
                                            {invitees.length > 0 ? `Criar (${invitees.length})` : 'Pular'} <Check size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 6: Save */}
                            {wizardStep === 'result' && (
                                <div className="space-y-6">
                                    <div className="p-8 rounded-[2.5rem] space-y-4" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(75, 136, 162, 0.15)' }}>
                                        <CheckCircle2 size={32} className="mx-auto" style={{ color: '#4B88A2' }} />
                                        <h3 className="text-xl font-serif italic text-center">{generatedTitle}</h3>
                                        <div className="text-sm leading-relaxed whitespace-pre-wrap text-center" style={{ color: 'rgba(211, 212, 217, 0.7)' }}>
                                            {generatedContent}
                                        </div>
                                        {generatedVerse && (
                                            <div className="pt-3 flex items-center justify-center gap-2" style={{ borderTop: '1px solid rgba(75, 136, 162, 0.1)' }}>
                                                <BookOpen size={14} style={{ color: 'rgba(75, 136, 162, 0.6)' }} />
                                                <span className="text-sm font-bold" style={{ color: 'rgba(75, 136, 162, 0.8)' }}>{generatedVerse}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-center gap-4 text-xs flex-wrap" style={{ color: 'rgba(211, 212, 217, 0.4)' }}>
                                            <span className="flex items-center gap-1.5"><Clock size={12} /> {durationDays} dia{durationDays > 1 ? 's' : ''}</span>
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
                                            onClick={() => setWizardStep(isGroup ? 'invite' : 'mode')}
                                            className="flex-1 py-4 rounded-2xl font-bold text-xs tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2"
                                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(211, 212, 217, 0.6)' }}
                                        >
                                            <ChevronLeft size={14} /> Voltar
                                        </button>
                                        <button
                                            onClick={handleSaveDevotional}
                                            disabled={saving}
                                            className="flex-1 py-4 rounded-2xl font-black text-xs tracking-[0.3em] uppercase transition-all disabled:opacity-20 text-white flex items-center justify-center gap-2"
                                            style={{ background: '#4B88A2' }}
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
                            {loading ? (
                                <div className="flex items-center justify-center py-20">
                                    <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(75, 136, 162, 0.2)', borderTopColor: '#4B88A2' }} />
                                </div>
                            ) : devotionals.length === 0 ? (
                                <div className="p-16 rounded-[2.5rem] text-center" style={{ border: '2px dashed rgba(75, 136, 162, 0.1)' }}>
                                    <BookOpen className="mx-auto mb-4" size={48} style={{ color: 'rgba(75, 136, 162, 0.2)' }} />
                                    <p className="font-medium mb-2" style={{ color: 'rgba(211, 212, 217, 0.5)' }}>Nenhum devocional ainda</p>
                                    <p className="text-sm" style={{ color: 'rgba(211, 212, 217, 0.3)' }}>Crie seu primeiro devocional com ajuda da IA</p>
                                </div>
                            ) : (
                                devotionals.map((dev, i) => (
                                    <motion.div
                                        key={dev.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="p-6 rounded-[2rem] group transition-all duration-300"
                                        style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(75, 136, 162, 0.1)' }}
                                    >
                                        <div className="flex items-start justify-between gap-4 mb-3">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-xl font-serif mb-2">{dev.title}</h4>
                                                <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'rgba(211, 212, 217, 0.4)' }}>
                                                    <span className="flex items-center gap-1.5"><Calendar size={12} /> {formatDate(dev.created_at)}</span>
                                                    {dev.verse && (
                                                        <span className="flex items-center gap-1.5" style={{ color: 'rgba(75, 136, 162, 0.6)' }}><BookOpen size={12} /> {dev.verse}</span>
                                                    )}
                                                    {dev.duration_days > 1 && (
                                                        <span className="flex items-center gap-1.5"><Clock size={12} /> {dev.duration_days} dias</span>
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
                                                        onClick={() => { setActiveChatGroupId(dev.group!.id); setView('chat'); }}
                                                        className="p-3 rounded-xl transition-all hover:scale-110"
                                                        style={{ background: 'rgba(75, 136, 162, 0.15)', color: '#4B88A2' }}
                                                        title="Abrir chat do grupo"
                                                    >
                                                        <MessageCircle size={18} />
                                                    </button>
                                                )}
                                                {dev.creator_id === user?.id && (
                                                    <button
                                                        onClick={() => handleDelete(dev.id)}
                                                        className="p-3 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                                                        style={{ color: 'rgba(187, 10, 33, 0.6)' }}
                                                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(187, 10, 33, 0.1)')}
                                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(211, 212, 217, 0.6)' }}>
                                            {dev.content.length > 300 ? dev.content.slice(0, 300) + '...' : dev.content}
                                        </p>
                                        {dev.is_group && dev.group && (
                                            <button
                                                onClick={() => { setActiveChatGroupId(dev.group!.id); setView('chat'); }}
                                                className="mt-4 w-full py-3 rounded-xl text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                                                style={{ background: 'rgba(75, 136, 162, 0.1)', border: '1px solid rgba(75, 136, 162, 0.15)', color: '#4B88A2' }}
                                            >
                                                <MessageCircle size={14} /> Abrir Chat do Grupo
                                            </button>
                                        )}
                                    </motion.div>
                                ))
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
