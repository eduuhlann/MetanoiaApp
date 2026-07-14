import { supabase } from '../../lib/supabase';

export interface DiscipleshipConnection {
    id: string;
    leader_id: string;
    disciple_id: string;
    status: 'active' | 'pending' | 'ended';
    created_at: string;
}

export interface DiscipleshipMessage {
    id: string;
    connection_id: string;
    sender_id: string;
    content: string;
    created_at: string;
}

export interface DiscipleshipTask {
    id: string;
    connection_id: string;
    created_by: string;
    assigned_to: string;
    title: string;
    description: string | null;
    completed: boolean;
    due_date: string | null;
    created_at: string;
}

class DiscipleshipService {
    async getNotificationCount(userId: string): Promise<number> {
        try {
            const { count } = await supabase
                .from('discipleship_connections')
                .select('*', { count: 'exact', head: true })
                .eq('disciple_id', userId)
                .eq('status', 'pending');

            return count || 0;
        } catch {
            return 0;
        }
    }

    async getRecentNotifications(userId: string): Promise<any[]> {
        try {
            const { data, error } = await supabase
                .from('discipleship_connections')
                .select('*')
                .eq('disciple_id', userId)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;

            return (data || []).map(item => ({
                id: item.id,
                type: 'invite' as const,
                title: 'Convite de Discipulado',
                body: 'Você recebeu um convite para ser discipulado.',
                avatar_url: null,
                created_at: item.created_at,
                action: '/discipleship'
            }));
        } catch {
            return [];
        }
    }
}

export const discipleshipService = new DiscipleshipService();
