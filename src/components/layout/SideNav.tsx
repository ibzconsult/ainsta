'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Bot,
  BookOpen,
  Megaphone,
  Instagram,
  MessageSquareText,
  Inbox,
  Users,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const sections: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Operação',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/inbox', label: 'Caixa de entrada', icon: Inbox },
      { href: '/leads', label: 'Leads', icon: Users },
    ],
  },
  {
    label: 'Configuração',
    items: [
      { href: '/agent', label: 'Agente', icon: Bot },
      { href: '/knowledge', label: 'Base de conhecimento', icon: BookOpen },
      { href: '/campaigns', label: 'Campanhas', icon: Megaphone },
    ],
  },
  {
    label: 'Canais',
    items: [
      { href: '/channels/instagram', label: 'Instagram', icon: Instagram },
      { href: '/channels/whatsapp', label: 'WhatsApp', icon: MessageSquareText },
    ],
  },
  {
    label: 'Conta',
    items: [{ href: '/settings', label: 'Configurações', icon: Settings }],
  },
];

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r border-[var(--line)] bg-[var(--bg-sidebar)] flex flex-col">
      <div className="px-4 py-5 border-b border-[var(--line)]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--accent-soft)] border border-[var(--accent-ring)]">
            <span className="text-[11px] font-bold tracking-tight text-[var(--accent)]">AI</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[15px] font-semibold tracking-tight">A.I.nsta</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-2 overflow-y-auto hide-scrollbar space-y-4">
        {sections.map((section) => (
          <div key={section.label}>
            <div className="nav-section-label">{section.label}</div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn('nav-item', active && 'nav-item-active')}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--line)] px-3 py-3 text-[11px] font-mono text-[var(--text-faint)]">
        v0.1 · MVP
      </div>
    </aside>
  );
}
