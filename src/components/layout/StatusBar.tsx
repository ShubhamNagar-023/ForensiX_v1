import { useCaseStore } from '../../stores/caseStore';
import { Activity, AlertTriangle, CheckCircle } from 'lucide-react';

export default function StatusBar() {
  const { activeCase, isAnalyzing, analysisProgress, currentOperation } = useCaseStore();

  return (
    <div className="h-7 bg-bg-secondary border-t border-border flex items-center px-4 gap-4 text-xs text-text-secondary shrink-0">
      {/* Case info */}
      <div className="flex items-center gap-2">
        {activeCase ? (
          <>
            <span className="text-accent-cyan">{activeCase.metadata.name}</span>
            <span>•</span>
            <span>{activeCase.evidence.length} evidence items</span>
          </>
        ) : (
          <span>No case open</span>
        )}
      </div>

      <div className="flex-1" />

      {/* Current operation */}
      {isAnalyzing && (
        <div className="flex items-center gap-2">
          <Activity className="w-3 h-3 text-accent-cyan animate-pulse" />
          <span className="text-accent-cyan">{currentOperation || 'Analyzing...'}</span>
          <div className="w-32 progress-bar">
            <div className="progress-bar-fill" style={{ width: `${analysisProgress}%` }} />
          </div>
          <span>{Math.round(analysisProgress)}%</span>
        </div>
      )}

      {/* Status icons */}
      {activeCase && !isAnalyzing && (
        <div className="flex items-center gap-2">
          {activeCase.logs.some((l) => l.level === 'ERROR') ? (
            <AlertTriangle className="w-3 h-3 text-accent-red" />
          ) : (
            <CheckCircle className="w-3 h-3 text-accent-green" />
          )}
          <span>
            {activeCase.logs.length} log entries
          </span>
        </div>
      )}

      <div className="w-px h-4 bg-border" />
      <span className="font-mono">{new Date().toLocaleTimeString()}</span>
    </div>
  );
}
