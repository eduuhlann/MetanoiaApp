import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
    AlertCircle,
    ArrowRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { translateAuthError } from '../services/authErrors';
import MetanoiaStory from '../assets/MetanoiaStory.png';

function AuthParticles() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animId: number;
        let particles: { x: number; y: number; size: number; vx: number; vy: number; opacity: number }[] = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const init = () => {
            particles = [];
            const count = Math.floor((canvas.width * canvas.height) / 8000);
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: Math.random() * 2 + 0.5,
                    vx: (Math.random() - 0.5) * 0.4,
                    vy: (Math.random() - 0.5) * 0.4,
                    opacity: Math.random() * 0.6 + 0.2,
                });
            }
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (const p of particles) {
                ctx.globalAlpha = p.opacity;
                ctx.fillStyle = '#D3D4D9';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;
            }
            animId = requestAnimationFrame(draw);
        };

        const handleResize = () => { resize(); init(); };
        window.addEventListener('resize', handleResize);
        resize();
        init();
        draw();

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full pointer-events-none z-0"
            style={{ background: '#252627' }}
        />
    );
}

export default function Auth() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const handleOAuthLogin = async (provider: 'google' | 'discord') => {
        setLoading(true);
        setError('');
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${import.meta.env.VITE_SITE_URL || window.location.origin}/auth/callback`,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                },
            });
            if (error) throw error;
        } catch (err: any) {
            setError(translateAuthError(err.message));
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen text-white relative overflow-x-hidden font-sans selection:bg-[#4B88A2]/30 selection:text-white" style={{ background: '#252627' }}>
            <AuthParticles />

            <div className="relative z-10 min-h-screen flex flex-col lg:flex-row items-center justify-center lg:gap-20 p-4 md:p-6">
                <div className="hidden lg:flex flex-1 items-center justify-center lg:justify-center order-2 lg:order-1" style={{ perspective: 1200 }}>
                    <motion.div
                        initial={{ opacity: 0, y: 80, scale: 0.85, rotateX: 40, rotateY: -15 }}
                        animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0, rotateY: 0 }}
                        transition={{ 
                            duration: 1.4, 
                            type: "spring", 
                            stiffness: 80,
                            damping: 14,
                            delay: 0.2
                        }}
                        className="relative"
                    >
                        <motion.div
                            animate={{ opacity: [0.15, 0.45, 0.15], scale: [0.95, 1.15, 0.95] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -inset-10 blur-[80px] rounded-[50%] z-0"
                            style={{ pointerEvents: 'none', background: 'rgba(75, 136, 162, 0.15)' }}
                        />
                        
                        <motion.div
                            animate={{ y: [0, -15, 0] }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <div className="w-full h-auto relative z-10 transition-all cursor-pointer flex items-center justify-center">
                                <img src={MetanoiaStory} alt="Metanoia" className="w-[1100px] h-auto object-contain drop-shadow-[0_0_30px_rgba(75,136,162,0.2)]" />
                            </div>
                        </motion.div>
                    </motion.div>
                </div>

                <div className="flex-1 flex items-center justify-center lg:justify-start order-1 lg:order-2 w-full">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="w-full max-w-xl"
                    >
                        <div className="backdrop-blur-3xl rounded-[3rem] p-6 sm:p-8 md:p-14 shadow-2xl shadow-black/50 text-center" style={{ background: 'rgba(37, 38, 39, 0.8)', border: '1px solid rgba(75, 136, 162, 0.2)' }}>
                            <div className="mb-10">
                                <div className="lg:hidden mb-8">
                                    <img src={MetanoiaStory} alt="Metanoia" className="w-full max-w-[280px] h-auto object-contain mx-auto drop-shadow-[0_0_20px_rgba(75,136,162,0.2)]" />
                                </div>
                                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-outfit font-extrabold tracking-[-0.05em] mb-4 leading-[0.9] uppercase group" style={{ color: '#FFF9FB' }}>
                                    BEM-VINDO AO <br/>
                                    <span style={{ color: '#4B88A2' }} className="group-hover:opacity-80 transition-opacity duration-700">MetanoiaApp</span>
                                </h1>
                                <p className="text-[11px] font-bold tracking-[0.5em] uppercase" style={{ color: '#D3D4D9' }}>
                                    Escolha como se conectar
                                </p>
                            </div>

                            <div className="space-y-4">
                                <button
                                    onClick={() => handleOAuthLogin('google')}
                                    disabled={loading}
                                    className="w-full py-6 rounded-2xl font-outfit font-black text-[12px] tracking-widest flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 uppercase group relative overflow-hidden text-white"
                                    style={{ background: '#BB0A21', boxShadow: '0 20px 50px -20px rgba(187, 10, 33, 0.5)' }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="group-hover:scale-110 transition-transform">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335" />
                                    </svg>
                                    Continuar com Google
                                    <ArrowRight size={16} className="ml-2 opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                </button>

                                <button
                                    onClick={() => handleOAuthLogin('discord')}
                                    disabled={loading}
                                    className="w-full text-white py-6 rounded-2xl font-outfit font-black text-[12px] tracking-widest flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 uppercase group relative overflow-hidden"
                                    style={{ background: '#4B88A2', boxShadow: '0 20px 50px -20px rgba(75, 136, 162, 0.5)' }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" className="bi bi-discord group-hover:scale-110 transition-transform" viewBox="0 0 16 16">
                                        <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/>
                                    </svg>
                                    Continuar com Discord
                                    <ArrowRight size={16} className="ml-2 opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                </button>
                            </div>

                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-8 flex items-center justify-center gap-3 p-4 rounded-2xl text-[10px] font-black tracking-widest uppercase"
                                    style={{ background: 'rgba(187, 10, 33, 0.1)', border: '1px solid rgba(187, 10, 33, 0.2)', color: '#BB0A21' }}
                                >
                                    <AlertCircle size={16} />
                                    {error}
                                </motion.div>
                            )}

                            <div className="mt-12 pt-8" style={{ borderTop: '1px solid rgba(75, 136, 162, 0.1)' }}>
                                <p className="text-[11px] font-black tracking-[0.3em] uppercase leading-relaxed" style={{ color: 'rgba(211, 212, 217, 0.3)' }}>
                                    Acesso seguro via Supabase Auth.<br/>
                                    Seus dados estão protegidos.
                                </p>
                            </div>
                        </div>

                        <p className="mt-12 text-center text-[11px] font-black tracking-[0.4em] leading-relaxed uppercase" style={{ color: 'rgba(211, 212, 217, 0.2)' }}>
                            AO CONTINUAR VOCÊ CONCORDA COM OS<br />
                            <span className="underline underline-offset-8 text-[10px]" style={{ color: 'rgba(211, 212, 217, 0.3)', textDecorationColor: 'rgba(75, 136, 162, 0.2)' }}>
                                TERMOS E PRIVACIDADE
                            </span>
                        </p>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
