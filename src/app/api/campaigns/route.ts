import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';

const schema = z.object({
  name: z.string().min(2).max(150),
  keyword: z.string().min(1).max(80),
  matchMode: z.enum(['exact', 'contains']).default('contains'),
  messageText: z.string().optional(),
  assetType: z.enum(['image', 'video', 'audio', 'pdf_link', 'none']).default('none'),
  assetUrl: z.string().url().optional().or(z.literal('')),
  ctaLink: z.string().url().optional().or(z.literal('')),
  active: z.boolean().default(true),
});

export async function GET() {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const campaigns = await prisma.campaign.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ campaigns });
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

  const campaign = await prisma.campaign.create({
    data: {
      ...parsed.data,
      tenantId: session.tenantId,
      assetUrl: parsed.data.assetUrl || null,
      ctaLink: parsed.data.ctaLink || null,
    },
  });

  return NextResponse.json({ campaign });
}
