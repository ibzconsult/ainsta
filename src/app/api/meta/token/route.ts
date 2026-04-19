import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';

const schema = z.object({
  igPageId: z.string().min(5),
  accessToken: z.string().min(20),
  igUsername: z.string().optional(),
});

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

  const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

  const saved = await prisma.metaToken.upsert({
    where: { igPageId: parsed.data.igPageId },
    create: {
      tenantId: session.tenantId,
      igPageId: parsed.data.igPageId,
      igUsername: parsed.data.igUsername,
      accessToken: parsed.data.accessToken,
      expiresAt,
      lastRefreshedAt: new Date(),
      status: 'active',
    },
    update: {
      tenantId: session.tenantId,
      igUsername: parsed.data.igUsername,
      accessToken: parsed.data.accessToken,
      expiresAt,
      lastRefreshedAt: new Date(),
      status: 'active',
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userEmail: session.userEmail,
      action: 'meta_token.save',
      target: saved.id,
    },
  });

  return NextResponse.json({ ok: true, id: saved.id });
}

export async function GET() {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const tokens = await prisma.metaToken.findMany({
    where: { tenantId: session.tenantId },
    select: {
      id: true,
      igPageId: true,
      igUsername: true,
      status: true,
      expiresAt: true,
      lastRefreshedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ tokens });
}
