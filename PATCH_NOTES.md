# 📄 Patch Notes — v1.6.8 — Grande Atualização: Vila, Missões e World Boss 2.0

> Versão: **Client 1.6.8 | Server 1.6.8**
> Esta atualização é a maior da história do Eternal Idle, com mudanças em praticamente todos os sistemas do jogo!

---

## 🗺️ NOVA FUNCIONALIDADE: Vila de Aventura
Uma nova página com NPCs interativos e sistema de progressão narrativa.

- Nova aba **"Village"** na barra lateral.
- Grid de NPCs interativos, cada um com retrato, nome e descrição.
- Indicadores visuais de status em cada NPC:
  - 🟢 **Pronto** — missão disponível (borda pulsante verde).
  - 🔒 **Bloqueado** — requisitos não atingidos (overlay escuro com cadeado).
  - ✅ **Completo** — todas as missões do NPC finalizadas.
- Ao clicar em um NPC, abre-se um diálogo com suas missões disponíveis.

---

## 📜 NOVO SISTEMA: Quests (Missões)

### NPCs e Missões
- **5 NPCs** com histórias e missões encadeadas:
  - **Elder** (5 quests): Tutorial — abrir chest, escolher arma, equipar comida, falar com Elara.
  - **Elara** (4 quests): Equipar vara, pescar, cozinhar, coletar recursos da sua classe.
  - **Grog** (3 quests): Refinar, forjar armadura, equipar gear.
  - **Theron** (4 quests): Desafiar World Boss, forjar runa, fundir runa, equipar runa.
  - **Bryn** (3 quests): Matar coelhos, goblins e javalis.
- **16 quests** no total com progressão sequencial.
- Recompensas variadas: Silver, XP, itens e gear de classe.
- Botão **"Ir"** em cada quest redireciona direto ao local necessário.

### Rastreador de Quests
- Widget de quests ativas visível no header global.
- Barra de progresso em tempo real.
- Destaque dourado pulsante quando uma quest está pronta para reclamar.
- Botão **"Ir"** para navegar direto ao objetivo da quest.

---

## 🐉 WORLD BOSS 2.0 — Sistema Dual (Daily + Window)

O sistema de World Boss foi completamente reescrito para suportar **dois tipos simultâneos**:

### Boss Diário (Daily Boss)
- **The Celestial Ravager** (antes "The Ancient Dragon") — ciclo de 24h.
- Disponível de 00:00 UTC até 23:50 UTC.
- Sem HP — jogadores competem por ranking de dano.
- Recompensa baseada em milestone de dano (T1-T10 WB Chests).

### Boss de Janela (Window Boss — Novo!)
- Boss rotativo aleatório com ciclo de **8 horas** (3 janelas por dia).
- Boss com **HP real** que pode ser reduzido coletivamente por todos os jogadores!
- 10 tiers de boss com nomes únicos:
  - T1: **Void Slime Monarch** (500K HP)
  - T2: **Ancient Arbor Sentinel** (1.5M HP)
  - T3: **Obsidian Dune Stalker** (2.5M HP)
  - T4: **The Frost Sovereign** (3.5M HP)
  - T5: **The Ethereal Predator** (4.5M HP)
  - T6: **Chaos Entity X-0** (5.5M HP)
  - T7: **Ancient Arcanist Golem** (6.5M HP)
  - T8: **The Infernal Dreadknight** (7.5M HP)
  - T9: **Soul-Stalker of the Abyss** (8.5M HP)
  - T10: **The Primordial Star-Eater** (9.5M HP)
- Boss pode ser **derrotado** coletivamente → recompensa especial: **Enhancement Chest**.
- Anúncio global no chat quando o boss é derrotado!

### Painel do World Boss — Melhorias
- Novas abas: **BOSS** e **REWARDS**.
- Aba **BOSS**: exibe boss ativo, ranking ao vivo e botão de ataque.
- Aba **REWARDS**: lista todas as recompensas pendentes de sessões anteriores.
- Botão de informações (ℹ️) com guia completo do boss (horários, mecânicas, recompensas).
- Sub-abas **Boss Info** e **History** — veja as últimas 3 sessões de Window Boss e seus rankings.
- Barra de HP em tempo real mostrando o HP atual do boss (ex: `2.4M / 2.5M`).
- Ranking com medalhas animadas (Ouro 🥇, Prata 🥈, Bronze 🥉).
- Badge numérico de recompensas pendentes na aba REWARDS.

