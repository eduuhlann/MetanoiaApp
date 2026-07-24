import { STATIC_BOOKS } from '../bible/staticBibleData';

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

export interface ChapterRef {
    book: string;
    bookName: string;
    chapter: number;
}

const ACTIVE_PLANS_KEY = 'metanoia_active_plans';
const CUSTOM_PLANS_KEY = 'metanoia_custom_plans';

export const STATIC_PLANS: Plan[] = [
    {
        id: 'bible-1-year',
        title: 'Bíblia em 1 Ano',
        description: 'Uma jornada completa por toda a Escritura. 5 capítulos por dia, de Gênesis a Apocalipse.',
        durationDays: 238,
        category: 'standard'
    },
    {
        id: 'new-testament-90',
        title: 'Novo Testamento em 90 Dias',
        description: 'Explore os Evangelhos, Atos, Epístolas e Apocalipse. 5 capítulos por dia.',
        durationDays: 52,
        category: 'standard'
    }
];

function buildBookList(testament?: string): { abbrev: string; name: string; chapters: number }[] {
    return STATIC_BOOKS
        .filter(b => !testament || b.testament === testament)
        .map(b => ({ abbrev: b.abbrev.pt, name: b.name, chapters: b.chapters }));
}

export function getReadingSchedule(planId: string): ChapterRef[][] {
    const chaptersPerDay = 5;
    let books: { abbrev: string; name: string; chapters: number }[];

    if (planId === 'bible-1-year') {
        books = buildBookList();
    } else if (planId === 'new-testament-90') {
        books = buildBookList('NT');
    } else {
        return [];
    }

    const totalChapters = books.reduce((sum, b) => sum + b.chapters, 0);
    const totalDays = Math.ceil(totalChapters / chaptersPerDay);
    const schedule: ChapterRef[][] = Array.from({ length: totalDays }, () => []);

    let chapterIdx = 0;
    for (const book of books) {
        for (let ch = 1; ch <= book.chapters; ch++) {
            const day = Math.floor(chapterIdx / chaptersPerDay);
            schedule[day].push({ book: book.abbrev, bookName: book.name, chapter: ch });
            chapterIdx++;
        }
    }

    return schedule;
}

export function getDayChapters(planId: string, day: number): ChapterRef[] {
    const schedule = getReadingSchedule(planId);
    return schedule[day - 1] || [];
}

export interface WeeklyDay {
    dayLabel: string;
    dayShort: string;
    chapters: ChapterRef[];
    completed: boolean;
    isToday: boolean;
}

export interface WeeklyChallenge {
    planId: string;
    planTitle: string;
    weekNumber: number;
    days: WeeklyDay[];
    completedCount: number;
    totalCount: number;
}

export function getWeeklyChallenge(): WeeklyChallenge | null {
    const service = new PlansService();
    const activePlans = service.getActivePlans();
    if (activePlans.length === 0) return null;

    const plan = activePlans[0];
    const schedule = getReadingSchedule(plan.planId);
    if (schedule.length === 0) return null;

    const startDate = new Date(plan.startDate);
    const today = new Date();
    const startDayOfWeek = startDate.getDay();
    const adjustedStart = new Date(startDate);
    adjustedStart.setDate(adjustedStart.getDate() - startDayOfWeek);

    const dayIndex = Math.floor((today.getTime() - adjustedStart.getTime()) / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(dayIndex / 7);
    const weekStartDay = weekNumber * 7;

    const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const DAY_LABELS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const todayDayOfWeek = today.getDay();

    const days: WeeklyDay[] = [];
    for (let i = 0; i < 7; i++) {
        const scheduleDay = weekStartDay + i + 1;
        const chapters = scheduleDay >= 1 && scheduleDay <= schedule.length ? schedule[scheduleDay - 1] : [];
        days.push({
            dayLabel: DAY_LABELS_FULL[i],
            dayShort: DAY_LABELS[i],
            chapters,
            completed: plan.completedDays.includes(scheduleDay),
            isToday: i === todayDayOfWeek,
        });
    }

    const completedCount = days.filter(d => d.completed).length;

    const targetPlan = STATIC_PLANS.find(p => p.id === plan.planId);
    return {
        planId: plan.planId,
        planTitle: targetPlan?.title || plan.planId,
        weekNumber: weekNumber + 1,
        days,
        completedCount,
        totalCount: 7,
    };
}

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
