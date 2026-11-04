# API REST com Node.js e TypeScript

API para cadastro e autenticação de usuários e gerenciamento de cidades e pessoas. As rotas de cidades e pessoas exigem um token JWT. Cada pessoa pertence a uma cidade.

## Tecnologias

- Node.js, TypeScript e Express.
- Knex para consultas e migrations.
- SQLite no desenvolvimento e nos testes; PostgreSQL em produção.
- Yup para validação, bcryptjs para hash de senhas e JWT para autenticação.
- Jest e Supertest para testes de integração.

## Instalação e execução local

Pré-requisitos: Node.js compatível com as dependências do projeto e Yarn Classic (lockfile v1). A versão do Node ainda não está fixada no repositório. PostgreSQL é necessário apenas para produção.

Na raiz do projeto:

```bash
yarn install --frozen-lockfile
cp .env.example .env
```

Edite o `.env`:

```dotenv
PORT=3333
NODE_ENV=development
IS_LOCALHOST=false
ENABLED_CORS=http://localhost:3000
JWT_SECRET=substitua-por-uma-chave-longa-aleatoria
```

Uma chave pode ser gerada com `openssl rand -hex 32`. Não publique o `.env` ou credenciais no repositório.

Inicie a aplicação:

```bash
yarn start
```

A API estará disponível em `http://localhost:3333`. Para verificar:

```bash
curl http://localhost:3333/
```

Resposta: `Olá, DEV!`.

Com `IS_LOCALHOST=false`, a inicialização executa migrations e seeds antes de abrir a porta. Se a preparação do banco falhar, o servidor não inicia. O banco local é salvo em `database.sqlite` na raiz.

## Variáveis de ambiente

| Variável | Descrição |
| --- | --- |
| `PORT` | Porta HTTP. Padrão: `3333`. |
| `NODE_ENV` | `production` usa PostgreSQL; `test` usa SQLite em memória; os demais valores usam SQLite em arquivo. |
| `IS_LOCALHOST` | Somente o valor literal `true` desativa migrations e seeds automáticas na inicialização. Não seleciona o banco. |
| `ENABLED_CORS` | Origens permitidas, separadas por `;`, como `http://localhost:3000;https://exemplo.com`. Vazio não libera origens no navegador. |
| `JWT_SECRET` | Segredo para assinar e verificar tokens. Necessário para login e acesso autenticado. |
| `DATABASE_HOST` | Host do PostgreSQL de produção. |
| `DATABASE_USER` | Usuário do PostgreSQL. |
| `DATABASE_NAME` | Nome do banco PostgreSQL, que deve existir previamente. |
| `DATABASE_PORT` | Porta do PostgreSQL. Padrão: `5432`. |
| `DATABASE_PASSWORD` | Senha do PostgreSQL. |

## Autenticação

Envie corpos JSON com `Content-Type: application/json`.

### Cadastrar usuário

```bash
curl -X POST http://localhost:3333/cadastrar \
  -H 'Content-Type: application/json' \
  -d '{"nome":"Maria Silva","email":"maria@example.com","senha":"senha123"}'
```

Campos obrigatórios: `nome` com pelo menos 3 caracteres, email válido com pelo menos 5 caracteres e `senha` com pelo menos 6 caracteres. O email deve ser único.

Sucesso: **201**, com o ID numérico do usuário no corpo, por exemplo `1`. A senha é armazenada como hash.

### Entrar

```bash
curl -X POST http://localhost:3333/entrar \
  -H 'Content-Type: application/json' \
  -d '{"email":"maria@example.com","senha":"senha123"}'
```

Sucesso: **200**:

```json
{
  "accessToken": "<token-jwt>"
}
```

O token expira em 24 horas. Nas rotas protegidas, envie:

```http
Authorization: Bearer <token-jwt>
```

## Endpoints

As URLs abaixo são relativas à raiz da API, sem prefixo `/api`.

