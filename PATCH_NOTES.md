# Patch Notes - Eternal Idle

## v1.3.5

### 🏰 Gestão de Guilda: Guild Hall & Bank
- **Guild Hall**: Novo sistema de níveis para a sede da guilda. Aumente o nível do seu Guild Hall para expandir o limite máximo de membros (até 30).
- **Guild Bank**: Implementado o Banco da Guilda para armazenamento compartilhado.
    - **Depósitos**: Membros agora podem doar Prata e recursos de coleta (T1-T10) diretamente para o banco.
    - **Upgrade por Banco**: As melhorias do Guild Hall agora consomem recursos (Prata e Materiais) diretamente do saldo do Banco da Guilda, incentivando a cooperação entre os membros.
- **Transparência**: Adicionada a exibição de quantidades exatas (ex: 50.000 em vez de 50k) em todas as abas do banco para melhor precisão.
- **Identificação Visual**: Itens no banco agora exibem claramente seu Tier (T1-T10) no nome para facilitar a gestão.

### 📱 Otimização Mobile (AAA)
- **Interface Responsiva**: Todo o painel de Guilda (Membros, Building e Bank) foi redesenhado para dispositivos móveis.
- **Grids de 2 Colunas**: Requisitos de upgrade e inventário do banco agora usam um layout de duas colunas no mobile, aproveitando melhor o espaço vertical.
- **Formulários Empilhados**: O sistema de doação foi otimizado com campos empilhados, facilitando o preenchimento e clique em telas menores.
- **Cards Compactos**: Ícones, fontes e espaçamentos foram reduzidos no mobile para garantir uma navegação fluida e sem excesso de scroll.

### ⚙️ Ajustes e Correções
- **Aba Padrão**: A aba "Home" (Membros) voltou a ser a aba principal e padrão ao abrir o painel da guilda.
- **Botões MAX**: Adicionados botões de "MAX" nos campos de doação de Prata e Itens.
- **Correção de Upgrade**: Corrigido um erro de "Invalid building type" que impedia o upgrade de construções em certas condições.
- **Versão 1.3.5**: Atualização obrigatória para sincronia de novos sistemas de construção e banco.

---

## v1.3.4

### 🛡️ Guildas - Novos Rankings e XP
- **Ranking de XP Total**: Adicionada uma nova aba no menu de membros que mostra o total de XP que cada jogador contribuiu para a guilda. 
- **Ranking de XP Diário**: Agora é possível ver a média de contribuição diária de cada membro (XP Total dividido pelos dias na guilda), facilitando a identificação dos jogadores mais ativos.
- **Ordenação por Data**: Adicionada a opção de ordenar membros pela data de entrada, mostrando quem está há mais tempo na guilda.
- **Rastreamento Individual**: O XP da guilda agora é rastreado individualmente por jogador, sendo consolidado a cada 30 minutos junto com o XP total da guilda.
- **Ajuste de Visual**: A cor customizada da guilda agora é aplicada dinamicamente aos botões e elementos de destaque no painel de membros.

### ⚙️ Sistema e Sincronização
- **Correção de Chat da Guilda**: Implementada sincronização automática de `guild_id` para membros. Isso resolve o erro "You must be in a guild" que ocorria para alguns membros.
- **Entrada em Guildas**: Jogadores que entram em guildas abertas agora têm seu acesso ao chat liberado instantaneamente.
- [Dungeon] Corrigido travamento ao final de runs repetidas (1s left).
- [Dungeon] Corrigido erro onde o consumo de silver e food não era salvo em runs da fila.
- [Dungeon] Removido sistema de Waves (Ondas) de todo o simulador e interface.
- [Dungeon] Interface otimizada e compactada para melhor performance em telas 1080p.
- [Chat] Corrigida sincronização de Guild ID para usuários que usam o chat pela primeira vez.
- [Chat] Removido aviso de chaves duplicadas no console e mensagens repetidas.
- **Versão 1.3.4**: Atualização obrigatória de versão para garantir a sincronia entre cliente e servidor.

---

## v1.3.3

### 🛡️ Guildas - Seleção de País
- **Bandeiras Visuais**: Substituída a exibição de siglas de países por bandeiras reais (imagens), garantindo renderização correta em todos os sistemas operacionais.
- **Seletor Centralizado**: O seletor de país agora abre como um modal centralizado na tela com fundo desfocado, em vez de um dropdown simples.
- **Layout em 3 Colunas**: O grid de países foi ajustado para 3 colunas com ícones dimensionados para evitar scroll horizontal.

### 🏰 Preview da Guilda
- **Preview Fiel**: O preview de criação de guilda agora é idêntico ao card exibido nos resultados de busca — incluindo ícone, nome, bandeira, tag, nível, resumo e botão JOIN.
- **Contador de Membros**: Adicionada a contagem de membros (ex: "1/10") ao lado do botão JOIN, tanto no preview quanto nos resultados de busca.

