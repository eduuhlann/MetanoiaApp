import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
    const navigate = useNavigate();
    const handled = useRef(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (handled.current) return;
        handled.current = true;

        const handleCallback = async () => {
            const searchParams = new URLSearchParams(window.location.search);
            const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
            
            const code = searchParams.get('code');
            const errorParam = searchParams.get('error') || hashParams.get('error');
            const errorDescription = searchParams.get('error_description') || hashParams.get('error_description');
            
            const hasAccessToken = hashParams.get('access_token');

            if (errorParam) {
                console.error('[AuthCallback] Provider error:', errorParam, errorDescription);
                setErrorMsg(errorDescription || errorParam);
                setTimeout(() => navigate('/login', { replace: true }), 3000);
                return;
            }

            if (code) {
                const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                if (error) {
                    setErrorMsg("Falha ao trocar código: " + error.message);
                    setTimeout(() => navigate('/login', { replace: true }), 3000);
                    return;
                }
                if (data.session) {
                    navigate('/dashboard', { replace: true });
                    return;
                }
            }

            if (hasAccessToken) {
               const refreshToken = hashParams.get('refresh_token');
               if (refreshToken) {
                   const { data, error } = await supabase.auth.setSession({
                       access_token: hasAccessToken,
                       refresh_token: refreshToken
                   });
                   if (!error && data.session) {
                       navigate('/dashboard', { replace: true });
                       return;
                   }
               }
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                navigate('/dashboard', { replace: true });
                return;
            }

            setErrorMsg("Nenhuma credencial de login encontrada na URL. Tente novamente.");
            setTimeout(() => navigate('/login', { replace: true }), 3000);
            return;
        };

        handleCallback();
    }, [navigate]);

    return (
        <div style={{
            minHeight: '100vh',
            background: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '16px',
        }}>
            {errorMsg ? (
                <>
                    <p style={{ color: '#ef4444', fontSize: 13, fontFamily: 'sans-serif', textAlign: 'center', maxWidth: 320, padding: '0 16px' }}>
                        {errorMsg}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: 'sans-serif' }}>
                        Redirecionando...
                    </p>
                </>
            ) : (
                <>
                    <div style={{
                        width: 40,
                        height: 40,
                        border: '3px solid rgba(255,255,255,0.1)',
                        borderTop: '3px solid white',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                    }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    <p style={{
                        color: 'rgba(255,255,255,0.4)',
                        fontSize: 12,
                        letterSpacing: '0.3em',
                        textTransform: 'uppercase',
                        fontFamily: 'sans-serif',
                    }}>
                        Autenticando...
                    </p>
                </>
            )}
        </div>
    );
}
