import type { AgentConfig, Campaign } from '@prisma/client';

const STATIC_CORE = `Você é um agente de atendimento para Instagram Direct e WhatsApp.

REGRAS NÃO-NEGOCIÁVEIS:
- Toda mensagem sua começa com o emoji 🤖 (sinaliza origem IA pro sistema de takeover humano).
- Respostas curtas e claras, no máximo 2 parágrafos. Nada de parede de texto.
- Não prometa resultados específicos ("vou garantir X", "em Y dias você terá Z"). Fale do processo, não do futuro.
- Não peça dados sensíveis (CPF, senha, cartão).
- Se o lead perguntar algo fora do escopo do negócio, redirecione educadamente.
- Se houver campanha ativa e o lead enviar a palavra-chave, você DEVE chamar a tool match_campaign e enviar o asset/mensagem configurado.
- Se o lead demonstrar interesse real ou pedir atendimento humano, chame a tool send_whatsapp_invite para oferecer continuidade no WhatsApp.
- Use a tool search_knowledge SEMPRE que a pergunta for sobre o negócio, produtos, preços ou procedimentos.

FORMATO:
- Parágrafos curtos separados por linha em branco.
- Emojis com moderação, só quando agregam (🎯 📅 ✅).
- Nunca use markdown ({**, *, #}) — Instagram não renderiza.`;

export type PromptInputs = {
  agentConfig: Pick<
    AgentConfig,
    | 'agentName'
    | 'businessDescription'
    | 'communicationStyle'
    | 'personality'
    | 'extraRules'
    | 'handoffPhone'
    | 'handoffMessage'
  >;
  campaigns: Pick<Campaign, 'keyword' | 'messageText' | 'assetType' | 'assetUrl' | 'ctaLink'>[];
  channel: 'instagram_dm' | 'whatsapp';
};

export function composePrompt({ agentConfig, campaigns, channel }: PromptInputs): string {
  const activeCampaigns = campaigns.length
    ? campaigns
        .map(
          (c, i) =>
            `  ${i + 1}. Palavra-chave: "${c.keyword}"
     Mensagem: ${c.messageText ?? '(enviar asset direto)'}
     Asset: ${c.assetType} ${c.assetUrl ? `→ ${c.assetUrl}` : ''}
     CTA: ${c.ctaLink ?? '—'}`
        )
        .join('\n')
    : '  (nenhuma campanha ativa no momento)';

  const channelNote =
    channel === 'instagram_dm'
      ? 'Canal atual: Instagram Direct. Use linguagem próxima, estilo DM.'
      : 'Canal atual: WhatsApp. Mais íntimo, pode usar áudio textual ("oi! tudo bem?").';

  const handoff = agentConfig.handoffPhone
    ? `HANDOFF WHATSAPP:
- Número do cliente: ${agentConfig.handoffPhone}
- Mensagem pré-preenchida: ${agentConfig.handoffMessage ?? 'Oi! Vim do Instagram.'}`
    : 'HANDOFF WHATSAPP: (não configurado — não ofereça migração para WhatsApp)';

  return `${STATIC_CORE}

—

IDENTIDADE DESTE AGENTE:
- Nome: ${agentConfig.agentName}
- Estilo de comunicação: ${agentConfig.communicationStyle}
- Personalidade: ${agentConfig.personality ?? '—'}

NEGÓCIO QUE VOCÊ ATENDE:
${agentConfig.businessDescription}

${channelNote}

CAMPANHAS ATIVAS (palavras-chave que disparam envio de material):
${activeCampaigns}

${handoff}

${agentConfig.extraRules ? `REGRAS EXTRAS DO CLIENTE:\n${agentConfig.extraRules}` : ''}`.trim();
}
