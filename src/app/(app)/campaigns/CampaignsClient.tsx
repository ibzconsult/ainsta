'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Megaphone, Plus, Upload } from 'lucide-react';

type Campaign = {
  id: string;
  name: string;
  keyword: string;
  matchMode: string;
  messageText: string | null;
  assetType: string;
  assetUrl: string | null;
  ctaLink: string | null;
  active: boolean;
};

const EMPTY = {
  name: '',
  keyword: '',
  matchMode: 'contains',
  messageText: '',
  assetType: 'none',
  assetUrl: '',
  ctaLink: '',
  active: true,
};

export function CampaignsClient({ initialCampaigns }: { initialCampaigns: Campaign[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function uploadAsset(file: File) {
    setUploading(true);
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/campaigns/asset', { method: 'POST', body: fd });
    const j = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok) {
      setError(j.error ?? 'Erro no upload');
      return;
    }
    setForm((f) => ({ ...f, assetUrl: j.url, assetType: j.assetType }));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'Erro ao salvar');
      return;
    }
    setForm(EMPTY);
    setShowForm(false);
    router.refresh();
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/campaigns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          Nova campanha
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nova campanha</CardTitle>
            <CardDescription>
              Defina palavra-chave, mensagem e asset que serão enviados.
            </CardDescription>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome interno</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ebook de nutrição"
                />
              </div>
              <div>
                <Label>Palavra-chave</Label>
                <Input
                  value={form.keyword}
                  onChange={(e) => setForm({ ...form, keyword: e.target.value })}
                  placeholder="EBOOK"
                  className="font-mono uppercase"
                />
              </div>
            </div>

            <div>
              <Label>Mensagem que acompanha o envio</Label>
              <Textarea
                value={form.messageText}
                onChange={(e) => setForm({ ...form, messageText: e.target.value })}
                placeholder="Obrigado pelo interesse! Aqui está o material 👇"
              />
            </div>

            <div>
              <Label>Asset (imagem, vídeo, áudio ou PDF)</Label>
              <div className="flex gap-2 items-center">
                <input
                  id="asset"
                  type="file"
                  accept="image/*,video/*,audio/*,application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadAsset(f);
                  }}
                  className="hidden"
                />
                <label
                  htmlFor="asset"
                  className="inline-flex items-center gap-2 h-10 px-3 rounded-md border border-border text-sm cursor-pointer hover:border-border-strong"
                >
                  <Upload className="h-4 w-4" />
                  {uploading ? 'Enviando…' : 'Selecionar arquivo'}
                </label>
                {form.assetUrl && (
                  <span className="text-xs font-mono text-subtle truncate max-w-xs">
                    {form.assetType} → OK
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[11px] text-subtle">
                PDF é enviado como link. Imagem/vídeo/áudio são nativos no Direct.
              </p>
            </div>

            <div>
              <Label>Link CTA (opcional)</Label>
              <Input
                value={form.ctaLink}
                onChange={(e) => setForm({ ...form, ctaLink: e.target.value })}
                placeholder="https://..."
                className="font-mono text-xs"
              />
            </div>

            {error && <p className="text-xs text-[color:#991b1b]">{error}</p>}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving || !form.name || !form.keyword}>
                {saving ? 'Salvando…' : 'Salvar'}
              </Button>
              <Button variant="secondary" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-3">
        {initialCampaigns.length === 0 && !showForm && (
          <Card>
            <CardBody className="text-center py-10">
              <Megaphone className="h-8 w-8 text-subtle mx-auto" />
              <p className="mt-3 text-sm text-muted-foreground">
                Nenhuma campanha. Crie a primeira.
              </p>
            </CardBody>
          </Card>
        )}

        {initialCampaigns.map((c) => (
          <Card key={c.id}>
            <CardBody className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{c.name}</span>
                  <Badge variant={c.active ? 'success' : 'neutral'}>
                    {c.active ? 'ativa' : 'pausada'}
                  </Badge>
                </div>
                <div className="mt-1 flex items-center gap-3 text-[11px] font-mono text-subtle">
                  <span>keyword: {c.keyword}</span>
                  <span>·</span>
                  <span>asset: {c.assetType}</span>
                  {c.ctaLink && (
                    <>
                      <span>·</span>
                      <span className="truncate max-w-48">cta: {c.ctaLink}</span>
                    </>
                  )}
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => toggleActive(c.id, !c.active)}
              >
                {c.active ? 'Pausar' : 'Ativar'}
              </Button>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
