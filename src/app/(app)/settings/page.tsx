import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { PageShell } from '@/components/layout/PageShell';

export default async function SettingsPage() {
  const { tenantId, userEmail } = await requireSession();
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

  return (
    <PageShell title="Configurações" subtitle="Workspace e conta.">
      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>Informações do tenant.</CardDescription>
        </CardHeader>
        <CardBody>
          <dl className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
            <dt className="text-muted-foreground">Nome</dt>
            <dd className="font-medium">{tenant?.nomeEmpresa}</dd>
            <dt className="text-muted-foreground">Slug</dt>
            <dd className="font-mono text-xs">{tenant?.slug}</dd>
            <dt className="text-muted-foreground">Owner</dt>
            <dd className="font-mono text-xs">{userEmail}</dd>
            <dt className="text-muted-foreground">Plano</dt>
            <dd className="font-medium capitalize">{tenant?.plan}</dd>
            <dt className="text-muted-foreground">Criado em</dt>
            <dd className="font-mono text-xs">
              {tenant?.createdAt.toLocaleDateString('pt-BR')}
            </dd>
            <dt className="text-muted-foreground">Tenant ID</dt>
            <dd className="font-mono text-[11px] text-subtle">{tenant?.id}</dd>
          </dl>
        </CardBody>
      </Card>
    </PageShell>
  );
}
