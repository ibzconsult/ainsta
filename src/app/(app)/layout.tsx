import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSessionContext } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SideNav } from '@/components/layout/SideNav';
import { Topbar } from '@/components/layout/Topbar';

// Todo o painel depende de sessão/cookies — força render dinâmico,
// evita que `next build` tente prerenderar e chame Supabase sem env vars.
export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getSessionContext();

  if (!ctx) {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    redirect('/onboarding');
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { nomeEmpresa: true },
  });

  return (
    <div className="flex h-screen">
      <SideNav />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar userEmail={ctx.userEmail} tenantName={tenant?.nomeEmpresa ?? 'Workspace'} />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-8 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
