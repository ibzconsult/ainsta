import OpenAI from 'openai';

// Lazy-init — evita crash no `next build` quando o collect-page-data
// executa o módulo sem OPENAI_API_KEY presente no ambiente de build.
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (_openai) return _openai;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada');
  _openai = new OpenAI({ apiKey });
  return _openai;
}

export function chunkText(text: string, chunkSize = 800, overlap = 120): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= chunkSize) return [clean];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + chunkSize, clean.length);
    const slice = clean.slice(start, end);
    const lastBreak = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('\n'), slice.lastIndexOf('? '));
    const cutEnd = end < clean.length && lastBreak > chunkSize * 0.5 ? start + lastBreak + 1 : end;
    chunks.push(clean.slice(start, cutEnd).trim());
    if (cutEnd >= clean.length) break;
    start = cutEnd - overlap;
  }
  return chunks;
}

export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const response = await getOpenAI().embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  });
  return response.data.map((d) => d.embedding);
}
