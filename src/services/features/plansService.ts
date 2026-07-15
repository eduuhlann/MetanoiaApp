export interface PlanDayContent {
    day: number;
    title: string;
    verse: string;
    content: string;
}

export interface Plan {
    id: string;
    title: string;
    description: string;
    durationDays: number;
    category: 'standard' | 'ai' | 'thematic';
    content?: PlanDayContent[];
}

export interface UserPlan {
    planId: string;
    startDate: number;
    completedDays: number[];
}

const ACTIVE_PLANS_KEY = 'metanoia_active_plans';
const CUSTOM_PLANS_KEY = 'metanoia_custom_plans';

export const STATIC_PLANS: Plan[] = [
    {
        id: 'genesis',
        title: 'Gênesis',
        description: 'Explore os primórdios da criação, a história dos patriarcas e os fundamentos da fé.',
        durationDays: 30,
        category: 'standard'
    },
    {
        id: 'salmos',
        title: '30 Dias com Salmos',
        description: 'Encontre conforto e louvor através dos salmos mais poderosos da Escritura.',
        durationDays: 30,
        category: 'thematic'
    },
    {
        id: 'proverbios',
        title: 'Provérbios da Sabedoria',
        description: 'Sabedoria prática para o dia a dia, um capítulo por dia.',
        durationDays: 31,
        category: 'standard'
    },
    {
        id: 'joao',
        title: 'Evangelho de João',
        description: 'Conheça Jesus através do olhar do discípulo amado.',
        durationDays: 21,
        category: 'standard'
    },
    {
        id: 'romanos',
        title: 'Carta aos Romanos',
        description: 'Entenda a graça de Deus e os fundamentos da teologia cristã.',
        durationDays: 16,
        category: 'standard'
    }
];

class PlansService {
    getActivePlans(): UserPlan[] {
        try {
            const data = localStorage.getItem(ACTIVE_PLANS_KEY);
            if (!data) return [];
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    getCustomPlans(): Plan[] {
        try {
            const data = localStorage.getItem(CUSTOM_PLANS_KEY);
            if (!data) return [];
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    joinPlan(planId: string) {
        const active = this.getActivePlans();
        if (active.some(p => p.planId === planId)) return;
        active.push({
            planId,
            startDate: Date.now(),
            completedDays: []
        });
        localStorage.setItem(ACTIVE_PLANS_KEY, JSON.stringify(active));
    }

    leavePlan(planId: string) {
        const active = this.getActivePlans().filter(p => p.planId !== planId);
        localStorage.setItem(ACTIVE_PLANS_KEY, JSON.stringify(active));
    }

    markDayComplete(planId: string, day: number) {
        const active = this.getActivePlans();
        const plan = active.find(p => p.planId === planId);
        if (plan && !plan.completedDays.includes(day)) {
            plan.completedDays.push(day);
            localStorage.setItem(ACTIVE_PLANS_KEY, JSON.stringify(active));
        }
    }

    getPlanProgress(planId: string): number {
        const active = this.getActivePlans();
        const plan = active.find(p => p.planId === planId);
        if (!plan) return 0;

        let targetPlan = STATIC_PLANS.find(p => p.id === planId);
        if (!targetPlan) {
            targetPlan = this.getCustomPlans().find(p => p.id === planId);
        }

        if (!targetPlan) return 0;

        return Math.round((plan.completedDays.length / targetPlan.durationDays) * 100);
    }

    saveCustomPlan(plan: Plan) {
        const customPlans = this.getCustomPlans();
        customPlans.push(plan);
        localStorage.setItem(CUSTOM_PLANS_KEY, JSON.stringify(customPlans));
    }

    deleteCustomPlan(planId: string) {
        const customPlans = this.getCustomPlans().filter(p => p.id !== planId);
        localStorage.setItem(CUSTOM_PLANS_KEY, JSON.stringify(customPlans));
        this.leavePlan(planId);
    }
}

export const plansService = new PlansService();
