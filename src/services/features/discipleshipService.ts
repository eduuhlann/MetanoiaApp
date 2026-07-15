import { supabase } from '../../lib/supabase';

export interface DiscipleshipConnection {
    id: string;
    leader_id: string;
    disciple_id: string;
    status: 'active' | 'inactive';
    created_at: string;
    profiles?: {
        username: string | null;
        avatar_url: string | null;
    };
}

export interface DiscipleshipTask {
    id: string;
    leader_id: string;
    disciple_id: string;
    title: string;
    type: 'chapter' | 'plan' | 'reading' | 'other';
    target_id: string | null;
    is_completed: boolean;
    created_at: string;
}

export interface DiscipleshipNote {
    id: string;
    leader_id: string;
    disciple_id: string | null;
    author_id: string;
    content: string;
    created_at: string;
    group_id?: string | null;
    file_url?: string | null;
    file_name?: string | null;
    file_type?: string | null;
    is_read?: boolean;
}

export const discipleshipService = {
    async getDisciples(leaderId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('discipleship_connections')
            .select('*, profiles:disciple_id (username, avatar_url)')
            .eq('leader_id', leaderId)
            .neq('status', 'inactive');
        if (error) { console.error('Error fetching disciples:', error); return []; }
        return data || [];
    },

    async getLeaders(discipleId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('discipleship_connections')
            .select('*, profiles:leader_id (username, avatar_url)')
            .eq('disciple_id', discipleId)
            .neq('status', 'inactive');
        if (error) return [];
        return data || [];
    },

    async getOrCreateConnection(userId1: string, userId2: string): Promise<any> {
        const { data: existing } = await supabase
            .from('discipleship_connections')
            .select('*, profiles:disciple_id (username, avatar_url)')
            .or(`and(leader_id.eq.${userId1},disciple_id.eq.${userId2}),and(leader_id.eq.${userId2},disciple_id.eq.${userId1})`)
            .maybeSingle();
        if (existing) return existing;
        const { data: created, error: createError } = await supabase
            .from('discipleship_connections')
            .insert({ leader_id: userId1, disciple_id: userId2, status: 'active' })
            .select('*, profiles:disciple_id (username, avatar_url)')
            .single();
        if (createError) throw createError;
        return created;
    },

    async getPrivateConnection(user1Id: string, user2Id: string): Promise<any | null> {
        const { data, error } = await supabase
            .from('discipleship_connections')
            .select('*, disciple_profile:disciple_id (username, avatar_url), leader_profile:leader_id (username, avatar_url)')
            .or(`and(leader_id.eq.${user1Id},disciple_id.eq.${user2Id}),and(leader_id.eq.${user2Id},disciple_id.eq.${user1Id})`)
            .maybeSingle();
        if (error) return null;
        if (data) {
            const isUser1Leader = data.leader_id === user1Id;
            return { ...data, type: isUser1Leader ? 'disciple' : 'leader', profile: isUser1Leader ? data.disciple_profile : data.leader_profile };
        }
        return null;
    },

    async searchUsers(query: string): Promise<any[]> {
        if (!query || query.length < 3) return [];
        const { data, error } = await supabase.from('profiles').select('id, username, avatar_url').ilike('username', `%${query}%`).limit(10);
        if (error) return [];
        return data || [];
    },

    async respondToInvite(connectionId: string, accept: boolean): Promise<void> {
        const { error } = await supabase.from('discipleship_connections').update({ status: accept ? 'active' : 'inactive' }).eq('id', connectionId);
        if (error) throw error;
    },

    async addNote(leaderId: string | null, discipleId: string | null, authorId: string, content: string, groupId: string | null = null, file: { url: string; name: string; type: string } | null = null): Promise<DiscipleshipNote> {
        const { data, error } = await supabase
            .from('discipleship_notes')
            .insert({ leader_id: leaderId, disciple_id: discipleId, author_id: authorId, content, group_id: groupId, file_url: file?.url, file_name: file?.name, file_type: file?.type })
            .select('*, profiles:author_id(*)')
            .single();
        if (error) throw error;
        return data as DiscipleshipNote;
    },

    async updateNote(noteId: string, content: string): Promise<void> {
        const { error } = await supabase.from('discipleship_notes').update({ content }).eq('id', noteId);
        if (error) throw error;
    },

    async deleteNote(noteId: string): Promise<void> {
        const { error } = await supabase.from('discipleship_notes').delete().eq('id', noteId);
        if (error) throw error;
    },

    async getNotes(leaderId: string | null, discipleId: string | null, groupId: string | null = null): Promise<DiscipleshipNote[]> {
        const { data: { user } } = await supabase.auth.getUser();
        let query = supabase.from('discipleship_notes').select('*, profiles:author_id(*)');
        let clearQuery = supabase.from('chat_clear_history').select('cleared_at').eq('user_id', user?.id || '').order('cleared_at', { ascending: false }).limit(1);
        if (groupId) {
            query = query.eq('group_id', groupId);
            clearQuery = clearQuery.eq('group_id', groupId);
        } else {
            query = query.eq('leader_id', leaderId).eq('disciple_id', discipleId).is('group_id', null);
            const partnerId = leaderId === user?.id ? discipleId : leaderId;
            clearQuery = clearQuery.eq('partner_id', partnerId).is('group_id', null);
        }
        const { data: clearData } = await clearQuery.maybeSingle();
        if (clearData?.cleared_at) { query = query.gt('created_at', clearData.cleared_at); }
        const { data, error } = await query.order('created_at', { ascending: true });
        if (error) { console.error('Error fetching notes:', error); return []; }
        return data || [];
    },

    async clearConversation(leaderId: string | null, discipleId: string | null, groupId: string | null = null): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        let partnerId = null;
        if (!groupId) { partnerId = leaderId === user.id ? discipleId : leaderId; }
        let deleteQuery = supabase.from('chat_clear_history').delete().eq('user_id', user.id);
        if (groupId) deleteQuery = deleteQuery.eq('group_id', groupId);
        else deleteQuery = deleteQuery.eq('partner_id', partnerId).is('group_id', null);
        await deleteQuery;
        const { error } = await supabase.from('chat_clear_history').insert({ user_id: user.id, group_id: groupId, partner_id: partnerId, cleared_at: new Date().toISOString() });
        if (error) throw error;
    },

    async markNotesAsRead(leaderId: string, discipleId: string | null, readerId: string, groupId: string | null = null): Promise<void> {
        let query = supabase.from('discipleship_notes').update({ is_read: true }).neq('author_id', readerId).eq('is_read', false);
        if (groupId) { query = query.eq('group_id', groupId); }
        else { query = query.eq('leader_id', leaderId).eq('disciple_id', discipleId).is('group_id', null); }
        const { error } = await query;
        if (error) console.error('Error marking notes as read:', error);
    },

    async getUnreadCounts(userId: string): Promise<Record<string, number>> {
        const { data: groupMemberships } = await supabase.from('discipleship_group_members').select('group_id').eq('user_id', userId).eq('status', 'active');
        const groupIds = groupMemberships?.map(m => m.group_id) || [];
        let query = supabase.from('discipleship_notes').select('leader_id, disciple_id, group_id').eq('is_read', false).neq('author_id', userId);
        if (groupIds.length > 0) { query = query.or(`leader_id.eq.${userId},disciple_id.eq.${userId},group_id.in.(${groupIds.join(',')})`); }
        else { query = query.or(`leader_id.eq.${userId},disciple_id.eq.${userId}`); }
        const { data: notes, error } = await query;
        if (error || !notes) return {};
        const counts: Record<string, number> = {};
        notes.forEach(note => {
            const key = note.group_id || (note.leader_id === userId ? note.disciple_id : note.leader_id);
            if (key) { counts[key] = (counts[key] || 0) + 1; }
        });
        return counts;
    },

    async getGroups(userId: string): Promise<any[]> {
        const { data, error } = await supabase.from('discipleship_group_members').select('*, group:group_id (*)').eq('user_id', userId);
        if (error) return [];
        return (data || []).map(m => ({ ...m.group, type: m.group.leader_id === userId ? 'leader' : 'member', member_status: m.status, member_id: m.id }));
    },

    async createGroup(leaderId: string, name: string): Promise<string> {
        const { data, error } = await supabase.from('discipleship_groups').insert({ leader_id: leaderId, name }).select().single();
        if (error) throw error;
        await supabase.from('discipleship_group_members').insert({ group_id: data.id, user_id: leaderId, status: 'active', role: 'admin' });
        return data.id;
    },

    async deleteGroup(groupId: string): Promise<void> {
        const { error } = await supabase.from('discipleship_groups').delete().eq('id', groupId);
        if (error) throw error;
    },

    async inviteToGroup(groupId: string, userId: string): Promise<void> {
        const { error } = await supabase.from('discipleship_group_members').upsert({ group_id: groupId, user_id: userId, status: 'pending' }, { onConflict: 'group_id,user_id' });
        if (error) throw error;
    },

    async getGroupMembers(groupId: string): Promise<any[]> {
        const { data, error } = await supabase.from('discipleship_group_members').select('*, profiles:user_id (*)').eq('group_id', groupId);
        if (error) return [];
        return data || [];
    },

    async respondToGroupInvite(memberId: string, accept: boolean): Promise<void> {
        if (accept) {
            const { data: member } = await supabase.from('discipleship_group_members').select('user_id, group_id, profiles:user_id(username), group:group_id(leader_id)').eq('id', memberId).single();
            if (member) {
                const username = (member.profiles as any)?.username || 'Um usuário';
                await this.addNote((member.group as any)?.leader_id, null, member.user_id, `[SYSTEM]: ${username} entrou no grupo.`, member.group_id);
            }
        }
        const { error } = await supabase.from('discipleship_group_members').update({ status: accept ? 'active' : 'inactive' }).eq('id', memberId);
        if (error) throw error;
    },

    async updateMemberRole(memberId: string, role: string): Promise<void> {
        const { error } = await supabase.from('discipleship_group_members').update({ role }).eq('id', memberId);
        if (error) throw error;
    },

    async transferGroupLeadership(groupId: string, newLeaderId: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        const { error: groupError } = await supabase.from('discipleship_groups').update({ leader_id: newLeaderId }).eq('id', groupId);
        if (groupError) throw groupError;
        await supabase.from('discipleship_group_members').update({ role: 'admin' }).eq('group_id', groupId).eq('user_id', newLeaderId);
        if (user && user.id !== newLeaderId) {
            await supabase.from('discipleship_group_members').update({ role: 'admin' }).eq('group_id', groupId).eq('user_id', user.id);
        }
    },

    async removeGroupMember(groupId: string, userId: string, targetUsername?: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (targetUsername && user) {
            const { data: group } = await supabase.from('discipleship_groups').select('leader_id').eq('id', groupId).single();
            if (group) { await this.addNote(group.leader_id, null, user.id, `[SYSTEM]: ${targetUsername} foi removido do grupo.`, groupId); }
        }
        const { error } = await supabase.from('discipleship_group_members').delete().eq('group_id', groupId).eq('user_id', userId);
        if (error) throw error;
    },

    async leaveGroup(groupId: string, userId: string, username: string): Promise<void> {
        const { data: group } = await supabase.from('discipleship_groups').select('leader_id').eq('id', groupId).single();
        if (group) { await this.addNote(group.leader_id, null, userId, `[SYSTEM]: ${username} saiu do grupo.`, groupId); }
        await this.removeGroupMember(groupId, userId);
    },

    async updateGroupAvatar(groupId: string, avatarUrl: string): Promise<void> {
        const { error } = await supabase.from('discipleship_groups').update({ avatar_url: avatarUrl }).eq('id', groupId);
        if (error) throw error;
    },

    async uploadGroupAvatar(groupId: string, file: File): Promise<string> {
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
        const filePath = `avatars/group-${groupId}.${fileExt}`;
        const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
        const contentType = file.type || mimeMap[fileExt] || 'image/png';
        const { error: uploadError } = await supabase.storage.from('discipleship_files').upload(filePath, file, { contentType, upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('discipleship_files').getPublicUrl(filePath);
        return `${data.publicUrl}?t=${Date.now()}`;
    },

    async uploadFile(file: File): Promise<{ url: string; name: string; type: string }> {
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `notes/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('discipleship_files').upload(filePath, file, { contentType: file.type || 'application/octet-stream', upsert: false });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('discipleship_files').getPublicUrl(filePath);
        return { url: data.publicUrl, name: file.name, type: file.type };
    },

    async getTasks(userId: string | null, isLeader: boolean, groupId: string | null = null): Promise<DiscipleshipTask[]> {
        let query = supabase.from('discipleship_tasks').select('*');
        if (groupId) { query = query.filter('target_id', 'ilike', `%${groupId}%`); }
        else if (userId) { query = isLeader ? query.eq('leader_id', userId) : query.eq('disciple_id', userId); }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) return [];
        return data || [];
    },

    async createReadingChallenge(leaderId: string, discipleId: string, book: string, start: number, end: number, groupId?: string): Promise<void> {
        const { error } = await supabase.from('discipleship_tasks').insert({ leader_id: leaderId, disciple_id: discipleId, title: `Desafio: ${book} ${start}-${end}`, type: 'reading', target_id: JSON.stringify({ book, start, end, groupId }), is_completed: false });
        if (error) throw error;
    },

    async completeTask(taskId: string): Promise<void> {
        const { error } = await supabase.from('discipleship_tasks').update({ is_completed: true }).eq('id', taskId);
        if (error) throw error;
    },

    async getMemberActivity(userId: string): Promise<any[]> {
        const { data, error } = await supabase.from('reading_progress').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
        if (error) return [];
        return data || [];
    },

    async getNotificationCount(userId: string): Promise<number> {
        const { count: notesCount } = await supabase.from('discipleship_notes').select('*', { count: 'exact', head: true }).eq('is_read', false).neq('author_id', userId).or(`leader_id.eq.${userId},disciple_id.eq.${userId}`);
        const { count: invitesCount } = await supabase.from('discipleship_connections').select('*', { count: 'exact', head: true }).eq('disciple_id', userId).eq('status', 'pending');
        const { count: groupInvitesCount } = await supabase.from('discipleship_group_members').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'pending');
        return (notesCount || 0) + (invitesCount || 0) + (groupInvitesCount || 0);
    },

    async getRecentNotifications(userId: string): Promise<any[]> {
        const notifications: any[] = [];
        const { data: unreadNotes } = await supabase.from('discipleship_notes').select('*, profiles:author_id(username, avatar_url)').eq('is_read', false).neq('author_id', userId).or(`leader_id.eq.${userId},disciple_id.eq.${userId}`).order('created_at', { ascending: false }).limit(10);
        if (unreadNotes) { unreadNotes.forEach(note => { const sender = (note.profiles as any); notifications.push({ id: `note-${note.id}`, type: 'message', title: sender?.username || 'Alguém', body: note.file_url ? 'Enviou um arquivo' : (note.content?.slice(0, 60) + (note.content?.length > 60 ? '…' : '') || ''), avatar_url: sender?.avatar_url || null, created_at: note.created_at, action: '/discipleship' }); }); }
        const { data: pendingConnections } = await supabase.from('discipleship_connections').select('*, profiles:leader_id(username, avatar_url)').eq('disciple_id', userId).eq('status', 'pending').order('created_at', { ascending: false });
        if (pendingConnections) { pendingConnections.forEach(conn => { const sender = (conn.profiles as any); notifications.push({ id: `conn-${conn.id}`, type: 'invite', title: sender?.username || 'Alguém', body: 'te convidou para ser discípulo', avatar_url: sender?.avatar_url || null, created_at: conn.created_at, action: '/discipleship' }); }); }
        const { data: pendingGroupInvites } = await supabase.from('discipleship_group_members').select('*, group:group_id(name, avatar_url)').eq('user_id', userId).eq('status', 'pending').order('created_at', { ascending: false });
        if (pendingGroupInvites) { pendingGroupInvites.forEach(inv => { const group = (inv.group as any); notifications.push({ id: `group-${inv.id}`, type: 'group_invite', title: group?.name || 'Grupo', body: 'você foi convidado para este grupo', avatar_url: group?.avatar_url || null, created_at: inv.created_at, action: '/discipleship' }); }); }
        notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return notifications.slice(0, 15);
    }
};
