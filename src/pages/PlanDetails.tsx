import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, CheckCircle2, Circle, BookOpen } from 'lucide-react';
import { plansService, STATIC_PLANS, Plan, UserPlan } from '../services/features/plansService';
import PageTransition from '../components/PageTransition';
import { cn } from '../lib/utils';

export default function PlanDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [plan, setPlan] = useState<Plan | null>(null);
    const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        loadPlanData();
    }, [id]);

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
        return <div className="min-h-screen" style={{ background: '#252627' }} />;
    }

    return (
        <PageTransition>
        <div className="min-h-screen text-white relative overflow-hidden selection:bg-[#4B88A2]/30 selection:text-white" style={{ background: '#252627' }}>
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
                    className="mb-16 text-center"
                >
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 text-white" style={{ background: 'rgba(75, 136, 162, 0.15)', border: '1px solid rgba(75, 136, 162, 0.2)' }}>
                        <BookOpen size={32} />
                    </div>
                    <span className="px-4 py-2 rounded-full text-[10px] font-bold tracking-[0.3em] uppercase mb-6 inline-block" style={{ background: 'rgba(75, 136, 162, 0.1)', border: '1px solid rgba(75, 136, 162, 0.2)', color: 'rgba(75, 136, 162, 0.7)' }}>
                        {plan.category === 'ai' ? 'Plano IA' : plan.category === 'thematic' ? 'Temático' : 'Padrão'} • {plan.durationDays} Dias
                    </span>
                    <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">{plan.title}</h1>
                    <p className="text-lg opacity-80 max-w-lg mx-auto leading-relaxed" style={{ color: 'rgba(211, 212, 217, 0.5)' }}>
                        {plan.description}
                    </p>
                </motion.div>

                <div className="p-8 rounded-[2.5rem] mb-12" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(75, 136, 162, 0.1)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold tracking-[0.3em] uppercase" style={{ color: 'rgba(211, 212, 217, 0.4)' }}>Progresso da Jornada</h3>
                        <span className="text-2xl font-black italic" style={{ color: '#4B88A2' }}>{progress}%</span>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full rounded-full"
                            style={{ background: '#4B88A2' }}
                        />
                    </div>
                    <p className="text-center text-xs italic mt-6" style={{ color: 'rgba(211, 212, 217, 0.3)' }}>
                        {userPlan.completedDays.length} de {plan.durationDays} dias concluídos
                    </p>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xs font-bold tracking-[0.3em] uppercase mb-8 flex items-center gap-4" style={{ color: 'rgba(211, 212, 217, 0.4)' }}>
                        Dias do Plano
                        <div className="flex-1 h-px" style={{ background: 'rgba(75, 136, 162, 0.1)' }} />
                    </h3>

                    {Array.from({ length: plan.durationDays }).map((_, i) => {
                        const dayNumber = i + 1;
                        const isCompleted = userPlan.completedDays.includes(dayNumber);
                        const dayContent = plan.content?.find(c => c.day === dayNumber);

                        return (
                            <motion.div
                                key={dayNumber}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: Math.min(i * 0.05, 0.5) }}
                                className={cn(
                                    "w-full p-6 md:p-8 border rounded-3xl transition-all duration-300",
                                    isCompleted
                                        ? "opacity-75"
                                        : "hover:shadow-[0_8px_30px_rgba(75,136,162,0.04)] hover:-translate-y-1"
                                )}
                                style={{
                                    background: isCompleted ? 'rgba(75, 136, 162, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                                    borderColor: isCompleted ? 'rgba(75, 136, 162, 0.25)' : 'rgba(75, 136, 162, 0.1)'
                                }}
                            >
                                <div className="flex items-start gap-6 mb-6">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors"
                                    )}
                                        style={{
                                            background: isCompleted ? '#4B88A2' : 'rgba(255, 255, 255, 0.05)',
                                            color: isCompleted ? '#fff' : 'rgba(211, 212, 217, 0.2)'
                                        }}
                                    >
                                        {isCompleted ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                    </div>
                                    <div className="flex-1 mt-1">
                                        <h4 className="text-2xl font-bold mb-1">Dia {dayNumber} {dayContent ? `- ${dayContent.title}` : ''}</h4>
                                        <p className="text-sm font-bold tracking-widest uppercase mb-4"
                                            style={{ color: isCompleted ? 'rgba(75, 136, 162, 0.5)' : 'rgba(211, 212, 217, 0.3)' }}
                                        >
                                            {dayContent ? dayContent.verse : (isCompleted ? "Concluído" : "Pendente")}
                                        </p>

                                        {dayContent && (
                                            <div className="max-w-none text-base md:text-lg leading-relaxed border-l-2 pl-4 md:pl-6 my-6" style={{ color: 'rgba(255, 255, 255, 0.7)', borderColor: 'rgba(75, 136, 162, 0.3)' }}>
                                                <p className="italic">"{dayContent.content}"</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => toggleDay(dayNumber)}
                                    disabled={isCompleted}
                                    className={cn(
                                        "w-full py-4 rounded-2xl font-bold text-xs tracking-[0.3em] uppercase transition-all flex items-center justify-center gap-2",
                                        isCompleted
                                            ? "cursor-not-allowed"
                                            : "hover:scale-[1.01] active:scale-[0.98]"
                                    )}
                                    style={{
                                        background: isCompleted ? 'transparent' : '#fff',
                                        color: isCompleted ? 'rgba(211, 212, 217, 0.4)' : '#000',
                                        border: isCompleted ? '1px solid rgba(255, 255, 255, 0.15)' : 'none'
                                    }}
                                >
                                    {isCompleted ? (
                                        <>Dia Concluído <CheckCircle2 size={16} /></>
                                    ) : (
                                        <>Concluir Leitura</>
                                    )}
                                </button>
                            </motion.div>
                        );
                    })}
                </div>
            </main>
        </div>
        </PageTransition>
    );
}
