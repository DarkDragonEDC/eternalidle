---
name: Git Submission Rules
description: Regras obrigatórias a serem validadas antes de qualquer commit ou push.
---

# Diretrizes de Desenvolvimento e Commit

Sempre leia estas regras antes de realizar operações de Git (commit/push) ou finalizar uma tarefa complexa.

## 1. Internacionalização (I18N)
- **Apenas Inglês**: Todo texto visível ao usuário (modais, botões, alertas) deve estar em **Inglês**.
- **Check**: Antes de subir, procure por termos em Português no código alterado (ex: "Confirmar", "Lido").

## 2. Controle de Versão e Auto-Refresh
- **Sincronia Servidor/Cliente**: Se houver mudanças críticas na lógica do servidor (`server/index.js`), a versão no `server/package.json` deve ser incrementada.
- **CLIENT_VERSION**: A constante `CLIENT_VERSION` no `client/src/App.jsx` **deve sempre ser igual** à versão do servidor. O não cumprimento causará loop de refresh infinito ou erro de sistema.

## 3. Integridade do Sistema Offline
- **Relatório de Ganhos**: Nunca delete o `offlineReport` do cache do personagem no servidor antes de receber o evento `acknowledge_offline_report` do cliente.
- **Persistência**: O flag `_offlineReportSent` deve ser apenas em memória (dentro do objeto do personagem no `GameManager`) para garantir bônus retroativos em caso de falha de socket.

## 4. Higiene e Documentação
- **Logs de Debug**: Remova todos os `console.log` temporários. Mantenha apenas logs de erro ou estatísticas críticas de sistema.
- **Patch Notes**: O arquivo `PATCH_NOTES.md` é a comunicação oficial com os jogadores. Ele **DEVE** ser atualizado em **Português** a cada mudança significativa, usando linguagem acessível.

## 5. Integridade de Infraestrutura (NOVO)
- **Refatoração Segura**: Ao refatorar componentes core (ex: `App.jsx`, `useAppStore.js`), nunca remova lógicas de infraestrutura como Verificação de Versão, Inicialização de Push Notifications ou Persistência de Sessão sem autorização expressa.

## 6. Sincronização de Estado (NOVO)
- **getStatus Sync**: Sempre que adicionar um novo campo crítico ao estado inicial do jogo (ex: `offlineReport`), garanta que ele esteja sendo retornado pela função `getStatus` no `GameManager.js`.

## 7. Segurança
- **Arquivos Sensíveis**: Garanta que `.env` ou chaves de API (Stripe/Supabase/Vapid) não sejam submetidos ao Git.

