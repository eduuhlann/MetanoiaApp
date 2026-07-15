import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    ArrowLeft,
    Sparkles,
    BookOpen,
    ChevronRight,
    CheckCircle2,
    Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { plansService, STATIC_PLANS, Plan, UserPlan } from '../services/features/plansService';
import PageTransition from '../components/PageTransition';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const PlansPage: React.FC = () => {
    const navigate = useNavigate();
    const [activePlans, setActivePlans] = useState<UserPlan[]>([]);
    const [customPlans, setCustomPlans] = useState<Plan[]>([]);
    const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const refreshData = () => {
        setActivePlans(plansService.getActivePlans());
        setCustomPlans(plansService.getCustomPlans());
    };

    useEffect(() => {
        refreshData();
    }, []);

    const handleJoin = (planId: string) => {
        plansService.joinPlan(planId);
        refreshData();
        const plan = [...STATIC_PLANS, ...customPlans].find(p => p.id === planId);
        setSuccessMessage(`Você iniciou o plano: ${plan?.title}`);
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const handleDelete = (planId: string) => {
        if (plansService.getCustomPlans().some(p => p.id === planId)) {
            plansService.deleteCustomPlan(planId);
        } else {
            plansService.leavePlan(planId);
        }
        refreshData();
        setShowConfirmDelete(null);
    };

    const isPlanActive = (planId: string) => activePlans.some(p => p.planId === planId);

    return (
        <PageTransition>
        <div className="min-h-screen text-white p-6 md:p-12 selection:bg-[#4B88A2]/30 selection:text-white" style={{ background: '#252627' }}>
            <div className="max-w-4xl mx-auto">
                <header className="flex items-center justify-between mb-16">
                    <div className="flex items-center gap-4 md:gap-12">
                        <button onClick={() => navigate('/dashboard')} className="p-3 rounded-2xl transition-all" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <span className="text-[10px] font-bold tracking-[0.5em] uppercase" style={{ color: 'rgba(211, 212, 217, 0.4)' }}>Jornadas Espirituais</span>
                            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">Meus Planos</h1>
                        </div>
                    </div>
                </header>

                <AnimatePresence>
                    {successMessage && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-8"
                        >
                            <div className="p-4 border rounded-2xl text-white flex items-center gap-3 text-sm font-bold" style={{ background: 'rgba(75, 136, 162, 0.1)', borderColor: 'rgba(75, 136, 162, 0.2)' }}>
                                <CheckCircle2 size={18} style={{ color: '#4B88A2' }} /> {successMessage}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* AI Plan Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-8 rounded-[2.5rem] text-white mb-12 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group transition-all duration-300"
                    style={{ background: 'rgba(75, 136, 162, 0.08)', border: '1px solid rgba(75, 136, 162, 0.15)' }}
                >
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles size={18} style={{ color: '#4B88A2' }} />
                            <span className="text-[10px] font-bold tracking-[0.3em] uppercase" style={{ color: 'rgba(75, 136, 162, 0.6)' }}>Novo</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight">Plano Personalizado com IA</h2>
                        <p className="text-sm font-medium leading-relaxed" style={{ color: 'rgba(211, 212, 217, 0.5)' }}>Deixe a nossa IA criar uma trilha de estudo única baseada no seu momento de vida e necessidades espirituais.</p>
                    </div>
                    <button
                        onClick={() => navigate('/plans/ai-generator')}
                        className="px-8 py-4 rounded-2xl font-black text-xs tracking-widest hover:scale-105 active:scale-95 transition-all whitespace-nowrap uppercase"
                        style={{ background: '#4B88A2', color: '#fff' }}
                    >
                        CRIAR AGORA
                    </button>
                </motion.div>

                <div className="space-y-12">
                    <section>
                        <h3 className="text-xs font-black tracking-[0.3em] uppercase mb-8 flex items-center gap-4" style={{ color: 'rgba(211, 212, 217, 0.3)' }}>
                            Planos Ativos
                            <div className="flex-1 h-px" style={{ background: 'rgba(75, 136, 162, 0.1)' }} />
                        </h3>

                        <div className="grid grid-cols-1 gap-4">
                            {activePlans.length === 0 ? (
                                <div className="p-12 border-2 border-dashed rounded-[2.5rem] text-center" style={{ borderColor: 'rgba(75, 136, 162, 0.1)' }}>
                                    <BookOpen className="mx-auto mb-4" size={48} style={{ color: 'rgba(75, 136, 162, 0.15)' }} />
                                    <p style={{ color: 'rgba(211, 212, 217, 0.4)' }}>Você ainda não iniciou nenhum plano.</p>
                                </div>
                            ) : (
                                activePlans.map(up => {
                                    const plan = STATIC_PLANS.find(p => p.id === up.planId) || plansService.getCustomPlans().find(p => p.id === up.planId);
                                    if (!plan) return null;
                                    const prog = plansService.getPlanProgress(plan.id);

                                    return (
                                        <motion.div
                                            key={up.planId}
                                            layout
                                            className="p-6 border rounded-[2rem] group cursor-pointer transition-all duration-300 hover:-translate-y-1"
                                            style={{ background: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(75, 136, 162, 0.1)' }}
                                            onClick={() => navigate(`/plans/${plan.id}`)}
                                        >
                                            <div className="flex items-center gap-6">
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="text-xl font-bold">{plan.title}</h4>
                                                        <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: 'rgba(75, 136, 162, 0.5)' }}>{prog}% concluído</span>
                                                    </div>
                                                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${prog}%` }}
                                                            className="h-full rounded-full"
                                                            style={{ background: '#4B88A2' }}
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setShowConfirmDelete(plan.id); }}
                                                    className="p-3 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                                                    style={{ color: 'rgba(211, 212, 217, 0.3)' }}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                                <div className="p-3 rounded-xl hover:scale-110 active:scale-95 transition-all" style={{ background: 'rgba(75, 136, 162, 0.2)' }}>
                                                    <ChevronRight size={18} style={{ color: '#4B88A2' }} />
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                        </div>
                    </section>

                    <section>
                        <h3 className="text-xs font-black tracking-[0.3em] uppercase mb-8 flex items-center gap-4" style={{ color: 'rgba(211, 212, 217, 0.3)' }}>
                            Descobrir Planos
                            <div className="flex-1 h-px" style={{ background: 'rgba(75, 136, 162, 0.1)' }} />
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[...STATIC_PLANS, ...customPlans].filter(p => !isPlanActive(p.id)).map(plan => (
                                <motion.div
                                    key={plan.id}
                                    whileHover={{ y: -5 }}
                                    className="p-8 border rounded-[2.5rem] flex flex-col justify-between group relative transition-all duration-300 hover:-translate-y-1"
                                    style={{ background: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(75, 136, 162, 0.1)' }}
                                >
                                    {plan.category === 'ai' && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowConfirmDelete(plan.id); }}
                                            className="absolute top-6 right-6 p-3 rounded-xl transition-all opacity-0 group-hover:opacity-100 z-10"
                                            style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                                            title="Excluir plano"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                    <div>
                                        <div className="flex items-start justify-between gap-4 mb-3">
                                            <h4 className="text-2xl font-bold tracking-tight">{plan.title}</h4>
                                            <span className="px-3 py-1 rounded-full text-[8px] font-black tracking-widest uppercase shrink-0 mt-2"
                                                style={{ background: 'rgba(75, 136, 162, 0.1)', border: '1px solid rgba(75, 136, 162, 0.15)', color: 'rgba(75, 136, 162, 0.6)' }}
                                            >
                                                {plan.durationDays} DIAS
                                            </span>
                                        </div>
                                        <p className="text-sm opacity-80" style={{ color: 'rgba(211, 212, 217, 0.5)' }}>{plan.description}</p>
                                    </div>
                                    <div className="mt-8">
                                        <button
                                            onClick={() => handleJoin(plan.id)}
                                            className="w-full py-4 rounded-2xl font-bold text-xs tracking-widest transition-all uppercase"
                                            style={{ background: 'rgba(75, 136, 162, 0.15)', border: '1px solid rgba(75, 136, 162, 0.2)', color: '#4B88A2' }}
                                        >
                                            Iniciar Plano
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>

            <AnimatePresence>
                {showConfirmDelete && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowConfirmDelete(null)}
                            className="absolute inset-0 backdrop-blur-sm"
                            style={{ background: 'rgba(0, 0, 0, 0.8)' }}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="border p-10 rounded-[3rem] max-w-sm w-full relative z-10 text-center"
                            style={{ background: '#1a1a1a', borderColor: 'rgba(75, 136, 162, 0.15)' }}
                        >
                            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(187, 10, 33, 0.1)', color: '#BB0A21' }}>
                                <Trash2 size={28} />
                            </div>
                            <h3 className="text-2xl font-bold mb-4">Remover Plano?</h3>
                            <p className="text-sm mb-8 leading-relaxed" style={{ color: 'rgba(211, 212, 217, 0.4)' }}>Isso irá apagar todo o seu progresso neste plano. Esta ação não pode ser desfeita.</p>
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => setShowConfirmDelete(null)} className="py-4 rounded-2xl font-bold text-sm" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                                    CANCELAR
                                </button>
                                <button onClick={() => handleDelete(showConfirmDelete)} className="py-4 rounded-2xl font-bold text-sm" style={{ background: '#BB0A21' }}>
                                    REMOVER
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
        </PageTransition>
    );
};

export default PlansPage;
