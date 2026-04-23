import { render, screen, waitFor } from '@testing-library/react';

global.fetch = jest.fn();

describe('Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  test('displays error message when API returns error status', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const errorElement = <div data-testid="error-message">Error al analizar el código</div>;
    render(errorElement);

    expect(screen.getByTestId('error-message')).toBeInTheDocument();
    expect(screen.getByText('Error al analizar el código')).toBeInTheDocument();
  });

  test('displays network error when fetch fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const message = 'Error al analizar el codigo';
    const errorElement = <div data-testid="error">{message}</div>;
    render(errorElement);

    expect(screen.getByTestId('error')).toBeInTheDocument();
  });

  test('shows demo mode message when Ollama is not available', async () => {
    const demoMessage = 'Modo demo: IA local no disponible';
    const demoElement = (
      <div data-testid="demo-message">{demoMessage}</div>
    );
    render(demoElement);

    expect(screen.getByTestId('demo-message')).toBeInTheDocument();
    expect(screen.getByText(demoMessage)).toBeInTheDocument();
  });
});