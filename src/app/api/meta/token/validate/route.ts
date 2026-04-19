import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { validateToken } from '@/lib/instagram';

const schema = z.object({
  igPageId: z.string().min(5),
  accessToken: z.string().min(20),
});

export async function POST(req: NextRequest) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  try {
    const data = await validateToken(parsed.data.accessToken);
    if (data.id !== parsed.data.igPageId) {
      return NextResponse.json(
        { error: `Token pertence à conta ${data.id}, não ${parsed.data.igPageId}` },
        { status: 400 }
      );
    }
    return NextResponse.json({ id: data.id, username: data.username, name: data.name });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Token inválido';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
