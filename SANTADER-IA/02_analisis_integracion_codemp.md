# Análisis de Integración: llm_bridge + CodeMp-AI

**Fecha:** 2026-06-20
**Propósito:** Evaluar la viabilidad y el impacto de integrar `llm_bridge` en `CodeMp-AI`

---

## Parte 1: Análisis de CodeMp-AI

### 1.1 Propósito

CodeMp-AI es una herramienta de **análisis y corrección automática de código** que combina **ESLint** con un **modelo de IA local (Ollama)**. Está construida con Next.js 15, TypeScript y Tailwind CSS.

**Flujo principal:**
1. El usuario escribe/pega código en un editor (CodeMirror 6)
2. Presiona "Run Analysis" → llamada a `/api/analyze`
3. Se ejecuta ESLint para detectar errores y aplicar correcciones automáticas
4. Opcionalmente, se llama a Ollama para una corrección/refactorización más inteligente
5. Se muestran errores, código corregido y vista de cambios (diff)

### 1.2 Arquitectura Actual de IA

La integración con IA está centralizada en un único archivo:

**Archivo clave:** `frontend/app/api/analyze/route.ts` (191 líneas)

**Componentes de la integración:**

1. **Health check (`isOllamaAvailable()`):** Consulta `http://localhost:11434/api/tags` con timeout de 2s para detectar si Ollama está corriendo.

2. **Llamada a Ollama (`callOllama()`):** Hace un POST a `http://localhost:11434/api/generate` con:
   - `model: 'qwen2.5-coder:1.5b'` (hardcodeado)
   - `prompt`: un prompt extenso con instrucciones de linting y los errores de ESLint
   - `stream: false`
   - Parsea `data.response` como texto corregido

3. **Modo demo:** Si Ollama no está disponible, devuelve un mensaje informativo y opera solo con ESLint.

4. **Configuración del modelo:** Se cambia editando manualmente `route.ts` línea 69. No hay UI para seleccionar modelo.

**Problemas identificados en la implementación actual:**
- El provider (Ollama) y el modelo están hardcodeados
- La URL del endpoint de Ollama está hardcodeada (`http://localhost:11434`)
- No hay abstracción para cambiar de proveedor de IA
- El prompt de corrección está incrustado en el código
- No hay métricas de tokens, latencia, ni manejo de errores estructurado
- Las credenciales (o su ausencia) se manejan manualmente

---

## Parte 2: Evaluación de Integración de llm_bridge

### 2.1 ¿Cómo integrar llm_bridge en CodeMp-AI? (Enfoque paso a paso)

**IMPORTANTE: Esto es solo un análisis conceptual. No se ejecutará ningún cambio.**

#### Paso 1: Analizar el desajuste tecnológico
CodeMp-AI está en **TypeScript/Node.js (Next.js)**. `llm_bridge` es una biblioteca **Python**. No se puede importar directamente. Las opciones serían:

- **Opción A (Recomendada):** Crear un microservicio Python (`llm_bridge_service.py`) que exponga una API HTTP liviana. CodeMp-AI llamaría a este servicio en lugar de llamar directamente a Ollama.
- **Opción B:** Re-implementar la lógica de `llm_bridge` como un paquete npm/TypeScript (fork o inspiración).
- **Opción C:** Usar `child_process` para ejecutar scripts Python desde Node.js (frágil, no recomendado para producción).

#### Paso 2: Crear el microservicio Python
```python
# llm_bridge_service.py — API Flask/FastAPI liviana
from flask import Flask, request, jsonify
from llm_bridge import create_llm

app = Flask(__name__)

@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    llm = create_llm({
        "provider": data.get("provider", "openai"),
        "model": data.get("model", "gpt-4o-mini"),
        "base_url": data.get("base_url"),  # Para Ollama/vLLM
    })
    resp = llm.chat(data["messages"], temperature=data.get("temperature", 0.7))
    return jsonify({
        "content": resp.content,
        "total_tokens": resp.total_tokens,
        "latency_ms": resp.latency_ms,
        "model": resp.model,
    })
```

#### Paso 3: Modificar CodeMp-AI para usar el servicio
En `frontend/app/api/analyze/route.ts`, reemplazar la llamada directa a Ollama:

```typescript
// ANTES: llamada directa a Ollama
const response = await fetch('http://localhost:11434/api/generate', { ... });

// DESPUÉS: llamada al microservicio llm_bridge
const response = await fetch('http://localhost:5000/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'openai',        // o 'ollama' usando base_url
    model: 'gpt-4o-mini',      // o 'qwen2.5-coder:1.5b'
    base_url: ollamaAvailable ? 'http://localhost:11434/v1' : undefined,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
  }),
});
```

#### Paso 4: Configurar el sistema de credenciales
- Para Ollama local: no se necesitan credenciales (usar `base_url` con una API key dummy)
- Para OpenAI: configurar `OPENAI_API_KEY` en variables de entorno del servidor
- Para AWS Bedrock: configurar cadena de credenciales AWS
- Para Google Gemini: configurar `GOOGLE_API_KEY`
- `llm_bridge` lee todo de environment variables automáticamente

