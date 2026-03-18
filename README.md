# CodeMp-AI

Herramienta de análisis y corrección automática de código que combina **ESLint** con un modelo de IA local (**Ollama**) para ofrecer sugerencias inteligentes.

[![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue)](https://www.typescriptlang.org/)
[![ESLint](https://img.shields.io/badge/ESLint-9.24.0-4B32C3)](https://eslint.org/)
[![Ollama](https://img.shields.io/badge/Ollama-0.17.4-5A4FCF)](https://ollama.ai/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Production_Ready-success)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)]()
[![Last Commit](https://img.shields.io/github/last-commit/MarceloAdan73/CodeMp-AI)]()

## Demo

**Pruébalo ahora:** [https://codemp-ai.vercel.app](https://codemp-ai.vercel.app)

> **Nota:** La interfaz funciona online. La IA requiere Ollama local (ver [Requisitos](#requisitos)).

## 💡 ¿Por qué CodeMp AI?

Demuestra integración de IA local (Ollama) con Next.js, incluyendo:

- 🤖 **Modelos locales** sin APIs externas ni costos de servidor
- 🎨 **UX profesional** con loading states animados (3 etapas)
- 🛡️ **Validación inteligente** contra errores de IA
- 🚀 **Arquitectura moderna** (Next.js 15, TypeScript, Tailwind)
- 🌐 **Modo demo** que funciona en Vercel sin Ollama

## Características

- **Editor de código** con soporte para TypeScript, TSX, JavaScript y Python
- **Análisis con ESLint** y correcciones automáticas
- **IA local con Ollama** para sugerencias inteligentes
- **Preview de cambios** antes de aplicar correcciones
- **Historial persistente** de análisis
- **Navegación directa** desde errores a líneas de código
- **Responsive** para desktop y mobile
- **Modo demo** cuando Ollama no está disponible

## Requisitos

- [Node.js](https://nodejs.org/) 18+
- [Ollama](https://ollama.com/download)
- Modelo `qwen2.5-coder:1.5b`

```bash
ollama pull qwen2.5-coder:1.5b
```

### Cambio de modelo

Para usar otro modelo, edita `frontend/app/api/analyze/route.ts` línea 69:

```typescript
model: 'deepseek-coder:1.3b'  // Más rápido
```

| Modelo | Velocidad | Precisión |
|--------|-----------|-----------|
| `deepseek-coder:1.3b` | 8-12s | Media |
| `qwen2.5-coder:1.5b` | 15-25s | Buena |
| `deepseek-coder:6.7b` | 30-45s | Alta |

## Instalación

```bash
git clone https://github.com/MarceloAdan73/CodeMp-AI.git
cd codemp-ai/frontend
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

## Uso

1. Selecciona un lenguaje de programación
2. Escribe o pega tu código
3. Presiona `Run Analysis` o `Ctrl+Enter`
4. Revisa los errores en el panel derecho
5. Usa `Preview Changes` para ver diferencias o `Apply Fix` para aplicar

### Atajos de teclado

| Atajo | Acción |
|-------|--------|
| `Ctrl+Enter` | Analizar código |
| `Ctrl+H` | Ver historial |
| `ESC` | Cerrar modal |

## 📸 Capturas

### Escritorio

| Editor | Panel de Problemas | Preview de Cambios |
|--------|-------------------|-------------------|
| ![Editor](frontend/public/editor-code.png) | ![Problems](frontend/public/problems-panel.png) | ![Diff](frontend/public/modal-diff.png) |

### Móvil e Historial

| Vista Móvil | Historial | Banner Demo |
|-------------|-----------|-------------|
| ![Mobile](frontend/public/mobile-view.png) | ![History](frontend/public/history-modal.png) | ![Demo](frontend/public/demo-banner.png) |

> **Nota:** Para Vercel, establece la carpeta `frontend` como root del proyecto.

## Configuración de ESLint

Reglas habilitadas en `eslint.config.js`:

```javascript
rules: {
  semi: ['error', 'always'],
  quotes: ['error', 'single'],
  indent: ['error', 2],
  'no-var': 'error',
  'prefer-const': 'error',
  'no-unused-vars': 'error',
  'eqeqeq': ['error', 'always'],
}
```

## Estructura del proyecto

```
frontend/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts    # API: ESLint + Ollama
│   │   └── health/route.ts     # Verificación de Ollama
│   ├── page.tsx                # Página principal
│   └── layout.tsx              # Layout raíz
├── components/
│   ├── CodeEditor.tsx          # Editor CodeMirror
│   ├── DiffViewer.tsx          # Vista de cambios
│   ├── AnalysisSkeleton.tsx    # Estados de carga
│   └── DemoBanner.tsx          # Banner modo demo
└── hooks/
    └── useTheme.tsx            # Theme provider
```

## 🗺️ Roadmap

- [ ] Selector de modelo de IA en la UI
- [ ] Soporte para más lenguajes (Java, Go, Rust)
- [ ] Exportar reportes (PDF/Markdown)
- [ ] Compartir código por URL
- [ ] Tests automatizados con Jest

## Tecnologías

- **Next.js 15** - Framework React
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos
- **CodeMirror 6** - Editor de código
- **ESLint 9** - Linting
- **Ollama** - Motor IA local
- **Framer Motion** - Animaciones

## Contribuir

Las contribuciones son bienvenidas. Abre un [issue](https://github.com/MarceloAdan73/CodeMp-AI/issues) o [PR](https://github.com/MarceloAdan73/CodeMp-AI/pulls).

## Licencia

[MIT](LICENSE) - Marcelo Palma
