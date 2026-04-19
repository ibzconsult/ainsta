import { NextRequest, NextResponse } from 'next/server';

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN ?? '';
const N8N_URL = process.env.N8N_WEBHOOK_INSTAGRAM ?? '';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: 'invalid' }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const payload = await req.text();

  if (N8N_URL) {
    fetch(N8N_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    }).catch((e) => console.error('[ig webhook] n8n forward failed', e));
  }

  return NextResponse.json({ ok: true });
}
