import { supabase } from '../../lib/supabase';

const READ_CHAPTERS_KEY = 'metanoia_read_chapters';

export interface BibleStats {
    totalChaptersRead: number;
    completionPercentage: number;
    booksTouched: number;
    estimatedMinutes: number;
    hoursRead: number;
    readingHistory: { book: string; chapters: number[] }[];
}

export const statsService = {
    getReadChapters(): string[] {
        const data = localStorage.getItem(READ_CHAPTERS_KEY);
        return data ? JSON.parse(data) : [];
    },

    async toggleChapterRead(bookAbbrev: string, chapter: number): Promise<boolean> {
        const chapters = this.getReadChapters();
        const key = `${bookAbbrev}:${chapter}`;
        const index = chapters.indexOf(key);
        let isRead = false;
        if (index > -1) {
            chapters.splice(index, 1);
            isRead = false;
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('reading_progress').delete().match({ user_id: user.id, book_abbrev: bookAbbrev, chapter_number: chapter });
            }
        } else {
            chapters.push(key);
            isRead = true;
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('reading_progress').upsert({ user_id: user.id, book_abbrev: bookAbbrev, chapter_number: chapter });
                import('./discipleshipService').then(m => m.discipleshipService.getTasks(user.id, false)).catch(console.error);
            }
        }
        localStorage.setItem(READ_CHAPTERS_KEY, JSON.stringify(chapters));
        return isRead;
    },

    isChapterRead(bookAbbrev: string, chapter: number): boolean {
        return this.getReadChapters().includes(`${bookAbbrev}:${chapter}`);
    },

    async getUserStats(userId?: string): Promise<BibleStats> {
        let readChapters: string[] = [];
        const totalChapters = 1189;
        if (userId) {
            const { data, error } = await supabase.from('reading_progress').select('book_abbrev, chapter_number').eq('user_id', userId);
            if (!error && data) { readChapters = data.map(rp => `${rp.book_abbrev}:${rp.chapter_number}`); }
        } else {
            readChapters = this.getReadChapters();
        }
        const booksMap = new Map<string, number[]>();
        readChapters.forEach(entry => { const [book, chapter] = entry.split(':'); if (!booksMap.has(book)) booksMap.set(book, []); booksMap.get(book)!.push(Number(chapter)); });
        const estimatedMinutes = readChapters.length * 4;
        return {
            totalChaptersRead: readChapters.length,
            completionPercentage: (readChapters.length / totalChapters) * 100,
            booksTouched: booksMap.size,
            estimatedMinutes,
            hoursRead: Math.floor(estimatedMinutes / 60),
            readingHistory: Array.from(booksMap.entries()).map(([book, chapters]) => ({ book, chapters })),
        };
    },

    getStats(): BibleStats {
        const readChapters = this.getReadChapters();
        const totalChapters = 1189;
        const booksMap = new Map<string, number[]>();
        readChapters.forEach(entry => { const [book, chapter] = entry.split(':'); if (!booksMap.has(book)) booksMap.set(book, []); booksMap.get(book)!.push(Number(chapter)); });
        const estimatedMinutes = readChapters.length * 4;
        return {
            totalChaptersRead: readChapters.length,
            completionPercentage: (readChapters.length / totalChapters) * 100,
            booksTouched: booksMap.size,
            estimatedMinutes,
            hoursRead: Math.floor(estimatedMinutes / 60),
            readingHistory: Array.from(booksMap.entries()).map(([book, chapters]) => ({ book, chapters })),
        };
    }
};
