export interface Book {
    abbrev: {
        pt: string;
        en: string;
    };
    author: string;
    chapters: number;
    group: string;
    name: string;
    testament: string;
    description?: string;
}

export interface Verse {
    book: {
        abbrev: { pt: string; en: string };
        name: string;
        author: string;
        group: string;
        version: string;
    };
    chapter: number;
    number: number;
    text: string;
}

export interface Chapter {
    book: {
        abbrev: { pt: string; en: string };
        name: string;
        author: string;
        group: string;
        version: string;
        chapters: number;
        description?: string;
    };
    chapter: {
        number: number;
        verses: number;
    };
    verses: Verse[];
}

export interface ChapterInsight {
    book: string;
    chapter: number;
    summary: string;
    practicalApplication: string[];
}
