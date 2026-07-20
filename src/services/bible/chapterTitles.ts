export const CHAPTER_TITLES: { [key: string]: { [chapter: number]: string } } = {
    'gn': {
        1: 'A Criação',
        2: 'Adão e Eva',
        3: 'A Queda',
        4: 'Caim e Abel',
        6: 'O Dilúvio',
        11: 'A Torre de Babel',
        12: 'O Chamado de Abrão',
        22: 'O Sacrifício de Isaque',
        37: 'José e Seus Irmãos',
        50: 'A Morte de José'
    },
    'ex': {
        1: 'Os Israelitas Oprimidos',
        3: 'A Sarça Ardente',
        12: 'A Páscoa',
        14: 'A Travessia do Mar Vermelho',
        20: 'Os Dez Mandamentos',
        32: 'O Bezerro de Ouro'
    },
    'sl': {
        1: 'O Caminho dos Justos',
        23: 'O Senhor é Meu Pastor',
        51: 'Oração de Arrependimento',
        91: 'Proteção Divina',
        119: 'A Palavra de Deus',
        139: 'Deus Conhece Tudo'
    },
    'pv': {
        1: 'Propósito e Tema',
        3: 'Confie no Senhor',
        31: 'A Mulher Virtuosa'
    },
    'is': {
        6: 'A Visão de Isaías',
        9: 'O Príncipe da Paz',
        40: 'Conforto para o Povo de Deus',
        53: 'O Servo Sofredor'
    },
    'mt': {
        1: 'A Genealogia de Jesus',
        5: 'O Sermão do Monte',
        6: 'O Pai Nosso',
        13: 'As Parábolas do Reino',
        26: 'A Última Ceia',
        28: 'A Ressurreição'
    },
    'mc': {
        1: 'João Batista Prepara o Caminho',
        16: 'A Ressurreição'
    },
    'lc': {
        1: 'O Nascimento de João Batista Predito',
        2: 'O Nascimento de Jesus',
        15: 'A Parábola do Filho Pródigo',
        24: 'A Ressurreição'
    },
    'jo': {
        1: 'O Verbo se Fez Carne',
        3: 'Jesus e Nicodemos',
        11: 'A Ressurreição de Lázaro',
        14: 'Jesus, o Caminho para o Pai',
        17: 'A Oração Sacerdotal',
        20: 'O Túmulo Vazio',
        21: 'Jesus e Pedro'
    },
    'atos': {
        1: 'Jesus Levado ao Céu',
        2: 'O Espírito Santo em Pentecostes',
        9: 'A Conversão de Saulo'
    },
    'rm': {
        1: 'Paulo, Servo de Cristo',
        3: 'A Justiça Mediante a Fé',
        5: 'Paz e Alegria',
        8: 'Mais que Vencedores',
        12: 'Sacrifícios Vivos'
    },
    '1co': {
        13: 'O Amor',
        15: 'A Ressurreição de Cristo'
    },
    'gl': {
        5: 'O Fruto do Espírito'
    },
    'ef': {
        6: 'A Armadura de Deus'
    },
    'fp': {
        2: 'A Humildade de Cristo',
        4: 'Alegria no Senhor'
    },
    'hb': {
        11: 'Os Heróis da Fé',
        12: 'Corramos com Perseverança'
    },
    'tg': {
        1: 'Provações e Tentações'
    },
    '1pe': {
        2: 'A Pedra Viva e o Povo Escolhido'
    },
    '1jo': {
        4: 'Deus é Amor'
    },
    'ap': {
        1: 'O Prólogo',
        21: 'A Nova Jerusalém',
        22: 'O Rio da Vida'
    }
};

export const getChapterTitle = (bookAbbrev: string, chapter: number): string | null => {
    const book = CHAPTER_TITLES[bookAbbrev.toLowerCase()];
    if (!book) return null;
    return book[chapter] || null;
};
