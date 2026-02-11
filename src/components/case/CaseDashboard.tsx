import { useCaseStore } from '../../stores/caseStore';
import { generateDemoEvidence } from '../../utils/demoData';
import {
  HardDrive, FileText, Clock, Shield, AlertTriangle, Bookmark,
  Users, Calendar, Hash, Activity, TrendingUp, Eye, Database
} from 'lucide-react';

export default function CaseDashboard() {
  const { activeCase, ciaAssessment, addEvidence, addLog } = useCaseStore();
  if (!activeCase) return null;

  const meta = activeCase.metadata;
  const totalFiles = activeCase.evidence.reduce(
    (acc, e) => acc + (e.partitions?.reduce((a, p) => a + p.files.length, 0) ?? 0), 0
  );
  const deletedFiles = activeCase.evidence.reduce(
    (acc, e) => acc + (e.partitions?.reduce((a, p) => a + p.files.filter(f => f.isDeleted).length, 0) ?? 0), 0
  );
  const spoofedFiles = activeCase.evidence.reduce(
    (acc, e) => acc + (e.partitions?.reduce((a, p) => a + p.files.filter(f => f.isSpoofed).length, 0) ?? 0), 0
  );

  const statCards = [
    { icon: HardDrive, label: 'Evidence Items', value: activeCase.evidence.length, color: 'text-accent-cyan' },
    { icon: FileText, label: 'Files Extracted', value: totalFiles, color: 'text-accent-green' },
    { icon: AlertTriangle, label: 'Deleted Files', value: deletedFiles, color: 'text-accent-yellow' },
    { icon: Eye, label: 'Spoofed Files', value: spoofedFiles, color: 'text-accent-red' },
    { icon: Bookmark, label: 'Bookmarks', value: activeCase.bookmarks.length, color: 'text-accent-cyan' },
    { icon: Activity, label: 'Log Entries', value: activeCase.logs.length, color: 'text-text-secondary' },
  ];

  return (
    <div className="p-6 overflow-y-auto h-full">
      {/* Case Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-accent-cyan text-glow-cyan mb-1">{meta.name}</h1>
        <div className="flex items-center gap-3 text-sm text-text-secondary">
          <span className={`badge badge-${meta.status.toLowerCase().replace(' ', '-')}`}>{meta.status}</span>
          <span className={`badge badge-${meta.priority.toLowerCase()}`}>{meta.priority} Priority</span>
          <span>{meta.caseNumber}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {statCards.map((card) => (
          <div key={card.label} className="card-cyber p-3 text-center">
            <card.icon className={`w-5 h-5 mx-auto mb-1 ${card.color}`} />
            <div className="text-xl font-display font-bold text-text-primary">{card.value}</div>
            <div className="text-xs text-text-secondary">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Load Demo Data Button */}
      {activeCase.evidence.length === 0 && (
        <div className="card-cyber p-4 mb-6 text-center glow-cyan">
          <Database className="w-8 h-8 mx-auto mb-2 text-accent-cyan" />
          <h3 className="text-sm font-display font-semibold text-accent-cyan mb-1">Quick Start Demo</h3>
          <p className="text-xs text-text-secondary mb-3">
            Load a simulated SanDisk USB drive image with realistic forensic data including
            spoofed files, deleted logs, hidden partitions, and suspicious artifacts.
          </p>
          <button
            className="btn-cyber filled"
            onClick={() => {
              const demoEvidence = generateDemoEvidence();
              addEvidence(demoEvidence);
              addLog({ level: 'INFO', category: 'Evidence', message: `Demo evidence loaded: ${demoEvidence.name}` });
              addLog({ level: 'INFO', category: 'Analysis', message: `Partition detection complete: ${demoEvidence.partitions?.length} partitions found` });
              addLog({ level: 'WARNING', category: 'Analysis', message: 'Hidden partition detected at sector 32 (FAT16, 8 MB)' });
              addLog({ level: 'CRITICAL', category: 'Spoofing', message: 'File spoofing detected: invoice_march.pdf is a PE executable!' });
              addLog({ level: 'WARNING', category: 'Analysis', message: 'Deleted Windows Event Logs detected (Security.evtx, System.evtx)' });
              addLog({ level: 'INFO', category: 'Analysis', message: `File extraction complete: ${demoEvidence.partitions?.reduce((a, p) => a + p.files.length, 0)} files extracted` });
            }}
          >
            <Database className="w-4 h-4 inline mr-1" /> Load Demo Evidence
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Case Details */}
        <div className="card-cyber p-4">
          <h3 className="text-sm font-display font-semibold text-accent-cyan mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" /> Case Details
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Lead Investigator</span>
              <span className="text-text-primary">{meta.leadInvestigator}</span>
            </div>
            {meta.evidenceCustodian && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Evidence Custodian</span>
                <span className="text-text-primary">{meta.evidenceCustodian}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-text-secondary flex items-center gap-1"><Calendar className="w-3 h-3" /> Created</span>
              <span className="text-text-primary">{new Date(meta.dateCreated).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary flex items-center gap-1"><Clock className="w-3 h-3" /> Last Modified</span>
              <span className="text-text-primary">{new Date(meta.lastModified).toLocaleString()}</span>
            </div>
            {meta.teamMembers.length > 0 && (
              <div className="flex justify-between">
                <span className="text-text-secondary flex items-center gap-1"><Users className="w-3 h-3" /> Team</span>
                <span className="text-text-primary">{meta.teamMembers.join(', ')}</span>
              </div>
            )}
            {meta.description && (
              <div className="pt-2 border-t border-border">
                <span className="text-text-secondary text-xs">Description</span>
                <p className="text-text-primary mt-1">{meta.description}</p>
              </div>
            )}
            {meta.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2">
                {meta.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-bg-tertiary rounded text-xs text-text-secondary">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CIA Assessment Summary */}
        <div className="card-cyber p-4">
          <h3 className="text-sm font-display font-semibold text-accent-cyan mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Security Assessment
          </h3>
          {ciaAssessment ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-sm">Risk Level</span>
                <span className={`badge ${
                  ciaAssessment.riskLevel === 'LOW RISK' ? 'badge-low' :
                  ciaAssessment.riskLevel === 'MEDIUM RISK' ? 'badge-medium' :
                  ciaAssessment.riskLevel === 'HIGH RISK' ? 'badge-high' : 'badge-critical'
                }`}>
                  {ciaAssessment.riskLevel}
                </span>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Confidentiality', score: ciaAssessment.confidentialityScore, color: '#00ffff' },
                  { label: 'Integrity', score: ciaAssessment.integrityScore, color: '#00ff41' },
                  { label: 'Availability', score: ciaAssessment.availabilityScore, color: '#ffea00' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text-secondary">{item.label}</span>
                      <span style={{ color: item.color }}>{item.score}/100</span>
                    </div>
                    <div className="progress-bar">
                      <div className="h-full rounded" style={{ width: `${item.score}%`, background: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-text-secondary pt-2 border-t border-border">
                Overall Score: <span className="text-accent-cyan font-semibold">{ciaAssessment.overallScore}</span>/100
              </div>
            </div>
          ) : (
            <div className="text-center text-text-secondary text-sm py-6">
              <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No assessment yet</p>
              <p className="text-xs mt-1">Add evidence and run analysis</p>
            </div>
          )}
        </div>

        {/* Evidence Summary */}
        <div className="card-cyber p-4">
          <h3 className="text-sm font-display font-semibold text-accent-cyan mb-3 flex items-center gap-2">
            <HardDrive className="w-4 h-4" /> Evidence Summary
          </h3>
          {activeCase.evidence.length > 0 ? (
            <div className="space-y-2">
              {activeCase.evidence.map((e) => (
                <div key={e.id} className="flex items-center justify-between p-2 bg-bg-tertiary rounded text-sm">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-accent-cyan" />
                    <span className="text-text-primary truncate">{e.name}</span>
                  </div>
                  <span className={`badge ${
                    e.analysisStatus === 'complete' ? 'badge-active' :
                    e.analysisStatus === 'analyzing' ? 'badge-review' :
                    e.analysisStatus === 'error' ? 'badge-critical' : 'badge-closed'
                  }`}>
                    {e.analysisStatus}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-text-secondary text-sm py-6">
              <HardDrive className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No evidence added yet</p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card-cyber p-4">
          <h3 className="text-sm font-display font-semibold text-accent-cyan mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Recent Activity
          </h3>
          {activeCase.logs.length > 0 ? (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {activeCase.logs.slice(-10).reverse().map((log) => (
                <div key={log.id} className="flex items-start gap-2 text-xs py-1">
                  <span className={`shrink-0 log-${log.level.toLowerCase()}`}>[{log.level}]</span>
                  <span className="text-text-secondary">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className="text-text-primary">{log.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-text-secondary text-sm py-6">
              <Hash className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No activity yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
