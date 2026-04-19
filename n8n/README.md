# Lia SaaS — n8n workflows (Fase 6 + Fase 7)

5 arquivos para importar na instância n8n (`webhook.agenciaart.com.br`):

| Arquivo | Descrição | Trigger |
|---|---|---|
| `instagram-workflow.json` | Processa DMs recebidas via Meta | Webhook `POST /lia-saas-instagram` |
| `whatsapp-workflow.json`  | Processa mensagens Uazapi      | Webhook `POST /lia-saas-uazapi` |
| `search-knowledge-subworkflow.json` | Tool RAG (vector search em `lia_knowledge_base`) | Chamado como tool |
| `meta-token-refresh-cron.json` | Renova tokens Meta < 10 dias de expirar | Cron `0 3 * * *` (3h UTC) |
| `locks-cleanup-cron.json` | Libera locks de takeover expirados + volta convos pra 'active' | Cron `*/15 * * * *` |

## 1. Pré-requisitos n8n

**Credenciais:**

1. **Postgres — Supabase** (session pooler 5432, não 6543)
   - Host, user e password: copiar do `DIRECT_URL` do `.env` do Next.js
   - Port: `5432`
   - Database: `postgres`
   - SSL: `require`
   - Nome sugerido: **`Supabase A.I.nsta`**

2. **OpenAI**
   - Api Key: (a mesma do `OPENAI_API_KEY` do `.env`)
   - Nome sugerido: **`OpenAI Lia SaaS`**

**Variáveis de ambiente n8n** (em `/root/.env` ou `docker-compose.yml` da VPS):

```bash
# Para validar webhook Meta (GET hub.challenge)
META_WEBHOOK_VERIFY_TOKEN=<mesmo valor do .env do Next.js>

# Para o embeddings do RAG
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Para o cron de refresh de token Meta (fb_exchange_token)
META_APP_ID=<App ID do Meta App>
META_APP_SECRET=<App Secret do Meta App>
```

## 2. Ordem de import

1. `search-knowledge-subworkflow.json` (importar PRIMEIRO — o Instagram/WhatsApp referenciam via ID)
2. Copiar o `id` do subworkflow recém-importado.
3. Abrir `instagram-workflow.json` e `whatsapp-workflow.json`, localizar o node **Tool — search_knowledge** e colar o ID no campo `workflowId`.
4. Importar os dois workflows principais.
5. Em cada um: selecionar credencial **Supabase Lia SaaS** nos nodes Postgres e **OpenAI Lia SaaS** nos nodes OpenAI/Embeddings.
6. **Ativar** os workflows.

## 3. URLs públicas

Depois de ativar, confirmar que os paths batem com o `.env` do Next.js:

```env
N8N_WEBHOOK_INSTAGRAM="https://webhook.agenciaart.com.br/webhook/lia-saas-instagram"
N8N_WEBHOOK_UAZAPI="https://webhook.agenciaart.com.br/webhook/lia-saas-uazapi"
```

## 4. Diferenças WhatsApp (Uazapi)

O fluxo é idêntico ao Instagram exceto:

- **Extract**: aceita 2 formatos de payload (Uazapi simples `{message:{...},token}` e baileys-like `{messages:[{key,message}],owner}`).
- **Guardrails**: checa `fromMe === false`, `text not empty`, `phone not empty`, `instanceToken not empty`.
- **Tenant lookup**: por `lia_whatsapp_instances.instance_token` (a mesma instância que recebeu a mensagem responde). Exige `wi.status = 'connected'`.
- **Contact**: UPSERT por `(tenant_id, phone)` em vez de `(tenant_id, ig_user_id)`.
- **Conversation**: `channel = 'whatsapp'`, `session_id = wa:{tenant}:{phone}`.
- **Send**: `POST {uazapi_url}/send/text` com header `token: {instance_token}` e body `{number, text}`. Campanha com asset usa `/send/media` e `{number, type, file, text}`.
- **Tool send_whatsapp_invite**: no canal WhatsApp só deve ser usada para handoff humano (número diferente do bot).

## 5. Fluxo resumido (Instagram)

