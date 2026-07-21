import type { IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

function json(res: ServerResponse, data: Record<string, unknown>, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  });
  res.end(JSON.stringify(data));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
    return res.end();
  }

  if (req.method !== 'POST') {
    return json(res, { error: 'Method not allowed' }, 405);
  }

  let body = '';
  for await (const chunk of req) body += chunk;

  let userId: string;
  let lastfmUsername: string;
  try {
    const parsed = JSON.parse(body);
    userId = parsed.userId;
    lastfmUsername = parsed.lastfmUsername?.trim();
  } catch {
    return json(res, { error: 'Invalid JSON' }, 400);
  }

  if (!userId || !lastfmUsername) {
    return json(res, { error: 'userId and lastfmUsername are required' }, 400);
  }

  const { error } = await supabase.from('user_music_settings').upsert(
    { user_id: userId, lastfm_username: lastfmUsername },
    { onConflict: 'user_id' }
  );

  if (error) {
    return json(res, { error: error.message }, 500);
  }

  return json(res, { ok: true });
}
