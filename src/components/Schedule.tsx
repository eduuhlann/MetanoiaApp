import React from 'react';
import { Calendar, MapPin, Clock, Bell } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  type: 'culto' | 'vigilia' | 'evento' | 'acampamento';
  isNotified: boolean;
}

export default function Schedule() {
  const events: Event[] = [
    {
      id: '1',
      title: 'Culto de Jovens',
      date: 'Sábado, 14 Out',
      time: '19:30',
      location: 'Templo Principal',
      type: 'culto',
      isNotified: true
    },
    {
      id: '2',
      title: 'Vigília Jovem',
      date: 'Sexta, 20 Out',
      time: '23:00 - 05:00',
      location: 'Salão Anexo',
      type: 'vigilia',
      isNotified: false
    },
    {
      id: '3',
      title: 'Acampamento de Verão',
      date: '12 a 15 Jan',
      time: 'Saída às 08:00',
      location: 'Sítio Recanto Feliz',
      type: 'acampamento',
      isNotified: true
    }
  ];

  const getTypeColor = (type: Event['type']) => {
    switch (type) {
      case 'culto': return 'bg-app-teal text-white';
      case 'vigilia': return 'bg-app-dark text-white';
      case 'evento': return 'bg-app-gray text-app-dark';
      case 'acampamento': return 'bg-app-crimson text-white';
      default: return 'bg-app-gray text-app-dark';
    }
  };

  return (
    <div className="p-4 space-y-6 pb-20">
      <div className="bg-white rounded-2xl shadow-sm border border-app-gray/30 p-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-app-dark mb-1">Próximo Evento</h2>
          <p className="text-sm text-app-dark/60">Faltam 4 dias</p>
        </div>
        <div className="w-12 h-12 bg-app-teal/10 rounded-full flex items-center justify-center text-app-teal">
          <Calendar size={24} />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold tracking-widest uppercase text-app-dark/50 px-2">
          Agenda do Mês
        </h3>
        
        {events.map((event) => (
          <div key={event.id} className="bg-white rounded-2xl shadow-sm border border-app-gray/30 overflow-hidden">
            <div className="flex">
              <div className={`w-2 ${getTypeColor(event.type)}`} />
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${getTypeColor(event.type)}`}>
                    {event.type}
                  </span>
                  <button className={`p-1.5 rounded-full transition-colors ${
                    event.isNotified ? 'text-app-teal bg-app-teal/10' : 'text-app-dark/40 hover:bg-app-gray/50'
                  }`}>
                    <Bell size={16} />
                  </button>
                </div>
                
                <h4 className="text-lg font-bold text-app-dark mb-3">{event.title}</h4>
                
                <div className="space-y-2 text-sm text-app-dark/70">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-app-dark/40" />
                    <span>{event.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-app-dark/40" />
                    <span>{event.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-app-dark/40" />
                    <span>{event.location}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
