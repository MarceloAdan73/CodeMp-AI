# Análisis Completo de CodeMp-AI (Todas las Ramas)

**Fecha:** 2026-06-20
**Ruta local:** `C:\Users\Marcelo\dev\CodeMp-AI`
**Repositorio remoto:** `https://github.com/MarceloAdan73/CodeMp-AI`

---

## 1. Informe de Ramas

### 1.1 Listado de Ramas

| Rama | Propósito | Commits |
|------|-----------|---------|
| **`master`** | Rama de producción/estable | 16 commits |
| **`dev`** | Rama de desarrollo con nuevas funcionalidades | 18 commits (2 ahead de master) |
| `origin/vercel/react-server-components-cve-vu-650i3l` | Rama temporal de Vercel para fix de seguridad (CVE) | 1 commit sobre master |

### 1.2 Rama por Defecto
La rama por defecto es **`master`**. La rama activa actualmente en local es **`dev`**.

### 1.3 Historial de Commits (ordenado)

```
c3be937 Initial commit
34543b8 docs: translate README to English
a561271 docs: add MIT LICENSE file
7757e9e docs: update LICENSE year to 2026
eba7eaa fix: remove unused ollamaAvailable variable
3d8b4cd config: ignore ESLint errors during build
08d8b1e (vercel) Fix React Server Components CVE vulnerabilities
9bdb0ac docs: update demo URL
8eb061c fix: correct ESLint config path for Vercel, add debug logs
a0a8695 fix: use baseConfig instead of overrideConfigFile for ESLint
8ded719 fix: remove unused path import
7e44891 fix: use overrideConfig instead of eslint.config.js
37426ec fix: remove eslint.config.js to avoid module loading error
c9ac1ab chore: update to Next.js 16, fix config for new version
0670732 feat: improve header responsiveness for mobile
a95b499 feat: add text labels to header buttons on mobile
4bac7d8 Add 10 unit tests + CI/CD workflow with green badge     ← master HEAD
eb042a0 refactor: organize AI providers into separate functions  ← dev
74b14ca feat: implement Gemini as fallback AI provider           ← dev HEAD
```

### 1.4 Diferencias Clave: `dev` vs `master`

| Aspecto | `master` | `dev` |
|---------|----------|-------|
| **Archivos modificados** | — | `route.ts`, `package.json`, `package-lock.json` |
| **Archivos nuevos** | — | Ninguno |
| **Archivos eliminados** | — | Ninguno |
| **Proveedor IA** | Solo Ollama | Ollama + Gemini (fallback automático) |
| **Estructura del código** | Monolítico en `POST` | Funciones separadas por responsabilidad |
| **Dependencias** | — | `@google/generative-ai` añadido |
| **Tests** | 6 archivos de test | Heredados de master (sin cambios) |

---

## 2. Análisis de Estructura y Dependencias

### 2.1 Estructura de Archivos (idéntica en master y dev)

```
CodeMp-AI/
├── .github/workflows/ci.yml          # CI/CD con GitHub Actions
├── .gitignore
├── LICENSE                            # MIT
├── README.md                          # Documentación principal
├── frontend/                          # Aplicación Next.js
│   ├── __tests__/                     # Tests unitarios (Jest)
│   │   ├── AnalysisButtons.test.tsx
│   │   ├── CodeEditor.test.tsx
│   │   ├── ErrorHandling.test.tsx
│   │   ├── LanguageDetection.test.tsx
│   │   ├── OllamaAPI.test.tsx
│   │   └── OllamaCommunication.test.tsx
│   ├── app/
│   │   ├── api/
│   │   │   ├── analyze/route.ts       # ★ Núcleo: IA + ESLint
│   │   │   └── health/route.ts        # Health check de Ollama
│   │   ├── favicon.ico
│   │   ├── globals.css                # Estilos globales + Tailwind
│   │   ├── layout.tsx                 # Layout principal
│   │   └── page.tsx                   # Página principal
│   ├── components/
│   │   ├── AnalysisSkeleton.tsx       # Skeleton de carga animado
│   │   ├── CodeEditor.tsx             # Editor CodeMirror 6
│   │   ├── DemoBanner.tsx             # Banner de modo demo
│   │   └── DiffViewer.tsx             # Visor de cambios (diff)
│   ├── hooks/
│   │   └── useTheme.tsx              # Provider de tema (dark/light)
│   ├── public/                        # Assets e imágenes
│   ├── package.json                   # Dependencias
│   ├── tsconfig.json                  # Config TypeScript
│   ├── next.config.ts                 # Config Next.js
│   ├── jest.config.ts                 # Config Jest
│   ├── jest.setup.ts                  # Setup de Jest
│   └── postcss.config.mjs             # Config PostCSS/Tailwind
```

