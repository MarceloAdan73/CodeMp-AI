'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface DemoBannerProps {
  message: string;
  isVisible: boolean;
  onClose?: () => void;
  isError?: boolean;
}

function AlertTriangleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function DemoBanner({ message, isVisible, onClose, isError }: DemoBannerProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={`mx-2 md:mx-4 mt-2 rounded-xl border backdrop-blur-sm ${
            isError
              ? 'bg-red-950/40 border-red-800/40'
              : 'bg-amber-950/30 border-amber-800/30'
          }`}
        >
          <div className="flex items-start gap-3 px-4 py-3">
            <div className={`${isError ? 'text-red-400' : 'text-amber-400'}`}>
              <AlertTriangleIcon />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${isError ? 'text-red-200/80' : 'text-amber-200/80'}`}>
                {message}
              </p>
              {!isError && (
                <p className="mt-1.5 text-[11px] text-amber-300/40">
                  See README.md for setup instructions
                </p>
              )}
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className={`p-1 rounded-md transition ${
                  isError
                    ? 'text-red-400/60 hover:text-red-300 hover:bg-red-500/10'
                    : 'text-amber-400/60 hover:text-amber-300 hover:bg-amber-500/10'
                }`}
              >
                <XIcon />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
