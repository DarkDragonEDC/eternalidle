# Patch Notes - Eternal Idle

### 🛒 Mercado & Trocas
- **Preço Automático no Buy Order**: Ao mudar a raridade ou estrelas na tela de criar Buy Order, o campo "Price per Unit" agora atualiza automaticamente para o valor correto do item (preço de venda rápida). Antes ficava travado em 1 Silver.
- **Itens Assinados em Buy Orders**: Corrigido um bug onde itens assinados (ex: `Fishing Rod::Eterno`) não eram reconhecidos ao preencher Buy Orders existentes, dando erro de "item não encontrado".
- **Sessão de Troca Duplicada**: Ao tentar trocar com alguém que já tem uma sessão de troca pendente, o jogo agora abre a troca existente ao invés de mostrar um erro.
- **Proteção contra Crash**: Adicionada proteção no sistema de trocas para evitar erros internos quando o personagem ainda não foi carregado.

### 📊 Interface & Habilidades
- **Header de Skill Sempre Visível**: A caixa de progresso de habilidade (Nível, XP, barra) agora aparece mesmo quando a skill está no nível 1 com 0 XP. Antes ela sumia completamente para skills que nunca foram treinadas.
### 🏰 Guildas & Cooperação
- **Custo para Edição**: Alterar o Nome da sua Guilda agora custa **250 Orbs**, e alterar a Tag custa **100 Orbs**.
- **Correção no Painel Geral**: Resolvemos erros técnicos que impediam as configurações da guilda de abrirem corretamente, além de resolver instabilidades visuais.
- **Painel de Edição Centralizado**: A janela de customização da guilda agora aparece perfeitamente centralizada em qualquer resolução de tela (PC ou Celular).
- **Estilo Sincronizado**: O avatar do jogador no topo da tela (PC) agora segue o mesmo formato visual da lista de membros da guilda, com bordas suaves e melhor enquadramento do rosto.
- **Correção no Inventário**: Corrigimos um erro visual bizarro onde comidas e equipamentos apareciam como "[object Object]" durante as doações de materiais para a guilda.
- **Sincronia Rápida de Bônus**: Agora as atualizações de bônus (Coleta, Refino ou Forja) valem instantaneamente para todos os membros online quando uma estação da guilda sobe de nível.
- **Sem Bônus Residuais**: Resolvemos o problema em que jogadores mantinham os bônus da guilda mesmo após saírem ou serem expulsos. Os bônus agora somem na mesma hora.
- **Padronização de Idioma**: Todos os textos e botões relacionados às guildas foram revisados e padronizados para Inglês.
- **Estabilidade no Sistema**: Melhoramos a forma como o jogo lê grandes quantidades de itens no seu inventário, evitando travamentos ao doar.
- **Remoção de Alertas Internos**: Removemos avisos chatos ("Duplicate Keys") que ficavam poluindo o código relacionados à seleção de cores da guilda.
- **Visualização de Bônus da Guilda**: Todos os bônus dados ativamente pela guilda (Eficiência em Habilidades, Multiplicador de XP, Duplicação de Itens / Auto-Refino) aparecem corretamente listados no seu Perfil e nas janelas de Atividades.
- **Sincronia Servidor-Cliente**: Consertamos o erro em que os bônus da guilda não eram enviados ao jogo, garantindo que os buffs aparecem sem você precisar deslogar e logar de novo.

### ⚔️ Combate & Personagens
- **Aviso de Ironman**: Jogadores do modo Ironman agora exibem um ícone de Escudo no canto superior esquerdo de suas fotos de perfil na lista de membros da guilda e nas candidaturas pendentes.

### 📊 Dados & Análises (Sistemas)
- **Tabela de Proficiência**: Criamos uma tabela completa de balanceamento de atributos (Dano, HP, Defesa, Velocidade de Movimento) para os Níveis de Proficiência do 1 ao 100 para Arqueiros, Magos e Guerreiros.
- **Tabela de Runas de Velocidade de Ataque**: Uma nova tabela detalhada cobrindo todos os bônus possíveis de Runas de Attack Speed do Tier 1 ao 10, de 1 a 3 estrelas.
- **Estatísticas de Equipamento**: Completamos a tabela de todos os equipamentos de combate do jogo, do Tier 1 ao 10, com estatísticas baseadas em todas as Raridades (Normal até Masterpiece).
