import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { AgentConfigForm } from './AgentConfigForm';
import { redirect } from 'next/navigation';

export default async function AgentPage() {
  const { tenantId } = await requireSession();
  const [config, campaigns] = await Promise.all([
    prisma.agentConfig.findUnique({ where: { tenantId } }),
    prisma.campaign.findMany({
      where: { tenantId, active: true },
      select: { keyword: true, messageText: true, assetType: true, assetUrl: true, ctaLink: true },
    }),
  ]);

  if (!config) redirect('/onboarding');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agente</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configurações do seu agente e preview do prompt final.
        </p>
      </div>

      <AgentConfigForm initialConfig={config} activeCampaigns={campaigns} />
    </div>
  );
}
