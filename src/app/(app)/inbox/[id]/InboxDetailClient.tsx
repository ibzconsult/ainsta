'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import {
  ArrowLeft,
  Instagram,
  MessageSquareText,
  UserCheck,
  Bot,
  Send,
} from 'lucide-react';

type Msg = {
  id: string;
  direction: string;
  senderType: string;
  contentType: string;
  content: string | null;
  mediaUrl: string | null;
  createdAt: string;
};

type Props = {
  conversation: {
    id: string;
    channel: string;
    status: string;
    lastMessageAt: string;
  };
  contact: {
    id: string;
    name: string | null;
    igUsername: string | null;
    phone: string | null;
  };
  messages: Msg[];
  isLocked: boolean;
  lockExpiresAt: string | null;
};

export function InboxDetailClient({
  conversation,
  contact,
  messages: initialMessages,
  isLocked: initialLocked,
  lockExpiresAt: initialLockExpires,
}: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [isLocked, setIsLocked] = useState(initialLocked);
  const [lockExpiresAt, setLockExpiresAt] = useState(initialLockExpires);
  const [draft, setDraft] = useState('');
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const Icon = conversation.channel === 'instagram_dm' ? Instagram : MessageSquareText;
  const label = contact.igUsername ?? contact.name ?? contact.phone ?? 'Sem nome';

  async function toggleLock() {
    startTransition(async () => {
      const res = await fetch(`/api/inbox/${conversation.id}/takeover`, {
        method: isLocked ? 'DELETE' : 'POST',
      });
      if (!res.ok) {
        alert('Falha ao alterar status. Tente novamente.');
        return;
      }
      const json = await res.json();
      setIsLocked(json.locked);
      if (!json.locked) setLockExpiresAt(null);
      router.refresh();
    });
  }

  async function sendMessage() {
    const text = draft.trim();
    if (!text || !isLocked) return;
    const optimistic: Msg = {
      id: `tmp-${Date.now()}`,
      direction: 'outbound',
      senderType: 'human',
      contentType: 'text',
      content: text,
      mediaUrl: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    startTransition(async () => {
      const res = await fetch(`/api/inbox/${conversation.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Falha ao enviar: ${err.error ?? res.status}`);
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setDraft(text);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/inbox"
            className="p-2 -ml-2 rounded-md hover:bg-muted text-muted-foreground"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold truncate">{label}</h1>
              {isLocked && <Badge variant="warning">humano</Badge>}
            </div>
            <p className="text-[11px] font-mono text-subtle truncate">
              {conversation.channel === 'instagram_dm' ? 'Instagram DM' : 'WhatsApp'}
              {contact.phone && ` · ${contact.phone}`}
            </p>
          </div>
        </div>
        <Button
          variant={isLocked ? 'secondary' : 'primary'}
          size="sm"
          onClick={toggleLock}
          disabled={isPending}
        >
          {isLocked ? (
            <>
              <Bot className="h-3.5 w-3.5" />
              Devolver pra IA
            </>
          ) : (
            <>
              <UserCheck className="h-3.5 w-3.5" />
              Assumir
            </>
          )}
        </Button>
      </div>

      {isLocked && lockExpiresAt && (
        <div className="mt-3 mb-3">
          <Card className="border-amber-300/40 bg-amber-50/40 dark:bg-amber-900/10">
            <CardBody className="py-2.5 px-3 text-xs text-muted-foreground">
              IA pausada até{' '}
              <span className="font-mono">
                {new Date(lockExpiresAt).toLocaleString('pt-BR')}
              </span>
              . Suas mensagens vão direto ao cliente.
            </CardBody>
          </Card>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-4 space-y-3"
      >
        {messages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-10">
            Nenhuma mensagem nesta conversa ainda.
          </div>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} msg={m} />)
        )}
      </div>

      <div className="pt-3 border-t border-border">
        {isLocked ? (
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
          >
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              rows={2}
              placeholder="Digite sua resposta… (Enter envia, Shift+Enter quebra linha)"
              disabled={isPending}
              className="flex-1 resize-none"
            />
            <Button type="submit" disabled={isPending || !draft.trim()}>
              <Send className="h-4 w-4" />
              Enviar
            </Button>
          </form>
        ) : (
          <div className="text-xs text-muted-foreground text-center py-3">
            A IA está cuidando desta conversa. Clique em{' '}
            <strong>Assumir</strong> para pausar e responder você mesmo.
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  const isOutbound = msg.direction === 'outbound';
  const isHuman = msg.senderType === 'human';
  const isAgent = msg.senderType === 'agent';

  const bubbleClass = isOutbound
    ? isHuman
      ? 'bg-brand text-white'
      : 'bg-muted text-foreground border border-border'
    : 'bg-background text-foreground border border-border';

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] rounded-lg px-3 py-2 ${bubbleClass}`}>
        {isAgent && (
          <div className="flex items-center gap-1 text-[10px] opacity-70 mb-1">
            <Bot className="h-3 w-3" />
            IA
          </div>
        )}
        {isHuman && isOutbound && (
          <div className="flex items-center gap-1 text-[10px] opacity-70 mb-1">
            <UserCheck className="h-3 w-3" />
            Você
          </div>
        )}
        {msg.content ? (
          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
        ) : (
          <p className="text-xs italic opacity-70">[{msg.contentType}]</p>
        )}
        <div
          className={`text-[10px] font-mono mt-1 ${
            isOutbound && isHuman ? 'opacity-70' : 'text-subtle'
          }`}
        >
          {new Date(msg.createdAt).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