| Método | Rota | Autenticação | Resposta de sucesso |
| --- | --- | --- | --- |
| GET | `/` | Não | 200, texto `Olá, DEV!` |
| POST | `/cadastrar` | Não | 201, ID do usuário |
| POST | `/entrar` | Não | 200, objeto com `accessToken` |
| GET | `/cidades` | Sim | 200, array de cidades |
| GET | `/cidades/:id` | Sim | 200, cidade |
| POST | `/cidades` | Sim | 201, ID da cidade |
| PUT | `/cidades/:id` | Sim | 204, sem corpo |
| DELETE | `/cidades/:id` | Sim | 204, sem corpo |
| GET | `/pessoas` | Sim | 200, array de pessoas |
| GET | `/pessoas/:id` | Sim | 200, pessoa |
| POST | `/pessoas` | Sim | 201, ID da pessoa |
| PUT | `/pessoas/:id` | Sim | 204, sem corpo |
| DELETE | `/pessoas/:id` | Sim | 204, sem corpo |

Os parâmetros `:id` devem ser números inteiros positivos.

### Cidades

Corpo de criação e atualização:

```json
{
  "nome": "Porto Alegre"
}
```

O nome é obrigatório e deve ter pelo menos 3 caracteres. Na criação, a validação também limita o nome a 150 caracteres; a coluna do banco tem esse limite para todas as operações.

Uma cidade retornada contém `id` e `nome`. Não é possível excluir uma cidade vinculada a pessoas, devido à restrição de chave estrangeira.

### Pessoas

Corpo de criação e atualização (todos os campos são obrigatórios):

```json
{
  "nomeCompleto": "Maria Silva",
  "email": "maria.pessoa@example.com",
  "cidadeId": 1
}
```

`nomeCompleto` deve ter pelo menos 3 caracteres, `email` deve ser válido e único entre pessoas, e `cidadeId` deve ser inteiro e referenciar uma cidade existente. A resposta de consulta inclui também o campo `id`.

### Paginação e filtros

As listagens de cidades e pessoas aceitam:

| Parâmetro | Padrão | Descrição |
| --- | --- | --- |
| `page` | `1` | Página, maior que zero. |
| `limit` | `7` | Quantidade por página, maior que zero. |
| `filter` | Texto vazio | Busca parcial por `nome` em cidades ou `nomeCompleto` em pessoas. |

Exemplo autenticado:

```bash
curl 'http://localhost:3333/pessoas?page=1&limit=10&filter=Maria' \
  -H 'Authorization: Bearer <token-jwt>'
```

O corpo é um array. O cabeçalho `x-total-count` informa a quantidade de registros que correspondem ao filtro, antes da paginação.

Em `/cidades`, o parâmetro opcional `id` permite incluir uma cidade específica junto aos resultados, mesmo que ela fique fora da página ou do filtro. Nessa situação, a resposta pode ultrapassar `limit`, e `x-total-count` continua contando somente o filtro por nome.

### Erros

Erros de validação retornam **400**, agrupados pela origem do dado:

```json
{
  "errors": {
    "body": {
      "nome": "Este campo é obrigatório"
    }
  }
}
```

Falhas de autenticação retornam **401**. Outros erros usam o formato:

```json
{
  "errors": {
    "default": "Registro não encontrado"
  }
}
```

Na implementação atual, erros dos providers, incluindo registro inexistente, email duplicado e conflitos de relacionamento, retornam **500**. Credenciais incorretas no login retornam **401**. Ausência de `JWT_SECRET` ao gerar ou verificar tokens retorna **500**.

## Banco de dados

As migrations criam as tabelas `cidade`, `pessoa` e `usuario`. Pessoas possuem uma chave estrangeira para cidades; usuários de autenticação são registros separados das pessoas.

Comandos manuais para desenvolvimento:

```bash
yarn knex:migrate --env development
yarn knex:seed --env development
```

O seed contém cidades do Rio Grande do Sul e tenta preenchê-las quando a tabela está vazia. Atualmente ele verifica `Number.isInteger(count)` antes da conversão; se o driver retornar a contagem como string, o preenchimento será ignorado.

