import React, { useState, useEffect, useMemo, useRef } from 'react';
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
    MessageSquarePlus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { discipleshipService, DiscipleshipTask, DiscipleshipNote } from '../services/features/discipleshipService';
import { statsService, BibleStats } from '../services/features/statsService';
import PageTransition from '../components/PageTransition';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

const Discipleship: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { profile } = useProfile();
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'list' | 'chat'>('list');

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
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void | Promise<void> }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });
    const [alertBanner, setAlertBanner] = useState<{ isOpen: boolean, message: string, type: 'error' | 'success' }>({ isOpen: false, message: '', type: 'error' });
    const [isSending, setIsSending] = useState(false);

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

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const connectionsRef = useRef<any[]>([]);
    const selectedConnectionRef = useRef<any | null>(null);
    const presenceChannelRef = useRef<any>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => { connectionsRef.current = connections; }, [connections]);
    useEffect(() => { selectedConnectionRef.current = selectedConnection; }, [selectedConnection]);

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
                    event: 'INSERT',
                    schema: 'public',
                    table: 'discipleship_notes'
                },
                async (payload) => {
                    const newNote = payload.new as DiscipleshipNote;
                    const current = selectedConnectionRef.current;
                    
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

    const handleCreateGroup = async () => {
        if (!user || !newGroupName.trim() || isCreatingGroup) return;
        setIsCreatingGroup(true);
        try {
            const groupId = await discipleshipService.createGroup(user.id, newGroupName);
            setNewGroupName('');
            setIsGroupModalOpen(false);
            loadConnections();

            // Automatically select the new group
            const newGroup = { id: groupId, name: newGroupName, leader_id: user.id, type: 'group' };
            handleSelectConnection(newGroup);
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
                leaderName: profile?.display_name || profile?.username || 'Líder',
                participants: []
            })}`;

            console.log('Sending challenge message:', challengeMsg);
            const leaderId = selectedConnection.type === 'leader' ? selectedConnection.leader_id : (selectedConnection.leader_id || user.id);
            const discipleId = selectedConnection.type === 'leader' ? user.id : (selectedConnection.disciple_id || null);
            const groupId = selectedConnection.type === 'group' ? selectedConnection.id : null;

            await discipleshipService.addNote(leaderId, discipleId, user.id, challengeMsg, groupId);

            setIsChallengeModalOpen(false);
            // Reload to show the new note
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
            loadChatData();
        } catch (error) {
            console.error('Error updating note:', error);
            alert('Erro ao editar mensagem.');
        }
    };

    const handleDeleteNote = (noteId: string) => {
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
            <div className="h-screen text-white flex flex-col font-sans overflow-hidden" style={{ background: '#252627' }}>
                {/* Modals handled same as before... (Search, Group Creation) */}
                <AnimatePresence>
                    {isSearchOpen && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} style={{ background: '#1a1a1a' }} className="border border-white/10 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl">
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
                                                <div style={{ background: 'rgba(75, 136, 162, 0.15)' }} className="w-16 h-16 rounded-full flex items-center justify-center animate-bounce" >
                                                    <Check className="w-8 h-8" style={{ color: '#4B88A2' }} />
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
                                                    <button onClick={() => handleInvite(r)} style={{ background: '#4B88A2', color: '#fff' }} className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
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
                            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} style={{ background: '#1a1a1a' }} className="border border-white/10 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl">
                                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                    <h3 className="text-xl font-bold tracking-tight">Criar Novo Grupo</h3>
                                    <button onClick={() => setIsGroupModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                                </div>
                                <div className="p-6 space-y-6">
                                    <div className="space-y-4">
                                        <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Nome do Grupo</label>
                                        <input type="text" autoFocus placeholder="Ex: Discipulado Jovens" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} className="w-full bg-black/40 border-white/10 rounded-2xl py-4 px-6 text-sm focus:ring-0 focus:border-white/30 transition-all font-medium" />
                                    </div>
                                    <button onClick={handleCreateGroup} disabled={!newGroupName.trim() || isCreatingGroup} style={{ background: '#4B88A2', color: '#fff' }} className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                        {isCreatingGroup ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" /> CRIANDO...
                                            </>
                                        ) : 'Criar Grupo'}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                    {isChallengeModalOpen && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} style={{ background: '#1a1a1a' }} className="border border-white/10 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl">
                                <div className="p-6 border-b border-white/5 flex items-center justify-between" style={{ background: 'rgba(75, 136, 162, 0.1)' }}>
                                    <div className="flex items-center gap-3">
                                        <TrendingUp className="w-6 h-6 text-white/60" />
                                        <h3 className="text-xl font-bold tracking-tight">Novo Desafio de Leitura</h3>
                                    </div>
                                    <button onClick={() => setIsChallengeModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                                </div>
                                <div className="p-6 space-y-6">
                                    <div className="space-y-4">
                                        <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Livro da Bíblia</label>
                                        <select
                                            value={challengeData.book}
                                            onChange={(e) => setChallengeData(prev => ({ ...prev, book: e.target.value }))}
                                            className="w-full bg-black/40 border-white/10 rounded-2xl py-4 px-6 text-sm focus:ring-0 focus:border-white/30 transition-all font-medium appearance-none"
                                        >
                                            {['Gênesis', 'Êxodo', 'Levítico', 'Números', 'Deuteronômio', 'Josué', 'Juízes', 'Rute', '1 Samuel', '2 Samuel', '1 Reis', '2 Reis', '1 Crônicas', '2 Crônicas', 'Esdras', 'Neemias', 'Ester', 'Jó', 'Salmos', 'Provérbios', 'Eclesiastes', 'Cantares', 'Isaías', 'Jeremias', 'Lamentações', 'Ezequiel', 'Daniel', 'Oseias', 'Joel', 'Amós', 'Obadias', 'Jonas', 'Miqueias', 'Naum', 'Habacuque', 'Sofonias', 'Ageu', 'Zacarias', 'Malaquias', 'Mateus', 'Marcos', 'Lucas', 'João', 'Atos', 'Romanos', '1 Coríntios', '2 Coríntios', 'Gálatas', 'Efésios', 'Filipenses', 'Colossenses', '1 Tessalonicenses', '2 Tessalonicenses', '1 Timóteo', '2 Timóteo', 'Tito', 'Filemom', 'Hebreus', 'Tiago', '1 Pedro', '2 Pedro', '1 João', '2 João', '3 João', 'Judas', 'Apocalipse'].map(b => (
                                                <option key={b} value={b} className="bg-[#1a1a1a]">{b}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Capítulo Inicial</label>
                                            <input type="number" min="1" value={challengeData.start} onChange={(e) => setChallengeData(prev => ({ ...prev, start: parseInt(e.target.value) || 1 }))} className="w-full bg-black/40 border-white/10 rounded-2xl py-4 px-6 text-sm focus:ring-0 focus:border-white/30 transition-all font-medium" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Capítulo Final</label>
                                            <input type="number" min="1" value={challengeData.end} onChange={(e) => setChallengeData(prev => ({ ...prev, end: parseInt(e.target.value) || 1 }))} className="w-full bg-black/40 border-white/10 rounded-2xl py-4 px-6 text-sm focus:ring-0 focus:border-white/30 transition-all font-medium" />
                                        </div>
                                    </div>
                                    <button onClick={handleCreateChallenge} style={{ background: '#4B88A2', color: '#fff' }} className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-white/20">
                                        Lançar Desafio
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex flex-1 overflow-hidden">


                    {/* Sidebar */}
                    <aside className={cn("w-full md:w-[380px] border-r border-white/5 flex flex-col transition-all", view === 'chat' ? 'hidden md:flex' : 'flex')}>
                        <header className="p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => navigate('/dashboard')} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all"><ArrowLeft className="w-5 h-5" /></button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => { setSearchMode('global'); setIsSearchOpen(true); }} className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all shadow-xl" title="Novo Chat Privado"><MessageSquarePlus className="w-5 h-5 text-white/60" /></button>
                                    <button onClick={() => setIsGroupModalOpen(true)} className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all shadow-xl" title="Novo Grupo"><Users className="w-5 h-5 text-white/60" /></button>
                                    <button onClick={() => { setSearchMode('global'); setIsSearchOpen(true); }} style={{ background: '#4B88A2', color: '#fff' }} className="p-3 rounded-2xl hover:scale-110 active:scale-90 transition-all shadow-xl"><Plus className="w-5 h-5" /></button>
                                </div>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto px-4 space-y-2 custom-scrollbar pb-24">
                            {connections.map(conn => {
                                const isPending = (conn.status === 'pending') || (conn.member_status === 'pending');
                                return (
                                    <button key={`${conn.type}-${conn.id}`} onClick={() => !isPending && handleSelectConnection(conn)} className={cn("w-full p-4 rounded-[28px] flex items-center gap-4 transition-all group", selectedConnection?.id === conn.id ? "shadow-lg" : "hover:bg-white/5 border border-transparent", isPending && "cursor-default opacity-80")} style={selectedConnection?.id === conn.id ? { background: 'rgba(75, 136, 162, 0.1)', border: '1px solid rgba(75, 136, 162, 0.15)' } : {}}>
                                        <div className="w-14 h-14 rounded-full bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                            {conn.type === 'group' ? (
                                                conn.avatar_url ? <img src={conn.avatar_url} className="w-full h-full object-cover" /> : <Users className="w-6 h-6 text-white/40" />
                                            ) : conn.profile?.avatar_url ? (
                                                <img src={conn.profile.avatar_url} className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-6 h-6 text-white/20" />
                                            )}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-sm">{conn.type === 'group' ? conn.name : (conn.profile?.display_name || conn.profile?.username || 'Usuário')}</span>
                                                {conn.type !== 'self' && (
                                                    <span className={cn(
                                                        "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                                                        conn.type === 'leader' ? "" : "bg-white/5 text-white/20"
                                                    )} style={conn.type === 'leader' ? { background: 'rgba(75, 136, 162, 0.1)', color: '#4B88A2' } : {}}>
                                                        {conn.type === 'leader' ? 'Líder' : 'Discípulo'}
                                                    </span>
                                                )}
                                            </div>
                                            {isPending ? (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <button onClick={(e) => { e.stopPropagation(); handleRespondInvite(conn, true); }} style={{ background: '#4B88A2', color: '#fff' }} className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all">Aceitar</button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleRespondInvite(conn, false); }} className="px-3 py-1 bg-white/10 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all">Recusar</button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between gap-2 mt-1">
                                                    <p className="text-[11px] text-white/40 line-clamp-1 italic">Toque para abrir a conversa...</p>
                                                    {(() => {
                                                        const unreadKey = conn.type === 'group' ? conn.id : (conn.leader_id === user?.id ? conn.disciple_id : conn.leader_id);
                                                        const count = unreadCounts[unreadKey] || 0;
                                                        if (count > 0) {
                                                            return (
                                                                <div style={{ background: '#4B88A2', color: '#fff' }} className="min-w-[18px] h-[18px] text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow-lg shrink-0">
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
                    <main className={cn("flex-1 flex flex-col transition-all relative", view === 'list' ? 'hidden md:flex' : 'flex')} style={{ background: '#252627' }}>
                        {selectedConnection ? (
                            <>
                                <header className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-md sticky top-0 z-20">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setView('list')} className="md:hidden p-2.5 bg-white/5 rounded-xl"><ArrowLeft className="w-5 h-5" /></button>
                                        <div className="flex items-center gap-3">
                                            <div className="relative group/avatar">
                                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center">
                                                    {selectedConnection.type === 'group' ? (
                                                        selectedConnection.avatar_url ? <img src={selectedConnection.avatar_url} className="w-full h-full object-cover" /> : <Users className="w-5 h-5 md:w-6 md:h-6 text-white/40" />
                                                    ) : selectedConnection.profile?.avatar_url ? (
                                                        <img src={selectedConnection.profile.avatar_url} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User className="w-5 h-5 md:w-6 md:h-6 text-white/20" />
                                                    )}
                                                </div>
                                                {selectedConnection.type === 'group' && selectedConnection.leader_id === user?.id && (
                                                    <button
                                                        onClick={() => {
                                                            const input = document.createElement('input');
                                                            input.type = 'file';
                                                            input.accept = 'image/*,image/gif';
                                                            input.onchange = (e: any) => handleFileUpload(e, true);
                                                            input.click();
                                                        }}
                                                        className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center rounded-full"
                                                    >
                                                        <ImageIcon className="w-4 h-4 text-white" />
                                                    </button>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-sm md:text-xl tracking-tight leading-tight">{selectedConnection.name || selectedConnection.profile?.display_name || selectedConnection.profile?.username}</h3>
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
                                                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#4B88A2' }} />
                                                            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#4B88A2' }}>Disponível</span>
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
                                            <button onClick={() => { setSearchMode('group'); setIsSearchOpen(true); }} className="p-2.5 md:p-3 hover:opacity-80 rounded-2xl transition-all border" style={{ background: 'rgba(75, 136, 162, 0.1)', borderColor: 'rgba(75, 136, 162, 0.15)' }}>
                                                <UserPlus className="w-5 h-5" style={{ color: '#4B88A2' }} />
                                            </button>
                                        )}
                                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2.5 md:p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors border border-white/5">
                                            <MoreVertical className="w-5 h-5" />
                                        </button>

                                                <AnimatePresence>
                                                    {isMenuOpen && (
                                                        <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} style={{ background: '#1a1a1a' }} className="absolute right-0 top-full mt-2 w-48 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-30">
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

                                                return (
                                                    <div key={task.id} className="bg-black/40 border border-white/20 rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                                                    <TrendingUp className="w-4 h-4 text-white/60" />
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-white/60">Desafio Ativo</h4>
                                                                    <p className="text-sm font-bold">{target.book} {target.start}-{target.end}</p>
                                                                </div>
                                                            </div>
                                                            <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">{progress}% concluído</span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${progress}%` }}
                                                                className="h-full shadow-[0_0_10px_rgba(75,136,162,0.3)]"
                                                                style={{ background: '#4B88A2' }}
                                                            />
                                                        </div>
                                                        {(progress === 100 || selectedConnection.leader_id === user!.id) && (
                                                            <button
                                                                onClick={() => discipleshipService.completeTask(task.id).then(() => loadChatData())}
                                                                style={{ background: '#4B88A2', color: '#fff' }}
                                                                className="py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
                                                            >
                                                                {progress === 100 ? "Concluir Desafio ✅" : "Marcar como Concluído"}
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
                                                            <div className={cn("px-5 py-3.5 rounded-[28px] max-w-[280px] md:max-w-md group relative transition-all shadow-xl", isMine ? "font-semibold rounded-tr-none" : "bg-white/5 border border-white/10 text-white rounded-tl-none")} style={isMine ? { background: '#4B88A2', color: '#fff' } : {}}>
                                                                {editingNoteId === n.id ? (
                                                                    <div className="space-y-3 min-w-[200px]">
                                                                        <textarea
                                                                            value={editingContent}
                                                                            onChange={(e) => setEditingContent(e.target.value)}
                                                                            className="w-full bg-black/10 border-black/10 rounded-xl p-2 text-sm text-black focus:ring-0 focus:border-black/20 font-medium resize-none"
                                                                            autoFocus
                                                                        />
                                                                        <div className="flex justify-end gap-2">
                                                                            <button onClick={() => setEditingNoteId(null)} className="px-3 py-1 bg-black/5 text-black/40 rounded-lg text-[9px] font-black uppercase tracking-widest">Cancelar</button>
                                                                            <button onClick={() => handleEditNote(n.id)} className="px-3 py-1 bg-black text-white rounded-lg text-[9px] font-black uppercase tracking-widest">Salvar</button>
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
                                                                                        <ChallengeMessageCard note={n} isMine={isMine} />
                                                                                    ) : (
                                                                                        <p className="text-sm mt-2">{n.content}</p>
                                                                                    )
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            n.content.startsWith('[CHALLENGE]:') ? (
                                                                                <ChallengeMessageCard note={n} isMine={isMine} />
                                                                            ) : (
                                                                                <p className="text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap">{n.content}</p>
                                                                            )
                                                                        )}

                                                                        {isMine && !n.content.startsWith('[CHALLENGE]:') && (
                                                                            <div className={cn(
                                                                                "absolute top-0 opacity-0 group-hover:opacity-100 transition-all flex gap-1",
                                                                                isMine ? "-left-1 translate-x-[-120%]" : "-right-1 translate-x-full"
                                                                            )}>
                                                                                <button
                                                                                    onClick={() => { setEditingNoteId(n.id); setEditingContent(n.content); }}
                                                                                    className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white/40 hover:text-white transition-all shadow-sm backdrop-blur-md border border-white/5"
                                                                                    title="Editar"
                                                                                >
                                                                                    <MessageSquarePlus className="w-3.5 h-3.5" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDeleteNote(n.id)}
                                                                                    className="p-1.5 bg-red-500/5 hover:bg-red-500/20 rounded-lg text-red-500/40 hover:text-red-500 transition-all shadow-sm backdrop-blur-md border border-red-500/10"
                                                                                    title="Excluir"
                                                                                >
                                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                            <span className="text-[8px] text-white/20 font-bold uppercase px-1">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
                                <footer className="p-6 border-t border-white/5" style={{ background: '#1a1a1a' }}>
                                    <div className="max-w-4xl mx-auto flex gap-3 items-end">
                                        <div className="relative">
                                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" />
                                            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading || isSending} className="p-4 bg-white/5 text-white/40 rounded-[24px] hover:bg-white/10 transition-all border border-white/5 disabled:opacity-50">
                                                {isUploading || isSending ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Paperclip className="w-5 h-5" />}
                                            </button>
                                        </div>
                                        <div className="flex-1 bg-white/[0.03] rounded-[32px] flex flex-col p-2 transition-all group/input">
                                            <textarea rows={1} value={noteInput} onChange={(e) => handleTyping(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder="Digite sua mensagem..." className="w-full bg-transparent border-none focus:ring-0 text-sm py-4 px-6 font-medium resize-none custom-scrollbar max-h-32 text-white/90" />
                                            <div className="flex justify-end p-2 opacity-60 hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleSendMessage()} disabled={(!noteInput.trim() && !isUploading) || isSending} style={{ background: '#4B88A2', color: '#fff' }} className="p-3.5 rounded-2xl hover:scale-110 active:scale-90 transition-all shadow-lg disabled:opacity-50 disabled:scale-100">
                                                    {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </footer>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center p-12 text-center bg-gradient-to-b from-transparent to-white/[0.02] mix-blend-screen opacity-40">
                                <div className="max-w-sm space-y-8">
                                    <MessageSquare className="w-20 h-20 text-white/10 mx-auto" />
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
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ background: '#1a1a1a' }} className="border border-white/10 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl">
                                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                                    <div className="flex items-center gap-3">
                                        <Users className="w-5 h-5 text-white/60" />
                                        <h2 className="text-xl font-black italic tracking-tight">Membros do Grupo</h2>
                                    </div>
                                    <button onClick={() => setIsGroupMembersModalOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"><X className="w-5 h-5" /></button>
                                </div>
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
                                                <div key={member.id} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
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
                                                                    style={{ background: 'rgba(75, 136, 162, 0.1)', borderColor: 'rgba(75, 136, 162, 0.15)', color: '#4B88A2' }}
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
                    {confirmModal.isOpen && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ background: '#1a1a1a' }} className="border border-white/10 p-8 rounded-[32px] w-full max-w-sm shadow-2xl space-y-6">
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold italic tracking-tight">{confirmModal.title}</h3>
                                    <p className="text-sm text-white/60 leading-relaxed">{confirmModal.message}</p>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <button onClick={() => confirmModal.onConfirm()} style={{ background: '#4B88A2', color: '#fff' }} className="w-full py-4 text-xs font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 transition-all">Confirmar</button>
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
            </div>
        </PageTransition>
    );
};

