import { createSupabaseServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export type SessionContext = {
  userEmail: string;
  tenantId: string;
  tenantSlug: string;
};

export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const tenant = await prisma.tenant.findFirst({
    where: { ownerEmail: user.email.toLowerCase() },
    select: { id: true, slug: true },
  });

  if (!tenant) return null;

  return {
    userEmail: user.email.toLowerCase(),
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
  };
}

export async function requireSession(): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx) throw new Error('UNAUTHORIZED');
  return ctx;
}
