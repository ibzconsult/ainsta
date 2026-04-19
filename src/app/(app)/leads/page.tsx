import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageShell } from '@/components/layout/PageShell';
import { Users } from 'lucide-react';

export default async function LeadsPage() {
  const { tenantId } = await requireSession();
  const leads = await prisma.lead.findMany({
    where: { tenantId },
    orderBy: { capturedAt: 'desc' },
    take: 100,
    include: {
      contact: { select: { igUsername: true, phone: true, name: true, email: true } },
      campaign: { select: { name: true, keyword: true } },
    },
  });

  return (
    <PageShell title="Leads" subtitle="Leads capturados pelas campanhas.">
      {leads.length === 0 ? (
        <Card>
          <CardBody className="text-center py-10">
            <Users className="h-8 w-8 text-subtle mx-auto" />
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhum lead capturado ainda. Os leads aparecem aqui quando alguém
              interage com uma campanha ativa.
            </p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] font-mono text-subtle uppercase">
                  <th className="px-4 py-3 text-left font-medium">Contato</th>
                  <th className="px-4 py-3 text-left font-medium">Campanha</th>
                  <th className="px-4 py-3 text-left font-medium">Estágio</th>
                  <th className="px-4 py-3 text-right font-medium">Capturado</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-border last:border-0 hover:bg-muted/60"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {l.contact.name ??
                          l.contact.igUsername ??
                          l.contact.phone ??
                          '—'}
                      </div>
                      {l.contact.email && (
                        <div className="text-[11px] font-mono text-subtle">
                          {l.contact.email}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {l.campaign ? (
                        <div>
                          <div>{l.campaign.name}</div>
                          <div className="text-[11px] font-mono text-subtle">
                            {l.campaign.keyword}
                          </div>
                        </div>
                      ) : (
                        <span className="text-subtle">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge>{l.stage}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-[11px] font-mono text-subtle whitespace-nowrap">
                      {l.capturedAt.toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </PageShell>
  );
}
