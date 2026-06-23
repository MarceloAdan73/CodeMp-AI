# Análisis de windsnow1025/LLM-Bridge v2.0.8 (PyPI)

**Fecha:** 2026-06-20
**Propósito:** Documentar la API de `windsnow1025/LLM-Bridge` (v2.0.8 en PyPI), que originalmente se instaló por error.

> **⚠️ NOTA:** Este archivo describe `windsnow1025/LLM-Bridge`, una biblioteca **distinta** a `SantanderAI/llm_bridge`. El análisis `01_informe_llm_bridge.md` **era correcto** para el repo de Santander. El error fue asumir que `pip install llm-bridge` instalaba el paquete de Santander, cuando en realidad instalaba este de `windsnow1025`. El proyecto actualmente usa `SantanderAI/llm_bridge` instalado desde GitHub.

---

## 1. Discrepancias con el Análisis Anterior

| Aspecto | Informe original (01) | Real (2.0.8) |
|---------|----------------------|---------------|
| `create_llm(config)` | Sí, existe | **No existe** en ninguna versión (1.0.0 a 2.0.8) |
| Provider `mock` | Provider nativo offline | **No existe**. Sin API keys → error |
| `base_url` como parámetro | Se pasa en config | **No acepta `base_url`**. Solo vía env var del SDK |
| `LLMResponse.content` | Campo de respuesta | Se llama `resp.text` |
| `LLMResponse.total_tokens` | Campo unificado | `resp.input_tokens` + `resp.output_tokens` por separado |
| `LLMResponse.latency_ms` | Campo de latencia | **No existe**. No hay métricas de latencia |
| `LLMResponse.model` | Modelo usado | **No existe**. No informa el modelo |
| Mensajes como dict | `{role, content}` | `Message(role=Role, contents=list[Content])` |
| Sincronía | `llm.chat()` síncrono | `await create_chat_client()` + `await client.generate_non_stream_response()` |
| `load_config()` | Soporta JSON/YAML | **No existe** |

**Conclusión:** La API descrita en el informe `01_informe_llm_bridge.md` **nunca existió**. No está basada en el código real del repositorio `SantanderAI/llm_bridge`.

---

## 2. API Real de llm_bridge v2.0.8

### 2.1 Instalación

```bash
pip install llm-bridge  # Instala todos los providers
```

Dependencias: `anthropic`, `google-genai`, `openai`, `httpx`, `fastapi`, entre otras.

### 2.2 Imports Principales

```python
from llm_bridge import create_chat_client, ChatResponse
from llm_bridge.type.message import Message, Role, Content, ContentType
```

### 2.3 create_chat_client() — Punto de Entrada

```python
async def create_chat_client(
    api_keys: dict[str, str],
    messages: list[Message],
    model: str,
    api_type: str,
    temperature: float,
    stream: bool,
    thought: bool = False,
    web_search: bool = False,
    code_execution: bool = False,
    structured_output_schema: dict | None = None,
) -> ChatClient:
```

**Parámetros:**
- `api_keys`: Dict con la API key requerida por el provider (ej. `{"OPENAI_API_KEY": "sk-..."}`)
- `messages`: Lista de `Message` tipados (no dicts simples)
- `model`: ID del modelo (ej. `"gemini-2.0-flash"`, `"claude-sonnet-4-20250514"`)
- `api_type`: String que selecciona el provider (ver sección 2.5)
- `temperature`: Temperatura (0.0 a 1.0+)
- `stream`: True para streaming, False para respuesta completa
- `thought`, `web_search`, `code_execution`: Features adicionales del modelo
- `structured_output_schema`: Schema JSON para output estructurado

### 2.4 Tipos de Mensajes

```python
# Role es un enum de strings
Role.User      # "user"
Role.System    # "system"
Role.Assistant # "assistant"

# ContentType es un enum
ContentType.Text  # "text"
ContentType.File  # "file"

# Content requiere type + data
Content(type=ContentType.Text, data="Hello")

# Message requiere role + contents (lista de Content o string directo)
Message(role=Role.User, contents=[Content(type=ContentType.Text, data="Hello")])
# También acepta string directo:
Message(role="user", contents="Hello")
```

### 2.5 Providers Soportados (api_type)

| api_type | API Key requerida | Provider real |
|----------|------------------|---------------|
| `'OpenAI'` | `OPENAI_API_KEY` | OpenAI Responses API |
| `'OpenAI-Azure'` | `AZURE_API_KEY` + `AZURE_API_BASE` | Azure OpenAI |
| `'OpenAI-GitHub'` | `GITHUB_API_KEY` | GitHub Models |
| `'Grok'` | `XAI_API_KEY` | xAI Grok |
| `'Google AI Studio'` | `GOOGLE_AI_STUDIO_API_KEY` | Google Gemini (pago) |
| `'Google AI Studio Free Tier'` | `GOOGLE_AI_STUDIO_FREE_TIER_API_KEY` | Google Gemini (gratuito) |
| `'Vertex AI'` | `VERTEX_AI_API_KEY` | Google Vertex AI |
| `'Claude'` | `ANTHROPIC_API_KEY` | Anthropic Claude |

