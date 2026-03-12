# 📝 Patch Notes - v1.4.7 (Atualização em Homolog)

Esta atualização traz correções críticas de infraestrutura, melhorias de performance no mercado e novas funcionalidades de gerenciamento de conta, garantindo uma experiência mais fluida e reativa.

### 🛡️ Sistema de Guildas e Atributos
- **Correção de Bônus de Guilda**: Resolvido o erro onde os bônus de XP, Drop e Atributos não eram carregados no momento do login. Agora, os bônus são aplicados imediatamente ao entrar no jogo.
- **Visualização Detalhada**: O `StatBreakdownModal`, `ProfilePanel` e `InspectModal` agora refletem corretamente os bônus ativos da sua guilda.
- **Estabilidade de Membros**: Corrigido o carregamento da lista de membros da guilda, evitando falhas de sincronização na interface.

### 💰 Mercado (Marketplace)
- **Paginação Global**: Implementada paginação de 10 itens por página nas abas de Navegação, Minhas Ordens e Histórico. Isso reduz o tempo de carregamento e organiza melhor as listagens.
- **Transparência em Ordens de Compra**: O painel de "Preencher Ordem de Compra" foi redesenhado para exibir o valor bruto, a taxa de mercado (20%) e o **lucro líquido real** que você receberá.
- **Histórico Persistente**: Ajustada a lógica de exibição para garantir que todas as transações de compra e venda apareçam corretamente na aba histórica.
- **Correções Visuais**: Removidos erros de sintaxe (Adjacent JSX) que causavam quebras visuais em resoluções específicas nas abas de mercado.

### 📜 Gerenciamento de Personagem
- **Troca de Nome (Rename)**: Implementado o item **Token de Troca de Nome**. 
    - Novo modal de renomeação com sistema de **verificação de disponibilidade em tempo real**.
    - O consumo do item agora abre o modal automaticamente sem passar pela confirmação de quantidade.
- **Sistema de Moderação Reativo**: Avisos de conta (nível 1) agora são enviados via socket e aparecem instantaneamente para o jogador, sem necessidade de relogar.

### ⚡ UI e Reatividade (UX)
- **Reatividade do App.jsx**: Refatoração completa da estrutura principal para suporte a hooks reativos.
- **Notificações Instantâneas**: O "ponto vermelho" (badge) dos botões Social e Presente Diário agora desaparece no exato momento em que a ação (troca ou giro) é concluída.
- **Melhoria nas Runas**: Ao abrir a interface de Merge de Runas, a lista de coleção agora vem filtrada por **"Todas" (All)** por padrão, facilitando a visualização dos seus shards.
- **Fix OrbShop**: Corrigido um crash intermitente no Shop de Orbs relacionado ao estado inicial das moedas premium.

### 🌙 Progresso Offline
- **Relatório Persistente**: O modal de ganhos offline agora exige confirmação (`acknowledge`) antes de ser removido, garantindo que você nunca perca o resumo dos itens e XP ganhos durante sua ausência.
- **Estabilidade de Login**: Reforçada a comunicação de login para evitar falhas no envio do relatório offline em conexões instáveis.

### 🛠️ Estabilidade e Técnica
- **Sincronização de Versão (v1.4.7)**: Sincronia obrigatória entre cliente e servidor para evitar loops de refresh e garantir que todos usem a lógica mais recente.
- **Modularização de Código**: Divisão de componentes gigantes (`App.jsx`) em partes menores para carregamento mais eficiente.
- **Limpeza de Debug**: Remoção de logs de console desnecessários e scripts de teste temporários, otimizando o consumo de memória do navegador.
