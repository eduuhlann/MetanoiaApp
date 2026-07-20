import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Play, Pause, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageTransition from '../components/PageTransition';

const PRESETS = [5, 10, 15, 20, 30, 45, 60];

const PrayerPage: React.FC = () => {
    const navigate = useNavigate();

    const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);
    const [customInput, setCustomInput] = useState('');
    const [timeLeft, setTimeLeft] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [started, setStarted] = useState(false);

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isActive && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && isActive) {
            setIsActive(false);
            if (timerRef.current) clearInterval(timerRef.current);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isActive, timeLeft]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStart = () => {
        const mins = selectedMinutes ?? parseInt(customInput);
        if (!mins || mins <= 0) return;
        setTimeLeft(mins * 60);
        setStarted(true);
        setIsActive(true);
    };

    const handleReset = () => {
        setIsActive(false);
        setStarted(false);
        setSelectedMinutes(null);
        setCustomInput('');
        setTimeLeft(0);
    };

    const progress = started && timeLeft > 0
        ? 1 - timeLeft / ((selectedMinutes ?? parseInt(customInput || '1')) * 60)
        : started ? 1 : 0;

    const isFinished = started && timeLeft === 0;

    return (
        <PageTransition>
        <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black flex flex-col">
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.04)_0%,transparent_70%)]" />
            </div>

            <header className="relative z-10 p-6 md:p-12">
                <button onClick={() => navigate('/dashboard')} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all md:-ml-10 flex items-center gap-3 group">
                    <ArrowLeft size={24} className="text-white/40 group-hover:text-white group-hover:-translate-x-1 transition-all" />
                    <span className="font-bold text-xs tracking-widest uppercase text-white/40 group-hover:text-white transition-colors">Voltar</span>
                </button>
            </header>

            <main className="flex-1 flex items-center justify-center relative z-10 px-6">
                <AnimatePresence mode="wait">
                    {!started ? (
                        <motion.div
                            key="picker"
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -16 }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                            className="flex flex-col items-center text-center w-full max-w-lg"
                        >
                            <span className="text-[10px] font-black tracking-[0.4em] text-white/20 uppercase mb-4">Tempo de Oração</span>
                            <h1 className="text-4xl sm:text-5xl font-black italic tracking-tighter mb-12">Quanto tempo?</h1>

                            <div className="grid grid-cols-4 gap-3 w-full mb-8">
                                {PRESETS.map(min => (
                                    <button
                                        key={min}
                                        onClick={() => { setSelectedMinutes(min); setCustomInput(''); }}
                                        className={`py-5 rounded-2xl font-black text-sm transition-all border ${
                                            selectedMinutes === min
                                                ? 'bg-white text-black border-white scale-105'
                                                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:border-white/20'
                                        }`}
                                    >
                                        {min}<span className="text-[10px] font-bold opacity-60 ml-0.5">min</span>
                                    </button>
                                ))}

                                <div className={`py-5 rounded-2xl border transition-all flex items-center justify-center gap-1 col-span-1 ${
                                    customInput ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10'
                                }`}>
                                    <input
                                        type="number"
                                        min="1"
                                        max="180"
                                        placeholder="?"
                                        value={customInput}
                                        onChange={e => { setCustomInput(e.target.value); setSelectedMinutes(null); }}
                                        className={`w-10 bg-transparent text-center font-black text-sm outline-none placeholder:text-white/20 ${
                                            customInput ? 'text-black' : 'text-white/60'
                                        }`}
                                    />
                                    <span className={`text-[10px] font-bold opacity-60 ${customInput ? 'text-black' : ''}`}>min</span>
                                </div>
                            </div>

                            <button
                                onClick={handleStart}
                                disabled={!selectedMinutes && !customInput}
                                className="w-full py-6 bg-white text-black rounded-[2rem] font-black text-xs tracking-[0.3em] uppercase flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 disabled:pointer-events-none"
                            >
                                <Play size={18} className="fill-black" />
                                Iniciar Oração
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="timer"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                            className="flex flex-col items-center text-center"
                        >
                            <div className="relative mb-10 w-full max-w-[320px]">
                                <svg viewBox="0 0 320 320" className="w-full rotate-[-90deg]">
                                    <circle cx="160" cy="160" r="140" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
                                    <circle
                                        cx="160" cy="160" r="140"
                                        fill="none"
                                        stroke="rgba(255,255,255,0.15)"
                                        strokeWidth="2"
                                        strokeDasharray={`${2 * Math.PI * 140}`}
                                        strokeDashoffset={`${2 * Math.PI * 140 * (1 - progress)}`}
                                        strokeLinecap="round"
                                        style={{ transition: 'stroke-dashoffset 1s linear' }}
                                    />
                                </svg>

                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <motion.div
                                        animate={{ scale: isActive ? [1, 1.015, 1] : 1 }}
                                        transition={{ repeat: Infinity, duration: 4 }}
                                    >
                                        <div className="text-[4rem] sm:text-[5.5rem] font-black tracking-tighter italic leading-none tabular-nums">
                                            {isFinished ? '✓' : formatTime(timeLeft)}
                                        </div>
                                    </motion.div>
                                    {isFinished && (
                                        <p className="text-white/40 text-xs font-bold tracking-widest uppercase mt-2">Concluído</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <button
                                    onClick={handleReset}
                                    className="p-5 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 transition-all active:scale-90"
                                >
                                    <RotateCcw className="w-7 h-7" />
                                </button>
                                {!isFinished && (
                                    <button
                                        onClick={() => setIsActive(!isActive)}
                                        className="w-20 h-20 bg-white text-black rounded-[1.75rem] flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-2xl shadow-white/10"
                                    >
                                        {isActive
                                            ? <Pause className="w-9 h-9 fill-black" />
                                            : <Play className="w-9 h-9 fill-black ml-1" />
                                        }
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            <footer className="p-12 text-center relative z-10">
                <p className="text-white/15 font-serif italic text-base select-none">
                    "Onde dois ou três estiverem reunidos em meu nome, ali eu estarei com eles."
                </p>
            </footer>
        </div>
        </PageTransition>
    );
};

export default PrayerPage;
