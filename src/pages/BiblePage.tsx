import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
    ArrowLeft,
    Settings,
    ChevronRight,
    Home as HomeIcon,
    CheckCircle2,
    Bookmark,
    Lightbulb,
    Search,
    BookOpen,
    ChevronLeft,
    ChevronDown
} from 'lucide-react';
import { bibleApi } from '../services/api/bibleApi';
import { chapterInsights } from '../services/bible/chapterInsights';
import { getChapterTitle } from '../services/bible/chapterTitles';
import { STATIC_BOOKS } from '../services/bible/staticBibleData';
import { Chapter, Book } from '../types';
import { statsService } from '../services/features/statsService';
import { cn } from '../lib/utils';
import { Loading } from '../components/Loading';

const BiblePage: React.FC = () => {
    const { book, chapter } = useParams<{ book?: string; chapter?: string }>();
    const navigate = useNavigate();

    const [books] = useState<Book[]>(STATIC_BOOKS);
    const [selectedBook, setSelectedBook] = useState<Book | null>(null);
    const [chapterData, setChapterData] = useState<Chapter | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [fontSize, setFontSize] = useState(20);
    const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'mono'>('serif');
    const [showInsights, setShowInsights] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [versions, setVersions] = useState<any[]>([]);
    const [currentVersion, setCurrentVersion] = useState<string>(() => localStorage.getItem('bible_version') || 'nvi');
    const [showVersions, setShowVersions] = useState(false);

    const [selectedVerseForStudy, setSelectedVerseForStudy] = useState<{ number: number; text: string } | null>(null);
    const [isExegesisOpen, setIsExegesisOpen] = useState(false);

    const chapterNum = chapter ? parseInt(chapter) : null;
    const bookAbbrev = book?.toLowerCase() || null;

    useEffect(() => {
        bibleApi.getVersions().then(v => {
            if (v && v.length > 0) {
                setVersions(v);
                const savedVersion = localStorage.getItem('bible_version');
                const isValid = v.some((x: any) => x.version === savedVersion);
                if (!isValid) {
                    localStorage.setItem('bible_version', 'nvi');
                    setCurrentVersion('nvi');
                }
            }
        });
    }, []);

    useEffect(() => {
        if (bookAbbrev) {
            const found = STATIC_BOOKS.find(b =>
                b.abbrev.pt === bookAbbrev || b.abbrev.en === bookAbbrev
            );
            setSelectedBook(found || null);
        } else {
            setSelectedBook(null);
        }
    }, [bookAbbrev]);

    useEffect(() => {
        if (bookAbbrev && chapterNum) {
            loadChapter(bookAbbrev, chapterNum, currentVersion);
        } else {
            setChapterData(null);
        }
    }, [bookAbbrev, chapterNum, currentVersion]);

    const handleVersionChange = (version: string) => {
        setCurrentVersion(version);
        localStorage.setItem('bible_version', version);
        setShowVersions(false);
    };

    const loadChapter = async (b: string, c: number, v: string) => {
        setLoading(true);
        setError(null);
        setChapterData(null);
        try {
            const data = await bibleApi.getChapter(b, c, v);
            if (data && data.verses && data.verses.length > 0) {
                setChapterData(data);
            } else {
                setError('Capítulo não encontrado.');
            }
        } catch (err) {
            setError('Erro ao carregar o capítulo. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const filteredBooks = books.filter(b =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.abbrev.pt.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const testaments = {
        VT: filteredBooks.filter(b => b.testament === 'VT'),
        NT: filteredBooks.filter(b => b.testament === 'NT')
    };

    const insight = bookAbbrev && chapterNum ? chapterInsights.getInsight(bookAbbrev, chapterNum) : null;
    const chapterTitle = bookAbbrev && chapterNum ? getChapterTitle(bookAbbrev, chapterNum) : null;

    const navigateToChapter = (dir: 'next' | 'prev') => {
        if (!chapterNum || !bookAbbrev || !selectedBook) return;
        const newChapter = dir === 'next' ? chapterNum + 1 : chapterNum - 1;
        if (newChapter < 1 || newChapter > selectedBook.chapters) return;
        navigate(`/bible/${bookAbbrev}/${newChapter}`);
        window.scrollTo(0, 0);
    };

    const VersionSelector = () => (
        <div className="relative z-50">
            <button
                onClick={() => setShowVersions(!showVersions)}
                className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
                <span className="text-xs font-bold uppercase tracking-wider">{currentVersion}</span>
                <ChevronDown className="w-3 h-3 text-white/50" />
            </button>

            <AnimatePresence>
                {showVersions && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowVersions(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 top-full mt-2 w-48 bg-[var(--surface-4)] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 max-h-64 overflow-y-auto"
                        >
                            {versions.length > 0 ? versions.map(v => (
                                <button
                                    key={v.version}
                                    onClick={() => handleVersionChange(v.version)}
                                    className={cn(
                                        "w-full text-left px-4 py-3 text-sm transition-colors border-b border-white/5 last:border-0",
                                        currentVersion === v.version ? "bg-white/10 font-bold" : "hover:bg-white/5 font-medium text-white/70"
                                    )}
                                >
                                    <div className="uppercase text-xs font-bold tracking-widest text-white">{v.version}</div>
                                    <div className="text-[10px] text-white/40 truncate mt-0.5">{v.name || 'Nova Versão'}</div>
                                </button>
                            )) : (
                                <div className="px-4 py-3 text-xs text-white/50 text-center">Carregando versões...</div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );

    const Header = ({ children }: { children?: React.ReactNode }) => (
        <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/5 px-6 py-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
                {children}
            </div>
        </header>
    );

    if (!bookAbbrev) {
        return (
            <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black">
                <Header>
                    <div className="flex items-center gap-4">
                        <Link to="/dashboard" className="p-2 hover:bg-white/5 rounded-full transition-colors">
                            <HomeIcon className="w-5 h-5" />
                        </Link>
                        <h1 className="text-xl font-bold tracking-tight">Bíblia Sagrada</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative w-48 hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Pesquisar livro..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 focus:outline-none focus:border-white/30 transition-all text-xs"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <VersionSelector />
                    </div>
                </Header>

                <div className="max-w-4xl mx-auto px-6 pt-28 pb-24">
                    <div className="space-y-16">
                        {[
                            { label: 'Velho Testamento', books: testaments.VT },
                            { label: 'Novo Testamento', books: testaments.NT }
                        ].map(({ label, books: sectionBooks }) => (
                            <section key={label}>
                                <div className="flex items-center gap-4 mb-6">
                                    <h2 className="text-[10px] font-black tracking-[0.3em] text-white/30 uppercase">{label}</h2>
                                    <div className="flex-1 h-px bg-white/5" />
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {sectionBooks.map(b => (
                                        <Link
                                            key={b.abbrev.pt}
                                            to={`/bible/${b.abbrev.pt}`}
                                            className="group p-4 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/[0.07] hover:border-white/15 transition-all active:scale-95"
                                        >
                                            <p className="text-base font-bold group-hover:text-white transition-colors">{b.name}</p>
                                            <p className="text-[10px] text-white/25 font-bold uppercase tracking-widest mt-1">{b.chapters} Cap.</p>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (bookAbbrev && !chapterNum) {
        return (
            <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black">
                <Header>
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/bible')} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h2 className="text-lg font-bold tracking-tight">{selectedBook?.name}</h2>
                            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">{selectedBook?.chapters} Capítulos</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <VersionSelector />
                        <Link to="/dashboard" className="p-2 hover:bg-white/5 rounded-full transition-colors hidden sm:block">
                            <HomeIcon className="w-5 h-5" />
                        </Link>
                    </div>
                </Header>

                <div className="max-w-2xl mx-auto px-6 pt-28 pb-24">
                    {selectedBook?.description && (
                        <p className="text-white/30 text-sm font-light leading-relaxed mb-10 italic">{selectedBook.description}</p>
                    )}
                    <div className="grid grid-cols-5 sm:grid-cols-7 gap-2.5">
                        {Array.from({ length: selectedBook?.chapters || 0 }, (_, i) => i + 1).map(c => {
                            const isRead = statsService.isChapterRead(bookAbbrev, c);
                            return (
                                <Link
                                    key={c}
                                    to={`/bible/${bookAbbrev}/${c}`}
                                    className={cn(
                                        "aspect-square flex items-center justify-center rounded-xl font-bold text-sm transition-all active:scale-95",
                                        isRead
                                            ? "bg-white text-black"
                                            : "bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-white/20"
                                    )}
                                >
                                    {isRead ? <CheckCircle2 size={16} /> : c}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-white/20 selection:text-white">
            <Header>
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(`/bible/${bookAbbrev}`)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-base font-bold flex items-center gap-2">
                            {selectedBook?.name} {chapterNum}
                            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/60 uppercase">{currentVersion}</span>
                        </h2>
                        {chapterTitle && <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{chapterTitle}</p>}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <VersionSelector />
                    <button onClick={() => navigateToChapter('prev')} disabled={chapterNum === 1} className="p-2 hover:bg-white/5 rounded-full transition-colors disabled:opacity-20 hidden sm:block">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={() => navigateToChapter('next')} disabled={chapterNum === selectedBook?.chapters} className="p-2 hover:bg-white/5 rounded-full transition-colors disabled:opacity-20 hidden sm:block">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-white/5 rounded-full transition-colors ml-1">
                        <Settings className="w-5 h-5 text-white/60" />
                    </button>
                </div>
            </Header>

            <AnimatePresence>
                {showSettings && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowSettings(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
                        />
                        <motion.div
                            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            className="fixed bottom-0 left-0 right-0 z-[70] bg-[var(--surface-2)] border-t border-white/10 rounded-t-3xl p-8 shadow-2xl"
                        >
                            <div className="max-w-sm mx-auto space-y-8">
                                <div>
                                    <h3 className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-4">Tamanho da Fonte</h3>
                                    <div className="flex items-center justify-between gap-3">
                                        {[16, 18, 20, 24, 28].map(size => (
                                            <button
                                                key={size}
                                                onClick={() => setFontSize(size)}
                                                className={cn(
                                                    "flex-1 py-3 rounded-xl border font-bold text-sm transition-all",
                                                    fontSize === size ? "bg-white text-black border-white" : "bg-white/5 border-white/10"
                                                )}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-4">Estilo</h3>
                                    <div className="grid grid-cols-3 gap-3">
                                        {(['sans', 'serif', 'mono'] as const).map(font => (
                                            <button
                                                key={font}
                                                onClick={() => setFontFamily(font)}
                                                className={cn(
                                                    "py-3 px-4 rounded-xl border font-bold capitalize transition-all",
                                                    fontFamily === font ? "bg-white text-black border-white" : "bg-white/5 border-white/10"
                                                )}
                                            >
                                                {font}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <main className="max-w-2xl mx-auto px-6 pt-28 pb-40">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-48">
                        <Loading fullScreen={false} />
                    </div>
                ) : error ? (
                    <div className="bg-white/5 border border-white/10 p-10 rounded-3xl text-center">
                        <p className="text-white/60 font-bold text-lg mb-6">{error}</p>
                        <button
                            onClick={() => loadChapter(bookAbbrev!, chapterNum!, currentVersion)}
                            className="bg-white text-black px-8 py-3 rounded-2xl font-bold text-sm"
                        >
                            Tentar novamente
                        </button>
                    </div>
                ) : chapterData ? (
                    <motion.article
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                            "space-y-1",
                            fontFamily === 'sans' && "font-sans",
                            fontFamily === 'serif' && "font-serif",
                            fontFamily === 'mono' && "font-mono"
                        )}
                        style={{ fontSize: `${fontSize}px`, lineHeight: 2 }}
                    >
                        <div className="text-center mb-12">
                            <span className="text-[10px] font-black tracking-[0.4em] text-white/20 uppercase">{selectedBook?.name}</span>
                            <h1 className="text-8xl font-black opacity-10 tracking-tighter mt-1">{chapterNum}</h1>
                        </div>

                        {insight && (
                            <div
                                className="bg-white/[0.03] border border-white/[0.06] rounded-3xl overflow-hidden mb-10 cursor-pointer"
                                onClick={() => setShowInsights(!showInsights)}
                            >
                                <div className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center">
                                                <Lightbulb className="w-4 h-4 text-white/60" />
                                            </div>
                                            <h4 className="text-sm font-bold">Resumo do Capítulo</h4>
                                        </div>
                                        <ChevronRight className={cn("w-5 h-5 text-white/20 transition-transform", showInsights && "rotate-90")} />
                                    </div>
                                    <AnimatePresence>
                                        {showInsights && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="space-y-4 pt-5 mt-5 border-t border-white/5 overflow-hidden"
                                            >
                                                <p className="text-white/40 italic text-base leading-relaxed">{insight.summary}</p>
                                                <div className="space-y-2">
                                                    <h5 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Aplicação</h5>
                                                    {insight.practicalApplication.map((app, i) => (
                                                        <div key={i} className="flex gap-3">
                                                            <div className="w-1 h-1 rounded-full bg-white/30 mt-3 flex-shrink-0" />
                                                            <p className="text-white/40 text-sm">{app}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4 pl-10 pr-4 md:pr-0">
                            {chapterData.verses.map(v => (
                                <div key={v.number} className="group relative flex items-start gap-4">
                                    <div className="flex-1 relative">
                                        <span className="absolute -left-10 top-1 text-xs font-black text-white/15 tabular-nums select-none">{v.number}</span>
                                        <p className="inline leading-relaxed text-white/80">
                                            {v.number === 1 && (
                                                <span className="text-5xl font-bold float-left mr-3 mt-1 leading-[0.9] text-white">{v.text.charAt(0)}</span>
                                            )}
                                            {v.number === 1 ? v.text.slice(1) : v.text}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-4 pt-20">
                            <button
                                onClick={() => navigateToChapter('prev')}
                                disabled={chapterNum === 1}
                                className="flex-1 bg-white/[0.03] border border-white/5 p-6 rounded-3xl hover:bg-white/[0.07] transition-all text-left disabled:opacity-20"
                            >
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Anterior</p>
                                <p className="text-base font-bold">← Cap. {chapterNum! - 1}</p>
                            </button>
                            <button
                                onClick={() => navigateToChapter('next')}
                                disabled={chapterNum === selectedBook?.chapters}
                                className="flex-1 bg-white/[0.03] border border-white/5 p-6 rounded-3xl hover:bg-white/[0.07] transition-all text-right disabled:opacity-20"
                            >
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Próximo</p>
                                <p className="text-base font-bold">Cap. {chapterNum! + 1} →</p>
                            </button>
                        </div>
                    </motion.article>
                ) : null}
            </main>

            {!loading && !error && chapterData && (
                <div className={cn(
                    "fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-300",
                    isExegesisOpen && "opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto md:-translate-x-[calc(50%+225px)]"
                )}>
                    <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl p-1.5 flex items-center gap-1.5 shadow-2xl">
                        <button
                            onClick={async () => {
                                if (bookAbbrev && chapterNum) {
                                    await statsService.toggleChapterRead(bookAbbrev, chapterNum);
                                    const nextCh = chapterNum + 1;
                                    if (nextCh <= (selectedBook?.chapters || 1)) {
                                        navigate(`/bible/${bookAbbrev}/${nextCh}`);
                                    }
                                }
                            }}
                            className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            Marcar como Lido
                        </button>
                        <button className="p-3 hover:bg-white/10 rounded-xl transition-colors">
                            <Bookmark className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BiblePage;
