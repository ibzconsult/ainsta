import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-xl">
        <div className="inline-flex items-center gap-2 text-xs font-mono text-subtle mb-6 uppercase tracking-wider">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          A.I.nsta — MVP
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          Agente de IA para Instagram.
          <br />
          <span className="text-subtle">Multi-tenant, cross-channel.</span>
        </h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Atendimento automatizado no Instagram Direct com continuidade no WhatsApp.
          Um agente por cliente, campanhas por palavra-chave, base de conhecimento própria.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            href="/login"
            className="inline-flex items-center h-10 px-5 rounded-md bg-brand text-white font-medium text-sm hover:bg-brand-hover transition-colors"
          >
            Entrar
          </Link>
          <Link
            href="/onboarding"
            className="inline-flex items-center h-10 px-5 rounded-md border border-border text-foreground font-medium text-sm hover:border-border-strong transition-colors"
          >
            Criar conta
          </Link>
        </div>
      </div>
    </main>
  );
}
