import { render, screen } from '@testing-library/react';
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

describe('CodeEditor', () => {
  const mockOnSelection = jest.fn();
  const mockOnCodeChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders code editor with initial value', () => {
    const initialCode = 'const x = 1;';
    render(
      <CodeEditor
        value={initialCode}
        onSelection={mockOnSelection}
        onCodeChange={mockOnCodeChange}
      />
    );

    expect(screen.getByTestId('codemirror-mock')).toBeInTheDocument();
  });

  test('renders language selector with all available languages', () => {
    render(
      <CodeEditor
        value="const x = 1;"
        onSelection={mockOnSelection}
        onCodeChange={mockOnCodeChange}
      />
    );

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(4);
  });
});