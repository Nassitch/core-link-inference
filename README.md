English | [Français](README-FR.md)

# Core Link Inference - v0.0.1

A **NestJS micro API** for Ollama using **Bun runtime**. Provides a multi-format API interface with OpenAI-compatible
endpoints to access local Ollama models from any device on the same local network.

---

## Installation

```bash
bun install
```

---

## Running the API

```bash
# Development mode
bun run dev

# Build only
bun run build

# Production
bun run start:prod
```

---

## API Endpoints

### Health Check

`GET /health` - Health check endpoint

---

### Ollama Endpoints

#### Chat/Completion - OpenAI-Compatible Format

`POST /v1/chat/completions` - OpenAI-compatible chat completion endpoint

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

`POST /v1/completions` - Text completion endpoint

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

#### Models

`GET /v1/models` - List available models

```bash
curl http://localhost:8000/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

`GET /v1/models/:modelId` - Get details for a specific model

```bash
curl http://localhost:8000/v1/models/llama2 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

#### Embeddings

`POST /v1/embeddings` - Generate embeddings

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

#### Custom Responses

`POST /v1/responses` - Extended response endpoint with streaming support

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

Required environment variables in `.env`:

```
PORT=8000           # Server port
HOST=0.0.0.0        # Server host
API_KEY=your_secret_key  # Authentication token
OLLAMA_URL=http://localhost:11434  # Ollama server URL
```

---

## Architecture

```
_core_link_inference/
├── src/
│   ├── app.module.ts                # Root NestJS module
│   ├── main.ts                      # Server setup and global guards
│   ├── guards/
│   │   └── auth.guard.ts            # Bearer token authentication guard
│   └── modules/
│       ├── health/
│       │   ├── health.controller.ts # Health endpoint
│       │   └── health.module.ts     # Health module
│       ├── openai/
│       │   ├── openai.controller.ts # OpenAI-compatible endpoints
│       │   ├── openai.module.ts     # OpenAI wrapper module
│       │   └── ollama.service.ts    # Ollama service
│       └── ollama/
│           └── ollama.service.ts    # Ollama service
├── dist/                            # Compiled JS
├── package.json
├── .env
├── nest-cli.json
└── tsconfig.json
```

---

## Development Philosophy

- **Modular architecture** organized by functionality
- **Multi-format API support** (OpenAI, custom, streaming)
- **Secure authentication** with Bearer tokens
- **Clean, maintainable code** with NestJS decorators
- **TypeScript** for type safety
- **Extensible** and feature-complete

---

## Authentication

All API endpoints require **Bearer token authentication** via the `Authorization` header:

```
Authorization: Bearer YOUR_API_KEY
```

---

## Tech Stack

- **Runtime**: Bun
- **Framework**: NestJS
- **Language**: TypeScript (ES2022)
- **Modules**: ES Modules (Nodenext)
- **HTTP Client**: Native Fetch / Node.js
- **Auth**: Bearer Tokens

---