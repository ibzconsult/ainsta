'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { MessageSquareText, QrCode, X, Check } from 'lucide-react';

type Instance = {
  id: string;
  label: string | null;
  instanceName: string | null;
  status: string;
  lastQrAt: string | null;
};

export function WhatsappChannelClient({ initialInstances }: { initialInstances: Instance[] }) {
  const router = useRouter();
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [qrModal, setQrModal] = useState<{ qrcode: string; instanceId: string } | null>(null);
  const [connectedFlash, setConnectedFlash] = useState(false);
  const [error, setError] = useState('');
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!qrModal) return;
    const instanceId = qrModal.instanceId;
    const currentQr = qrModal.qrcode;
    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch(`/api/instances/${instanceId}/status`, {
          method: 'POST',
        });
        if (cancelled || !res.ok) return;
        const data = await res.json();
        if (data.status === 'connected') {
          setConnectedFlash(true);
          setTimeout(() => {
            setQrModal(null);
            setConnectedFlash(false);
            router.refresh();
          }, 1200);
          return;
        }
        if (data.qrcode && data.qrcode !== currentQr) {
          setQrModal({ qrcode: data.qrcode, instanceId });
        }
      } catch {
        // silencioso — só tenta de novo
      }
    }

    pollRef.current = setInterval(tick, 3000);
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [qrModal, router]);

  async function handleCreate() {
    setCreating(true);
    setError('');
    const res = await fetch('/api/instances', {
      method: 'POST',
      body: JSON.stringify({ label: label || 'WhatsApp' }),
    });
    const data = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) {
      setError(data.error ?? 'Erro ao criar instância');
      return;
    }
    if (data.instance?.qrcode) {
      setQrModal({ qrcode: data.instance.qrcode, instanceId: data.instance.id });
    }
    setLabel('');
    router.refresh();
  }

  async function refreshStatus(instanceId: string) {
    const res = await fetch(`/api/instances/${instanceId}/status`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (data.qrcode) setQrModal({ qrcode: data.qrcode, instanceId });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Nova instância</CardTitle>
          <CardDescription>Um nome pra identificar (ex: WhatsApp Principal).</CardDescription>
        </CardHeader>
        <CardBody>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label>Nome</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="WhatsApp Principal"
              />
            </div>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? 'Criando…' : 'Conectar'}
            </Button>
          </div>
          {error && (
            <p className="mt-3 text-xs text-[color:#991b1b]">{error}</p>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-3">
        {initialInstances.length === 0 && (
          <Card>
            <CardBody className="text-center py-10">
              <MessageSquareText className="h-8 w-8 text-subtle mx-auto" />
              <p className="mt-3 text-sm text-muted-foreground">
                Nenhuma instância conectada ainda.
              </p>
            </CardBody>
          </Card>
        )}

        {initialInstances.map((i) => {
          const variant =
            i.status === 'connected' ? 'success' : i.status === 'connecting' ? 'warning' : 'neutral';
          return (
            <Card key={i.id}>
              <CardBody className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{i.label ?? 'WhatsApp'}</div>
                  <div className="mt-1 text-[11px] font-mono text-subtle">
                    {i.instanceName}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={variant}>{i.status}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refreshStatus(i.id)}
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    QR
                  </Button>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {qrModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {connectedFlash ? 'Conectado!' : 'Escaneie o QR Code'}
                </CardTitle>
                <button
                  onClick={() => setQrModal(null)}
                  className="text-subtle hover:text-foreground"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <CardDescription>
                {connectedFlash
                  ? 'Instância pareada com sucesso.'
                  : 'WhatsApp → Aparelhos conectados → Conectar aparelho.'}
              </CardDescription>
            </CardHeader>
            <CardBody className="flex justify-center items-center min-h-64">
              {connectedFlash ? (
                <div className="flex flex-col items-center gap-2 py-6 text-[color:var(--success)]">
                  <Check className="h-12 w-12" strokeWidth={2.5} />
                  <p className="text-sm text-muted-foreground">
                    Fechando…
                  </p>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrModal.qrcode} alt="QR Code" className="w-64 h-64" />
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
