# A.I.nsta

Agente de IA multi-tenant para Instagram Direct e WhatsApp. Next 16 + Prisma + Supabase + n8n.

## Stack

- **Next 16** (App Router, Turbopack)
- **Prisma 6.19** + **Supabase** (Postgres com pgvector pra RAG)
- **n8n** em `webhook.agenciaart.com.br` (workflows IG/WA + crons)
- **Uazapi** pra WhatsApp multi-instância
- **OpenAI** (gpt-4.1-mini + text-embedding-3-small)

## Setup

Ver [`SETUP.md`](./SETUP.md) para passos detalhados.

Quickstart:

```bash
cp .env.example .env   # preenche as 14 vars
npm install
npm run db:push
npm run check:stack    # valida env + Supabase + OpenAI + Uazapi + n8n
npm run dev
```

## Estrutura

- `src/app/(app)/` — páginas do painel (dashboard, inbox, leads, agent, knowledge, campaigns, channels, settings)
- `src/app/api/` — rotas API (webhooks IG/Uazapi, inbox takeover, instances, meta, knowledge, tenants)
- `src/components/ui/` — componentes base (Button, Card, Input, Badge, Textarea, Label)
- `src/components/layout/` — shell (SideNav, Topbar, PageShell)
- `src/lib/` — prisma, auth, openai, uazapi, knowledge, prompt-composer
- `n8n/` — 5 workflows JSON pra importar
- `prisma/schema.prisma` — 14 tabelas `lia_*`

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Dev server local |
| `npm run build` | Build de produção (prisma generate + next build) |
| `npm run db:push` | Aplica schema no Supabase |
| `npm run check:stack` | Diagnóstico ao vivo da stack |
| `npm run setup:uazapi -- --next-url=<url>` | Configura webhook Uazapi em massa |
