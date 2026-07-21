import type { IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

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
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' });
    return res.end();
  }

  const url = new URL(req.url!, `http://${req.headers.host}`);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return json(res, { error: 'userId is required' }, 400);
  }

  const { data: settings } = await supabase
    .from('user_music_settings')
    .select('lastfm_username')
    .eq('user_id', userId)
    .single();

  if (!settings?.lastfm_username) {
    return json(res, { connected: false });
  }

  try {
    const lastfmUrl = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(settings.lastfm_username)}&api_key=${LASTFM_API_KEY}&format=json&limit=1`;
    const res2 = await fetch(lastfmUrl);
    const data = await res2.json();

    if (data.error) {
      return json(res, { connected: true, lastfm_username: settings.lastfm_username, is_playing: false });
    }

    const tracks = data.recenttracks?.track;
    if (!tracks || (Array.isArray(tracks) && tracks.length === 0)) {
      return json(res, { connected: true, lastfm_username: settings.lastfm_username, is_playing: false });
    }

    const track = Array.isArray(tracks) ? tracks[0] : tracks;
    const isNowPlaying = track['@attr']?.nowplaying === 'true';

    const image = track.image?.pop?.() || track.image?.[track.image.length - 1];
    const albumArt = image?.['#text'] || null;

    return json(res, {
      connected: true,
      lastfm_username: settings.lastfm_username,
      is_playing: isNowPlaying,
      name: track.name || null,
      artist: track.artist?.['#text'] || null,
      album_art: albumArt && albumArt.includes('http') ? albumArt : null,
      album: track.album?.['#text'] || null,
      spotify_url: null,
      lastfm_url: track.url || null,
    });
  } catch (err) {
    return json(res, { connected: true, lastfm_username: settings.lastfm_username, is_playing: false });
  }
}
