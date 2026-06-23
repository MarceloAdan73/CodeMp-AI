# PLAN DE ACCIÓN — Microservicio `llm_bridge` en CodeMp-AI

**Versión:** 2.1
**Última actualización:** 2026-06-22

---

## 🛡️ REGLAS DE SEGURIDAD (OBLIGATORIAS)

La IA debe cumplir estas reglas en TODAS las fases:

### 1. Verificar rama `dev`
Antes de cualquier modificación, ejecutar `git branch`. Si no se está en `dev`, **detener la ejecución** y notificar al usuario.

### 2. Backups automáticos
Antes de modificar un archivo existente, crear una copia con extensión `.backup` en la misma carpeta:
- `route.ts` → `route.ts.backup`
- `health/route.ts` → `health/route.ts.backup`
- `README.md` → `README.md.backup`

### 3. Prohibido ejecutar comandos destructivos
`rm -rf`, `git reset --hard`, `git push --force` o cualquier comando que elimine datos sin confirmación explícita del usuario.

### 4. Confirmación entre fases
Al terminar una fase, preguntar:
> "La Fase X ha finalizado. ¿Confirmas que quieres continuar con la Fase Y?"

No avanzar hasta recibir confirmación.

### 5. Registro de acciones
Cada vez que se cree o modifique un archivo, la IA debe registrar en la conversación:
- Qué archivo se creó/modificó
- Resumen breve de los cambios

---

## ARQUITECTURA REAL

```
Frontend (Next.js) → /api/analyze → backend (Flask :5000) → AI Provider
                                      ├── mock → respuesta directa
                                      ├── openai → OpenAI SDK (Ollama si base_url)
                                      ├── google → llm_bridge → Gemini
                                      ├── claude → llm_bridge → Claude
                                      └── grok   → llm_bridge → Grok
```

**API del microservicio (`POST /chat`):**
```json
{
  "provider": "openai",
  "model": "qwen2.5-coder:1.5b",
  "base_url": "http://localhost:11434/v1",
  "messages": [{"role": "user", "content": "..."}],
  "temperature": 0.7
}
→ {"content": "...", "total_tokens": 0, "latency_ms": 0, "model": "..."}
```

---

## ESTADO DE PROGRESO

> **Fase actual:** ✅ Proyecto CodeMp-AI completado
> **Próximo paso:** Colaboración con Santander (ver `06_PLAN_COLABORACION_SANTANDER.md`)

| Fase | Estado |
|------|--------|
| **Fase 1:** Microservicio Python (`backend/`) | ✅ Completada |
| **Fase 2:** Integrar frontend con microservicio | ✅ Completada |
| **Fase 3:** Health check + Tests | ✅ Completada |
| **Fase 4:** Dockerizar + Documentar | ⏳ Pendiente (futuro) — ver nota al final |
| **Fase 5:** Selector de modelo IA en UI | ✅ Completada |
| **Fase 6:** Colaboración con Santander | ⬜ Pendiente — ver `06_PLAN_COLABORACION_SANTANDER.md` |

---

## INSTRUCCIONES PARA LA IA

### COMANDOS DE ACTIVACIÓN

La IA responde a **dos comandos**:

**`"sigamos"`** — Continuar con la fase actual (reanudar trabajo en progreso).
**`"ejecutar plan"`** — Iniciar el plan desde cero (Fase 1 si no hay progreso, o retomar desde donde se quedó).

Ambos comandos siguen el mismo flujo:

Cuando el usuario diga **"sigamos"** o **"ejecutar plan"**, debes:
1. Leer este archivo
2. **Cumplir las 🛡️ REGLAS DE SEGURIDAD** (verificar rama `dev`, backups, etc.)
3. Identificar la **Fase actual**
4. Ejecutar las tareas de esa fase en orden
5. **Registrar cada acción** (archivo creado/modificado + resumen)
6. Al terminar la fase, **pedir confirmación** antes de avanzar a la siguiente
7. Actualizar el estado en ESTADO DE PROGRESO

Los comandos `npm install`, `pip install`, `git add`, `git commit`, etc. SÍ están permitidos, siempre que se cumplan las reglas de seguridad.

---

# FASE 1: MICROSERVICIO PYTHON — ✅ COMPLETADA

**Objetivo cumplido:** Crear el servicio `backend/` que expone los endpoints `/chat` y `/health`.

### Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `backend/requirements.txt` | flask, llm-bridge, openai, gunicorn |
| `backend/app.py` | Microservicio Flask con 3 handlers: mock, openai, llm_bridge |
| `backend/.env.example` | Plantilla de variables de entorno |
| `backend/venv/` | Entorno virtual Python (dependencias instaladas) |

