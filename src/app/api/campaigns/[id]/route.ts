import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const existing = await prisma.campaign.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!existing) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const updated = await prisma.campaign.update({
    where: { id },
    data: {
      active: typeof body.active === 'boolean' ? body.active : undefined,
      messageText: body.messageText,
      keyword: body.keyword,
      matchMode: body.matchMode,
    },
  });

  return NextResponse.json({ campaign: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { id } = await params;
  await prisma.campaign.deleteMany({ where: { id, tenantId: session.tenantId } });
  return NextResponse.json({ ok: true });
}
