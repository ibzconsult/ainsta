import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { InboxDetailClient } from './InboxDetailClient';

export default async function InboxDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { tenantId } = await requireSession();

  const conversation = await prisma.conversation.findFirst({
    where: { id, tenantId },
    include: {
      contact: true,
      messages: { orderBy: { createdAt: 'asc' }, take: 200 },
    },
  });
  if (!conversation) notFound();

  const lockKey = `${tenantId}_${conversation.contactId}_${conversation.channel}`;
  const lock = await prisma.conversationLock.findUnique({ where: { lockKey } });
  const isLocked = !!lock && lock.expiresAt > new Date();

  return (
    <InboxDetailClient
      conversation={{
        id: conversation.id,
        channel: conversation.channel,
        status: conversation.status,
        lastMessageAt: conversation.lastMessageAt.toISOString(),
      }}
      contact={{
        id: conversation.contact.id,
        name: conversation.contact.name,
        igUsername: conversation.contact.igUsername,
        phone: conversation.contact.phone,
      }}
      messages={conversation.messages.map((m) => ({
        id: m.id,
        direction: m.direction,
        senderType: m.senderType,
        contentType: m.contentType,
        content: m.content,
        mediaUrl: m.mediaUrl,
        createdAt: m.createdAt.toISOString(),
      }))}
      isLocked={isLocked}
      lockExpiresAt={lock?.expiresAt.toISOString() ?? null}
    />
  );
}
