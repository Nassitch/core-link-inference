[🇬🇧 English](../../README.md)

# Core Link Inference - v0.0.1

Une **micro-API NestJS** pour Ollama utilisant **Bun** comme runtime. Elle propose une interface API multi-format avec
des endpoints compatibles OpenAI pour accéder aux modèles Ollama locaux depuis n'importe quel appareil sur le même
réseau local.

---

## Installation

```bash
bun install
```

---

## Exécution de l'API

```bash
# Mode développement
bun run dev

# Construction uniquement
bun run build

# Production
bun run start:prod
```

---

## Endpoints API

### Vérification de santé

`GET /health` - Point de vérification de santé

---

### Endpoints Ollama

#### Chat/Complétion - Format compatible OpenAI

`POST /v1/chat/completions` - Endpoint de complétion de chat compatible OpenAI

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

---

#### Modèles

`GET /v1/models` - Liste des modèles disponibles

```bash
curl http://localhost:8000/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

`GET /v1/models/:modelId` - Détails d'un modèle spécifique

```bash
curl http://localhost:8000/v1/models/llama2 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

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

---

#### Réponses Personnalisées

`POST /v1/responses` - Endpoint de réponse étendu avec support du streaming

```bash
curl -X POST http://localhost:8000/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "llama2",
    "input": "Hello world"
  }'
```

---

## Configuration

Variables d'environnement requises dans le fichier `.env` :

```
PORT=8000           # Port du serveur
HOST=0.0.0.0        # Adresse du serveur
API_KEY=your_secret_key  # Clé d'authentification
OLLAMA_URL=http://localhost:11434  # URL du serveur Ollama
```

---

## Architecture

```
_core_link_inference/
├── src/
│   ├── app.module.ts                # Module principal NestJS
│   ├── main.ts                      # Configuration du serveur et gardes globaux
│   ├── guards/
│   │   └── auth.guard.ts            # Garde d'authentification avec token Bearer
│   └── modules/
│       ├── health/
│       │   ├── health.controller.ts # Contrôleur de vérification de santé
│       │   └── health.module.ts     # Module de vérification de santé
│       ├── openai/
│       │   ├── openai.controller.ts # Endpoints compatibles OpenAI
│       │   ├── openai.module.ts     # Module wrapper OpenAI
│       │   └── ollama.service.ts    # Service Ollama
│       └── ollama/
│           └── ollama.service.ts    # Service Ollama
├── dist/                            # Fichiers compilés en JS
├── package.json
├── .env
├── nest-cli.json
└── tsconfig.json
```

---

## Philosophie de Développement

- **Architecture modulaire** organisée par fonctionnalité
- **Support multi-format API** (OpenAI, personnalisé, streaming)
- **Authentification sécurisée** avec tokens Bearer
- **Code propre et maintenable** avec les décorateurs NestJS
- **TypeScript** pour la sécurité des types
- **Extensible** et complet en fonctionnalités
- **Tests complets** avec Jest

---

## Authentification

Tous les endpoints API nécessitent une **authentification par token Bearer** via l'en-tête `Authorization` :

```
Authorization: Bearer YOUR_API_KEY
```

---

## Stack Technique

- **Runtime** : Bun
- **Framework** : NestJS
- **Langage** : TypeScript (ES2022)
- **Modules** : ES Modules (Nodenext)
- **Client HTTP** : Fetch natif / Node.js
- **Authentification** : Tokens Bearer

---