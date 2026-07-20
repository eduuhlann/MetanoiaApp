import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { discipleshipService } from '../services/features/discipleshipService';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Users, UserPlus, Bell, BellDot } from 'lucide-react';

interface Notification {
    id: string;
    type: 'message' | 'invite' | 'group_invite';
    title: string;
    body: string;
    avatar_url: string | null;
    created_at: string;
    action: string;
}

function timeAgo(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'agora';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
}

const typeIcon: Record<string, React.ReactNode> = {
    message: <MessageCircle size={12} />,
    invite: <UserPlus size={12} />,
    group_invite: <Users size={12} />,
};

const typeLabel: Record<string, string> = {
    message: 'Mensagem',
    invite: 'Convite',
    group_invite: 'Grupo',
};

const typeColor: Record<string, string> = {
    message: 'bg-[#4B88A2]/20 text-[#4B88A2] border-[#4B88A2]/30',
    invite: 'bg-[#BB0A21]/20 text-[#BB0A21] border-[#BB0A21]/30',
    group_invite: 'bg-[#4B88A2]/20 text-[#4B88A2] border-[#4B88A2]/30',
};

export const NotificationBell: React.FC<{ dockMode?: boolean }> = ({ dockMode }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [count, setCount] = useState(0);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [open, setOpen] = useState(false);
    const [loadingNotifs, setLoadingNotifs] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const loadCount = useCallback(async () => {
        if (!user) return;
        const c = await discipleshipService.getNotificationCount(user.id);
        setCount(c);
    }, [user]);

    const loadNotifications = useCallback(async () => {
        if (!user) return;
        setLoadingNotifs(true);
        try {
            const notifs = await discipleshipService.getRecentNotifications(user.id);
            setNotifications(notifs);
        } finally {
            setLoadingNotifs(false);
        }
    }, [user]);

    useEffect(() => {
        if (!user) return;
        loadCount();

        const channel = supabase
            .channel('notification-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'discipleship_notes' }, () => loadCount())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'discipleship_connections', filter: `disciple_id=eq.${user.id}` }, () => loadCount())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'discipleship_group_members', filter: `user_id=eq.${user.id}` }, () => loadCount())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user, loadCount]);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const handleToggle = () => {
        if (!open) {
            loadNotifications();
        }
        setOpen(prev => !prev);
    };

    const handleNotifClick = (notif: Notification) => {
        setOpen(false);
        navigate(notif.action);
    };

    return (
        <div ref={containerRef} className={`relative ${dockMode ? 'w-full h-full' : ''}`}>
            <button
                onClick={handleToggle}
                className={dockMode 
                    ? "relative w-full h-full flex items-center justify-center"
                    : "group relative w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/20"
                }
                style={dockMode ? undefined : { background: '#252627' }}
            >
                <motion.div
                    className={dockMode ? "w-full h-full flex items-center justify-center" : ""}
                    whileHover={{ rotate: [0, 10, -10, 5, -5, 2, 0], transition: { duration: 0.9, ease: 'easeInOut' } }}
                >
                    {count > 0 ? (
                        <BellDot className={`fill-white text-white ${dockMode ? 'w-[85%] h-[85%]' : 'w-[22px] h-[22px]'}`} />
                    ) : (
                        <Bell className={`text-white ${dockMode ? 'w-[85%] h-[85%]' : 'w-[22px] h-[22px]'}`} />
                    )}
                </motion.div>

                <AnimatePresence>
                    {count > 0 && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-[#252627] flex items-center justify-center"
                            style={{ background: '#BB0A21' }}
                        >
                            <span className="text-[10px] font-black text-white">{count > 9 ? '9+' : count}</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="absolute right-0 top-[calc(100%+10px)] w-[calc(100vw-2rem)] max-w-[340px] z-[200] origin-top-right"
                        style={{ maxHeight: '480px' }}
                    >
                        <div className="bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                                <span className="text-[11px] font-black tracking-[0.2em] text-white/50 uppercase">Notificações</span>
                                {count > 0 && (
                                    <span className="text-[10px] font-black text-[#BB0A21] bg-[#BB0A21]/10 border border-[#BB0A21]/20 rounded-full px-2 py-0.5">
                                        {count} nova{count > 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>

                            <div className="overflow-y-auto" style={{ maxHeight: '380px' }}>
                                {loadingNotifs ? (
                                    <div className="flex items-center justify-center py-10">
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                            className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full"
                                        />
                                    </div>
                                ) : notifications.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                                        <Bell size={28} className="text-white/10" />
                                        <p className="text-[11px] font-bold text-white/20 tracking-widest uppercase">
                                            Sem notificações
                                        </p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-white/5">
                                        {notifications.map((notif, i) => (
                                            <motion.button
                                                key={notif.id}
                                                initial={{ opacity: 0, x: -8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.04 }}
                                                onClick={() => handleNotifClick(notif)}
                                                className="w-full flex items-start gap-3.5 px-5 py-4 hover:bg-white/5 transition-colors text-left group"
                                            >
                                                <div className="flex-shrink-0 w-9 h-9 rounded-xl overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center">
                                                    {notif.avatar_url ? (
                                                        <img src={notif.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-sm font-bold text-white/30">
                                                            {notif.title.charAt(0).toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="text-[12px] font-bold text-white truncate">
                                                            {notif.title}
                                                        </span>
                                                        <span className={`flex-shrink-0 flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full border ${typeColor[notif.type]}`}>
                                                            {typeIcon[notif.type]}
                                                            {typeLabel[notif.type]}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-white/40 truncate">{notif.body}</p>
                                                </div>

                                                <span className="flex-shrink-0 text-[10px] text-white/20 font-bold pt-0.5">
                                                    {timeAgo(notif.created_at)}
                                                </span>
                                            </motion.button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {notifications.length > 0 && (
                                <div className="border-t border-white/5 px-5 py-3">
                                    <button
                                        onClick={() => { setOpen(false); navigate('/dashboard'); }}
                                        className="w-full text-[10px] font-black tracking-[0.2em] text-white/30 hover:text-white uppercase transition-colors"
                                    >
                                        Ver tudo →
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
