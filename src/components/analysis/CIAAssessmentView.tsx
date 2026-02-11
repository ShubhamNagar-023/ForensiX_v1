import { useMemo } from 'react';
import { useCaseStore } from '../../stores/caseStore';
import { performCIAAssessment } from '../../utils/fileAnalysis';
import { Shield, AlertTriangle, Lock, CheckCircle, Clock, Download } from 'lucide-react';
import type { FileEntry } from '../../types';

function GaugeChart({ score, label, color }: { score: number; label: string; color: string }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#1a1f2e" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="gauge-ring"
          transform="rotate(-90 50 50)"
        />
        <text x="50" y="50" textAnchor="middle" dy="0.35em" fill={color} fontSize="18" fontWeight="bold" fontFamily="Rajdhani">
          {score}
        </text>
      </svg>
      <span className="text-xs text-text-secondary mt-1">{label}</span>
    </div>
  );
}

export default function CIAAssessmentView() {
  const { activeCase, ciaAssessment, setCIAAssessment, addLog } = useCaseStore();

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

  const runAssessment = () => {
    const assessment = performCIAAssessment(allFiles);
    setCIAAssessment(assessment);
    addLog({
      level: 'INFO',
      category: 'CIA Assessment',
      message: `CIA Assessment complete: ${assessment.riskLevel} (Score: ${assessment.overallScore})`,
    });
  };

  const exportAssessment = () => {
    if (!ciaAssessment) return;
    const json = JSON.stringify(ciaAssessment, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cia-assessment-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const riskColor = (level: string) => {
    switch (level) {
      case 'LOW RISK': return '#00ff41';
      case 'MEDIUM RISK': return '#ffea00';
      case 'HIGH RISK': return '#ff7800';
      case 'CRITICAL RISK': return '#ff0051';
      default: return '#a0a0a0';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border bg-bg-secondary flex items-center gap-3">
        <h2 className="font-display font-semibold text-accent-cyan text-sm flex items-center gap-2">
          <Shield className="w-4 h-4" /> CIA Triad Security Assessment
        </h2>
        <div className="flex-1" />
        <button className="btn-cyber text-xs filled" onClick={runAssessment} disabled={allFiles.length === 0}>
          Run Assessment
        </button>
        {ciaAssessment && (
          <button className="btn-cyber text-xs" onClick={exportAssessment}>
            <Download className="w-3 h-3 inline mr-1" /> Export
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-6">
        {!ciaAssessment ? (
          <div className="text-center py-20">
            <Shield className="w-16 h-16 mx-auto mb-4 text-border" />
            <h3 className="text-lg text-text-secondary mb-2">CIA Triad Assessment</h3>
            <p className="text-sm text-text-secondary mb-1">Evaluate Confidentiality, Integrity, and Availability</p>
            <p className="text-xs text-text-secondary mb-6">
              {allFiles.length === 0 ? 'Add evidence and extract files first' : `${allFiles.length} files ready for assessment`}
            </p>
            <button className="btn-cyber filled" onClick={runAssessment} disabled={allFiles.length === 0}>
              Run CIA Assessment
            </button>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Gauges */}
            <div className="card-cyber p-6">
              <div className="flex items-center justify-center gap-12 mb-4">
                <GaugeChart score={ciaAssessment.confidentialityScore} label="Confidentiality" color="#00ffff" />
                <GaugeChart score={ciaAssessment.integrityScore} label="Integrity" color="#00ff41" />
                <GaugeChart score={ciaAssessment.availabilityScore} label="Availability" color="#ffea00" />
              </div>
              <div className="text-center">
                <div className="text-3xl font-display font-bold" style={{ color: riskColor(ciaAssessment.riskLevel) }}>
                  {ciaAssessment.overallScore}/100
                </div>
                <div className="mt-1">
                  <span className="badge text-sm px-3 py-1" style={{
                    background: `${riskColor(ciaAssessment.riskLevel)}20`,
                    color: riskColor(ciaAssessment.riskLevel),
                    border: `1px solid ${riskColor(ciaAssessment.riskLevel)}50`,
                  }}>
                    {ciaAssessment.riskLevel}
                  </span>
                </div>
                <p className="text-sm text-text-secondary mt-3">{ciaAssessment.summary}</p>
              </div>
            </div>

            {/* Critical Findings */}
            {ciaAssessment.criticalFindings.length > 0 && (
              <div className="card-cyber p-4 border-accent-red/30">
                <h3 className="text-sm font-display font-semibold text-accent-red mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Critical Findings
                </h3>
                <div className="space-y-2">
                  {ciaAssessment.criticalFindings.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-text-primary">
                      <AlertTriangle className="w-4 h-4 text-accent-red shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed Findings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card-cyber p-4">
                <h4 className="text-xs font-display font-semibold text-accent-cyan uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Confidentiality ({ciaAssessment.confidentialityScore}/100)
                </h4>
                {ciaAssessment.confidentialityFindings.length === 0 ? (
                  <p className="text-xs text-accent-green flex items-center gap-1"><CheckCircle className="w-3 h-3" /> No issues found</p>
                ) : (
                  <ul className="space-y-1 text-xs text-text-primary">
                    {ciaAssessment.confidentialityFindings.map((f, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-accent-red shrink-0">•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="card-cyber p-4">
                <h4 className="text-xs font-display font-semibold text-accent-green uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Integrity ({ciaAssessment.integrityScore}/100)
                </h4>
                {ciaAssessment.integrityFindings.length === 0 ? (
                  <p className="text-xs text-accent-green flex items-center gap-1"><CheckCircle className="w-3 h-3" /> No issues found</p>
                ) : (
                  <ul className="space-y-1 text-xs text-text-primary">
                    {ciaAssessment.integrityFindings.map((f, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-accent-yellow shrink-0">•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="card-cyber p-4">
                <h4 className="text-xs font-display font-semibold text-accent-yellow uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Availability ({ciaAssessment.availabilityScore}/100)
                </h4>
                {ciaAssessment.availabilityFindings.length === 0 ? (
                  <p className="text-xs text-accent-green flex items-center gap-1"><CheckCircle className="w-3 h-3" /> No issues found</p>
                ) : (
                  <ul className="space-y-1 text-xs text-text-primary">
                    {ciaAssessment.availabilityFindings.map((f, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-accent-yellow shrink-0">•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Recommendations */}
            {ciaAssessment.recommendations.length > 0 && (
              <div className="card-cyber p-4">
                <h3 className="text-sm font-display font-semibold text-accent-cyan mb-3">Recommendations</h3>
                <div className="space-y-2">
                  {ciaAssessment.recommendations.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-text-primary">
                      <span className="text-accent-cyan font-bold shrink-0">{i + 1}.</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-text-secondary text-center">
              Assessment performed: {new Date(ciaAssessment.timestamp).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