### 2.2 Dependencias Principales (package.json)

| Dependencia | Propósito |
|-------------|-----------|
| `next` ^16.2.0 | Framework React (App Router) |
| `react` / `react-dom` ^18.3.1 | UI library |
| `eslint` ^9.24.0 | Linter de código (ejecutado en servidor) |
| `@codemirror/lang-javascript` ^6.2.4 | Editor de código JS/TS |
| `@codemirror/lang-python` ^6.2.1 | Editor de código Python |
| `@uiw/react-codemirror` ^4.25.5 | Wrapper React para CodeMirror |
| `framer-motion` ^12.36.0 | Animaciones UI |
| `react-diff-viewer-continued` ^4.1.2 | Visor de diferencias (diff) |
| **`@google/generative-ai` ^0.24.1** | ★ SDK de Gemini (SOLO en `dev`) |
| `@tailwindcss/postcss` ^4.1.4 | Estilos utility-first |
| `jest` / `@testing-library/*` | Tests unitarios |
| `@typescript-eslint/*` | Reglas ESLint para TypeScript |

---

## 3. Análisis de la Integración con IA

### 3.1 Arquitectura General

```
Usuario → CodeEditor (frontend)
              ↓ POST /api/analyze {code}
              ↓
        analyze/route.ts (Next.js API Route)
              ↓
        ① runESLint(code) → {errors, fixedCode}
              ↓
        ② ¿Hay errores?
              ├── No → Devolver fixedCode (solo ESLint)
              └── Sí → ¿Ollama disponible?
                          ├── Sí → analyzeWithOllama()
                          ├── No → analyzeWithGemini()  [SOLO dev]
                          └── No AI → Modo demo
              ↓
        ③ validateCorrection() [SOLO dev]
              ↓
        ④ Respuesta JSON → Frontend
```

### 3.2 Integración en `master` (Producción Actual)

**Archivo:** `frontend/app/api/analyze/route.ts` (191 líneas)

- **Llamada a Ollama:** POST directo a `http://localhost:11434/api/generate`
  - Modelo hardcodeado: `qwen2.5-coder:1.5b`
  - Prompt hardcodeado con instrucciones de linting
  - `stream: false`
- **Health check:** `isOllamaAvailable()` → `GET http://localhost:11434/api/tags` (timeout 2s)
- **Flujo:** ESLint → Ollama → devolución directa (sin validación posterior)
- **Modo demo:** Si Ollama no está disponible → mensaje informativo

### 3.3 Integración en `dev` (Desarrollo)

**Archivo:** `frontend/app/api/analyze/route.ts` (265 líneas, +74 líneas vs master)

**Cambios significativos:**

1. **Refactorización en funciones separadas:**
   - `checkOllamaAvailability()` (renombrado desde `isOllamaAvailable()`)
   - `runESLint(code)` (extraído, igual que master)
   - **`analyzeWithOllama(code, errors)`** (extraído de `callOllama()`)
   - **`analyzeWithGemini(code, errors, language?)`** ★ NUEVO
   - **`detectLanguage(code)`** ★ NUEVO (detecta JS, Python, Rust, Go, C)
   - **`validateCorrection(originalCode, correctedCode)`** ★ NUEVO

