import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageShell } from '@/components/layout/PageShell';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const { tenantId } = await requireSession();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [conversations7d, leads7d, activeLocks, activeCampaigns] = await Promise.all([
    prisma.conversation.count({
      where: { tenantId, lastMessageAt: { gte: sevenDaysAgo } },
    }),
    prisma.lead.count({
      where: { tenantId, capturedAt: { gte: sevenDaysAgo } },
    }),
    prisma.conversationLock.count({
      where: { tenantId, expiresAt: { gt: new Date() } },
    }),
    prisma.campaign.count({ where: { tenantId, active: true } }),
  ]);

  const stats = [
    { label: 'Conversas (7d)', value: conversations7d, href: '/inbox' },
    { label: 'Leads capturados (7d)', value: leads7d, href: '/leads' },
    { label: 'Em atendimento humano', value: activeLocks, href: '/inbox?filter=takeover' },
    { label: 'Campanhas ativas', value: activeCampaigns, href: '/campaigns' },
  ];

  return (
    <PageShell title="Dashboard" subtitle="Visão geral dos últimos 7 dias.">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="hover:border-border-strong transition-colors">
              <CardBody>
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="mt-2 flex items-baseline justify-between">
                  <div className="text-3xl font-semibold tabular-nums">{s.value}</div>
                  <ArrowUpRight className="h-4 w-4 text-subtle" />
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardBody className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Primeiros passos</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Termine de configurar antes de ativar o agente.
            </div>
          </div>
          <Badge variant="warning">Setup pendente</Badge>
        </CardBody>
      </Card>
    </PageShell>
  );
}
