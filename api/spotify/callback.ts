import type { IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

function redirect(res: ServerResponse, location: string) {
  res.writeHead(302, { Location: location });
  res.end();
}

function err(res: ServerResponse, msg: string) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<pre>${msg}</pre>`);
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error || !code || !state) {
    return redirect(res, '/profile?spotify=error');
  }

  let userId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString());
    userId = decoded.userId;
  } catch {
    return redirect(res, '/profile?spotify=error');
  }

  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI!,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      return err(res, JSON.stringify({
        step: 'token_exchange',
        status: tokenRes.status,
        error: tokenData.error,
        error_description: tokenData.error_description,
        CLIENT_ID_SET: !!CLIENT_ID,
        CLIENT_SECRET_SET: !!CLIENT_SECRET,
        REDIRECT_URI_SET: !!REDIRECT_URI,
      }, null, 2));
    }

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    const { error: dbError } = await supabase.from('spotify_tokens').upsert(
      {
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
      },
      { onConflict: 'user_id' }
    );

    if (dbError) {
      return err(res, JSON.stringify({
        step: 'db_save',
        error: dbError.message,
        details: dbError.details,
        hint: dbError.hint,
        SUPABASE_URL_SET: !!SUPABASE_URL,
        SUPABASE_SERVICE_KEY_SET: !!SUPABASE_SERVICE_KEY,
      }, null, 2));
    }

    return redirect(res, '/profile?spotify=connected');
  } catch (err_: any) {
    return err(res, JSON.stringify({
      step: 'catch',
      message: err_.message,
      stack: err_.stack,
    }, null, 2));
  }
}
