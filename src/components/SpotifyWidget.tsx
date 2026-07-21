import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';

interface NowPlayingData {
  connected: boolean;
  is_playing: boolean;
  name?: string;
  artist?: string;
  album_art?: string;
  progress_ms?: number;
  duration_ms?: number;
  spotify_url?: string;
}

interface SpotifyWidgetProps {
  userId: string;
}

const SpotifyWidget: React.FC<SpotifyWidgetProps> = ({ userId }) => {
  const [data, setData] = useState<NowPlayingData | null>(null);
  const [loading, setLoading] = useState(true);
  const progressRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let active = true;

    const fetchNowPlaying = async () => {
      try {
        const apiBase = window.location.hostname === 'localhost' ? 'https://metanoiaapp-ten.vercel.app' : '';
        const res = await fetch(`${apiBase}/api/spotify/now-playing?userId=${userId}`);
        const json = await res.json();
        if (active) setData(json);
      } catch {
        if (active) setData({ connected: false, is_playing: false });
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, 30000);
    return () => { active = false; clearInterval(interval); };
  }, [userId]);

  useEffect(() => {
    if (!data?.is_playing || !data.progress_ms || !data.duration_ms) return;

    const totalMs = data.duration_ms;
    const elapsedMs = data.progress_ms;
    const now = Date.now();
    startRef.current = now - elapsedMs;

    const tick = () => {
      const current = Date.now() - startRef.current;
      const pct = Math.min((current / totalMs) * 100, 100);
      if (progressRef.current) {
        progressRef.current.style.width = `${pct}%`;
      }
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [data?.is_playing, data?.progress_ms, data?.duration_ms]);

  if (loading || !data || !data.connected || !data.name) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex items-center gap-4"
    >
      {data.album_art ? (
        <img
          src={data.album_art}
          alt="Album art"
          className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" className="w-7 h-7 text-white/30" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {data.is_playing && (
            <span className="flex gap-0.5 items-end h-3">
              <span className="w-0.5 bg-[#1DB954] rounded-full animate-pulse" style={{ height: '40%', animationDelay: '0ms' }} />
              <span className="w-0.5 bg-[#1DB954] rounded-full animate-pulse" style={{ height: '70%', animationDelay: '150ms' }} />
              <span className="w-0.5 bg-[#1DB954] rounded-full animate-pulse" style={{ height: '50%', animationDelay: '300ms' }} />
            </span>
          )}
          <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium">
            {data.is_playing ? 'Ouvindo agora' : 'Spotify'}
          </span>
        </div>
        {data.spotify_url ? (
          <a
            href={data.spotify_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-sm text-white hover:underline truncate block"
          >
            {data.name}
          </a>
        ) : (
          <p className="font-bold text-sm text-white truncate">{data.name}</p>
        )}
        <p className="text-xs text-white/40 truncate">{data.artist}</p>
        {data.is_playing && data.duration_ms && data.duration_ms > 0 && (
          <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              ref={progressRef}
              className="h-full bg-[#1DB954] rounded-full"
              style={{ width: '0%' }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SpotifyWidget;
