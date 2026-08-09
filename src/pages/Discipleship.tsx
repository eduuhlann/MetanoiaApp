import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    ArrowLeft,
    User,
    Users,
    Plus,
    Search,
    Send,
    BookOpen,
    Clock,
    CheckCircle2,
    MessageSquare,
    ChevronRight,
    TrendingUp,
    Target,
    X,
    MoreVertical,
    Check,
    UserPlus,
    CheckCircle,
    XCircle,
    Paperclip,
    FileText,
    Image as ImageIcon,
    Download,
    Trash2,
    Loader2,
    LogOut,
    MessageSquarePlus,
    Calendar,
    Trophy,
    History,
    ChevronDown,
    ChevronUp,
    Flame,
    Award,
    Pencil,
    Copy,
    CalendarPlus,
    DoorOpen,
    KeyRound,
    RefreshCw,
    Link as LinkIcon,
    BadgeCheck,
    Shield,
    Timer
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { discipleshipService, DiscipleshipTask, DiscipleshipNote } from '../services/features/discipleshipService';
import { communityService, DiscipleshipMeeting } from '../services/features/communityService';
import { statsService, BibleStats } from '../services/features/statsService';
import { STATIC_BOOKS } from '../services/bible/staticBibleData';
import PageTransition from '../components/PageTransition';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

