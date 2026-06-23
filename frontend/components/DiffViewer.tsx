'use client';

import { motion } from 'framer-motion';
import ReactDiffViewer from 'react-diff-viewer-continued';

interface Props {
  oldCode: string;
  newCode: string;
  showDiff: boolean;
  onClose: () => void;
  onApply: () => void;
}

export default function DiffViewer({ oldCode, newCode, showDiff, onClose, onApply }: Props) {
  if (!showDiff) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#12121a] rounded-xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col border border-white/[0.08] shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            <h3 className="text-sm font-semibold text-white/90">Code Changes Preview</h3>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-md bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-white/40 hover:text-white/70 transition text-xs"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-[#0a0a0f]">
          <ReactDiffViewer
            oldValue={oldCode}
            newValue={newCode}
            splitView={true}
            useDarkTheme={true}
            styles={{
              diffContainer: {
                background: '#0a0a0f',
                fontSize: '13px',
                fontFamily: 'JetBrains Mono, monospace',
              },
              line: {
                padding: '0 8px',
              },
              gutter: {
                background: '#12121a',
                color: '#555',
                padding: '0 8px',
                borderRight: '1px solid #222',
              },
              marker: {
                backgroundColor: 'transparent',
                width: '20px',
              },
              wordDiff: {
                padding: '2px 0',
              },
              wordAdded: {
                background: '#1a3a2a',
                color: '#b3f0d0',
              },
              wordRemoved: {
                background: '#3a1a1a',
                color: '#fbbbbb',
              },
              lineNumber: {
                color: '#555',
              },
              emptyLine: {
                background: 'transparent',
              },
              emptyGutter: {
                background: '#12121a',
                borderRight: '1px solid #222',
              },
            }}
          />
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/[0.06]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-white/50 hover:text-white/80 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onApply();
              onClose();
            }}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-lg text-sm font-medium transition shadow-lg shadow-blue-600/20"
          >
            Apply Changes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}