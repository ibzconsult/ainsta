import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';

const schema = z.object({
  agentName: z.string().min(2).max(100),
  businessDescription: z.string().min(20),
  communicationStyle: z.string().min(2).max(30),
  personality: z.string().optional(),
  extraRules: z.string().optional(),
  handoffPhone: z.string().optional(),
  handoffMessage: z.string().optional(),
});

export async function GET() {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const config = await prisma.agentConfig.findUnique({
    where: { tenantId: session.tenantId },
  });
  return NextResponse.json({ config });
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const current = await prisma.agentConfig.findUnique({
    where: { tenantId: session.tenantId },
  });

  const config = await prisma.agentConfig.upsert({
    where: { tenantId: session.tenantId },
    create: { ...parsed.data, tenantId: session.tenantId, version: 1 },
    update: { ...parsed.data, version: (current?.version ?? 0) + 1 },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userEmail: session.userEmail,
      action: 'agent_config.update',
      target: config.id,
    },
  });

  return NextResponse.json({ config });
}
