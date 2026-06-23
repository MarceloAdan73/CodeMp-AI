# Informe de Análisis: SantanderAI/llm_bridge

**Fecha:** 2026-06-20 (original) / 2026-06-20 (corregido)
**Propósito:** Evaluación para posible integración en CodeMp-AI

> **✅ ESTE INFORME ES CORRECTO para `SantanderAI/llm_bridge`** (v0.1.0, instalado desde GitHub). La API descrita aquí (`create_llm`, provider `mock`, `LLMResponse`) es la que se usa en `backend/app.py`. El archivo `05_api_real_llm_bridge.md` describe una biblioteca diferente (`windsnow1025/LLM-Bridge` v2.0.8 en PyPI) que **no es la que se integró en el proyecto**.

---

## 1. Filosofía y Problema que Resuelve

`llm_bridge` es una **biblioteca cliente LLM vendor-neutral** creada por Santander AI Lab. Su filosofía es:

> "Escribe tu aplicación contra `ChatClient` una vez y cambia entre OpenAI, Google Gemini, Claude o Grok sin tocar tu código."

**Problema que resuelve:** La fragmentación de APIs de proveedores de LLM. Cada vendor (OpenAI, Google, Anthropic, xAI) tiene su propio SDK, formato de mensajes, manejo de errores y sistema de credenciales. `llm_bridge` normaliza todo tras una interfaz única asíncrona (`ChatClient`) con adaptadores delgados.

**Principios clave (reales):**
- **Interfaz canónica** — `ChatClient.generate_non_stream_response()` devuelve `ChatResponse` (text, tokens, files, error).
- **Soporte cloud** — OpenAI, Google AI Studio, Vertex AI, Claude, Grok, Azure OpenAI, GitHub Models.
- **Zero-dependency para mock** — ❌ **No existe provider mock.** Todos los providers requieren API keys reales.
- **BYO backend** — ❌ **No existe provider `callable`.** No hay forma de conectar un backend propio.

---

## 2. Instalación (real)

```bash
pip install llm-bridge  # Instala todos los providers (no hay extras separados)
```

La instalación incluye: `anthropic`, `google-genai`, `openai`, `httpx`, `fastapi`, `aiohttp`, `grpcio`, entre otros. No hay modo "core only" — se instalan todas las dependencias.

**Requiere:** Python 3.9+

---

## 3. Quickstart Real (v2.0.8)

```python
import asyncio
from llm_bridge import create_chat_client
from llm_bridge.type.message import Message, Role, Content, ContentType

async def main():
    client = await create_chat_client(
        api_keys={"OPENAI_API_KEY": "sk-..."},
        messages=[Message(role="user", contents="Name three primary colors.")],
        model="gpt-4o-mini",
        api_type="OpenAI",
        temperature=0.7,
        stream=False,
        thought=False,
        web_search=False,
        code_execution=False,
        structured_output_schema=None,
    )
    resp = await client.generate_non_stream_response()
    print(resp.text)
    print(f"Tokens: in={resp.input_tokens}, out={resp.output_tokens}")

asyncio.run(main())
```

**No existe** provider `mock`, `callable`, ni `bedrock`. Tampoco existe `create_llm()` ni `LLMResponse`.

---

## 4. Proveedores Soportados (Reales)

| Proveedor | api_type | API Key requerida |
|-----------|----------|-------------------|
| OpenAI | `'OpenAI'` | `OPENAI_API_KEY` |
| Azure OpenAI | `'OpenAI-Azure'` | `AZURE_API_KEY` + `AZURE_API_BASE` |
| GitHub Models | `'OpenAI-GitHub'` | `GITHUB_API_KEY` |
| xAI Grok | `'Grok'` | `XAI_API_KEY` |
| Google Gemini (pago) | `'Google AI Studio'` | `GOOGLE_AI_STUDIO_API_KEY` |
| Google Gemini (gratis) | `'Google AI Studio Free Tier'` | `GOOGLE_AI_STUDIO_FREE_TIER_API_KEY` |
| Google Vertex AI | `'Vertex AI'` | `VERTEX_AI_API_KEY` |
| Anthropic Claude | `'Claude'` | `ANTHROPIC_API_KEY` |

> **No existen:** providers `mock`, `callable`, `bedrock`/`aws`, ni soporte para `base_url` como parámetro.
> 
> El provider `openai` puede apuntar a Ollama configurando `OPENAI_BASE_URL` como variable de entorno, pero `llm_bridge` no lo expone como parámetro.

---

## 5. Estructura Real del Proyecto (v2.0.8)

```
llm_bridge/
├── llm_bridge/
│   ├── __init__.py              # Exporta create_chat_client, ChatResponse, Message, etc.
│   ├── client/
│   │   ├── chat_client.py       # ChatClient (interfaz: generate_non_stream_response)
│   │   ├── implementations/     # Implementaciones por provider
│   │   │   ├── claude/
│   │   │   ├── gemini/
│   │   │   ├── openai_completion/
│   │   │   ├── openai_responses/
│   │   │   └── xai/
│   │   └── model_client/        # Fábricas de clientes por provider
│   ├── logic/
│   │   ├── chat_generate/       # Lógica de generación (fábricas, conversores)
│   │   ├── file_fetch.py
│   │   └── model_prices.py
│   ├── type/
│   │   ├── chat_response.py     # ChatResponse
│   │   ├── message.py           # Message, Role, Content, ContentType
│   │   └── model_message/       # Mensajes específicos por provider
│   └── resources/
├── tests/                       # Tests
└── pyproject.toml
```

**No existen:** `base.py`, `registry.py`, `providers/mock.py`, `providers/callable_provider.py`, `providers/bedrock.py`.

---

## 6. Issues Abiertos

**El repositorio no tiene issues abiertos.** (0 issues, 0 PRs al momento del análisis). Tampoco hay issues etiquetados como `good-first-issue` o `help-wanted`. Es un proyecto muy reciente (v0.1.0 lanzada el 17-Jun-2026, ~1 commit).

---

## 7. Nota sobre Ejemplos

La biblioteca instalada (v2.0.8) **no incluye carpeta `examples/`**. No hay ejemplos de código incluidos en el paquete.

---

## 8. Resumen Técnico (Real)

| Característica              | Detalle                                    |
|----------------------------|--------------------------------------------|
| **Lenguaje**                | Python 100%                                |
| **Licencia**                | Apache 2.0                                 |
| **Versión**                 | **2.0.8** (no 0.1.0)                       |
| **API de entrada**          | `create_chat_client()` async               |
| **Interfaz de respuesta**   | `ChatResponse` (text, input_tokens, output_tokens) |
| **Mock / testing**          | ❌ No soportado                            |
| **Backend propio**          | ❌ No soportado                            |
| **Ollama / local**          | ⚠️ Solo vía env var `OPENAI_BASE_URL`      |
| **Dependencias**            | `anthropic`, `google-genai`, `openai`, `httpx`, `fastapi`, etc. |
| **Sincronía**                | Async (requiere `asyncio.run()`)           |
