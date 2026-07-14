import React, { useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { usePreferences } from '../contexts/PreferencesContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ParticleBackgroundProps {
    forceParticles?: boolean;
}

const ParticleBackground: React.FC<ParticleBackgroundProps> = ({ forceParticles = false }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { preferences } = usePreferences();
    const location = useLocation();

    useEffect(() => {
        if (!forceParticles && preferences.wallpaper !== 'particles') return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Array<{ x: number, y: number, size: number, speedX: number, speedY: number, opacity: number }> = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const createParticles = () => {
            particles = [];
            const count = Math.floor(window.innerWidth / 15);
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: Math.random() * 1.5 + 0.5,
                    speedX: (Math.random() - 0.5) * 0.3,
                    speedY: (Math.random() - 0.5) * 0.3,
                    opacity: Math.random() * 0.5 + 0.1
                });
            }
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';

            particles.forEach(p => {
                ctx.globalAlpha = p.opacity;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();

                p.x += p.speedX;
                p.y += p.speedY;

                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;
            });

            animationFrameId = requestAnimationFrame(draw);
        };

        window.addEventListener('resize', resize);
        resize();
        createParticles();
        draw();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [preferences.wallpaper, forceParticles]);

    return (
        <div className={cn(
            "fixed inset-0 pointer-events-none z-[-1] transition-colors duration-1000 bg-black",
            preferences.wallpaper === 'mesh' && "bg-wallpaper-mesh",
            preferences.wallpaper === 'aurora' && "bg-wallpaper-aurora",
            preferences.wallpaper === 'gradient' && "bg-wallpaper-gradient",
            preferences.wallpaper === 'none' && "bg-wallpaper-none"
        )}>
            {(forceParticles || preferences.wallpaper === 'particles') && (
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60 mix-blend-screen" />
            )}

            {preferences.wallpaper === 'custom' && preferences.customWallpaper && (
                <div className="absolute inset-0 w-full h-full overflow-hidden">
                    {preferences.customWallpaper.type === 'video' ? (
                        <video
                            src={preferences.customWallpaper.url}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <img
                            src={preferences.customWallpaper.url}
                            alt="Background"
                            className="w-full h-full object-cover"
                        />
                    )}
                    <div className="absolute inset-0 bg-black/15" />
                </div>
            )}
        </div>
    );
};

export default ParticleBackground;
