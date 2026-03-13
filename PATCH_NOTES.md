# 📄 Auditoria Completa de Mudanças - Hotfix (v1.4.8)

### 📈 Estatísticas e Sistema
- **Contagem de Jogadores Online**: Reformulada para mostrar todos os jogadores com atividades ativas (Coleta, Combate ou Dungeons). Agora o contador reflete o progresso real da comunidade, incluindo jogadores avançando offline.

### 💰 Orb Shop & Pagamentos
- **Correção Stripe**: Resolvido o problema de redirecionamento ao clicar em comprar. O sistema agora processa corretamente o link de checkout enviado pelo servidor.

---

# 📄 Auditoria Completa de Mudanças - Main vs Homolog (v1.4.7)

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

### ⚙️ Infraestrutura e Escalabilidade
- **Reestruturação Completa**: Todo o código do front-end e do back-end foi refeito para melhorar significativamente a escalabilidade e a manutenabilidade do jogo.

### 🐛 Correções de Bugs
- **Busca de Jogadores (Trade)**: Resolvido o erro de SQL `column characters.level does not exist`. Agora os níveis são calculados corretamente para todos os personagens encontrados.
- **Combate Offline (Catchup)**: Corrigida a falha onde o tempo de sobrevivência e o consumo de comida não diminuíam corretamente durante o período offline. Agora o dano recebido é processado de forma consistente.
- **Painel Social**: Resolvido o erro `ReferenceError: searchResults is not defined` e corrigidas as funções de busca de jogadores e amigos que apresentavam falhas.
- **Convite de Troca (Trade Invite)**: Corrigida a funcionalidade do botão "INVITE" que não respondia. Implementados todos os handlers de servidor necessários para o fluxo completo de trocas (convidar, ingressar, atualizar oferta, aceitar e cancelar).
- **Erro de Referência**: Corrigido o erro `ReferenceError: startActivity is not defined` que ocorria ao tentar coletar recursos através do modal de atividade.
- **Ranking e Estabilidade**: 
    - Corrigido o crash no componente de ranking através da unificação do tratamento de eventos de socket.
    - Implementada proteção contra recarregamento infinito no painel de ranking.
    - Adicionadas verificações de segurança no modal de classificação para garantir maior estabilidade.

---
> [!IMPORTANT]
> **Aviso da Equipe de Desenvolvimento**: Como realizamos uma reestruturação profunda em quase todos os sistemas do jogo, é possível que algumas alterações menores não tenham sido listadas nestas notas. 
> 
> Contamos com a sua ajuda para identificar possíveis erros, bugs ou sugestões de melhoria. Caso encontre algo, por favor, reporte nos canais oficiais! 🚀

*Nota: Esta atualização reflete uma auditoria completa de 176 arquivos modificados entre as branches main e homolog. [ID: 174.7-FINAL]*

<!-- Audit Timestamp: 2026-03-12 21:52:00 -->