#### Paso 5: Ajustar el prompt
El prompt actual está en el cuerpo de `callOllama()`. Con `llm_bridge`, se pasaría como `messages` estructurado con roles `system` y `user`.

#### Paso 6: Aprovechar el modo mock para tests
Usar `{"provider": "mock"}` en entornos de desarrollo/CI para no depender de Ollama.

---

### 2.2 Beneficios Concretos

| Beneficio | Descripción |
|-----------|-------------|
| **Abstracción de proveedores** | Cambiar de Ollama a OpenAI, AWS Bedrock o Google Gemini cambiando un string en la config |
| **Soporte OpenAI-compatible** | Ollama, vLLM, Azure OpenAI, y cualquier API compatible con OpenAI funcionan con el provider `openai` + `base_url` |
| **Métricas normalizadas** | `LLMResponse` incluye `prompt_tokens`, `completion_tokens`, `latency_ms` — actualmente CodeMp-AI no captura estas métricas |
| **Zero dependencias en core** | El microservicio Python no requiere vendor SDKs si solo se usa Ollama vía API compatible |
| **Modo mock para dev/test** | El provider `mock` permite desarrollar y testear sin ningún LLM corriendo |
| **Manejo de errores estándar** | `llm_bridge` unifica errores de red, auth, rate limiting en un solo formato |
| **BYO backend** | El provider `callable` permite conectar cualquier API interna o gateway corporativo |
| **Config externalizada** | `load_config()` soporta JSON/YAML para centralizar la configuración del LLM |

### 2.3 Desafíos Potenciales

| Desafío | Impacto | Mitigación |
|---------|---------|------------|
| **Desajuste de lenguaje (Python vs TypeScript)** | Alto: requiere un microservicio separado | Crear un servicio Flask/FastAPI liviano; la comunicación es HTTP |
| **Complejidad operativa** | Medio: hay que desplegar y mantener otro servicio | Usar contenedor Docker o integrar como serverless function |
| **Estructura de respuesta** | Bajo: el `callOllama()` actual espera `data.response`. Con llm_bridge se recibe `content` | Adaptar el parseo en el frontend (cambio trivial) |
| **Gestión de credenciales** | Medio: actualmente no hay manejo de API keys | Implementar variables de entorno en el microservicio |
| **Latencia adicional** | Bajo: una llamada HTTP extra al microservicio añade ~1-5ms | Despreciable frente a los 8-45s de inferencia del modelo |
| **Dependencia nueva** | Bajo: `pip install llm-bridge` (0 dependencias core) | Sin impacto en el árbol de dependencias de Node.js |
| **Prompt personalizado** | Bajo: el prompt de corrección es específico de CodeMp-AI | El prompt se sigue construyendo en TypeScript, solo cambia el transporte |

### 2.4 Archivos que se Verían Afectados

| Archivo | Cambio |
|---------|--------|
| `frontend/app/api/analyze/route.ts` | Reemplazar `callOllama()` por llamada al microservicio llm_bridge |
| `frontend/app/api/health/route.ts` | Cambiar health check de Ollama directo a health check del microservicio |
| `frontend/package.json` | Sin cambios (no se añaden dependencias Node.js) |
| `frontend/.env.local` | Añadir `LLM_BRIDGE_URL=http://localhost:5000` |
| **(Nuevo)** `backend/Dockerfile` | Docker para el microservicio Python |
| **(Nuevo)** `backend/requirements.txt` | `flask`, `llm-bridge`, `gunicorn` |
| **(Nuevo)** `backend/app.py` | Microservicio Flask/FastAPI con llm_bridge |
| **(Nuevo)** `backend/config.yaml` | Config de proveedor LLM (opcional, con `load_config()`) |

**Total estimado: 3 archivos modificados + 4 archivos nuevos (el microservicio).**

---

## 3. Conclusión y Recomendación

**Veredicto: La integración es técnicamente viable y aporta valor real, pero requiere un microservicio Python puente.**

### Recomendación

**Sí integrar**, pero con enfoque incremental:

1. **Fase 1 (inmediata):** Crear el microservicio Python con solo el provider `openai` apuntando a Ollama (vía `base_url`). Reemplazar la llamada directa a Ollama en route.ts. Esto ya desacopla el código.

2. **Fase 2 (corto plazo):** Añadir selector de proveedor en la UI (Ollama local, OpenAI, etc.) usando el sistema de providers de `llm_bridge`.

3. **Fase 3 (medio plazo):** Añadir métricas (tokens, latencia) usando `LLMResponse` y mostrarlas en la UI.

### Riesgo principal
Si el proyecto no planea migrar a otro proveedor de IA más allá de Ollama, la abstracción añade complejidad innecesaria. Sin embargo, si hay interés en soportar OpenAI, AWS Bedrock o Gemini en el futuro, `llm_bridge` es una solución casi perfecta.
