import { useCaseStore } from '../../stores/caseStore';
import { useState, useRef, useEffect, useMemo } from 'react';
import { Download, Filter, Trash2, AlertTriangle, Info, Bug, AlertCircle } from 'lucide-react';

export default function LogViewer() {
  const { activeCase } = useCaseStore();
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const logs = activeCase?.logs || [];

  const categories = useMemo(() => {
    const cats = new Set<string>();
    logs.forEach(l => cats.add(l.category));
    return Array.from(cats);
  }, [logs]);

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (levelFilter !== 'all' && l.level !== levelFilter) return false;
      if (categoryFilter !== 'all' && l.category !== categoryFilter) return false;
      return true;
    });
  }, [logs, levelFilter, categoryFilter]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filtered, autoScroll]);

  const levelIcon = (level: string) => {
    switch (level) {
      case 'INFO': return <Info className="w-3 h-3 text-accent-cyan" />;
      case 'WARNING': return <AlertTriangle className="w-3 h-3 text-accent-yellow" />;
      case 'ERROR': return <AlertCircle className="w-3 h-3 text-accent-red" />;
      case 'CRITICAL': return <AlertCircle className="w-3 h-3 text-accent-red" />;
      case 'DEBUG': return <Bug className="w-3 h-3 text-text-secondary" />;
      default: return null;
    }
  };

  const exportLogs = () => {
    const text = filtered.map(l =>
      `[${l.timestamp}] [${l.level}] [${l.category}] ${l.message}${l.details ? '\n  ' + l.details : ''}`
    ).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis-log-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="p-3 border-b border-border bg-bg-secondary flex items-center gap-3">
        <h2 className="font-display font-semibold text-accent-cyan text-sm">Analysis Logs</h2>
        <div className="flex-1" />
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="bg-bg-tertiary border border-border rounded px-2 py-1 text-xs text-text-primary focus:border-accent-cyan focus:outline-none"
        >
          <option value="all">All Levels</option>
          <option value="INFO">Info</option>
          <option value="WARNING">Warning</option>
          <option value="ERROR">Error</option>
          <option value="CRITICAL">Critical</option>
          <option value="DEBUG">Debug</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-bg-tertiary border border-border rounded px-2 py-1 text-xs text-text-primary focus:border-accent-cyan focus:outline-none"
        >
          <option value="all">All Categories</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-xs text-text-secondary">
          <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} className="accent-accent-cyan" />
          Auto-scroll
        </label>
        <button className="btn-cyber text-xs" onClick={exportLogs}>
          <Download className="w-3 h-3 inline mr-1" /> Export
        </button>
      </div>

      {/* Log entries */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-2 font-mono text-xs">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-text-secondary">
            <Filter className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No log entries{levelFilter !== 'all' || categoryFilter !== 'all' ? ' matching filters' : ''}</p>
          </div>
        ) : (
          filtered.map((log) => (
            <div key={log.id} className="flex items-start gap-2 py-0.5 hover:bg-bg-tertiary/50 px-1 rounded">
              {levelIcon(log.level)}
              <span className="text-text-secondary shrink-0 w-20">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className={`shrink-0 w-16 font-semibold log-${log.level.toLowerCase()}`}>
                [{log.level}]
              </span>
              <span className="text-accent-cyan shrink-0 w-24 truncate">[{log.category}]</span>
              <span className="text-text-primary">{log.message}</span>
            </div>
          ))
        )}
      </div>

      {/* Stats */}
      <div className="p-2 border-t border-border bg-bg-secondary text-xs text-text-secondary flex items-center gap-4">
        <span>{filtered.length} / {logs.length} entries</span>
        <span className="log-info">{logs.filter(l => l.level === 'INFO').length} Info</span>
        <span className="log-warning">{logs.filter(l => l.level === 'WARNING').length} Warning</span>
        <span className="log-error">{logs.filter(l => l.level === 'ERROR').length} Error</span>
      </div>
    </div>
  );
}