```
Webhook Meta (via Next.js /api/webhooks/instagram)
  → Extract payload (igPageId, senderId, text)
  → Guardrails (ignora echo, self, vazio)
  → Postgres: lookup tenant + agent_config + handoff
  → Postgres: upsert contact + conversation + insert msg inbound
  → Postgres: busca campaigns ativas
  → Match campaign keyword?
      SIM → Graph API send asset + log lead → FIM
      NÃO → Wait 15s (debounce)
            → Re-check: última msg inbound == essa execução?
                NÃO → FIM (outra execução mais nova responde)
                SIM → Fetch msgs bufferizadas
                      → Compose system prompt (composePrompt port)
                      → AI Agent (GPT-4.1-mini)
                          - Memory: Postgres chat history (lia_n8n_chat_histories)
                          - Tool: search_knowledge (RAG vector)
                          - Tool: send_whatsapp_invite (gera wa.me link)
                      → Format (prefixo 🤖)
                      → Graph API send text
                      → Insert msg outbound
                      → FIM
```

## 6. Debounce — como evita race condition

Sem Redis. Estratégia debounce nativa Postgres:

1. Todo webhook **registra a msg inbound no banco imediatamente**.
2. Espera 15s.
3. Consulta se a `MAX(created_at)` de `lia_messages` (direction inbound) daquela conversa ainda é a execução corrente.
4. Se sim, processa TODAS as inbound desde a última outbound → 1 única resposta consolidada.
5. Se não, outra execução mais recente assume — a atual encerra silenciosamente.

## 7. Tools do AI Agent

### `search_knowledge(query)`
Subworkflow `search-knowledge-subworkflow.json`.
- Input: `query` (string), `tenantId` (string, injetado pelo compose).
- Gera embedding via `text-embedding-3-small`.
- Query: `SELECT content FROM lia_knowledge_base WHERE tenant_id=$1 ORDER BY embedding <=> $2::vector LIMIT 5`.
- Retorna chunks concatenados com separadores.

### `send_whatsapp_invite()`
Tool Code inline.
- Lê `handoff_phone` e `handoff_message` do context.
- Retorna `https://wa.me/{phone}?text={encoded_message}` pro agent incluir na resposta.

## 8. Fase 7 — Token refresh + rate limit

### 8.1 Meta Token Refresh (cron)

`meta-token-refresh-cron.json` roda 1x/dia (03h UTC) e:

1. Busca `lia_meta_tokens` com `status='active'` e `expires_at < NOW() + 10 days` (ou null).
2. Pra cada um, chama `GET /v22.0/oauth/access_token?grant_type=fb_exchange_token` usando `META_APP_ID`/`META_APP_SECRET` das env vars do n8n.
3. Atualiza `access_token`, `expires_at` (usando `expires_in` da resposta — ou +60 dias se não vier), `last_refreshed_at = NOW()`.
4. Em falha: `status = 'refresh_failed'` + log em `lia_audit_logs`.
5. Processa 1 token por vez (SplitInBatches) pra não disparar rate limit do Graph.

Ativar o workflow no n8n e garantir as env vars no container.

### 8.2 Rate limit retry

Os 3 nodes HTTP que mandam mensagem (`Graph — Send reply`, `Graph — Send asset`, `Uazapi — Send reply`, `Uazapi — Send asset`) estão com:
- `retryOnFail: true`
- `maxTries: 3`
- `waitBetweenTries: 5000` (ms)
- `continueOnFail: true` (pra não matar o fluxo — a msg outbound ainda é logada pra permitir replay manual depois)

Graph API retorna 4xx quando bate rate limit (códigos 4, 17, 32, 613). Uazapi retorna 5xx quando o number não está conectado. O retry cobre ambos.

**Limite Graph**: 200 calls/hora/user. Pra volume maior, considerar fila (Redis/BullMQ) na Fase 8.

## 9. Observações

- **RLS**: workflows usam o usuário superuser do Supabase (`postgres.<project_id>`) → bypassa RLS. Tenant isolation é garantido pelo `tenantId` no WHERE de TODAS as queries. Nunca remover.
- **Auditoria**: o cron de refresh grava em `lia_audit_log` (com `user_email='system@lia.internal'`). Filtrar `WHERE action IN ('meta_token_refreshed','meta_token_refresh_failed')` pra ver histórico. Os nodes de audit têm `continueOnFail` (não quebra mesmo se a tabela mudar).
