import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Instagram } from 'lucide-react';
import Link from 'next/link';

export default async function InstagramPage() {
  const { tenantId } = await requireSession();
  const tokens = await prisma.metaToken.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Instagram</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Páginas Instagram conectadas ao agente.
        </p>
      </div>

      <div className="grid gap-4">
        {tokens.length === 0 && (
          <Card>
            <CardBody className="text-center py-10">
              <Instagram className="h-8 w-8 text-subtle mx-auto" />
              <p className="mt-3 text-sm text-muted-foreground">
                Nenhum token conectado. Conclua o{' '}
                <Link href="/onboarding" className="text-brand underline">
                  onboarding
                </Link>
                .
              </p>
            </CardBody>
          </Card>
        )}

        {tokens.map((t) => {
          const daysLeft = t.expiresAt
            ? Math.round((t.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null;
          const variant =
            t.status !== 'active'
              ? 'danger'
              : daysLeft !== null && daysLeft < 7
              ? 'warning'
              : 'success';
          const label =
            t.status !== 'active'
              ? 'Inativo'
              : daysLeft !== null && daysLeft < 7
              ? `Expira em ${daysLeft}d`
              : 'Ativo';

          return (
            <Card key={t.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-brand-subtle flex items-center justify-center">
                      <Instagram className="h-4 w-4 text-[color:var(--brand-700)]" />
                    </div>
                    <div>
                      <CardTitle>@{t.igUsername ?? t.igPageId}</CardTitle>
                      <CardDescription className="font-mono text-[11px]">
                        {t.igPageId}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={variant}>{label}</Badge>
                </div>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="text-subtle">Última renovação</div>
                    <div className="mt-1 font-mono">
                      {t.lastRefreshedAt?.toLocaleDateString('pt-BR') ?? '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-subtle">Expira em</div>
                    <div className="mt-1 font-mono">
                      {t.expiresAt?.toLocaleDateString('pt-BR') ?? '—'}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
