# Patch Notes - Eternal Idle

### 🏰 Lançamento Oficial: Guildas (Alpha)
- **Guildas Chegaram!**: O sistema de guildas agora está oficialmente acessível para todos através do menu lateral e do menu de Town no mobile.
- **Em Desenvolvimento**: Esta é uma versão inicial para testes (Alpha). Muitas novidades e conteúdos cooperativos ainda estão por vir!


### 🐛 Correção Crítica - Perda de Equipamento
- **Equipment Swap Fix**: Corrigido um bug crítico onde itens equipados eram **perdidos silenciosamente** ao trocar equipamento com o inventário cheio. O item antigo era removido do slot antes do novo ser retirado do inventário, causando falha na devolução por falta de espaço.
- **Ordem de Operações**: A lógica de troca agora remove o novo item do inventário **primeiro** (liberando espaço) e só depois devolve o item antigo, garantindo que nenhum item seja perdido.
- **Safety Check**: Adicionada verificação de segurança — se a devolução do item antigo ainda falhar, a operação é cancelada e o jogador recebe uma mensagem de erro em vez de perder o item.

### ⚔️ Combate, Dungeons & Bosses
- **Turnos de Combate**: Alterada a dinâmica de batalha inicial. Ao encontrar um monstro, ele agora causa o seu dano primeiro, e só então o ataque do jogador é processado.
- **Consumo de Comida**: Corrigido um bug onde jogadores ficavam tecnicamente imortais (a comida não era consumida) ao enfrentar monstros de dano muito baixo, como os Rabbits. O sistema agora consome a comida adequadamente mesmo em níveis muito baixos de dano.
- **Cooldown de Poção**: O indicador visual de recarga da poção na interface de combate foi alinhado com o tempo de recarga exato do servidor para evitar descompassos.

### 💰 Mercado & Inventário
- **Compras no Mercado**: Para prevenir compras acidentais grandes, a quantidade preenchida por padrão ao tentar comprar um item no Market agora é **1** em vez da quantidade máxima disponível ("MAX").
- **Restrições do Banco**: Itens armazenados no seu Banco pessoal não possuem mais os atalhos diretos para Equipar, Vender direto ao Vendor ou anunciar no Market. O jogador deve primeiro sacá-los para o inventário.
- **Correções de Interface**: Resolvidos bugs do painel de Mercado que quebravam a aba ao interagir com listagens sem leitura de qualidade (undefined qualityName).

### 🎯 QoL (Qualidade de Vida) & Correções
- **Daily Spin (Roleta)**: Implementada validação que impede girar a roleta com o inventário completamente cheio. Além disso, foi corrigido o erro visual de cálculo da roda que a fazia parar em prêmios incorretos na animação.

- **Restrição da Foice**: Resolvido o erro na interface que mencionava que o requisito de status para equipar e usar a Foice (Sickle) era a habilidade de Mining (Mineração). Agora indica Harvesting/Tool Crafter corretamente.


### ✨ Runas & Visuais
- **Rune Shards**: Simplificado o nome das Rune Shards para remover a indicação de Tier, mantendo a interface mais limpa.




