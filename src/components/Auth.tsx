import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuthProps {
  onLogin: () => void;
}

export default function Auth({ onLogin }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulação de chamada à API (Supabase)
    setTimeout(() => {
      setIsLoading(false);
      onLogin();
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-app-snow flex justify-center font-sans text-app-dark">
      <div className="w-full max-w-md bg-white shadow-2xl relative flex flex-col h-screen overflow-hidden">
        
        {/* Header / Logo Area */}
        <div className="flex-1 bg-app-teal flex flex-col items-center justify-center p-8 relative overflow-hidden">
          {/* Background Pattern Simulation */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-radial-gradient(circle at 0 0, transparent 0, #ffffff 10px), repeating-linear-gradient(#ffffff, #ffffff)' }}></div>
          
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 flex flex-col items-center"
          >
            <div className="w-32 h-32 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30 mb-6 shadow-lg">
              {/* Placeholder para a logo enviada */}
              <div className="relative">
                <BrainCircuit size={64} className="text-white" strokeWidth={1.5} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-0.5 h-8 bg-white absolute"></div>
                  <div className="w-6 h-0.5 bg-white absolute -mt-2"></div>
                </div>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-wide">Jovens App</h1>
            <p className="text-white/80 mt-2 text-center text-sm">Conectando propósitos, fortalecendo a fé.</p>
          </motion.div>
        </div>

        {/* Form Area */}
        <div className="flex-[1.5] bg-white rounded-t-3xl -mt-6 relative z-20 px-8 pt-8 pb-safe flex flex-col">
          <div className="flex justify-center mb-8">
            <div className="flex bg-app-snow p-1 rounded-xl w-full max-w-xs">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                  isLogin ? 'bg-white text-app-teal shadow-sm' : 'text-app-dark/50 hover:text-app-dark'
                }`}
              >
                Entrar
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                  !isLogin ? 'bg-white text-app-teal shadow-sm' : 'text-app-dark/50 hover:text-app-dark'
                }`}
              >
                Cadastrar
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={isLogin ? 'login' : 'register'}
              initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
              transition={{ duration: 0.2 }}
              className="flex-1"
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-app-dark/70 uppercase tracking-wider ml-1">Nome Completo</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User size={18} className="text-app-dark/40" />
                      </div>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-app-snow border border-app-gray/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-app-teal/50 focus:border-app-teal/50 transition-all text-sm"
                        placeholder="Seu nome"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-app-dark/70 uppercase tracking-wider ml-1">E-mail</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail size={18} className="text-app-dark/40" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-app-snow border border-app-gray/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-app-teal/50 focus:border-app-teal/50 transition-all text-sm"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-xs font-bold text-app-dark/70 uppercase tracking-wider">Senha</label>
                    {isLogin && (
                      <a href="#" className="text-xs font-bold text-app-teal hover:underline">Esqueceu?</a>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock size={18} className="text-app-dark/40" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-app-snow border border-app-gray/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-app-teal/50 focus:border-app-teal/50 transition-all text-sm"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-app-crimson text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-app-crimson/90 transition-all active:scale-[0.98] mt-8 shadow-md shadow-app-crimson/20 disabled:opacity-70"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {isLogin ? 'Entrar no App' : 'Criar Conta'}
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
