import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, CheckCircle2, Circle, BookOpen, ChevronLeft, ChevronRight, Calendar, ExternalLink } from 'lucide-react';
import { plansService, STATIC_PLANS, Plan, UserPlan, getDayChapters, ChapterRef } from '../services/features/plansService';
import PageTransition from '../components/PageTransition';

const DAYS_PER_PAGE = 7;

export default function PlanDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [plan, setPlan] = useState<Plan | null>(null);
    const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
    const [progress, setProgress] = useState(0);
    const [page, setPage] = useState(0);

    useEffect(() => {
        loadPlanData();
    }, [id]);

    useEffect(() => {
        if (userPlan && plan && plan.durationDays) {
            const today = Math.floor((Date.now() - userPlan.startDate) / (1000 * 60 * 60 * 24));
            const totalPgs = Math.ceil(plan.durationDays / DAYS_PER_PAGE);
            const currentPage = Math.floor(today / DAYS_PER_PAGE);
            setPage(Math.max(0, Math.min(currentPage, totalPgs - 1)));
        }
    }, [userPlan, plan]);

    const loadPlanData = () => {
        if (!id) return;

        const activePlans = plansService.getActivePlans();
        const active = activePlans.find(p => p.planId === id);

        const customPlans = plansService.getCustomPlans();
        const targetPlan = STATIC_PLANS.find(p => p.id === id) || customPlans.find(p => p.id === id);

        if (targetPlan && active) {
            setPlan(targetPlan);
            setUserPlan(active);
            setProgress(plansService.getPlanProgress(id));
        } else {
            navigate('/plans');
        }
    };

    const toggleDay = (day: number) => {
        if (!id) return;
        plansService.markDayComplete(id, day);
        loadPlanData();
    };

    if (!plan || !userPlan) {
        return <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }} />;
    }

    const totalPages = Math.ceil(plan.durationDays / DAYS_PER_PAGE);
    const startDay = page * DAYS_PER_PAGE + 1;
    const endDay = Math.min(startDay + DAYS_PER_PAGE - 1, plan.durationDays);
    const days = Array.from({ length: endDay - startDay + 1 }, (_, i) => startDay + i);

    const completedInPage = days.filter(d => userPlan.completedDays.includes(d)).length;
    const today = Math.floor((Date.now() - userPlan.startDate) / (1000 * 60 * 60 * 24)) + 1;

    const accent = 'var(--accent-solid)';
    const isBiblePlan = plan.id === 'bible-1-year' || plan.id === 'new-testament-90';

    return (
        <PageTransition>
        <div className="min-h-screen text-white relative overflow-hidden selection:bg-[var(--accent-soft)] selection:text-white" style={{ background: 'var(--bg-primary)' }}>
            <header className="fixed top-0 left-0 right-0 p-6 md:p-12 z-50 flex justify-between items-center pointer-events-none">
                <button
                    onClick={() => navigate('/plans')}
                    className="pointer-events-auto flex items-center gap-2 text-white/40 hover:text-white transition-all duration-300 group"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-bold text-[10px] tracking-[0.3em] uppercase">Voltar</span>
                </button>
            </header>

            <main className="relative z-10 max-w-3xl mx-auto pt-32 pb-24 px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12 text-center"
                >
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{ background: `${accent}15`, border: `1px solid ${accent}25`, color: accent }}>
                        <BookOpen size={32} />
                    </div>
                    <span className="px-4 py-2 rounded-full text-[10px] font-bold tracking-[0.3em] uppercase mb-6 inline-block" style={{ background: `${accent}10`, border: `1px solid ${accent}20`, color: `${accent}B0` }}>
                        {plan.durationDays} Dias • {isBiblePlan ? '5 capítulos/dia' : 'Plano Personalizado'}
                    </span>
                    <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">{plan.title}</h1>
                    <p className="text-base opacity-80 max-w-lg mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {plan.description}
                    </p>
                </motion.div>

                {/* Progress Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] mb-8"
                    style={{ background: 'var(--bg-card)', border: `1px solid ${accent}15` }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold tracking-[0.3em] uppercase" style={{ color: 'var(--text-muted)' }}>Progresso</h3>
                        <span className="text-2xl font-black italic" style={{ color: accent }}>{progress}%</span>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden mb-4" style={{ background: 'var(--bg-card-hover)' }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ background: `linear-gradient(90deg, ${accent}, ${accent}CC)` }}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {userPlan.completedDays.length} de {plan.durationDays} dias concluídos
                        </p>
                        {today <= plan.durationDays && (
                            <span className="text-xs font-bold" style={{ color: `${accent}80` }}>
                                Dia {today} de {plan.durationDays}
                            </span>
                        )}
                    </div>
                </motion.div>

                {/* Week Navigation */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="flex items-center justify-between mb-6"
                >
                    <button
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                        style={{ background: 'var(--bg-card-hover)', color: 'var(--text-secondary)' }}
                    >
                        <ChevronLeft size={16} />
                        Anterior
                    </button>

                    <div className="flex items-center gap-2">
                        <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                        <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                            Dias {startDay}–{endDay}
                        </span>
                        {completedInPage === days.length && (
                            <CheckCircle2 size={14} style={{ color: accent }} />
                        )}
                    </div>

                    <button
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                        style={{ background: 'var(--bg-card-hover)', color: 'var(--text-secondary)' }}
                    >
                        Próximo
                        <ChevronRight size={16} />
                    </button>
                </motion.div>

                {/* Day Dots Overview */}
                {plan.durationDays > 30 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mb-8 p-4 rounded-2xl"
                        style={{ background: 'var(--bg-card)' }}
                    >
                        <div className="flex flex-wrap gap-1 justify-center">
                            {Array.from({ length: plan.durationDays }, (_, i) => i + 1).map(day => {
                                const isCompleted = userPlan.completedDays.includes(day);
                                const isCurrent = day === today;
                                const dayPage = Math.floor((day - 1) / DAYS_PER_PAGE);
                                return (
                                    <button
                                        key={day}
                                        onClick={() => setPage(dayPage)}
                                        className="w-2 h-2 rounded-full transition-all hover:scale-150"
                                        style={{
                                            background: isCompleted ? accent : isCurrent ? `${accent}60` : 'rgba(255, 255, 255, 0.08)',
                                            outline: isCurrent ? `1px solid ${accent}` : 'none',
                                            outlineOffset: '1px'
                                        }}
                                        title={`Dia ${day}${isCompleted ? ' (concluído)' : ''}`}
                                    />
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* Day List */}
                <div className="space-y-3">
                    <h3 className="text-xs font-bold tracking-[0.3em] uppercase mb-6 flex items-center gap-4" style={{ color: 'var(--text-muted)' }}>
                        Dias do Plano
                        <div className="flex-1 h-px" style={{ background: `${accent}15` }} />
                    </h3>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={page}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-3"
                        >
                            {days.map(dayNumber => {
                                const isCompleted = userPlan.completedDays.includes(dayNumber);
                                const isToday = dayNumber === today;
                                const dayContent = plan.content?.find(c => c.day === dayNumber);
                                const chapters = isBiblePlan ? getDayChapters(plan.id, dayNumber) : [];

                                return (
                                    <motion.div
                                        key={dayNumber}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: (dayNumber - startDay) * 0.03 }}
                                        className={`w-full border rounded-2xl transition-all duration-300 overflow-hidden ${isToday ? 'ring-1' : ''}`}
                                        style={{
                                            background: isCompleted ? `${accent}08` : 'var(--bg-card)',
                                            borderColor: isCompleted ? `${accent}25` : isToday ? `${accent}40` : 'var(--bg-input)',
                                            boxShadow: isToday ? `0 0 0 1px ${accent}30` : 'none'
                                        }}
                                    >
                                        {/* Day Header */}
                                        <div className="p-5 md:p-6">
                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={() => toggleDay(dayNumber)}
                                                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all hover:scale-110 active:scale-95"
                                                    style={{
                                                        background: isCompleted ? accent : 'var(--bg-card-hover)',
                                                        color: isCompleted ? '#fff' : 'var(--text-dim)'
                                                    }}
                                                >
                                                    {isCompleted ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                                                </button>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-sm md:text-base font-bold truncate">
                                                            Dia {dayNumber}
                                                            {isToday && (
                                                                <span className="ml-2 text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full" style={{ background: `${accent}20`, color: accent }}>
                                                                    Hoje
                                                                </span>
                                                            )}
                                                        </h4>
                                                    </div>
                                                    {dayContent && (
                                                        <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
                                                            {dayContent.verse} — {dayContent.title}
                                                        </p>
                                                    )}
                                                    {!dayContent && !isBiblePlan && (
                                                        <p className="text-xs mt-1" style={{ color: isCompleted ? `${accent}80` : 'var(--text-dim)' }}>
                                                            {isCompleted ? 'Concluído' : 'Pendente'}
                                                        </p>
                                                    )}
                                                    {isBiblePlan && chapters.length > 0 && (
                                                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                                            {chapters[0].bookName} {chapters[0].chapter}
                                                            {chapters.length > 1 && ` — ${chapters[chapters.length - 1].bookName} ${chapters[chapters.length - 1].chapter}`}
                                                        </p>
                                                    )}
                                                </div>

                                                <button
                                                    onClick={() => toggleDay(dayNumber)}
                                                    className={`px-4 py-2 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all hover:scale-105 active:scale-95 shrink-0 ${isCompleted ? 'cursor-default' : ''}`}
                                                    style={{
                                                        background: isCompleted ? 'transparent' : `${accent}15`,
                                                        color: isCompleted ? `${accent}60` : accent,
                                                        border: isCompleted ? `1px solid ${accent}20` : 'none'
                                                    }}
                                                >
                                                    {isCompleted ? 'Feito' : 'Ler'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Chapter Links */}
                                        {isBiblePlan && chapters.length > 0 && (
                                            <div className="px-5 md:px-6 pb-4 -mt-1">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {chapters.map((ch, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => navigate(`/bible/${ch.book}/${ch.chapter}`)}
                                                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:scale-105 active:scale-95"
                                                            style={{
                                                                background: 'var(--bg-card-hover)',
                                                                color: 'var(--text-secondary)'
                                                            }}
                                                        >
                                                            <ExternalLink size={9} />
                                                            {ch.bookName} {ch.chapter}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Bottom Navigation */}
                {totalPages > 1 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="flex items-center justify-between mt-8 pt-6"
                        style={{ borderTop: `1px solid ${accent}10` }}
                    >
                        <button
                            onClick={() => setPage(0)}
                            disabled={page === 0}
                            className="text-[10px] font-bold tracking-widest uppercase transition-all disabled:opacity-20"
                            style={{ color: `${accent}80` }}
                        >
                            Início
                        </button>
                        <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                            {page + 1} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(totalPages - 1)}
                            disabled={page >= totalPages - 1}
                            className="text-[10px] font-bold tracking-widest uppercase transition-all disabled:opacity-20"
                            style={{ color: `${accent}80` }}
                        >
                            Fim
                        </button>
                    </motion.div>
                )}
            </main>
        </div>
        </PageTransition>
    );
}
