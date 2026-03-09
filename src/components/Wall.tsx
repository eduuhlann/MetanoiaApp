import React from 'react';
import { MessageSquare, Image as ImageIcon, AlertCircle, Heart } from 'lucide-react';

interface Post {
  id: string;
  author: string;
  avatar: string;
  content: string;
  image?: string;
  time: string;
  type: 'aviso' | 'testemunho' | 'foto';
  likes: number;
  comments: number;
}

export default function Wall() {
  const posts: Post[] = [
    {
      id: '1',
      author: 'Liderança',
      avatar: 'L',
      content: 'Pessoal, lembrando que nosso culto de sábado começará 30 minutos mais cedo devido ao ensaio do louvor. Não se atrasem!',
      time: 'Há 2 horas',
      type: 'aviso',
      likes: 15,
      comments: 3
    },
    {
      id: '2',
      author: 'Pedro Alves',
      avatar: 'P',
      content: 'Que culto abençoado tivemos ontem! Deus falou muito forte ao meu coração sobre perdão. Alguém mais foi impactado?',
      time: 'Ontem',
      type: 'testemunho',
      likes: 32,
      comments: 12
    },
    {
      id: '3',
      author: 'Mídia Jovens',
      avatar: 'M',
      content: 'Fotos do nosso último acampamento já estão disponíveis! Que tempo precioso vivemos juntos.',
      image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      time: 'Há 2 dias',
      type: 'foto',
      likes: 56,
      comments: 8
    }
  ];

  const getTypeIcon = (type: Post['type']) => {
    switch (type) {
      case 'aviso': return <AlertCircle size={14} className="text-app-crimson" />;
      case 'testemunho': return <MessageSquare size={14} className="text-app-teal" />;
      case 'foto': return <ImageIcon size={14} className="text-app-dark/60" />;
    }
  };

  return (
    <div className="p-4 space-y-6 pb-20">
      <div className="bg-white rounded-2xl shadow-sm border border-app-gray/30 p-4 flex gap-3 items-center">
        <div className="w-10 h-10 bg-app-teal/10 rounded-full flex items-center justify-center text-app-teal font-bold">
          V
        </div>
        <input 
          type="text" 
          placeholder="Compartilhe algo com o grupo..."
          className="flex-1 bg-app-snow border-none rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-teal/50"
        />
      </div>

      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-app-gray/30 overflow-hidden">
            <div className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                    post.type === 'aviso' ? 'bg-app-crimson' : 'bg-app-dark'
                  }`}>
                    {post.avatar}
                  </div>
                  <div>
                    <h4 className="font-bold text-app-dark text-sm">{post.author}</h4>
                    <div className="flex items-center gap-1 text-xs text-app-dark/50">
                      {getTypeIcon(post.type)}
                      <span className="capitalize">{post.type}</span>
                      <span>•</span>
                      <span>{post.time}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <p className="text-app-dark/80 text-sm leading-relaxed mb-3">
                {post.content}
              </p>
            </div>
            
            {post.image && (
              <div className="w-full h-48 bg-app-gray">
                <img 
                  src={post.image} 
                  alt="Post attachment" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            
            <div className="px-4 py-3 border-t border-app-gray/30 flex gap-4">
              <button className="flex items-center gap-1.5 text-xs font-bold text-app-dark/60 hover:text-app-crimson transition-colors">
                <Heart size={16} />
                {post.likes}
              </button>
              <button className="flex items-center gap-1.5 text-xs font-bold text-app-dark/60 hover:text-app-teal transition-colors">
                <MessageSquare size={16} />
                {post.comments}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
