# 📄 Patch Notes — v1.6.9 — Correções de Estabilidade

## 🛠️ Correções

### ⛪ Altar de Oferendas
- **Correção crítica:** O progresso global do Altar era zerado indevidamente quando o servidor reiniciava ou quando havia diferença de fuso horário. O total acumulado podia ser sobrescrito por zero no banco de dados.
- **Como foi corrigido:** O reset diário agora só limpa a memória interna — o banco de dados é atualizado apenas atomicamente pela função SQL a cada doação, garantindo que o total nunca seja perdido.

### ⚔️ World Boss
- **Correção:** A contagem de participantes mostrava **0** e o ranking pessoal não aparecia após reinício do servidor.
- **Causa:** O carregamento inicial dos rankings e da sessão do boss era feito de forma assíncrona sem aguardar conclusão, causando dados vazios para jogadores que conectavam logo após o boot.
- **Como foi corrigido:** O servidor agora aguarda o carregamento completo da sessão e rankings antes de aceitar conexões, garantindo dados corretos desde o primeiro acesso.

---

# 📄 Patch Notes — v1.6.8 — Altar of Offerings

## 🔥 NEW FEATURE: Altar of Offerings
A new global system where all players collaborate to unlock powerful bonuses!

### ⚙️ How it works:
- **Collective Donation:** Donate your Silver to the Altar and help the community reach global milestones.
- **Reward Tiers:** There are three global milestone levels (2M, 5M, and 10M).
- **Buff Scaling:** Unlike other systems, **all bonuses** (XP, Silver, Drops, Quality, etc.) are unlocked as soon as **Tier 1** is reached, and their values increase with each new level reached by the community!
- **Activation:** Once a milestone is reached and you have made your minimum donation, you can activate the buff for up to **12 hours** (limited to the daily reset at 00:00 UTC).

### 📈 Bonus Progression:
- **Tier 1 (2M Goal):** +5% XP/Silver, +2.5% on other chances (Drops, Quality, etc).
- **Tier 2 (5M Goal):** +10% XP/Silver, +5% on other chances.
- **Tier 3 (10M Goal):** +15% XP/Silver, +10% on other chances.

### 🚀 Highlights:
- **Push Notifications:** Receive an alert on your device whenever the community unlocks a new Tier! 🔔
- **Dynamic Interface:** Track progress in real-time, see remaining buff time, and easily locate the Altar via the new animated button in the header.
- **Integrated Status:** Your Altar bonuses now clearly appear in the **Combat** panel and with the **"ALTAR:"** tag in active bonuses.
- **Expanded Drop Influence:** The Altar's Global Drop Rate bonus now affects:
    - Rarity bonus luck for chests upon completing Dungeons.
    - Chance to find **Crests** inside Dungeon chests.
