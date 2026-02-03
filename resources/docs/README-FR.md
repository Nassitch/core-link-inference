[🇬🇧 English](../../README.md)

# Core Link Inference - v0.0.1

API NestJS micro pour Ollama avec Bun runtime. Interface d'API multi-format incluant des endpoints compatibles avec l'
API OpenAI pour des modèles Ollama locaux accessibles depuis n'importe quel périphérique sur le même réseau local.

## Installation

```bash
bun install
```

## Démarrage

```bash
# Mode développement
bun run dev

# Build uniquement
bun run build

# Production
bun run start:prod
```

## Endpoints API

### Santé

`GET /health` - Point de contrôle de santé

### Endpoints Ollama

#### Chat / Complétion - Format OpenAI Compatible

`POST /v1/chat/completions` - Endpoint de complétion de chat compatible avec l'API OpenAI

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "llama2",
    "messages": [{"role": "user", "content": "Hello!"}],
    "temperature": 0.7
  }'
```

`POST /v1/completions` - Endpoint de complétion de texte

```bash
curl -X POST http://localhost:8000/v1/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "llama2",
    "prompt": "Hello world"
  }'
```

#### Modèles

`GET /v1/models` - Liste des modèles disponibles

```bash
curl http://localhost:8000/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

`GET /v1/models/:modelId` - Informations sur un modèle spécifique

```bash
curl http://localhost:8000/v1/models/llama2 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### Embeddings

`POST /v1/embeddings` - Génération d'embeddings

```bash
curl -X POST http://localhost:8000/v1/embeddings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "llama2",
    "input": "Hello world"
  }'
```

#### Réponses Custom

`POST /v1/responses` - Endpoint de réponses étendu avec support de streaming

```bash
curl -X POST http://localhost:8000/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "llama2",
    "input": "Hello world"
  }'
```

## Configuration

Variable d'environnement requise pour le fichier `.env` :

```
PORT=8000           # Port du serveur
HOST=0.0.0.0        # Host du serveur
API_key=your_secret_key  # Token d'authentification
OLLAMA_URL=http://localhost:11434  # URL du serveur Ollama
```

## Architecture

```
_core_link_inference/
├── src/
│   ├── app.module.ts                # Module racine NestJS
│   ├── main.ts                      # Serveur setup et guards globaux
│   ├── guards/
│   │   └── auth.guard.ts            # Guard d'authentification (Bearer token)
│   └── modules/
│       ├── health/
│       │   ├── health.controller.ts # Endpoint de santé
│       │   └── health.module.ts     # Module de santé
│       ├── openai/
│       │   ├── openai.controller.ts # Endpoints OpenAI compatible
│       │   ├── openai.module.ts     # Module wrapper OpenAI
│       │   └── ollama.service.ts    # Service Ollama
│       └── ollama/
│           └── ollama.service.ts    # Service Ollama
├── dist/                            # Compilation JS
├── package.json
├── .env
├── nest-cli.json
└── tsconfig.json
```

## Développement

### Philosophie

- Architecture modulaire avec organisation par fonctionnalité
- Support de plusieurs formats API (OpenAI, custom, streaming)
- Authentification sécurisée avec Bearer tokens
- Structure de code propre et maintenable
- TypeScript pour la sécurité des types
- Développement structuré avec decorators NestJS
- Focus sur l'extensibilité et la complétude des fonctionnalités

## Authentification

Tous les endpoints API nécessitent l'authentification Bearer token via l'en-tête `Authorization`.

```
Authorization: Bearer YOUR_API_KEY
```

## Tech Stack

- **Runtime** : Bun
- **Framework** : NestJS
- **TypeScript** : ES2022
- **Module** : ES modules (nodenext)
- **Client HTTP** : Fetch native / Node.js
- **Auth** : Bearer tokens