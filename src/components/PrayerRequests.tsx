import React, { useState } from 'react';
import { Heart, Send, CheckCircle2 } from 'lucide-react';

interface PrayerRequest {
  id: string;
  author: string;
  content: string;
  date: string;
  prayed: number;
  hasPrayed: boolean;
}

export default function PrayerRequests() {
  const [newRequest, setNewRequest] = useState('');
  const [requests, setRequests] = useState<PrayerRequest[]>([
    {
      id: '1',
      author: 'Lucas S.',
      content: 'Peço oração pela saúde da minha avó que fará uma cirurgia amanhã de manhã.',
      date: 'Hoje, 09:30',
      prayed: 12,
      hasPrayed: false
    },
    {
      id: '2',
      author: 'Mariana',
      content: 'Orem pelas minhas provas da faculdade esta semana, estou muito ansiosa.',
      date: 'Ontem',
      prayed: 24,
      hasPrayed: true
    },
    {
      id: '3',
      author: 'Anônimo',
      content: 'Por libertação de um vício que tenho lutado há anos. Preciso de força.',
      date: 'Ontem',
      prayed: 45,
      hasPrayed: false
    }
  ]);

  const handlePray = (id: string) => {
    setRequests(requests.map(req => {
      if (req.id === id) {
        return {
          ...req,
          prayed: req.hasPrayed ? req.prayed - 1 : req.prayed + 1,
          hasPrayed: !req.hasPrayed
        };
      }
      return req;
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequest.trim()) return;
    
    const newReq: PrayerRequest = {
      id: Date.now().toString(),
      author: 'Você',
      content: newRequest,
      date: 'Agora',
      prayed: 0,
      hasPrayed: false
    };
    
    setRequests([newReq, ...requests]);
    setNewRequest('');
  };

  return (
    <div className="p-4 space-y-6 pb-20">
      <div className="bg-white rounded-2xl shadow-sm border border-app-gray/30 p-5">
        <h2 className="text-lg font-bold text-app-dark mb-4 flex items-center gap-2">
          <Heart size={20} className="text-app-crimson" />
          Novo Pedido
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            className="w-full h-24 p-3 border border-app-gray rounded-xl focus:outline-none focus:ring-2 focus:ring-app-crimson/50 resize-none text-sm"
            placeholder="Como podemos orar por você hoje?"
            value={newRequest}
            onChange={(e) => setNewRequest(e.target.value)}
          />
          <div className="flex justify-between items-center">
            <label className="flex items-center gap-2 text-xs text-app-dark/60 cursor-pointer">
              <input type="checkbox" className="rounded text-app-crimson focus:ring-app-crimson" />
              Enviar anonimamente
            </label>
            <button 
              type="submit"
              disabled={!newRequest.trim()}
              className="bg-app-crimson text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-app-crimson/90 transition-colors disabled:opacity-50 text-sm"
            >
              <Send size={16} />
              Enviar
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold tracking-widest uppercase text-app-dark/50 px-2">
          Mural de Orações
        </h3>
        
        {requests.map((req) => (
          <div key={req.id} className="bg-white rounded-2xl shadow-sm border border-app-gray/30 p-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="font-bold text-app-dark">{req.author}</span>
                <span className="text-xs text-app-dark/50 ml-2">{req.date}</span>
              </div>
            </div>
            <p className="text-app-dark/80 text-sm mb-4 leading-relaxed">
              {req.content}
            </p>
            <div className="flex items-center justify-between pt-3 border-t border-app-gray/30">
              <span className="text-xs text-app-dark/60 font-medium">
                {req.prayed} {req.prayed === 1 ? 'pessoa orou' : 'pessoas oraram'}
              </span>
              <button 
                onClick={() => handlePray(req.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  req.hasPrayed 
                    ? 'bg-app-teal/10 text-app-teal' 
                    : 'bg-app-snow text-app-dark/60 hover:bg-app-gray/50'
                }`}
              >
                <CheckCircle2 size={16} />
                {req.hasPrayed ? 'Já orei' : 'Vou orar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
