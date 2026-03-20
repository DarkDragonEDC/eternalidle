# 📄 Patch Notes — v1.6.8 — Grande Atualização: Vila, Missões e World Boss 2.0

> Versão: **1.6.8**

---

## 🗺️ NOVA FUNCIONALIDADE: Vila de Aventura
Uma nova página com NPCs interativos e sistema de progressão narrativa.

- Nova aba **"Village"**.
- Grid de NPCs interativos.
- Indicadores visuais de status em cada NPC:
  - 🟢 **Pronto** — missão disponível (borda pulsante verde).
  - 🔒 **Bloqueado** — requisitos não atingidos (overlay escuro com cadeado).
- Ao clicar em um NPC, abre-se um diálogo com suas missões disponíveis.

---

## 📜 NOVO SISTEMA: Quests (Missões)

### NPCs e Missões
- **5 NPCs** com histórias e missões encadeadas:
  - **Elder** (5 quests)
  - **Elara** (4 quests)
  - **Grog** (3 quests)
  - **Theron** (4 quests)
  - **Bryn** (3 quests)
- **16 quests** no total com progressão sequencial.
- Recompensas variadas: Silver, XP, itens e gear de classe.

## 🐉 WORLD BOSS 2.0 — Sistema Dual (Daily + Window)

O sistema de World Boss foi completamente reescrito**:

### Boss Diário (Daily Boss)
- **The Celestial Ravager** (antes "The Ancient Dragon") — ciclo de 24h.
- Disponível de 00:00 UTC até 23:50 UTC.
- Sem HP — jogadores competem por ranking de dano.
- Recompensa baseada em milestone de dano (T1-T10 WB Chests).

### Boss de Janela (Window Boss — Novo!)
- Boss rotativo aleatório com ciclo de **8 horas** (3 janelas por dia).
- Boss com **HP real** que pode ser reduzido coletivamente por todos os jogadores!
- 10 tiers de boss com nomes únicos:
  - T1: **Void Slime Monarch** 
  - T2: **Ancient Arbor Sentinel** 
  - T3: **Obsidian Dune Stalker** 
  - T4: **The Frost Sovereign** 
  - T5: **The Ethereal Predator** 
  - T6: **Chaos Entity X-0** 
  - T7: **Ancient Arcanist Golem** 
  - T8: **The Infernal Dreadknight** 
  - T9: **Soul-Stalker of the Abyss** 
  - T10: **The Primordial Star-Eater** 
- Boss pode ser **derrotado** coletivamente → recompensa especial: **Enhancement Chest**.

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

---

## 🔨 NOVO SISTEMA: Aprimoramento de Equipamentos (Enhancement)

### Enhancement Stones (Pedras de Aprimoramento)
- **21 tipos de Enhancement Stones** adicionadas (7 slots × 3 classes: Warrior, Hunter, Mage).
- Cada pedra é específica para uma classe e slot de equipamento.

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

### Interface de Enhancement
- Nova tela de aprimoramento acessível pelo inventário (botão "Enhance" nos itens elegíveis).
- Preview de stats antes e depois do enhancement.
- Exibição do custo de silver e pedras necessárias.
- Nível de enhancement (+X) visível em todos os painéis: inventário, perfil, inspeção e seleção de equipamento.

---

## 🖥️ Melhorias de Interface

### Perfil e Stats
- Nível de enhancement (+X) exibido nos slots de equipamento do perfil.
- Cálculo de stats com itens enhanced corrigido e mais preciso.
- Breakdown detalhado de stats por fonte (base, qualidade, enhancement, runas).


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
- **Proteção contra wipe de inventário**: Sistema de segurança adicionado para prevenir perda de inventário durante salvamentos.
- **Servidor mais estável**: VAPID keys inválidas não crasham mais o servidor.

---

## 🔄 Outras Melhorias
- Performance geral do servidor melhorada.
- Seleção de personagem agora faz reconexão limpa ao servidor.
