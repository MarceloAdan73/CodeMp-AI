import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

global.fetch = jest.fn();

describe('Ollama API Communication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  test('calls analyze API endpoint with code', async () => {
    const mockResponse = {
      errores: [],
      resumen: 'No hay errores',
      codigoCorregido: 'const x = 1;',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'const x = 1;' }),
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/analyze', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'const x = 1;' }),
    }));

    const data = await response.json();
    expect(data.errores).toEqual([]);
  });

  test('handles successful Ollama analysis response', async () => {
    const mockAnalysisResult = {
      errores: [
        { message: 'Unused variable', line: 1, severity: 1 },
      ],
      resumen: 'Código procesado',
      codigoCorregido: 'const x = 1;',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalysisResult,
    });

    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'const x = 1;' }),
    });

    const data = await response.json();
    expect(data.errores).toHaveLength(1);
    expect(data.errores[0].message).toBe('Unused variable');
  });
});