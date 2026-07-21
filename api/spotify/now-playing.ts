import type { IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'userId is required' }));
  }

  const { data: tokens, error } = await supabase
    .from('spotify_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single();

  if (error || !tokens) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ connected: false }));
  }

  let accessToken = tokens.access_token;

  if (new Date(tokens.expires_at) <= new Date()) {
    const newToken = await refreshAccessToken(tokens.refresh_token);
    if (!newToken) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ connected: false }));
    }
    accessToken = newToken;
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
    await supabase
      .from('spotify_tokens')
      .update({ access_token: newToken, expires_at: expiresAt })
      .eq('user_id', userId);
  }

  const spotifyRes = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (spotifyRes.status === 204 || spotifyRes.status === 202) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ connected: true, is_playing: false }));
  }

  if (!spotifyRes.ok) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ connected: true, is_playing: false }));
  }

  const data = await spotifyRes.json();

  if (!data || !data.item) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ connected: true, is_playing: false }));
  }

  const track = data.item;

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    connected: true,
    is_playing: data.is_playing,
    name: track.name,
    artist: track.artists.map((a: { name: string }) => a.name).join(', '),
    album_art: track.album.images[0]?.url || null,
    progress_ms: data.progress_ms || 0,
    duration_ms: track.duration_ms || 0,
    spotify_url: track.external_urls?.spotify || null,
  }));
}
