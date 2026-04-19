#!/usr/bin/env node
// Valida se cada peça da stack está respondendo. Uso: `npm run check:stack`
// Não modifica nada. Só lê.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');

function loadEnv() {
  try {
    const raw = readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (/^[A-Z0-9_]+$/.test(key) && !process.env[key]) process.env[key] = value;
    }
  } catch {
    console.error('[!] .env não encontrado em', envPath);
  }
}
loadEnv();

const results = [];

function ok(name, detail = '') {
  results.push({ name, status: 'OK', detail });
  process.stdout.write(`\x1b[32m✓\x1b[0m ${name}${detail ? `  \x1b[90m${detail}\x1b[0m` : ''}\n`);
}
function fail(name, detail) {
  results.push({ name, status: 'FAIL', detail });
  process.stdout.write(`\x1b[31m✗\x1b[0m ${name}  \x1b[31m${detail}\x1b[0m\n`);
}
function warn(name, detail) {
  results.push({ name, status: 'WARN', detail });
  process.stdout.write(`\x1b[33m!\x1b[0m ${name}  \x1b[33m${detail}\x1b[0m\n`);
}

async function withTimeout(p, ms) {
  return Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout ${ms}ms`)), ms)),
  ]);
}

// --- checks ---

async function checkEnv() {
  const required = [
    'DATABASE_URL',
    'DIRECT_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'META_APP_ID',
    'META_APP_SECRET',
    'META_WEBHOOK_VERIFY_TOKEN',
    'UAZAPI_URL',
    'UAZAPI_ADMIN_TOKEN',
    'OPENAI_API_KEY',
    'N8N_WEBHOOK_INSTAGRAM',
    'N8N_WEBHOOK_UAZAPI',
  ];
  const missing = required.filter((k) => !process.env[k] || process.env[k] === '');
  if (missing.length) return fail('env', `faltando: ${missing.join(', ')}`);
  ok('env', `${required.length} vars presentes`);
}

async function checkSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon) return fail('supabase', 'url/anon vazios');

  // Anon: /auth/v1/settings é público com anon key válida
  try {
    const res = await withTimeout(
      fetch(`${url}/auth/v1/settings`, { headers: { apikey: anon } }),
      8000
    );
    if (!res.ok) return fail('supabase anon', `HTTP ${res.status} em /auth/v1/settings`);
    ok('supabase anon', `${url.replace('https://', '')} resp ${res.status}`);
  } catch (e) {
    return fail('supabase anon', e.message);
  }

  // Service role: query em lia_tenants (bypassa RLS)
  if (!svc) return warn('supabase service_role', 'não configurada');
  try {
    const res = await withTimeout(
      fetch(`${url}/rest/v1/lia_tenants?select=id&limit=1`, {
        headers: { apikey: svc, Authorization: `Bearer ${svc}` },
      }),
      8000
    );
    if (!res.ok) {
      const body = await res.text();
      return fail('supabase service_role', `HTTP ${res.status} ${body.slice(0, 80)}`);
    }
    const rows = await res.json();
    ok('supabase service_role', `${Array.isArray(rows) ? rows.length : 0} tenant(s) visíveis`);
  } catch (e) {
    fail('supabase service_role', e.message);
  }
}

async function checkOpenAI() {
  try {
    const res = await withTimeout(
      fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      }),
      8000
    );
    if (!res.ok) return fail('openai', `HTTP ${res.status}`);
    const json = await res.json();
    const count = Array.isArray(json.data) ? json.data.length : 0;
    ok('openai', `${count} models acessíveis`);
  } catch (e) {
    fail('openai', e.message);
  }
}

async function checkUazapi() {
  try {
    const url = `${process.env.UAZAPI_URL}/instance/all`;
    const res = await withTimeout(
      fetch(url, {
        headers: { admintoken: process.env.UAZAPI_ADMIN_TOKEN },
      }),
      8000
    );
    if (!res.ok) return fail('uazapi', `HTTP ${res.status} em ${url}`);
    const json = await res.json().catch(() => null);
    const list = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
    const connected = list.filter((i) => i.status === 'connected' || i?.data?.status === 'connected').length;
    ok('uazapi', `${list.length} instâncias (${connected} conectadas)`);
  } catch (e) {
    fail('uazapi', e.message);
  }
}

async function checkN8nWebhook(name, url) {
  // n8n responde 200 mesmo pra POST vazio quando o workflow está ativo.
  // Se o workflow não existe/ativo, n8n responde 404 com body específico.
  try {
    const res = await withTimeout(
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _probe: true }),
      }),
      10000
    );
    if (res.status === 404) {
      const body = await res.text();
      if (body.includes('not registered')) {
        return warn(name, `workflow não ativo (${url})`);
      }
      return fail(name, `404 ${body.slice(0, 80)}`);
    }
    if (!res.ok) return warn(name, `HTTP ${res.status}`);
    ok(name, `${url.replace(/^https?:\/\//, '')} resp ${res.status}`);
  } catch (e) {
    fail(name, e.message);
  }
}

// --- run ---

console.log('\n\x1b[1mLia SaaS — Stack Check\x1b[0m\n');
await checkEnv();
await checkSupabase();
await checkOpenAI();
await checkUazapi();
await checkN8nWebhook('n8n IG', process.env.N8N_WEBHOOK_INSTAGRAM);
await checkN8nWebhook('n8n WA', process.env.N8N_WEBHOOK_UAZAPI);

const failed = results.filter((r) => r.status === 'FAIL').length;
const warned = results.filter((r) => r.status === 'WARN').length;

console.log();
if (failed) {
  console.log(`\x1b[31m${failed} falha(s), ${warned} aviso(s).\x1b[0m\n`);
  process.exit(1);
}
if (warned) {
  console.log(`\x1b[33m${warned} aviso(s) — stack utilizável mas incompleta.\x1b[0m\n`);
  process.exit(0);
}
console.log(`\x1b[32mTudo OK.\x1b[0m\n`);
