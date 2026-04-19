import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageShell } from '@/components/layout/PageShell';
import { Instagram, MessageSquareText, Inbox } from 'lucide-react';

export default async function InboxPage() {
  const { tenantId } = await requireSession();
  const conversations = await prisma.conversation.findMany({
    where: { tenantId },
    orderBy: { lastMessageAt: 'desc' },
    take: 50,
    include: {
      contact: { select: { igUsername: true, phone: true, name: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  const activeLocks = await prisma.conversationLock.findMany({
    where: { tenantId, expiresAt: { gt: new Date() } },
    select: { contactId: true, channel: true },
  });
  const lockedSet = new Set(activeLocks.map((l) => `${l.contactId}_${l.channel}`));

  return (
    <PageShell
      title="Caixa de entrada"
      subtitle="Conversas em andamento. Clique em &quot;assumir&quot; para pausar a IA."
    >
      {conversations.length === 0 ? (
        <Card>
          <CardBody className="text-center py-10">
            <Inbox className="h-8 w-8 text-subtle mx-auto" />
            <p className="mt-3 text-sm text-muted-foreground">Nenhuma conversa ainda.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => {
            const locked = lockedSet.has(`${c.contactId}_${c.channel}`);
            const Icon = c.channel === 'instagram_dm' ? Instagram : MessageSquareText;
            const label =
              c.contact.igUsername ?? c.contact.name ?? c.contact.phone ?? 'Sem nome';
            const lastMsg = c.messages[0];
            return (
              <Link key={c.id} href={`/inbox/${c.id}`}>
                <Card className="hover:border-border-strong transition-colors">
                  <CardBody className="flex items-center gap-4">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{label}</span>
                        {locked && <Badge variant="warning">humano</Badge>}
                      </div>
                      {lastMsg && (
                        <p className="mt-0.5 text-xs text-muted-foreground truncate">
                          {lastMsg.content ?? `[${lastMsg.contentType}]`}
                        </p>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-subtle whitespace-nowrap">
                      {c.lastMessageAt.toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