2. **Proveedor Gemini como fallback:**
   - SDK: `@google/generative-ai`
   - Modelo: `gemini-2.0-flash`
   - API Key: `process.env.GEMINI_API_KEY`
   - Se ejecuta SOLO si Ollama no está disponible
   - El prompt es similar al de Ollama pero incluye detección de lenguaje
   - Limpia bloques de código markdown (```) de la respuesta

3. **Lógica de selección de proveedor:**
   ```
   if (ollamaAvailable) → analyzeWithOllama()
   if (!usedProvider)   → analyzeWithGemini()
   if (!usedProvider)   → modo demo
   ```

4. **Validación de correcciones:**
   - Se ejecuta ESLint sobre el código corregido por la IA
   - Si introduce nuevos errores → se revierte al output de ESLint
   - Función `validateCorrection()` reutilizable

5. **Respuesta enriquecida:**
   - Nuevo campo `usedProvider: 'ollama' | 'gemini' | null`
   - Mensajes de resumen diferenciados por proveedor

### 3.4 Puntos de Entrada/Salida de la Lógica de IA

| Punto | Entrada | Salida |
|-------|---------|--------|
| `POST /api/analyze` | JSON `{code: string}` | JSON `{errores, resumen, codigoCorregido, mode, demoMessage}` |
| `GET /api/health` | — | JSON `{available: boolean}` |
| `analyzeWithOllama()` | `code: string, errors: LintMessage[]` | `string` (código corregido) |
| `analyzeWithGemini()` | `code: string, errors: LintMessage[], language?: string` | `string | null` |
| `validateCorrection()` | `originalCode, correctedCode` | `string` (corregido o revertido) |

---

## 4. Análisis de Tests

**6 archivos de test en `frontend/__tests__/`** (Jest + Testing Library):

| Archivo | Cobertura |
|---------|-----------|
| `AnalysisButtons.test.tsx` | Renderizado de botón "Run Analysis" |
| `CodeEditor.test.tsx` | Renderizado del editor con valor inicial |
| `ErrorHandling.test.tsx` | Manejo de errores HTTP, red y modo demo |
| `LanguageDetection.test.tsx` | Selección de lenguaje en el editor |
| `OllamaAPI.test.tsx` | Llamada a `/api/analyze` y parseo de respuesta |
| `OllamaCommunication.test.tsx` | Health check + envío/recepción de correcciones |

**Nota:** Los tests existen en `master` y `dev`. La rama `dev` NO añade tests nuevos para Gemini ni para las nuevas funciones extraídas.

**Rama Vercel:** La rama `origin/vercel/...` **elimina** Jest y Testing Library del `package.json` (probablemente para reducir el bundle de deploy).

---

## 5. Evaluación de Integración con `llm_bridge`

### 5.1 Estado Actual de `dev` vs Master para la Integración

La rama `dev` **ya ha dado pasos significativos** hacia una arquitectura que facilitaría la integración con `llm_bridge`:

| Aspecto | Antes (master) | Ahora (dev) | ¿Facilita llm_bridge? |
|---------|----------------|-------------|----------------------|
| **Acoplamiento** | Ollama hardcodeado en `POST` | Funciones separadas por proveedor | ✅ Sí — hay un lugar claro donde inyectar |
| **Proveedores** | 1 (Ollama) | 2 (Ollama + Gemini) con fallback | ✅ Sí — el patrón de fallback es extensible |
| **Validación** | No existía | `validateCorrection()` reusable | ✅ Sí — se reutilizaría igual |
| **Detección lenguaje** | No existía | `detectLanguage()` | ✅ Sí — útil para prompts contextuales |
| **Métricas** | No | No | ❌ No — llm_bridge las proveería |

### 5.2 ¿Qué tan factible es integrar `llm_bridge`?

**Factibilidad: ALTA**, pero con la misma salvedad del informe anterior: `llm_bridge` es Python y CodeMp-AI es TypeScript.

La rama `dev` ya estableció un **patrón de abstracción de proveedores** (funciones `analyzeWithOllama`, `analyzeWithGemini`). Para integrar `llm_bridge` se seguiría el mismo patrón:

```
analyzeWithOllama()  →  analyzeWithLLMBridge(provider: 'ollama')
analyzeWithGemini()  →  analyzeWithLLMBridge(provider: 'gemini')
                       analyzeWithLLMBridge(provider: 'openai')
                       analyzeWithLLMBridge(provider: 'bedrock')
```

El **cambio conceptual es mínimo**: donde hoy se llama a una función que hace HTTP directo al proveedor, se llamaría a una función que hace HTTP al microservicio `llm_bridge`, que a su vez usa `create_llm()`.

### 5.3 Beneficios Específicos para `dev`

1. **Unificación de providers:** Hoy `analyzeWithOllama()` hace fetch directo; `analyzeWithGemini()` usa SDK. Con `llm_bridge` ambas serían llamadas idénticas al microservicio.
2. **Métricas gratuitas:** `LLMResponse` ya incluye `latency_ms`, `total_tokens` — métricas que hoy CodeMp-AI no captura.
3. **Modo mock nativo:** El provider `mock` de `llm_bridge` reemplazaría el "modo demo" artesanal actual.
4. **OpenAI-compatible:** El provider `openai` de `llm_bridge` + `base_url` puede apuntar a Ollama, vLLM, o cualquier API compatible. Esto permitiría unificar todos los providers locales bajo un mismo código.

### 5.4 Desafíos Persistentes

| Desafío | Impacto |
|---------|---------|
| **Microservicio Python** | Necesario como puente (TypeScript ↔ Python) |
| **Despliegue extra** | El microservicio debe correr junto a Next.js |
| **Tests existentes** | Los tests de `OllamaAPI.test.tsx` y `OllamaCommunication.test.tsx` mockean `fetch` y necesitarían actualizarse para apuntar al microservicio |

### 5.5 Archivos que se Verían Afectados

| Archivo | Cambio |
|---------|--------|
| `frontend/app/api/analyze/route.ts` | Reemplazar `analyzeWithOllama()` y `analyzeWithGemini()` por una sola función que llame al microservicio `llm_bridge` |
| `frontend/app/api/health/route.ts` | Redirigir health check al microservicio |
| `frontend/__tests__/OllamaAPI.test.tsx` | Actualizar mocks para nueva URL |
| `frontend/__tests__/OllamaCommunication.test.tsx` | Actualizar mocks para nuevo endpoint |
| `frontend/package.json` | Sin cambios (no se añaden deps Node.js) |
| **(Nuevo)** `backend/app.py` | Microservicio Flask/FastAPI |
| **(Nuevo)** `backend/requirements.txt` | `llm-bridge`, `flask`, `gunicorn` |
| **(Nuevo)** `backend/Dockerfile` | Contenedor del microservicio |
| **(Nuevo)** `backend/config.yaml` | Config de proveedores (opcional) |

---

## 6. Conclusión

### Estado del Proyecto
- `master`: Versión estable con **solo Ollama** como proveedor IA
- `dev`: **Ya evolucionó** hacia una arquitectura multi-proveedor (Ollama + Gemini) con funciones separadas, validación y detección de lenguaje
- La rama `dev` está **alineada conceptualmente** con la estrategia de `llm_bridge` — solo falta el puente Python

### Recomendación
La integración con `llm_bridge` es **altamente recomendable** si se planea:
1. Soportar OpenAI, AWS Bedrock u otros proveedores cloud
2. Obtener métricas de uso (tokens, latencia)
3. Tener un modo mock robusto para tests
4. Centralizar la gestión de credenciales

La rama `dev` ya hizo el 50% del trabajo arquitectónico. `llm_bridge` completaría el otro 50% proporcionando la capa de abstracción real sobre los proveedores.
