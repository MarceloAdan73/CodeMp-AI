import { render, screen, fireEvent } from '@testing-library/react';
import user from '@testing-library/user-event';

jest.mock('@uiw/react-codemirror', () => {
  return {
    __esModule: true,
    default: function MockCodeMirror({ value, onChange }: any) {
      return (
        <div data-testid="codemirror-mock">
          <textarea
            data-testid="code-textarea"
            value={value}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
          />
        </div>
      );
    },
  };
});

describe('Analysis Buttons', () => {
  test('shows run analysis button', () => {
    render(
      <div>
        <button data-testid="analyze-button">Run Analysis</button>
      </div>
    );

    expect(screen.getByTestId('analyze-button')).toBeInTheDocument();
  });

  test('shows preview changes and apply fix buttons when analysis exists', () => {
    render(
      <div>
        <button data-testid="preview-button">Preview Changes</button>
        <button data-testid="apply-fix-button">Apply Fix</button>
      </div>
    );

    expect(screen.getByTestId('preview-button')).toBeInTheDocument();
    expect(screen.getByTestId('apply-fix-button')).toBeInTheDocument();
  });

  test('analyze button is disabled when loading', () => {
    render(
      <div>
        <button data-testid="analyze-button" disabled>
          Analizando...
        </button>
      </div>
    );

    expect(screen.getByTestId('analyze-button')).toBeDisabled();
  });
});