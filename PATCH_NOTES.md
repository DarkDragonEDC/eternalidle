# Patch Notes - Eternal Idle

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
