export interface Plan {
    id: string;
    title: string;
    description: string;
    duration: string;
    chapters: number;
    icon: string;
}

export interface UserPlan {
    planId: string;
    startedAt: string;
    progress: number;
    completedChapters: number[];
}

const PLANS_KEY = '@metanoia_plans';
const CUSTOM_PLANS_KEY = '@metanoia_custom_plans';

export const STATIC_PLANS: Plan[] = [
    {
        id: 'genesis',
        title: 'Gênesis',
        description: 'Explore os primérdios da criação, a história dos patriarcas e os fundamentos da fé.',
        duration: '30 dias',
        chapters: 50,
        icon: '📖'
    },
    {
        id: 'salmos',
        title: 'Salmos de Oração',
        description: 'Uma seleção de salmos para fortalecer sua vida de oração e adoração.',
        duration: '21 dias',
        chapters: 21,
        icon: '🙏'
    },
    {
        id: 'proverbios',
        title: 'Provérbios da Sabedoria',
        description: 'Sabedoria prática para o dia a dia, um capítulo por dia.',
        duration: '31 dias',
        chapters: 31,
        icon: '💡'
    },
    {
        id: 'joao',
        title: 'Evangelho de João',
        description: 'Conheça Jesus através do olhar do discípulo amado.',
        duration: '21 dias',
        chapters: 21,
        icon: '✝️'
    },
    {
        id: 'romanos',
        title: 'Carta aos Romanos',
        description: 'Entenda a graça de Deus e os fundamentos da teologia cristã.',
        duration: '16 dias',
        chapters: 16,
        icon: '📜'
    }
];

class PlansService {
    getActivePlans(): UserPlan[] {
        const saved = localStorage.getItem(PLANS_KEY);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch {
                return [];
            }
        }
        return [];
    }

    getCustomPlans(): Plan[] {
        const saved = localStorage.getItem(CUSTOM_PLANS_KEY);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch {
                return [];
            }
        }
        return [];
    }

    joinPlan(planId: string) {
        const active = this.getActivePlans();
        if (active.some(p => p.planId === planId)) return;
        active.push({
            planId,
            startedAt: new Date().toISOString(),
            progress: 0,
            completedChapters: []
        });
        localStorage.setItem(PLANS_KEY, JSON.stringify(active));
    }

    leavePlan(planId: string) {
        const active = this.getActivePlans().filter(p => p.planId !== planId);
        localStorage.setItem(PLANS_KEY, JSON.stringify(active));
    }

    completeChapter(planId: string, chapter: number) {
        const active = this.getActivePlans();
        const plan = active.find(p => p.planId === planId);
        if (!plan) return;
        if (!plan.completedChapters.includes(chapter)) {
            plan.completedChapters.push(chapter);
            const allPlan = [...STATIC_PLANS, ...this.getCustomPlans()].find(p => p.id === planId);
            if (allPlan) {
                plan.progress = Math.round((plan.completedChapters.length / allPlan.chapters) * 100);
            }
        }
        localStorage.setItem(PLANS_KEY, JSON.stringify(active));
    }

    addCustomPlan(plan: Omit<Plan, 'id'>) {
        const custom = this.getCustomPlans();
        const newPlan: Plan = {
            ...plan,
            id: 'custom_' + Date.now()
        };
        custom.push(newPlan);
        localStorage.setItem(CUSTOM_PLANS_KEY, JSON.stringify(custom));
        return newPlan;
    }

    deleteCustomPlan(planId: string) {
        const custom = this.getCustomPlans().filter(p => p.id !== planId);
        localStorage.setItem(CUSTOM_PLANS_KEY, JSON.stringify(custom));
        this.leavePlan(planId);
    }
}

export const plansService = new PlansService();
