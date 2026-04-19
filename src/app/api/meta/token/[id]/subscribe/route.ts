import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';

const SUBSCRIBED_FIELDS = 'messages,messaging_postbacks,message_reads,message_reactions';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { id } = await params;
  const token = await prisma.metaToken.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!token) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const url = `https://graph.facebook.com/v22.0/${token.igPageId}/subscribed_apps`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscribed_fields: SUBSCRIBED_FIELDS,
      access_token: token.accessToken,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    return NextResponse.json(
      {
        error: 'SUBSCRIBE_FAILED',
        status: res.status,
        detail: body,
      },
      { status: 502 }
    );
  }

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userEmail: session.userEmail,
      action: 'meta_token.subscribe',
      target: token.id,
      diff: { subscribed_fields: SUBSCRIBED_FIELDS },
    },
  });

  return NextResponse.json({ ok: true, subscribed: true });
}

// GET: consulta estado atual de subscriptions pra aquele IG Page
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { id } = await params;
  const token = await prisma.metaToken.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!token) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const url = `https://graph.facebook.com/v22.0/${token.igPageId}/subscribed_apps?access_token=${encodeURIComponent(token.accessToken)}`;
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(
      { error: 'GRAPH_ERROR', status: res.status, detail: body },
      { status: 502 }
    );
  }

  const apps = Array.isArray(body?.data) ? body.data : [];
  const subscribed = apps.length > 0;
  const fields = apps[0]?.subscribed_fields ?? [];
  return NextResponse.json({ subscribed, fields, apps });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { id } = await params;
  const token = await prisma.metaToken.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!token) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const url = `https://graph.facebook.com/v22.0/${token.igPageId}/subscribed_apps?access_token=${encodeURIComponent(token.accessToken)}`;
  const res = await fetch(url, { method: 'DELETE' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(
      { error: 'GRAPH_ERROR', status: res.status, detail: body },
      { status: 502 }
    );
  }

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userEmail: session.userEmail,
      action: 'meta_token.unsubscribe',
      target: token.id,
    },
  });

  return NextResponse.json({ ok: true, unsubscribed: true });
}
