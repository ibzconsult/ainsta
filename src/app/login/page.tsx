'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setError('');

    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (err) {
      setStatus('error');
      setError(err.message);
    } else {
      setStatus('sent');
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="inline-flex items-center gap-2 text-xs font-mono text-subtle mb-8 uppercase tracking-wider">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          A.I.nsta
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enviamos um link mágico pro seu e-mail.
        </p>

        {status === 'sent' ? (
          <div className="mt-8 rounded-md border border-border bg-muted p-4 text-sm">
            Link enviado pra <strong className="font-medium">{email}</strong>.
            Confira sua caixa de entrada.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-foreground mb-1.5">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={status === 'sending'}
                placeholder="voce@empresa.com"
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:border-brand focus:ring-0 outline-none disabled:bg-muted"
              />
            </div>

            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full h-10 rounded-md bg-brand text-white font-medium text-sm hover:bg-brand-hover transition-colors disabled:opacity-60"
            >
              {status === 'sending' ? 'Enviando…' : 'Enviar link'}
            </button>

            {error && (
              <p className="text-sm text-[color:var(--danger)]">{error}</p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
