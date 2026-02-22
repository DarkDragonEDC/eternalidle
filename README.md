# Eternal Idle

**Eternal Idle** e um RPG idle/incremental baseado em navegador, onde seu personagem progride mesmo enquanto voce esta offline. Colete recursos, refine materiais, crafite equipamentos, lute contra monstros, explore masmorras e escale o ranking global.

> Versao atual: **Pre-Alpha**

---

## Indice

- [Visao Geral](#visao-geral)
- [Arquitetura do Projeto](#arquitetura-do-projeto)
- [Tecnologias](#tecnologias)
- [Requisitos](#requisitos)
- [Instalacao e Configuracao](#instalacao-e-configuracao)
- [Executando o Projeto](#executando-o-projeto)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Sistemas do Jogo](#sistemas-do-jogo)
  - [Atributos do Personagem](#atributos-do-personagem)
  - [Skills e Profissoes](#skills-e-profissoes)
  - [Itens, Tiers e Qualidades](#itens-tiers-e-qualidades)
  - [Combate](#combate)
  - [Masmorras (Dungeons)](#masmorras-dungeons)
  - [World Boss](#world-boss)
  - [Mercado (Marketplace)](#mercado-marketplace)
  - [Sistema de Runas](#sistema-de-runas)
  - [Alquimia e Culinaria](#alquimia-e-culinaria)
  - [Sistema Social](#sistema-social)
  - [Loja de Orbs e Membership](#loja-de-orbs-e-membership)
  - [Progresso Offline](#progresso-offline)
- [Variaveis de Ambiente](#variaveis-de-ambiente)
- [Scripts Uteis](#scripts-uteis)
- [Regras e Conduta](#regras-e-conduta)
- [Licenca](#licenca)

---

## Visao Geral

Eternal Idle e um jogo multiplayer idle onde jogadores criam personagens, evoluem habilidades de coleta, refino, crafting e combate, exploram masmorras de T1 a T10 e competem em rankings globais. O jogo funciona em tempo real via WebSocket e suporta progresso offline -- seu personagem continua lutando e coletando mesmo quando voce fecha o navegador.

---

## Arquitetura do Projeto

O projeto segue uma arquitetura **cliente-servidor** com dados compartilhados:

```
eternalidle/
  client/     -> Frontend React (Vite)
  server/     -> Backend Node.js (Express + Socket.IO)
  shared/     -> Dados compartilhados (itens, monstros, skills, dungeons)
```

- **Client**: Interface React SPA com comunicacao via Socket.IO.
- **Server**: API REST (Express) + WebSocket (Socket.IO), com logica de jogo centralizada no `GameManager`.
- **Shared**: Definicoes de dados usadas tanto pelo client quanto pelo server (itens, monstros, tabelas de XP, dungeons, etc).

---

## Tecnologias

### Frontend (Client)
| Tecnologia | Uso |
|---|---|
| **React 19** | Framework de UI |
| **Vite 7** | Bundler e dev server |
| **React Router 7** | Navegacao SPA |
| **Socket.IO Client** | Comunicacao em tempo real |
| **Supabase JS** | Autenticacao do usuario |
| **Framer Motion** | Animacoes e transicoes |
| **Lucide React** | Biblioteca de icones |

### Backend (Server)
| Tecnologia | Uso |
|---|---|
| **Node.js** | Runtime |
| **Express 5** | API REST e rotas HTTP |
| **Socket.IO** | Comunicacao bidirecional em tempo real |
| **Supabase** | Banco de dados (PostgreSQL) e autenticacao |
| **Stripe** | Processamento de pagamentos (Orbs / Membership) |
| **Sharp** | Processamento de imagens |
| **dotenv** | Gerenciamento de variaveis de ambiente |

---

## Requisitos

- **Node.js** >= 18
- **npm** >= 9
- Conta no **Supabase** (para banco de dados e autenticacao)
- (Opcional) Conta no **Stripe** (para pagamentos)

---

## Instalacao e Configuracao

### 1. Clonar o repositorio

```bash
git clone https://github.com/DarkDragonEDC/eternalidle.git
cd eternalidle
```

### 2. Instalar dependencias

```bash
# Client
cd client
npm install

# Server
cd ../server
npm install
```

### 3. Configurar variaveis de ambiente

Crie o arquivo `server/.env` baseado no exemplo:

```bash
cp server/.env.example server/.env
```

Edite o `server/.env` com suas credenciais:

```env
PORT=3000
SUPABASE_URL=sua_url_do_supabase
SUPABASE_KEY=sua_chave_service_role_do_supabase
STRIPE_SECRET_KEY=sua_chave_stripe (opcional)
STRIPE_WEBHOOK_SECRET=seu_webhook_secret (opcional)
```

### 4. Configurar o banco de dados

Execute os scripts SQL em `server/sql/` no seu projeto Supabase, comecando pelo schema base:

```
server/sql/00_base_schema_homolog.sql
server/sql/full_setup_homolog.sql
```

---

## Executando o Projeto

### Servidor (Backend)

```bash
cd server
npm run dev
```

O servidor inicia na porta definida em `PORT` (padrao: `3000`) com hot-reload via `--watch`.

### Cliente (Frontend)

```bash
cd client
npm run dev
```

O Vite inicia o dev server (padrao: `http://localhost:5173`).

### Build de Producao (Client)

```bash
cd client
npm run build
```

Os arquivos de producao serao gerados em `client/dist/`.

---

## Estrutura de Pastas

```
eternalidle/
|-- client/                     # Frontend React
|   |-- public/                 # Assets estaticos (icones de itens, imagens)
|   |-- src/
|   |   |-- components/         # Componentes React da UI
|   |   |   |-- Auth.jsx              # Tela de login/registro
|   |   |   |-- CombatPanel.jsx       # Painel de combate
|   |   |   |-- DungeonPanel.jsx      # Painel de masmorras
|   |   |   |-- InventoryPanel.jsx    # Inventario do jogador
|   |   |   |-- MarketPanel.jsx       # Marketplace
|   |   |   |-- RankingPanel.jsx      # Rankings e leaderboard
|   |   |   |-- RunePanel.jsx         # Forja de runas
|   |   |   |-- SocialPanel.jsx       # Amigos e social
|   |   |   |-- WorldBossPanel.jsx    # Interface do World Boss
|   |   |   |-- OrbShop.jsx           # Loja premium
|   |   |   |-- TradePanel.jsx        # Sistema de trocas
|   |   |   |-- ...                   # Outros componentes
|   |   |-- hooks/              # React hooks customizados
|   |   |-- utils/              # Funcoes utilitarias
|   |   |-- App.jsx             # Componente raiz
|   |   |-- main.jsx            # Ponto de entrada
|   |   |-- supabase.js         # Configuracao do cliente Supabase
|   |-- package.json
|   |-- vite.config.js
|
|-- server/                     # Backend Node.js
|   |-- index.js                # Ponto de entrada do servidor (Express + Socket.IO)
|   |-- GameManager.js          # Logica principal do jogo (ticks, estados, catch-up)
|   |-- authMiddleware.js       # Middleware de autenticacao JWT
|   |-- managers/               # Modulos de logica de jogo
|   |   |-- ActivityManager.js        # Gerencia atividades (coleta, refino, craft)
|   |   |-- CombatManager.js          # Sistema de combate
|   |   |-- DungeonManager.js         # Logica de masmorras
|   |   |-- InventoryManager.js       # Gerencia de inventario
|   |   |-- MarketManager.js          # Marketplace
|   |   |-- WorldBossManager.js       # World Boss
|   |   |-- TradeManager.js           # Trocas entre jogadores
|   |   |-- SocialManager.js          # Amigos e interacoes sociais
|   |   |-- OrbsManager.js            # Moeda premium
|   |   |-- DailyRewardManager.js     # Recompensas diarias
|   |   |-- AdminManager.js           # Ferramentas de administracao
|   |-- routes/                 # Rotas REST da API
|   |   |-- characters.js             # CRUD de personagens
|   |-- sql/                    # Scripts de migracao e setup do banco
|   |-- data/                   # Dados estaticos do servidor
|   |-- utils/                  # Utilitarios do servidor
|   |-- package.json
|   |-- .env.example
|
|-- shared/                     # Dados compartilhados client/server
|   |-- items.js                # Definicoes de todos os itens do jogo
|   |-- monsters.js             # Tabela de monstros por tier
|   |-- skills.js               # Tabela de XP e skills iniciais
|   |-- dungeons.js             # Configuracao das 10 masmorras
|   |-- chest_drops.js          # Tabela de drops de baus
|   |-- orbStore.js             # Itens da loja premium
|   |-- proficiency_stats.js    # Stats de proficiencia de combate
|   |-- warrior_stats_fixed.js  # Stats de equipamento Guerreiro
|   |-- hunter_stats_fixed.js   # Stats de equipamento Cacador
|   |-- mage_stats_fixed.js     # Stats de equipamento Mago
|
|-- PATCH_NOTES.md              # Notas da versao mais recente
|-- SUGESTOES_DE_MELHORIAS.md   # Roadmap de ideias futuras
|-- wiki.txt                    # Wiki interna do jogo
|-- rules.txt                   # Regras e conduta
|-- .gitignore
```

---

## Sistemas do Jogo

### Atributos do Personagem

Cada personagem possui tres atributos principais:

| Atributo | Sigla | Efeito |
|---|---|---|
| **Strength** | STR | +10 HP Maximo por ponto |
| **Agility** | AGI | Reduz o intervalo entre ataques (maior velocidade) |
| **Intelligence** | INT | +0.5% XP e +0.5% Prata por ponto |

Alem dos atributos, existe o **IP (Item Power)** que representa o poder total do equipamento. E calculado como a media dos 7 slots de combate, onde slots vazios contam como 0.

---

### Skills e Profissoes

O sistema de nivelamento usa uma curva de XP customizada com nivel maximo de **100**. As skills estao divididas em categorias:

#### Coleta (Gathering)
| Skill | Recurso |
|---|---|
| Lumberjack | Madeira (Wood) |
| Ore Miner | Minerio (Ore) |
| Animal Skinner | Couro (Hide) |
| Fiber Harvester | Fibra (Fiber) |
| Herbalism | Ervas (Herb) |
| Fishing | Peixes (Fish) |

#### Refino (Refining)
| Skill | Produto |
|---|---|
| Plank Refiner | Tabuas (Plank) -- a partir de Wood |
| Metal Bar Refiner | Barras (Bar) -- a partir de Ore |
| Leather Refiner | Couro (Leather) -- a partir de Hide |
| Cloth Refiner | Tecido (Cloth) -- a partir de Fiber |
| Distillation | Extratos (Extract) -- a partir de Herb |

#### Crafting
| Skill | Estacao | Producao |
|---|---|---|
| Warrior Crafter | Warrior's Forge | Espadas, armaduras de placa, picaretas |
| Hunter Crafter | Hunter's Lodge | Arcos, armaduras de couro, machados |
| Mage Crafter | Mage's Tower | Cajados, armaduras de tecido |
| Tool Crafter | Toolmaker | Ferramentas (picareta, machado, faca, foice, vara) |

#### Especializacao
| Skill | Funcao |
|---|---|
| Cooking | Preparo de comida (regeneracao de HP) |
| Alchemy | Producao de pocoes (buffs de XP, Prata, Qualidade) |
| Dungeoneering | XP de masmorras |
| Combat | Nivel de combate geral |

#### Proficiencias de Combate
| Proficiencia | Classe |
|---|---|
| Warrior Proficiency | Guerreiro |
| Hunter Proficiency | Cacador |
| Mage Proficiency | Mago |

---

### Itens, Tiers e Qualidades

O jogo tem progressao de **Tier 1 a Tier 10** para todos os recursos, materiais e equipamentos.

#### Tipos de Recursos
- **Raw (Brutos)**: Wood, Ore, Hide, Fiber, Fish, Herb
- **Refined (Refinados)**: Plank, Bar, Leather, Cloth, Extract
- **Consumables**: Comida, Pocoes, Tickets especiais
- **Gear (Equipamentos)**: Armas, armaduras, ferramentas
- **Especiais**: Mapas de Dungeon, Cristas de Boss, Fragmentos de Runa, Baus

#### Qualidades de Equipamento
| Qualidade | Cor | Bonus de IP | Chance |
|---|---|---|---|
| Normal | Branco | +0 | 69.9% |
| Good | Verde | +20 | 20% |
| Outstanding | Azul | +50 | 9% |
| Excellent | Roxo | +100 | 1% |
| Masterpiece | Laranja | +200 | 0.1% |

#### Slots de Equipamento (7 slots de combate)
- Arma principal (Espada / Arco / Cajado)
- Off-hand (Escudo / Tocha / Tomo)
- Armadura
- Capacete
- Botas
- Luvas
- Capa

---

### Combate

O combate e automatico e baseado em turnos em tempo real. Os monstros estao distribuidos por tiers (T1 a T10) com dificuldade crescente.

- Cada monstro tem: **HP, Dano, Defesa, XP e loot (itens + Prata)**.
- Monstros podem dropar **Mapas de Dungeon** com chances variadas.
- O dano e influenciado pelo IP do equipamento e proficiencia da classe.
- **Comida** e consumida automaticamente para regenerar HP durante o combate.

---

### Masmorras (Dungeons)

Existem **10 masmorras**, uma por tier:

| Tier | Nome | Nivel Minimo | Taxa de Entrada | Boss |
|---|---|---|---|---|
| T1 | Goblin Cave | 1 | 200 Silver | Goblin King |
| T2 | Wolf Den | 10 | 500 Silver | Alpha Wolf |
| T3 | Bear Cave | 20 | 1.000 Silver | Ancient Bear |
| T4 | Undead Crypt | 30 | 2.500 Silver | Skeleton King |
| T5 | Ogre Fortress | 40 | 5.000 Silver | Ogre Chieftain |
| T6 | Troll Mountain | 50 | 10.000 Silver | Troll Elder |
| T7 | Dragon Nest | 60 | 20.000 Silver | Dragon Mother |
| T8 | Ancient Ruins | 70 | 40.000 Silver | Golem Primordial |
| T9 | Demon Realm | 80 | 100.000 Silver | Demon Prince |
| T10 | Void Dimension | 90 | 500.000 Silver | Void Entity |

Cada masmorra tem **5 ondas** de monstros + 1 Boss final. Requerem **Mapas de Dungeon** correspondentes ao tier. Recompensas incluem XP bonus, recursos, Cristas de Boss e Baus de Tesouro.

---

### World Boss

Boss global que aparece periodicamente e pode ser enfrentado por todos os jogadores conectados. O dano acumulado determina a qualidade do bau recebido como recompensa. Baus de World Boss vao de Normal a Masterpiece em todos os tiers (T1-T10).

---

### Mercado (Marketplace)

Sistema de mercado entre jogadores:
- Listar itens para venda por Prata.
- Comprar itens de outros jogadores.
- Sistema de **Claims** para itens comprados ou cancelados.
- Metadados de crafting (quem criou e quando) sao preservados durante transacoes.

---

### Sistema de Runas

- **Fragmentos de Runa (Rune Shards)**: Obtidos em baus de masmorra e drops de monstros.
- **Rune Forge**: Use fragmentos para criar Runas com bonus especiais:
  - Bonus de XP para atividades
  - Duplicacao de itens (Copy)
  - Auto-Refino (Auto-Refine)
  - Bonus de combate

---

### Alquimia e Culinaria

#### Alquimia
Pipeline completo: **Herbalism** (coleta de ervas) -> **Distillation** (refino em extratos) -> **Alchemy** (criacao de pocoes).

Pocoes disponibilizam buffs temporarios:
- Bonus de XP
- Bonus de ganho de Prata
- Bonus de chance de qualidade em crafting

#### Culinaria
**Fishing** (pesca) -> **Cooking** (preparo de comida).

Comida fornece regeneracao automatica de HP no combate. E essencial para sobreviver em masmorras e combate offline.

---

### Sistema Social

- **Lista de Amigos**: Adicionar, aceitar e gerenciar amigos.
- **Chat**: Comunicacao entre jogadores.
- **Trocas (Trade)**: Sistema de troca direta de itens entre personagens.
- **Leaderboard**: Rankings por nivel de combate, skills e outras metricas.
- **Notificacoes**: Alertas de eventos importantes.

---

### Loja de Orbs e Membership

#### Moedas
| Moeda | Tipo | Uso |
|---|---|---|
| **Silver (Prata)** | Padrao | Mercado, taxas de dungeon, transacoes gerais |
| **Orbs** | Premium | Loja de Orbs, expansao de inventario, itens especiais |

#### Pacotes de Orbs
| Pacote | Preco (USD) | Preco (BRL) | Orbs (com bonus) |
|---|---|---|---|
| 250 Orbs | $6.99 | R$36.90 | 275 |
| 500 Orbs | $13.99 | R$72.90 | 550 |
| 1000 Orbs | $25.99 | R$135.90 | 1.100 |
| 2500 Orbs | $64.99 | R$339.90 | 2.750 |

#### Itens da Loja
- **Inventory Slot expansion** (50 Orbs): +1 slot permanente de inventario.
- **Name Change Token** (500 Orbs): Permite trocar o nome do personagem uma vez.

#### Membership (VIP)
- Preco: $6.99 / R$36.90
- Duracao: 30 dias
- Beneficios: +20 slots de inventario, +10% XP, +10% Prata, +10% Eficiencia global.

---

### Progresso Offline

Ao fechar o jogo, seu personagem continua executando a atividade atual:
- **Combate**: Continua lutando contra monstros, consumindo comida para sobreviver.
- **Coleta/Refino/Crafting**: Continua produzindo recursos e itens.
- **Masmorras**: Completa as ondas restantes de forma autonoma.

O progresso offline e calculado no servidor via sistema de **catch-up** quando o jogador reconecta.

---

## Variaveis de Ambiente

| Variavel | Obrigatoria | Descricao |
|---|---|---|
| `PORT` | Nao | Porta do servidor (padrao: 3000) |
| `SUPABASE_URL` | Sim | URL do seu projeto Supabase |
| `SUPABASE_KEY` | Sim | Chave Service Role do Supabase |
| `STRIPE_SECRET_KEY` | Nao | Chave secreta do Stripe (para pagamentos) |
| `STRIPE_WEBHOOK_SECRET` | Nao | Secret do webhook do Stripe |

---

## Scripts Uteis

### Client
```bash
npm run dev       # Inicia o dev server (Vite)
npm run build     # Build de producao
npm run lint      # Verificacao de linting (ESLint)
npm run preview   # Preview do build de producao
```

### Server
```bash
npm start         # Inicia o servidor (producao)
npm run dev       # Inicia com hot-reload (--watch)
```

---

## Regras e Conduta

### Gameplay
1. **Proibido** o uso de bots, scripts, autoclickers ou software de automacao externo.
2. Explorar bugs intencionalmente para ganho pessoal resulta em punicoes.
3. Cada jogador e limitado a **uma conta ativa** (proibido multi-contas).
4. Manipulacao de mercado (ofertas falsas, conluio de precos) nao e permitida.

### Conduta
1. Tolerancia zero para discurso de odio, assedio ou discriminacao.
2. Nomes ofensivos serao alterados sem aviso previo.
3. Spam e publicidade nos espacos comunitarios sao proibidos.

### Penalidades
- Advertencia formal
- Suspensao temporaria
- Banimento permanente com exclusao de dados

---

## Licenca

Projeto privado. Todos os direitos reservados.

---

*Documentacao gerada em 22/02/2026 -- Versao Pre-Alpha*
