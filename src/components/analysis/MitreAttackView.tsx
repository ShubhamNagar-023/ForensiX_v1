import { useMemo } from 'react';
import { useCaseStore } from '../../stores/caseStore';
import { performMitreMapping } from '../../utils/fileAnalysis';
import { Crosshair, AlertTriangle, Download, Shield } from 'lucide-react';
import type { FileEntry } from '../../types';

const TACTIC_COLORS: Record<string, string> = {
  'TA0001': '#ff6b6b',
  'TA0002': '#ffa06b',
  'TA0003': '#ffd06b',
  'TA0004': '#d0ff6b',
  'TA0005': '#6bff8e',
  'TA0006': '#6bffcc',
  'TA0007': '#6bccff',
  'TA0008': '#6b8eff',
  'TA0009': '#8e6bff',
  'TA0010': '#cc6bff',
  'TA0011': '#ff6bcc',
};

export default function MitreAttackView() {
  const { activeCase, mitreMapping, setMitreMapping, addLog } = useCaseStore();

  const allFiles = useMemo(() => {
    if (!activeCase) return [];
    const files: FileEntry[] = [];
    for (const ev of activeCase.evidence) {
      for (const part of ev.partitions || []) {
        const addFiles = (entries: FileEntry[]) => {
          for (const f of entries) { files.push(f); if (f.children) addFiles(f.children); }
        };
        addFiles(part.files);
      }
    }
    return files;
  }, [activeCase]);

  const runMapping = () => {
    const mapping = performMitreMapping(allFiles);
    setMitreMapping(mapping);
    addLog({
      level: 'INFO',
      category: 'MITRE ATT&CK',
      message: `MITRE ATT&CK mapping complete: ${mapping.findings.length} techniques identified`,
    });
  };

  const exportMapping = () => {
    if (!mitreMapping) return;
    const json = JSON.stringify(mitreMapping, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mitre-attack-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTacticColor = (tactic: string) => {
    const id = tactic.split(' ')[0];
    return TACTIC_COLORS[id] || '#a0a0a0';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border bg-bg-secondary flex items-center gap-3">
        <h2 className="font-display font-semibold text-accent-cyan text-sm flex items-center gap-2">
          <Crosshair className="w-4 h-4" /> MITRE ATT&CK Framework
        </h2>
        <div className="flex-1" />
        <button className="btn-cyber text-xs filled" onClick={runMapping} disabled={allFiles.length === 0}>
          Run Mapping
        </button>
        {mitreMapping && (
          <button className="btn-cyber text-xs" onClick={exportMapping}>
            <Download className="w-3 h-3 inline mr-1" /> Export
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-6">
        {!mitreMapping ? (
          <div className="text-center py-20">
            <Crosshair className="w-16 h-16 mx-auto mb-4 text-border" />
            <h3 className="text-lg text-text-secondary mb-2">MITRE ATT&CK Mapping</h3>
            <p className="text-sm text-text-secondary mb-1">Map detected artifacts to MITRE ATT&CK tactics and techniques</p>
            <p className="text-xs text-text-secondary mb-6">
              {allFiles.length === 0 ? 'Add evidence and extract files first' : `${allFiles.length} files ready for analysis`}
            </p>
            <button className="btn-cyber filled" onClick={runMapping} disabled={allFiles.length === 0}>
              Run MITRE ATT&CK Mapping
            </button>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Attack Chain Summary */}
            <div className="card-cyber p-4">
              <h3 className="text-sm font-display font-semibold text-accent-cyan mb-3">Attack Chain Summary</h3>
              <p className="text-sm text-text-primary">{mitreMapping.attackChainSummary}</p>
            </div>

            {/* Findings */}
            {mitreMapping.findings.length === 0 ? (
              <div className="card-cyber p-6 text-center">
                <Shield className="w-8 h-8 mx-auto mb-2 text-accent-green" />
                <p className="text-sm text-accent-green">No significant ATT&CK indicators detected</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-sm font-display font-semibold text-text-primary">
                  Detected Techniques ({mitreMapping.findings.length})
                </h3>
                {mitreMapping.findings.map((finding, i) => (
                  <div key={i} className="card-cyber p-4" style={{ borderLeftColor: getTacticColor(finding.tactic), borderLeftWidth: 3 }}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-xs font-semibold" style={{ color: getTacticColor(finding.tactic) }}>
                          {finding.tactic}
                        </div>
                        <div className="text-sm font-semibold text-text-primary mt-0.5">{finding.technique}</div>
                      </div>
                      <span className={`badge badge-${finding.confidence.toLowerCase()}`}>{finding.confidence}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-text-secondary">Evidence:</span>
                      {finding.evidence.map((e, j) => (
                        <div key={j} className="text-xs text-text-primary flex items-start gap-1 pl-2">
                          <AlertTriangle className="w-3 h-3 text-accent-yellow shrink-0 mt-0.5" />
                          <span>{e}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recommended Actions */}
            {mitreMapping.recommendedActions.length > 0 && (
              <div className="card-cyber p-4">
                <h3 className="text-sm font-display font-semibold text-accent-cyan mb-3">Recommended Actions</h3>
                <div className="space-y-2">
                  {mitreMapping.recommendedActions.map((action, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-text-primary">
                      <span className="text-accent-cyan font-bold shrink-0">{i + 1}.</span>
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
