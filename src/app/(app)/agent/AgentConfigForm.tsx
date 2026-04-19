'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { AgentConfig, Campaign } from '@prisma/client';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { composePrompt } from '@/lib/prompt-composer';
import { Check, Eye } from 'lucide-react';

type CampaignPreview = Pick<
  Campaign,
  'keyword' | 'messageText' | 'assetType' | 'assetUrl' | 'ctaLink'
>;

export function AgentConfigForm({
  initialConfig,
  activeCampaigns,
}: {
  initialConfig: AgentConfig;
  activeCampaigns: CampaignPreview[];
}) {
  const router = useRouter();
  const [state, setState] = useState({
    agentName: initialConfig.agentName,
    businessDescription: initialConfig.businessDescription,
    communicationStyle: initialConfig.communicationStyle,
    personality: initialConfig.personality ?? '',
    extraRules: initialConfig.extraRules ?? '',
    handoffPhone: initialConfig.handoffPhone ?? '',
    handoffMessage: initialConfig.handoffMessage ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const prompt = useMemo(
    () =>
      composePrompt({
        agentConfig: state,
        campaigns: activeCampaigns,
        channel: 'instagram_dm',
      }),
    [state, activeCampaigns]
  );

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const res = await fetch('/api/agent-config', {
      method: 'POST',
      body: JSON.stringify(state),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="grid lg:grid-cols-[1fr,420px] gap-6">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Identidade</CardTitle>
                <CardDescription>Como o agente se apresenta.</CardDescription>
              </div>
              <Badge variant="brand">v{initialConfig.version}</Badge>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <Label>Nome do agente</Label>
              <Input
                value={state.agentName}
                onChange={(e) => setState({ ...state, agentName: e.target.value })}
              />
            </div>
            <div>
              <Label>Descrição do negócio</Label>
              <Textarea
                className="min-h-28"
                value={state.businessDescription}
                onChange={(e) => setState({ ...state, businessDescription: e.target.value })}
              />
            </div>
            <div>
              <Label>Estilo de comunicação</Label>
              <select
                value={state.communicationStyle}
                onChange={(e) => setState({ ...state, communicationStyle: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:border-brand outline-none"
              >
                <option value="consultivo">Consultivo</option>
                <option value="amigavel">Amigável e próximo</option>
                <option value="formal">Formal</option>
                <option value="descontraido">Descontraído</option>
                <option value="tecnico">Técnico</option>
              </select>
            </div>
            <div>
              <Label>Personalidade</Label>
              <Textarea
                value={state.personality}
                onChange={(e) => setState({ ...state, personality: e.target.value })}
                placeholder="Ex: empática, curiosa, evita gírias"
              />
            </div>
            <div>
              <Label>Regras extras</Label>
              <Textarea
                value={state.extraRules}
                onChange={(e) => setState({ ...state, extraRules: e.target.value })}
                placeholder="Ex: só atende de seg-sex 8h-18h; nunca cita concorrentes"
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Handoff WhatsApp</CardTitle>
            <CardDescription>
              Número que recebe o lead quando o agente decide migrar a conversa.
            </CardDescription>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <Label>Número do cliente (com DDD)</Label>
              <Input
                placeholder="+55 11 99999-9999"
                value={state.handoffPhone}
                onChange={(e) => setState({ ...state, handoffPhone: e.target.value })}
                className="font-mono"
              />
            </div>
            <div>
              <Label>Mensagem pré-preenchida</Label>
              <Input
                placeholder="Oi! Vim do Instagram."
                value={state.handoffMessage}
                onChange={(e) => setState({ ...state, handoffMessage: e.target.value })}
              />
            </div>
          </CardBody>
        </Card>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar alterações'}
          </Button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-xs text-[color:var(--success)] font-medium">
              <Check className="h-3.5 w-3.5" />
              Salvo
            </span>
          )}
          <Button variant="secondary" onClick={() => setShowPreview((v) => !v)}>
            <Eye className="h-4 w-4" />
            {showPreview ? 'Ocultar prompt' : 'Ver prompt final'}
          </Button>
        </div>
      </div>

      <div className="lg:sticky lg:top-8 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Prompt final</CardTitle>
            <CardDescription>
              Isto é o que o modelo recebe. Atualiza ao vivo.
            </CardDescription>
          </CardHeader>
          <CardBody>
            <pre className="text-[11px] font-mono leading-relaxed text-foreground whitespace-pre-wrap max-h-[620px] overflow-y-auto">
              {showPreview ? prompt : prompt.slice(0, 480) + '\n\n[…clique "Ver prompt final" para expandir…]'}
            </pre>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
