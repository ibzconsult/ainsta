const GRAPH_API = 'https://graph.facebook.com/v22.0';

type Json = Record<string, unknown>;

async function graphFetch<T = Json>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${GRAPH_API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    cache: 'no-store',
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Graph ${path} ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : ({} as T);
}

export async function validateToken(accessToken: string) {
  const data = await graphFetch<{
    id: string;
    username?: string;
    name?: string;
  }>(`/me?fields=id,username,name&access_token=${encodeURIComponent(accessToken)}`);
  return data;
}

export async function getLongLivedToken(shortLivedToken: string) {
  const appId = process.env.META_APP_ID!;
  const appSecret = process.env.META_APP_SECRET!;
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });
  const data = await graphFetch<{ access_token: string; expires_in?: number }>(
    `/oauth/access_token?${params.toString()}`
  );
  return data;
}

export async function refreshLongLivedToken(currentToken: string) {
  return getLongLivedToken(currentToken);
}

export async function sendText(
  pageId: string,
  accessToken: string,
  recipientId: string,
  text: string
) {
  return graphFetch(`/${pageId}/messages?access_token=${encodeURIComponent(accessToken)}`, {
    method: 'POST',
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
    }),
  });
}

export async function sendMedia(
  pageId: string,
  accessToken: string,
  recipientId: string,
  type: 'image' | 'video' | 'audio',
  mediaUrl: string
) {
  return graphFetch(`/${pageId}/messages?access_token=${encodeURIComponent(accessToken)}`, {
    method: 'POST',
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: {
        attachment: {
          type,
          payload: { url: mediaUrl, is_reusable: false },
        },
      },
    }),
  });
}
