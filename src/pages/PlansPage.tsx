import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    ArrowLeft,
    BookOpen,
    ChevronRight,
    Plus,
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
        <div className="min-h-screen bg-black text-white p-6 md:p-12 selection:bg-white selection:text-black">
            <div className="max-w-4xl mx-auto">
                <header className="flex items-center justify-between mb-16">
                    <div className="flex items-center gap-4 md:gap-12">
                        <button onClick={() => navigate('/dashboard')} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all">
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <span className="text-[10px] font-bold tracking-[0.5em] text-white/20 uppercase">Jornadas Espirituais</span>
                            <h1 className="text-3xl sm:text-5xl font-serif italic tracking-tight">Meus Planos</h1>
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
                            <div className="p-4 bg-white/10 border border-white/20 rounded-2xl text-white flex items-center gap-3 text-sm font-bold">
                                <CheckCircle2 size={18} /> {successMessage}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="space-y-12">
                    <section>
                        <h3 className="text-xs font-black tracking-[0.3em] text-white/30 uppercase mb-8 flex items-center gap-4">
                            Planos Ativos
                            <div className="flex-1 h-px bg-white/5" />
                        </h3>

                        <div className="grid grid-cols-1 gap-4">
                            {activePlans.length === 0 ? (
                                <div className="p-12 border-2 border-dashed border-white/5 rounded-[2.5rem] text-center">
                                    <BookOpen className="mx-auto text-white/10 mb-4" size={48} />
                                    <p className="text-white/40 font-medium">Você ainda não iniciou nenhum plano.</p>
                                </div>
                            ) : (
                                activePlans.map(up => {
                                    const plan = STATIC_PLANS.find(p => p.id === up.planId) || plansService.getCustomPlans().find(p => p.id === up.planId);
                                    if (!plan) return null;
                                    const progress = plansService.getPlanProgress(plan.id);

                                    return (
                                        <motion.div
                                            key={up.planId}
                                            layout
                                            className="p-6 bg-white/[0.03] border border-white/10 rounded-[2rem] group cursor-pointer hover:bg-white/[0.08] transition-all duration-300 hover:shadow-[0_8px_30px_rgba(255,255,255,0.04)] hover:-translate-y-1"
                                            onClick={() => navigate(`/plans/${plan.id}`)}
                                        >
                                            <div className="flex items-center gap-6">
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="text-xl font-serif">{plan.title}</h4>
                                                        <span className="text-[10px] font-black tracking-widest text-white/20 uppercase">{progress}% concluído</span>
                                                    </div>
                                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${progress}%` }}
                                                            className="h-full bg-white"
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setShowConfirmDelete(plan.id); }}
                                                    className="p-3 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                                <div className="p-3 bg-white text-black rounded-xl hover:scale-110 active:scale-95 transition-all">
                                                    <ChevronRight size={18} />
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                        </div>
                    </section>

                    <section>
                        <h3 className="text-xs font-black tracking-[0.3em] text-white/30 uppercase mb-8 flex items-center gap-4">
                            Descobrir Planos
                            <div className="flex-1 h-px bg-white/5" />
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[...STATIC_PLANS, ...customPlans].filter(p => !isPlanActive(p.id)).map(plan => (
                                <motion.div
                                    key={plan.id}
                                    whileHover={{ y: -5 }}
                                    className="p-8 bg-white/[0.03] border border-white/10 rounded-[2.5rem] flex flex-col justify-between group relative hover:bg-white/[0.05] transition-all duration-300 hover:shadow-[0_10px_40px_-10px_rgba(255,255,255,0.1)] hover:-translate-y-1"
                                >
                                    {plan.category === 'ai' && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowConfirmDelete(plan.id); }}
                                            className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all opacity-0 group-hover:opacity-100 z-10"
                                            title="Excluir plano"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                    <div>
                                        <div className="flex items-start justify-between gap-4 mb-3">
                                            <h4 className="text-2xl font-serif tracking-tight">{plan.title}</h4>
                                            <span className="px-3 py-1 bg-white/5 rounded-full text-[8px] font-black tracking-widest uppercase border border-white/5 text-white/40 shrink-0 mt-2">
                                                {plan.durationDays} DIAS
                                            </span>
                                        </div>
                                        <p className="text-white/40 text-sm italic opacity-80">{plan.description}</p>
                                    </div>
                                    <div className="mt-8">
                                        <button
                                            onClick={() => handleJoin(plan.id)}
                                            className="w-full py-4 bg-white/5 hover:bg-white text-white hover:text-black border border-white/10 rounded-2xl font-bold text-xs tracking-widest transition-all uppercase"
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
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#111] border border-white/10 p-10 rounded-[3rem] max-w-sm w-full relative z-10 text-center"
                        >
                            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <Trash2 size={28} />
                            </div>
                            <h3 className="text-2xl font-bold mb-4">Remover Plano?</h3>
                            <p className="text-white/40 text-sm mb-8 leading-relaxed">Isso irá apagar todo o seu progresso neste plano. Esta ação não pode ser desfeita.</p>
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => setShowConfirmDelete(null)} className="py-4 bg-white/5 rounded-2xl font-bold text-sm">
                                    CANCELAR
                                </button>
                                <button onClick={() => handleDelete(showConfirmDelete)} className="py-4 bg-red-600 rounded-2xl font-bold text-sm">
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
