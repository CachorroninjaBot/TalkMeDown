# Talk Me Down

Jogo de desarme de bomba para Discord Activities, de 2 a 6 jogadores. Um jogador vê a bomba e não vê o manual; os outros seguram o manual e não veem a bomba. Só dá para vencer falando: descrever o que está na tela, perguntar os detalhes e confiar na leitura do outro.

- Cliente: React + Vite, entregue pelo mesmo serviço da API.
- Servidor: Fastify + Socket.IO, estado autoritativo e filtrado por jogador.
- Idiomas: interface em 5 locales (en-US, pt-BR, es-ES, fr, de); o idioma do manual é escolhido pelo anfitrião e fica separado do idioma da interface.
- Partida: 8s de briefing, 300s de cronômetro, 3 erros permitidos.
- Deploy alvo: Shard Cloud (Node), uma instância, opcionalmente com Redis gerenciado.

## Como funciona uma partida

1. O anfitrião arma a bomba com 2 a 6 jogadores conectados. Por padrão quem cria a sala é o desarmador; o anfitrião pode trocar o papel de qualquer jogador no lobby.
2. **Briefing (8s):** o desarmador vê o painel; os especialistas abrem suas páginas do manual. Cada um recebe só o que o seu papel permite ver.
3. **Desarme (300s):** o desarmador resolve os três módulos. Os especialistas leem as regras e o número de série/baterias em voz alta.
4. **Resultado:** desarmada (com os segundos restantes), explodida (tempo esgotado) ou abortada (sem jogadores suficientes). O anfitrião arma uma nova bomba com o mesmo grupo.

Três erros explodem a bomba. Um módulo resolvido continua resolvido; o desarmador não pode refazê-lo.

### Papéis e o que cada um vê

| Papel | Vê a bomba | Vê o manual |
| --- | --- | --- |
| Desarmador | Sim: fios, botão, teclado, série, baterias | Não |
| Especialista | Não: só o status dos módulos, série e baterias | Sim: as páginas que recebeu |

O manual existe apenas no servidor. O estado enviado ao desarmador nunca inclui o texto do manual, e o estado enviado aos especialistas nunca inclui as cores da bomba, a ordem correta do teclado ou o índice do fio certo. Isso impede que a resposta apareça no bundle ou no devtools do cliente.

As três páginas do manual (fios, botão e teclado) são distribuídas em rodízio entre os especialistas. Com um único especialista, ele recebe todas as páginas; com mais gente, cada um lê só a sua parte.

### Módulos

- **Fios:** corte exatamente um dos 4 a 6 fios. A regra certa depende da quantidade de fios, das cores e da paridade do último dígito da série.
- **Botão:** aperte ou segure conforme cor, rótulo, baterias e vogal na série. Ao segurar, uma faixa de cor aparece sob o botão; solte quando o cronômetro contiver o dígito correspondente à faixa.
- **Teclado:** os quatro símbolos de uma das seis colunas fixas aparecem embaralhados. A coluna certa no manual define a ordem de pressionar; um símbolo errado zera a sequência e custa um erro.

As regras completas são as que o jogo entrega no manual, em `content/locales/*.json` → `manual`. Elas não se repetem no cliente.

## Requisitos

- Node.js 22+
- Uma aplicação no Discord Developer Portal com Activity habilitada

## Desenvolvimento

```bash
npm install
cp .env.example .env   # preencha se for testar login real do Discord
npm run dev
```

- Cliente: http://localhost:5173
- API: http://localhost:3001

Em desenvolvimento o login é simulado (`DEV_AUTH=true`). Abra abas com `?room=` e `?name=` para jogar sozinho:

```
http://localhost:5173/?room=TESTE&name=Ana
http://localhost:5173/?room=TESTE&name=Bruno
```

Cada aba recebe uma identidade própria (sessionStorage), fala com a API pelo proxy do Vite e reentra na sala sozinha após uma reconexão.

Salas criadas a partir de um canal do Discord recebem um código aleatório de 6 caracteres, sem letras e números ambíguos (`I`, `O`, `0`, `1`). Códigos curtos definidos em `?room=` são preservados: `TESTE` continua `TESTE`.

