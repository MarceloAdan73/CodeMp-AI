'use client';

import { motion } from 'framer-motion';

export type AnalysisStage = 'eslint' | 'ia' | 'validating';

interface AnalysisSkeletonProps {
  stage: AnalysisStage;
}

const stages: { id: AnalysisStage; label: string; icon: string; messages: string[] }[] = [
  { id: 'eslint', label: 'ESLint', icon: 'L', messages: ['Analizando con ESLint...', 'Detectando errores...', 'Escaneando codigo...'] },
  { id: 'ia', label: 'IA', icon: 'AI', messages: ['Procesando con IA...', 'Generando recomendaciones...', 'Analizando contexto...'] },
  { id: 'validating', label: 'Validacion', icon: 'V', messages: ['Validando resultados...', 'Preparando salida...', 'Verificando integridad...'] },
];

function getCurrentStageIndex(stage: AnalysisStage): number {
  return stages.findIndex((s) => s.id === stage);
}

export default function AnalysisSkeleton({ stage }: AnalysisSkeletonProps) {
  const currentIndex = getCurrentStageIndex(stage);
  const currentStage = stages[currentIndex];
  const messageIndex = Math.floor(Date.now() / 1500) % currentStage.messages.length;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-3">
          {stages.map((s, index) => (
            <motion.div
              key={s.id}
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ 
                scale: index === currentIndex ? 1.1 : 1,
                opacity: index <= currentIndex ? 1 : 0.4,
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                index === currentIndex
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : index < currentIndex
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-gray-800/50 text-gray-500 border border-gray-700/50'
              }`}
            >
              {index < currentIndex ? (
                <motion.span 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }}
                  className="text-xs"
                >
                  ✓
                </motion.span>
              ) : (
                <span className="text-xs font-bold">{s.icon}</span>
              )}
              <span>{s.label}</span>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-3 border-blue-500/20 border-t-blue-500 rounded-full"
          />
          <motion.p
            key={stage + messageIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-sm text-gray-300 font-medium"
          >
            {currentStage.messages[messageIndex]}
          </motion.p>
        </div>

        <div className="flex gap-2 w-64">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-1 flex-1 bg-gray-800 rounded-full overflow-hidden"
            >
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                animate={{ 
                  width: ['0%', '100%', '0%'],
                  x: [0, 0, 0],
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  delay: i * 0.3,
                  ease: 'easeInOut',
                }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
