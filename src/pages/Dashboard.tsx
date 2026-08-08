import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { motion, useMotionValue, useTransform, useSpring } from 'motion/react';
import { FloatingDock, FloatingDockDesktop } from '../components/FloatingDock';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    MouseSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    BookOpen,
    Settings,
    LogOut,
    Calendar,
    ChevronRight,
    User,
    Palette as PaletteIcon,
    Clock,
    MapPin,
    Users,
    MessageCircle,
    Sparkles,
    Compass,
    Zap,
} from 'lucide-react';
import CustomizationModal from '../components/CustomizationModal';
import { useNavigate } from 'react-router-dom';
import ParticleBackground from '../components/ParticleBackground';
import PageTransition from '../components/PageTransition';
import { usePreferences } from '../contexts/PreferencesContext';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { getWeeklyChallenge, type WeeklyChallenge } from '../services/features/plansService';
import { discipleshipService } from '../services/features/discipleshipService';

const AnimatedIcon = ({
    fallback: FallbackIcon,
    size = 24,
    className
}: {
    src?: string,
    fallback: React.ElementType,
    size?: number,
    className?: string
}) => {
    return <FallbackIcon size={size} className={className} />;
};

function SortableCard({ id, item, navigate, glassStyle, notifCount }: { id: string, item: any, navigate: any, glassStyle: 'crystal' | 'frosted' | 'solid', notifCount?: number }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseXSpring = useSpring(x);
    const mouseYSpring = useSpring(y);

    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["17.5deg", "-17.5deg"]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-17.5deg", "17.5deg"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
        perspective: "1000px",
    };

    const getGlassClasses = () => {
        if (isDragging) {
            return "bg-white/20 border-white/40 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.2)]";
        }

        switch (glassStyle) {
            case 'crystal':
                return "bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10";
            case 'solid':
                return "bg-black/60 backdrop-blur-3xl border-white/10 hover:bg-black/40";
            case 'frosted':
            default:
                return "bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/20";
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="touch-manipulation h-full relative cursor-grab active:cursor-grabbing"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <motion.div
                style={{
                    rotateX,
                    rotateY,
                    transformStyle: "preserve-3d",
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={(e) => {
                   if (!isDragging) {
                       item.action ? item.action() : navigate(item.path!);
                   } else {
                       e.preventDefault();
                   }
                }}
                className={cn(
                    "p-5 md:p-6 border rounded-3xl text-left group transition-all h-full shadow-2xl shadow-black/20",
                    getGlassClasses()
                )}
            >
                <div
                    className="w-full h-full text-left pointer-events-none"
                    style={{ transform: "translateZ(50px)", transformStyle: "preserve-3d" }}
                >
                    <div
                        className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-5 group-hover:bg-white/20 group-hover:-translate-y-2 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all duration-300 relative"
                        style={{ transform: "translateZ(30px)" }}
                    >
                        <AnimatedIcon
                            fallback={item.icon}
                            size={20}
                            className="text-white transition-all duration-300 group-hover:scale-[1.2]"
                        />
                        {item.id === 'discipleship' && (notifCount || 0) > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-black text-white px-1" style={{ background: 'var(--danger)' }}>
                                {notifCount! > 9 ? '9+' : notifCount}
                            </span>
                        )}
                    </div>

                    <h3
                        className="text-base font-bold mb-1 tracking-tight"
                        style={{ transform: "translateZ(40px)" }}
                    >
                        {item.label}
                    </h3>
                    <p
                        className="text-white font-normal italic leading-relaxed text-[11px]"
                        style={{ transform: "translateZ(35px)" }}
                    >
                        {item.description}
                    </p>
                    <div
                        className="mt-5 flex items-center gap-1.5 text-[10px] sm:text-[9px] font-bold tracking-[0.2em] text-white transition-colors uppercase"
                        style={{ transform: "translateZ(20px)" }}
                    >
                        {item.action ? 'Abrir' : 'Acessar'} <ChevronRight size={10} />
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

const DockAvatar = ({ profile, user }: { profile: any, user: any }) => {
    const [imgError, setImgError] = useState(false);

    const meta = user?.user_metadata || {};
    const url = profile?.avatar_url || meta.avatar_url || meta.picture || meta.avatar || meta.photoURL;

    useEffect(() => {
        setImgError(false);
    }, [url]);

    if (url && !imgError) {
        return (
            <div
                className="relative w-full h-full flex items-center justify-center rounded-full overflow-hidden"
                style={{ isolation: 'isolate', transform: 'translateZ(0)', WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}
            >
                <img
                    key={url}
                    src={url}
                    alt="avatar"
                    className="absolute inset-0 w-full h-full object-cover rounded-full"
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    onError={() => setImgError(true)}
                />
            </div>
        );
    }

    return (
        <User className="w-[85%] h-[85%] text-white/40 group-hover:text-white transition-colors" />
    );
};

export default function Dashboard() {
    const { user, signOut } = useAuth();
    const { profile } = useProfile();
    const navigate = useNavigate();
    const { preferences, updatePreference } = usePreferences();
    const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);
    const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
    const [myGroups, setMyGroups] = useState<{ id: string; name: string; photo_url: string | null; devotional_title: string }[]>([]);
    const [weeklyChallenge, setWeeklyChallenge] = useState<WeeklyChallenge | null>(null);
    const [notifCount, setNotifCount] = useState(0);

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const today = new Date().toISOString().split('T')[0];
                const { data } = await supabase
                    .from('events')
                    .select('*, profiles!events_author_id_fkey(display_name, username)')
                    .gte('event_date', today)
                    .order('event_date', { ascending: true })
                    .limit(3);
                if (data) setUpcomingEvents(data);
            } catch (err) {
                console.error('Error fetching events:', err);
            }
        };

        const fetchMyGroups = async () => {
            if (!user) return;
            try {
                // Get groups where user is creator
                const { data: ownedGroups } = await supabase
                    .from('devotional_groups')
                    .select('id, name, photo_url, devotional_id, devotionals!devotional_groups_devotional_id_fkey(title)')
                    .eq('creator_id', user.id);

                // Get groups where user was invited and accepted
                const { data: acceptedInvites } = await supabase
                    .from('devotional_invites')
                    .select('devotional_id')
                    .eq('invitee_id', user.id)
                    .eq('status', 'accepted');

                let invitedGroups: any[] = [];
                if (acceptedInvites && acceptedInvites.length > 0) {
                    const devIds = acceptedInvites.map(i => i.devotional_id);
                    const { data: groups } = await supabase
                        .from('devotional_groups')
                        .select('id, name, photo_url, devotional_id, devotionals!devotional_groups_devotional_id_fkey(title)')
                        .in('devotional_id', devIds);
                    invitedGroups = groups || [];
                }

                const allGroups = [...(ownedGroups || []), ...invitedGroups];
                const mapped = allGroups.map((g: any) => ({
                    id: g.id,
                    name: g.name,
                    photo_url: g.photo_url,
                    devotional_title: g.devotionals?.title || '',
                }));
                setMyGroups(mapped);
            } catch (err) {
                console.error('Error fetching groups:', err);
            }
        };

        fetchEvents();
        fetchMyGroups();
        setWeeklyChallenge(getWeeklyChallenge());

    }, [user]);

    useEffect(() => {
        if (!user) return;
        const loadCount = async () => {
            const c = await discipleshipService.getNotificationCount(user.id);
            setNotifCount(c);
        };
        loadCount();
        const channel = supabase
            .channel('dash-notif-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'discipleship_notes' }, () => loadCount())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'discipleship_connections', filter: `disciple_id=eq.${user.id}` }, () => loadCount())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'discipleship_group_members', filter: `user_id=eq.${user.id}` }, () => loadCount())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [user]);

    const displayName = profile?.display_name || profile?.username || user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Jovem Metanoia';

    const menuItems = useMemo(() => {
        const items = [
            { id: 'plans', icon: Compass, label: 'Planos', description: 'Jornadas de estudo bíblico', path: '/plans' },
            { id: 'bible', icon: BookOpen, label: 'Bíblia', description: 'Leitura e estudo das Escrituras', path: '/bible' },
            { id: 'discipleship', icon: MessageCircle, label: 'Discipulado', description: 'Conexões e grupos', path: '/discipleship' },
            { id: 'feed', icon: Users, label: 'Membros', description: 'Veja todos os membros', path: '/feed' },
            { id: 'events', icon: Calendar, label: 'Eventos', description: 'Próximos encontros', path: '/events' },
            { id: 'customize', icon: PaletteIcon, label: 'Personalizar', description: 'Mude as cores e fundos', action: () => setIsCustomizationOpen(true) },
        ];

        if (preferences.menuOrder) {
            const sortedItems = [...items].sort((a, b) => {
                const indexA = preferences.menuOrder!.indexOf(a.id);
                const indexB = preferences.menuOrder!.indexOf(b.id);
                if (indexA === -1 || indexB === -1) return 1;
                return indexA - indexB;
            });
            return sortedItems;
        }
        return items;
    }, [preferences.menuOrder]);

    const handleReorder = (newOrderIds: string[]) => {
        updatePreference('menuOrder', newOrderIds);
    };

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: { distance: 8 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id && over) {
            const oldIndex = menuItems.findIndex(i => i.id === active.id);
            const newIndex = menuItems.findIndex(i => i.id === over.id);
            const newOrderIds = arrayMove(menuItems, oldIndex, newIndex).map(i => i.id);
            handleReorder(newOrderIds);
        }
    };

    return (
        <PageTransition>
        <div className="min-h-dvh text-white p-4 md:p-12 overflow-x-hidden selection:bg-[var(--accent-soft)] selection:text-white relative" style={{ background: preferences.wallpaper === 'custom' ? 'transparent' : 'var(--bg-primary)' }}>
            <div className="max-w-full relative z-10">
                    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 md:mb-16">
                        <div className="flex items-center gap-3 md:gap-6">
                            <div className="space-y-1">
                                        <span className="text-[11px] sm:text-[10px] font-bold tracking-[0.5em] uppercase" style={{ color: 'var(--text-muted)' }}>Bem-vindo</span>
                                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tighter">
                                    {displayName}
                                </h1>
                            </div>
                        </div>

                        <FloatingDockDesktop
                            className="!flex mx-0 h-[72px] pb-2 px-4 rounded-full shadow-lg items-end gap-3 translate-y-2 md:translate-y-0"
                            items={[
                                {
                                    title: "Perfil",
                                    icon: <DockAvatar profile={profile} user={user} />,
                                    href: "/profile",
                                    full: true
                                },
                                {
                                    title: "Configurações",
                                    icon: <Settings className="w-[85%] h-[85%] text-white/80 transition-all duration-300 group-hover:rotate-90 group-hover:scale-110" />,
                                    href: "/settings"
                                },
                                {
                                    title: "Sair",
                                    icon: <LogOut className="w-[85%] h-[85%] text-red-500/80 transition-all duration-300 group-hover:-translate-x-1 group-hover:scale-110" />,
                                    href: "#",
                                    onClick: handleSignOut
                                }
                            ]}
                        />
                    </header>

                    {preferences.dashboardStyle === 'cards' ? (
                        <div className="space-y-8">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={menuItems.map(i => i.id)}
                                    strategy={rectSortingStrategy}
                                >
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-12 relative">
                                        {menuItems.map((item) => (
                                            <SortableCard
                                                key={item.id}
                                                id={item.id}
                                                item={item}
                                                navigate={navigate}
                                                glassStyle={preferences.glassStyle || 'frosted'}
                                                notifCount={item.id === 'discipleship' ? notifCount : 0}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </div>
                    ) : (
                        <div className="fixed bottom-0 left-0 right-0 pb-[max(env(safe-area-inset-bottom),1.5rem)] flex justify-center z-[100] pointer-events-none">
                            <div className="pointer-events-auto">
                                <FloatingDock
                                    items={[
                                        ...menuItems.map(item => ({
                                            title: item.label,
                                            icon: <AnimatedIcon fallback={item.icon} className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
                                            href: item.action ? undefined : item.path,
                                            onClick: item.action
                                        })),
                                        ...myGroups.map(group => ({
                                            title: group.name,
                                            icon: group.photo_url ? (
                                                <img src={group.photo_url} alt="" className="h-full w-full rounded-full object-cover" />
                                            ) : (
                                                <Users className="h-[60%] w-[60%] text-neutral-300" />
                                            ),
                                            onClick: () => navigate('/devotionals'),
                                        }))
                                    ]}
                                />
                            </div>
                        </div>
                    )}

                    {upcomingEvents.length > 0 && (
                        <div className="mt-12 space-y-4">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <span className="text-[10px] font-bold tracking-[0.5em] uppercase" style={{ color: 'var(--text-muted)' }}>Próximos Eventos</span>
                                    <h2 className="text-xl font-bold tracking-tight mt-1">Encontros</h2>
                                </div>
                                <button
                                    onClick={() => navigate('/events')}
                                    className="text-xs font-bold tracking-widest uppercase flex items-center gap-1 transition-colors hover:text-white/80"
                                    style={{ color: 'var(--text-primary)' }}
                                >
                                    Ver todos <ChevronRight size={14} />
                                </button>
                            </div>
                            {upcomingEvents.map((event, i) => (
                                <motion.div
                                    key={event.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.08 }}
                                    onClick={() => navigate('/events')}
                                    className="p-5 rounded-[1.5rem] cursor-pointer group transition-all duration-300 hover:scale-[1.01]"
                                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0" style={{ background: 'var(--border)' }}>
                                            <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: 'var(--text-secondary)' }}>{new Date(event.event_date + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short' })}</span>
                                            <span className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>{new Date(event.event_date + 'T00:00:00').getDate()}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>{event.title}</h4>
                                            <div className="flex flex-wrap items-center gap-3 text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                                                 {event.event_time && <span className="flex items-center gap-1"><Clock size={12} /> {event.event_time}</span>}
                                                 {event.location && <span className="flex items-center gap-1"><MapPin size={12} /> {event.location}</span>}
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-white/20 group-hover:text-white/50 transition-colors shrink-0" />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}

                    {weeklyChallenge && (
                        <div className="mt-12 space-y-4">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <span className="text-[10px] font-bold tracking-[0.5em] uppercase" style={{ color: 'var(--text-muted)' }}>Desafio da Semana</span>
                                    <h2 className="text-xl font-bold tracking-tight mt-1">{weeklyChallenge.planTitle}</h2>
                                </div>
                                <button
                                    onClick={() => navigate('/plans')}
                                    className="text-xs font-bold tracking-widest uppercase flex items-center gap-1 transition-colors hover:text-white/80"
                                    style={{ color: 'var(--text-primary)' }}
                                >
                                    Ver plano <ChevronRight size={14} />
                                </button>
                            </div>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-5 rounded-[1.5rem] space-y-4"
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Zap size={16} style={{ color: 'var(--accent-solid)' }} />
                                        <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>Semana {weeklyChallenge.weekNumber}</span>
                                    </div>
                                    <span className="text-xs font-bold" style={{ color: 'var(--accent-solid)' }}>{weeklyChallenge.completedCount}/7</span>
                                </div>
                                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-card-hover)' }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(weeklyChallenge.completedCount / 7) * 100}%` }}
                                        transition={{ duration: 0.8, ease: 'easeOut' }}
                                        className="h-full rounded-full"
                                        style={{ background: 'var(--accent-solid)' }}
                                    />
                                </div>
                                <div className="grid grid-cols-7 gap-2">
                                    {weeklyChallenge.days.map((day, i) => (
                                        <div key={i} className="text-center space-y-1.5">
                                            <span className="text-[9px] font-bold tracking-wider uppercase block" style={{ color: day.isToday ? 'var(--accent-solid)' : 'var(--text-muted)' }}>
                                                {day.dayShort}
                                            </span>
                                            <div
                                                className={cn(
                                                    "w-7 h-7 sm:w-8 sm:h-8 mx-auto rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
                                                    day.completed ? "text-white" : day.isToday ? "text-white" : "text-white/20"
                                                )}
                                                style={{
                                                    background: day.completed ? 'var(--accent-solid)' : day.isToday ? 'var(--accent-hover)' : 'var(--bg-card-hover)',
                                                    border: day.isToday && !day.completed ? '1px solid var(--accent-hover)' : '1px solid transparent'
                                                }}
                                            >
                                                {day.completed ? <Sparkles size={12} /> : i + 1}
                                            </div>
                                            <span className="text-[8px] font-medium block leading-tight" style={{ color: 'var(--text-dim)' }}>
                                                {day.chapters.length > 0 ? `${day.chapters.length}ch` : '—'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {preferences.dashboardStyle === 'dock' && <div className="h-32 md:h-20" />}
                </div>
            </div>

            <CustomizationModal
                isOpen={isCustomizationOpen}
                onClose={() => setIsCustomizationOpen(false)}
            />
        </PageTransition>
    );
}
