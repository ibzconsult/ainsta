import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { chunkText, embed } from '@/lib/knowledge';

const MAX_CHARS = 200_000;
const MAX_CHUNKS = 250;

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    source?: unknown;
    content?: unknown;
  };
  const source = typeof body.source === 'string' ? body.source.trim() : '';
  const content = typeof body.content === 'string' ? body.content.trim() : '';

  if (!source || source.length > 200)
    return NextResponse.json({ error: 'INVALID_SOURCE' }, { status: 400 });
  if (!content) return NextResponse.json({ error: 'EMPTY_CONTENT' }, { status: 400 });
  if (content.length > MAX_CHARS)
    return NextResponse.json(
      { error: 'CONTENT_TOO_LONG', maxChars: MAX_CHARS },
      { status: 400 }
    );

  const chunks = chunkText(content);
  if (chunks.length > MAX_CHUNKS)
    return NextResponse.json(
      { error: 'TOO_MANY_CHUNKS', chunks: chunks.length, maxChunks: MAX_CHUNKS },
      { status: 400 }
    );

  let embeddings: number[][];
  try {
    embeddings = await embed(chunks);
  } catch (e) {
    return NextResponse.json(
      { error: 'EMBEDDING_FAILED', detail: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      DELETE FROM lia_knowledge_base
      WHERE tenant_id = ${session.tenantId}::uuid AND source = ${source};
    `;
    for (let i = 0; i < chunks.length; i++) {
      const vector = `[${embeddings[i].join(',')}]`;
      await tx.$executeRaw`
        INSERT INTO lia_knowledge_base (tenant_id, source, chunk_index, content, embedding)
        VALUES (
          ${session.tenantId}::uuid,
          ${source},
          ${i},
          ${chunks[i]},
          ${vector}::vector
        );
      `;
    }
  });

  return NextResponse.json({ ok: true, chunks: chunks.length });
}

export async function GET() {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const rows = await prisma.$queryRaw<
    Array<{ source: string; chunks: bigint; last_updated: Date }>
  >`
    SELECT source, COUNT(*)::bigint AS chunks, MAX(created_at) AS last_updated
    FROM lia_knowledge_base
    WHERE tenant_id = ${session.tenantId}::uuid
    GROUP BY source
    ORDER BY MAX(created_at) DESC;
  `;

  return NextResponse.json({
    sources: rows.map((r) => ({
      source: r.source,
      chunks: Number(r.chunks),
      lastUpdated: r.last_updated.toISOString(),
    })),
  });
}