### Combate contra World Boss — Melhorias
- Nova UI de combate com floaters de dano escalonados.
- Barra de saúde do boss animada com gradiente dinâmico.
- Backgrounds dinâmicos baseados no tier do boss.
- Tela de "Combat Finished" melhorada: mostra dano final, posição no ranking e tempo restante.
- Notificação push quando o World Boss aparece (com nome e tier).

---

## 🔨 NOVO SISTEMA: Aprimoramento de Equipamentos (Enhancement)

### Enhancement Stones (Pedras de Aprimoramento)
- **21 tipos de Enhancement Stones** adicionadas (7 slots × 3 classes: Warrior, Hunter, Mage).
- Cada pedra é específica para uma classe e slot de equipamento.
- Preço de venda: **10.000 Silver** cada.

### Enhancement Chest (Novo Item)
- Ao abrir, dropa uma pedra de enhancement aleatória entre os 21 tipos.
- Obtida como recompensa ao derrotar o Window Boss coletivamente.

### Como funciona o Enhancement
- Equipamentos de combate (arma, off-hand, armadura, elmo, botas, luvas, capa) podem ser aprimorados.
- A pedra de enhancement deve corresponder à **classe** e ao **slot** do item.
- **Limites de enhancement por tier**:
  - T1-T3: até +5
  - T4-T6: até +10
  - T7-T9: até +15
  - T10: até +20
- **Custo por enhancement**:
  - Silver: `Tier × 1.000 × (Nível Atual + 1)`
  - Pedras: T1-T6 = 1 pedra, T7-T9 = 2 pedras, T10 = 3 pedras
- **Bônus**: +2% em **todos** os atributos por nível de enhancement.
- Item Power (IP) também é aumentado pelo enhancement.

### Interface de Enhancement
- Nova tela de aprimoramento acessível pelo inventário (botão "Enhance" nos itens elegíveis).
- Preview de stats antes e depois do enhancement.
- Exibição do custo de silver e pedras necessárias.
- Botão desabilitado se os requisitos não forem atendidos.
- Nível de enhancement (+X) visível em todos os painéis: inventário, perfil, inspeção e seleção de equipamento.

---

## 🖥️ Melhorias de Interface

### Perfil e Stats
- Nível de enhancement (+X) exibido nos slots de equipamento do perfil.
- Cálculo de stats com itens enhanced corrigido e mais preciso.
- Breakdown detalhado de stats por fonte (base, qualidade, enhancement, runas).

### Mercado
- **Busca avançada**: agora busca por múltiplas palavras e suporta busca por tier (ex: "T1", "T10").
- Melhorias visuais de consistência nos botões.

### Noob Chest
- Descrição atualizada: *"Choose your path! Contains: T1 Sword, T1 Bow, T1 Staff, and 100x T1 Food."*

### Guild — Tarefas
- Geração de tarefas da guild reformulada:
  - 1 tarefa por material bruto.
  - 1 tarefa por material refinado.
  - 1 tarefa de comida.
  - 1 tarefa de poção.
  - Mais previsível e variado do que o sistema anterior.

---

## 🔧 Correções de Bugs
- **Chest consumido duas vezes**: Corrigido bug onde chests eram consumidos em duplicidade ao abrir.
- **Enhancement perdido ao desequipar**: Enhancement e outros metadados agora são preservados ao desequipar e re-equipar itens.
- **Stats de itens enhanced incorretos**: Cálculo de stats agora considera corretamente o nível de enhancement dos itens equipados.
- **Proteção contra wipe de inventário**: Sistema de segurança adicionado para prevenir perda de inventário durante salvamentos.
- **Fights abandonados de World Boss**: Combates abandonados são automaticamente finalizados após timeout.
- **Posição no ranking**: Algoritmo de predição de posição corrigido para considerar tipo de boss (daily/window).
- **Servidor mais estável**: VAPID keys inválidas não crasham mais o servidor.

---

## 🔄 Outras Melhorias
- Performance geral do servidor melhorada.
- Logs de debug removidos para produção (jogo mais leve).
- Seleção de personagem agora faz reconexão limpa ao servidor.
- Comentários internos do código traduzidos para inglês (preparação para futuras contribuições).
