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

function json(res: ServerResponse, data: Record<string, unknown>, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  });
  res.end(JSON.stringify(data));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    });
    return res.end();
  }

  const url = new URL(req.url!, `http://${req.headers.host}`);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return json(res, { error: 'userId is required' }, 400);
  }

  const { data: tokens, error } = await supabase
    .from('spotify_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single();

  if (error || !tokens) {
    return json(res, { connected: false });
  }

  let accessToken = tokens.access_token;

  if (new Date(tokens.expires_at) <= new Date()) {
    const newToken = await refreshAccessToken(tokens.refresh_token);
    if (!newToken) {
      return json(res, { connected: false });
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

  const status = spotifyRes.status;
  const bodyText = status === 204 ? null : await spotifyRes.text().catch(() => null);
  let body: any = null;
  try { body = bodyText ? JSON.parse(bodyText) : null; } catch { body = { raw: bodyText }; }

  return json(res, {
    connected: true,
    status,
    error: body?.error || null,
  });
}
