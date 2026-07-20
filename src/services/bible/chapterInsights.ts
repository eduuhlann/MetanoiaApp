import { ChapterInsight } from '../../types';

const CHAPTER_INSIGHTS: ChapterInsight[] = [
    {
        book: 'gn',
        chapter: 1,
        summary: 'Deus cria o universo, a terra, os animais e a humanidade em seis dias, descansando no sétimo. O homem e a mulher são criados à imagem de Deus para governar a criação.',
        practicalApplication: [
            'Reconheça que você foi criado à imagem de Deus - você tem valor e propósito',
            'Pratique o descanso semanal, seguindo o exemplo de Deus',
            'Cuide da criação e do meio ambiente como um mordomo responsável'
        ]
    },
    {
        book: 'gn',
        chapter: 3,
        summary: 'A serpente engana Eva, que come do fruto proibido junto com Adão. Isso traz o pecado ao mundo, resultando em consequências como dor, trabalho árduo e morte.',
        practicalApplication: [
            'Reconheça as tentações sutis e não dialogue com elas',
            'Assuma responsabilidade por suas escolhas em vez de culpar outros',
            'Confie que Deus tem um plano de redenção mesmo após falhas'
        ]
    },
    {
        book: 'sl',
        chapter: 23,
        summary: 'Davi descreve Deus como um pastor amoroso que cuida, guia, protege e provê para suas ovelhas em todas as circunstâncias.',
        practicalApplication: [
            'Confie em Deus como seu guia nas decisões difíceis',
            'Encontre paz sabendo que Deus está com você nos momentos sombrios',
            'Pratique gratidão pelas bênçãos e provisões de Deus'
        ]
    },
    {
        book: 'sl',
        chapter: 51,
        summary: 'Davi se arrepende profundamente de seu pecado com Bate-Seba, pedindo a Deus purificação, renovação e restauração de sua alegria.',
        practicalApplication: [
            'Seja honesto com Deus sobre seus pecados e falhas',
            'Peça um coração puro e um espírito renovado',
            'Lembre-se que Deus deseja arrependimento sincero, não apenas rituais'
        ]
    },
    {
        book: 'pv',
        chapter: 3,
        summary: 'Salomão ensina sobre confiar em Deus, buscar sabedoria, honrar a Deus com suas riquezas e aceitar a disciplina divina com humildade.',
        practicalApplication: [
            'Confie em Deus de todo coração em vez de depender apenas do seu entendimento',
            'Reconheça Deus em todas as suas decisões e caminhos',
            'Seja generoso com o que você tem, honrando a Deus com suas finanças'
        ]
    },
    {
        book: 'mt',
        chapter: 5,
        summary: 'Jesus ensina as Bem-aventuranças, mostrando valores do Reino de Deus que contradizem a sabedoria mundana. Ele chama seus seguidores a serem sal e luz.',
        practicalApplication: [
            'Busque ser humilde, misericordioso e pacificador em seus relacionamentos',
            'Seja uma influência positiva (sal e luz) onde você estiver',
            'Não esconda sua fé - deixe suas boas obras glorificarem a Deus'
        ]
    },
    {
        book: 'mt',
        chapter: 6,
        summary: 'Jesus ensina sobre dar, orar e jejuar em secreto, não se preocupar com o amanhã, e buscar primeiro o Reino de Deus.',
        practicalApplication: [
            'Faça boas obras discretamente, sem buscar reconhecimento',
            'Ore de forma sincera e pessoal, não apenas para impressionar outros',
            'Confie em Deus para suas necessidades diárias em vez de se preocupar'
        ]
    },
    {
        book: 'jo',
        chapter: 3,
        summary: 'Jesus explica a Nicodemos sobre o novo nascimento espiritual e declara que Deus amou o mundo de tal maneira que deu seu Filho unigênito.',
        practicalApplication: [
            'Entenda que seguir a Deus requer uma transformação espiritual profunda',
            'Aceite o amor incondicional de Deus demonstrado em Jesus',
            'Compartilhe este amor e verdade com outros que buscam'
        ]
    },
    {
        book: 'jo',
        chapter: 14,
        summary: 'Jesus conforta seus discípulos, prometendo preparar um lugar para eles e enviar o Espírito Santo. Ele se declara como o caminho, a verdade e a vida.',
        practicalApplication: [
            'Encontre paz em meio às incertezas confiando nas promessas de Jesus',
            'Busque conhecer a Deus através de Jesus, o único caminho',
            'Confie na presença do Espírito Santo para guiá-lo diariamente'
        ]
    },
    {
        book: 'rm',
        chapter: 8,
        summary: 'Paulo ensina sobre a vida no Espírito, a adoção como filhos de Deus, e que nada pode nos separar do amor de Cristo.',
        practicalApplication: [
            'Viva guiado pelo Espírito, não pela carne',
            'Lembre-se que você é filho amado de Deus',
            'Tenha confiança que Deus trabalha todas as coisas para o bem daqueles que o amam'
        ]
    },
    {
        book: 'rm',
        chapter: 12,
        summary: 'Paulo exorta os crentes a oferecerem seus corpos como sacrifício vivo, a não se conformarem com o mundo, e a usarem seus dons para servir.',
        practicalApplication: [
            'Dedique sua vida completamente a Deus como um ato de adoração',
            'Renove sua mente através da Palavra de Deus',
            'Use seus talentos e dons para servir outros na igreja'
        ]
    },
    {
        book: 'fp',
        chapter: 4,
        summary: 'Paulo ensina sobre alegria, paz, contentamento em todas as circunstâncias e a força que vem de Cristo.',
        practicalApplication: [
            'Pratique gratidão em vez de ansiedade',
            'Leve suas preocupações a Deus em oração',
            'Aprenda a estar contente em qualquer situação, confiando em Cristo'
        ]
    },
    {
        book: 'tg',
        chapter: 1,
        summary: 'Tiago ensina sobre perseverar nas provações, pedir sabedoria a Deus, e ser praticantes da Palavra, não apenas ouvintes.',
        practicalApplication: [
            'Veja as dificuldades como oportunidades de crescimento',
            'Peça sabedoria a Deus quando enfrentar decisões difíceis',
            'Coloque em prática o que você aprende, não apenas ouça'
        ]
    }
];

export const chapterInsights = {
    getInsight(bookAbbrev: string, chapterNum: number): ChapterInsight | null {
        return CHAPTER_INSIGHTS.find(
            insight => insight.book === bookAbbrev.toLowerCase() && insight.chapter === chapterNum
        ) || null;
    },

    hasInsight(bookAbbrev: string, chapterNum: number): boolean {
        return this.getInsight(bookAbbrev, chapterNum) !== null;
    },

    getGenericInsight(bookName: string, chapterNum: number): ChapterInsight {
        return {
            book: bookName,
            chapter: chapterNum,
            summary: 'Continue lendo e meditando neste capítulo. Peça ao Espírito Santo que revele verdades específicas para sua vida.',
            practicalApplication: [
                'Ore pedindo entendimento antes de ler',
                'Identifique um versículo que tocou seu coração',
                'Pense em como aplicar esse versículo hoje'
            ]
        };
    }
};
