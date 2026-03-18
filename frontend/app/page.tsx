'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import CodeEditor, { LANGUAGES, CodeEditorRef } from '@/components/CodeEditor';
import DiffViewer from '@/components/DiffViewer';
import AnalysisSkeleton, { AnalysisStage } from '@/components/AnalysisSkeleton';
import DemoBanner from '@/components/DemoBanner';

interface LintError {
  line?: number;
  column?: number;
  message: string;
  ruleId?: string | null;
  severity?: 1 | 2;
}

interface AnalysisResult {
  errores: LintError[];
  resumen: string;
  codigoCorregido: string;
  mode?: 'demo' | 'full';
  demoMessage?: string;
}

interface HistoryItem {
  id: string;
  timestamp: number;
  code: string;
  errorCount: number;
  language: string;
}

export default function Home() {
  const [fullCode, setFullCode] = useState<string>(LANGUAGES[0].example);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [analysisStage, setAnalysisStage] = useState<AnalysisStage>('eslint');
  const [mobileTab, setMobileTab] = useState<'editor' | 'problems'>('editor');
  const [showDiff, setShowDiff] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [currentLanguage, setCurrentLanguage] = useState<string>(LANGUAGES[0].id);
  const [demoMode, setDemoMode] = useState<boolean>(true);
  
  const editorRef = useRef<CodeEditorRef>(null);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (data.available) {
          setDemoMode(false);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const savedHistory = localStorage.getItem('codeAnalysisHistory');
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory) as HistoryItem[];
        setHistory(parsedHistory);
      } catch (error: unknown) {
        console.error('Error loading history:', error instanceof Error ? error.message : String(error));
      }
    }
  }, []);

  useEffect(() => {
    if (analysis && analysis.errores.length > 0) {
      setHistory(prevHistory => {
        const newItem: HistoryItem = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          code: fullCode,
          errorCount: analysis.errores.length,
          language: currentLanguage,
        };
        
        const updatedHistory = [newItem, ...prevHistory.slice(0, 4)];
        localStorage.setItem('codeAnalysisHistory', JSON.stringify(updatedHistory));
        return updatedHistory;
      });
    }
  }, [analysis, fullCode, currentLanguage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleAnalyze();
      }
      if (e.key === 'Escape' && showDiff) {
        setShowDiff(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        setShowHistory(!showHistory);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDiff, showHistory]);

  const handleAnalyze = async (): Promise<void> => {
    if (!fullCode.trim()) return;

    setLoading(true);
    setAnalysisStage('eslint');
    setErrorMessage(null);

    try {
      setAnalysisStage('eslint');
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: fullCode }),
      });

      setAnalysisStage('ia');
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }

      setAnalysisStage('validating');
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      const data: AnalysisResult = await res.json();
      setAnalysis(data);
      if (data.mode === 'demo') setDemoMode(true);
      setMobileTab('problems');
    } catch (error: unknown) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Error al analizar el codigo');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFix = (): void => {
    if (analysis) {
      setFullCode(analysis.codigoCorregido);
      setShowDiff(false);
    }
  };

  const loadFromHistory = (item: HistoryItem): void => {
    setFullCode(item.code);
    setShowHistory(false);
    setTimeout(() => { void handleAnalyze(); }, 100);
  };

  const clearHistory = (): void => {
    setHistory([]);
    localStorage.removeItem('codeAnalysisHistory');
  };

  const goToErrorLine = (line: number): void => {
    if (editorRef.current) {
      editorRef.current.goToLine(line);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#111113] text-white">
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="h-14 flex items-center justify-between px-6 border-b border-white/5 bg-[#111113]"
      >
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-semibold tracking-wide text-gray-300">
            CodeMp AI
          </h1>
          {analysis && (
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded">
                {analysis.errores.filter((e: LintError) => e.severity === 2).length} errors
              </span>
              <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded">
                {analysis.errores.filter((e: LintError) => e.severity === 1).length} warnings
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-md text-sm transition relative group"
            title="Ver historial de analisis (Ctrl+H)"
          >
            Historial
          </button>

          <button
            onClick={() => { void handleAnalyze(); }}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded-md text-sm transition disabled:opacity-50 flex items-center gap-2"
            title="Analizar codigo (Ctrl+Enter)"
          >
            {loading && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              />
            )}
            {loading ? 'Analizando...' : 'Run Analysis'}
          </button>
        </div>
      </motion.header>

      <DemoBanner
        message={analysis?.demoMessage || '⚠️ Modo demo: IA local no disponible. Para probar correcciones con IA: ollama pull qwen2.5-coder:1.5b'}
        isVisible={demoMode}
        onClose={() => setDemoMode(false)}
      />

      <div className="md:hidden flex border-b border-white/5">
        <button
          onClick={() => setMobileTab('editor')}
          className={`flex-1 py-2 text-sm transition ${
            mobileTab === 'editor'
              ? 'bg-white/5 text-white'
              : 'text-gray-400'
          }`}
        >
          Editor
        </button>

        <button
          onClick={() => setMobileTab('problems')}
          className={`flex-1 py-2 text-sm transition ${
            mobileTab === 'problems'
              ? 'bg-white/5 text-white'
              : 'text-gray-400'
          }`}
        >
          Problems
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          className={`
            ${mobileTab === 'editor' ? 'flex' : 'hidden'}
            md:flex w-full md:w-1/2 min-w-0
          `}
        >
          <div className="flex-1">
            <CodeEditor
              ref={editorRef}
              value={fullCode}
              onSelection={() => {}}
              onCodeChange={setFullCode}
              onLanguageChange={setCurrentLanguage}
            />
          </div>
        </div>

        <div className="hidden md:block w-px bg-white/5" />

        <div
          className={`
            ${mobileTab === 'problems' ? 'flex' : 'hidden'}
            md:flex w-full md:w-1/2 flex-col
          `}
        >
          <div className="h-12 flex items-center px-4 border-b border-white/5 text-xs uppercase tracking-wide text-gray-400">
            Problems {analysis ? `(${analysis.errores.length})` : ''}
            {analysis && analysis.errores.length > 0 && (
              <span className="ml-2 text-xs text-gray-500">
                (Click en error para ir a la linea)
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto text-sm">
            {errorMessage && (
              <div className="p-4 m-4 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
                {errorMessage}
              </div>
            )}

            {loading && (
              <AnalysisSkeleton stage={analysisStage} />
            )}

            {!analysis && !errorMessage && !loading && (
              <div className="h-full flex items-center justify-center text-gray-600 text-center px-6">
                <div>
                  <p className="mb-2">Run analysis to see lint results</p>
                  <p className="text-xs text-gray-500">Presiona Ctrl+Enter para analizar</p>
                </div>
              </div>
            )}

            {analysis?.errores.map((error: LintError, index: number) => (
              <div
                key={index}
                onClick={() => error.line && goToErrorLine(error.line)}
                className="px-4 py-3 border-b border-white/5 hover:bg-white/10 transition cursor-pointer"
              >
                <div className="flex gap-3">
                  <span
                    className={
                      error.severity === 2
                        ? 'text-red-500'
                        : 'text-yellow-500'
                    }
                  >
                    •
                  </span>

                  <div>
                    <div className="text-gray-500 text-xs">
                      Line {error.line}
                    </div>

                    <div className="text-gray-200">
                      {error.message}
                    </div>

                    {error.ruleId && (
                      <div className="text-xs text-gray-500 mt-1">
                        ({error.ruleId})
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {analysis && (
            <div className="border-t border-white/5 px-4 py-4">
              {analysis.errores.length > 0 ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDiff(true)}
                    className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-md text-sm transition"
                  >
                    Preview Changes
                  </button>
                  <button
                    onClick={handleApplyFix}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-md text-sm transition"
                  >
                    Apply Fix
                  </button>
                </div>
              ) : (
                <div className="text-center text-xs text-green-400 font-medium">
                  Code is up to date
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showHistory && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1f] rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col border border-white/10">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">Historial de Analisis</h3>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-400 hover:text-white transition"
              >
                X
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              {history.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay analisis guardados</p>
              ) : (
                <div className="space-y-2">
                  {history.map((item: HistoryItem) => (
                    <div
                      key={item.id}
                      onClick={() => loadFromHistory(item)}
                      className="p-3 bg-[#111113] hover:bg-[#1e1e24] rounded cursor-pointer transition border border-white/5"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-300">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                        <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded">
                          {item.errorCount} errores
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {item.language} • {item.code.substring(0, 50)}...
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {history.length > 0 && (
              <div className="p-4 border-t border-white/10">
                <button
                  onClick={clearHistory}
                  className="w-full py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-sm transition"
                >
                  Limpiar historial
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {analysis && (
        <DiffViewer
          oldCode={fullCode}
          newCode={analysis.codigoCorregido}
          showDiff={showDiff}
          onClose={() => setShowDiff(false)}
          onApply={handleApplyFix}
        />
      )}
    </div>
  );
}
