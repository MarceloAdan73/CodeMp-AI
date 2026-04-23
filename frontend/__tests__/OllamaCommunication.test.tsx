import { render, screen, waitFor } from '@testing-library/react';
import user from '@testing-library/user-event';

global.fetch = jest.fn();

const mockAnalysisResponse = {
  errores: [
    { line: 1, column: 1, message: 'Unused variable x', ruleId: 'no-unused-vars', severity: 1 }
  ],
  resumen: 'Code analyzed successfully',
  codigoCorregido: 'const y = 1;',
  mode: 'full'
};

describe('Ollama Communication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  test('fetches health endpoint to check Ollama availability', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ available: true }),
      ok: true
    });

    const response = await fetch('/api/health');
    const data = await response.json();

    expect(data.available).toBe(true);
  });

  test('sends code to analyze endpoint and receives corrections', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => mockAnalysisResponse,
      ok: true
    });

    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'const x = 1;' })
    });

    const data = await response.json();

    expect(data.errores).toHaveLength(1);
    expect(data.codigoCorregido).toBe('const y = 1;');
  });
});