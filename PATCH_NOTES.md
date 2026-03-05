# Patch Notes - Eternal Idle

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
