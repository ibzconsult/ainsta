import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';

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
  const convo = await prisma.conversation.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!convo) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const lockKey = `${session.tenantId}_${convo.contactId}_${convo.channel}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.conversationLock.upsert({
    where: { lockKey },
    create: {
      lockKey,
      tenantId: session.tenantId,
      contactId: convo.contactId,
      channel: convo.channel,
      expiresAt,
    },
    update: { expiresAt, lockedAt: new Date() },
  });

  await prisma.conversation.update({
    where: { id: convo.id },
    data: { status: 'human_takeover' },
  });

  return NextResponse.json({ ok: true, locked: true });
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
  const convo = await prisma.conversation.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!convo) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const lockKey = `${session.tenantId}_${convo.contactId}_${convo.channel}`;
  await prisma.conversationLock.deleteMany({ where: { lockKey } });
  await prisma.conversation.update({
    where: { id: convo.id },
    data: { status: 'active' },
  });

  return NextResponse.json({ ok: true, locked: false });
}
