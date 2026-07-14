import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../contexts/ProfileContext';
import { ChevronRight, Users, Calendar, BookOpen, Shield, UserCheck } from 'lucide-react';
import MetanoiaStory from '../assets/MetanoiaStory.png';

const STEPS = [0, 1, 2];

export default function OnboardingFlow() {
    const navigate = useNavigate();
    const { updateProfile } = useProfile();
    const [step, setStep] = useState(0);
    const [role, setRole] = useState<'leader' | 'member' | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleNext = () => {
        if (step < 2) {
            setStep(step + 1);
        }
    };

    const handleComplete = async () => {
        if (!role) return;
        setIsSaving(true);
        try {
            await updateProfile({
                role,
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
        <div className="h-screen flex items-center justify-center overflow-hidden" style={{ background: '#252627' }}>
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 40%, rgba(75, 136, 162, 0.06) 0%, transparent 70%)' }} />
            </div>

            <div className="relative z-10 w-full max-w-lg mx-auto px-6">
                <div className="flex items-center justify-center gap-2 mb-12">
                    {STEPS.map((s) => (
                        <div
                            key={s}
                            className="h-1 rounded-full transition-all duration-500"
                            style={{
                                width: s === step ? '40px' : '12px',
                                background: s <= step ? '#4B88A2' : 'rgba(211, 212, 217, 0.15)',
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
                                    style={{ color: '#FFF9FB' }}
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    Bem-Vindo(a) Ao
                                </motion.h1>
                                <motion.h1
                                    className="text-6xl md:text-7xl font-outfit font-extrabold tracking-tight mb-8"
                                    style={{ color: '#4B88A2' }}
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    MetanoiaApp
                                </motion.h1>
                                <motion.p
                                    className="text-base leading-relaxed max-w-sm"
                                    style={{ color: '#D3D4D9' }}
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
                                    style={{ color: '#FFF9FB' }}
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    O que você pode fazer
                                </motion.h2>
                                <motion.p
                                    className="text-xs text-center mb-10"
                                    style={{ color: '#D3D4D9' }}
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
                                            style={{ background: 'rgba(75, 136, 162, 0.08)', border: '1px solid rgba(75, 136, 162, 0.15)' }}
                                            initial={{ x: 40, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            transition={{ delay: 0.3 + i * 0.1 }}
                                        >
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(75, 136, 162, 0.2)' }}>
                                                <item.icon size={20} style={{ color: '#4B88A2' }} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm mb-1" style={{ color: '#FFF9FB' }}>{item.title}</h4>
                                                <p className="text-xs" style={{ color: '#D3D4D9' }}>{item.desc}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                custom={1}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                className="flex flex-col items-center"
                            >
                                <motion.h2
                                    className="text-3xl font-outfit font-extrabold tracking-tight mb-2 text-center"
                                    style={{ color: '#FFF9FB' }}
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    Você é líder ou liderado?
                                </motion.h2>
                                <motion.p
                                    className="text-xs text-center mb-10"
                                    style={{ color: '#D3D4D9' }}
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    Isso define suas permissões no app
                                </motion.p>

                                <div className="grid grid-cols-2 gap-4 w-full">
                                    <motion.button
                                        onClick={() => setRole('leader')}
                                        className="flex flex-col items-center gap-4 p-8 rounded-3xl transition-all"
                                        style={{
                                            background: role === 'leader' ? 'rgba(75, 136, 162, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                            border: role === 'leader' ? '2px solid #4B88A2' : '2px solid rgba(255, 255, 255, 0.08)',
                                        }}
                                        initial={{ y: 30, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: role === 'leader' ? 'rgba(75, 136, 162, 0.3)' : 'rgba(255, 255, 255, 0.05)' }}>
                                            <Shield size={24} style={{ color: role === 'leader' ? '#4B88A2' : '#D3D4D9' }} />
                                        </div>
                                        <span className="font-bold text-sm" style={{ color: role === 'leader' ? '#FFF9FB' : '#D3D4D9' }}>Líder</span>
                                        <span className="text-[10px] text-center" style={{ color: 'rgba(211, 212, 217, 0.5)' }}>Posta e gerencia eventos</span>
                                    </motion.button>

                                    <motion.button
                                        onClick={() => setRole('member')}
                                        className="flex flex-col items-center gap-4 p-8 rounded-3xl transition-all"
                                        style={{
                                            background: role === 'member' ? 'rgba(75, 136, 162, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                            border: role === 'member' ? '2px solid #4B88A2' : '2px solid rgba(255, 255, 255, 0.08)',
                                        }}
                                        initial={{ y: 30, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.4 }}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: role === 'member' ? 'rgba(75, 136, 162, 0.3)' : 'rgba(255, 255, 255, 0.05)' }}>
                                            <UserCheck size={24} style={{ color: role === 'member' ? '#4B88A2' : '#D3D4D9' }} />
                                        </div>
                                        <span className="font-bold text-sm" style={{ color: role === 'member' ? '#FFF9FB' : '#D3D4D9' }}>Liderado</span>
                                        <span className="text-[10px] text-center" style={{ color: 'rgba(211, 212, 217, 0.5)' }}>Acompanha e participa</span>
                                    </motion.button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="mt-12 flex justify-center">
                    {step < 2 ? (
                        <motion.button
                            onClick={handleNext}
                            className="flex items-center gap-3 px-10 py-4 rounded-2xl font-bold text-sm tracking-wider uppercase text-white transition-all"
                            style={{ background: '#BB0A21', boxShadow: '0 10px 30px -10px rgba(187, 10, 33, 0.5)' }}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                        >
                            Continuar
                            <ChevronRight size={18} />
                        </motion.button>
                    ) : (
                        <motion.button
                            onClick={handleComplete}
                            disabled={!role || isSaving}
                            className="flex items-center gap-3 px-10 py-4 rounded-2xl font-bold text-sm tracking-wider uppercase text-white transition-all disabled:opacity-30 disabled:pointer-events-none"
                            style={{ background: '#BB0A21', boxShadow: '0 10px 30px -10px rgba(187, 10, 33, 0.5)' }}
                            whileHover={role ? { scale: 1.03 } : {}}
                            whileTap={role ? { scale: 0.97 } : {}}
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