### 🛒 Mercado
- **Filtro de Equipamentos**: Corrigido um bug onde ferramentas (Picareta, Machado, Faca, Foice, Vara de Pesca) não apareciam ao filtrar por "Equipment" no Marketplace. O filtro agora reconhece todos os subtipos de ferramentas.

---

## v1.3.2

### 🎁 Dungeon Chests & Loots
- **Drop de Crests**: Aumentada significativamente a chance de obter "Crest" ao abrir baús de Dungeon. As novas chances são escalonadas por raridade:
    - **Normal**: 2%
    - **Good**: 4%
    - **Outstanding**: 8%
    - **Excellent**: 13%
    - **Masterpiece**: 20%

### ⚒️ Crafting de Equipamentos & Ferramentas
- **Raridade Escalonada**: Implementado o sistema de chances de qualidade baseada no Tier do item para Weapons, Armor e Tools.
    - Quanto maior o Tier, mais difícil é obter qualidades superiores (Good, Outstanding, Excellent, Masterpiece).
    - As chances base são multiplicadas pelo seu bônus de "Quality Chance" de equipamentos e consumíveis.
    - **Tier 1**: Normal (44.4%), Good (30%), Outstanding (14.4%), Excellent (9.8%), Masterpiece (1.4%).
    - **Tier 10**: Normal (75%), Good (20%), Outstanding (4.5%), Excellent (0.45%), Masterpiece (0.05%).
    - A tabela completa de Tiers 1-10 foi revisada e validada conforme as especificações.



## v1.3.1

### ⚖️ Rebalanceamento de Dungeons
- **Cálculo de Sobrevivência**: O painel de Dungeon agora exibe previsões de sobrevivência baseadas na lógica real do servidor, incluindo o intervalo de 5 segundos entre o uso de comidas.
- **Dano de Monstros**: Rebalanceamento completo de todos os 50 monstros exclusivos de Dungeon. O dano agora é escalonado para que um jogador com set "Outstanding" do tier correspondente consuma cerca de 10 comidas por run.
- **Precisão da UI**: Removidos multiplicadores de dano desatualizados da interface, garantindo que o "DMG/RUN" exibido seja o que realmente acontece no combate.

## v1.3.0

### 🛡️ Novo Sistema de Guildas
- **Fundação**: Agora você pode criar sua própria guilda! Escolha um nome (3-15 chars), uma tag (2-4 chars), ícone e cor.
- **Custos**: Fundação custa 500k de Prata ou 100 Orbes.
- **Dashboard AAA**: Uma interface premium totalmente nova para gerenciar sua guilda, com efeitos de vidro (glassmorphism), glows dinâmicos e progresso de nível.
- **Lista de Membros**: Acompanhe quem está online em tempo real com indicadores pulsantes e cargos destacados (Líder, Oficial, Membro).
- **Limite Inicial**: Guildas começam com um limite de 10 membros.

### ⛺ Melhorias de UX
- **Rest Camp**: O botão do Acampamento de Descanso foi movido para cima da Aventura no Hub de Combate mobile, facilitando o acesso rápido para cura.

---


## v1.2.2

### 🔄 Interface & Trade
- **Filtro de Troca**: Corrigido um bug onde Tomos e outros equipamentos (Escudos, Ferramentas) não apareciam no filtro de "Craft" do painel de trocas.
- **Consumíveis**: Mapas de Dungeon agora aparecem corretamente no filtro de consumíveis nas trocas.

### ⚔️ Combate & Survival
- **Status de Survival**: Adicionada a estimativa de sobrevivência no cabeçalho de combate e nos cards de monstros.
- **Limite de Idle**: O tempo de survival agora respeita o limite de idle (8h/12h), exibindo um "+" quando o limite é atingido.

### ✨ Runas & Visuais
- **Ícones de Woodcutting**: Adicionados novos ícones otimizados em WebP para as runas de "Duplication" e "Auto-Refine" de Woodcutting em todos os tiers.
- **Rune Shards**: Simplificado o nome das Rune Shards para remover a indicação de Tier, mantendo a interface mais limpa.

### �️ Navegação & Sistema
- **Deep Linking**: Implementado sistema de rotas (URL). Agora você pode acessar abas diretamente via link (ex: `/market`, `/inventory`) e usar os botões de voltar/avançar do navegador.
- **Aba de Guild**: Adicionado botão de Guild na Sidebar e na visão de Cidade (Town) no mobile. Uma tela de "Em Breve" com visual premium foi implementada para marcar o início do desenvolvimento do sistema social avançado.

### 🛠️ Correções Gerais
- **Daily Spin**: Corrigida a quebra de linha na mensagem de vitória para telas menores.
- **Drops de Dungeon**: Corrigido um erro onde monstros de tier alto (ex: T4, T7) dropavam mapas T1. Agora todos os monstros dropam mapas referentes ao seu próprio tier com a chance de 3%.
- **Ordenação**: Correção na persistência da ordenação do inventário quando o "Auto-Sort" está ativo.
