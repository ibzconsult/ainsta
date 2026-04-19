import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { getStatus, connectInstance } from '@/lib/uazapi';

export async function POST(
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
  const inst = await prisma.whatsappInstance.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!inst || !inst.instanceToken) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  try {
    const statusResp = await getStatus(inst.instanceToken);
    let qrcode: string | null = statusResp.qrcode ?? null;
    if (!qrcode && statusResp.status !== 'connected') {
      const conn = await connectInstance(inst.instanceToken);
      qrcode = conn.qrcode ?? null;
    }

    await prisma.whatsappInstance.update({
      where: { id: inst.id },
      data: {
        status: statusResp.status,
        lastQrAt: qrcode ? new Date() : inst.lastQrAt,
        disconnectedAt:
          statusResp.status === 'disconnected' ? inst.disconnectedAt ?? new Date() : null,
      },
    });

    return NextResponse.json({ status: statusResp.status, qrcode });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'erro' },
      { status: 500 }
    );
  }
}
