import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { sendText as uazapiSendText } from '@/lib/uazapi';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { text?: unknown };
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) return NextResponse.json({ error: 'EMPTY_TEXT' }, { status: 400 });
  if (text.length > 4000)
    return NextResponse.json({ error: 'TEXT_TOO_LONG' }, { status: 400 });

  const convo = await prisma.conversation.findFirst({
    where: { id, tenantId: session.tenantId },
    include: { contact: true },
  });
  if (!convo) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const lockKey = `${session.tenantId}_${convo.contactId}_${convo.channel}`;
  const lock = await prisma.conversationLock.findUnique({ where: { lockKey } });
  if (!lock || lock.expiresAt <= new Date()) {
    return NextResponse.json({ error: 'CONVERSATION_NOT_LOCKED' }, { status: 409 });
  }

  let externalMsgId: string | null = null;

  try {
    if (convo.channel === 'instagram_dm') {
      const token = await prisma.metaToken.findFirst({
        where: { tenantId: session.tenantId, status: 'active' },
      });
      if (!token || !convo.contact.igUserId) {
        return NextResponse.json({ error: 'IG_NOT_CONFIGURED' }, { status: 400 });
      }
      const url = `https://graph.facebook.com/v22.0/${token.igPageId}/messages?access_token=${encodeURIComponent(token.accessToken)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: convo.contact.igUserId },
          message: { text },
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json(
          { error: 'IG_SEND_FAILED', detail: errText.slice(0, 300) },
          { status: 502 }
        );
      }
      const data = (await res.json().catch(() => ({}))) as { message_id?: string };
      externalMsgId = data.message_id ?? null;
    } else if (convo.channel === 'whatsapp') {
      const instance = await prisma.whatsappInstance.findFirst({
        where: { tenantId: session.tenantId, status: 'connected' },
      });
      if (!instance?.instanceToken || !convo.contact.phone) {
        return NextResponse.json({ error: 'WA_NOT_CONFIGURED' }, { status: 400 });
      }
      const resp = (await uazapiSendText(
        instance.instanceToken,
        convo.contact.phone,
        text
      )) as { messageid?: string; id?: string };
      externalMsgId = resp.messageid ?? resp.id ?? null;
    } else {
      return NextResponse.json(
        { error: 'UNSUPPORTED_CHANNEL', channel: convo.channel },
        { status: 400 }
      );
    }
  } catch (e) {
    return NextResponse.json(
      { error: 'SEND_FAILED', detail: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }

  const saved = await prisma.message.create({
    data: {
      conversationId: convo.id,
      direction: 'outbound',
      senderType: 'human',
      contentType: 'text',
      content: text,
      externalMsgId,
    },
  });

  await prisma.conversation.update({
    where: { id: convo.id },
    data: { lastMessageAt: new Date() },
  });

  return NextResponse.json({ ok: true, messageId: saved.id });
}
