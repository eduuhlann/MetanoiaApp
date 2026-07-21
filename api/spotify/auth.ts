import type { IncomingMessage, ServerResponse } from 'http';

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const userId = url.searchParams.get('userId');
  if (!userId) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'userId is required' }));
  }

  const state = Buffer.from(JSON.stringify({ userId })).toString('base64url');
  const scopes = ['user-read-currently-playing'].join(' ');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID!,
    scope: scopes,
    redirect_uri: REDIRECT_URI!,
    state,
  });

  res.writeHead(302, { Location: `https://accounts.spotify.com/authorize?${params.toString()}` });
  res.end();
}
