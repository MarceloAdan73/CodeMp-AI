import { NextResponse } from 'next/server';
import { ESLint } from 'eslint';

interface LintMessage {
  message: string;
  ruleId?: string | null;
  line?: number;
  column?: number;
  severity?: 1 | 2;
}

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

interface ProviderAttempt {
  label: string;
  success: boolean;
  error?: string;
}

const LLM_BRIDGE_URL = process.env.LLM_BRIDGE_URL || 'http://localhost:5000';
const DEMO_MESSAGE = '⚠️ Demo mode: AI not available. Start the microservice with: cd backend && python app.py';

function buildErrorList(errors: LintMessage[]): string {
  return errors
    .map(e => `- ${e.message} (${e.ruleId || 'unknown'}) at line ${e.line || '?'}`)
    .join('\n');
}

function buildSystemPrompt(errors: LintMessage[], language: string): string {
  const errorList = buildErrorList(errors);
  const isPython = language === 'python';
  return `You are an expert code linter and fixer. Your task is to correct the following ${language} code so that it passes all linting rules.

The following errors were reported:

${errorList}

Rules to apply:
${isPython
  ? `- Remove unused imports and variables.
- Fix indentation and spacing issues.
- Follow PEP 8 conventions.
- Do not change the logic or behavior of the code.`
  : `- Remove any unused variables, functions, or imports.
- Replace 'var' with 'const' or 'let' as appropriate.
- Use strict equality (===) instead of loose equality (==).
- Add missing semicolons.`}
- Do not change the logic or behavior of the code.
- Return ONLY the corrected code, without any explanations, comments, or markdown formatting.`;
}

async function runESLint(code: string) {
  try {
    console.log('Running ESLint...');
    
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [{
        languageOptions: {
          ecmaVersion: 2022,
          sourceType: 'module',
          globals: {
            console: 'readonly',
            window: 'readonly',
            document: 'readonly',
            require: 'readonly',
            module: 'readonly',
            exports: 'readonly',
          },
        },
        rules: {
          'semi': ['error', 'always'],
          'quotes': ['error', 'single'],
          'indent': ['error', 2],
          'no-var': 'error',
          'prefer-const': 'error',
          'no-unused-vars': ['error', { 
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
          }],
          'eqeqeq': ['error', 'always'],
        },
      }],
      fix: true,
    });

    const results = await eslint.lintText(code);
    const result = results[0];

    console.log('ESLint errors:', result.messages);
    console.log('Fixed code:', result.output);

    return {
      errors: result.messages as LintMessage[],
      fixedCode: result.output ?? code,
    };
  } catch (error: unknown) {
    console.error('Error running ESLint:', error);
    return {
      errors: [],
      fixedCode: code,
    };
  }
}

