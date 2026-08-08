import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Compass, Home as HomeIcon, BookOpen, Users } from 'lucide-react';

const NotFound: React.FC = () => {
    return (
        <div className="min-h-dvh text-white flex items-center justify-center relative overflow-hidden font-sans" style={{ background: 'var(--bg-primary)' }}>
            <div className="absolute inset-0 opacity-30">
                <div className="w-96 h-96 rounded-full blur-3xl absolute -top-20 -left-20" style={{ background: 'var(--accent-soft)' }} />
                <div className="w-96 h-96 rounded-full blur-3xl absolute -bottom-20 -right-20" style={{ background: 'var(--accent-hover)' }} />
            </div>

            <div className="relative z-10 px-6 text-center max-w-md">
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="w-20 h-20 mx-auto mb-8 rounded-[2rem] flex items-center justify-center" style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-hover)' }}>
                        <Compass className="w-9 h-9" style={{ color: 'var(--accent-solid)' }} />
                    </div>

                    <p className="text-[10px] font-black tracking-[0.5em] uppercase mb-3" style={{ color: 'var(--text-muted)' }}>
                        Erro 404
                    </p>
                    <h1 className="text-7xl font-black italic tracking-tighter mb-4">
                        4<span style={{ color: 'var(--accent-solid)' }}>0</span>4
                    </h1>
                    <p className="text-lg font-bold mb-2">Página não encontrada</p>
                    <p className="text-sm mb-10 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        Parece que você se perdeu no caminho. Mas lembre-se: às vezes é no deserto que Deus fala mais alto.
                    </p>

                    <div className="space-y-3">
                        <Link
                            to="/dashboard"
                            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.25em] transition-all hover:scale-[1.02] active:scale-[0.98]"
                            style={{ background: 'var(--accent-solid)', color: 'var(--text-on-accent)' }}
                        >
                            <HomeIcon className="w-4 h-4" /> Voltar ao início
                        </Link>
                        <div className="flex gap-3">
                            <Link
                                to="/bible"
                                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02]"
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                            >
                                <BookOpen className="w-4 h-4" /> Bíblia
                            </Link>
                            <Link
                                to="/feed"
                                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02]"
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                            >
                                <Users className="w-4 h-4" /> Membros
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default NotFound;
