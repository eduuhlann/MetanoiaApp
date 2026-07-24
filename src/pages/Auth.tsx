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

function InteractiveGrid() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: -1000, y: -1000 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animId: number;
        const gridSize = 50;
        const influenceRadius = 200;
        const maxBend = 60;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };

        const handleMouseLeave = () => {
            mouseRef.current = { x: -1000, y: -1000 };
        };

        const bendFactor = (px: number, py: number, mx: number, my: number) => {
            const dx = px - mx;
            const dy = py - my;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > influenceRadius || dist < 1) return 0;
            return Math.pow(1 - dist / influenceRadius, 3);
        };

        const displacedPos = (px: number, py: number, mx: number, my: number) => {
            const dx = px - mx;
            const dy = py - my;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > influenceRadius || dist < 1) return { x: px, y: py };
            const t = Math.pow(1 - dist / influenceRadius, 3);
            const angle = Math.atan2(dy, dx);
            return {
                x: px + Math.cos(angle) * t * maxBend,
                y: py + Math.sin(angle) * t * maxBend,
            };
        };

        const draw = () => {
            const { width, height } = canvas;
            const mx = mouseRef.current.x;
            const my = mouseRef.current.y;

            ctx.clearRect(0, 0, width, height);

            const cols = Math.ceil(width / gridSize) + 1;
            const rows = Math.ceil(height / gridSize) + 1;

            const pts: { x: number; y: number }[][] = [];
            for (let r = 0; r <= rows; r++) {
                pts[r] = [];
                for (let c = 0; c <= cols; c++) {
                    pts[r][c] = displacedPos(c * gridSize, r * gridSize, mx, my);
                }
            }

            ctx.lineWidth = 0.5;

            for (let r = 0; r <= rows; r++) {
                for (let c = 0; c <= cols; c++) {
                    const p = pts[r][c];
                    const bf = bendFactor(p.x, p.y, mx, my);
                    ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + bf * 0.85})`;

                    if (c < cols) {
                        const next = pts[r][c + 1];
                        const midX = (p.x + next.x) / 2;
                        const midY = (p.y + next.y) / 2;
                        const cm = bendFactor(midX, midY, mx, my);
                        const cdx = midX - mx;
                        const cdy = midY - my;
                        const cd = Math.sqrt(cdx * cdx + cdy * cdy);
                        const ca = Math.atan2(cdy, cdx);
                        const cpX = midX + Math.cos(ca) * cm * maxBend * 0.5;
                        const cpY = midY + Math.sin(ca) * cm * maxBend * 0.5;

                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.quadraticCurveTo(cpX, cpY, next.x, next.y);
                        ctx.stroke();
                    }

                    if (r < rows) {
                        const below = pts[r + 1][c];
                        const midX = (p.x + below.x) / 2;
                        const midY = (p.y + below.y) / 2;
                        const cm = bendFactor(midX, midY, mx, my);
                        const cdx = midX - mx;
                        const cdy = midY - my;
                        const cd = Math.sqrt(cdx * cdx + cdy * cdy);
                        const ca = Math.atan2(cdy, cdx);
                        const cpX = midX + Math.cos(ca) * cm * maxBend * 0.5;
                        const cpY = midY + Math.sin(ca) * cm * maxBend * 0.5;

                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.quadraticCurveTo(cpX, cpY, below.x, below.y);
                        ctx.stroke();
                    }
                }
            }

            animId = requestAnimationFrame(draw);
        };

        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);
        resize();
        draw();

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full pointer-events-none z-0"
            style={{ background: 'var(--bg-primary)' }}
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
        <div className="h-screen text-white relative overflow-hidden font-sans selection:bg-[var(--accent-soft)] selection:text-white" style={{ background: 'var(--bg-primary)' }}>
            <InteractiveGrid />

            <div className="relative z-10 h-full flex flex-col lg:flex-row items-center justify-center lg:gap-20 p-4 md:p-6 overflow-hidden">
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
                            animate={{ y: [0, -15, 0] }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <div className="w-full h-auto relative z-10 transition-all cursor-pointer flex items-center justify-center">
                                <img src={MetanoiaStory} alt="Metanoia" className="w-[1100px] h-auto object-contain" />
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
                        <div className="backdrop-blur-3xl rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-8 md:p-14 shadow-2xl shadow-black/50 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--accent-soft)' }}>
                            <div className="mb-10">
                                <div className="lg:hidden mb-8">
                                    <img src={MetanoiaStory} alt="Metanoia" className="w-full max-w-[280px] h-auto object-contain mx-auto" />
                                </div>
                                <h1 className="text-4xl md:text-5xl lg:text-6xl font-outfit font-extrabold tracking-[-0.05em] mb-4 leading-[0.9] uppercase group" style={{ color: 'var(--text-primary)' }}>
                                    BEM-VINDO AO <br/>
                                    <span style={{ color: 'var(--accent-solid)' }} className="group-hover:opacity-80 transition-opacity duration-700">MetanoiaApp</span>
                                </h1>
                                <p className="text-[10px] sm:text-[9px] font-bold tracking-[0.5em] uppercase" style={{ color: 'var(--text-muted)' }}>
                                    Escolha como se conectar
                                </p>
                            </div>

                            <div className="space-y-4">
                                <button
                                    onClick={() => handleOAuthLogin('google')}
                                    disabled={loading}
                                    className="w-full py-6 rounded-2xl font-outfit font-black text-[12px] tracking-widest flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 uppercase group relative overflow-hidden"
                                    style={{ background: 'var(--accent-solid)', boxShadow: '0 20px 50px -20px var(--danger)', color: 'var(--text-on-accent)' }}
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
                                    className="w-full py-6 rounded-2xl font-outfit font-black text-[12px] tracking-widest flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 uppercase group relative overflow-hidden"
                                    style={{ background: 'var(--accent-solid)', boxShadow: '0 20px 50px -20px var(--accent-hover)', color: 'var(--text-on-accent)' }}
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
                                    style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger-soft)', color: 'var(--accent-solid)' }}
                                >
                                    <AlertCircle size={16} />
                                    {error}
                                </motion.div>
                            )}

                            <div className="mt-12 pt-8" style={{ borderTop: '1px solid var(--border)' }}>
                                <p className="text-[10px] sm:text-[9px] font-black tracking-[0.3em] uppercase leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                                    Acesso seguro via Supabase Auth.<br/>
                                    Seus dados estão protegidos.
                                </p>
                            </div>
                        </div>

                        <p className="mt-12 text-center text-[10px] sm:text-[9px] font-black tracking-[0.4em] leading-relaxed uppercase" style={{ color: 'var(--text-dim)' }}>
                            AO CONTINUAR VOCÊ CONCORDA COM OS<br />
                            <span className="underline underline-offset-8 text-[9px] sm:text-[8px]" style={{ color: 'var(--text-muted)', textDecorationColor: 'var(--accent-soft)' }}>
                                TERMOS E PRIVACIDADE
                            </span>
                        </p>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
