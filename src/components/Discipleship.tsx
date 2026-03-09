import React from 'react';
import { Users, MapPin, Clock, ChevronRight } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  leader: string;
  day: string;
  time: string;
  location: string;
  members: number;
}

export default function Discipleship() {
  const groups: Group[] = [
    {
      id: '1',
      name: 'Célula Atos',
      leader: 'Pr. Marcos & Sarah',
      day: 'Quarta-feira',
      time: '20:00',
      location: 'Centro',
      members: 12
    },
    {
      id: '2',
      name: 'Discipulado Radicais',
      leader: 'João Pedro',
      day: 'Terça-feira',
      time: '19:30',
      location: 'Bairro Sul',
      members: 8
    },
    {
      id: '3',
      name: 'Meninas com Propósito',
      leader: 'Ana Clara',
      day: 'Quinta-feira',
      time: '20:00',
      location: 'Online (Zoom)',
      members: 15
    }
  ];

  return (
    <div className="p-4 space-y-6 pb-20">
      <div className="bg-app-dark text-white rounded-2xl shadow-sm p-6 relative overflow-hidden">
        <div className="absolute -right-4 -bottom-4 opacity-10">
          <Users size={100} />
        </div>
        <h2 className="text-xl font-bold mb-2">Encontre seu grupo</h2>
        <p className="text-white/80 text-sm mb-4 leading-relaxed max-w-[80%]">
          Não caminhe sozinho. Participe de um grupo de discipulado e cresça em comunhão.
        </p>
        <button className="bg-white text-app-dark px-4 py-2 rounded-xl text-sm font-bold hover:bg-app-snow transition-colors">
          Quero participar
        </button>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold tracking-widest uppercase text-app-dark/50 px-2">
          Grupos Disponíveis
        </h3>
        
        {groups.map((group) => (
          <div key={group.id} className="bg-white rounded-2xl shadow-sm border border-app-gray/30 p-5 hover:border-app-teal/50 transition-colors cursor-pointer group">
            <div className="flex justify-between items-start mb-3">
              <h4 className="text-lg font-bold text-app-dark group-hover:text-app-teal transition-colors">
                {group.name}
              </h4>
              <div className="bg-app-snow px-2 py-1 rounded-md text-xs font-bold text-app-dark/60 flex items-center gap-1">
                <Users size={12} />
                {group.members}
              </div>
            </div>
            
            <p className="text-sm font-medium text-app-dark/80 mb-4">
              Líder: {group.leader}
            </p>
            
            <div className="space-y-2 text-xs text-app-dark/60 mb-4">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-app-teal" />
                <span>{group.day} às {group.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-app-crimson" />
                <span>{group.location}</span>
              </div>
            </div>
            
            <div className="pt-3 border-t border-app-gray/30 flex justify-end">
              <span className="text-xs font-bold text-app-teal flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Ver detalhes <ChevronRight size={14} />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
