import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    ArrowLeft,
    Sparkles,
    BookOpen,
    ChevronRight,
    CheckCircle2,
    Trash2,
    Calendar,
    Flame
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { plansService, STATIC_PLANS, Plan, UserPlan } from '../services/features/plansService';
import PageTransition from '../components/PageTransition';

const planIcons: Record<string, React.ReactNode> = {
    'bible-1-year': <BookOpen size={28} />,
    'new-testament-90': <Flame size={28} />,
};

const planAccents: Record<string, string> = {
    'bible-1-year': 'var(--accent-solid)',
    'new-testament-90': 'var(--accent-solid)',
};

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

    const getDaysElapsed = (startDate: number) => {
        return Math.floor((Date.now() - startDate) / (1000 * 60 * 60 * 24));
    };

    const getStreak = (planId: string) => {
        const userPlan = activePlans.find(p => p.planId === planId);
        if (!userPlan || userPlan.completedDays.length === 0) return 0;
        const sorted = [...userPlan.completedDays].sort((a, b) => b - a);
        const today = Math.floor((Date.now() - userPlan.startDate) / (1000 * 60 * 60 * 24)) + 1;
        let streak = 0;
        let currentDay = today;
        for (const day of sorted) {
            if (day === currentDay || day === currentDay - 1) {
                streak++;
                currentDay = day - 1;
            } else {
                break;
            }
        }
        return streak;
    };

    return (
        <PageTransition>
        <div className="min-h-screen text-white p-6 md:p-12 selection:bg-[var(--accent-soft)] selection:text-white" style={{ background: 'var(--bg-primary)' }}>
            <div className="max-w-4xl mx-auto">
                <header className="flex items-center gap-4 md:gap-12 mb-16">
                    <button onClick={() => navigate('/dashboard')} className="p-3 rounded-2xl transition-all hover:scale-105 active:scale-95" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <span className="text-[10px] font-bold tracking-[0.5em] uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>Jornadas Espirituais</span>
                        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">Planos de Leitura</h1>
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
                            <div className="p-4 border rounded-2xl text-white flex items-center gap-3 text-sm font-bold" style={{ background: 'var(--border)', borderColor: 'var(--border-strong)' }}>
                                <CheckCircle2 size={18} style={{ color: 'var(--accent-solid)' }} /> {successMessage}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Active Plans */}
                {activePlans.length > 0 && (
                    <section className="mb-16">
                        <h3 className="text-xs font-black tracking-[0.3em] uppercase mb-8 flex items-center gap-4" style={{ color: 'var(--text-muted)' }}>
                            Em Andamento
                            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {activePlans.map(up => {
                                const plan = STATIC_PLANS.find(p => p.id === up.planId) || plansService.getCustomPlans().find(p => p.id === up.planId);
                                if (!plan) return null;
                                const prog = plansService.getPlanProgress(plan.id);
                                const accent = planAccents[plan.id] || 'var(--accent-solid)';
                                const streak = getStreak(plan.id);
                                const daysElapsed = getDaysElapsed(up.startDate);

                                return (
                                    <motion.div
                                        key={up.planId}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="relative p-8 border rounded-[2.5rem] cursor-pointer transition-all duration-300 hover:-translate-y-1 overflow-hidden group"
                                        style={{ background: 'rgba(255, 255, 255, 0.03)', borderColor: `${accent}20` }}
                                        onClick={() => navigate(`/plans/${plan.id}`)}
                                    >
                                        {/* Glow effect */}
                                        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-10 blur-3xl transition-opacity group-hover:opacity-20" style={{ background: accent }} />

                                        <div className="relative z-10">
                                            <div className="flex items-start justify-between mb-6">
                                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${accent}15`, color: accent }}>
                                                    {planIcons[plan.id] || <BookOpen size={28} />}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {streak > 0 && (
                                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: `${accent}15`, color: accent }}>
                                                            <Flame size={12} />
                                                            <span className="text-[10px] font-black">{streak}d</span>
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setShowConfirmDelete(plan.id); }}
                                                        className="p-2.5 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                        style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                                                    >
                                                        <Trash2 size={14} style={{ color: 'var(--text-muted)' }} />
                                                    </button>
                                                </div>
                                            </div>

                                            <h4 className="text-xl font-bold mb-1 tracking-tight">{plan.title}</h4>
                                            <p className="text-xs font-medium mb-6" style={{ color: 'var(--text-muted)' }}>
                                                Dia {Math.min(daysElapsed + 1, plan.durationDays)} de {plan.durationDays}
                                            </p>

                                            <div className="mb-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Progresso</span>
                                                    <span className="text-sm font-black" style={{ color: accent }}>{prog}%</span>
                                                </div>
                                                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${prog}%` }}
                                                        transition={{ duration: 1, ease: 'easeOut' }}
                                                        className="h-full rounded-full"
                                                        style={{ background: `linear-gradient(90deg, ${accent}, ${accent}CC)` }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mt-6">
                                                <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                                                    {up.completedDays.length} dias concluídos
                                                </span>
                                                <div className="p-2.5 rounded-xl transition-all group-hover:scale-110" style={{ background: `${accent}20` }}>
                                                    <ChevronRight size={16} style={{ color: accent }} />
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Discover Plans */}
                <section className="mb-16">
                    <h3 className="text-xs font-black tracking-[0.3em] uppercase mb-8 flex items-center gap-4" style={{ color: 'var(--text-muted)' }}>
                        {activePlans.length > 0 ? 'Explorar Planos' : 'Escolha seu Plano'}
                        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {STATIC_PLANS.filter(p => !isPlanActive(p.id)).map((plan, i) => {
                            const accent = planAccents[plan.id] || 'var(--accent-solid)';

                            return (
                                <motion.div
                                    key={plan.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    whileHover={{ y: -5 }}
                                    className="relative p-8 border rounded-[2.5rem] flex flex-col group overflow-hidden"
                                    style={{ background: 'rgba(255, 255, 255, 0.03)', borderColor: `${accent}15` }}
                                >
                                    {/* Background glow */}
                                    <div className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full opacity-5 blur-3xl" style={{ background: accent }} />

                                    <div className="relative z-10 flex-1">
                                        <div className="flex items-start justify-between mb-6">
                                            <div className="w-16 h-16 rounded-3xl flex items-center justify-center" style={{ background: `${accent}12`, color: accent }}>
                                                {planIcons[plan.id] || <BookOpen size={32} />}
                                            </div>
                                            <div className="flex flex-col items-end gap-1.5">
                                                <span className="px-3 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase"
                                                    style={{ background: `${accent}15`, border: `1px solid ${accent}25`, color: accent }}
                                                >
                                                    {plan.durationDays} dias
                                                </span>
                                                <span className="px-2.5 py-1 rounded-full text-[8px] font-bold tracking-wider uppercase"
                                                    style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }}
                                                >
                                                    5 cap/dia
                                                </span>
                                            </div>
                                        </div>

                                        <h4 className="text-2xl font-bold tracking-tight mb-3">{plan.title}</h4>
                                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                            {plan.description}
                                        </p>
                                    </div>

                                    <div className="relative z-10 mt-8">
                                        <button
                                            onClick={() => handleJoin(plan.id)}
                                            className="w-full py-4 rounded-2xl font-bold text-xs tracking-[0.2em] uppercase transition-all hover:scale-[1.02] active:scale-[0.98]"
                                            style={{ background: accent, color: '#fff' }}
                                        >
                                            Iniciar Plano
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}

                        {STATIC_PLANS.every(p => isPlanActive(p.id)) && customPlans.length === 0 && (
                            <div className="col-span-full p-12 border-2 border-dashed rounded-[2.5rem] text-center" style={{ borderColor: 'var(--border)' }}>
                                <CheckCircle2 className="mx-auto mb-4" size={48} style={{ color: 'var(--text-muted)' }} />
                                <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
                                    Você já está em todos os planos!
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                {/* AI Plan Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group transition-all duration-300"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}
                >
                    <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full opacity-10 blur-3xl" style={{ background: 'var(--accent-solid)' }} />

                    <div className="flex-1 relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles size={16} style={{ color: 'var(--accent-solid)' }} />
                            <span className="text-[10px] font-bold tracking-[0.3em] uppercase" style={{ color: 'var(--text-muted)' }}>Personalizado com IA</span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold mb-2 tracking-tight">Crie seu Próprio Plano</h2>
                        <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                            Deixe a IA criar uma trilha de estudo única baseada no seu momento de vida e necessidades espirituais.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/plans/ai-generator')}
                        className="px-8 py-4 rounded-2xl font-black text-xs tracking-widest hover:scale-105 active:scale-95 transition-all whitespace-nowrap uppercase relative z-10"
                        style={{ background: 'var(--accent-solid)', color: 'var(--text-on-accent)' }}
                    >
                        Criar Plano
                    </button>
                </motion.div>

                {/* Custom Plans */}
                {customPlans.length > 0 && (
                    <section className="mt-16">
                        <h3 className="text-xs font-black tracking-[0.3em] uppercase mb-8 flex items-center gap-4" style={{ color: 'var(--text-muted)' }}>
                            Planos Personalizados
                            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {customPlans.map(plan => {
                                const isActive = isPlanActive(plan.id);
                                const prog = isActive ? plansService.getPlanProgress(plan.id) : 0;

                                return (
                                    <motion.div
                                        key={plan.id}
                                        layout
                                        whileHover={{ y: -3 }}
                                        className="relative p-8 border rounded-[2.5rem] flex flex-col group overflow-hidden"
                                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                                        onClick={() => isActive && navigate(`/plans/${plan.id}`)}
                                    >
                                        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-5 blur-3xl" style={{ background: 'var(--accent-solid)' }} />

                                        <div className="relative z-10 flex-1">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--border)', color: 'var(--accent-solid)' }}>
                                                    <Sparkles size={24} />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="px-3 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase"
                                                        style={{ background: 'var(--border)', border: '1px solid var(--accent-soft)', color: 'var(--accent-hover)' }}
                                                    >
                                                        {plan.durationDays} dias
                                                    </span>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setShowConfirmDelete(plan.id); }}
                                                        className="p-2.5 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                        style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                                                    >
                                                        <Trash2 size={14} style={{ color: 'var(--text-muted)' }} />
                                                    </button>
                                                </div>
                                            </div>

                                            <h4 className="text-xl font-bold tracking-tight mb-2">{plan.title}</h4>
                                            <p className="text-xs leading-relaxed mb-6" style={{ color: 'var(--text-muted)' }}>
                                                {plan.description}
                                            </p>

                                            {isActive && (
                                                <div className="mb-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Progresso</span>
                                                        <span className="text-sm font-black" style={{ color: 'var(--accent-solid)' }}>{prog}%</span>
                                                    </div>
                                                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${prog}%` }}
                                                            className="h-full rounded-full"
                                                            style={{ background: 'var(--accent-solid)' }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="relative z-10 mt-4">
                                            {isActive ? (
                                                <div className="w-full py-4 rounded-2xl font-bold text-xs tracking-[0.2em] uppercase text-center flex items-center justify-center gap-2" style={{ background: 'var(--border)', color: 'var(--accent-solid)' }}>
                                                    Continuar <ChevronRight size={14} />
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleJoin(plan.id); }}
                                                    className="w-full py-4 rounded-2xl font-bold text-xs tracking-[0.2em] uppercase transition-all hover:scale-[1.02] active:scale-[0.98]"
                                                    style={{ background: 'var(--accent-solid)', color: 'var(--text-on-accent)' }}
                                                >
                                                    Iniciar Plano
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </section>
                )}
            </div>

            {/* Delete Confirmation Modal */}
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
                            style={{ background: '#1a1a1a', borderColor: 'var(--border-strong)' }}
                        >
                            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{ background: 'var(--danger-soft)', color: 'var(--accent-solid)' }}>
                                <Trash2 size={28} />
                            </div>
                            <h3 className="text-2xl font-bold mb-4">Remover Plano?</h3>
                            <p className="text-sm mb-8 leading-relaxed" style={{ color: 'var(--text-muted)' }}>Isso irá apagar todo o seu progresso neste plano. Esta ação não pode ser desfeita.</p>
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => setShowConfirmDelete(null)} className="py-4 rounded-2xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                                    CANCELAR
                                </button>
                                <button onClick={() => handleDelete(showConfirmDelete)} className="py-4 rounded-2xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'var(--accent-solid)', color: 'var(--text-on-accent)' }}>
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
