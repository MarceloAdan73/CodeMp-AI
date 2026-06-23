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

interface ProviderAttempt {
  label: string;
  success: boolean;
  error?: string;
}

interface AnalysisResult {
  errores: LintError[];
  resumen: string;
  codigoCorregido: string;
  mode?: 'demo' | 'full';
  usedProvider?: string | null;
  demoMessage?: string;
  providerError?: string;
  providerAttempts?: ProviderAttempt[];
}

interface ProviderOption {
  value: string;
  label: string;
  description: string;
}

const PROVIDER_OPTIONS: ProviderOption[] = [
  { value: '', label: 'Auto', description: 'Fallback automático (Ollama → Gemini → Claude)' },
  { value: 'ollama', label: 'Ollama', description: 'Local (qwen2.5-coder:1.5b)' },
  { value: 'gemini', label: 'Gemini', description: 'Google Gemini 2.0 Flash' },
  { value: 'claude', label: 'Claude', description: 'Anthropic Claude Sonnet 4' },
];

interface HistoryItem {
  id: string;
  timestamp: number;
  code: string;
  errorCount: number;
  language: string;
}

function CodeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function AlertCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function FileTextIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function ErrorDot({ severity }: { severity: number }) {
  return (
    <svg viewBox="0 0 8 8" className={`w-3 h-3 mt-0.5 flex-shrink-0 ${severity === 2 ? 'text-red-500' : 'text-yellow-500'}`} fill="currentColor">
      <circle cx="4" cy="4" r="4" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
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
  const [selectedProvider, setSelectedProvider] = useState<string>('');
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
        body: JSON.stringify({ code: fullCode, provider: selectedProvider || undefined }),
      });

      setAnalysisStage('ia');
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }

      setAnalysisStage('validating');
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      const data: AnalysisResult = await res.json();
      console.log('API Response:', data);
      setAnalysis(data);
      if (data.mode === 'demo' || data.providerError) setDemoMode(true);
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

  const exportReport = (): void => {
    if (!analysis) return;
    const date = new Date().toLocaleString();
    const lines = [
      `# CodeMp AI - Analysis Report`,
      ``,
      `**Date:** ${date}`,
      `**Provider:** ${analysis.usedProvider || 'None (demo)'}`,
      `**Mode:** ${analysis.mode}`,
      `**Total errors:** ${analysis.errores.length}`,
      ``,
      `## Summary`,
      ``,
      analysis.resumen,
      ``,
      `## Errors Detected`,
      ``,
    ];
    analysis.errores.forEach((e, i) => {
      lines.push(`### ${i + 1}. ${e.message}`);
      lines.push(`- **Line:** ${e.line || '?'}`);
      lines.push(`- **Rule:** ${e.ruleId || 'N/A'}`);
      lines.push(`- **Severity:** ${e.severity === 2 ? 'Error' : 'Warning'}`);
      lines.push(``);
    });
    lines.push(`## Fixed Code`);
    lines.push(``);
    lines.push('```' + (currentLanguage === 'python' ? 'python' : 'typescript'));
    lines.push(analysis.codigoCorregido);
    lines.push('```');
    lines.push(``);
    lines.push(`---`);
    lines.push(`*Generated by CodeMp AI*`);

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codemp-report-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const goToErrorLine = (line: number): void => {
    if (editorRef.current) {
      editorRef.current.goToLine(line);
    }
  };

  const errorCount = analysis?.errores.filter(e => e.severity === 2).length ?? 0;
  const warningCount = analysis?.errores.filter(e => e.severity === 1).length ?? 0;

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f] text-white">
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="h-14 flex items-center justify-between px-3 md:px-6 border-b border-white/[0.04] bg-[#0a0a0f]"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <CodeIcon />
            </div>
            <h1 className="font-space text-sm font-semibold text-white/90 tracking-tight">
              CodeMp
              <span className="text-blue-400">AI</span>
            </h1>
          </div>
          {(errorCount > 0 || warningCount > 0) && (
            <div className="flex items-center gap-1.5 ml-2">
              {errorCount > 0 && (
                <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded-md text-[11px] font-medium border border-red-500/10">
                  {errorCount} error{errorCount !== 1 ? 's' : ''}
                </span>
              )}
              {warningCount > 0 && (
                <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded-md text-[11px] font-medium border border-yellow-500/10">
                  {warningCount} warning{warningCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          <div className="relative">
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="appearance-none bg-white/[0.04] hover:bg-white/[0.08] text-xs md:text-sm text-white/70 px-3 py-1.5 pr-7 rounded-lg border border-white/[0.06] outline-none cursor-pointer transition"
              title="Seleccionar proveedor IA"
            >
              {PROVIDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} title={opt.description} className="bg-[#1a1a24]">
                  {opt.label}
                </option>
              ))}
            </select>
            <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-2.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg text-xs text-white/60 hover:text-white/90 transition flex items-center gap-1.5 border border-white/[0.06]"
            title="Ver historial (Ctrl+H)"
          >
            <HistoryIcon />
            <span className="hidden sm:inline">History</span>
          </button>

          <button
            onClick={() => { void handleAnalyze(); }}
            disabled={loading}
            className="px-3 md:px-4 py-1.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-blue-600/50 disabled:to-blue-500/50 rounded-lg text-xs md:text-sm font-medium transition flex items-center gap-1.5 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
            title="Analizar código (Ctrl+Enter)"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Analyzing</span>
              </>
            ) : (
              <>
                <PlayIcon />
                <span>Analyze</span>
              </>
            )}
          </button>
        </div>
      </motion.header>

      <DemoBanner
        message={
          analysis?.providerError
            ? analysis.providerError
            : analysis?.demoMessage || 'IA no disponible. Para probar correcciones con IA: ollama pull qwen2.5-coder:1.5b'
        }
        isVisible={demoMode}
        onClose={() => setDemoMode(false)}
        isError={!!analysis?.providerError}
      />

      <div className="md:hidden flex border-b border-white/[0.04]">
        <button
          onClick={() => setMobileTab('editor')}
          className={`flex-1 py-2.5 text-sm font-medium transition ${
            mobileTab === 'editor'
              ? 'text-white bg-white/[0.04]'
              : 'text-white/40'
          }`}
        >
          Editor
        </button>
        <button
          onClick={() => setMobileTab('problems')}
          className={`flex-1 py-2.5 text-sm font-medium transition ${
            mobileTab === 'problems'
              ? 'text-white bg-white/[0.04]'
              : 'text-white/40'
          }`}
        >
          Problems{analysis ? ` (${analysis.errores.length})` : ''}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          className={`
            ${mobileTab === 'editor' ? 'flex' : 'hidden'}
            md:flex w-full md:w-1/2 min-w-0
          `}
        >
          <div className="flex-1 p-1 md:p-2">
            <CodeEditor
              ref={editorRef}
              value={fullCode}
              onSelection={() => {}}
              onCodeChange={setFullCode}
              onLanguageChange={setCurrentLanguage}
            />
          </div>
        </div>

        <div className="hidden md:block w-px bg-white/[0.04]" />

        <div
          className={`
            ${mobileTab === 'problems' ? 'flex' : 'hidden'}
            md:flex w-full md:w-1/2 flex-col
          `}
        >
          <div className="h-11 flex items-center justify-between px-4 border-b border-white/[0.04]">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-white/40">
                Problems
              </span>
              {analysis && (
                <span className="text-[11px] text-white/20 bg-white/[0.04] px-1.5 py-0.5 rounded">
                  {analysis.errores.length}
                </span>
              )}
            </div>
            {analysis && analysis.errores.length > 0 && (
              <span className="text-[10px] text-white/20">
                Click to navigate
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-custom">
            {errorMessage && (
              <div className="mx-3 mt-3 p-3 bg-red-500/10 border border-red-500/15 rounded-lg flex items-start gap-2.5">
                <AlertCircleIcon />
                <span className="text-sm text-red-300">{errorMessage}</span>
              </div>
            )}

            {loading && (
              <AnalysisSkeleton stage={analysisStage} />
            )}

            {!analysis && !errorMessage && !loading && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center px-8 max-w-sm">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                    <CodeIcon />
                  </div>
                  <p className="text-sm text-white/30 font-medium mb-1">
                    No analysis yet
                  </p>
                  <p className="text-xs text-white/20 leading-relaxed">
                    Write or paste your code in the editor, then press{' '}
                    <kbd className="px-1.5 py-0.5 bg-white/[0.06] rounded text-[10px] font-mono text-white/40 border border-white/[0.06]">
                      Ctrl+Enter
                    </kbd>{' '}
                    to run analysis
                  </p>
                </div>
              </div>
            )}

            {analysis?.errores.map((error: LintError, index: number) => (
              <div
                key={index}
                onClick={() => error.line && goToErrorLine(error.line)}
                className="px-4 py-3 border-b border-white/[0.03] hover:bg-white/[0.03] transition cursor-pointer group"
              >
                <div className="flex gap-3">
                  <ErrorDot severity={error.severity ?? 1} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-mono text-white/30 group-hover:text-white/50 transition">
                        Line {error.line}
                      </span>
                      {error.ruleId && (
                        <span className="text-[10px] text-white/20 bg-white/[0.03] px-1.5 py-0.5 rounded font-mono">
                          {error.ruleId}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-white/70 group-hover:text-white/90 transition">
                      {error.message}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {analysis && (
            <div className="border-t border-white/[0.04] px-3 py-3 bg-white/[0.02]">
              {analysis.errores.length > 0 ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDiff(true)}
                    className="flex-1 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] rounded-lg text-sm text-white/70 hover:text-white transition flex items-center justify-center gap-2 border border-white/[0.06]"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <polyline points="19 12 12 19 5 12" />
                    </svg>
                    Preview Changes
                  </button>
                  <button
                    onClick={handleApplyFix}
                    className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-lg text-sm font-medium transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                  >
                    <CheckCircleIcon />
                    Apply Fix
                  </button>
                  <button
                    onClick={exportReport}
                    className="px-3 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] rounded-lg text-sm text-white/60 hover:text-white/90 transition border border-white/[0.06]"
                    title="Exportar reporte Markdown"
                  >
                    <FileTextIcon />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-sm text-green-400/80">
                  <CheckCircleIcon />
                  <span className="font-medium">All good — code is clean</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showHistory && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowHistory(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#12121a] rounded-xl w-full max-w-md max-h-[75vh] overflow-hidden flex flex-col border border-white/[0.08] shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-semibold text-white/90">Analysis History</h3>
              <button
                onClick={() => setShowHistory(false)}
                className="w-6 h-6 rounded-md bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-white/40 hover:text-white/70 transition text-xs"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-4 space-y-2">
              {history.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                    <HistoryIcon />
                  </div>
                  <p className="text-sm text-white/30">No saved analyses yet</p>
                  <p className="text-xs text-white/20 mt-1">Results are saved automatically after each analysis</p>
                </div>
              ) : (
                history.map((item: HistoryItem) => (
                  <div
                    key={item.id}
                    onClick={() => loadFromHistory(item)}
                    className="p-3 bg-white/[0.02] hover:bg-white/[0.04] rounded-lg cursor-pointer transition border border-white/[0.04] hover:border-white/[0.08]"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-white/50 font-mono">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 bg-red-500/10 text-red-400 rounded-md font-medium">
                        {item.errorCount} error{item.errorCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-white/20 bg-white/[0.04] px-1.5 py-0.5 rounded font-medium">
                        {item.language}
                      </span>
                      <span className="text-[11px] text-white/30 truncate">
                        {item.code.substring(0, 60)}...
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {history.length > 0 && (
              <div className="px-4 py-3 border-t border-white/[0.06]">
                <button
                  onClick={clearHistory}
                  className="w-full py-2 bg-red-500/8 hover:bg-red-500/15 text-red-400/80 hover:text-red-300 rounded-lg text-sm transition border border-red-500/10"
                >
                  Clear history
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
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