### Estrategia de implementación (app.py)

```python
# Mock → respuesta directa sin LLM
if provider == 'mock':
    return jsonify({'content': 'mock response', 'total_tokens': 10, ...})

# OpenAI/Ollama → OpenAI SDK directo con base_url opcional
elif provider == 'openai':
    client = OpenAI(api_key='...', base_url=base_url)  # base_url → Ollama
    response = client.chat.completions.create(...)

# Cloud providers → llm_bridge (async)
elif provider in ('google', 'claude', 'grok'):
    client = await create_chat_client(api_type=..., api_keys=..., ...)
    response = await client.generate_non_stream_response()
```

---

# FASE 2: INTEGRAR FRONTEND CON MICROSERVICIO

**Objetivo:** Reemplazar las llamadas directas a Ollama/Gemini en `route.ts` por llamadas al microservicio `backend/app.py`.

## Paso 2.1 — Modificar frontend/app/api/analyze/route.ts

### Cambios específicos:

1. **Añadir constante** al inicio del archivo:
   ```typescript
   const LLM_BRIDGE_URL = process.env.LLM_BRIDGE_URL || 'http://localhost:5000';
   ```

2. **Eliminar funciones:**
   - `checkOllamaAvailability()` — el health check va al microservicio
   - `analyzeWithOllama()` — se reemplaza por llamada genérica
   - `analyzeWithGemini()` — se reemplaza por llamada genérica

3. **Crear función genérica** `analyzeWithBridge()`:
   ```typescript
   interface BridgeRequest {
     provider: string;
     model: string;
     base_url?: string;
     messages: { role: string; content: string }[];
     temperature?: number;
   }

   interface BridgeResponse {
     content: string;
     total_tokens: number;
     latency_ms: number;
     model: string;
   }

   async function analyzeWithBridge(config: BridgeRequest): Promise<BridgeResponse | null> {
     try {
       const response = await fetch(`${LLM_BRIDGE_URL}/chat`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(config),
       });
       if (!response.ok) return null;
       return await response.json();
     } catch {
       console.error('Error calling LLM bridge:', error);
       return null;
     }
   }
   ```

4. **Modificar el POST handler** para usar `analyzeWithBridge()`:

   **Para Ollama (local):**
   ```typescript
   const llmResult = await analyzeWithBridge({
     provider: 'openai',
     model: 'qwen2.5-coder:1.5b',
     base_url: 'http://localhost:11434/v1',
     messages: [
       { role: 'system', content: systemPrompt },
       { role: 'user', content: userPrompt },
     ],
     temperature: 0.7,
   });
   ```

   **Para Gemini:**
   ```typescript
   const llmResult = await analyzeWithBridge({
     provider: 'google',
     model: 'gemini-2.0-flash',
     messages: [
       { role: 'system', content: systemPrompt },
       { role: 'user', content: userPrompt },
     ],
     temperature: 0.7,
   });
   ```

   **Para Claude:**
   ```typescript
   const llmResult = await analyzeWithBridge({
     provider: 'claude',
     model: 'claude-sonnet-4-20250514',
     messages: [
       { role: 'system', content: systemPrompt },
       { role: 'user', content: userPrompt },
     ],
     temperature: 0.7,
   });
   ```

5. **Flujo del POST handler (simplificado):**
   ```typescript
   export async function POST(req: Request) {
     const { code } = await req.json();
     const lintResult = await runESLint(code);

     if (lintResult.errors.length === 0) {
       return NextResponse.json({ codigoCorregido: lintResult.fixedCode, mode: 'full' });
     }

     // Intentar Ollama primero
     let result = await analyzeWithBridge({ provider: 'openai', base_url: 'http://localhost:11434/v1', ... });
     let usedProvider = result ? 'ollama' : null;

     // Fallback a Gemini
     if (!result) {
       result = await analyzeWithBridge({ provider: 'google', ... });
       usedProvider = result ? 'gemini' : null;
     }

     // Fallback a Claude
     if (!result) {
       result = await analyzeWithBridge({ provider: 'claude', ... });
       usedProvider = result ? 'claude' : null;
     }

     // Validar corrección
     const finalCode = result ? await validateCorrection(lintResult.fixedCode, result.content) : lintResult.fixedCode;

     return NextResponse.json({
       errores: lintResult.errors,
       codigoCorregido: finalCode,
       mode: usedProvider ? 'full' : 'demo',
       usedProvider,
     });
   }
   ```

