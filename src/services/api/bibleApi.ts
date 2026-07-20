import { Book, Chapter } from '../../types';
import { offlineBible } from '../bible/offlineBible';
import { STATIC_BOOKS } from '../bible/staticBibleData';

const WORKING_VERSIONS = [
    { version: 'nvi', name: 'NVI — Nova Versão Internacional' },
];

export const bibleApi = {
    getVerse: (bookAbbrev: string, chapter: number, verse: number): string | null => {
        try {
            const chapterData = offlineBible.getChapter(bookAbbrev, chapter);
            if (!chapterData || !chapterData.verses[verse - 1]) return null;
            return chapterData.verses[verse - 1].text;
        } catch (error) {
            console.error('Error getting verse:', error);
            return null;
        }
    },

    async getBooks(): Promise<Book[]> {
        return STATIC_BOOKS;
    },

    async getChapter(bookAbbrev: string, chapter: number, version: string = 'nvi'): Promise<Chapter | null> {
        if (version.toLowerCase() === 'nvi') {
            return offlineBible.getChapter(bookAbbrev, chapter);
        }
        return offlineBible.getChapter(bookAbbrev, chapter);
    },

    async getVersions(): Promise<any[]> {
        return WORKING_VERSIONS;
    }
};
