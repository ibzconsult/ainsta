import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { initInstance, connectInstance, getStatus } from '@/lib/uazapi';

export async function GET() {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const instances = await prisma.whatsappInstance.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ instances });
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const label = String(body.label ?? 'WhatsApp');
  const instanceName = `lia_${session.tenantId.slice(0, 8)}_${Date.now()}`;

  try {
    const { token } = await initInstance(instanceName);
    const connectResp = await connectInstance(token);
    await new Promise((r) => setTimeout(r, 3000));
    const statusResp = await getStatus(token);
    const qrcode = statusResp.qrcode ?? connectResp.qrcode;

    const inst = await prisma.whatsappInstance.create({
      data: {
        tenantId: session.tenantId,
        label,
        uazapiUrl: process.env.UAZAPI_URL ?? 'https://ibusiness.uazapi.com',
        instanceToken: token,
        instanceName,
        status: statusResp.status,
        lastQrAt: new Date(),
      },
    });

    return NextResponse.json({ instance: { ...inst, qrcode } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
