import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../contexts/ProfileContext';
import { ChevronRight, Users, Calendar, BookOpen } from 'lucide-react';
import MetanoiaStory from '../assets/MetanoiaStory.png';

const STEPS = [0, 1];

export default function OnboardingFlow() {
    const navigate = useNavigate();
    const { updateProfile } = useProfile();
    const [step, setStep] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    const handleNext = () => {
        if (step < 1) {
            setStep(step + 1);
        }
    };

    const handleComplete = async () => {
        setIsSaving(true);
        try {
            await updateProfile({
                role: 'member',
                onboarding_completed: true,
            });
            navigate('/dashboard', { replace: true });
        } catch (err) {
            console.error('Error completing onboarding:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const slideVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 400 : -400,
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
        },
        exit: (direction: number) => ({
            x: direction > 0 ? -400 : 400,
            opacity: 0,
        }),
    };

    return (
        <div className="h-screen flex items-center justify-center overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 40%, var(--bg-muted) 0%, transparent 70%)' }} />
            </div>

            <div className="relative z-10 w-full max-w-lg mx-auto px-6">
                <div className="flex items-center justify-center gap-2 mb-12">
                    {STEPS.map((s) => (
                        <div
                            key={s}
                            className="h-1 rounded-full transition-all duration-500"
                            style={{
                                width: s === step ? '40px' : '12px',
                                background: s <= step ? 'var(--accent-solid)' : 'var(--text-muted)',
                            }}
                        />
                    ))}
                </div>

                <div className="relative overflow-hidden flex items-center justify-center" style={{ minHeight: '400px' }}>
                    <AnimatePresence mode="wait" custom={1}>
                        {step === 0 && (
                            <motion.div
                                key="step0"
                                custom={1}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                className="flex flex-col items-center text-center"
                            >
                                <motion.h1
                                    className="text-5xl md:text-6xl font-outfit font-extrabold tracking-tight mb-4"
                                    style={{ color: 'var(--text-primary)' }}
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    Bem-Vindo(a) Ao
                                </motion.h1>
                                <motion.h1
                                    className="text-6xl md:text-7xl font-outfit font-extrabold tracking-tight mb-8"
                                    style={{ color: 'var(--accent-solid)' }}
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    MetanoiaApp
                                </motion.h1>
                                <motion.p
                                    className="text-base leading-relaxed max-w-sm"
                                    style={{ color: 'var(--text-secondary)' }}
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    Esse É O Site Oficial Do Metanoia, Grupo De Jovens Da Primeira Igreja Batista De Campo Mourão
                                </motion.p>
                            </motion.div>
                        )}

                        {step === 1 && (
                            <motion.div
                                key="step1"
                                custom={1}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                className="flex flex-col"
                            >
                                <motion.h2
                                    className="text-3xl font-outfit font-extrabold tracking-tight mb-2 text-center"
                                    style={{ color: 'var(--text-primary)' }}
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    O que você pode fazer
                                </motion.h2>
                                <motion.p
                                    className="text-xs text-center mb-10"
                                    style={{ color: 'var(--text-secondary)' }}
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    Conheça as funcionalidades do app
                                </motion.p>

                                <div className="space-y-4">
                                    {[
                                        {
                                            icon: Users,
                                            title: 'Devocionais em dupla ou grupo',
                                            desc: 'Procure pelo @ do usuário e crie devocionais compartilhados',
                                        },
                                        {
                                            icon: Calendar,
                                            title: 'Mural de eventos',
                                            desc: 'Líderes postam encontros com data, local e hora',
                                        },
                                        {
                                            icon: BookOpen,
                                            title: 'Oração e planos bíblicos',
                                            desc: 'Organize sua jornada espiritual com planos de estudo',
                                        },
                                    ].map((item, i) => (
                                        <motion.div
                                            key={i}
                                            className="flex items-start gap-4 p-5 rounded-2xl"
                                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-strong)' }}
                                            initial={{ x: 40, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            transition={{ delay: 0.3 + i * 0.1 }}
                                        >
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)' }}>
                                                <item.icon size={20} style={{ color: 'var(--accent-solid)' }} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{item.title}</h4>
                                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.desc}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="mt-12 flex justify-center">
                    {step < 1 ? (
                        <motion.button
                            onClick={handleNext}
                            className="flex items-center gap-3 px-10 py-4 rounded-2xl font-bold text-sm tracking-wider uppercase text-[var(--text-on-accent)] transition-all"
                            style={{ background: 'var(--accent-solid)', boxShadow: '0 10px 30px -10px rgba(255, 255, 255, 0.15)' }}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                        >
                            Continuar
                            <ChevronRight size={18} />
                        </motion.button>
                    ) : (
                        <motion.button
                            onClick={handleComplete}
                            disabled={isSaving}
                            className="flex items-center gap-3 px-10 py-4 rounded-2xl font-bold text-sm tracking-wider uppercase text-[var(--text-on-accent)] transition-all disabled:opacity-30 disabled:pointer-events-none"
                            style={{ background: 'var(--accent-solid)', boxShadow: '0 10px 30px -10px rgba(255, 255, 255, 0.15)' }}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                        >
                            {isSaving ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Começar
                                    <ChevronRight size={18} />
                                </>
                            )}
                        </motion.button>
                    )}
                </div>
            </div>
        </div>
    );
}
