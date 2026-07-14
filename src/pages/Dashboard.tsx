import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { motion, useMotionValue, useTransform, useSpring } from 'motion/react';
import { FloatingDock, FloatingDockDesktop } from '../components/FloatingDock';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
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
    Users
} from 'lucide-react';
import CustomizationModal from '../components/CustomizationModal';
import { NotificationBell } from '../components/NotificationBell';
import { useNavigate } from 'react-router-dom';
import ParticleBackground from '../components/ParticleBackground';
import PageTransition from '../components/PageTransition';
import { usePreferences } from '../contexts/PreferencesContext';
import { supabase } from '../lib/supabase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

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

function SortableCard({ id, item, navigate, glassStyle }: { id: string, item: any, navigate: any, glassStyle: 'crystal' | 'frosted' | 'solid' }) {
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
            className="touch-none h-full relative cursor-grab active:cursor-grabbing"
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
                    "p-6 border rounded-3xl text-left group transition-all h-full shadow-2xl shadow-black/20",
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
                        className="mt-5 flex items-center gap-1.5 text-[9px] font-bold tracking-[0.2em] text-white transition-colors uppercase"
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
    }, [user]);

    const displayName = profile?.display_name || profile?.username || user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Jovem Metanoia';

    const menuItems = useMemo(() => {
        const items = [
            { id: 'devotionals', icon: BookOpen, label: 'Devocionais', description: 'Devocionais diários', path: '/devotionals' },
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
        useSensor(PointerSensor, {
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
        <div className="min-h-screen text-white p-4 md:p-12 overflow-x-hidden selection:bg-[#4B88A2]/30 selection:text-white relative" style={{ background: '#252627' }}>
            <div className="max-w-full relative z-10">
                    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 md:mb-16">
                        <div className="flex items-center gap-3 md:gap-6">
                            <div className="space-y-1">
                                        <span className="text-[10px] font-bold tracking-[0.5em] uppercase" style={{ color: 'rgba(211, 212, 217, 0.4)' }}>Bem-vindo</span>
                                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tighter">
                                    {displayName}
                                </h1>
                            </div>
                        </div>

                        <FloatingDockDesktop
                            className="!flex mx-0 h-[72px] pb-2 px-4 rounded-full shadow-lg items-end gap-3 translate-y-2 md:translate-y-0"
                            items={[
                                {
                                    title: "Notificações",
                                    icon: <NotificationBell dockMode={true} />,
                                    href: "#",
                                },
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
                                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-12 relative">
                                        {menuItems.map((item) => (
                                            <SortableCard
                                                key={item.id}
                                                id={item.id}
                                                item={item}
                                                navigate={navigate}
                                                glassStyle={preferences.glassStyle || 'frosted'}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </div>
                    ) : (
                        <div className="fixed bottom-0 left-0 right-0 pb-8 flex justify-center z-[100] pointer-events-none">
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
                                    <span className="text-[10px] font-bold tracking-[0.5em] uppercase" style={{ color: 'rgba(211, 212, 217, 0.4)' }}>Próximos Eventos</span>
                                    <h2 className="text-xl font-bold tracking-tight mt-1">Encontros</h2>
                                </div>
                                <button
                                    onClick={() => navigate('/events')}
                                    className="text-xs font-bold tracking-widest uppercase flex items-center gap-1 transition-colors hover:text-white/80"
                                    style={{ color: 'rgba(75, 136, 162, 0.8)' }}
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
                                    style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(75, 136, 162, 0.1)' }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0" style={{ background: 'rgba(75, 136, 162, 0.1)' }}>
                                            <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: 'rgba(75, 136, 162, 0.6)' }}>{new Date(event.event_date + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short' })}</span>
                                            <span className="text-lg font-black" style={{ color: '#FFF9FB' }}>{new Date(event.event_date + 'T00:00:00').getDate()}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold tracking-tight truncate" style={{ color: '#FFF9FB' }}>{event.title}</h4>
                                            <div className="flex flex-wrap items-center gap-3 text-[11px] mt-1" style={{ color: 'rgba(211, 212, 217, 0.4)' }}>
                                                {event.event_time && <span className="flex items-center gap-1"><Clock size={10} /> {event.event_time}</span>}
                                                {event.location && <span className="flex items-center gap-1"><MapPin size={10} /> {event.location}</span>}
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-white/20 group-hover:text-white/50 transition-colors shrink-0" />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <CustomizationModal
                isOpen={isCustomizationOpen}
                onClose={() => setIsCustomizationOpen(false)}
            />
        </PageTransition>
    );
}