> **Importante:** No existe provider para Ollama, vLLM, ni ningún backend local. Tampoco existe provider "mock" para testing sin API keys.

### 2.6 ChatClient — Generación de Respuesta

```python
# Una vez creado el cliente, se genera la respuesta:
response: ChatResponse = await client.generate_non_stream_response()

# Para streaming:
async for chunk in client.generate_stream_response():
    process(chunk)
```

### 2.7 ChatResponse — Formato de Salida

```python
class ChatResponse:
    text: str | None          # Contenido textual de la respuesta
    input_tokens: int | None  # Tokens de entrada (prompt)
    output_tokens: int | None # Tokens de salida (generados)
    thought: str | None       # Razonamiento interno (si aplica)
    code: str | None          # Código generado (si aplica)
    code_output: str | None   # Output de ejecución de código
    display: str | None       # Contenido para display
    files: list | None        # Archivos generados
    error: str | None         # Mensaje de error
```

**No incluye:** latencia, modelo usado, ni otros metadatos.

### 2.8 OpenAI + Ollama (vía env var)

`llm_bridge` no expone `base_url`, pero el SDK de OpenAI respeta la variable de entorno `OPENAI_BASE_URL`:

```python
import os
os.environ["OPENAI_BASE_URL"] = "http://localhost:11434/v1"
os.environ["OPENAI_API_KEY"] = "ollama"

# create_chat_client usará OpenAI SDK que apunta a Ollama
client = await create_chat_client(
    api_keys={"OPENAI_API_KEY": "ollama"},
    messages=[Message(role="user", contents="Hello")],
    model="qwen2.5-coder:1.5b",
    api_type="OpenAI",
    temperature=0.7,
    stream=False,
    ...
)
```

**Limitación:** Solo se puede tener un `base_url` activo a la vez (variable global).

---

## 3. Comparativa: Uso Directo vs llm_bridge

| Escenario | SDK Directo | llm_bridge |
|-----------|-------------|------------|
| OpenAI cloud | `OpenAI(api_key=...).chat.completions.create(...)` | `create_chat_client(api_keys={...}, api_type="OpenAI")` |
| Ollama local | `OpenAI(base_url=..., api_key="...").chat.completions.create(...)` | No recomendado (no expone base_url) |
| Gemini | `google_genai.Client(api_key=...).models.generate_content(...)` | `create_chat_client(api_type="Google AI Studio")` |
| Claude | `anthropic.Anthropic(api_key=...).messages.create(...)` | `create_chat_client(api_type="Claude")` |
| Grok | `openai.OpenAI(api_key=..., base_url=...)...` | `create_chat_client(api_type="Grok")` |

---

## 4. Compatibilidad con el Plan de Integración

### ¿Qué funciona de llm_bridge en nuestro proyecto?

| Uso | ¿Se puede? | Notas |
|-----|-----------|-------|
| Mock/testing | ❌ No | No existe provider mock |
| Ollama local | ⚠️ Parcial | Solo vía env var global, no recomendado |
| Gemini cloud | ✅ Sí | Usar api_type="Google AI Studio" |
| Claude cloud | ✅ Sí | Usar api_type="Claude" |
| Grok cloud | ✅ Sí | Usar api_type="Grok" |
| OpenAI cloud | ✅ Sí | Usar api_type="OpenAI" |

### Recomendación para app.py (ya implementado)

```python
# Mock → respuesta directa en Flask (sin llm_bridge)
if provider == 'mock':
    return jsonify({'content': 'mock response', ...})

# Ollama/local → OpenAI SDK directo con base_url
elif provider == 'openai' and base_url:
    client = OpenAI(api_key='...', base_url=base_url)
    response = client.chat.completions.create(...)

# Cloud providers → llm_bridge
elif provider in ('google', 'claude', 'grok'):
    client = await create_chat_client(api_type=..., ...)
    response = await client.generate_non_stream_response()
```

---

## 5. Historial de la API

| Versión | create_llm | Provider mock | create_chat_client |
|---------|-----------|---------------|-------------------|
| 0.1.4 (jun 2025) | ❌ | ❌ | ✅ (básico) |
| 1.0.0 (sep 2025) | ❌ | ❌ | ✅ |
| 2.0.0 (may 2026) | ❌ | ❌ | ✅ (completo) |
| **2.0.8** (actual) | ❌ | ❌ | ✅ |

La función `create_llm` con provider `mock` **nunca existió** en ninguna versión publicada de `llm_bridge`.

---

## 6. Conclusión

`llm_bridge` v2.0.8 es una biblioteca **cloud-first** que abstrae proveedores cloud (OpenAI, Google, Anthropic, xAI) bajo una interfaz unificada asíncrona. **No está diseñada para backends locales (Ollama/vLLM)** ni para testing offline (no tiene mock provider).

Para el proyecto CodeMp-AI, la estrategia correcta es:
- **Mock** → implementación directa en Flask (respuesta simple)
- **Ollama** → OpenAI SDK directo con `base_url` personalizado
- **Cloud (Gemini, Claude, Grok)** → `llm_bridge` para abstraer la complejidad de cada SDK

Esto ya está implementado en `backend/app.py`.
