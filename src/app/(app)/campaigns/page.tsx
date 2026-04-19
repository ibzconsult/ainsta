import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { CampaignsClient } from './CampaignsClient';

export default async function CampaignsPage() {
  const { tenantId } = await requireSession();
  const campaigns = await prisma.campaign.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Campanhas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Palavra-chave que o lead envia no Direct dispara envio do material.
        </p>
      </div>

      <CampaignsClient
        initialCampaigns={campaigns.map((c) => ({
          ...c,
          startsAt: c.startsAt?.toISOString() ?? null,
          endsAt: c.endsAt?.toISOString() ?? null,
          createdAt: c.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