6. **Mantener sin cambios:**
   - `runESLint()` — no tocar
   - `validateCorrection()` — no tocar
   - `detectLanguage()` — no tocar
   - Estructura de respuesta JSON — misma interfaz

## Paso 2.2 — Añadir variable de entorno

**Archivo:** `frontend/.env.local`

```
LLM_BRIDGE_URL=http://localhost:5000
```

## ✅ Criterios de éxito de Fase 2

- [ ] `route.ts` ya NO contiene `checkOllamaAvailability()`
- [ ] `route.ts` ya NO contiene `analyzeWithOllama()`
- [ ] `route.ts` ya NO contiene `analyzeWithGemini()`
- [ ] `route.ts` SÍ contiene `analyzeWithBridge()` genérica
- [ ] Los prompts se envían como `messages` estructurados (system + user)
- [ ] Soporta múltiples providers con fallback automático
- [ ] Se mantienen `runESLint()`, `validateCorrection()`, `detectLanguage()`
- [ ] La respuesta JSON al frontend es idéntica (mismos campos)
- [ ] `frontend/.env.local` existe con `LLM_BRIDGE_URL`

---

# FASE 3: HEALTH CHECK + TESTS

**Objetivo:** Actualizar el health check para que apunte al microservicio y crear tests del backend.

## Paso 3.1 — Modificar health/route.ts

Reemplazar todo el contenido:

```typescript
import { NextResponse } from 'next/server';

const LLM_BRIDGE_URL = process.env.LLM_BRIDGE_URL || 'http://localhost:5000';

export async function GET() {
  try {
    const response = await fetch(`${LLM_BRIDGE_URL}/health`);
    const data = await response.json();
    return NextResponse.json({ available: data.status === 'ok' });
  } catch {
    return NextResponse.json({ available: false });
  }
}
```

## Paso 3.2 — Tests del backend (Python)

**Archivo:** `backend/tests/test_service.py`

```python
import pytest
from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_health(client):
    resp = client.get('/health')
    assert resp.status_code == 200
    assert resp.get_json()['status'] == 'ok'

def test_chat_mock(client):
    resp = client.post('/chat', json={
        'provider': 'mock',
        'messages': [{'role': 'user', 'content': 'Hello'}],
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert 'content' in data
    assert 'total_tokens' in data
    assert 'latency_ms' in data

def test_chat_no_messages(client):
    resp = client.post('/chat', json={})
    assert resp.status_code == 400

def test_chat_unknown_provider(client):
    resp = client.post('/chat', json={
        'provider': 'nonexistent',
        'messages': [{'role': 'user', 'content': 'Hello'}],
    })
    assert resp.status_code == 400
```

Ejecutar con:
```bash
cd backend
pip install pytest
pytest tests/ -v
```

## Paso 3.3 — Tests del frontend

- `OllamaAPI.test.tsx` — actualizar mocks si la URL cambia (request sigue siendo `/api/analyze`)
- `OllamaCommunication.test.tsx` — verificar que health check mock funciona con nuevo endpoint

Ejecutar:
```bash
cd frontend
npm test
```

## ✅ Criterios de éxito de Fase 3

- [ ] `health/route.ts` redirige al microservicio (`backend/app.py`)
- [ ] `backend/tests/test_service.py` existe con 4+ tests
- [ ] Tests del backend pasan (`pytest`)
- [ ] Tests del frontend siguen pasando (`npm test`)

---

# FASE 4: DOCKERIZAR + DOCUMENTAR

**Objetivo:** Empaquetar el microservicio y documentar la arquitectura final.

## Paso 4.1 — Dockerfile

**Archivo:** `backend/Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
```

## Paso 4.2 — docker-compose.yml raíz

**Archivo:** `docker-compose.yml` (en raíz del proyecto)

```yaml
services:
  llm-bridge:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - GOOGLE_API_KEY=${GOOGLE_API_KEY:-}
      - GEMINI_API_KEY=${GEMINI_API_KEY:-}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
      - XAI_API_KEY=${XAI_API_KEY:-}

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - LLM_BRIDGE_URL=http://llm-bridge:5000
    depends_on:
      - llm-bridge
```

## Paso 4.3 — README.md (ya actualizado parcialmente)

Verificar que README.md incluya:
- Diagrama de arquitectura (Frontend → Next.js API → Microservicio → AI Provider)
- Requisitos: Node.js 18+, Python 3.9+, Ollama (opcional)
- Instrucciones de inicio rápido (backend + frontend)
- Tabla de proveedores y sus API keys
- Variables de entorno documentadas
- Tests

