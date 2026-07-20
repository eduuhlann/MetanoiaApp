import bibleData from '../../assets/nvi_bible.json';
import { Chapter, Verse } from '../../types';
import { STATIC_BOOKS } from './staticBibleData';

interface JsonBook {
    abbrev: string;
    chapters: string[][];
    name: string;
}

const bible = bibleData as JsonBook[];

export const offlineBible = {
    getChapter(bookAbbrev: string, chapterNum: number): Chapter | null {
        const normalizedAbbrev = bookAbbrev.toLowerCase().trim();
        const bookData = bible.find(b => b.abbrev === normalizedAbbrev);

        if (!bookData) return null;
        if (!Number.isInteger(chapterNum) || chapterNum < 1 || chapterNum > bookData.chapters.length) return null;

        const versesList = bookData.chapters[chapterNum - 1];
        if (!versesList || versesList.length === 0) return null;

        const bookMeta = STATIC_BOOKS.find(b => b.abbrev.pt === normalizedAbbrev) || {
            abbrev: { pt: normalizedAbbrev, en: normalizedAbbrev },
            name: bookData.name || bookAbbrev.toUpperCase(),
            author: "Desconhecido",
            group: "Desconhecido",
            testament: "VT",
            chapters: bookData.chapters.length
        };

        const verses: Verse[] = versesList.map((text, index) => ({
            book: {
                abbrev: bookMeta.abbrev,
                name: bookMeta.name,
                author: bookMeta.author,
                group: bookMeta.group,
                version: 'nvi'
            },
            chapter: chapterNum,
            number: index + 1,
            text: text
        }));

        return {
            book: {
                abbrev: bookMeta.abbrev,
                name: bookMeta.name,
                author: bookMeta.author,
                group: bookMeta.group,
                version: 'nvi',
                chapters: bookMeta.chapters,
                description: bookMeta.description
            },
            chapter: {
                number: chapterNum,
                verses: verses.length
            },
            verses: verses
        };
    }
};
