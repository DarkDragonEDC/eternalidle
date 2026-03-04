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
- **Sincronia Servidor/Cliente**: Se houver mudanças críticas na lógica do servidor (`server/index.js`), avalie se a versão no `server/package.json` deve ser incrementada.
- **Auto-Refresh Sync**: Toda vez que a versão no `server/package.json` mudar, a variável `CLIENT_VERSION` no `client/src/App.jsx` **deve ser alterada para o mesmo valor**, caso contrário o jogo entrará em loop de refresh infinito.

## 3. Integridade do Sistema Offline
- **Relatório de Ganhos**: Nunca volte a lógica de deletar o `offlineReport` do cache antes do `acknowledge_offline_report`.
- **Persistência**: O flag `_offlineReportSent` deve permanecer em memória (`char.`) e não no estado persistido no banco de dados.

## 4. Higiene do Código
- **Logs de Debug**: Remova `console.log` puramente temporários usados durante o desenvolvimento. Mantenha apenas logs de sistema/estatísticas essenciais.
- **Patch Notes**: O arquivo `PATCH_NOTES.md` deve ser **sempre atualizado** com informações que os jogadores precisam saber, e DEVE SER ESCRITO **SEMPRE EM PORTUGUÊS**. Use uma linguagem clara e acessível para o público final (jogadores), evitando termos técnicos excessivos onde não forem necessários.

## 5. Segurança
- **Arquivos Sensíveis**: Garanta que nenhum arquivo `.env` ou chaves privadas (Stripe/Supabase) estejam sendo rastreados pelo Git.