## Variáveis de ambiente

| Variável | Uso |
| --- | --- |
| `DISCORD_CLIENT_ID` | Login Discord e build do cliente (também aceita `VITE_DISCORD_CLIENT_ID`) |
| `DISCORD_CLIENT_SECRET` | Troca do código OAuth no servidor |
| `DISCORD_BOT_TOKEN` | Validação do participante na instância da Activity |
| `DISCORD_REDIRECT_URI` | Opcional; deixe vazio se o portal não exigir redirect fixo |
| `SESSION_SECRET` | Obrigatório em produção (mínimo 16 caracteres) |
| `DEV_AUTH` | Login de desenvolvimento; ignorado em produção |
| `SKIP_INSTANCE_VALIDATION` | `true` apenas em testes; em produção valide a instância |
| `REDIS_URL` | Redis gerenciado da Shard; sem ele as salas ficam só em memória |
| `ROOM_TTL_SECONDS` | Tempo de vida de uma sala parada após a partida (padrão 21600) |
| `LOBBY_TTL_SECONDS` | Tempo de vida de um lobby sem ninguém conectado (padrão 900) |
| `MAX_ROOMS` | Limite de salas simultâneas no processo (padrão 2000) |
| `PORT` | Padrão 80 em produção, 3001 em desenvolvimento |
| `TRUST_PROXY` | `true` atrás do proxy da Shard, para o rate limit usar o IP real |
| `LOG_LEVEL` | `fatal` a `trace`; padrão `info` em produção e `debug` em desenvolvimento |
| `LOG_JSON` | `1` emite JSON puro em vez de logs legíveis |
| `CONTENT_DIR` | Opcional; aponta para outra pasta de locales |
| `PUBLIC_DIR` | Opcional; aponta para outro build do cliente |

## Testes e build

```bash
npm test          # regras do motor (fios, botão, teclado), geração e estado público
npm run typecheck
npm run build     # shared, game-core, servidor e cliente
npm start         # produção local (NODE_ENV=production, porta 80 por padrão)
npm run smoke     # checa saúde, locales, conteúdo e o shell do cliente
```

`npm run build:shared` e `npm run build:game-core` precisam rodar antes do typecheck/build do servidor, porque ele importa os `.d.ts` dos pacotes internos. O GitHub Actions roda typecheck, testes e build em cada push para `main` e em pull requests.

`npm run smoke` aceita uma URL: `npm run smoke -- https://seu-app.example` (ou `SMOKE_BASE_URL`).

O servidor serve `apps/activity/dist` na raiz, `/api/*` e `/ws` na mesma origem, com fallback de SPA para rotas do cliente.

## Deploy na Shard Cloud

1. Envie o repositório para o GitHub e crie um app Node na Shard Cloud apontando para ele.
2. O arquivo `.shardcloud` já define:
   - `LANGUAGE=node` e `MEMORY=1024`;
   - `CUSTOM_COMMAND=npm ci --include=dev --no-audit --no-fund && npm run build && npm start`;
   - `SUBDOMAIN=talkmedown`.
3. Não há `MAIN`: o entrypoint (`apps/server/dist/index.js`) só existe depois do build, e a Shard ignora `MAIN` quando `CUSTOM_COMMAND` está presente. Declarar o caminho gera o aviso "MAIN file not found in project".
4. No painel de variáveis de ambiente, configure:
   - `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`;
   - `SESSION_SECRET` com um valor longo e aleatório — ele só existe no painel, nunca no repositório;
   - `REDIS_URL` com o Redis gerenciado da Shard (recomendado);
   - `SKIP_INSTANCE_VALIDATION=false`.
5. Faça o deploy e confirme `https://talkmedown.shardweb.app/api/health` retornando `{"ok":true,...}`.

Com Redis, as salas sobrevivem a reinícios e deploys: o cliente reconecta, reentra na sala e o servidor retoma o timer da fase atual. Sem Redis, o estado vive apenas na memória.

### Escala

