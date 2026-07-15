import React, { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

export const DiscipleshipListener: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('discipleship-updates')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'discipleship_connections', filter: `disciple_id=eq.${user.id}` },
                () => {
                    if (location.pathname !== '/discipleship') {
                        navigate('/discipleship');
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'discipleship_connections', filter: `disciple_id=eq.${user.id}` },
                (payload) => {
                    if (payload.new.status === 'active' && location.pathname !== '/discipleship') {
                        navigate('/discipleship');
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'discipleship_group_members', filter: `user_id=eq.${user.id}` },
                () => {
                    if (location.pathname !== '/discipleship') {
                        navigate('/discipleship');
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'discipleship_group_members', filter: `user_id=eq.${user.id}` },
                (payload) => {
                    if (payload.new.status === 'active' && location.pathname !== '/discipleship') {
                        navigate('/discipleship');
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, navigate, location.pathname]);

    return null;
};
