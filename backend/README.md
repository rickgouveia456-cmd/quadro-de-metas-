# Backend — Quadro de Metas

API REST em **PHP 8.3** + **MariaDB 11**, containerizada com **Docker**.

## Estrutura

```
backend/
├── api/
│   ├── core/
│   │   ├── db.php          → conexão PDO
│   │   └── helpers.php     → json(), err(), authUser(), setCors()
│   ├── routes/
│   │   ├── auth.php        → POST /auth/login, logout, GET /auth/me
│   │   ├── obras.php       → CRUD /obras
│   │   ├── metas.php       → GET/POST /metas, POST /metas/batch
│   │   ├── historico.php   → GET/DELETE /historico
│   │   ├── restricoes.php  → CRUD /restricoes
│   │   └── feriados.php    → CRUD /feriados
│   ├── .htaccess
│   └── index.php           → router principal
├── db/
│   ├── schema.sql          → criação das tabelas
│   └── seed.sql            → usuários e obras padrão
├── docker-compose.yml
├── Dockerfile
└── railway.json
```

## Rodar localmente

```bash
# 1. Copie o .env
cp .env.example .env

# 2. Suba os containers (com phpMyAdmin para dev)
docker compose --profile dev up -d

# API:       http://localhost:8080/api
# phpMyAdmin: http://localhost:8081
```

## Rodar no Railway

1. Crie um serviço MariaDB no Railway
2. Importe `db/schema.sql` e `db/seed.sql`
3. Configure as variáveis de ambiente:
   - `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
   - `APP_SECRET` (string aleatória longa)
4. Faça deploy do backend (este diretório)

## Credenciais padrão

| Perfil       | Senha        |
|--------------|--------------|
| admin        | Admin@2026   |
| engenheiro   | Eng@2026     |
| mestre       | Mestre@2026  |
| encarregado  | Enc@2026     |

> ⚠️ Troque as senhas depois do primeiro acesso via phpMyAdmin.

## Endpoints

| Método | Rota                  | Descrição                    | Auth         |
|--------|-----------------------|------------------------------|--------------|
| POST   | /api/auth/login       | Login                        | Pública      |
| POST   | /api/auth/logout      | Logout                       | Token        |
| GET    | /api/auth/me          | Usuário atual                | Token        |
| GET    | /api/obras            | Listar obras                 | Token        |
| POST   | /api/obras            | Criar obra                   | admin/eng    |
| PUT    | /api/obras/{cod}      | Atualizar obra               | admin/eng    |
| DELETE | /api/obras/{cod}      | Desativar obra               | admin        |
| GET    | /api/metas?obra=TC    | Estado completo da obra      | Token        |
| POST   | /api/metas            | Salvar uma meta              | Token        |
| POST   | /api/metas/batch      | Salvar lote (sync)           | Token        |
| GET    | /api/historico?obra=  | Histórico de alterações      | Token        |
| GET    | /api/restricoes?obra= | Listar restrições            | Token        |
| POST   | /api/restricoes       | Criar restrição              | admin/eng/mestre |
| GET    | /api/feriados         | Feriados customizados        | Token        |
| GET    | /api/health           | Health check                 | Pública      |
