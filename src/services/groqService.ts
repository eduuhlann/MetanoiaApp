const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';

export const callGroqAPI = async (prompt: string, model: string = 'llama-3.3-70b-versatile'): Promise<string> => {
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    if (!GROQ_API_KEY) {
        throw new Error('GROQ API Key is missing.');
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 4096,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Erro na chamada da API Groq (${response.status})`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
};

export const generateDevotional = async (
    topic: string,
    book: string,
    theme: string,
    durationDays: number = 1
): Promise<{
    title: string;
    content: string;
    verse: string;
    daily_readings: {
        day: number;
        title: string;
        verse: string;
        reading: string;
        reflection: string;
    }[];
} | null> => {
    if (!GROQ_API_KEY) return null;

    try {
        const durationText = durationDays === 1
            ? 'Um único devocional completo.'
            : `Um devocional de ${durationDays} dias. Cada dia deve ter um versículo diferente para ler, uma reflexão e uma aplicação prática.`;

        const prompt = `
Atue como um pastor e teólogo cristão experiente,熟悉 com a Bíblia NVI (Nova Versão Internacional).
Gere um devocional profundo e pessoal com base nas seguintes informações:

- Assunto/Tema principal: ${topic}
- Livro bíblico: ${book || 'A Bíblia (Deus escolherá o melhor livro)'}
- Foco/Filtro: ${theme || 'fé e esperança'}
- Duração: ${durationText}

IMPORTANTE: Use SEMPRE a tradução NVI (Nova Versão Internacional) para os versículos.

Gere um devocional contendo:
1. Título criativo (curto, máx 6 palavras, sem emoji)
2. Texto devocional introdutório (2-3 parágrafos reflexivos, tom pastoral e acolhedor)
3. Um versículo bíblico principal (referência completa: livro, capítulo, versículo, na NVI)
4. Para devocionais de múltiplos dias (${durationDays > 1 ? `divididos em ${durationDays} dias` : 'dia único'}):
   - Cada dia deve ter um título próprio
   - Cada dia deve ter um versículo bíblico específico (diferente para cada dia, todos do mesmo livro se possível)
   - Cada dia deve ter uma leitura bíblica (texto do versículo transcrito)
   - Cada dia deve ter uma reflexão pessoal e aplicação prática

Retorne APENAS um JSON válido no formato:
{
  "title": "Título aqui",
  "content": "Texto introdutório do devocional aqui...",
  "verse": "João 3:16",
  "daily_readings": [
    {
      "day": 1,
      "title": "Título do Dia 1",
      "verse": "João 3:16",
      "reading": "Texto do versículo transcrito da NVI...",
      "reflection": "Reflexão e aplicação prática para o dia..."
    }
  ]
}

Se for um devocional de 1 dia, o daily_readings deve conter apenas 1 objeto com day: 1.
Se for de múltiplos dias, gere ${durationDays} objetos no daily_readings, um para cada dia.`;

        const text = await callGroqAPI(prompt);

        let jsonData = null;
        try {
            jsonData = JSON.parse(text);
        } catch (e) {
            const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
            }
        }

        if (!jsonData) {
            throw new Error('Could not parse valid JSON from AI response');
        }

        // Ensure daily_readings exists and has correct structure
        if (!jsonData.daily_readings || !Array.isArray(jsonData.daily_readings)) {
            jsonData.daily_readings = [{
                day: 1,
                title: jsonData.title,
                verse: jsonData.verse,
                reading: jsonData.content,
                reflection: jsonData.content
            }];
        }

        return jsonData;
    } catch (error) {
        console.error('Error generating devotional:', error);
        return null;
    }
};