const Discipleship: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { profile } = useProfile();
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'list' | 'chat'>('list');
    const pendingOpenChatRef = useRef<any | null>(null);

    // UI States
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchMode, setSearchMode] = useState<'global' | 'group'>('global');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
    const [isMyChallengesOpen, setIsMyChallengesOpen] = useState(false);
    const [isGroupMembersModalOpen, setIsGroupMembersModalOpen] = useState(false);
    const [selectedMemberStats, setSelectedMemberStats] = useState<{ userId: string, stats: BibleStats | null, activity: any[] } | null>(null);
    const [challengeData, setChallengeData] = useState({ book: 'Gênesis', start: 1, end: 1 });
    const [challengeDeadline, setChallengeDeadline] = useState('');
    const [challengeBookSearch, setChallengeBookSearch] = useState('');
    const [challengeBookExpanded, setChallengeBookExpanded] = useState<'VT' | 'NT' | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void | Promise<void> }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });
    const [alertBanner, setAlertBanner] = useState<{ isOpen: boolean, message: string, type: 'error' | 'success' }>({ isOpen: false, message: '', type: 'error' });
    const [isSending, setIsSending] = useState(false);

    // Meetings (#56)
    const [isMeetingsModalOpen, setIsMeetingsModalOpen] = useState(false);
    const [meetings, setMeetings] = useState<DiscipleshipMeeting[]>([]);
    const [meetingTitle, setMeetingTitle] = useState('');
    const [meetingDate, setMeetingDate] = useState('');
    const [meetingTime, setMeetingTime] = useState('');
    const [meetingLocation, setMeetingLocation] = useState('');
    const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);

    // Group invite code (#64)
    const [inviteCode, setInviteCode] = useState('');
    const [inviteCodeExpiresAt, setInviteCodeExpiresAt] = useState<number | null>(null);
    const [codeCountdown, setCodeCountdown] = useState(0);
    const [isCodeRenewing, setIsCodeRenewing] = useState(false);
    const [isInviteCodeModalOpen, setIsInviteCodeModalOpen] = useState(false);
    const [isRegeneratingCode, setIsRegeneratingCode] = useState(false);
    const [copiedInvite, setCopiedInvite] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [isJoinGroupModalOpen, setIsJoinGroupModalOpen] = useState(false);
    const [isJoiningGroup, setIsJoiningGroup] = useState(false);

    // Group creation: avatar
    const [newGroupAvatarFile, setNewGroupAvatarFile] = useState<File | null>(null);
    const [newGroupAvatarPreview, setNewGroupAvatarPreview] = useState<string | null>(null);
    const groupAvatarInputRef = useRef<HTMLInputElement>(null);

    // Profile viewer
    const [viewProfile, setViewProfile] = useState<any | null>(null);
    const [isProfileLoading, setIsProfileLoading] = useState(false);

    // Data States
    const [connections, setConnections] = useState<any[]>([]);
    const [selectedConnection, setSelectedConnection] = useState<any | null>(null);
    const [notes, setNotes] = useState<DiscipleshipNote[]>([]);
    const [tasks, setTasks] = useState<DiscipleshipTask[]>([]);
    const [stats, setStats] = useState<BibleStats | null>(null);
    const [groupMembers, setGroupMembers] = useState<any[]>([]);
    const [noteInput, setNoteInput] = useState('');
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [editingContent, setEditingContent] = useState('');
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [typingUsers, setTypingUsers] = useState<{ id: string, name: string }[]>([]);
    const [contextMenuNoteId, setContextMenuNoteId] = useState<string | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const connectionsRef = useRef<any[]>([]);
    const selectedConnectionRef = useRef<any | null>(null);
    const presenceChannelRef = useRef<any>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => { connectionsRef.current = connections; }, [connections]);
    useEffect(() => { selectedConnectionRef.current = selectedConnection; }, [selectedConnection]);

    useEffect(() => {
        const fromState = (location.state as any)?.openChatWith;
        let targetId: string | null = fromState?.id || null;
        if (!targetId) {
            targetId = new URLSearchParams(location.search).get('chat');
        }
        if (!targetId) {
            try {
                const stored = sessionStorage.getItem('pendingChat');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed?.id) targetId = parsed.id;
                }
            } catch { /* ignore */ }
        }
        if (targetId) {
            pendingOpenChatRef.current = targetId;
            console.log('[openChat] target resolved:', targetId, '| search:', location.search);
        } else {
            console.warn('[openChat] no target in state/search/sessionStorage');
        }
    }, [location.state, location.search]);

    useEffect(() => {
        const targetId = pendingOpenChatRef.current;
        if (!targetId || !user) return;
        console.log('[openChat] targeting user:', targetId);
        const match = connections.find(conn => conn.type !== 'group' && conn.partnerId === targetId);
        if (match) {
            console.log('[openChat] found in list, opening:', match.partnerId);
            pendingOpenChatRef.current = null;
            sessionStorage.removeItem('pendingChat');
            handleSelectConnection(match);
            return;
        }
        // Connection not in the list yet — resolve it directly so the chat always opens
        const resolveAndOpen = async () => {
            if (pendingOpenChatRef.current !== targetId) return;
            try {
                const conn = await discipleshipService.getOrCreateConnection(user.id, targetId);
                if (pendingOpenChatRef.current !== targetId) return;
                if (connections.some(c => c.type !== 'group' && c.partnerId === targetId)) return;
                const { data: targetProfile } = await supabase
                    .from('profiles')
                    .select('username, avatar_url, display_name')
                    .eq('id', targetId)
                    .maybeSingle();
                const normalized = {
                    ...conn,
                    type: 'disciple',
                    profile: targetProfile || conn.profile,
                    partnerId: targetId,
                };
                pendingOpenChatRef.current = null;
                sessionStorage.removeItem('pendingChat');
                console.log('[openChat] opening direct connection:', targetId);
                handleSelectConnection(normalized);
            } catch (e) {
                console.error('[openChat] failed to open chat:', e);
                setAlertBanner({ isOpen: true, message: `Não foi possível abrir o chat: ${(e as any)?.message || 'erro desconhecido'}`, type: 'error' });
            }
        };
        resolveAndOpen();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connections, location.state, location.search, user]);

    useEffect(() => {
        loadConnections();
        const msgChannel = subscribeToMessages();
        return () => {
            if (msgChannel) supabase.removeChannel(msgChannel);
        };
    }, [user]);

    useEffect(() => {
        if (selectedConnection) {
            loadChatData();
            const taskChannel = subscribeToTasks();
            return () => {
                supabase.removeChannel(taskChannel);
            };
        }
    }, [selectedConnection]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [notes]);

    useEffect(() => {
        if (!contextMenuNoteId) return;
        const handleClick = () => setContextMenuNoteId(null);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [contextMenuNoteId]);

    useEffect(() => {
        if (isGroupMembersModalOpen && selectedConnection?.type === 'group' && selectedConnection.leader_id === user?.id) {
            openInviteCode();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isGroupMembersModalOpen]);

    const getProfile = (p: any) => {
        if (!p) return null;
        if (Array.isArray(p)) return p[0];
        return p;
    };

    const loadConnections = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [disciples, leaders, groups] = await Promise.all([
                discipleshipService.getDisciples(user.id),
                discipleshipService.getLeaders(user.id),
                discipleshipService.getGroups(user.id)
            ]);

            // Normalize connections for the list
            let all = [
                ...leaders.map(l => ({ ...l, type: 'leader', profile: l.profiles, partnerId: l.leader_id })),
                ...disciples.map(d => ({ ...d, type: 'disciple', profile: d.profiles, partnerId: d.disciple_id })),
                ...groups.map(g => ({ ...g, type: 'group', partnerId: g.id }))
            ].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

            // Handle "Você" chat and remove duplicates
            const filteredAll: any[] = [];
            const seenIds = new Set<string>();

            all.forEach(conn => {
                const isSelf = conn.leader_id === user!.id && conn.disciple_id === user!.id;
                const otherId = conn.type === 'leader' ? conn.leader_id : (conn.disciple_id || conn.id);
                const uniqueKey = isSelf ? 'self' : `${conn.type}-${otherId}`;

                if (seenIds.has(uniqueKey)) return;
                seenIds.add(uniqueKey);

                if (isSelf) {
                    filteredAll.push({
                        ...conn,
                        name: 'Você (Mensagens salvas)',
                        profile: { ...conn.profile, username: 'Você' },
                        type: 'self'
                    });
                } else {
                    filteredAll.push(conn);
                }
            });

            setConnections(filteredAll);

            // Fetch unread counts
            const counts = await discipleshipService.getUnreadCounts(user.id);
            setUnreadCounts(counts);
        } catch (error) {
            console.error('Error loading connections:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadChatData = async () => {
        if (!user || !selectedConnection) return;
        try {
            let noteList: DiscipleshipNote[] = [];
            let taskList: DiscipleshipTask[] = [];
            let bibleStats: BibleStats | null = null;
            let members: any[] = [];

            if (selectedConnection.type === 'group') {
                const groupId = selectedConnection.id;
                const leaderId = selectedConnection.leader_id;
                const isLeader = leaderId === user.id;

                [noteList, members, taskList] = await Promise.all([
                    discipleshipService.getNotes(null, null, groupId),
                    discipleshipService.getGroupMembers(groupId),
                    discipleshipService.getTasks(null, true, groupId)
                ]);

                // If leader, filter tasks that belong to this group (by parsing target_id)
                if (isLeader) {
                    taskList = taskList.filter(t => {
                        try {
                            const target = JSON.parse(t.target_id || '{}');
                            return target.groupId === groupId;
                        } catch (e) { return false; }
                    });
                } else {
                    // If member, only see tasks assigned to me in this group
                    taskList = taskList.filter(t => {
                        try {
                            const target = JSON.parse(t.target_id || '{}');
                            return target.groupId === groupId && t.disciple_id === user.id;
                        } catch (e) { return false; }
                    });
                }

                setGroupMembers(members);
            } else {
                const discipleId = selectedConnection.type === 'leader' ? user.id : selectedConnection.disciple_id;
                const leaderId = selectedConnection.type === 'leader' ? selectedConnection.leader_id : user.id;

                [noteList, taskList, bibleStats] = await Promise.all([
                    discipleshipService.getNotes(leaderId, discipleId),
                    discipleshipService.getTasks(discipleId, false),
                    statsService.getUserStats(discipleId)
                ]);
            }
            setNotes(noteList);
            setTasks(taskList);
            setStats(bibleStats);
            console.log('Chat data state updated:', { 
                notes: noteList.length, 
                tasks: taskList.length, 
                members: (selectedConnection.type === 'group') ? groupMembers.length : 0,
                type: selectedConnection.type 
            });
        } catch (error) {
            console.error('Error loading chat data:', error);
        }
    };

    const subscribeToTasks = () => {
        const groupId = selectedConnection.type === 'group' ? selectedConnection.id : null;
        const channel = supabase
            .channel(`discipleship-tasks-${selectedConnection.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to INSERT and UPDATE
                    schema: 'public',
                    table: 'discipleship_tasks'
                },
                async (payload) => {
                    const newTask = payload.new as DiscipleshipTask;
                    if (groupId) {
                        try {
                            const target = JSON.parse(newTask.target_id || '{}');
                            if (target.groupId === groupId && (newTask.disciple_id === user?.id || selectedConnection.leader_id === user?.id)) {
                                setTasks(prev => {
                                    const exists = prev.find(t => t.id === newTask.id);
                                    if (payload.eventType === 'DELETE') return prev.filter(t => t.id !== (payload.old as any).id);
                                    if (exists) return prev.map(t => t.id === newTask.id ? newTask : t);
                                    return [newTask, ...prev];
                                });
                            }
                        } catch (e) { }
                    } else if (newTask.disciple_id === user?.id || newTask.leader_id === user?.id) {
                        setTasks(prev => {
                            const exists = prev.find(t => t.id === newTask.id);
                            if (payload.eventType === 'DELETE') return prev.filter(t => t.id !== (payload.old as any).id);
                            if (exists) return prev.map(t => t.id === newTask.id ? newTask : t);
                            return [newTask, ...prev];
                        });
                    }
                }
            )
            .subscribe();
        return channel;
    };

    // Presence Channel for Typing Indicator
    useEffect(() => {
        if (!user || !selectedConnection) {
            setTypingUsers([]);
            return;
        }
        
        const channelId = `presence-${selectedConnection.id}`;
        const channel = supabase.channel(channelId, {
            config: { presence: { key: user.id } }
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const activeTypers: { id: string, name: string }[] = [];
                for (const userId in state) {
                    if (userId === user.id) continue;
                    const presences = state[userId] as any[];
                    if (presences.some(p => p.isTyping)) {
                        activeTypers.push({
                            id: userId,
                            name: presences[0].name || 'Alguém'
                        });
                    }
                }
                setTypingUsers(activeTypers);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ isTyping: false, name: profile?.display_name || profile?.username || 'Usuário' });
                }
            });

        presenceChannelRef.current = channel;

        return () => {
            channel.unsubscribe();
            presenceChannelRef.current = null;
        };
    }, [selectedConnection?.id, user, profile?.display_name, profile?.username]);

    const handleTyping = (text: string) => {
        setNoteInput(text);
        
        if (presenceChannelRef.current) {
            presenceChannelRef.current.track({ isTyping: text.trim().length > 0, name: profile?.display_name || profile?.username || 'Usuário' });
            
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                if (presenceChannelRef.current) {
                    presenceChannelRef.current.track({ isTyping: false, name: profile?.display_name || profile?.username || 'Usuário' });
                }
            }, 3000);
        }
    };

    const subscribeToMessages = () => {
        if (!user) return null;

        const channel = supabase
            .channel(`discipleship-global-notes-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'discipleship_notes'
                },
                async (payload) => {
                    const current = selectedConnectionRef.current;

                    if (payload.eventType === 'INSERT') {
                        const newNote = payload.new as DiscipleshipNote;
                        
                        const isForSelected = !!(current && (
                            (newNote.group_id && current.id === newNote.group_id) ||
                            (!newNote.group_id && current.type !== 'group' && (
                                (newNote.leader_id === current.leader_id && newNote.disciple_id === current.disciple_id) ||
                                (newNote.leader_id === current.disciple_id && newNote.disciple_id === current.leader_id)
                            ))
                        ));

                        if (isForSelected) {
                            setNotes(prev => {
                                if (prev.some(n => n.id === newNote.id)) return prev;
                                return [...prev, newNote];
                            });
                            discipleshipService.markNotesAsRead(newNote.leader_id, newNote.disciple_id, user.id, newNote.group_id);
                        } else {
                            const isPrivateForUser = newNote.leader_id === user.id || newNote.disciple_id === user.id;
                            const userGroups = connectionsRef.current.filter(c => c.type === 'group');
                            const belongsToUserGroup = newNote.group_id && userGroups.some(c => c.id === newNote.group_id);

                            if (isPrivateForUser || belongsToUserGroup) {
                                const key = newNote.group_id || (newNote.leader_id === user.id ? newNote.disciple_id : newNote.leader_id);
                                if (key) {
                                    setUnreadCounts(prev => ({
                                        ...prev,
                                        [key]: (prev[key] || 0) + 1
                                    }));
                                }
                            }
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        const updatedNote = payload.new as DiscipleshipNote;
                        if (current && (
                            (updatedNote.group_id && current.id === updatedNote.group_id) ||
                            (!updatedNote.group_id && current.type !== 'group' && (
                                (updatedNote.leader_id === current.leader_id && updatedNote.disciple_id === current.disciple_id) ||
                                (updatedNote.leader_id === current.disciple_id && updatedNote.disciple_id === current.leader_id)
                            ))
                        )) {
                            setNotes(prev => prev.map(n => n.id === updatedNote.id ? { ...n, ...updatedNote } : n));
                        }
                    } else if (payload.eventType === 'DELETE') {
                        const deletedId = (payload.old as any).id;
                        setNotes(prev => prev.filter(n => n.id !== deletedId));
                    }
                }
            )
            .subscribe();
        return channel;
    };

    const handleSearch = async (q: string) => {
        setSearchQuery(q);
        if (q.length >= 3) {
            const results = await discipleshipService.searchUsers(q);
            setSearchResults(results.filter(r => r.id !== user?.id));
        } else {
            setSearchResults([]);
        }
    };

    const handleInvite = async (targetUser: any) => {
        if (!user) return;
        try {
            if (searchMode === 'group' && selectedConnection?.type === 'group') {
                await discipleshipService.inviteToGroup(selectedConnection.id, targetUser.id);
                setInviteSuccess(targetUser.username);
                setTimeout(() => {
                    setInviteSuccess(null);
                    setIsSearchOpen(false);
                    setSearchQuery('');
                    setSearchResults([]);
                    loadConnections();
                }, 2000);
            } else {
                // Direct Chat: Create active connection immediately
                const conn = await discipleshipService.getOrCreateConnection(user.id, targetUser.id);
                const formattedConn = {
                    ...conn,
                    type: conn.leader_id === user.id ? 'disciple' : 'leader',
                    profile: conn.profiles
                };
                setIsSearchOpen(false);
                setSearchQuery('');
                setSearchResults([]);
                loadConnections();
                handleSelectConnection(formattedConn);
            }
        } catch (error) {
            setAlertBanner({ isOpen: true, message: 'Erro ao enviar convite. Verifique se as tabelas do banco de dados foram criadas.', type: 'error' });
        }
    };

    const closeCreateGroupModal = () => {
        setIsGroupModalOpen(false);
        setNewGroupName('');
        setNewGroupAvatarFile(null);
        setNewGroupAvatarPreview(null);
    };

    const handleCreateGroup = async () => {
        if (!user || !newGroupName.trim() || isCreatingGroup) return;
        setIsCreatingGroup(true);
        try {
            const trimmedName = newGroupName.trim();
            const groupId = await discipleshipService.createGroup(user.id, trimmedName);

            // Upload avatar (photo/GIF) if chosen
            let avatarUrl: string | null = null;
            if (newGroupAvatarFile) {
                avatarUrl = await discipleshipService.uploadGroupAvatar(groupId, newGroupAvatarFile);
                await discipleshipService.updateGroupAvatar(groupId, avatarUrl);
            }

            // Generate the 6-digit invite code valid for 5 minutes
            const invite = await communityService.ensureGroupInviteCode(groupId);
            setInviteCode(invite.code);
            setInviteCodeExpiresAt(invite.expiresAt);

            setNewGroupName('');
            setNewGroupAvatarFile(null);
            setNewGroupAvatarPreview(null);
            setIsGroupModalOpen(false);
            loadConnections();

            // Automatically select the new group and show the invite code screen
            const newGroup = { id: groupId, name: trimmedName, avatar_url: avatarUrl, leader_id: user.id, type: 'group' };
            handleSelectConnection(newGroup);
            setIsInviteCodeModalOpen(true);
        } catch (error: any) {
            console.error('Error creating group:', error);
            setAlertBanner({ isOpen: true, message: `Erro ao criar grupo: ${error.message || 'Verifique sua conexão.'}`, type: 'error' });
        } finally {
            setIsCreatingGroup(false);
        }
    };

    const handleDeleteGroup = async () => {
        if (!selectedConnection || selectedConnection.type !== 'group') return;
        setConfirmModal({
            isOpen: true,
            title: 'Excluir Grupo',
            message: 'Tem certeza que deseja excluir permanentemente este grupo? Esta ação não pode ser desfeita.',
            onConfirm: async () => {
                try {
                    await discipleshipService.deleteGroup(selectedConnection.id);
                    setSelectedConnection(null);
                    setView('list');
                    loadConnections();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    setAlertBanner({ isOpen: true, message: 'Erro ao excluir grupo.', type: 'error' });
                }
            }
        });
    };

    // ---------- Meetings (#56) ----------
    const loadMeetings = async () => {
        if (!selectedConnection || selectedConnection.type !== 'group') return;
        const data = await communityService.getGroupMeetings(selectedConnection.id);
        setMeetings(data);
    };

    const openMeetingsModal = async () => {
        if (!selectedConnection || selectedConnection.type !== 'group') return;
        setMeetings([]);
        setIsMeetingsModalOpen(true);
        await loadMeetings();
    };

    const handleCreateMeeting = async () => {
        if (!user || !selectedConnection || selectedConnection.type !== 'group' || !meetingTitle.trim() || !meetingDate) return;
        setIsCreatingMeeting(true);
        try {
            const scheduledAt = new Date(`${meetingDate}T${meetingTime || '19:00'}:00`).toISOString();
            await communityService.createMeeting(selectedConnection.id, user.id, meetingTitle.trim(), scheduledAt, meetingLocation.trim() || undefined);
            setMeetingTitle(''); setMeetingDate(''); setMeetingTime(''); setMeetingLocation('');
            await loadMeetings();
            setAlertBanner({ isOpen: true, message: 'Reunião agendada!', type: 'success' });
        } catch (error) {
            setAlertBanner({ isOpen: true, message: 'Erro ao agendar reunião.', type: 'error' });
        } finally {
            setIsCreatingMeeting(false);
        }
    };

    const handleDeleteMeeting = async (meetingId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Cancelar Reunião',
            message: 'Tem certeza que deseja cancelar esta reunião?',
            onConfirm: async () => {
                try {
                    await communityService.deleteMeeting(meetingId);
                    await loadMeetings();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    setAlertBanner({ isOpen: true, message: 'Erro ao cancelar reunião.', type: 'error' });
                }
            }
        });
    };

    // ---------- Group invite code (#64) ----------
    const openInviteCode = async () => {
        if (!selectedConnection || selectedConnection.type !== 'group') return;
        setCopiedInvite(false);
        try {
            const invite = await communityService.ensureGroupInviteCode(selectedConnection.id);
            setInviteCode(invite.code);
            setInviteCodeExpiresAt(invite.expiresAt);
        } catch (error) {
            setAlertBanner({ isOpen: true, message: 'Erro ao gerar código de convite.', type: 'error' });
        }
    };

    const handleCopyInvite = async () => {
        try {
            await navigator.clipboard.writeText(inviteCode);
            setCopiedInvite(true);
            setTimeout(() => setCopiedInvite(false), 2000);
        } catch (error) { }
    };

    const handleRegenerateInviteCode = async () => {
        if (!selectedConnection || selectedConnection.type !== 'group' || selectedConnection.leader_id !== user?.id) return;
        if (isCodeRenewing) return;
        setIsCodeRenewing(true);
        setIsRegeneratingCode(true);
        try {
            const invite = await communityService.regenerateGroupInviteCode(selectedConnection.id);
            setInviteCode(invite.code);
            setInviteCodeExpiresAt(invite.expiresAt);
            setCopiedInvite(false);
        } catch (error) {
            setAlertBanner({ isOpen: true, message: 'Erro ao regenerar código.', type: 'error' });
        } finally {
            setIsCodeRenewing(false);
            setIsRegeneratingCode(false);
        }
    };

    const formatCountdown = (totalSeconds: number) => {
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    // Auto-renew the code when it expires while it's on screen
    useEffect(() => {
        if (inviteCodeExpiresAt == null) return;
        const tick = () => {
            const remaining = Math.max(0, Math.ceil((inviteCodeExpiresAt - Date.now()) / 1000));
            setCodeCountdown(remaining);
            if (remaining <= 0 && (isInviteCodeModalOpen || isGroupMembersModalOpen) && selectedConnection?.leader_id === user?.id) {
                handleRegenerateInviteCode();
            }
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inviteCodeExpiresAt, isInviteCodeModalOpen, isGroupMembersModalOpen]);

    const handleJoinGroupByCode = async () => {
        if (!user || !joinCode.trim()) return;
        setIsJoiningGroup(true);
        try {
            const result = await communityService.joinGroupByCode(joinCode, user.id);
            if (result.status === 'invalid') {
                setAlertBanner({ isOpen: true, message: 'Código inválido. Verifique e tente novamente.', type: 'error' });
                return;
            }
            if (result.status === 'expired') {
                setAlertBanner({ isOpen: true, message: 'Este código expirou. Peça um novo código ao líder do grupo.', type: 'error' });
                return;
            }
            const group = result.group!;
            setJoinCode('');
            setIsJoinGroupModalOpen(false);
            loadConnections();
            setAlertBanner({ isOpen: true, message: `Você entrou em ${group.name}!`, type: 'success' });
        } catch (error) {
            setAlertBanner({ isOpen: true, message: 'Erro ao entrar no grupo.', type: 'error' });
        } finally {
            setIsJoiningGroup(false);
        }
    };

    // ---------- Profile viewer ----------
    const openProfileModal = async (userId: string, preview?: any, groupRole?: string) => {
        setIsProfileLoading(true);
        setViewProfile({ id: userId, ...(preview || {}), groupRole } as any);
        try {
            const full = await discipleshipService.getUserProfile(userId);
            setViewProfile({ ...(preview || {}), ...(full || {}), id: userId, groupRole });
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setIsProfileLoading(false);
        }
    };

    const handleMemberRowClick = (member: any) => {
        const memberProfile = getProfile(member.profiles);
        openProfileModal(member.user_id, memberProfile, member.role);
    };

    const openHeaderProfile = () => {
        if (!selectedConnection) return;
        if (selectedConnection.type === 'group') {
            setIsGroupMembersModalOpen(true);
        } else {
            openProfileModal(selectedConnection.partnerId, selectedConnection.profile);
        }
    };

    const handleRemoveMember = async (targetUserId: string, targetUsername: string) => {
        if (!selectedConnection || !window.confirm(`Tem certeza que deseja remover ${targetUsername}?`)) return;
        try {
            await discipleshipService.removeGroupMember(selectedConnection.id, targetUserId, targetUsername);
            const updated = await discipleshipService.getGroupMembers(selectedConnection.id);
            setGroupMembers(updated);
        } catch (error) {
            setAlertBanner({ isOpen: true, message: 'Erro ao remover membro.', type: 'error' });
        }
    };

    const handlePromoteMember = async (memberId: string, role: 'admin' | 'member') => {
        try {
            await discipleshipService.updateMemberRole(memberId, role);
            const updated = await discipleshipService.getGroupMembers(selectedConnection!.id);
            setGroupMembers(updated);
        } catch (error) {
            setAlertBanner({ isOpen: true, message: 'Erro ao alterar papel do membro.', type: 'error' });
        }
    };

    const handleTransferLeadership = async (targetUserId: string) => {
        if (!selectedConnection || !window.confirm('Tem certeza que deseja transferir a liderança deste grupo? Você se tornará um co-líder.')) return;
        try {
            await discipleshipService.transferGroupLeadership(selectedConnection.id, targetUserId);
            setAlertBanner({ isOpen: true, message: 'Liderança transferida.', type: 'success' });
            setIsGroupMembersModalOpen(false);
            
            // Soft local state updates
            setSelectedConnection((prev: any) => prev ? { ...prev, leader_id: targetUserId } : null);
        } catch (error) {
            setAlertBanner({ isOpen: true, message: 'Erro ao transferir liderança.', type: 'error' });
        }
    };

    const handleCreateChallenge = async () => {
        if (!user || !selectedConnection) return;
        try {
            const challengeMsg = `[CHALLENGE]:${JSON.stringify({
                book: challengeData.book,
                start: challengeData.start,
                end: challengeData.end,
                deadline: challengeDeadline || null,
                leaderName: profile?.display_name || profile?.username || 'Líder',
                participants: []
            })}`;

            console.log('Sending challenge message:', challengeMsg);
            const leaderId = selectedConnection.type === 'leader' ? selectedConnection.leader_id : (selectedConnection.leader_id || user.id);
            const discipleId = selectedConnection.type === 'leader' ? user.id : (selectedConnection.disciple_id || null);
            const groupId = selectedConnection.type === 'group' ? selectedConnection.id : null;

            await discipleshipService.addNote(leaderId, discipleId, user.id, challengeMsg, groupId);

            setIsChallengeModalOpen(false);
            setChallengeDeadline('');
            setChallengeBookSearch('');
            setChallengeBookExpanded(null);
            setTimeout(() => {
                loadChatData();
            }, 300);
        } catch (error) {
            console.error('Challenge error:', error);
            setAlertBanner({ isOpen: true, message: 'Erro ao lançar desafio.', type: 'error' });
        }
    };

    const handleParticipateChallenge = async (note: any, data: any) => {
        if (!user || !profile || !selectedConnection) return;
        try {
            const groupId = selectedConnection.type === 'group' ? selectedConnection.id : null;
            await discipleshipService.createReadingChallenge(note.author_id, user.id, data.book, data.start, data.end, groupId);

            const participants = data.participants || [];
            participants.push({ id: user.id, name: profile.username || 'Usuário' });
            data.participants = participants;

            const newContent = `[CHALLENGE]:${JSON.stringify(data)}`;
            await discipleshipService.updateNote(note.id, newContent);

            setNotes(prev => prev.map(n => n.id === note.id ? { ...n, content: newContent } : n));
            
            setAlertBanner({ isOpen: true, message: 'Você entrou no desafio!', type: 'success' });
            setTimeout(() => {
                loadChatData();
            }, 500);
        } catch (error) {
            console.error('Error participating in challenge:', error);
            setAlertBanner({ isOpen: true, message: 'Erro ao entrar no desafio.', type: 'error' });
        }
    };

    const handleStartPrivateChat = async (targetUserId: string) => {
        if (!user || targetUserId === user.id) return;
        try {
            const conn = await discipleshipService.getOrCreateConnection(user.id, targetUserId);
            // Create a pseudo-connection object compatible with handleSelectConnection
            const formattedConn = {
                ...conn,
                type: conn.leader_id === user.id ? 'disciple' : 'leader',
                profile: conn.profiles
            };
            handleSelectConnection(formattedConn);
        } catch (error) {
            setAlertBanner({ isOpen: true, message: 'Erro ao iniciar chat privado.', type: 'error' });
        }
    };

    const handleRespondInvite = async (conn: any, accept: boolean) => {
        try {
            if (conn.member_id) {
                await discipleshipService.respondToGroupInvite(conn.member_id, accept);
            } else {
                await discipleshipService.respondToInvite(conn.id, accept);
            }
            loadConnections();
            if (accept) {
                handleSelectConnection({ ...conn, status: 'active', member_status: 'active' });
            }
        } catch (error) {
            setAlertBanner({ isOpen: true, message: 'Erro ao responder convite.', type: 'error' });
        }
    };

    const handleClearConversation = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Limpar Conversa',
            message: 'Tem certeza que deseja apagar as mensagens desta conversa para você? Outros participantes ainda poderão vê-las.',
            onConfirm: async () => {
                try {
                    const leaderId = selectedConnection?.type === 'leader' ? selectedConnection.leader_id : (selectedConnection?.leader_id || user?.id);
                    const discipleId = selectedConnection?.type === 'leader' ? user?.id : (selectedConnection?.disciple_id || null);
                    const groupId = selectedConnection?.type === 'group' ? selectedConnection.id : null;
                    
                    await discipleshipService.clearConversation(leaderId, discipleId, groupId);
                    setNotes([]);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    setAlertBanner({ isOpen: true, message: 'Conversa limpa com sucesso.', type: 'success' });
                } catch (error) {
                    setAlertBanner({ isOpen: true, message: 'Erro ao limpar conversa.', type: 'error' });
                }
            }
        });
    };

    const handleSendMessage = async (fileData: any = null) => {
        if (!user || (!noteInput.trim() && !fileData) || !selectedConnection || isSending) return;
        
        const content = noteInput.trim();
        const leaderId = selectedConnection.type === 'leader' ? selectedConnection.leader_id : (selectedConnection.leader_id || user.id);
        const discipleId = selectedConnection.type === 'leader' ? user.id : (selectedConnection.disciple_id || null);
        const groupId = selectedConnection.type === 'group' ? selectedConnection.id : null;

        const tempId = `temp-${Date.now()}`;
        const tempNote = {
            id: tempId,
            leader_id: leaderId,
            disciple_id: discipleId,
            author_id: user.id,
            group_id: groupId,
            content,
            file_url: fileData?.url,
            file_name: fileData?.name,
            file_type: fileData?.type,
            is_read: false,
            created_at: new Date().toISOString(),
            profiles: profile,
            isSending: true
        };

        setNotes(prev => [...prev, tempNote as any]);
        setNoteInput('');
        if (presenceChannelRef.current) {
            presenceChannelRef.current.track({ isTyping: false, name: profile?.username || 'Usuário' });
        }
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

        try {
            const newNote = await discipleshipService.addNote(leaderId, discipleId, user.id, content, groupId, fileData);
            setNotes(prev => prev.map(n => n.id === tempId ? newNote : n));
        } catch (error) {
            console.error('Error sending message:', error);
            setNotes(prev => prev.filter(n => n.id !== tempId));
            setNoteInput(content);
            setAlertBanner({ isOpen: true, message: 'Erro ao enviar mensagem.', type: 'error' });
        }
    };

    const handleEditNote = async (noteId: string) => {
        if (!editingContent.trim()) return;
        try {
            await discipleshipService.updateNote(noteId, editingContent);
            setEditingNoteId(null);
            setEditingContent('');
            setContextMenuNoteId(null);
            loadChatData();
        } catch (error) {
            console.error('Error updating note:', error);
            alert('Erro ao editar mensagem.');
        }
    };

    const handleDeleteNote = (noteId: string) => {
        setContextMenuNoteId(null);
        setConfirmModal({
            isOpen: true,
            title: 'Excluir Mensagem',
            message: 'Tem certeza que deseja excluir esta mensagem?',
            onConfirm: async () => {
                try {
                    await discipleshipService.deleteNote(noteId);
                    setNotes(prev => prev.filter(n => n.id !== noteId));
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    setAlertBanner({ isOpen: true, message: 'Erro ao excluir mensagem.', type: 'error' });
                }
            }
        });
    };

    const handleCopyMessage = async (content: string) => {
        setContextMenuNoteId(null);
        try {
            await navigator.clipboard.writeText(content);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch {
            setAlertBanner({ isOpen: true, message: 'Erro ao copiar mensagem.', type: 'error' });
        }
    };

    const handleLeaveGroup = async () => {
        if (!user || !selectedConnection || selectedConnection.type !== 'group') return;
        setConfirmModal({
            isOpen: true,
            title: 'Sair do Grupo',
            message: 'Tem certeza que deseja sair deste grupo de discipulado?',
            onConfirm: async () => {
                try {
                    const userNameForLog = profile?.display_name || profile?.username || 'Um usuário';
                    await discipleshipService.leaveGroup(selectedConnection.id, user.id, userNameForLog);
                    setSelectedConnection(null);
                    setView('list');
                    loadConnections();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    setAlertBanner({ isOpen: true, message: 'Erro ao sair do grupo.', type: 'error' });
                }
            }
        });
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, isGroupAvatar: boolean = false) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        setIsUploading(true);
        try {
            if (isGroupAvatar && selectedConnection?.type === 'group') {
                const avatarUrl = await discipleshipService.uploadGroupAvatar(selectedConnection.id, file);
                await discipleshipService.updateGroupAvatar(selectedConnection.id, avatarUrl);
                setSelectedConnection((prev: any) => ({ ...prev, avatar_url: avatarUrl }));
                loadConnections();
            } else {
                const result = await discipleshipService.uploadFile(file);
                await handleSendMessage(result);
            }
        } catch (error: any) {
            console.error('Upload error:', error);
            const msg = error?.message?.includes('mime type')
                ? 'Tipo de arquivo não suportado. Use PNG, JPG, GIF ou WebP.'
                : error?.message?.includes('Bucket not found')
                ? 'Bucket de armazenamento não encontrado. Verifique as configurações do Supabase.'
                : `Erro ao subir arquivo: ${error?.message || 'Tente novamente.'}`;
            setAlertBanner({ isOpen: true, message: msg, type: 'error' });
        } finally {
            setIsUploading(false);
            // Reset input value so same file can be re-selected
            event.target.value = '';
        }
    };

    const handleGroupAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setAlertBanner({ isOpen: true, message: 'Escolha uma imagem ou GIF.', type: 'error' });
            return;
        }
        setNewGroupAvatarFile(file);
        const reader = new FileReader();
        reader.onload = () => setNewGroupAvatarPreview(reader.result as string);
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleViewMemberStats = async (memberUserId: string) => {
        setIsGroupMembersModalOpen(false);
        try {
            const [memberStats, activity] = await Promise.all([
                statsService.getUserStats(memberUserId),
                discipleshipService.getMemberActivity(memberUserId)
            ]);
            setSelectedMemberStats({ userId: memberUserId, stats: memberStats, activity });
        } catch (error) {
            console.error('Error fetching member stats:', error);
            setAlertBanner({ isOpen: true, message: 'Erro ao carregar atividades do membro.', type: 'error' });
        }
    };

    const handleMemberAction = async (member: any) => {
        if (!user || member.user_id === user.id) return;

        try {
            const conn = await discipleshipService.getPrivateConnection(user.id, member.user_id);
            if (conn) {
                handleSelectConnection(conn);
            } else {
                setSearchQuery(member.profiles?.username || '');
                setIsSearchOpen(true);
                handleSearch(member.profiles?.username || '');
            }
        } catch (error) {
            console.error('Error opening private chat:', error);
        }
    };

    const handleSelectConnection = (conn: any) => {
        setSelectedConnection(conn);
        setIsMenuOpen(false);
        setView('chat');
        if (user) {
            const leaderId = conn.type === 'leader' ? conn.leader_id : (conn.leader_id || user.id);
            const discipleId = conn.type === 'leader' ? user.id : (conn.disciple_id || null);
            const groupId = conn.type === 'group' ? conn.id : null;
            discipleshipService.markNotesAsRead(leaderId, discipleId, user.id, groupId);

            // Clear unread count for this connection
            const unreadKey = conn.type === 'group' ? conn.id : (conn.leader_id === user.id ? conn.disciple_id : conn.leader_id);
            if (unreadKey) {
                setUnreadCounts(prev => ({ ...prev, [unreadKey]: 0 }));
            }
        }
    };

    return (
        <PageTransition>
            <div className="h-dvh text-white flex flex-col font-sans overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
                {/* Modals handled same as before... (Search, Group Creation) */}
                <AnimatePresence>
                    {isSearchOpen && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} style={{ background: 'var(--surface-4)' }} className="border border-white/10 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl">
                                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                    <h3 className="text-xl font-bold tracking-tight">
                                        {searchMode === 'group' ? `Convidar para ${selectedConnection?.name}` : 'Chamar no Privado'}
                                    </h3>
                                    <button onClick={() => setIsSearchOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                                </div>
                                <div className="p-6 space-y-6">
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                        <input type="text" autoFocus placeholder="Buscar por usuário..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)} className="w-full bg-black/40 border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-0 focus:border-white/30 transition-all font-medium" />
                                    </div>
                                    <div className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                                        {inviteSuccess ? (
                                            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                                <div style={{ background: 'var(--border-strong)' }} className="w-16 h-16 rounded-full flex items-center justify-center animate-bounce" >
                                                    <Check className="w-8 h-8" style={{ color: 'var(--accent-solid)' }} />
                                                </div>
                                                <p className="text-sm font-bold text-white/60">Convite enviado para <span className="text-white">{inviteSuccess}</span>!</p>
                                            </div>
                                        ) : (
                                            searchResults.map(r => (
                                                <div key={r.id} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden">{r.avatar_url && <img src={r.avatar_url} className="w-full h-full object-cover" />}</div>
                                                        <span className="font-bold text-sm">{r.username}</span>
                                                    </div>
                                                    <button onClick={() => handleInvite(r)} style={{ background: 'var(--accent-solid)', color: 'var(--text-on-accent)' }} className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
                                                        {searchMode === 'group' ? 'Convidar' : 'Chamar'}
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {isGroupModalOpen && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} style={{ background: 'var(--surface-4)' }} className="border border-white/10 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl">
                                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                    <h3 className="text-xl font-bold tracking-tight">Criar Novo Grupo</h3>
                                    <button onClick={closeCreateGroupModal} className="p-2 hover:bg-white/5 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                                </div>
                                <div className="p-6 space-y-6">
                                    <div className="flex flex-col items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => groupAvatarInputRef.current?.click()}
                                            disabled={isCreatingGroup}
                                            className="w-28 h-28 rounded-full border-2 border-dashed border-white/20 overflow-hidden flex items-center justify-center transition-all hover:border-white/40 disabled:opacity-50"
                                        >
                                            {newGroupAvatarPreview ? (
                                                <img src={newGroupAvatarPreview} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-1.5 opacity-50">
                                                    <ImageIcon className="w-8 h-8" />
                                                    <span className="text-[9px] font-bold uppercase tracking-widest">Foto / GIF</span>
                                                </div>
                                            )}
                                        </button>
                                        <span className="text-[10px] text-white/40 font-medium text-center">Foto de perfil do grupo (PNG, JPG, GIF ou WebP)</span>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Nome do Grupo</label>
                                        <input type="text" autoFocus placeholder="Ex: Discipulado Jovens" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} className="w-full bg-black/40 border-white/10 rounded-2xl py-4 px-6 text-sm focus:ring-0 focus:border-white/30 transition-all font-medium" />
                                    </div>
                                    <button onClick={handleCreateGroup} disabled={!newGroupName.trim() || isCreatingGroup} style={{ background: 'var(--accent-solid)', color: 'var(--text-on-accent)' }} className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                        {isCreatingGroup ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" /> CRIANDO...
                                            </>
                                        ) : 'Criar Grupo'}
                                    </button>
                                </div>
                                <input type="file" ref={groupAvatarInputRef} className="hidden" accept="image/*,image/gif" onChange={handleGroupAvatarChange} />
                            </motion.div>
                        </motion.div>
                    )}
                    {isChallengeModalOpen && (
                        <ChallengeCreationModal
                            isOpen={isChallengeModalOpen}
                            onClose={() => setIsChallengeModalOpen(false)}
                            onCreateChallenge={handleCreateChallenge}
                            challengeData={challengeData}
                            setChallengeData={setChallengeData}
                            deadline={challengeDeadline}
                            setDeadline={setChallengeDeadline}
                            bookSearch={challengeBookSearch}
                            setBookSearch={setChallengeBookSearch}
                            bookExpanded={challengeBookExpanded}
                            setBookExpanded={setChallengeBookExpanded}
                        />
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {isInviteCodeModalOpen && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
                            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} style={{ background: 'var(--surface-4)' }} className="border border-white/10 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl">
                                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                                    <div className="flex items-center gap-3">
                                        <KeyRound className="w-5 h-5 text-white/60" />
                                        <h3 className="text-xl font-black italic tracking-tight">Código de Convite</h3>
                                    </div>
                                    <button onClick={() => setIsInviteCodeModalOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"><X className="w-5 h-5" /></button>
                                </div>
                                <div className="p-6 space-y-6">
                                    <div className="text-center space-y-2">
                                        <p className="text-sm font-bold text-white/80">{selectedConnection?.name || 'Grupo criado com sucesso!'}</p>
                                        <div className="flex items-center justify-center gap-2">
                                            <Timer className="w-4 h-4 text-white/40" />
                                            {inviteCodeExpiresAt != null ? (
                                                <span className={cn("text-xs font-black uppercase tracking-widest", codeCountdown <= 0 ? "text-red-400" : "text-white/50")}>
                                                    {codeCountdown <= 0 ? 'Código renovado automaticamente' : `Válido por ${formatCountdown(codeCountdown)}`}
                                                </span>
                                            ) : (
                                                <span className="text-xs font-black uppercase tracking-widest text-white/50">Código de convite do grupo</span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-white/30">Compartilhe com quem você quer que entre no grupo</p>
                                    </div>
                                    <div className="flex items-center justify-center">
                                        <code className="text-center text-4xl font-black tracking-[0.25em] px-6 py-6 rounded-3xl bg-black/40 border border-dashed border-white/15 w-full" style={{ color: 'var(--accent-solid)' }}>
                                            {inviteCode || '······'}
                                        </code>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleCopyInvite}
                                            disabled={!inviteCode}
                                            className="flex-1 py-3.5 rounded-2xl flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white/70 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                                        >
                                            {copiedInvite ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                            {copiedInvite ? 'Copiado!' : 'Copiar'}
                                        </button>
                                        <button
                                            onClick={handleRegenerateInviteCode}
                                            disabled={isRegeneratingCode}
                                            className="flex-1 py-3.5 rounded-2xl flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white/70 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                                        >
                                            {isRegeneratingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                            Novo
                                        </button>
                                    </div>
                                    <button onClick={() => setIsInviteCodeModalOpen(false)} style={{ background: 'var(--accent-solid)', color: 'var(--text-on-accent)' }} className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all">
                                        Concluir
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex flex-1 overflow-hidden">


                    {/* Sidebar */}
                    <aside className={cn("w-full md:w-[380px] border-r flex flex-col transition-all", view === 'chat' ? 'hidden md:flex' : 'flex')} style={{ borderColor: 'var(--border)' }}>
                        <header className="p-4 md:p-6 space-y-4 md:space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => navigate('/dashboard')} className="p-2.5 rounded-2xl transition-all hover:scale-105 active:scale-95" style={{ background: 'var(--bg-card)' }}><ArrowLeft className="w-5 h-5" /></button>
                                </div>
                                <div className="flex items-center gap-1.5 md:gap-2">
                                    <button onClick={() => { setSearchMode('global'); setIsSearchOpen(true); }} className="p-2.5 md:p-3 rounded-2xl transition-all shadow-xl hover:scale-105 active:scale-95" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} title="Novo Chat Privado"><MessageSquarePlus className="w-5 h-5" style={{ color: 'var(--text-muted)' }} /></button>
                                    <button onClick={() => setIsGroupModalOpen(true)} className="p-2.5 md:p-3 rounded-2xl transition-all shadow-xl hover:scale-105 active:scale-95" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} title="Novo Grupo"><Users className="w-5 h-5" style={{ color: 'var(--text-muted)' }} /></button>
                                    <button onClick={() => setIsJoinGroupModalOpen(true)} className="p-2.5 md:p-3 rounded-2xl transition-all shadow-xl hover:scale-105 active:scale-95" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} title="Entrar com código"><DoorOpen className="w-5 h-5" style={{ color: 'var(--text-muted)' }} /></button>

                                    <button onClick={() => { setSearchMode('global'); setIsSearchOpen(true); }} style={{ background: 'var(--accent-solid)', color: 'var(--text-on-accent)' }} className="p-2.5 md:p-3 rounded-2xl hover:scale-110 active:scale-90 transition-all shadow-xl"><Plus className="w-5 h-5" /></button>
                                </div>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto px-4 space-y-2 custom-scrollbar pb-24">
                            {connections.map(conn => {
                                const isPending = (conn.status === 'pending') || (conn.member_status === 'pending');
                                const isSelected = selectedConnection?.id === conn.id;
                                return (
                                    <button key={`${conn.type}-${conn.id}`} onClick={() => !isPending && handleSelectConnection(conn)} className={cn("w-full p-4 rounded-[28px] flex items-center gap-4 transition-all group", isPending && "cursor-default opacity-80")} style={isSelected ? { background: 'var(--surface-4)', border: '1px solid var(--border-strong)' } : { background: 'transparent', border: '1px solid transparent' }}>
                                        <div className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden shrink-0 transition-all" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                                            {conn.type === 'group' ? (
                                                conn.avatar_url ? <img src={conn.avatar_url} className="w-full h-full object-cover" /> : <Users className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
                                            ) : conn.profile?.avatar_url ? (
                                                <img src={conn.profile.avatar_url} className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-6 h-6" style={{ color: 'var(--text-dim)' }} />
                                            )}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-sm">{conn.type === 'group' ? conn.name : (conn.profile?.display_name || conn.profile?.username || 'Usuário')}</span>
                                                {conn.type !== 'self' && (
                                                    <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full" style={conn.type === 'leader' ? { background: 'var(--accent-soft)', color: 'var(--accent-solid)' } : { background: 'var(--bg-card)', color: 'var(--text-dim)' }}>
                                                        {conn.type === 'leader' ? 'Líder' : 'Discípulo'}
                                                    </span>
                                                )}
                                            </div>
                                            {isPending ? (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <button onClick={(e) => { e.stopPropagation(); handleRespondInvite(conn, true); }} style={{ background: 'var(--accent-solid)', color: 'var(--text-on-accent)' }} className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">Aceitar</button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleRespondInvite(conn, false); }} className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all" style={{ background: 'var(--bg-card-hover)', color: 'var(--text-secondary)' }}>Recusar</button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between gap-2 mt-1">
                                                    <p className="text-[11px] line-clamp-1 italic" style={{ color: 'var(--text-muted)' }}>Toque para abrir a conversa...</p>
                                                    {(() => {
                                                        const unreadKey = conn.type === 'group' ? conn.id : (conn.leader_id === user?.id ? conn.disciple_id : conn.leader_id);
                                                        const count = unreadCounts[unreadKey] || 0;
                                                        if (count > 0) {
                                                            return (
                                                                <div style={{ background: 'var(--accent-solid)', color: '#fff' }} className="min-w-[18px] h-[18px] text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow-lg shrink-0">
                                                                    {count}
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </aside>

                    {/* Chat Area */}
                    <main className={cn("flex-1 flex flex-col transition-all relative", view === 'list' ? 'hidden md:flex' : 'flex')} style={{ background: 'var(--bg-primary)' }}>
                        {selectedConnection ? (
                            <>
                                <header className="p-4 md:p-6 border-b flex items-center justify-between backdrop-blur-md sticky top-0 z-20" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setView('list')} className="md:hidden p-2.5 rounded-xl" style={{ background: 'var(--bg-card)' }}><ArrowLeft className="w-5 h-5" /></button>
                                        <div className="flex items-center gap-3">
                                                    <div className="relative group/avatar cursor-pointer" onClick={openHeaderProfile} title={selectedConnection.type === 'group' ? 'Ver membros do grupo' : 'Ver perfil'}>
                                                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden flex items-center justify-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                                                            {selectedConnection.type === 'group' ? (
                                                                selectedConnection.avatar_url ? <img src={selectedConnection.avatar_url} className="w-full h-full object-cover" /> : <Users className="w-5 h-5 md:w-6 md:h-6" style={{ color: 'var(--text-muted)' }} />
                                                            ) : selectedConnection.profile?.avatar_url ? (
                                                                <img src={selectedConnection.profile.avatar_url} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <User className="w-5 h-5 md:w-6 md:h-6" style={{ color: 'var(--text-dim)' }} />
                                                            )}
                                                        </div>
                                                        {selectedConnection.type === 'group' && selectedConnection.leader_id === user?.id && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const input = document.createElement('input');
                                                                    input.type = 'file';
                                                                    input.accept = 'image/*,image/gif';
                                                                    input.onchange = (e: any) => handleFileUpload(e, true);
                                                                    input.click();
                                                                }}
                                                                className="absolute inset-0 bg-black/60 opacity-100 md:opacity-0 md:group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center rounded-full"
                                                            >
                                                                <ImageIcon className="w-4 h-4 text-white" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <button onClick={openHeaderProfile} className="font-bold text-sm md:text-xl tracking-tight leading-tight truncate text-left hover:underline block w-full">
                                                            {selectedConnection.name || selectedConnection.profile?.display_name || selectedConnection.profile?.username}
                                                        </button>
                                                <div className="flex items-center gap-2">
                                                    {selectedConnection.type === 'group' ? (
                                                        <div 
                                                            className="flex items-center gap-1.5 overflow-hidden cursor-pointer group/members"
                                                            onClick={() => setIsGroupMembersModalOpen(true)}
                                                        >
                                                            <span className="text-[10px] md:text-[11px] font-medium text-white/40 group-hover/members:text-white/80 transition-colors truncate flex-1">
                                                                {groupMembers.length > 0 ? groupMembers.map(m => getProfile(m.profiles)?.username).filter(Boolean).join(', ') : 'Carregando participantes...'}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent-solid)' }} />
                                                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--accent-solid)' }}>Disponível</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 relative">
                                        {selectedConnection.type !== 'self' && (selectedConnection.leader_id === user?.id || selectedConnection.type === 'disciple' || groupMembers.find(m => m.user_id === user?.id)?.role === 'admin') && (
                                            <button onClick={() => setIsChallengeModalOpen(true)} className="p-2.5 md:p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/10" title="Criar Desafio de Leitura">
                                                <TrendingUp className="w-5 h-5 text-white/60" />
                                            </button>
                                        )}
                                        {selectedConnection.type === 'group' && selectedConnection.leader_id === user!.id && (
                                            <button onClick={() => { setSearchMode('group'); setIsSearchOpen(true); }} className="p-2.5 md:p-3 hover:opacity-80 rounded-2xl transition-all border" style={{ background: 'var(--border)', borderColor: 'var(--border-strong)' }}>
                                                <UserPlus className="w-5 h-5" style={{ color: 'var(--accent-solid)' }} />
                                            </button>
                                        )}
                                        {selectedConnection.type === 'group' && (
                                            <button onClick={openMeetingsModal} className="p-2.5 md:p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/10" title="Reuniões do Grupo">
                                                <CalendarPlus className="w-5 h-5 text-white/60" />
                                            </button>
                                        )}
                                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2.5 md:p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors border border-white/5">
                                            <MoreVertical className="w-5 h-5" />
                                        </button>

                                                <AnimatePresence>
                                                    {isMenuOpen && (
                                                        <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} style={{ background: 'var(--surface-4)' }} className="absolute right-0 top-full mt-2 w-48 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-30">
                                                            <button onClick={() => { setIsMyChallengesOpen(true); setIsMenuOpen(false); }} className="w-full p-4 flex items-center gap-3 text-white/60 hover:bg-white/5 transition-colors text-xs font-bold uppercase tracking-widest border-b border-white/5">
                                                                <TrendingUp className="w-4 h-4 text-white/40" /> Meus Desafios
                                                            </button>
                                                            <button onClick={() => { handleClearConversation(); setIsMenuOpen(false); }} className="w-full p-4 flex items-center gap-3 text-white/60 hover:bg-white/5 transition-colors text-xs font-bold uppercase tracking-widest border-b border-white/5">
                                                                <Trash2 className="w-4 h-4 text-white/40" /> Limpar Conversa
                                                            </button>
                                                            {selectedConnection.type === 'group' && selectedConnection.leader_id === user!.id && (
                                                                <button onClick={() => { setSearchMode('group'); setIsSearchOpen(true); setIsMenuOpen(false); }} className="w-full p-4 flex items-center gap-3 text-white/60 hover:bg-white/5 transition-colors text-xs font-bold uppercase tracking-widest border-b border-white/5">
                                                                    <UserPlus className="w-4 h-4" />
                                                                    Adicionar Membro
                                                                </button>
                                                            )}
                                                            {selectedConnection.type === 'group' && (
                                                                selectedConnection.leader_id === user!.id ? (
                                                                    <button onClick={handleDeleteGroup} className="w-full p-4 flex items-center gap-3 text-red-400 hover:bg-red-400/10 transition-colors text-xs font-bold uppercase tracking-widest">
                                                                        <Trash2 className="w-4 h-4" /> Excluir Grupo
                                                                    </button>
                                                                ) : (
                                                                    <button onClick={handleLeaveGroup} className="w-full p-4 flex items-center gap-3 text-red-400 hover:bg-red-400/10 transition-colors text-xs font-bold uppercase tracking-widest">
                                                                        <LogOut className="w-4 h-4" /> Sair do Grupo
                                                                    </button>
                                                                )
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                    </div>
                                </header>

                                {/* Active Challenges Section */}
                                {(tasks || []).filter(t => t.type === 'reading' && !t.is_completed).length > 0 && (
                                    <div className="px-4 md:px-8 py-4 bg-white/5 border-b border-white/10 space-y-3">
                                        <div className="max-w-3xl mx-auto space-y-3">
                                            {(tasks || []).filter(t => t.type === 'reading' && !t.is_completed).map(task => {
                                                let progress = 0;
                                                let target = { book: '', start: 0, end: 0 };
                                                try {
                                                    target = JSON.parse(task.target_id || '{}');
                                                    const readingHistory = stats?.readingHistory;
                                                    if (readingHistory) {
                                                        const bookStats = readingHistory.find((s: any) => s.book === target.book);
                                                        if (bookStats) {
                                                            const completedInTarget = bookStats.chapters.filter((c: number) => c >= target.start && c <= target.end).length;
                                                            const totalTarget = target.end - target.start + 1;
                                                            progress = Math.min(100, Math.round((completedInTarget / totalTarget) * 100));
                                                        }
                                                    }
                                                } catch (e) { }

                                                // Auto-complete if 100%
                                                const shouldAutoComplete = progress === 100;
                                                const deadline = (target as any).deadline ? new Date((target as any).deadline) : null;
                                                const isOverdue = deadline && deadline < new Date();

                                                return (
                                                    <div key={task.id} className={cn(
                                                        "border rounded-2xl p-4 flex flex-col gap-3 shadow-xl transition-all",
                                                        shouldAutoComplete ? "bg-green-500/5 border-green-500/20" : "bg-black/40 border-white/20"
                                                    )}>
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className={cn(
                                                                    "w-8 h-8 rounded-full flex items-center justify-center",
                                                                    shouldAutoComplete ? "bg-green-500/20" : "bg-white/20"
                                                                )}>
                                                                    {shouldAutoComplete ? (
                                                                        <CheckCircle className="w-4 h-4 text-green-400" />
                                                                    ) : (
                                                                        <TrendingUp className="w-4 h-4 text-white/60" />
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-white/60">
                                                                        {shouldAutoComplete ? 'Desafio Completo!' : 'Desafio Ativo'}
                                                                    </h4>
                                                                    <p className="text-sm font-bold">{target.book} {target.start}-{target.end}</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">{progress}%</span>
                                                                {deadline && (
                                                                    <p className={cn(
                                                                        "text-[9px] font-bold mt-0.5",
                                                                        isOverdue ? "text-red-400" : "text-white/30"
                                                                    )}>
                                                                        {isOverdue ? 'Prazo expirado' : `Até ${deadline.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${progress}%` }}
                                                                className="h-full rounded-full shadow-[0_0_10px_rgba(75,136,162,0.3)]"
                                                                style={{ background: shouldAutoComplete ? 'var(--accent-solid)' : 'var(--accent-solid)' }}
                                                            />
                                                        </div>
                                                        {(shouldAutoComplete || selectedConnection.leader_id === user!.id) && (
                                                            <button
                                                                onClick={() => discipleshipService.completeTask(task.id).then(() => loadChatData())}
                                                                style={{ background: shouldAutoComplete ? 'var(--accent-solid)' : 'var(--accent-solid)', color: '#fff' }}
                                                                className="py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
                                                            >
                                                                {shouldAutoComplete ? (
                                                                    <><CheckCircle className="w-3.5 h-3.5" /> Concluir Desafio</>
                                                                ) : 'Marcar como Concluído'}
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Chat Feed */}
                                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar">
                                    <div className="max-w-3xl mx-auto space-y-6">
                                        {notes.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-20 opacity-20">
                                                <MessageSquare className="w-12 h-12 mb-4" />
                                                <p className="text-sm font-bold uppercase tracking-[0.2em]">Nenhuma mensagem ainda</p>
                                            </div>
                                        ) : (
                                            notes.map((n) => {
                                                const isMine = n.author_id === user!.id;
                                                const getProfile = (p: any) => Array.isArray(p) ? p[0] : p;

                                                // System message rendering
                                                if (n.content?.startsWith('[SYSTEM]:')) {
                                                    return (
                                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={n.id} className="flex justify-center py-2">
                                                            <div className="bg-white/5 border border-white/5 px-4 py-1.5 rounded-full backdrop-blur-sm">
                                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 text-center">
                                                                    {n.content.replace('[SYSTEM]:', '').trim()}
                                                                </p>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                }

                                                let authorProfile = null;
                                                if (isMine) {
                                                    authorProfile = profile;
                                                } else if (selectedConnection.type === 'group') {
                                                    const memberInGroup = groupMembers.find(m => m.user_id === n.author_id);
                                                    authorProfile = getProfile(memberInGroup?.profiles) || getProfile((n as any).profiles);
                                                    if (!authorProfile && (n as any).profiles) authorProfile = getProfile((n as any).profiles);
                                                } else {
                                                    authorProfile = getProfile(selectedConnection.profile) || getProfile((n as any).profiles);
                                                }

                                                return (
                                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={n.id} className={cn("flex gap-3", isMine ? "flex-row-reverse ml-auto items-end" : "flex-row items-start")}>
                                                        {/* Avatar */}
                                                        <div className="shrink-0 mb-1">
                                                            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center">
                                                                {authorProfile?.avatar_url ? (
                                                                    <img src={authorProfile.avatar_url} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <User className="w-4 h-4 text-white/20" />
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className={cn("flex flex-col gap-1", isMine ? "items-end" : "items-start")}>
                                                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">
                                                                {authorProfile?.username || 'Usuário'}
                                                            </span>
                                                             <div className={cn("px-5 py-3.5 rounded-[28px] max-w-[85%] md:max-w-md group relative transition-all shadow-xl", isMine ? "font-semibold rounded-tr-none" : "bg-white/5 border border-white/10 text-white rounded-tl-none")} style={isMine ? { background: 'var(--accent-solid)', color: '#fff' } : {}}>
                                                                {editingNoteId === n.id ? (
                                                                    <div className="space-y-3 min-w-[200px]">
                                                                        <textarea
                                                                            value={editingContent}
                                                                            onChange={(e) => setEditingContent(e.target.value)}
                                                                            className="w-full bg-black/10 border-black/10 rounded-xl p-2 text-sm text-black focus:ring-0 focus:border-black/20 font-medium resize-none"
                                                                            autoFocus
                                                                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditNote(n.id); } if (e.key === 'Escape') setEditingNoteId(null); }}
                                                                        />
                                                                        <div className="flex justify-end gap-2">
                                                                            <button onClick={() => setEditingNoteId(null)} className="px-3 py-1.5 bg-black/5 text-black/40 rounded-lg text-[10px] font-black uppercase tracking-widest">Cancelar</button>
                                                                            <button onClick={() => handleEditNote(n.id)} className="px-3 py-1.5 bg-black text-white rounded-lg text-[10px] font-black uppercase tracking-widest">Salvar</button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        {n.file_url ? (
                                                                            <div className="space-y-3">
                                                                                {n.file_type?.startsWith('image/') ? (
                                                                                    <img src={n.file_url} className="rounded-2xl max-h-64 object-cover border border-black/10" />
                                                                                ) : (
                                                                                    <div className="flex items-center gap-4 bg-black/20 p-4 rounded-2xl border border-white/5">
                                                                                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center"><FileText className="w-5 h-5" /></div>
                                                                                        <div className="flex-1 overflow-hidden">
                                                                                            <p className="text-[11px] font-bold truncate">{n.file_name}</p>
                                                                                            <p className="text-[9px] uppercase tracking-widest text-white/40">{n.file_type?.split('/')[1] || 'Arquivo'}</p>
                                                                                        </div>
                                                                                        <a href={n.file_url} target="_blank" className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"><Download className="w-4 h-4" /></a>
                                                                                    </div>
                                                                                )}
                                                                                {n.content && (
                                                                                    n.content.startsWith('[CHALLENGE]:') ? (
                                                                                        <ChallengeMessageCard note={n} isMine={isMine} stats={stats} />
                                                                                    ) : (
                                                                                        <p className="text-sm mt-2">{n.content}</p>
                                                                                    )
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            n.content.startsWith('[CHALLENGE]:') ? (
                                                                                <ChallengeMessageCard note={n} isMine={isMine} stats={stats} />
                                                                            ) : (
                                                                                <p className="text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap">{n.content}</p>
                                                                            )
                                                                        )}

                                                                        {/* Context Menu Trigger */}
                                                                        {isMine && !n.content.startsWith('[CHALLENGE]:') && (
                                                                            <>
                                                                                {/* Desktop: hover toolbar */}
                                                                                <div className={cn(
                                                                                    "absolute top-0 opacity-0 group-hover:opacity-100 transition-all hidden md:flex gap-1 z-10",
                                                                                    isMine ? "-left-1 translate-x-[-120%]" : "-right-1 translate-x-full"
                                                                                )}>
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); setEditingNoteId(n.id); setEditingContent(n.content); }}
                                                                                        className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white/40 hover:text-white transition-all shadow-sm backdrop-blur-md border border-white/5"
                                                                                        title="Editar"
                                                                                    >
                                                                                        <Pencil className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); handleDeleteNote(n.id); }}
                                                                                        className="p-1.5 bg-red-500/5 hover:bg-red-500/20 rounded-lg text-red-500/40 hover:text-red-500 transition-all shadow-sm backdrop-blur-md border border-red-500/10"
                                                                                        title="Excluir"
                                                                                    >
                                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); handleCopyMessage(n.content); }}
                                                                                        className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white/40 hover:text-white transition-all shadow-sm backdrop-blur-md border border-white/5"
                                                                                        title="Copiar"
                                                                                    >
                                                                                        <Copy className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                </div>
                                                                                {/* Mobile: tap-to-open menu */}
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); setContextMenuNoteId(contextMenuNoteId === n.id ? null : n.id); }}
                                                                                    className={cn(
                                                                                        "md:hidden absolute -right-2 top-1/2 -translate-y-1/2 p-1 rounded-full transition-all shadow-sm border z-10",
                                                                                        contextMenuNoteId === n.id
                                                                                            ? "bg-white/20 border-white/30 text-white"
                                                                                            : "bg-white/5 border-white/10 text-white/30 opacity-0 group-hover:opacity-100"
                                                                                    )}
                                                                                >
                                                                                    <MoreVertical className="w-3 h-3" />
                                                                                </button>
                                                                            </>
                                                                        )}

                                                                        {/* Floating Context Menu (mobile tap) */}
                                                                        {contextMenuNoteId === n.id && isMine && !n.content.startsWith('[CHALLENGE]:') && (
                                                                            <div
                                                                                onClick={(e) => e.stopPropagation()}
                                                                                className="absolute -top-14 left-1/2 -translate-x-1/2 flex gap-1 bg-[var(--surface-4)] border border-white/10 rounded-2xl p-1.5 shadow-2xl z-50 backdrop-blur-xl"
                                                                            >
                                                                                <button
                                                                                    onClick={() => { setEditingNoteId(n.id); setEditingContent(n.content); setContextMenuNoteId(null); }}
                                                                                    className="flex items-center gap-1.5 px-3 py-2 hover:bg-white/10 rounded-xl transition-colors"
                                                                                >
                                                                                    <Pencil className="w-3.5 h-3.5 text-white/60" />
                                                                                    <span className="text-[10px] font-bold text-white/60">Editar</span>
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDeleteNote(n.id)}
                                                                                    className="flex items-center gap-1.5 px-3 py-2 hover:bg-red-500/10 rounded-xl transition-colors"
                                                                                >
                                                                                    <Trash2 className="w-3.5 h-3.5 text-red-400/60" />
                                                                                    <span className="text-[10px] font-bold text-red-400/60">Excluir</span>
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleCopyMessage(n.content)}
                                                                                    className="flex items-center gap-1.5 px-3 py-2 hover:bg-white/10 rounded-xl transition-colors"
                                                                                >
                                                                                    <Copy className="w-3.5 h-3.5 text-white/60" />
                                                                                    <span className="text-[10px] font-bold text-white/60">Copiar</span>
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 px-1">
                                                                {n.updated_at && (
                                                                    <span className="text-[9px] text-white/15 font-medium italic">editado</span>
                                                                )}
                                                                <span className="text-[10px] text-white/20 font-bold uppercase">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>
                                </div>

                                {/* Typing Indicator */}
                                <AnimatePresence>
                                    {typingUsers.length > 0 && (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="px-6 md:px-10 pb-4">
                                            <div className="flex items-center gap-2 bg-white/5 w-max px-4 py-2 rounded-full border border-white/10 shadow-lg backdrop-blur-sm">
                                                <div className="flex gap-1 items-center">
                                                    <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                    <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                    <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-white/50 ml-1">
                                                    {typingUsers.length === 1 ? `${typingUsers[0].name.split(' ')[0]} está digitando...` : `${typingUsers.length} pessoas estão digitando...`}
                                                </span>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Input Area */}
                                <footer className="p-4 md:p-6 pt-3 pb-[max(env(safe-area-inset-bottom),1.25rem)] border-t" style={{ borderColor: 'var(--border)', background: 'var(--surface-4)' }}>
                                    <div className="max-w-4xl mx-auto flex gap-3 items-end">
                                        <div className="relative shrink-0">
                                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" />
                                            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading || isSending} className="p-4 rounded-[24px] transition-all disabled:opacity-50" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                                                {isUploading || isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                                            </button>
                                        </div>
                                        <div className="flex-1 rounded-[32px] flex flex-col p-2 transition-all group/input" style={{ background: 'var(--bg-card)' }}>
                                            <textarea rows={1} value={noteInput} onChange={(e) => handleTyping(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder="Digite sua mensagem..." className="w-full bg-transparent border-none focus:ring-0 text-sm py-4 px-6 font-medium resize-none custom-scrollbar max-h-32 text-white/90" />
                                            <div className="flex justify-end p-2 opacity-60 hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleSendMessage()} disabled={(!noteInput.trim() && !isUploading) || isSending} style={{ background: 'var(--accent-solid)', color: 'var(--text-on-accent)' }} className="p-3.5 rounded-2xl hover:scale-110 active:scale-90 transition-all shadow-lg disabled:opacity-50 disabled:scale-100">
                                                    {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </footer>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center p-12 text-center" style={{ background: 'linear-gradient(to bottom, transparent, var(--bg-card))' }}>
                                <div className="max-w-sm space-y-8 opacity-40">
                                    <MessageSquare className="w-20 h-20 mx-auto" style={{ color: 'var(--text-dim)' }} />
                                    <h2 className="text-3xl font-black italic -rotate-1 tracking-tighter">Escolha uma jornada</h2>
                                </div>
                            </div>
                        )}
                    </main>
                </div>



                <MyChallengesModal
                    isOpen={isMyChallengesOpen}
                    onClose={() => setIsMyChallengesOpen(false)}
                    tasks={tasks || []}
                    stats={stats}
                    currentUserId={user?.id}
                    onRefresh={loadChatData}
                />

                <AnimatePresence>
                    {isGroupMembersModalOpen && selectedConnection?.type === 'group' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ background: 'var(--surface-4)' }} className="border border-white/10 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl">
                                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                                    <div className="flex items-center gap-3">
                                        <Users className="w-5 h-5 text-white/60" />
                                        <h2 className="text-xl font-black italic tracking-tight">Membros do Grupo</h2>
                                    </div>
                                    <button onClick={() => setIsGroupMembersModalOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"><X className="w-5 h-5" /></button>
                                </div>
                                {selectedConnection.leader_id === user?.id && (
                                    <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <KeyRound className="w-4 h-4 text-white/50" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Código de Convite</span>
                                            </div>
                                            <button
                                                onClick={handleRegenerateInviteCode}
                                                disabled={isRegeneratingCode}
                                                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white/80"
                                                title="Gerar novo código"
                                            >
                                                {isRegeneratingCode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <code className="flex-1 text-center text-lg font-black tracking-[0.3em] py-2.5 rounded-xl bg-black/40 border border-dashed border-white/15" style={{ color: 'var(--accent-solid)' }}>
                                                {inviteCode || '······'}
                                            </code>
                                            <button
                                                onClick={handleCopyInvite}
                                                className="p-2.5 rounded-xl hover:bg-white/10 transition-colors"
                                                style={{ background: 'var(--border)' }}
                                                title="Copiar código"
                                            >
                                                {copiedInvite ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-center gap-1.5 mt-2">
                                            <Timer className="w-3 h-3 text-white/40" />
                                            {inviteCodeExpiresAt != null ? (
                                                <span className={cn("text-[10px] font-bold", codeCountdown <= 0 ? "text-red-400" : "text-white/40")}>
                                                    {codeCountdown <= 0 ? 'Expirado — gerando novo código...' : `Válido por ${formatCountdown(codeCountdown)}`}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-white/40">Código de convite do grupo</span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-white/30 mt-1 text-center">Compartilhe este código para que outros entrem no grupo</p>
                                    </div>
                                )}
                                <div className="p-4 space-y-2 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                    {groupMembers.length === 0 ? (
                                        <div className="text-center py-12 opacity-20">
                                            <Users className="w-12 h-12 mx-auto mb-4" />
                                            <p className="text-sm font-black uppercase tracking-widest">Nenhum membro encontrado</p>
                                        </div>
                                    ) : (
                                        groupMembers.map(member => {
                                            const memberProfile = getProfile(member.profiles);
                                            const isMe = member.user_id === user?.id;
                                            return (
                                                <div
                                                    key={member.id}
                                                    onClick={(e) => {
                                                        if ((e.target as HTMLElement).closest('button')) return;
                                                        handleMemberRowClick(member);
                                                    }}
                                                    className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                                                            {memberProfile?.avatar_url ? (
                                                                <img src={memberProfile.avatar_url} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <User className="w-5 h-5 text-white/20" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold flex items-center gap-2">
                                                                {memberProfile?.username || 'Usuário'}
                                                                {isMe && <span className="text-[10px] bg-white/10 px-1.5 rounded-full text-white/60">Você</span>}
                                                            </p>
                                                            <p className="text-[10px] text-white/40 uppercase tracking-widest font-black">{member.role === 'admin' ? 'Co-Líder' : 'Membro'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {selectedConnection.leader_id === user?.id && !isMe && (
                                                            <div className="flex gap-1.5">
                                                                {member.role === 'member' && (
                                                                    <button 
                                                                        onClick={() => handlePromoteMember(member.id, 'admin')}
                                                                        className="px-2 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 shadow-sm border border-blue-500/10"
                                                                        title="Promover a Co-líder"
                                                                    >
                                                                        <TrendingUp className="w-3 h-3" /> Co-líder
                                                                    </button>
                                                                )}
                                                                {member.role === 'admin' && (
                                                                    <button 
                                                                        onClick={() => handlePromoteMember(member.id, 'member')}
                                                                        className="px-2 py-1.5 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/60 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 shadow-sm border border-white/5"
                                                                        title="Remover Co-líder"
                                                                    >
                                                                        Rebaixar
                                                                    </button>
                                                                )}
                                                                <button 
                                                                    onClick={() => handleTransferLeadership(member.user_id)}
                                                                    className="px-2 py-1.5 hover:opacity-80 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 shadow-sm border"
                                                                    style={{ background: 'var(--border)', borderColor: 'var(--border-strong)', color: 'var(--accent-solid)' }}
                                                                    title="Tornar Líder"
                                                                >
                                                                    Líder
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleRemoveMember(member.user_id, memberProfile?.username || 'Usuário')}
                                                                    className="px-2 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 shadow-sm border border-red-500/10"
                                                                    title="Remover do Grupo"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>



                <AnimatePresence>
                    {isJoinGroupModalOpen && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} style={{ background: 'var(--surface-4)' }} className="border border-white/10 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl">
                                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <DoorOpen className="w-5 h-5 text-white/60" />
                                        <h3 className="text-xl font-bold tracking-tight">Entrar com código</h3>
                                    </div>
                                    <button onClick={() => setIsJoinGroupModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                                </div>
                                <div className="p-6 space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Código do grupo</label>
                                        <input
                                            type="text"
                                            autoFocus
                                            placeholder="EX: ABC123"
                                            value={joinCode}
                                            onChange={(e) => setJoinCode(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6))}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleJoinGroupByCode(); }}
                                            className="w-full bg-black/40 border-white/10 rounded-2xl py-4 px-6 text-center text-xl font-black tracking-[0.3em] uppercase focus:ring-0 focus:border-white/30 transition-all font-medium"
                                        />
                                        <p className="text-[10px] text-white/30 ml-1">Peça o código a um líder do grupo (expira em 5 minutos)</p>
                                    </div>
                                    <button onClick={handleJoinGroupByCode} disabled={!joinCode.trim() || isJoiningGroup} style={{ background: 'var(--accent-solid)', color: 'var(--text-on-accent)' }} className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                        {isJoiningGroup ? (<><Loader2 className="w-4 h-4 animate-spin" /> ENTRANDO...</>) : 'Entrar no Grupo'}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {isMeetingsModalOpen && selectedConnection?.type === 'group' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} style={{ background: 'var(--surface-4)' }} className="border border-white/10 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl">
                                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                                    <div className="flex items-center gap-3">
                                        <CalendarPlus className="w-5 h-5 text-white/60" />
                                        <h3 className="text-xl font-bold tracking-tight">Reuniões do Grupo</h3>
                                    </div>
                                    <button onClick={() => setIsMeetingsModalOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"><X className="w-5 h-5" /></button>
                                </div>
                                <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 gap-2">
                                            <input type="text" placeholder="Título da reunião" value={meetingTitle} onChange={(e) => setMeetingTitle(e.target.value)} className="w-full bg-black/40 border-white/10 rounded-xl py-3 px-4 text-sm focus:ring-0 focus:border-white/30 transition-all font-medium" />
                                            <div className="grid grid-cols-2 gap-2">
                                                <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="bg-black/40 border-white/10 rounded-xl py-3 px-4 text-sm [color-scheme:dark] focus:ring-0" />
                                                <input type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} className="bg-black/40 border-white/10 rounded-xl py-3 px-4 text-sm [color-scheme:dark] focus:ring-0" />
                                            </div>
                                            <input type="text" placeholder="Local (opcional)" value={meetingLocation} onChange={(e) => setMeetingLocation(e.target.value)} className="w-full bg-black/40 border-white/10 rounded-xl py-3 px-4 text-sm focus:ring-0 focus:border-white/30 transition-all font-medium" />
                                        </div>
                                        <button onClick={handleCreateMeeting} disabled={!meetingTitle.trim() || !meetingDate || isCreatingMeeting} style={{ background: 'var(--accent-solid)', color: 'var(--text-on-accent)' }} className="w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                            {isCreatingMeeting ? (<><Loader2 className="w-4 h-4 animate-spin" /> AGENDANDO...</>) : (<><CalendarPlus className="w-4 h-4" /> Agendar Reunião</>)}
                                        </button>
                                    </div>
                                    <div className="h-px bg-white/10" />
                                    {meetings.length === 0 ? (
                                        <p className="text-center text-sm text-white/40 py-8">Nenhuma reunião agendada</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {meetings.map(m => {
                                                const date = new Date(m.scheduled_at);
                                                const past = date.getTime() < Date.now();
                                                return (
                                                    <div key={m.id} className={cn("p-4 rounded-2xl border", past ? "opacity-50 border-white/5" : "border-white/10")} style={{ background: 'var(--surface-3)' }}>
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div>
                                                                <p className="text-sm font-bold">{m.title}</p>
                                                                <p className="text-[11px] text-white/40 mt-1 flex items-center gap-1.5">
                                                                    <Clock className="w-3 h-3" />
                                                                    {date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })} às {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                                {m.location && <p className="text-[11px] text-white/40 mt-0.5 flex items-center gap-1.5"><LinkIcon className="w-3 h-3" /> {m.location}</p>}
                                                            </div>
                                                            {(selectedConnection.leader_id === user?.id || m.creator_id === user?.id) && (
                                                                <button onClick={() => handleDeleteMeeting(m.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400/70 hover:text-red-400 transition-colors" title="Cancelar reunião">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {confirmModal.isOpen && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ background: 'var(--surface-4)' }} className="border border-white/10 p-8 rounded-[32px] w-full max-w-sm shadow-2xl space-y-6">
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold italic tracking-tight">{confirmModal.title}</h3>
                                    <p className="text-sm text-white/60 leading-relaxed">{confirmModal.message}</p>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <button onClick={() => confirmModal.onConfirm()} style={{ background: 'var(--accent-solid)', color: 'var(--text-on-accent)' }} className="w-full py-4 text-xs font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 transition-all">Confirmar</button>
                                    <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="w-full py-4 bg-white/5 text-white/60 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all">Cancelar</button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {alertBanner.isOpen && (
                        <motion.div initial={{ y: -100, opacity: 0 }} animate={{ y: 20, opacity: 1 }} exit={{ y: -100, opacity: 0 }} className="fixed top-0 left-1/2 -translate-x-1/2 z-[210] w-full max-w-sm px-4">
                            <div className={cn("flex items-center justify-between p-4 rounded-2xl border backdrop-blur-xl shadow-2xl", alertBanner.type === 'error' ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-green-500/10 border-green-500/20 text-green-400")}>
                                <div className="flex items-center gap-3">
                                    {alertBanner.type === 'error' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                    <span className="text-[11px] font-black uppercase tracking-widest">{alertBanner.message}</span>
                                </div>
                                <button onClick={() => setAlertBanner(prev => ({ ...prev, isOpen: false }))} className="p-1 hover:bg-white/5 rounded-lg transition-colors"><X className="w-3 h-3" /></button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {copySuccess && (
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[210]">
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--surface-4)] border border-white/10 rounded-full shadow-2xl backdrop-blur-xl">
                                <Copy className="w-3.5 h-3.5 text-white/60" />
                                <span className="text-[11px] font-bold text-white/60">Mensagem copiada</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Profile Viewer */}
                <AnimatePresence>
                    {viewProfile && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center"
                        >
                            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setViewProfile(null)} />
                            <motion.div
                                initial={{ y: '100%', opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: '100%', opacity: 0 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="relative w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
                                style={{ background: 'var(--surface-3)' }}
                            >
                                {isProfileLoading ? (
                                    <div className="flex items-center justify-center py-24">
                                        <Loader2 className="w-8 h-8 animate-spin text-white/40" />
                                    </div>
                                ) : (
                                    <>
                                        {/* Banner */}
                                        <div className="relative h-40">
                                            {viewProfile.banner_url ? (
                                                <img src={viewProfile.banner_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full" style={{ background: 'var(--surface-2)' }} />
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-3)] via-transparent to-transparent" />
                                            <button
                                                onClick={() => setViewProfile(null)}
                                                className="absolute top-4 right-4 p-2 rounded-full transition-colors"
                                                style={{ background: 'var(--surface-5)' }}
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Avatar + Info */}
                                        <div className="px-6 -mt-12 pb-6 relative z-10">
                                            <div className="flex flex-col items-center text-center">
                                                <div className="w-24 h-24 rounded-full border-4 overflow-hidden flex items-center justify-center" style={{ borderColor: 'var(--surface-3)', background: 'var(--surface-4)' }}>
                                                    {viewProfile.avatar_url ? (
                                                        <img src={viewProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
                                                    )}
                                                </div>
                                                <h2 className="text-xl font-bold mt-3 tracking-tight">
                                                    {viewProfile.display_name || viewProfile.username || 'Alguém'}
                                                    {viewProfile.is_verified && <BadgeCheck className="inline w-5 h-5 ml-1.5 -mt-1" style={{ color: 'var(--accent-solid)' }} />}
                                                </h2>
                                                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>@{viewProfile.username || 'username'}</p>
                                                {viewProfile.id === user?.id ? (
                                                    <div className="flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-white/5">
                                                        <User className="w-3 h-3 text-white/50" />
                                                        <span className="text-[10px] font-bold tracking-widest uppercase text-white/50">Você</span>
                                                    </div>
                                                ) : (
                                                    (viewProfile.groupRole === 'admin' || (selectedConnection?.type === 'group' && viewProfile.id === selectedConnection?.leader_id)) && (
                                                        <div className="flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full" style={{ background: 'var(--accent-soft)' }}>
                                                            <Shield className="w-3 h-3" style={{ color: 'var(--accent-solid)' }} />
                                                            <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--accent-solid)' }}>
                                                                {viewProfile.id === selectedConnection?.leader_id ? 'Líder' : 'Co-Líder'}
                                                            </span>
                                                        </div>
                                                    )
                                                )}

                                                {/* Sobre mim */}
                                                <div className="w-full mt-5 pt-4 border-t border-white/5 text-left">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1.5">Sobre mim</p>
                                                    {viewProfile.bio ? (
                                                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{viewProfile.bio}</p>
                                                    ) : (
                                                        <p className="text-sm italic text-white/30">Sem bio por enquanto...</p>
                                                    )}
                                                </div>

                                                <div className="flex flex-col gap-2.5 mt-5 w-full">
                                                    <button
                                                        onClick={() => {
                                                            setViewProfile(null);
                                                            navigate(`/user/${viewProfile.id}`);
                                                        }}
                                                        className="w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                                                        style={{ background: 'var(--accent-solid)', color: 'var(--text-on-accent)' }}
                                                    >
                                                        Ver Perfil Completo
                                                    </button>
                                                    {viewProfile.id !== user?.id && viewProfile.groupRole && (
                                                        <button
                                                            onClick={() => {
                                                                const member = groupMembers.find(m => m.user_id === viewProfile.id);
                                                                setViewProfile(null);
                                                                setIsGroupMembersModalOpen(false);
                                                                if (member) handleMemberAction(member);
                                                            }}
                                                            className="w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all bg-white/5 hover:bg-white/10 text-white/70 flex items-center justify-center gap-2"
                                                        >
                                                            <MessageSquare className="w-4 h-4" /> Conversar
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </PageTransition>
    );
};

const ChallengeMessageCard = ({ note, isMine, stats }: { note: any, isMine?: boolean, stats?: BibleStats | null }) => {
    try {
        const data = JSON.parse(note.content.replace('[CHALLENGE]:', ''));
        const participants = data.participants || [];

        const getChallengeProgress = (targetBook: string, targetStart: number, targetEnd: number, readingHistory?: { book: string; chapters: number[] }[]) => {
            if (!readingHistory) return 0;
            const bookStats = readingHistory.find((s: any) => s.book === targetBook);
            if (!bookStats) return 0;
            const completedInTarget = bookStats.chapters.filter((c: number) => c >= targetStart && c <= targetEnd).length;
            const totalTarget = targetEnd - targetStart + 1;
            return Math.min(100, Math.round((completedInTarget / totalTarget) * 100));
        };

        const bookInfo = STATIC_BOOKS.find(b => b.name === data.book);
        const totalChapters = bookInfo?.chapters || (data.end || 50);
        const chapterCount = data.end - data.start + 1;

        return (
            <div className={cn(
                "bg-black border rounded-[32px] p-6 space-y-5 max-w-full sm:max-w-sm shadow-2xl relative overflow-hidden group",
                isMine ? "border-white/30" : "border-white/10"
            )}>
                {/* Decorative glow */}
                <div className="absolute top-0 right-0 w-40 h-40 blur-3xl -mr-20 -mt-20 pointer-events-none" style={{ background: 'var(--bg-input)' }} />

                {/* Header */}
                <div className="flex items-center gap-4 relative">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transform group-hover:rotate-3 transition-transform" style={{ background: 'linear-gradient(135deg, var(--accent-solid), #333333)' }}>
                        <BookOpen className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 leading-none">Desafio de Leitura</h4>
                        <p className="text-sm font-bold mt-1.5 text-white">por {data.leaderName}</p>
                    </div>
                    {participants.length > 0 && (
                        <div className="flex -space-x-2">
                            {participants.slice(0, 4).map((p: any, i: number) => (
                                <div key={i} className="w-7 h-7 rounded-full bg-white/10 border-2 border-black flex items-center justify-center text-[9px] font-black text-white/60">
                                    {(p.name || '?')[0].toUpperCase()}
                                </div>
                            ))}
                            {participants.length > 4 && (
                                <div className="w-7 h-7 rounded-full bg-white/20 border-2 border-black flex items-center justify-center text-[8px] font-black text-white/80">
                                    +{participants.length - 4}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Book & Chapters */}
                <div className="space-y-3 relative">
                    <div className="py-4 px-5 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-2xl font-black italic tracking-tighter text-white">{data.book}</p>
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">{chapterCount} caps</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white/60">Capítulos {data.start} — {data.end}</span>
                        </div>
                        {bookInfo && (
                            <p className="text-[11px] text-white/30 mt-2 leading-relaxed">{(bookInfo.description || '').slice(0, 80)}...</p>
                        )}
                    </div>
                </div>

                {/* My Progress (if I'm participating) */}
                {participants.some((p: any) => p.id === note.author_id) && stats && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Seu Progresso</span>
                            <span className="text-[10px] font-black text-white/60">
                                {getChallengeProgress(data.book, data.start, data.end, stats.readingHistory)}%
                            </span>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${getChallengeProgress(data.book, data.start, data.end, stats.readingHistory)}%` }}
                                className="h-full rounded-full shadow-[0_0_12px_rgba(75,136,162,0.4)]"
                                style={{ background: 'linear-gradient(90deg, var(--accent-solid), #555555)' }}
                            />
                        </div>
                    </div>
                )}

                {/* Participants list */}
                {participants.length > 0 && (
                    <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Participantes</span>
                        <div className="space-y-1.5">
                            {participants.map((p: any, i: number) => (
                                <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] rounded-xl">
                                    <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-black text-white/50">
                                        {(p.name || '?')[0].toUpperCase()}
                                    </div>
                                    <span className="text-xs text-white/50 font-medium flex-1">{p.name}</span>
                                    <CheckCircle className="w-3 h-3 text-white/20" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    } catch (e) {
        return <p className="text-sm leading-relaxed whitespace-pre-wrap">{note.content}</p>;
    }
};

const MyChallengesModal = ({ isOpen, onClose, tasks, stats, onRefresh, currentUserId }: { isOpen: boolean, onClose: () => void, tasks: DiscipleshipTask[], stats: BibleStats | null, onRefresh: () => void, currentUserId?: string }) => {
    const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

    const myActiveTasks = tasks.filter(t => t.type === 'reading' && !t.is_completed && t.disciple_id === currentUserId);
    const myCompletedTasks = tasks.filter(t => t.type === 'reading' && t.is_completed && t.disciple_id === currentUserId);

    const displayedTasks = activeTab === 'active' ? myActiveTasks : myCompletedTasks;

    const getProgress = (target: { book: string, start: number, end: number }) => {
        if (!stats?.readingHistory) return 0;
        const bookStats = stats.readingHistory.find((s: any) => s.book === target.book);
        if (!bookStats) return 0;
        const completedInTarget = bookStats.chapters.filter((c: number) => c >= target.start && c <= target.end).length;
        const totalTarget = target.end - target.start + 1;
        return Math.min(100, Math.round((completedInTarget / totalTarget) * 100));
    };

    const getBookInfo = (bookName: string) => STATIC_BOOKS.find(b => b.name === bookName);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ background: 'var(--surface-4)' }} className="border border-white/10 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl">
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 bg-white/5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'var(--border-strong)' }}>
                                        <Trophy className="w-5 h-5" style={{ color: 'var(--accent-solid)' }} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black italic tracking-tight">Meus Desafios</h2>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-0.5">
                                            {myActiveTasks.length} ativos · {myCompletedTasks.length} concluídos
                                        </p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"><X className="w-5 h-5" /></button>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={() => setActiveTab('active')}
                                    className={cn(
                                        "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        activeTab === 'active'
                                            ? "text-white shadow-lg"
                                            : "text-white/30 bg-white/5 hover:bg-white/10"
                                    )}
                                    style={activeTab === 'active' ? { background: 'var(--accent-solid)' } : {}}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <Flame className="w-3.5 h-3.5" />
                                        Ativos ({myActiveTasks.length})
                                    </div>
                                </button>
                                <button
                                    onClick={() => setActiveTab('completed')}
                                    className={cn(
                                        "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        activeTab === 'completed'
                                            ? "text-white shadow-lg"
                                            : "text-white/30 bg-white/5 hover:bg-white/10"
                                    )}
                                    style={activeTab === 'completed' ? { background: 'var(--accent-solid)' } : {}}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <Award className="w-3.5 h-3.5" />
                                        Concluídos ({myCompletedTasks.length})
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {displayedTasks.length === 0 ? (
                                <div className="text-center py-12 opacity-20">
                                    <TrendingUp className="w-12 h-12 mx-auto mb-4" />
                                    <p className="text-sm font-black uppercase tracking-widest">
                                        {activeTab === 'active' ? 'Nenhum desafio ativo' : 'Nenhum desafio concluído'}
                                    </p>
                                    <p className="text-[11px] text-white/40 mt-2">
                                        {activeTab === 'active' ? 'Participe de um desafio lançado no chat' : 'Complete seus desafios para vê-los aqui'}
                                    </p>
                                </div>
                            ) : (
                                displayedTasks.map(task => {
                                    let target = { book: '', start: 0, end: 0 };
                                    try { target = JSON.parse(task.target_id || '{}'); } catch (e) { }
                                    const progress = activeTab === 'active' ? getProgress(target) : 100;
                                    const bookInfo = getBookInfo(target.book);
                                    const chapterCount = target.end - target.start + 1;
                                    const createdDate = new Date(task.created_at);

                                    return (
                                        <motion.div
                                            key={task.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={cn(
                                                "border rounded-2xl p-4 space-y-3 transition-all",
                                                activeTab === 'completed'
                                                    ? "bg-white/[0.02] border-white/5"
                                                    : "bg-white/5 border-white/10 hover:border-white/20"
                                            )}
                                        >
                                            {/* Book info row */}
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-xl flex items-center justify-center",
                                                        activeTab === 'completed' ? "bg-white/5" : "bg-white/10"
                                                    )}>
                                                        {activeTab === 'completed' ? (
                                                            <CheckCircle className="w-5 h-5" style={{ color: 'var(--accent-solid)' }} />
                                                        ) : (
                                                            <BookOpen className="w-5 h-5 text-white/40" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className={cn(
                                                            "text-base font-black italic",
                                                            activeTab === 'completed' ? "text-white/40" : "text-white/80"
                                                        )}>
                                                            {target.book}
                                                        </p>
                                                        <p className="text-[10px] text-white/30 font-medium">
                                                            Cap. {target.start}—{target.end} · {chapterCount} capítulos
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={cn(
                                                        "text-[10px] font-black px-2 py-0.5 rounded-full",
                                                        progress === 100 ? "text-white" : "bg-white/10 text-white/60"
                                                    )} style={progress === 100 ? { background: 'var(--accent-solid)' } : {}}>
                                                        {progress}%
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Description */}
                                            {bookInfo && (
                                                <p className="text-[11px] text-white/25 leading-relaxed line-clamp-2">
                                                    {bookInfo.description}
                                                </p>
                                            )}

                                            {/* Progress bar */}
                                            {activeTab === 'active' && (
                                                <div className="space-y-1.5">
                                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${progress}%` }}
                                                            className="h-full rounded-full"
                                                            style={{ background: progress === 100 ? 'var(--accent-solid)' : 'var(--accent-solid)' }}
                                                        />
                                                    </div>
                                                    {progress === 100 && (
                                                        <button
                                                            onClick={() => discipleshipService.completeTask(task.id).then(() => { onRefresh(); onClose(); })}
                                                            style={{ background: 'var(--accent-solid)', color: 'var(--text-on-accent)' }}
                                                            className="w-full py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <CheckCircle className="w-3.5 h-3.5" /> Concluir Desafio
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {/* Metadata */}
                                            <div className="flex items-center justify-between pt-1">
                                                <span className="text-[9px] text-white/20 font-bold flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {createdDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                                </span>
                                                {activeTab === 'completed' && (
                                                    <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1" style={{ color: 'var(--accent-solid)' }}>
                                                        <CheckCircle className="w-3 h-3" /> Concluído
                                                    </span>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const ChallengeCreationModal = ({
    isOpen, onClose, onCreateChallenge,
    challengeData, setChallengeData,
    deadline, setDeadline,
    bookSearch, setBookSearch,
    bookExpanded, setBookExpanded
}: {
    isOpen: boolean;
    onClose: () => void;
    onCreateChallenge: () => void;
    challengeData: { book: string; start: number; end: number };
    setChallengeData: React.Dispatch<React.SetStateAction<{ book: string; start: number; end: number }>>;
    deadline: string;
    setDeadline: (v: string) => void;
    bookSearch: string;
    setBookSearch: (v: string) => void;
    bookExpanded: 'VT' | 'NT' | null;
    setBookExpanded: (v: 'VT' | 'NT' | null) => void;
}) => {
    const vtBooks = STATIC_BOOKS.filter(b => b.testament === 'VT');
    const ntBooks = STATIC_BOOKS.filter(b => b.testament === 'NT');

    const filteredVT = bookSearch
        ? vtBooks.filter(b => b.name.toLowerCase().includes(bookSearch.toLowerCase()))
        : vtBooks;
    const filteredNT = bookSearch
        ? ntBooks.filter(b => b.name.toLowerCase().includes(bookSearch.toLowerCase()))
        : ntBooks;

    const selectedBookInfo = STATIC_BOOKS.find(b => b.name === challengeData.book);
    const maxChapters = selectedBookInfo?.chapters || 50;

    const isValid = challengeData.book && challengeData.start >= 1 && challengeData.end >= challengeData.start && challengeData.end <= maxChapters;
    const chapterCount = challengeData.end - challengeData.start + 1;

    const handleBookSelect = (book: typeof STATIC_BOOKS[0]) => {
        setChallengeData({ book: book.name, start: 1, end: Math.min(book.chapters, 5) });
        setBookSearch('');
        setBookExpanded(null);
    };

    const quickSelects = [
        { label: '5 caps', value: 5 },
        { label: '10 caps', value: 10 },
        { label: '15 caps', value: 15 },
        { label: 'Metade', value: Math.ceil(maxChapters / 2) },
        { label: 'Livro todo', value: maxChapters },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} style={{ background: 'var(--surface-4)' }} className="border border-white/10 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0" style={{ background: 'var(--bg-input)' }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-solid)' }}>
                                    <BookOpen className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black tracking-tight">Novo Desafio</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Selecione o livro e o alcance</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                            {/* Book Search */}
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                <input
                                    type="text"
                                    placeholder="Buscar livro..."
                                    value={bookSearch}
                                    onChange={(e) => { setBookSearch(e.target.value); setBookExpanded(null); }}
                                    className="w-full bg-black/40 border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-0 focus:border-white/30 transition-all font-medium"
                                />
                                {bookSearch && (
                                    <button onClick={() => setBookSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full">
                                        <X className="w-3 h-3 text-white/40" />
                                    </button>
                                )}
                            </div>

                            {/* Selected Book Display */}
                            {selectedBookInfo && !bookSearch && (
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-lg font-black italic text-white">{challengeData.book}</span>
                                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">{maxChapters} caps</span>
                                    </div>
                                    <p className="text-[11px] text-white/30 leading-relaxed line-clamp-2">{selectedBookInfo.description}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/5 text-white/30">{selectedBookInfo.testament}</span>
                                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/5 text-white/30">{selectedBookInfo.group}</span>
                                    </div>
                                </div>
                            )}

                            {/* Book List */}
                            {(bookSearch || bookExpanded) && (
                                <div className="space-y-3">
                                    {!bookSearch && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">
                                                {bookExpanded === 'VT' ? 'Velho Testamento' : 'Novo Testamento'}
                                            </span>
                                            <button onClick={() => setBookExpanded(null)} className="text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white/60">
                                                Fechar
                                            </button>
                                        </div>
                                    )}
                                    <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                        {(bookSearch ? [...filteredVT, ...filteredNT] : bookExpanded === 'VT' ? filteredVT : filteredNT).map(book => (
                                            <button
                                                key={book.name}
                                                onClick={() => handleBookSelect(book)}
                                                className={cn(
                                                    "w-full flex items-center justify-between p-3 rounded-xl text-left transition-all",
                                                    challengeData.book === book.name ? "bg-white/10 border border-white/20" : "hover:bg-white/5 border border-transparent"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                                        <BookOpen className="w-4 h-4 text-white/30" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white/80">{book.name}</p>
                                                        <p className="text-[9px] text-white/25 uppercase tracking-widest">{book.testament} · {book.chapters} caps</p>
                                                    </div>
                                                </div>
                                                {challengeData.book === book.name && <Check className="w-4 h-4" style={{ color: 'var(--accent-solid)' }} />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Testament Tabs (when no search) */}
                            {!bookSearch && !bookExpanded && (
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setBookExpanded('VT')}
                                        className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-center"
                                    >
                                        <p className="text-2xl font-black italic text-white/20">VT</p>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mt-1">{vtBooks.length} livros</p>
                                    </button>
                                    <button
                                        onClick={() => setBookExpanded('NT')}
                                        className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-center"
                                    >
                                        <p className="text-2xl font-black italic text-white/20">NT</p>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mt-1">{ntBooks.length} livros</p>
                                    </button>
                                </div>
                            )}

                            {/* Chapter Range */}
                            <div className="space-y-3">
                                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Capítulos</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] uppercase tracking-widest text-white/25 font-bold ml-1">De</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max={maxChapters}
                                            value={challengeData.start}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 1;
                                                setChallengeData(prev => ({ ...prev, start: Math.max(1, Math.min(val, maxChapters)), end: Math.max(val, prev.end) }));
                                            }}
                                            className="w-full bg-black/40 border-white/10 rounded-xl py-3 px-4 text-sm focus:ring-0 focus:border-white/30 transition-all font-medium text-center"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] uppercase tracking-widest text-white/25 font-bold ml-1">Até</label>
                                        <input
                                            type="number"
                                            min={challengeData.start}
                                            max={maxChapters}
                                            value={challengeData.end}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || challengeData.start;
                                                setChallengeData(prev => ({ ...prev, end: Math.max(prev.start, Math.min(val, maxChapters)) }));
                                            }}
                                            className="w-full bg-black/40 border-white/10 rounded-xl py-3 px-4 text-sm focus:ring-0 focus:border-white/30 transition-all font-medium text-center"
                                        />
                                    </div>
                                </div>

                                {/* Quick select buttons */}
                                <div className="flex flex-wrap gap-1.5">
                                    {quickSelects.map(qs => (
                                        <button
                                            key={qs.label}
                                            onClick={() => setChallengeData(prev => ({ ...prev, end: Math.min(prev.start + qs.value - 1, maxChapters) }))}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                                chapterCount === qs.value ? "text-white" : "bg-white/5 text-white/30 hover:bg-white/10"
                                            )}
                                            style={chapterCount === qs.value ? { background: 'var(--accent-solid)' } : {}}
                                        >
                                            {qs.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Validation feedback */}
                                {challengeData.end > maxChapters && (
                                    <p className="text-[11px] text-red-400 font-medium">
                                        Máximo de capítulos para {challengeData.book}: {maxChapters}
                                    </p>
                                )}
                            </div>

                            {/* Deadline (optional) */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1 flex items-center gap-2">
                                        <Calendar className="w-3 h-3" />
                                        Prazo (opcional)
                                    </label>
                                    {deadline && (
                                        <button onClick={() => setDeadline('')} className="text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-white/60">
                                            Remover
                                        </button>
                                    )}
                                </div>
                                <input
                                    type="date"
                                    value={deadline}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setDeadline(e.target.value)}
                                    className="w-full bg-black/40 border-white/10 rounded-xl py-3 px-4 text-sm focus:ring-0 focus:border-white/30 transition-all font-medium text-white/60"
                                />
                                {deadline && (
                                    <p className="text-[10px] text-white/30 ml-1">
                                        Prazo: {new Date(deadline + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/5 shrink-0">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">
                                    {challengeData.book} · {chapterCount} capítulos
                                </span>
                                {!isValid && (
                                    <span className="text-[10px] text-red-400 font-bold">Verifique os capítulos</span>
                                )}
                            </div>
                            <button
                                onClick={onCreateChallenge}
                                disabled={!isValid}
                                style={{ background: isValid ? 'var(--accent-solid)' : undefined, color: '#fff' }}
                                className={cn(
                                    "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl",
                                    isValid ? "hover:scale-[1.02] active:scale-95" : "bg-white/5 text-white/20 cursor-not-allowed"
                                )}
                            >
                                Lançar Desafio
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Discipleship;
