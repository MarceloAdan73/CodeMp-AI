'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface DemoBannerProps {
  message: string;
  isVisible: boolean;
  onClose?: () => void;
  isError?: boolean;
}

export default function DemoBanner({ message, isVisible, onClose, isError }: DemoBannerProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={isError ? 'bg-red-900/30 border border-red-700/50 rounded-lg p-4 mx-4 mt-4 flex items-start gap-3' : 'bg-amber-900/30 border border-amber-700/50 rounded-lg p-4 mx-4 mt-4 flex items-start gap-3'}
        >
          <span className={isError ? 'text-red-500 text-lg' : 'text-amber-500 text-lg'}>⚠️</span>
          <div className="flex-1">
            <p className={isError ? 'text-red-200/80 text-sm' : 'text-amber-200/80 text-sm'}>{message}</p>
            {!isError && (
              <code className="text-xs text-amber-400/70 mt-2 block font-mono bg-amber-950/30 px-2 py-1 rounded">
                ollama pull qwen2.5-coder:1.5b
              </code>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className={isError ? 'text-red-500 hover:text-red-400 transition' : 'text-amber-500 hover:text-amber-400 transition'}
            >
              ✕
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
