import { NextRequest, NextResponse } from 'next/server';

const N8N_URL = process.env.N8N_WEBHOOK_UAZAPI ?? '';

export async function POST(req: NextRequest) {
  const payload = await req.text();

  if (N8N_URL) {
    fetch(N8N_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    }).catch((e) => console.error('[uazapi webhook] n8n forward failed', e));
  }

  return NextResponse.json({ ok: true });
}
