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

const INVITE_CODE_TTL_MS = 5 * 60 * 1000;

// Sorteio: alfabeto (A-Z) + números (1-9) — sem o "0" para não confundir com "O"
const CODE_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789';
const CODE_LENGTH = 6;

const generateCode = (): string => {
    const arr = new Uint32Array(CODE_LENGTH);
    crypto.getRandomValues(arr);
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) code += CODE_POOL[arr[i] % CODE_POOL.length];
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
    async ensureGroupInviteCode(groupId: string): Promise<{ code: string; expiresAt: number | null }> {
        const { data, error } = await supabase.from('discipleship_groups').select('invite_code, invite_code_expires_at').eq('id', groupId).maybeSingle();
        if (!error && data?.invite_code && data.invite_code_expires_at && new Date(data.invite_code_expires_at).getTime() > Date.now()) {
            return { code: data.invite_code, expiresAt: new Date(data.invite_code_expires_at).getTime() };
        }
        return this.regenerateGroupInviteCode(groupId);
    },

    async regenerateGroupInviteCode(groupId: string): Promise<{ code: string; expiresAt: number | null }> {
        for (let attempt = 0; attempt < 5; attempt++) {
            const code = generateCode();
            const expiresAt = Date.now() + INVITE_CODE_TTL_MS;
            const expiresIso = new Date(expiresAt).toISOString();

            // Tenta salvar código + validade (exige a coluna invite_code_expires_at no banco)
            const { data, error } = await supabase
                .from('discipleship_groups')
                .update({ invite_code: code, invite_code_expires_at: expiresIso })
                .eq('id', groupId)
                .select('invite_code, invite_code_expires_at')
                .maybeSingle();

            if (!error && data?.invite_code) {
                return { code: data.invite_code, expiresAt: data.invite_code_expires_at ? new Date(data.invite_code_expires_at).getTime() : null };
            }

            // Coluna ainda não existe no banco? Tenta salvar só o código (sem validade)
            const fallback = await supabase
                .from('discipleship_groups')
                .update({ invite_code: code })
                .eq('id', groupId)
                .select('invite_code')
                .maybeSingle();
            if (!fallback.error && fallback.data?.invite_code) {
                return { code: fallback.data.invite_code, expiresAt: null };
            }

            // Colisão de código único (ou outro erro) → sorteia de novo
        }
        throw new Error('Não foi possível gerar um código único. Tente novamente.');
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

    async joinGroupByCode(code: string, userId: string): Promise<{ status: 'ok' | 'expired' | 'invalid'; group?: any }> {
        const group = await this.getGroupByInviteCode(code);
        if (!group) return { status: 'invalid' };
        if (group.invite_code_expires_at && new Date(group.invite_code_expires_at).getTime() < Date.now()) {
            return { status: 'expired', group };
        }
        if (group.leader_id === userId) return { status: 'ok', group };
        const { error } = await supabase
            .from('discipleship_group_members')
            .upsert({ group_id: group.id, user_id: userId, status: 'active', role: 'member' }, { onConflict: 'group_id,user_id' });
        if (error) throw error;
        return { status: 'ok', group };
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
};
