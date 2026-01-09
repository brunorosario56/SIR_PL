# Classmate Sync API

API em Node.js + Express + MongoDB para gerir utilizadores, horários, grupos e eventos de estudo.

## Requisitos

- Node.js (recomendado: LTS)
- npm
- MongoDB (uma das opções):
  - MongoDB local instalado
  - Docker (para correr MongoDB em container)

## Variáveis de ambiente

Este projeto usa um ficheiro `.env` (já existe no repositório).

Variáveis usadas:

- `MONGO_URI` (ex.: `mongodb://localhost:27017/classmate_sync`)
- `JWT_SECRET` (string secreta para assinar/verificar JWT)
- `PORT` (opcional; por defeito `3000`)

## Como correr

### macOS / Linux

1. Instalar dependências:

```bash
npm install
```

2. Garantir que o MongoDB está a correr (local ou Docker).

3. Arrancar em modo dev:

```bash
npm run dev
```

### Windows

1. Instalar dependências:

```powershell
npm install
```

2. Garantir que o MongoDB está a correr (local ou Docker).

3. Arrancar em modo dev:

```powershell
npm run dev
```

Nota: se estiveres a usar PowerShell e apanhares o erro “running scripts is disabled”, podes:
- correr `npm` via `cmd.exe` (Command Prompt), ou
- usar `npm.cmd` (ex.: `npm.cmd run dev`), ou
- ajustar a ExecutionPolicy (apenas se fizer sentido no teu ambiente).

### MongoDB via Docker (opcional)

```bash
docker run --name classmate-sync-mongo -p 27017:27017 -d mongo:6
```

## Endpoints principais

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### Horários

- `GET /schedules/me`
- `PUT /schedules/me`
- `POST /schedules/compare` *(listado na especificação do projeto; atualmente não existe no código)*

### Colegas

- `POST /users/me/colegas`
- `GET /users/me/colegas`

### Grupos

- `POST /groups`
- `GET /groups/me`
- `POST /groups/:id/members`
- `GET /groups/:id/slots`

### Eventos

- `POST /groups/:id/events`
- `GET /groups/:id/events`

(Opcional)

- `GET /events/me`
