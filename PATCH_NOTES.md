# Patch Notes - Eternal Idle

### 🏰 Guildas & Cooperação
- **Correção Geral no Painel**: Resolvidos erros técnicos que impediam a abertura do modal de edição da guilda e causavam instabilidades visuais.
- **Painel de Edição Centralizado**: O modal de customização da guilda agora aparece perfeitamente centralizado em todas as resoluções.
- **Sincronização de Estilo**: O avatar do jogador no topo da tela (header desktop) agora utiliza o mesmo padrão visual da lista de membros da guilda, com bordas suaves e melhor enquadramento do rosto.
- Fixed guild bonus display in Profile and Activity Modals, ensuring they are correctly applied and visible.
- Added Ironman indicator icon to the guild member list and pending applications.
- **Melhoria no Inventário**: Corrigido bug visual que exibia itens de comida e equipamentos como "[object Object]" no momento da contribuição de materiais.

- **Sincronização de Buffs**: Implementada atualização instantânea de bônus para todos os membros online quando uma estação da guilda (Gathering, Refining ou Crafting) recebe um upgrade.
- **Correção de Buffs Residuais**: Resolvido problema onde jogadores mantinham buffs de guilda mesmo após sair ou serem expulsos; agora os bônus são removidos imediatamente.
- **Internacionalização (I18N)**: Padronização completa de textos e botões para o Inglês em toda a interface da Guilda, eliminando termos inconsistentes.
- **Estabilidade de State**: Otimização na forma como o jogo lê as quantidades de itens complexos (objetos) no inventário para evitar falhas de cálculo em doações.
- **Correção de Keys**: Removidos avisos de "Duplicate Keys" no console do navegador relacionados às opções de cores da guilda.
- **Visualização de Bônus da Guilda**: Agora todos os bônus providos pelas estações da guilda (Skill Efficiency, XP Multiplier, Duplication/Auto-Refine) são exibidos corretamente no Perfil e nos modais de atividades.
    - [x] Exibir bônus da guilda na interface de Eficiência
    - [x] Integrar `guild_bonuses` no cálculo de eficiência do `ProfilePanel`
    - [x] Adicionar linha "Guild Bonus" no `StatBreakdownModal`
    - [x] Exibir chance de Duplicação e Auto-Refino no `ActivityModal`
- **Sincronização Server-Client**: Corrigida falha no envio de dados de bônus da guilda do servidor para o cliente, garantindo que os buffs apareçam sem necessidade de relogar.