Uma instância. Salas são estado em memória (com snapshot no Redis) e o Socket.IO usa o transporte padrão, sem adaptador multi-instância. Para escalar horizontalmente será necessário um adaptador Redis para o Socket.IO e balanceamento com sessões fixas.

## Discord Developer Portal

1. Crie a aplicação e copie o `Application ID` para `DISCORD_CLIENT_ID`.
2. Em **Activities**, habilite a Activity e defina a URL base.
3. Em **URL Mappings**, adicione um único mapeamento:
   - Prefixo `/` → destino `talkmedown.shardweb.app` (sem `https://`; o portal não aceita protocolo no destino).
4. O proxy preserva o caminho: `/.proxy/api` e `/.proxy/ws` chegam a `/api` e `/ws` do mesmo serviço.
5. Se adicionar prefixos específicos (`/api`, `/ws`), arraste-os para **antes** do `/` — o portal exige que o prefixo mais curto fique por último. Prefixos não podem conter `.proxy` nem pontos no path do Socket.IO.
6. Em **OAuth2**, adicione o redirect `https://<client_id>.discordsays.com`.

Os caminhos exatos de URL Mapping e o suporte a WebSocket pelo proxy devem ser conferidos na documentação oficial do Discord, pois mudam com o tempo.

## Saúde, cabeçalhos e limites

`GET /api/health` responde `{ ok, status, version, uptimeSeconds, redis, store }`. `status` vira `degraded` quando o armazenamento não está pronto (por exemplo, Redis configurado e desconectado).

Todas as respostas enviam `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS em produção e uma `Content-Security-Policy-Report-Only` que permite o enquadramento apenas por origens do Discord. A política ainda não bloqueia nada: acompanhe os relatórios antes de promovê-la para o cabeçalho que aplica as regras.

Cada socket aceita até 240 eventos por segundo; acima disso o servidor responde com `RATE_LIMITED` e o cliente mostra um aviso. O limite usa o IP da requisição: mantenha `TRUST_PROXY` ligado (padrão `true`) atrás do proxy da Shard Cloud.

## Privacidade

A Activity guarda apenas o ID do Discord, o nome de exibição e a URL do avatar para montar a sala e o placar da equipe. Não há chat, histórico permanente, analytics ou integrações de terceiros; os snapshots de sala expiram pelo TTL e ficam no Redis da própria instância.

## Identidade visual

Os arquivos de marca ficam em `assets/branding`:

- `talk-me-down-avatar.png` (512×512) — avatar do app/bot no Developer Portal;
- `talk-me-down-banner.png` (960×540, 16:9) — banner da listagem na App Directory;
- os `@2x` guardam a versão em alta resolução (1024×1024 e 1792×1008).

O avatar é a bomba do símbolo da interface: esfera preta com aro âmbar, pavio com faísca verde e um X vermelho de fios cruzados. Sem texto, para continuar legível em 32px e dentro do recorte circular do Discord. O banner mostra a premissa do jogo — o painel com fios, botão e teclado à direita e o manual aberto embaixo, com o wordmark à esquerda. As cores são as mesmas da interface: âmbar `#ffb020`, verde `#6ef2a4`, vermelho `#ff4d5e`, azul `#63a4ff` e creme `#f5f1e8` sobre o fundo `#0b0f14`.

## Adicionar um idioma

1. Copie `content/locales/en-US.json` para `content/locales/<locale>.json` e traduza os valores (inclusive `manual`).
2. Reinicie o servidor. O novo idioma aparece no seletor da interface e na lista de idiomas da bomba.
3. Não há chave de locale em código: o cliente carrega `GET /api/locales/<code>`. Chaves ausentes caem para o inglês no servidor.

## Estrutura

```
apps/activity      cliente React (SDK, i18n, telas, módulos e manual)
apps/server        Fastify, Socket.IO, auth, salas, conteúdo e estado filtrado
packages/shared    protocolo, schemas Zod, constantes e helpers
packages/game-core regras da bomba, geração com seed e estado público
content/locales    interface e manual em 5 idiomas
scripts            smoke test de produção
```
