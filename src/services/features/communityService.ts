import { supabase } from '../../lib/supabase';

export interface FeedPost {
    id: string;
    author_id: string;
    type: 'post' | 'devotional' | 'event';
    content: string | null;
    devotional_id: string | null;
    event_id: string | null;
    created_at: string;
    author?: {
        username: string | null;
        display_name: string | null;
        avatar_url: string | null;
        is_verified?: boolean;
    } | null;
    devotional?: { title: string } | null;
}

export interface DiscipleshipMeeting {
    id: string;
    group_id: string;
    creator_id: string;
    title: string;
    scheduled_at: string;
    location: string | null;
    notes: string | null;
    created_at: string;
}

export interface LeaderOverview {
    groups: number;
    members: number;
    pendingMembers: number;
    openTasks: number;
    upcomingMeetings: number;
    unreadNotes: number;
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const generateCode = (): string => {
    const arr = new Uint32Array(8);
    crypto.getRandomValues(arr);
    let code = '';
    for (let i = 0; i < 8; i++) code += CODE_CHARS[arr[i] % CODE_CHARS.length];
    return code;
};

export const communityService = {
    // ---------- Follow (#79) ----------
    async isFollowing(followerId: string, followingId: string): Promise<boolean> {
        const { data } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', followerId)
            .eq('following_id', followingId)
            .maybeSingle();
        return !!data;
    },

    async toggleFollow(followerId: string, followingId: string): Promise<boolean> {
        const following = await this.isFollowing(followerId, followingId);
        if (following) {
            const { error } = await supabase
                .from('follows')
                .delete()
                .eq('follower_id', followerId)
                .eq('following_id', followingId);
            if (error) throw error;
            return false;
        }
        const { error } = await supabase
            .from('follows')
            .insert({ follower_id: followerId, following_id: followingId });
        if (error) throw error;
        return true;
    },

    async getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
        const [{ count: followers }, { count: following }] = await Promise.all([
            supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
            supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId)
        ]);
        return { followers: followers || 0, following: following || 0 };
    },

    // ---------- Feed (#80, #81) ----------
    async createFeedPost(authorId: string, type: 'post' | 'devotional' | 'event', content: string | null, devotionalId?: string, eventId?: string): Promise<FeedPost | null> {
        const { data, error } = await supabase
            .from('feed_posts')
            .insert({ author_id: authorId, type, content, devotional_id: devotionalId || null, event_id: eventId || null })
            .select('*, author:author_id(username, display_name, avatar_url, is_verified), devotional:devotional_id(title)')
            .single();
        if (error) throw error;
        return data as FeedPost;
    },

    async getFeedPosts(limit = 50): Promise<FeedPost[]> {
        const { data, error } = await supabase
            .from('feed_posts')
            .select('*, author:author_id(username, display_name, avatar_url, is_verified), devotional:devotional_id(title)')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) return [];
        return (data || []) as FeedPost[];
    },

    async deleteFeedPost(postId: string): Promise<void> {
        const { error } = await supabase.from('feed_posts').delete().eq('id', postId);
        if (error) throw error;
    },

    parseMentions(content: string): string[] {
        const matches = content.match(/@([a-zA-Z0-9_.-]+)/g) || [];
        return matches.map(m => m.slice(1));
    },

    // ---------- RSVP (#82) ----------
    async getUserRsvp(eventId: string, userId: string): Promise<string | null> {
        const { data } = await supabase
            .from('event_rsvps')
            .select('status')
            .eq('event_id', eventId)
            .eq('user_id', userId)
            .maybeSingle();
        return data?.status || null;
    },

    async toggleRsvp(eventId: string, userId: string): Promise<string | null> {
        const current = await this.getUserRsvp(eventId, userId);
        if (current) {
            const { error } = await supabase.from('event_rsvps').delete().eq('event_id', eventId).eq('user_id', userId);
            if (error) throw error;
            return null;
        }
        const { error } = await supabase.from('event_rsvps').insert({ event_id: eventId, user_id: userId, status: 'going' });
        if (error) throw error;
        return 'going';
    },

    async getRsvpCounts(eventIds: string[]): Promise<Record<string, number>> {
        if (eventIds.length === 0) return {};
        const { data } = await supabase.from('event_rsvps').select('event_id').in('event_id', eventIds);
        const counts: Record<string, number> = {};
        (data || []).forEach(r => { counts[r.event_id] = (counts[r.event_id] || 0) + 1; });
        return counts;
    },

    // ---------- Grupo por código de convite (#64) ----------
    async ensureGroupInviteCode(groupId: string): Promise<string> {
        const { data: group } = await supabase.from('discipleship_groups').select('invite_code').eq('id', groupId).single();
        if (group?.invite_code) return group.invite_code;
        let code = generateCode();
        const { data, error } = await supabase
            .from('discipleship_groups')
            .update({ invite_code: code })
            .eq('id', groupId)
            .select('invite_code')
            .single();
        if (error || !data?.invite_code) return '';
        return data.invite_code;
    },

    async regenerateGroupInviteCode(groupId: string): Promise<string> {
        const code = generateCode();
        const { data, error } = await supabase
            .from('discipleship_groups')
            .update({ invite_code: code })
            .eq('id', groupId)
            .select('invite_code')
            .single();
        if (error) throw error;
        return data?.invite_code || '';
    },

    async getGroupByInviteCode(code: string): Promise<any | null> {
        const { data, error } = await supabase
            .from('discipleship_groups')
            .select('*')
            .ilike('invite_code', code.trim().toUpperCase())
            .maybeSingle();
        if (error) return null;
        return data;
    },

    async joinGroupByCode(code: string, userId: string): Promise<any | null> {
        const group = await this.getGroupByInviteCode(code);
        if (!group) return null;
        if (group.leader_id === userId) return group;
        const { data, error } = await supabase
            .from('discipleship_group_members')
            .upsert({ group_id: group.id, user_id: userId, status: 'active', role: 'member' }, { onConflict: 'group_id,user_id' })
            .select()
            .single();
        if (error) throw error;
        return group;
    },

    // ---------- Reuniões (#56) ----------
    async getGroupMeetings(groupId: string): Promise<DiscipleshipMeeting[]> {
        const { data, error } = await supabase
            .from('discipleship_meetings')
            .select('*')
            .eq('group_id', groupId)
            .order('scheduled_at', { ascending: true });
        if (error) return [];
        return (data || []) as DiscipleshipMeeting[];
    },

    async createMeeting(groupId: string, creatorId: string, title: string, scheduledAt: string, location?: string, notes?: string): Promise<DiscipleshipMeeting | null> {
        const { data, error } = await supabase
            .from('discipleship_meetings')
            .insert({ group_id: groupId, creator_id: creatorId, title, scheduled_at: scheduledAt, location: location || null, notes: notes || null })
            .select()
            .single();
        if (error) throw error;
        return data as DiscipleshipMeeting;
    },

    async deleteMeeting(meetingId: string): Promise<void> {
        const { error } = await supabase.from('discipleship_meetings').delete().eq('id', meetingId);
        if (error) throw error;
    },

    // ---------- Painel do líder (#66) ----------
    async getLeaderOverview(userId: string): Promise<LeaderOverview | null> {
        const { data: groups } = await supabase
            .from('discipleship_groups')
            .select('id')
            .eq('leader_id', userId);
        const groupIds = (groups || []).map(g => g.id);

        const [{ count: members }, { count: pendingMembers }, { count: openTasks }, { count: unreadNotes }, { count: upcomingMeetings }] = await Promise.all([
            groupIds.length > 0
                ? supabase.from('discipleship_group_members').select('*', { count: 'exact', head: true }).in('group_id', groupIds).eq('status', 'active')
                : Promise.resolve({ count: 0 }),
            groupIds.length > 0
                ? supabase.from('discipleship_group_members').select('*', { count: 'exact', head: true }).in('group_id', groupIds).eq('status', 'pending')
                : Promise.resolve({ count: 0 }),
            supabase.from('discipleship_tasks').select('*', { count: 'exact', head: true }).eq('leader_id', userId).eq('is_completed', false),
            supabase.from('discipleship_notes').select('*', { count: 'exact', head: true }).eq('is_read', false).neq('author_id', userId).eq('leader_id', userId),
            groupIds.length > 0
                ? supabase.from('discipleship_meetings').select('*', { count: 'exact', head: true }).in('group_id', groupIds).gte('scheduled_at', new Date().toISOString())
                : Promise.resolve({ count: 0 })
        ]);

        return {
            groups: groupIds.length,
            members: members || 0,
            pendingMembers: pendingMembers || 0,
            openTasks: openTasks || 0,
            unreadNotes: unreadNotes || 0,
            upcomingMeetings: upcomingMeetings || 0
        };
    }
};
