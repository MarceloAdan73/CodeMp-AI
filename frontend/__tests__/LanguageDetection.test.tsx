import { render, screen, fireEvent } from '@testing-library/react';
import CodeEditor, { LANGUAGES } from '../components/CodeEditor';

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

describe('Language Detection', () => {
  const mockOnSelection = jest.fn();
  const mockOnCodeChange = jest.fn();
  const mockOnLanguageChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows TypeScript as default language', () => {
    render(
      <CodeEditor
        value="const x: number = 1;"
        onSelection={mockOnSelection}
        onCodeChange={mockOnCodeChange}
      />
    );

    expect(screen.getByDisplayValue(/TypeScript/)).toBeInTheDocument();
  });

  test('changes language when dropdown selection changes', () => {
    render(
      <CodeEditor
        value="const x = 1;"
        onSelection={mockOnSelection}
        onCodeChange={mockOnCodeChange}
        onLanguageChange={mockOnLanguageChange}
      />
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'python' } });

    expect(mockOnLanguageChange).toHaveBeenCalledWith('python');
  });
});