## ✅ Criterios de éxito de Fase 4

- [ ] `backend/Dockerfile` existe y se construye sin errores
- [ ] `docker-compose.yml` raíz existe
- [ ] `docker-compose up` arranca ambos servicios
- [ ] README.md completo con toda la documentación

---

# FASE 5: SELECTOR DE MODELO IA EN UI — ✅ COMPLETADA

**Objetivo:** Permitir al usuario elegir qué proveedor IA usar directamente desde la interfaz.

## Cambios realizados

### route.ts
- Ahora acepta `provider` y `model` opcionales en el body del POST
- Si se envía `provider`, solo intenta ese proveedor específico
- Si no se envía, mantiene el fallback automático original

### page.tsx
- Agregado estado `selectedProvider`
- Dropdown `<select>` en el header con opciones: Auto, Ollama, Gemini, Claude
- Se envía `provider` en la request a `/api/analyze`

## ✅ Criterios de éxito de Fase 5

- [x] El dropdown aparece en el header y es funcional
- [x] "Auto" usa el fallback original (Ollama → Gemini → Claude)
- [x] Seleccionar un proveedor específico fuerza ese provider
- [x] Tests existentes siguen pasando (14 frontend + 4 backend)

---

# ANEXO: CHECKLIST GLOBAL

| # | Tarea | Fase | Estado |
|---|-------|------|--------|
| 1 | Crear `backend/requirements.txt` | 1 | ✅ |
| 2 | Crear `backend/app.py` (API windsnow1025) | 1 | ✅ → 🔄 |
| 2b | Refactorizar `app.py` a `SantanderAI/llm_bridge` (`create_llm`) | 1 | ✅ |
| 3 | Crear `backend/.env.example` | 1 | ✅ |
| 4 | Verificar microservicio funcionando | 1 | ✅ |
| 5 | Modificar `route.ts` (función `analyzeWithBridge()`) | 2 | ✅ |
| 6 | Crear `frontend/.env.local` | 2 | ✅ |
| 7 | Verificar análisis funciona con microservicio | 2 | ⬜ |
| 8 | Modificar `health/route.ts` | 3 | ✅ |
| 9 | Crear `backend/tests/test_service.py` | 3 | ✅ |
| 10 | Ejecutar `pytest` (backend) | 3 | ✅ |
| 11 | Ejecutar `npm test` (frontend) | 3 | ✅ |
| 12 | Crear `backend/Dockerfile` | 4 | ❌ |
| 13 | Crear `docker-compose.yml` raíz | 4 | ❌ |
| 14 | Actualizar README.md (verificar) | 4 | ❌ |
| 15 | `docker-compose up --build` final | 4 | ❌ |
| 16 | Modificar `route.ts` — aceptar `provider`/`model` desde request | 5 | ✅ |
| 17 | Agregar dropdown selector en `page.tsx` | 5 | ✅ |
| 18 | Verificar tests (frontend + backend) | 5 | ✅ |

---

# MAPA DE ARCHIVOS (ESTADO ACTUAL)

```
CodeMp-AI/
├── backend/                          # ✅ CREADO
│   ├── app.py                        # Flask: /chat, /health
│   ├── requirements.txt              # flask, llm-bridge, openai, gunicorn
│   ├── .env.example                  # API keys template
│   ├── venv/                         # Entorno virtual
│   ├── Dockerfile                    # ⬜ Fase 4
│   └── tests/
│       └── test_service.py           # ✅ Fase 3 — creado
├── docker-compose.yml                # ⬜ Fase 4
├── frontend/
│   ├── .env.local                    # ✅ Fase 2 — LLM_BRIDGE_URL añadido
│   ├── app/api/
│   │   ├── analyze/route.ts          # ✅ Fase 2 — usa analyzeWithBridge() + fallbacks
│   │   └── health/route.ts           # ✅ Fase 3 — redirige al microservicio
│   ├── __tests__/
│   │   ├── OllamaAPI.test.tsx        # ✅ Sin cambios necesarios
│   │   └── OllamaCommunication.test.tsx  # ✅ Sin cambios necesarios
│   └── package.json                  # ⚪ Sin cambios
├── SANTADER-IA/                      # Documentos de análisis
│   ├── 01_informe_llm_bridge.md      # CORREGIDO — versión real de la API
│   ├── 02_analisis_integracion_codemp.md
│   ├── 03_analisis_completo_codemp_ai.md
│   ├── 04_PLAN_ACCION_AGENTE.md      # ✅ Este archivo (v2.0)
│   └── 05_api_real_llm_bridge.md     # Documentación detallada de API real
└── README.md                         # ACTUALIZADO — arquitectura, providers, instalación
```

