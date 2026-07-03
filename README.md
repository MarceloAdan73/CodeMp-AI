# CodeMp-AI

AI-powered code analysis and automatic code fixing tool that combines **ESLint** (JS/TS) and **Ruff** (Python) with multi-provider AI support via **SantanderAI/llm_bridge** microservice.

## Features

- **Code editor** with support for TypeScript, TSX, JavaScript, and Python
- **ESLint analysis** for JavaScript/TypeScript with automatic fixes
- **Ruff analysis** for Python with automatic fixes
- **AI model selector** — elige proveedor desde la UI (Auto, Ollama, Gemini, Claude)
- **Multi-provider AI** (Ollama, Gemini, Claude, Grok) for intelligent suggestions
- **llm_bridge microservice** (Python) as unified AI backend
- **Preview changes** before applying corrections
- **Export reports** to Markdown
- **Auto-detect language** when pasting code
- **Persistent history** of analyses (last 5)
- **Direct navigation** from errors to code lines
- **Responsive** for desktop and mobile
- **Demo/Mock mode** when no AI provider is available
- **Provider error feedback** — mensajes claros si falla un proveedor (key inválida, servidor caído, etc.)
- **Backend Python tests** (pytest) + Frontend tests (Jest)

## Requirements

- [Node.js](https://nodejs.org/) 18+
- [Python](https://python.org/) 3.9+
- [Ollama](https://ollama.com/download) (optional — for local AI)

## Installation

### 1. Backend (Python microservice)

```bash
cd backend
python -m venv venv
source venv/Scripts/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install ruff              # Python linter
python app.py
```

Microservice at `http://localhost:5000`.

### 2. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 3. Quick Start (both services)

```bash
# Terminal 1: Backend
cd backend && source venv/Scripts/activate && python app.py

# Terminal 2: Frontend
cd frontend && npm run dev
```

### 4. Configure API Keys (optional)

- **Gemini**: Create a free API key at https://aistudio.google.com/apikey
- **Claude**: Set `ANTHROPIC_API_KEY` in `backend/.env`
- **Ollama**: No key needed (local), run `ollama pull qwen2.5-coder:1.5b`

Edit `backend/.env` and `frontend/.env.local`:

```env
GEMINI_API_KEY=tu_key_aqui
```

## Architecture

```
┌──────────────┐     POST /api/analyze     ┌──────────────────────┐
│              │  ──────────────────────▶  │                      │
│   Frontend   │                           │  Next.js API Route   │
│  (Next.js)   │  ◀──────────────────────  │  (route.ts)          │
│              │       JSON Response       │                      │
└──────────────┘                           └──────────┬───────────┘
                                                      │
                                              POST /chat
                                                      │
                                                      ▼
                                       ┌──────────────────────┐
                                       │                      │
                                       │  llm_bridge Service  │
                                       │  (Python/Flask)      │
                                       │  :5000               │
                                       │                      │
                                       └──┬──────┬──────┬─────┘
                                          │      │      │
                             ┌────────────┘      │      └────────────┐
                             ▼                    ▼                   ▼
                     ┌──────────────┐   ┌──────────────┐   ┌────────────────┐
                     │   Ollama     │   │    Gemini    │   │ Claude / Grok  │
                     │   (local)    │   │   (cloud)    │   │    (cloud)     │
                     └──────────────┘   └──────────────┘   └────────────────┘
```

## Usage

1. Select a programming language (TypeScript, TSX, JavaScript, Python)
2. Choose AI provider from the dropdown (Auto, Ollama, Gemini, or Claude)
3. Write or paste your code — language auto-detects
4. Press `Run Analysis` or `Ctrl+Enter`
5. Review errors in the right panel
6. Use `Preview Changes` to see diffs or `Apply Fix` to apply
7. Export report with 📄 button
8. History with `Ctrl+H`

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Analyze code |
| `Ctrl+H` | View history |
| `ESC` | Close modal |

## AI Providers

### Auth & Error Messages

| Provider | How to configure | Si falla, muestra |
|----------|-----------------|-------------------|
| **Mock** | None | — |
| **Ollama** | `ollama pull qwen2.5-coder:1.5b` | "Ollama: servidor no disponible. ¿Está corriendo?" |
| **Gemini** | `GEMINI_API_KEY` en `.env` | "Gemini: API key inválida. Conseguí una gratis en https://aistudio.google.com/apikey" |
| **Claude** | `ANTHROPIC_API_KEY` en `.env` | "Claude: API key no configurada o inválida" |
| **Grok** | `XAI_API_KEY` en `.env` | "Grok: API key no configurada o inválida" |

### Default models

| Provider | Default model |
|----------|--------------|
| Ollama | `qwen2.5-coder:1.5b` |
| Gemini | `gemini-2.0-flash` |
| Claude | `claude-sonnet-4-20250514` |
| Grok | `grok-3-mini-fast-latest` |

### Error scenarios detectadas

- API key inválida o vencida → mensaje claro con link para obtener key gratis
- Servidor no disponible (Ollama caído) → mensaje de conexión
- Cuota agotada (rate limit) → mensaje de espera
- Autenticación fallida → mensaje de revisar key

## Linting

### ESLint (JavaScript / TypeScript)

Rules: `semi`, `quotes`, `indent`, `no-var`, `prefer-const`, `no-unused-vars`, `eqeqeq`.

### Ruff (Python)

Default ruleset (F, E, W). Auto-fixes unused imports, unused variables, PEP 8 style.

## Project Structure

```
CodeMp-AI/
├── backend/
│   ├── app.py                   # Flask API (/chat, /health, /lint)
│   ├── requirements.txt         # Python dependencies
│   ├── .env                     # API keys config
│   ├── tests/
│   │   └── test_service.py      # 7 tests (pytest)
│   └── venv/                    # Virtual environment
├── frontend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analyze/route.ts # ESLint/Ruff + AI pipeline
│   │   │   └── health/route.ts  # AI health check
│   │   ├── page.tsx             # Main UI
│   │   └── layout.tsx           # Server layout with metadata
│   ├── components/
│   │   ├── CodeEditor.tsx       # CodeMirror 6 editor
│   │   ├── DiffViewer.tsx       # Changes diff viewer
│   │   ├── AnalysisSkeleton.tsx # 3-stage loading animation
│   │   └── DemoBanner.tsx       # Provider error/demo banner
│   ├── __tests__/               # Jest tests
│   └── package.json             # Uses --webpack flag
├── .github/workflows/ci.yml
└── README.md
```

## What remains to test

- [ ] Probar Ollama local con `ollama pull qwen2.5-coder:1.5b` y verificar que Apply Fix funcione
- [ ] Configurar `ANTHROPIC_API_KEY` y probar Claude
- [ ] Configurar `XAI_API_KEY` y probar Grok
- [ ] Probar modo "Auto" fallback (ej: Ollama caído → Gemini → Claude)
- [ ] Verificar que el export de reportes funcione con providers reales (no solo demo)
- [ ] Probar en mobile (responsive)

## Known Issues

- Turbopack requiere CPU con soporte BMI2 → el script `dev` usa `--webpack` por defecto
- Gemini API key actual (`[REDACTED]`) tiene cuota agotada (resource_exhausted)
- Ollama necesita `api_key='ollama'` dummy en el backend (solución implementada)

## Technologies

- **Next.js 16** (con Webpack, no Turbopack)
- **TypeScript** + **Tailwind CSS**
- **CodeMirror 6** - Editor
- **ESLint 9** - JS/TS linting
- **Ruff** - Python linting
- **Python 3 + Flask** - Backend microservice
- **SantanderAI/llm_bridge** - LLM client library
- **Framer Motion** - Animations

## License

[MIT](LICENSE) - Marcelo Palma
