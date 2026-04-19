import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { KnowledgeClient } from './KnowledgeClient';

export const dynamic = 'force-dynamic';

export default async function KnowledgePage() {
  const { tenantId } = await requireSession();

  const rows = await prisma.$queryRaw<
    Array<{ source: string; chunks: bigint; last_updated: Date }>
  >`
    SELECT source, COUNT(*)::bigint AS chunks, MAX(created_at) AS last_updated
    FROM lia_knowledge_base
    WHERE tenant_id = ${tenantId}::uuid
    GROUP BY source
    ORDER BY MAX(created_at) DESC;
  `;

  const sources = rows.map((r) => ({
    source: r.source,
    chunks: Number(r.chunks),
    lastUpdated: r.last_updated.toISOString(),
  }));

  return <KnowledgeClient sources={sources} />;
}
