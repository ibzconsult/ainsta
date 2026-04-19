'use client';

import { LogOut } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function Topbar({ userEmail, tenantName }: { userEmail: string; tenantName: string }) {
  const router = useRouter();
  const initial = (tenantName.charAt(0) || userEmail.charAt(0) || '?').toUpperCase();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="h-14 shrink-0 border-b border-[var(--line)] bg-[var(--bg-raised)] flex items-center justify-between px-6">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-subtle)] border border-[var(--line)] text-sm font-medium text-[var(--text-dim)]">
          {initial}
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-medium truncate">{tenantName}</div>
          <div className="text-[11px] font-mono text-[var(--text-faint)] truncate">
            {userEmail}
          </div>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="btn-icon"
        title="Sair"
        aria-label="Sair"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </header>
  );
}
