'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { BookOpen, Trash2, Upload } from 'lucide-react';

type Source = { source: string; chunks: number; lastUpdated: string };

export function KnowledgeClient({ sources }: { sources: Source[] }) {
  const router = useRouter();
  const [source, setSource] = useState('');
  const [content, setContent] = useState('');
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  const totalChunks = sources.reduce((acc, s) => acc + s.chunks, 0);

  function submit() {
    const s = source.trim();
    const c = content.trim();
    if (!s || !c) {
      setStatus('Preencha nome e conteúdo.');
      return;
    }
    setStatus(null);
    startTransition(async () => {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: s, content: c }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatus(`Falha: ${err.error ?? res.status}`);
        return;
      }
      const json = await res.json();
      setSource('');
      setContent('');
      setStatus(`Ingestão concluída: ${json.chunks} chunks gerados.`);
      router.refresh();
    });
  }

  function remove(s: string) {
    if (!confirm(`Remover todos os chunks do source "${s}"?`)) return;
    startTransition(async () => {
      const res = await fetch(`/api/knowledge/${encodeURIComponent(s)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatus(`Falha ao remover: ${err.error ?? res.status}`);
        return;
      }
      setStatus(`Source "${s}" removido.`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Base de conhecimento</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Textos que o agente consulta via RAG. Cada source é dividido em chunks e indexado por embeddings.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Adicionar conteúdo</CardTitle>
            <CardDescription>
              Cole um texto (FAQ, descrição do produto, procedimento, preços). Será
              processado em chunks de ~800 caracteres e indexado.
            </CardDescription>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <Label htmlFor="kb-source">Nome do source</Label>
              <Input
                id="kb-source"
                placeholder="ex: faq-precos, procedimento-agendamento, politicas"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                disabled={isPending}
                maxLength={200}
              />
              <p className="mt-1 text-[11px] text-subtle">
                Identificador interno. Se repetir um source existente, ele será
                sobrescrito.
              </p>
            </div>
            <div>
              <Label htmlFor="kb-content">Conteúdo</Label>
              <Textarea
                id="kb-content"
                rows={14}
                placeholder="Cole o texto que o agente deve conhecer. Markdown simples é OK."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={isPending}
              />
              <p className="mt-1 text-[11px] text-subtle">
                {content.length.toLocaleString('pt-BR')} caracteres · ~
                {Math.max(1, Math.ceil(content.length / 800))} chunks estimados
              </p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{status ?? ' '}</span>
              <Button onClick={submit} disabled={isPending || !source.trim() || !content.trim()}>
                <Upload className="h-4 w-4" />
                {isPending ? 'Processando…' : 'Ingerir'}
              </Button>
            </div>
          </CardBody>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardBody>
              <div className="text-xs text-muted-foreground">Total indexado</div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums">{totalChunks}</span>
                <span className="text-xs text-muted-foreground">
                  chunks em {sources.length} source{sources.length === 1 ? '' : 's'}
                </span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sources</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {sources.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <BookOpen className="h-6 w-6 text-subtle mx-auto" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Nenhum conteúdo ainda.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {sources.map((s) => (
                    <li
                      key={s.source}
                      className="px-4 py-3 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{s.source}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] font-mono text-subtle">
                          <Badge variant="neutral">{s.chunks} chunks</Badge>
                          <span>
                            {new Date(s.lastUpdated).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(s.source)}
                        disabled={isPending}
                        className="p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-[color:var(--danger)] disabled:opacity-50"
                        aria-label={`Remover ${s.source}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