**Leyenda:**
- 🟢 **NUEVO** — archivo que hay que crear
- 🟡 **MODIFICADO** — archivo existente que hay que cambiar
- ⚪ **SIN CAMBIOS** — no se toca
- 🔵 **REVISAR** — puede no necesitar cambios, verificar

---

*Documento v2.0 — Plan actualizado tras descubrir la API real de llm_bridge v2.0.8.*

---

## NOTA: Docker (Fase 4 — Pendiente)

### Archivos necesarios (para implementación futura)

| Archivo | Propósito |
|---------|-----------|
| `backend/Dockerfile` | Imagen Python/Flask con gunicorn |
| `frontend/Dockerfile` | Multi-stage build de Next.js |
| `docker-compose.yml` | Orquestar backend + frontend |
| `.dockerignore` | Excluir `venv/`, `node_modules/`, `.git/`, etc. |

### Requisitos para que funcione

1. Instalar `git` en la imagen del backend (`apt-get update && apt-get install -y git`) porque `llm-bridge` se instala desde GitHub
2. Tener Docker Desktop estable (en Windows, WSL2 puede ser lento)
3. Ejecutar:
   ```bash
   docker compose up --build
   ```

### Notas técnicas

- El `venv/` de backend pesa ~291MB y debe ir en `.dockerignore`
- `llm-bridge` requiere `git` en el contenedor para clonarse desde GitHub
- Build lento en Windows/WSL2 por latencia I/O entre sistemas de archivos

*Implementación esbozada el 2026-06-22. Pendiente de entorno Docker estable.*

---
# FASE 7: MEJORAS POST-PRUEBA LOCAL — ✅ COMPLETADA

**Objetivo:** Correcciones y mejoras tras primera prueba local exitosa.

## Cambios realizados

### Error: `create_llm` no encontrado (app.py)
- **Causa:** El venv tenía instalado `LLM-Bridge` v2.0.8 (windsnow1025) en vez del `llm-bridge` v0.1.0 (SantanderAI) especificado en `requirements.txt`
- **Solución:** `pip uninstall LLM-Bridge -y && pip install llm-bridge @ git+https://github.com/SantanderAI/llm_bridge.git`

### Error: Turbopack crash (BMI2 no soportado)
- **Causa:** CPU no soporta instrucciones BMI2 requeridas por Turbopack (qfilter)
- **Solución:** Cambiar script `dev` de `next dev` a `next dev --webpack`

### Error: `useTheme must be used within ThemeProvider`
- **Causa:** React Context no funciona correctamente a través del boundary Server/Client Component en Next.js 16
- **Solución:** Eliminar ThemeProvider+useTheme, usar dark mode fijo para toda la app (herramienta para desarrolladores)

### Mejora: Provider error feedback
- **Antes:** Si fallaba un proveedor IA, solo mostraba "demo mode" genérico
- **Ahora:** Captura el error específico del backend y lo muestra en un banner rojo:
  - ❌ Gemini: API key inválida. Conseguí una gratis en https://aistudio.google.com/apikey
  - ❌ Ollama: servidor no disponible. ¿Está corriendo?
  - ❌ Claude: API key no configurada o inválida
  - ❌ Proveedor: cuota agotada. Intentá de nuevo más tarde.

### Fix: Apply Fix feedback
- **Antes:** `handleApplyFix` actualizaba el código pero dejaba el panel visible, el usuario creía que no pasaba nada
- **Solución:** No ocultar el panel (el usuario puede ver los resultados y el código actualizado en el editor)

### Fix: Ollama requiere API key falsa
- **Causa:** El OpenAI SDK exige una `api_key` no vacía incluso para endpoints locales como Ollama
- **Solución:** Pasar `api_key='ollama'` en el backend cuando se usa `base_url` custom

## Qué queda por probar

- [ ] Obtener Gemini API key válida y probar flujo completo
- [ ] Probar Ollama local con `ollama pull qwen2.5-coder:1.5b`
- [ ] Configurar `ANTHROPIC_API_KEY` y probar Claude
- [ ] Probar modo "Auto" con fallback entre proveedores
- [ ] Verificar export reporte con provider real
- [ ] Probar responsive mobile
- [ ] Verificar hot-reload de Webpack
