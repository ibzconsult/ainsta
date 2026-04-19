import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { WhatsappChannelClient } from './WhatsappChannelClient';

export default async function WhatsappPage() {
  const { tenantId } = await requireSession();
  const instances = await prisma.whatsappInstance.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">WhatsApp</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conecte números WhatsApp via Uazapi. O agente oferece continuar a conversa
          aqui quando o lead demonstra interesse.
        </p>
      </div>

      <WhatsappChannelClient
        initialInstances={instances.map((i) => ({
          id: i.id,
          label: i.label,
          instanceName: i.instanceName,
          status: i.status,
          lastQrAt: i.lastQrAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
