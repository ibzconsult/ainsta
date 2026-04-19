# Lia SaaS — Setup

Guia compacto pra colocar tudo no ar. Ordem importa.

## Pré-requisitos

- `.env` preenchido (ver `.env.example` — deve ter todos os 14 campos)
- Acesso SSH na VPS `167.235.19.228` (n8n)
- App Facebook Developer aprovado pra Instagram Messaging
- Pelo menos 1 instância Uazapi ativa

## 1. n8n VPS — env vars

SSH na VPS e adiciona no `.env` do container n8n:

```bash
ssh -i ~/.ssh/id_ed25519_hetzner root@167.235.19.228
cd <pasta do docker-compose do n8n>   # tipicamente /root ou /opt/n8n
```

Adiciona ao `.env`:

```bash
META_APP_ID=<mesmo valor do .env local>
META_APP_SECRET=<mesmo valor>
META_WEBHOOK_VERIFY_TOKEN=<mesmo valor>
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

Restart:

```bash
docker compose restart n8n
```

## 2. n8n UI — credenciais

Abre `https://webhook.agenciaart.com.br` → **Credentials** → **Add**:

| Nome | Tipo | Campos |
|---|---|---|
| **Supabase A.I.nsta** | Postgres | Host/User/Pass do `DIRECT_URL` no `.env` (porta `5432`, DB `postgres`, SSL `require`) |
| **OpenAI Lia SaaS** | OpenAI | API Key = `OPENAI_API_KEY` do `.env` |

Anota o ID de cada credencial (URL `/credentials/XXX`).

## 3. n8n UI — import workflows

Menu **Workflows** → **Import from File** na ordem:

1. `n8n/search-knowledge-subworkflow.json` — **anota o ID** após import
2. `n8n/instagram-workflow.json`
3. `n8n/whatsapp-workflow.json`
4. `n8n/meta-token-refresh-cron.json`
5. `n8n/locks-cleanup-cron.json`

Em cada workflow, nos nodes afetados:
- Todo node **Postgres** → dropdown credencial → selecionar `Supabase Lia SaaS`
- Todo node **OpenAI**/**Chat Model**/**Embeddings** → selecionar `OpenAI Lia SaaS`
- No IG e WA, o node **Tool — search_knowledge** → campo `workflowId` → colar ID do subworkflow

Salva cada workflow. **Ativa** todos (toggle canto superior direito).

## 4. Webhook Meta (Instagram)

Facebook Developer Console → App → **Webhooks** → Object **Instagram**:

- Callback URL: `https://<next-url>/api/webhooks/instagram`
- Verify Token: mesmo valor de `META_WEBHOOK_VERIFY_TOKEN` (`.env` local e `.env` n8n)
- Subscribe to: `messages`, `messaging_postbacks`

Meta dispara um GET de validação — o Next responde automático.

Depois, na página do App → **Instagram API with Instagram Login** → conecta a conta IG Business do tenant → copia o token + igPageId e insere em `lia_meta_tokens` via dashboard do tenant (ou SQL direto).

## 5. Webhook Uazapi

Para cada instância Uazapi conectada a um tenant (tabela `lia_whatsapp_instances`):

```bash
curl -X POST "$UAZAPI_URL/webhook" \
  -H "token: <instance_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://<next-url>/api/webhooks/uazapi",
    "events": ["messages"]
  }'
```

Ou usa o script `scripts/setup-uazapi-webhooks.mjs` (configura todas de uma vez — ver `npm run setup:uazapi`).

## 6. Validar stack

```bash
npm run check:stack
```

Testa Supabase, OpenAI, n8n webhooks e Uazapi. Deve retornar OK em todos.

## 7. Teste ponta a ponta

1. Supabase → Auth → criar usuário de teste com email
2. Login no Next → cria workspace (onboarding)
3. `/knowledge` → cola texto de teste → Ingerir
4. `/agent` → preenche nome, descrição, tom, handoff
5. `/campaigns` → cria campanha com keyword "teste"
6. Manda DM "teste" pro IG conectado → deve receber asset da campanha
7. Manda DM qualquer coisa → aguarda 15s → IA responde
8. `/inbox/[id]` → **Assumir** → manda msg pelo textarea → chega no IG

## Debug

- **n8n Executions** — menu lateral, erro de cada run
- **Supabase SQL Editor**:
  - `SELECT * FROM lia_audit_log WHERE action LIKE 'meta_token%' ORDER BY created_at DESC;` — refresh tokens
  - `SELECT * FROM lia_messages ORDER BY created_at DESC LIMIT 50;` — fluxo msgs
  - `SELECT * FROM lia_conversation_locks;` — locks ativos
- **Next logs** — dev `npm run dev`; prod logs do host (Netlify/CF Pages)
