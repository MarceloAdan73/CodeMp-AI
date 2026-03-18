'use client';

import { useState, forwardRef, useImperativeHandle } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { EditorView } from '@codemirror/view';
import type { ViewUpdate } from '@codemirror/view';
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror';

export const LANGUAGES = [
  {
    id: 'typescript',
    name: 'TypeScript',
    extension: () => javascript({ typescript: true }),
    icon: '🔷',
    example: `interface User {
  id: number;
  name: string;
}

function greet(user: User): string {
  return \`Hola, \${user.name}\`;
}`
  },
  {
    id: 'tsx',
    name: 'TSX (React)',
    extension: () =>
      javascript({
        typescript: true,
        jsx: true
      }),
    icon: '⚛️',
    example: `import { useState } from 'react';

export default function Button() {
  const [count, setCount] = useState(0);

  return (
    <button
      onClick={() => setCount(count + 1)}
      className="px-4 py-2 bg-blue-600 text-white rounded"
    >
      Clicked {count} times
    </button>
  );
}`
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    extension: () => javascript(),
    icon: '🟨',
    example: `function sum(a, b) {
  return a + b;
}

console.log(sum(5, 10));`
  },
  {
    id: 'python',
    name: 'Python',
    extension: () => python(),
    icon: '🐍',
    example: `def sum(a, b):
    return a + b

print(sum(5, 10))`
  }
];

const modernDarkTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#111113',
      color: '#e4e4e7',
      height: '100%'
    },
    '.cm-content': {
      caretColor: '#60a5fa'
    },
    '.cm-cursor': {
      borderLeftColor: '#60a5fa'
    },
    '.cm-selectionBackground': {
      backgroundColor: '#1f2937'
    },
    '.cm-activeLine': {
      backgroundColor: '#16161a'
    },
    '.cm-gutters': {
      backgroundColor: '#111113',
      color: '#52525b',
      border: 'none'
    }
  },
  { dark: true }
);

interface Props {
  value: string;
  onSelection: (_selectedText: string) => void;
  onCodeChange: (_code: string) => void;
  onLanguageChange?: (_languageId: string) => void;
}

export interface CodeEditorRef {
  goToLine: (_line: number) => void;
}

const CodeEditor = forwardRef<CodeEditorRef, Props>(({
  value: _value,
  onSelection: _onSelection,
  onCodeChange: _onCodeChange,
  onLanguageChange: _onLanguageChange
}, ref) => {
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [editorView, setEditorView] = useState<EditorView | null>(null);

  const onSelection = _onSelection;
  const onCodeChange = _onCodeChange;
  const onLanguageChange = _onLanguageChange;

  // Exponer método goToLine al componente padre
  useImperativeHandle(ref, () => ({
    goToLine: (line: number) => {
      if (editorView) {
        const doc = editorView.state.doc;
        if (line >= 1 && line <= doc.lines) {
          const pos = doc.line(line).from;
          editorView.dispatch({
            selection: { anchor: pos },
            effects: EditorView.scrollIntoView(pos, { y: 'center' })
          });
        }
      }
    }
  }));

  const handleSelection = (update: ViewUpdate) => {
    if (update.selectionSet) {
      const { from, to } = update.state.selection.main;
      const selected = update.state.sliceDoc(from, to);

      if (selected?.trim()) {
        // Llamar a onSelection con el texto seleccionado
        onSelection(selected);
      }
    }
  };

  const handleLanguageChange = (langId: string) => {
    const newLang = LANGUAGES.find(l => l.id === langId) || LANGUAGES[0];

    setLanguage(newLang);
    // Actualizar el código con el ejemplo del nuevo lenguaje
    onCodeChange(newLang.example);

    if (onLanguageChange) {
      onLanguageChange(newLang.id);
    }
  };

  const handleEditorMount = (editor: ReactCodeMirrorRef) => {
    // Guardar referencia al editor view
    if (editor && editor.view) {
      setEditorView(editor.view);
    }
  };

  const handleCodeChange = (newCode: string) => {
    // Pasar el nuevo código al padre
    onCodeChange(newCode);
  };

  return (
    <div className="flex flex-col h-full bg-[#111113]">

      {/* TOP BAR */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-white/5">
        <select
          value={language.id}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="bg-[#1a1a1f] text-gray-200 border border-white/10 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
        >
          {LANGUAGES.map(lang => (
            <option
              key={lang.id}
              value={lang.id}
              className="bg-[#1a1a1f] text-gray-200"
            >
              {lang.icon} {lang.name}
            </option>
          ))}
        </select>

        <span className="text-xs text-gray-500">
          Select code to analyze
        </span>
      </div>

      {/* EDITOR */}
      <div className="flex-1 overflow-hidden">
        <CodeMirror
          value={_value}
          height="100%"
          extensions={[
            language.extension(),
            modernDarkTheme
          ]}
          onChange={handleCodeChange}
          onUpdate={handleSelection}
          onCreateEditor={handleEditorMount}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLine: true,
            highlightActiveLineGutter: true,
            foldGutter: true
          }}
          style={{ height: '100%' }}
        />
      </div>
    </div>
  );
});

CodeEditor.displayName = 'CodeEditor';

export default CodeEditor;