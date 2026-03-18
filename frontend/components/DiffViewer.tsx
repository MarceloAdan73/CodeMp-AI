'use client';

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
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1f] rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col border border-white/10">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">Code Changes Preview</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Diff Viewer */}
        <div className="flex-1 overflow-auto p-4 bg-[#111113]">
          <ReactDiffViewer
            oldValue={oldCode}
            newValue={newCode}
            splitView={true}
            useDarkTheme={true}
            styles={{
              diffContainer: {
                background: '#111113',
                fontSize: '13px',
                fontFamily: 'JetBrains Mono, monospace',
              },
              line: {
                padding: '0 8px',
              },
              gutter: {
                background: '#1a1a1f',
                color: '#666',
                padding: '0 8px',
                borderRight: '1px solid #2a2a2f',
              },
              marker: {
                backgroundColor: 'transparent',
                width: '20px',
              },
              wordDiff: {
                padding: '2px 0',
              },
              wordAdded: {
                background: '#1e3a2e',
                color: '#b3f0d0',
              },
              wordRemoved: {
                background: '#4a1e1e',
                color: '#fbbbbb',
              },
              lineNumber: {
                color: '#666',
              },
              emptyLine: {
                background: 'transparent',
              },
              emptyGutter: {
                background: '#1a1a1f',
                borderRight: '1px solid #2a2a2f',
              },
            }}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onApply();
              onClose();
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm transition"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
}