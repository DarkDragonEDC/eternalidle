# Patch Notes - Eternal Idle

## v1.4.4

### ⚔️ Balanceamento de Equipamentos
- **Restauração do HP**: O atributo HP foi restaurado em todas as peças de armadura (Peitoral, Elmo, Botas e Luvas) para todas as classes.
- **Remoção de Atributos Obsoletos**: Os atributos STR, AGI e INT foram removidos definitivamente de todos os equipamentos.
- **Sincronização entre Classes**: Todos os equipamentos agora seguem a mesma progressão de poder entre Guerreiro, Mago e Caçador.
- **Ajuste de HP**: Aumento de +2 HP no T10 Masterpiece do Peitoral (Plate/Cloth/Leather Armor).

### 🔧 Correções
- **Correção Crítica de Progresso Offline**: Corrigido um bug grave onde jogadores que deixavam o jogo rodando e iam dormir perdiam horas de progresso. O servidor estava avançando indevidamente o relógio de persistência sem processar as ações de coleta/combate, fazendo com que ao reconectar o jogador visse apenas alguns minutos de progresso ao invés de várias horas.

---

### 🛒 Mercado & Trocas
- **Preço Automático no Buy Order**: Ao mudar a raridade ou estrelas na tela de criar Buy Order, o campo "Price per Unit" agora atualiza automaticamente para o valor correto do item (preço de venda rápida). Antes ficava travado em 1 Silver.
- **Itens Assinados em Buy Orders**: Corrigido um bug onde itens assinados (ex: `Fishing Rod::Eterno`) não eram reconhecidos ao preencher Buy Orders existentes, dando erro de "item não encontrado".
- **Itens de Qualidade em Ordens de Compra**: Corrigido um bug onde o mercado não reconhecia a qualidade de itens excelentes (ex: `T3_FISHING_ROD_Q3`) ao preencher ordens de compra, resultando no erro "Item quality mismatch". O sistema agora identifica corretamente a qualidade tanto pelos metadados quanto pelo nome do item.
- **Sessão de Troca Duplicada**: Ao tentar trocar com alguém que já tem uma sessão de troca pendente, o jogo agora abre a troca existente ao invés de mostrar um erro.
- **Proteção contra Crash**: Adicionada proteção no sistema de trocas para evitar erros internos quando o personagem ainda não foi carregado.

### 📊 Interface & Habilidades
- **Header de Skill Sempre Visível**: A caixa de progresso de habilidade (Nível, XP, barra) agora aparece mesmo quando a skill está no nível 1 com 0 XP. Antes ela sumia completamente para skills que nunca foram treinadas.
- **Melhoria no Social**: Refatoramos o menu Social para uma navegação mais limpa e intuitiva entre Amigos e Trocas.

### 🏰 Guildas & Cooperação
- **Custo para Edição**: Alterar o Nome da sua Guilda agora custa **250 Orbs**, e alterar a Tag custa **100 Orbs**.
- **Correção no Painel Geral**: Resolvemos erros técnicos que impediam as configurações da guilda de abrirem corretamente, além de resolver instabilidades visuais.
- **Painel de Edição Centralizado**: A janela de customização da guilda agora aparece perfeitamente centralizada em qualquer resolução de tela (PC ou Celular).
- **Correção no Inventário**: Corrigimos um erro visual bizarro onde comidas e equipamentos apareciam como "[object Object]" durante as doações de materiais para a guilda.
- **Sincronia Rápida de Bônus**: Agora as atualizações de bônus (Coleta, Refino ou Forja) valem instantaneamente para todos os membros online quando uma estação da guilda sobe de nível.
- **Sem Bônus Residuais**: Resolvemos o problema em que jogadores mantinham os bônus da guilda mesmo após saírem ou serem expulsos. Os bônus agora somem na mesma hora.
- **Estabilidade no Sistema**: Melhoramos a forma como o jogo lê grandes quantidades de itens no seu inventário, evitando travamentos ao doar.
- **Remoção de Alertas Internos**: Removemos avisos chatos ("Duplicate Keys") que ficavam poluindo o código relacionados à seleção de cores da guilda.
- **Visualização de Bônus da Guilda**: Todos os bônus dados ativamente pela guilda (Eficiência em Habilidades, Multiplicador de XP, Duplicação de Itens / Auto-Refino) aparecem corretamente listados no seu Perfil e nas janelas de Atividades.
- **Sincronia Servidor-Cliente**: Consertamos o erro em que os bônus da guilda não eram enviados ao jogo, garantindo que os buffs aparecem sem você precisar deslogar e logar de novo.
- **Perfil da Guilda Completo**: Agora você pode clicar no nome de uma guilda na busca para ver o perfil dela.
- **Cargos Customizados**: Os nomes e cores dos cargos criados pelas guildas agora aparecem corretamente no perfil.
- **Ordenação de Membros**: A lista de membros agora prioriza o Líder no topo, seguido pelos membros com mais XP contribuído.
- **Correção de Avatares**: Resolvemos o problema de fotos cinzas ou quebradas no perfil da guilda, adicionando suporte a imagens `.webp` e ícones de reserva.
- **Perfil de Guilda no Ranking**: Agora você pode clicar em qualquer guilda no Ranking para abrir um modal com o perfil detalhado dela.
- **Contribuidores de Tarefas**: Agora você pode ver exatamente quem doou e quanto cada um contribuiu para as Tarefas Diárias da Guilda. Basta clicar no ícone de seta no card de cada missão para abrir a lista detalhada.
- **Lista Ordenada**: A lista de contribuidores mostra os jogadores que mais ajudaram no topo, facilitando o reconhecimento dos membros mais ativos.

### ⚔️ Combate & Personagens
- **Aviso de Ironman**: Jogadores do modo Ironman agora exibem um ícone de Escudo no canto superior esquerdo de suas fotos de perfil na lista de membros da guilda e nas candidaturas pendentes.
- **Foto no Combate**: Sua foto de perfil agora é exibida também na interface de combate.
- **Guilda no Perfil**: Agora o nome da sua guilda aparece em destaque no seu perfil e no de outros jogadores.
