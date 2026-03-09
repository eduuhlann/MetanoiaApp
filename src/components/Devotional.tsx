import React, { useState } from 'react';
import { BookOpen, Edit3, Save } from 'lucide-react';

export default function Devotional() {
  const [notes, setNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="p-4 space-y-6 pb-20">
      <div className="bg-white rounded-2xl shadow-sm border border-app-gray/30 overflow-hidden">
        <div className="bg-app-teal p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10 transform translate-x-4 -translate-y-4">
            <BookOpen size={120} />
          </div>
          <h2 className="text-sm font-bold tracking-widest uppercase mb-2 opacity-80">Versículo do Dia</h2>
          <p className="text-2xl font-serif italic mb-4 leading-tight">
            "Não fui eu que ordenei a você? Seja forte e corajoso! Não se apavore nem desanime, pois o Senhor, o seu Deus, estará com você por onde você andar."
          </p>
          <p className="text-sm font-bold">Josué 1:9</p>
        </div>
        
        <div className="p-6">
          <h3 className="text-lg font-bold text-app-dark mb-3">Reflexão</h3>
          <p className="text-app-dark/80 leading-relaxed text-sm">
            Muitas vezes nos sentimos intimidados pelos desafios da vida, seja na escola, no trabalho ou em nossas decisões diárias. Deus não nos promete uma vida sem lutas, mas Ele garante a Sua presença constante. A verdadeira coragem não é a ausência de medo, mas a decisão de avançar confiando que Deus está no controle. Onde você precisa ser forte e corajoso hoje?
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-app-gray/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-app-dark flex items-center gap-2">
            <Edit3 size={20} className="text-app-crimson" />
            Minhas Anotações
          </h3>
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="text-app-teal text-sm font-bold hover:underline"
          >
            {isEditing ? 'Cancelar' : 'Editar'}
          </button>
        </div>
        
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              className="w-full h-32 p-3 border border-app-gray rounded-xl focus:outline-none focus:ring-2 focus:ring-app-teal/50 resize-none text-sm"
              placeholder="O que Deus falou com você hoje?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <button 
              onClick={() => setIsEditing(false)}
              className="w-full bg-app-teal text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-app-teal/90 transition-colors"
            >
              <Save size={18} />
              Salvar Anotação
            </button>
          </div>
        ) : (
          <div 
            className="min-h-[100px] p-4 bg-app-snow rounded-xl text-sm text-app-dark/70 italic border border-dashed border-app-gray"
            onClick={() => setIsEditing(true)}
          >
            {notes || "Toque em editar para adicionar suas anotações sobre o devocional de hoje..."}
          </div>
        )}
      </div>
    </div>
  );
}
