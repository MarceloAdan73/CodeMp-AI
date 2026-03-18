'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface DemoBannerProps {
  message: string;
  isVisible: boolean;
  onClose?: () => void;
}

export default function DemoBanner({ message, isVisible, onClose }: DemoBannerProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-4 mx-4 mt-4 flex items-start gap-3"
        >
          <span className="text-amber-500 text-lg">⚠️</span>
          <div className="flex-1">
            <p className="text-amber-200/80 text-sm">{message}</p>
            <code className="text-xs text-amber-400/70 mt-2 block font-mono bg-amber-950/30 px-2 py-1 rounded">
              ollama pull qwen2.5-coder:1.5b
            </code>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-amber-500 hover:text-amber-400 transition"
            >
              ✕
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
