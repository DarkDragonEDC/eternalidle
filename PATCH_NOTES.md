# Patch Notes - Eternal Idle

## v1.4.5

### ⚔️ Balanceamento de Equipamentos
- **Restauração do HP**: O atributo HP foi restaurado em todas as peças de armadura (Peitoral, Elmo, Botas e Luvas) para todas as classes.
- **Remoção de Atributos Obsoletos**: Os atributos STR, AGI e INT foram removidos definitivamente de todos os equipamentos.
- **Sincronização entre Classes**: Todos os equipamentos agora seguem a mesma progressão de poder entre Guerreiro, Mago e Caçador.
- **Ajuste de HP**: Aumento de +2 HP no T10 Masterpiece do Peitoral (Plate/Cloth/Leather Armor).

### 🔧 Correções
- **Correção Crítica de Progresso Offline**: Corrigido um bug grave onde jogadores que deixavam o jogo rodando e iam dormir perdiam horas de progresso. O servidor estava avançando indevidamente o relógio de persistência sem processar as ações de coleta/combate, fazendo com que ao reconectar o jogador visse apenas alguns minutos de progresso ao invés de várias horas.

---

### 🛒 Mercado & Trocas
- **Itens de Qualidade em Ordens de Compra**: Corrigido um bug onde o mercado não reconhecia a qualidade de itens excelentes (ex: `T3_FISHING_ROD_Q3`) ao preencher ordens de compra, resultando no erro "Item quality mismatch". O sistema agora identifica corretamente a qualidade tanto pelos metadados quanto pelo nome do item.

### 📊 Interface & Habilidades
- **Legibilidade de Itens**: Removemos todos os "underscores" (ex: `COPPER_ORE`) dos nomes de itens e categorias do jogo, substituindo por espaços (ex: `Copper Ore`). A interface inteira agora usa nomes mais limpos e capitalizados corretamente.
- **Atributo de Velocidade**: O atributo "Speed" nas telas de Crafting e de Informações de Itens agora exibe corretamente o símbolo de porcentagem (ex: `1.5% SPD`), deixando claro que se trata de um bônus percentual.
- **Ícones Reais no Modal de Crafting**: O Modal de Probabilidade de Crafting agora carrega a imagem real do item sendo inspecionado no cabeçalho, além de remover nomes duplicados.

### 🏰 Guildas & Cooperação
- **Perfil da Guilda Completo**: Agora você pode clicar no nome de uma guilda na busca para ver o perfil dela.
- **Cargos Customizados**: Os nomes e cores dos cargos criados pelas guildas agora aparecem corretamente no perfil.
- **Ordenação de Membros**: A lista de membros agora prioriza o Líder no topo, seguido pelos membros com mais XP contribuído.
- **Correção de Avatares**: Resolvemos o problema de fotos cinzas ou quebradas no perfil da guilda, adicionando suporte a imagens `.webp` e ícones de reserva.

### ⚔️ Dungeons & Exploração
- **Segurança de Inventário**: Agora as dungeons e suas repetições param automaticamente se o seu inventário ficar cheio. Isso evita que você perca baús e recursos importantes por falta de espaço. Quando isso acontecer, você verá o status "COMPLETED (Inventory Full)" no seu histórico de dungeons.
