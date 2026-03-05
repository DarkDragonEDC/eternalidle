# Patch Notes - Eternal Idle

## v1.2.1

### 🔄 Troca & Inventário (Trade Panel)
- **Busca Avançada**: Agora o painel de troca aceita filtros por prefixo, assim como o mercado e o inventário (ex: `t:2` para tier, `r:rare` para raridade).
- **Filtros por Categoria**: Adicionados botões (Materiais, Craft, Consumíveis, Runas) para filtrar o inventário rapidamente durante uma troca.
- **Nomes & Tiers**: Corrigido erro onde Tomos e Shards apareciam sem nome. Agora todos os itens exibem seu Tier no nome (ex: [T3] Steel Sword) para evitar confusões.

### �️ UI & UX Improvements
- **Grid de Equipamentos**: Reorganização dos slots no perfil para melhor usabilidade. O espaço da arma (**Weapon**) agora fica na linha central, ao lado do **Off-hand**, facilitando a visualização dos itens de combate.

### �💰 Orb Shop
- **Correção de Saldo**: Resolvido o problema onde o saldo de Orbs aparecia como "0" dentro da loja premium.

### 🛠️ Ajustes Técnicos
- **Precisão no Crafting**: Corrigido um erro no cálculo de quantidade máxima que impedia a criação do número exato de itens em certas situações.
- **Chance de Crítico**: Corrigido erro visual onde o bônus de poções exibia **0.01%** em vez de **1%**.
- **Filtros do Inventário**: Corrigido erro onde a seleção manual de ordenação era ignorada quando o "Auto-Sort" estava ativo. Também corrigida a ordenação por "Data" ao visualizar o Banco.
- **Interface de Atividade**: Corrigido erro onde o progresso de criação de um único item aparecia como "1/2" e travava em 100%.
- **Daily Spin**: Corrigido erro visual na mensagem de "CONGRATULATIONS!" que quebrava linha indevidamente em telas menores.
- **Rune Shards**: Removida a indicação de Tier (ex: T1, T2) das Rune Shards em baús e recompensas, mantendo apenas o nome "Rune Shard" por clareza.
- **Interface de Combate**: Adicionado o tempo de "Survival" (Sobrevivência) ao cabeçalho da tela de combate e aos cards individuais de monstros. O tempo agora é limitado pelo tempo máximo de idle (8h ou 12h para membros), exibindo um "+" quando o limite é atingido (ex: 8h+, 12h+).
- **Runas de Woodcutting**: Adicionados novos ícones para "Woodcutting Rune of Duplication" e "Woodcutting Rune of Auto-Refine" em todos os tiers. Os arquivos foram otimizados para o formato WebP.

### 🗺️ Dungeons & Combat
- **Mapas de Dungeon**: Drop rate de mapas de dungeon padronizado em **3%** para todos os monstros, em todos os tiers de combate.
- **Balanceamento de Dano**: Ajustado o dano de monstros Tier 2 ou superior (T2+) para ser 3x maior, corrigindo a progressão de dificuldade entre os mapas.

