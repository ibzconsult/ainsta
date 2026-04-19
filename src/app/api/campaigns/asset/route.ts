import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const BUCKET = 'lia-assets';

function detectAssetType(mimeType: string): 'image' | 'video' | 'audio' | 'pdf_link' | 'none' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'pdf_link';
  return 'none';
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file required' }, { status: 400 });
  }

  const assetType = detectAssetType(file.type);
  if (assetType === 'none') {
    return NextResponse.json({ error: 'tipo de arquivo não suportado' }, { status: 400 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${session.tenantId}/${Date.now()}-${safeName}`;

  const supabase = createSupabaseAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, assetType, path });
}

export const config = {
  api: { bodyParser: false },
};
