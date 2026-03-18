import { NextResponse } from 'next/server';
import { ESLint } from 'eslint';
import path from 'path';

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

async function isOllamaAvailable(): Promise<boolean> {
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
      baseConfig: {
        rules: {
          'semi': ['error', 'always'],
          'quotes': ['error', 'single'],
          'indent': ['error', 2],
          'no-var': 'error',
          'prefer-const': 'error',
          'no-unused-vars': ['error', { 
            'argsIgnorePattern': '^_',
            'varsIgnorePattern': '^_',
            'caughtErrorsIgnorePattern': '^_'
          }],
          'eqeqeq': ['error', 'always'],
        },
      },
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

async function callOllama(code: string, errors: LintMessage[]) {
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
    let finalCode = lintResult.fixedCode;

    console.log('Errors found:', errors.length);

    const ollamaAvailable = await isOllamaAvailable();
    let modelFixedCode = finalCode;

    if (errors.length > 0) {
      if (ollamaAvailable) {
        modelFixedCode = await callOllama(finalCode, errors);

        const validationResult = await runESLint(modelFixedCode);
        if (validationResult.errors.length === 0) {
          finalCode = modelFixedCode;
        } else {
          console.warn('Model introduced new errors; reverting to ESLint output.');
        }
      }

      return NextResponse.json({
        errores: errors,
        resumen: errors.length === 0
          ? 'Code automatically fixed by ESLint.'
          : ollamaAvailable
            ? 'Automatic fixes applied and additional refactor attempted.'
            : 'Automatic fixes applied. Ollama not available for AI refactoring.',
        codigoCorregido: finalCode,
        mode: ollamaAvailable ? 'full' : 'demo',
        demoMessage: ollamaAvailable ? undefined : DEMO_MESSAGE,
      });
    }

    return NextResponse.json({
      errores: errors,
      resumen: 'Code automatically fixed by ESLint.',
      codigoCorregido: finalCode,
      mode: 'full',
    });
  } catch (error: unknown) {
    console.error('Error in analyze:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}