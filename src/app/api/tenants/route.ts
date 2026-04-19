import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const schema = z.object({
  nomeEmpresa: z.string().min(2).max(200),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'apenas letras minúsculas, números e hífens'),
});

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const existing = await prisma.tenant.findFirst({
    where: { OR: [{ slug: parsed.data.slug }, { ownerEmail: user.email.toLowerCase() }] },
  });
  if (existing) {
    if (existing.ownerEmail === user.email.toLowerCase()) {
      return NextResponse.json({ tenant: existing });
    }
    return NextResponse.json({ error: 'Slug já em uso' }, { status: 409 });
  }

  const tenant = await prisma.tenant.create({
    data: {
      nomeEmpresa: parsed.data.nomeEmpresa,
      slug: parsed.data.slug,
      ownerEmail: user.email.toLowerCase(),
    },
  });

  return NextResponse.json({ tenant });
}
