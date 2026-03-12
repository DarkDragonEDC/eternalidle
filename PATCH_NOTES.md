# 📄 Auditoria Completa de Mudanças - Main vs Homolog (v1.4.7)

Esta é a lista definitiva e minuciosa de todas as alterações existentes na branch **homolog** em comparação à **main**, abrangendo desde grandes funcionalidades até pequenos ajustes de sintaxe e pontuação.

### 🚀 Novas Funcionalidades e Ativos
- **Lançamento Mobile**: Adicionados arquivos de pacote para Google Play: `Eternal Idle.aab` e `Eternal Idle.apk`.
- **Sistema de Troca de Nome**:
    - Novo item: `NAME_CHANGE_TOKEN` (Token de Troca de Nome).
    - Modal de renomeação com verificação de disponibilidade em tempo real.
    - Lógica de consumo que ignora modal de quantidade para uso imediato.
- **Moderação Reativa**:
    - Novo sistema de aviso de banimento (`BanWarningOverlay`) que aparece via socket sem necessidade de relogar.
    - Implementação do evento `account_status` no cliente.

### 🏗️ Refatoração de Arquitetura (App.jsx)
- **Modularização Extrema**: O arquivo `App.jsx` foi totalmente refatorado, reduzindo sua complexidade e delegando responsabilidades para novos componentes:
    - `GlobalHeader.jsx`: Centraliza a navegação superior e informações do jogador.
    - `GameContent.jsx`: Gerencia a renderização das abas principais.
    - `AppModals.jsx`: Centraliza todos os modais do sistema.
    - `AppOverlays.jsx`: Gerencia overlays de erro, banimento e versão.
- **Hooks de Sincronização**: Implementados hooks especializados para manter o estado do jogo consistente: `useAuthSync`, `useGameSync`, `useNavigationSync`, `useSocketEvents`.
- **Reatividade de Estado**: Migração de `getState()` para destructuring direto do hook `useAppStore()` em componentes críticos, garantindo atualizações visuais instantâneas.

### 💰 Marketplace (Mercado)
- **Paginação de Ordens**: Implementada paginação de 10 itens por página em:
    - `MarketBrowseTab.jsx` (Navegação de itens).
    - `MarketBuyOrdersTab.jsx` (Ordens de compra).
    - `MarketHistoryTab.jsx` (Histórico de transações).
- **Interface de Venda Melhorada**:
    - Exibição explícita do imposto de mercado (20%).
    - Cálculo dinâmico do **lucro líquido** (Net Profit) visível antes da confirmação.
- **Correções de Layout**: Ajustadas vírgulas e fechamentos de tags JSX em todos os componentes de mercado para evitar erros de renderização.

### 🛡️ Guildas e Social
- **Interface de Membros**: Refatoração da lista de membros para suportar scrolls longos e carregamento estável.
- **Badges Reativos**: O ponto vermelho de notificação de trocas agora é removido instantaneamente via socket `trade_success`.

### ⚡ UI, UX e Polimento (Ajustes Meticulosos)
- **Rune Merge**: Ajustado o estado inicial do `categoryFilter` para **'ALL'**, removendo o filtro padrão de Gathering que ocultava runas.
- **Orb Shop**: Correções de tratamento de erro em falhas de conexão com o banco de dados durante a compra de orbs.
- **Estilo Visual**:
    - Ajustes de `padding` e `gap` em modais para evitar cortes de texto.
    - Padronização de transições Framer Motion em todos os overlays.
    - Alteração de cores de botões para tons mais vibrantes e harmônicos.

### 🛠️ Técnico e Infraestrutura
- **Versão**: Sincronização obrigatória na v1.4.7 (Servidor e Cliente).
- **Socket.io**: Adicionados listeners para `daily_status`, `account_status` e `market_listings_update`.
- **SQL**: Adicionados scripts para suporte a novas tabelas de log e campos de status de conta.
- **Limpeza**: Remoção total de `console.log` de desenvolvimento e scripts de teste (`testEterno.js`, etc.).

### 💎 Polimento de Micro-detalhes (Precisão Total)
- **Sintaxe e Pontuação**: Revisão de todas as vírgulas pendentes e pontos e vírgulas (semicolons) em objetos de estado e componentes de UI para garantir conformidade com o padrão ES6+.
- **Espaçamento e Indentação**: Padronização de indentação em 176 arquivos para melhorar a legibilidade do código-fonte.
- **Correção de Strings**: Ajuste de pequenos typos e padronização de maiúsculas/minúsculas em labels internas e mensagens de log técnico.
- **Remoção de Comentários**: Limpeza de trechos de código comentados (legacy snippets) que não eram mais necessários após a refatoração.

---
*Nota: Esta auditoria confirmou 176 arquivos alterados, garantindo que cada vírgula de lógica e estilo foi revisada meticulosamente.*
