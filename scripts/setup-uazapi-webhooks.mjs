#!/usr/bin/env node
// Configura webhook de todas as instâncias Uazapi do tenant pra apontar
// pro endpoint do Next. Uso: `npm run setup:uazapi -- --next-url=https://seu-app.netlify.app`
//
// Lê as instâncias de lia_whatsapp_instances via Supabase REST (service_role key)
// e chama /webhook em cada uma.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');

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
  console.error('[!] .env não encontrado');
  process.exit(1);
}

const nextUrlArg = process.argv.find((a) => a.startsWith('--next-url='));
const nextUrl = nextUrlArg
  ? nextUrlArg.split('=')[1]
  : process.env.NEXT_PUBLIC_APP_URL;

if (!nextUrl || nextUrl.startsWith('http://localhost')) {
  console.error(
    '[!] Precisa de --next-url=https://seu-app.com (Uazapi não aceita localhost)'
  );
  process.exit(1);
}

const webhookUrl = `${nextUrl.replace(/\/$/, '')}/api/webhooks/uazapi`;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const UAZAPI_URL = process.env.UAZAPI_URL;

console.log(`\nWebhook alvo: ${webhookUrl}\n`);

const sbRes = await fetch(
  `${SUPABASE_URL}/rest/v1/lia_whatsapp_instances?select=id,label,instance_token,uazapi_url,status&status=eq.connected`,
  {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  }
);
if (!sbRes.ok) {
  console.error('[!] Falha ao listar instâncias:', sbRes.status, await sbRes.text());
  process.exit(1);
}
const instances = await sbRes.json();

if (instances.length === 0) {
  console.log('Nenhuma instância conectada. Nada a fazer.');
  process.exit(0);
}

let okCount = 0;
let failCount = 0;

for (const inst of instances) {
  const token = inst.instance_token;
  const baseUrl = inst.uazapi_url || UAZAPI_URL;
  const label = inst.label || inst.id.slice(0, 8);
  if (!token) {
    console.log(`✗ ${label}: sem instance_token, pulando`);
    failCount++;
    continue;
  }
  try {
    const res = await fetch(`${baseUrl}/webhook`, {
      method: 'POST',
      headers: { token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        events: ['messages'],
      }),
    });
    if (res.ok) {
      console.log(`✓ ${label}: webhook configurado`);
      okCount++;
    } else {
      const body = await res.text();
      console.log(`✗ ${label}: HTTP ${res.status} ${body.slice(0, 120)}`);
      failCount++;
    }
  } catch (e) {
    console.log(`✗ ${label}: ${e.message}`);
    failCount++;
  }
}

console.log(`\n${okCount} OK · ${failCount} falha(s)\n`);
process.exit(failCount > 0 ? 1 : 0);
