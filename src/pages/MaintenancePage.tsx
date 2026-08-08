import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Wrench, Home as HomeIcon, Clock } from 'lucide-react';

const MaintenancePage: React.FC = () => {
    return (
        <div className="min-h-dvh text-white flex items-center justify-center relative overflow-hidden font-sans" style={{ background: 'var(--bg-primary)' }}>
            <div className="absolute inset-0 opacity-20">
                <div className="w-80 h-80 rounded-full blur-3xl absolute top-1/3 left-1/2 -translate-x-1/2" style={{ background: 'var(--accent-soft)' }} />
            </div>

            <div className="relative z-10 px-6 text-center max-w-md">
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="w-20 h-20 mx-auto mb-8 rounded-full flex items-center justify-center animate-pulse" style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-hover)' }}>
                        <Wrench className="w-9 h-9" style={{ color: 'var(--accent-solid)' }} />
                    </div>

                    <p className="text-[10px] font-black tracking-[0.5em] uppercase mb-3" style={{ color: 'var(--text-muted)' }}>
                        Manutenção
                    </p>
                    <h1 className="text-3xl sm:text-4xl font-black italic tracking-tight mb-4">Em manutenção</h1>
                    <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--text-muted)' }}>
                        Estamos dando um polimento no Metanoia. A Bíblia continua lá em cima, mas a gente volta já já.
                    </p>

                    <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest mb-8" style={{ color: 'var(--text-secondary)' }}>
                        <Clock className="w-3.5 h-3.5" /> Volte em breve
                    </div>

                    <Link
                        to="/dashboard"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-[0.25em] transition-all hover:scale-[1.02]"
                        style={{ background: 'var(--accent-solid)', color: 'var(--text-on-accent)' }}
                    >
                        <HomeIcon className="w-4 h-4" /> Tentar acessar
                    </Link>
                </motion.div>
            </div>
        </div>
    );
};

export default MaintenancePage;
