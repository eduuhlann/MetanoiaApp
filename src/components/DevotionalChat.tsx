import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, ArrowLeft, Users, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

interface ChatMessage {
    id: string;
    user_id: string;
    content: string;
    created_at: string;
    profiles?: {
        display_name: string | null;
        username: string | null;
        avatar_url: string | null;
    };
}

interface GroupInfo {
    id: string;
    name: string;
    photo_url: string | null;
    devotional_id: string;
    devotional?: {
        title: string;
        daily_readings: any;
    };
}

interface Props {
    groupId: string;
    onBack: () => void;
}

export default function DevotionalChat({ groupId, onBack }: Props) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [group, setGroup] = useState<GroupInfo | null>(null);
    const [sending, setSending] = useState(false);
    const [showReadings, setShowReadings] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchGroup();
        fetchMessages();

        const channel = supabase
            .channel(`devotional-messages-${groupId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'devotional_messages',
                    filter: `group_id=eq.${groupId}`,
                },
                (payload) => {
                    fetchMessages();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [groupId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchGroup = async () => {
        try {
            const { data } = await supabase
                .from('devotional_groups')
                .select('*, devotionals!devotional_groups_devotional_id_fkey(title, daily_readings)')
                .eq('id', groupId)
                .single();
            if (data) {
                setGroup({
                    id: data.id,
                    name: data.name,
                    photo_url: data.photo_url,
                    devotional_id: data.devotional_id,
                    devotional: data.devotionals,
                });
            }
        } catch (err) {
            console.error('Error fetching group:', err);
        }
    };

    const fetchMessages = async () => {
        try {
            const { data } = await supabase
                .from('devotional_messages')
                .select('*, profiles!devotional_messages_user_id_fkey(display_name, username, avatar_url)')
                .eq('group_id', groupId)
                .order('created_at', { ascending: true })
                .limit(100);

            if (data) {
                setMessages(data.map((m: any) => ({
                    id: m.id,
                    user_id: m.user_id,
                    content: m.content,
                    created_at: m.created_at,
                    profiles: m.profiles,
                })));
            }
        } catch (err) {
            console.error('Error fetching messages:', err);
        }
    };

    const handleSend = async () => {
        if (!newMessage.trim() || !user || sending) return;
        setSending(true);
        try {
            await supabase.from('devotional_messages').insert({
                group_id: groupId,
                user_id: user.id,
                content: newMessage.trim(),
            });
            setNewMessage('');
            inputRef.current?.focus();
        } catch (err) {
            console.error('Error sending message:', err);
        } finally {
            setSending(false);
        }
    };

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const today = new Date();
        if (d.toDateString() === today.toDateString()) return 'Hoje';
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    };

    const dailyReadings = group?.devotional?.daily_readings;

    return (
        <div className="flex flex-col h-dvh" style={{ background: 'var(--bg-primary)' }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)', backdropFilter: 'blur(20px)' }}>
                <button onClick={onBack} className="p-2 rounded-xl transition-colors hover:bg-white/5" style={{ color: 'var(--text-secondary)' }}>
                    <ArrowLeft size={20} />
                </button>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {group?.photo_url ? (
                        <img src={group.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--border-strong)' }}>
                            <Users size={18} style={{ color: 'var(--accent-solid)' }} />
                        </div>
                    )}
                    <div className="min-w-0">
                        <h3 className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{group?.name || 'Grupo'}</h3>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{group?.devotional?.title}</p>
                    </div>
                </div>
                {dailyReadings && dailyReadings.length > 0 && (
                    <button
                        onClick={() => setShowReadings(!showReadings)}
                        className="p-2 rounded-xl transition-colors hover:bg-white/5"
                        style={{ color: showReadings ? 'var(--accent-solid)' : 'var(--text-muted)' }}
                    >
                        <BookOpen size={20} />
                    </button>
                )}
            </div>

            {/* Daily readings panel */}
            <AnimatePresence>
                {showReadings && dailyReadings && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-b"
                        style={{ borderColor: 'var(--border)', background: 'rgba(255, 255, 255, 0.02)' }}
                    >
                        <div className="p-4 max-h-64 overflow-y-auto space-y-3">
                            <h4 className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: 'var(--text-muted)' }}>Leituras do Devocional</h4>
                            {dailyReadings.map((reading: any, idx: number) => (
                                <div key={idx} className="p-3 rounded-xl" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-soft)', color: 'var(--accent-solid)' }}>Dia {reading.day}</span>
                                        <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{reading.title}</span>
                                    </div>
                                    <p className="text-xs font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{reading.verse}</p>
                                    <p className="text-[11px] italic leading-relaxed" style={{ color: 'var(--text-secondary)' }}>"{reading.reading}"</p>
                                    <p className="text-[11px] mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{reading.reflection}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--border)' }}>
                            <Users size={28} style={{ color: 'var(--accent-hover)' }} />
                        </div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Nenhuma mensagem ainda</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Comece a conversa sobre o devocional</p>
                    </div>
                )}
                {messages.map((msg) => {
                    const isOwn = msg.user_id === user?.id;
                    return (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn("flex gap-2", isOwn ? "justify-end" : "justify-start")}
                        >
                            {!isOwn && (
                                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1" style={{ background: 'var(--border-strong)' }}>
                                    {msg.profiles?.avatar_url ? (
                                        <img src={msg.profiles.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        <span className="text-[10px] font-bold" style={{ color: 'var(--accent-solid)' }}>
                                            {(msg.profiles?.display_name || msg.profiles?.username || '?').charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                            )}
                            <div className={cn("max-w-[75%]", isOwn ? "items-end" : "items-start")}>
                                {!isOwn && (
                                    <p className="text-[10px] font-bold mb-1 px-1" style={{ color: 'var(--text-secondary)' }}>
                                        {msg.profiles?.display_name || msg.profiles?.username || 'Desconhecido'}
                                    </p>
                                )}
                                <div
                                    className={cn("px-4 py-2.5 rounded-2xl text-sm leading-relaxed", isOwn ? "rounded-br-md" : "rounded-bl-md")}
                                    style={{
                                        background: isOwn ? 'var(--accent-soft)' : 'rgba(255, 255, 255, 0.05)',
                                        border: isOwn ? '1px solid var(--accent-soft)' : '1px solid rgba(255, 255, 255, 0.05)',
                                        color: 'var(--text-primary)'
                                    }}
                                >
                                    {msg.content}
                                </div>
                                <p className="text-[9px] mt-1 px-1" style={{ color: 'var(--text-muted)' }}>
                                    {formatDate(msg.created_at)} {formatTime(msg.created_at)}
                                </p>
                            </div>
                        </motion.div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)', backdropFilter: 'blur(20px)' }}>
                <div className="flex items-center gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        placeholder="Digite sua mensagem..."
                        className="flex-1 rounded-2xl py-3 px-4 focus:outline-none text-sm"
                        style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--text-primary)' }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!newMessage.trim() || sending}
                        className="p-3.5 rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-30"
                        style={{ background: 'var(--accent-solid)' }}
                    >
                        <Send size={18} className="text-white" />
                    </button>
                </div>
            </div>
        </div>
    );
}
