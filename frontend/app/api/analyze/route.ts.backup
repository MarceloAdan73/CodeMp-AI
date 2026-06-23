import { NextResponse } from 'next/server';
import { ESLint } from 'eslint';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface LintMessage {
  message: string;
  ruleId?: string | null;
  line?: number;
  column?: number;
  severity?: 1 | 2;
}

interface OllamaResponse {
  response?: string;
}

const DEMO_MESSAGE = '⚠️ Demo mode: Local AI not available. To test AI corrections: ollama pull qwen2.5-coder:1.5b';

async function checkOllamaAvailability(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch('http://localhost:11434/api/tags', {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
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

async function analyzeWithOllama(code: string, errors: LintMessage[]) {
  try {
    const errorList = errors
      .map(e => `- ${e.message} (${e.ruleId || 'unknown'}) at line ${e.line || '?'}`)
      .join('\n');

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5-coder:1.5b',
        prompt: `
You are an expert code linter and fixer. Your task is to correct the given code so that it passes all ESLint rules.

The following errors were reported:

${errorList}

Rules to apply:
- Remove any unused variables, functions, or imports.
- Replace 'var' with 'const' or 'let' as appropriate.
- Use strict equality (===) instead of loose equality (==).
- Add missing semicolons.
- Do not change the logic or behavior of the code.
- Return ONLY the corrected code, without any explanations, comments, or markdown formatting.

Here is the code to fix:

${code}
`,
        stream: false,
      }),
    });

    const data: OllamaResponse = await response.json();
    return data.response?.trim() ?? code;
  } catch (error: unknown) {
    console.error('Error calling Ollama:', error);
    return code;
  }
}

function detectLanguage(code: string): string {
  if (/^\s*(import\s|export\s|const\s|let\s|var\s|function\s|class\s|=>\s*{)/m.test(code)) return 'javascript';
  if (/^\s*(def |import |from |class |print\()/m.test(code)) return 'python';
  if (/^\s*(use\s|fn\s|let\s|mut\s|impl\s)/m.test(code)) return 'rust';
  if (/^\s*(package\s|import\s|func\s|var\s|:=)/m.test(code)) return 'go';
  if (/^\s*(#include\s|int\s|void\s|char\s)/m.test(code)) return 'c';
  return 'javascript';
}

async function analyzeWithGemini(code: string, errors: LintMessage[], language?: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const errorList = errors
      .map(e => `- ${e.message} (${e.ruleId || 'unknown'}) at line ${e.line || '?'}`)
      .join('\n');

    const prompt = `
You are an expert code linter and fixer. Your task is to correct the following ${language || 'javascript'} code so that it passes all ESLint rules.

The following errors were reported:

${errorList}

Rules to apply:
- Remove any unused variables, functions, or imports.
- Replace 'var' with 'const' or 'let' as appropriate.
- Use strict equality (===) instead of loose equality (==).
- Add missing semicolons.
- Do not change the logic or behavior of the code.
- Return ONLY the corrected code, without any explanations, comments, or markdown formatting.

Here is the code to fix:

${code}
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text().trim();
    text = text.replace(/^```[\w]*\n?|```$/g, '').trim();

    return text || null;
  } catch (error: unknown) {
    console.error('Error calling Gemini:', error);
    return null;
  }
}

async function validateCorrection(originalCode: string, correctedCode: string): Promise<string> {
  const validationResult = await runESLint(correctedCode);
  if (validationResult.errors.length === 0) {
    return correctedCode;
  }
  console.warn('Model introduced new errors; reverting to ESLint output.');
  return originalCode;
}

export async function POST(req: Request) {
  console.log('API analyze called');
  
  try {
    const { code } = await req.json();
    console.log('Code length:', code?.length);

    if (!code) {
      return NextResponse.json(
        { error: 'No code provided.' },
        { status: 400 }
      );
    }

    const lintResult = await runESLint(code);
    const errors = lintResult.errors;
    const eslintFixedCode = lintResult.fixedCode;

    console.log('Errors found:', errors.length);

    if (errors.length === 0) {
      return NextResponse.json({
        errores: errors,
        resumen: 'Code automatically fixed by ESLint.',
        codigoCorregido: eslintFixedCode,
        mode: 'full',
      });
    }

    const ollamaAvailable = await checkOllamaAvailability();
    let finalCode = eslintFixedCode;
    let usedProvider: 'ollama' | 'gemini' | null = null;

    if (ollamaAvailable) {
      const modelFixedCode = await analyzeWithOllama(eslintFixedCode, errors);
      finalCode = await validateCorrection(eslintFixedCode, modelFixedCode);
      usedProvider = 'ollama';
    }

    if (!usedProvider) {
      const language = detectLanguage(eslintFixedCode);
      const geminiResult = await analyzeWithGemini(eslintFixedCode, errors, language);
      if (geminiResult) {
        finalCode = await validateCorrection(eslintFixedCode, geminiResult);
        usedProvider = 'gemini';
      }
    }

    const isDemo = usedProvider === null;

    return NextResponse.json({
      errores: errors,
      resumen: errors.length === 0
        ? 'Code automatically fixed by ESLint.'
        : usedProvider === 'ollama'
          ? 'Automatic fixes applied and additional refactor attempted.'
          : usedProvider === 'gemini'
            ? 'Automatic fixes applied via Gemini and additional refactor attempted.'
            : 'Automatic fixes applied. No AI provider available for refactoring.',
      codigoCorregido: finalCode,
      mode: isDemo ? 'demo' : 'full',
      demoMessage: isDemo ? DEMO_MESSAGE : undefined,
    });
  } catch (error: unknown) {
    console.error('Error in analyze:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