Para desfazer migrations:

```bash
yarn knex:rollback --env development
yarn knex:rollback-all --env development
```

Rollback remove as tabelas correspondentes e seus dados. Os scripts da CLI apontam para arquivos TypeScript em `src`; no ambiente compilado, a inicialização da aplicação usa as migrations em `build`.

## Testes e verificação de tipos

```bash
yarn test --runInBand
yarn test tests/usuarios/SignUp.test.ts --runInBand
yarn test --watch
```

O Jest utiliza `ts-jest` e Supertest. O setup executa migrations e seeds e encerra a conexão ao final de cada suíte. O banco de testes é SQLite em memória; o Jest define `NODE_ENV=test` quando a variável não foi definida externamente. Não execute testes com `NODE_ENV=production` ou apontando para bancos reais.

Defina um `JWT_SECRET` de teste no ambiente ou no `.env`, pois o setup não fornece um automaticamente. O relatório de cobertura JSON é gerado em `coverage/coverage-final.json`.

Para verificar tipos sem gerar arquivos:

```bash
yarn tsc --project tsconfig.json --noEmit
yarn tsc --project tests/tsconfig.json --noEmit
```

`tests/tsconfig.json` permite que o editor reconheça os tipos do Jest. Se os diagnósticos permanecerem após alterar configurações, reinicie o servidor TypeScript do editor.

## Build e produção

Instale também as dependências de desenvolvimento durante o build, pois elas contêm o compilador TypeScript:

```bash
yarn install --frozen-lockfile --production=false
yarn build
```

Configure as variáveis no ambiente da hospedagem:

```dotenv
NODE_ENV=production
PORT=8080
IS_LOCALHOST=false
ENABLED_CORS=https://seu-frontend.com
JWT_SECRET=substitua-por-uma-chave-longa-aleatoria
DATABASE_HOST=host-do-postgres
DATABASE_USER=usuario
DATABASE_NAME=nome-do-banco
DATABASE_PORT=5432
DATABASE_PASSWORD=senha-do-banco
```

Use a porta e as credenciais fornecidas pelo seu banco. Inicie com:

```bash
yarn production
```

Esse comando executa `build/index.js`. O servidor precisa acessar o PostgreSQL e ter permissão para executar migrations e seeds quando `IS_LOCALHOST` não for `true`. Se desativar a preparação automática, prepare o banco antes de iniciar.

Para uma hospedagem que aceite comandos de build e execução, use:

| Configuração | Valor |
| --- | --- |
| Build | `yarn install --frozen-lockfile --production=false && yarn build` |
| Inicialização | `yarn production` |
| Porta HTTP | Mesmo valor de `PORT`, por exemplo `8080` |

A configuração atual do PostgreSQL habilita SSL com `rejectUnauthorized: false`. Ajuste a validação do certificado conforme o provedor antes de usar dados sensíveis em produção.

## Estrutura

```text
src/
  index.ts                 # Preparação do banco e inicialização HTTP
  server/
    Server.ts              # Express, CORS e middlewares
    routes/                # Rotas públicas e protegidas
    controllers/           # Validação e respostas HTTP
    database/
      knex/                # Conexões por ambiente
      migrations/          # Estrutura das tabelas
      seeds/               # Dados iniciais
      models/              # Interfaces das entidades
      providers/           # Consultas e persistência
    shared/
      middleware/          # Autenticação e validação
      services/            # JWT, senhas e traduções do Yup
tests/
  cidades/
  pessoas/
  usuarios/
  jest.setup.ts            # Preparação das suítes
```

## Limitações atuais

- As listagens não definem uma ordenação explícita nem um limite máximo de registros por página.
- A validação não remove campos extras do corpo antes de enviá-lo aos providers.
- A configuração `.eslintrc.json` precisa ser migrada para o formato `eslint.config.*` exigido pela versão instalada do ESLint.

## Licença

MIT, conforme declarado no `package.json`.
