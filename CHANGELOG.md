# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Versionamento semântico.

## [0.1.0] - 2026-11-15

### Adicionado

- Activity de desarme de bomba de 2 a 6 jogadores, com papéis de desarmador e especialista.
- Sala com código curto (6 caracteres sem ambíguos), lobby com troca de desarmador pelo anfitrião, escolha do idioma da bomba e entrada por `?room=` em desenvolvimento.
- Partida autoritativa no servidor: briefing de 8s, cronômetro de 300s, 3 strikes, rematch com o mesmo grupo.
- Três módulos jogáveis: fios (4–6 fios), botão com segurar/soltar por faixa e teclado de quatro símbolos.
- Manual dividido em páginas (fios, botão, teclado) e distribuído em rodízio entre os especialistas; com um único especialista, todas as páginas.
- Estado filtrado por papel: o desarmador nunca recebe o manual e os especialistas nunca recebem os detalhes da bomba.
- Interface em en-US, pt-BR, es-ES, fr e de, com idioma do manual independente do idioma da interface.
- Autenticação Discord via Embedded App SDK em produção e login simulado em desenvolvimento; sessão JWT no handshake do Socket.IO.
- Persistência de salas em Redis quando `REDIS_URL` está definido, com fallback para memória.
- Rate limit de eventos por socket (240/s), cabeçalhos de segurança, CSP Report-Only e health check com estado do store.
- Deploy na Shard Cloud via `.shardcloud` (`talkmedown`), build do cliente servido pelo mesmo processo da API.
- CI (typecheck, testes e build), smoke test de produção e suíte de testes do motor do jogo.