async function runRuff(code: string) {
  try {
    console.log('Running Ruff (Python linter)...');
    const response = await fetch(`${LLM_BRIDGE_URL}/lint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (!response.ok) return { errors: [] as LintMessage[], fixedCode: code };
    const data = await response.json();
    return {
      errors: data.errors as LintMessage[],
      fixedCode: data.fixedCode || code,
    };
  } catch (error: unknown) {
    console.error('Error running Ruff:', error);
    return { errors: [] as LintMessage[], fixedCode: code };
  }
}

function detectLanguage(code: string): string {
  if (/^\s*(def |import [a-zA-Z_]|from \S+ import |class |print\()/m.test(code)) return 'python';
  if (/^\s*(import\s*[{\*]|import\s+\w+\s+from|export\s|const\s|let\s|var\s|function\s|class\s|=>\s*{)/m.test(code)) return 'javascript';
  if (/^\s*(use\s|fn\s|let\s|mut\s|impl\s)/m.test(code)) return 'rust';
  if (/^\s*(package\s|import\s|func\s|var\s|:=)/m.test(code)) return 'go';
  if (/^\s*(#include\s|int\s|void\s|char\s)/m.test(code)) return 'c';
  return 'javascript';
}

const PROVIDER_SETUP: Record<string, string> = {
  google: '❌ Gemini: API key inválida o no configurada. Creá una gratis en https://aistudio.google.com/apikey',
  openai: '❌ Ollama: servidor no disponible. Instalá Ollama desde https://ollama.com/download y ejecutá: ollama pull qwen2.5-coder:1.5b',
  claude: '❌ Claude: API key no configurada. Agregá ANTHROPIC_API_KEY en backend/.env',
  grok: '❌ Grok: API key no configurada. Agregá XAI_API_KEY en backend/.env',
};

function friendlyError(provider: string, raw: string): string {
  const lower = raw.toLowerCase();
  // Connection refused → provider not running
  if (lower.includes('econnrefused') || lower.includes('econnreset') || lower.includes('connection refused')) {
    if (provider === 'openai') return PROVIDER_SETUP.openai;
    return `❌ ${provider}: servidor no disponible. Revisá que esté corriendo.`;
  }
  // Invalid API key
  if (lower.includes('api_key_invalid') || lower.includes('api key not valid')) {
    return '❌ Gemini: API key inválida. Creá una gratis en https://aistudio.google.com/apikey';
  }
  // Missing or empty API key
  if (lower.includes('api key') || lower.includes('api_key')) {
    if (provider === 'openai') return PROVIDER_SETUP.openai;
    return PROVIDER_SETUP[provider] || `❌ ${provider}: API key no configurada. Revisá backend/.env`;
  }
  // Quota / rate limit
  if (lower.includes('429') || lower.includes('quota') || lower.includes('rate limit')) {
    return `❌ ${provider}: cuota agotada. Intentá de nuevo más tarde.`;
  }
  // Auth error
  if (lower.includes('401') || lower.includes('unauthorized')) {
    return `❌ ${provider}: autenticación fallida. Revisá tu API key.`;
  }
  // Generic connection error
  if (lower.includes('connect') || lower.includes('timeout') || lower.includes('fetch')) {
    if (provider === 'openai') return PROVIDER_SETUP.openai;
    return `❌ ${provider}: no se pudo conectar. Revisá que el servidor esté disponible.`;
  }
  return PROVIDER_SETUP[provider] || `❌ ${provider}: ${raw}`;
}

async function analyzeWithBridge(config: BridgeRequest): Promise<BridgeResponse | { error: string } | null> {
  try {
    const response = await fetch(`${LLM_BRIDGE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const raw = body.error || `HTTP ${response.status}`;
      return { error: friendlyError(config.provider, raw) };
    }
    return await response.json();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { error: friendlyError(config.provider, msg) };
  }
}

async function validateCorrection(originalCode: string, correctedCode: string, language: string): Promise<string> {
  const lintFn = language === 'python' ? runRuff : runESLint;
  const validationResult = await lintFn(correctedCode);
  if (validationResult.errors.length === 0) {
    return correctedCode;
  }
  console.warn('Model introduced new errors; reverting to original output.');
  return originalCode;
}

const PROVIDERS: { provider: string; model: string; base_url?: string; label: string }[] = [
  { provider: 'openai', model: 'qwen2.5-coder:1.5b', base_url: 'http://localhost:11434/v1', label: 'ollama' },
  { provider: 'google', model: 'gemini-2.0-flash', label: 'gemini' },
  { provider: 'claude', model: 'claude-sonnet-4-20250514', label: 'claude' },
];

export async function POST(req: Request) {
  console.log('API analyze called');
  
  try {
    const { code, provider: selectedProvider, model: selectedModel } = await req.json();
    console.log('Code length:', code?.length);

    if (!code) {
      return NextResponse.json(
        { error: 'No code provided.' },
        { status: 400 }
      );
    }

    const language = detectLanguage(code);
    const lintFn = language === 'python' ? runRuff : runESLint;
    const lintResult = await lintFn(code);
    const errors = lintResult.errors;
    const lintFixedCode = lintResult.fixedCode;

    console.log('Errors found:', errors.length);

    if (errors.length === 0) {
      return NextResponse.json({
        errores: errors,
        resumen: language === 'python' ? 'Code automatically fixed by Ruff.' : 'Code automatically fixed by ESLint.',
        codigoCorregido: lintFixedCode,
        mode: 'full',
      });
    }

    let finalCode = lintFixedCode;
    let usedProvider: string | null = null;
    const providerAttempts: ProviderAttempt[] = [];

    const providersToTry = selectedProvider
      ? PROVIDERS.filter(p => p.label === selectedProvider)
      : PROVIDERS;

    for (const providerCfg of providersToTry) {
      if (usedProvider) break;

      const messages = [
        { role: 'system' as const, content: buildSystemPrompt(errors, language) },
        { role: 'user' as const, content: lintFixedCode },
      ];

      const result = await analyzeWithBridge({
        provider: providerCfg.provider,
        model: selectedModel || providerCfg.model,
        base_url: providerCfg.base_url,
        messages,
        temperature: 0.7,
      });

      if (result && 'content' in result) {
        const cleaned = result.content.replace(/^```[\w]*\n?|```$/g, '').trim();
        finalCode = await validateCorrection(lintFixedCode, cleaned, language);
        usedProvider = providerCfg.label;
        providerAttempts.push({ label: providerCfg.label, success: true });
      } else if (result && 'error' in result) {
        providerAttempts.push({ label: providerCfg.label, success: false, error: result.error });
      } else {
        providerAttempts.push({ label: providerCfg.label, success: false, error: 'No response' });
      }
    }

    const isDemo = usedProvider === null;

    const resumenMap: Record<string, string> = {
      ollama: 'Automatic fixes applied and additional refactor attempted.',
      gemini: 'Automatic fixes applied via Gemini and additional refactor attempted.',
      claude: 'Automatic fixes applied via Claude and additional refactor attempted.',
      grok: 'Automatic fixes applied via Grok and additional refactor attempted.',
      mock: 'Automatic fixes applied via Mock provider.',
    };

    const failedAttempts = providerAttempts.filter(a => !a.success);

    return NextResponse.json({
      errores: errors,
      resumen: isDemo
        ? 'Automatic fixes applied. No AI provider available for refactoring.'
        : resumenMap[usedProvider!] || `Automatic fixes applied via ${usedProvider}.`,
      codigoCorregido: finalCode,
      mode: isDemo ? 'demo' : 'full',
      usedProvider,
      demoMessage: isDemo ? DEMO_MESSAGE : undefined,
      providerAttempts,
      providerError: failedAttempts.length > 0 ? failedAttempts[0].error : undefined,
    });
  } catch (error: unknown) {
    console.error('Error in analyze:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
