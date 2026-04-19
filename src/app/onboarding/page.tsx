'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Check, CircleDot, AlertCircle, Instagram } from 'lucide-react';

type Step = 1 | 2 | 3 | 4;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [business, setBusiness] = useState({ nomeEmpresa: '', slug: '' });
  const [token, setToken] = useState({ igPageId: '', accessToken: '' });
  const [validated, setValidated] = useState<{ id: string; username?: string } | null>(null);
  const [agent, setAgent] = useState({
    agentName: '',
    businessDescription: '',
    communicationStyle: 'consultivo',
    personality: '',
  });

  async function submitBusiness() {
    setLoading(true);
    setError('');
    const res = await fetch('/api/tenants', {
      method: 'POST',
      body: JSON.stringify(business),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'Erro ao criar workspace');
      return;
    }
    setStep(2);
  }

  async function validateToken() {
    setLoading(true);
    setError('');
    const res = await fetch('/api/meta/token/validate', {
      method: 'POST',
      body: JSON.stringify(token),
    });
    setLoading(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(j.error ?? 'Token inválido');
      setValidated(null);
      return;
    }
    setValidated(j);
  }

  async function saveToken() {
    setLoading(true);
    setError('');
    const res = await fetch('/api/meta/token', {
      method: 'POST',
      body: JSON.stringify({ ...token, igUsername: validated?.username }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'Erro ao salvar');
      return;
    }
    setStep(3);
  }

  async function saveAgent() {
    setLoading(true);
    setError('');
    const res = await fetch('/api/agent-config', {
      method: 'POST',
      body: JSON.stringify(agent),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'Erro ao salvar agente');
      return;
    }
    setStep(4);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight">Onboarding</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          4 passos para ativar seu agente.
        </p>
      </div>

      <StepProgress current={step} />

      <div className="mt-8">
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>1. Sobre o negócio</CardTitle>
              <CardDescription>
                Informações básicas do workspace. Você pode mudar depois.
              </CardDescription>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <Label htmlFor="nomeEmpresa">Nome da empresa</Label>
                <Input
                  id="nomeEmpresa"
                  value={business.nomeEmpresa}
                  onChange={(e) =>
                    setBusiness({
                      ...business,
                      nomeEmpresa: e.target.value,
                      slug: slugify(e.target.value),
                    })
                  }
                  placeholder="Ex: Padaria São José"
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={business.slug}
                  onChange={(e) => setBusiness({ ...business, slug: slugify(e.target.value) })}
                  placeholder="padaria-sao-jose"
                />
                <p className="mt-1 text-[11px] text-subtle font-mono">
                  Identificador técnico, sem espaços ou acentos.
                </p>
              </div>
              {error && <ErrorBox>{error}</ErrorBox>}
              <div className="pt-2">
                <Button onClick={submitBusiness} disabled={loading || !business.nomeEmpresa}>
                  {loading ? 'Criando…' : 'Continuar'}
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>2. Conectar Instagram</CardTitle>
              <CardDescription>
                Informe o Page ID da conta business e o token de acesso (fornecido pelo Igor).
              </CardDescription>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <Label htmlFor="pageId">Instagram Page ID</Label>
                <Input
                  id="pageId"
                  value={token.igPageId}
                  onChange={(e) => setToken({ ...token, igPageId: e.target.value.trim() })}
                  placeholder="17841459278110423"
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="accessToken">Access Token (long-lived)</Label>
                <Textarea
                  id="accessToken"
                  value={token.accessToken}
                  onChange={(e) => setToken({ ...token, accessToken: e.target.value.trim() })}
                  placeholder="EAAG..."
                  className="font-mono text-xs min-h-20"
                />
              </div>

              {validated && (
                <div className="flex items-center gap-2 p-3 rounded-md border border-border bg-brand-subtle text-sm">
                  <Check className="h-4 w-4 text-[color:var(--brand-700)]" />
                  <span>
                    Token válido. Conta:{' '}
                    <strong className="font-medium">@{validated.username ?? validated.id}</strong>
                  </span>
                </div>
              )}

              {error && <ErrorBox>{error}</ErrorBox>}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="secondary"
                  onClick={validateToken}
                  disabled={loading || !token.igPageId || !token.accessToken}
                >
                  {loading ? 'Validando…' : 'Validar token'}
                </Button>
                <Button onClick={saveToken} disabled={loading || !validated}>
                  Salvar e continuar
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>3. Configurar agente</CardTitle>
              <CardDescription>
                Defina como o agente fala com os leads. Tudo editável depois.
              </CardDescription>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <Label htmlFor="agentName">Nome do agente</Label>
                <Input
                  id="agentName"
                  value={agent.agentName}
                  onChange={(e) => setAgent({ ...agent, agentName: e.target.value })}
                  placeholder="Ex: Sofia da Padaria São José"
                />
              </div>

              <div>
                <Label htmlFor="businessDescription">Descrição do negócio</Label>
                <Textarea
                  id="businessDescription"
                  value={agent.businessDescription}
                  onChange={(e) =>
                    setAgent({ ...agent, businessDescription: e.target.value })
                  }
                  placeholder="Padaria artesanal no Jardim Paulista, especializada em pães de fermentação natural. Atendemos por delivery nos bairros X, Y, Z. Horário: 7h-20h."
                  className="min-h-28"
                />
              </div>

              <div>
                <Label htmlFor="style">Estilo de comunicação</Label>
                <select
                  id="style"
                  value={agent.communicationStyle}
                  onChange={(e) => setAgent({ ...agent, communicationStyle: e.target.value })}
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
                <Label htmlFor="personality">Personalidade (opcional)</Label>
                <Textarea
                  id="personality"
                  value={agent.personality}
                  onChange={(e) => setAgent({ ...agent, personality: e.target.value })}
                  placeholder="Ex: empática, curiosa, faz perguntas antes de sugerir. Evita gírias."
                />
              </div>

              {error && <ErrorBox>{error}</ErrorBox>}

              <div className="pt-2">
                <Button
                  onClick={saveAgent}
                  disabled={loading || !agent.agentName || !agent.businessDescription}
                >
                  {loading ? 'Salvando…' : 'Continuar'}
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>4. Tudo pronto</CardTitle>
              <CardDescription>
                Seu agente está configurado. Próximos passos sugeridos:
              </CardDescription>
            </CardHeader>
            <CardBody className="space-y-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CircleDot className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                  Criar sua primeira campanha (palavra-chave → envio de material).
                </li>
                <li className="flex items-start gap-2">
                  <CircleDot className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                  Conectar WhatsApp (Uazapi) para continuidade cross-channel.
                </li>
                <li className="flex items-start gap-2">
                  <CircleDot className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                  Subir base de conhecimento (PDFs, FAQs) para o RAG.
                </li>
              </ul>
              <div className="flex gap-2 pt-2">
                <Button onClick={() => router.push('/dashboard')}>Ir para o dashboard</Button>
                <Button variant="secondary" onClick={() => router.push('/campaigns')}>
                  Criar campanha
                </Button>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}

function StepProgress({ current }: { current: Step }) {
  const steps = [
    { n: 1, label: 'Negócio' },
    { n: 2, label: 'Instagram' },
    { n: 3, label: 'Agente' },
    { n: 4, label: 'Pronto' },
  ];
  return (
    <div className="flex items-center gap-3">
      {steps.map((s, i) => {
        const done = s.n < current;
        const active = s.n === current;
        return (
          <div key={s.n} className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-2">
              <div
                className={
                  'h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold ' +
                  (done
                    ? 'bg-brand text-white'
                    : active
                    ? 'bg-brand-subtle text-[color:var(--brand-700)] border border-[color:var(--brand-600)]'
                    : 'bg-muted text-subtle')
                }
              >
                {done ? <Check className="h-3 w-3" /> : s.n}
              </div>
              <span
                className={
                  'text-xs ' +
                  (active || done ? 'text-foreground font-medium' : 'text-subtle')
                }
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={'flex-1 h-px ' + (done ? 'bg-brand' : 'bg-border')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-md border border-[color:#fecaca] bg-[color:#fef2f2] text-sm text-[color:#991b1b]">
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