const ChallengeMessageCard = ({ note, isMine }: { note: any, isMine?: boolean }) => {
    try {
        const data = JSON.parse(note.content.replace('[CHALLENGE]:', ''));

        return (
            <div className={cn(
                "bg-black border border-white/10 rounded-[32px] p-6 md:p-8 space-y-6 max-w-sm shadow-2xl relative overflow-hidden group",
                isMine ? "border-white/30" : ""
            )}>
                {/* Decorative element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl -mr-16 -mt-16 pointer-events-none" />

                <div className="flex items-center gap-4 relative">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl transform group-hover:rotate-6 transition-transform" style={{ background: '#4B88A2' }}>
                        <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 leading-none">Desafio de Leitura</h4>
                        <p className="text-base font-bold mt-1.5 text-white">Lançado por {data.leaderName}</p>
                    </div>
                </div>

                <div className="space-y-2 relative">
                    <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-black">Meta Proposta</p>
                    <div className="py-4 px-6 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm shadow-inner shadow-black">
                        <p className="text-2xl font-black italic tracking-tighter text-white">{data.book}</p>
                        <p className="text-sm font-medium text-white/60 mt-1 italic">Capítulos {data.start} até {data.end}</p>
                    </div>
                </div>
            </div>
        );
    } catch (e) {
        return <p className="text-sm leading-relaxed whitespace-pre-wrap">{note.content}</p>;
    }
};

const MyChallengesModal = ({ isOpen, onClose, tasks, stats, onRefresh, currentUserId }: { isOpen: boolean, onClose: () => void, tasks: DiscipleshipTask[], stats: BibleStats | null, onRefresh: () => void, currentUserId?: string }) => {
    // Only show tasks assigned to the current user
    const myActiveTasks = tasks.filter(t => t.type === 'reading' && !t.is_completed && t.disciple_id === currentUserId);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ background: '#1a1a1a' }} className="border border-white/10 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                            <div className="flex items-center gap-3">
                                <TrendingUp className="w-5 h-5 text-white/60" />
                                <h2 className="text-xl font-black italic tracking-tight">Meus Desafios</h2>
                            </div>
                            <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {myActiveTasks.length === 0 ? (
                                <div className="text-center py-12 opacity-20">
                                    <TrendingUp className="w-12 h-12 mx-auto mb-4" />
                                    <p className="text-sm font-black uppercase tracking-widest">Nenhum desafio ativo</p>
                                </div>
                            ) : (
                                myActiveTasks.map(task => {
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

                                    return (
                                        <div key={task.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <p className="text-lg font-black italic text-white/80">{target.book} {target.start}-{target.end}</p>
                                                <span className="text-[10px] font-black bg-white/10 text-white/60 px-2 py-0.5 rounded-full">{progress}%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full transition-all duration-1000" style={{ width: `${progress}%`, background: '#4B88A2' }} />
                                            </div>
                                            {progress === 100 && (
                                                <button
                                                    onClick={() => discipleshipService.completeTask(task.id).then(() => { onRefresh(); onClose(); })}
                                                    style={{ background: '#4B88A2', color: '#fff' }}
                                                    className="w-full py-2 text-[10px] font-black uppercase tracking-widest rounded-xl"
                                                >
                                                    Marcar como Concluído ✅
                                                </button>
                                            )}
                                        </div>
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

export default Discipleship;
