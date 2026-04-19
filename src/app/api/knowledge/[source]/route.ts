import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ source: string }> }
) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { source: encoded } = await params;
  const source = decodeURIComponent(encoded);
  if (!source) return NextResponse.json({ error: 'EMPTY_SOURCE' }, { status: 400 });

  const deleted = await prisma.$executeRaw`
    DELETE FROM lia_knowledge_base
    WHERE tenant_id = ${session.tenantId}::uuid AND source = ${source};
  `;

  return NextResponse.json({ ok: true, deleted: Number(deleted) });
}
