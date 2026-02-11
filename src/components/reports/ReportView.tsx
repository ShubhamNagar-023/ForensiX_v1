import { useState, useMemo } from 'react';
import { useCaseStore } from '../../stores/caseStore';
import { FileText, Download, CheckCircle } from 'lucide-react';
import type { FileEntry } from '../../types';

export default function ReportView() {
  const { activeCase, ciaAssessment, mitreMapping, addLog } = useCaseStore();
  const [sections, setSections] = useState({
    metadata: true,
    evidence: true,
    timeline: true,
    findings: true,
    cia: true,
    mitre: true,
    hashes: true,
    notes: true,
  });
  const [format, setFormat] = useState<'text' | 'json'>('text');
  const [generated, setGenerated] = useState<string | null>(null);

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

  const generateReport = () => {
    if (!activeCase) return;
    const meta = activeCase.metadata;
    const deletedFiles = allFiles.filter(f => f.isDeleted);
    const spoofedFiles = allFiles.filter(f => f.isSpoofed);

    if (format === 'json') {
      const report = {
        reportGenerated: new Date().toISOString(),
        caseMetadata: sections.metadata ? meta : undefined,
        evidenceSummary: sections.evidence ? {
          totalEvidence: activeCase.evidence.length,
          totalFiles: allFiles.length,
          deletedFiles: deletedFiles.length,
          spoofedFiles: spoofedFiles.length,
        } : undefined,
        ciaAssessment: sections.cia ? ciaAssessment : undefined,
        mitreMapping: sections.mitre ? mitreMapping : undefined,
        notes: sections.notes ? activeCase.notes : undefined,
        bookmarks: activeCase.bookmarks,
      };
      setGenerated(JSON.stringify(report, null, 2));
    } else {
      let report = '';
      report += '═══════════════════════════════════════════════════\n';
      report += '           FORENSICX - FORENSIC REPORT            \n';
      report += '═══════════════════════════════════════════════════\n\n';
      report += `Report Generated: ${new Date().toLocaleString()}\n\n`;

      if (sections.metadata) {
        report += '───────────────────────────────────────────────────\n';
        report += '  CASE METADATA\n';
        report += '───────────────────────────────────────────────────\n';
        report += `Case Name:          ${meta.name}\n`;
        report += `Case Number:        ${meta.caseNumber}\n`;
        report += `Status:             ${meta.status}\n`;
        report += `Priority:           ${meta.priority}\n`;
        report += `Lead Investigator:  ${meta.leadInvestigator}\n`;
        report += `Evidence Custodian: ${meta.evidenceCustodian || 'N/A'}\n`;
        report += `Date Created:       ${new Date(meta.dateCreated).toLocaleString()}\n`;
        report += `Last Modified:      ${new Date(meta.lastModified).toLocaleString()}\n`;
        if (meta.description) report += `Description:        ${meta.description}\n`;
        if (meta.tags.length) report += `Tags:               ${meta.tags.join(', ')}\n`;
        report += '\n';
      }

      if (sections.evidence) {
        report += '───────────────────────────────────────────────────\n';
        report += '  EVIDENCE SUMMARY\n';
        report += '───────────────────────────────────────────────────\n';
        report += `Total Evidence Items: ${activeCase.evidence.length}\n`;
        report += `Total Files:          ${allFiles.length}\n`;
        report += `Deleted Files:        ${deletedFiles.length}\n`;
        report += `Spoofed Files:        ${spoofedFiles.length}\n`;
        report += `Hidden Files:         ${allFiles.filter(f => f.isHidden).length}\n\n`;

        for (const ev of activeCase.evidence) {
          report += `  📁 ${ev.name}\n`;
          report += `     Type: ${ev.type} | Status: ${ev.analysisStatus}\n`;
          if (ev.hashMD5) report += `     MD5:  ${ev.hashMD5}\n`;
          if (ev.hashSHA256) report += `     SHA256: ${ev.hashSHA256}\n`;
          if (ev.partitions) {
            for (const part of ev.partitions) {
              report += `     ├── Partition ${part.number}: ${part.filesystemType} (${(part.size / 1024 / 1024).toFixed(0)} MB)\n`;
              report += `     │   Files: ${part.files.length} | Status: ${part.status}\n`;
            }
          }
          report += '\n';
        }
      }

      if (sections.findings && spoofedFiles.length > 0) {
        report += '───────────────────────────────────────────────────\n';
        report += '  ⚠️  SPOOFED FILES (CRITICAL FINDINGS)\n';
        report += '───────────────────────────────────────────────────\n';
        for (const f of spoofedFiles) {
          report += `  ! ${f.name}\n`;
          report += `    Extension: ${f.extension} | Actual: ${f.actualType}\n`;
          report += `    Risk: ${f.riskLevel}\n`;
          report += `    Path: ${f.path}\n\n`;
        }
      }

      if (sections.cia && ciaAssessment) {
        report += '───────────────────────────────────────────────────\n';
        report += '  CIA TRIAD ASSESSMENT\n';
        report += '───────────────────────────────────────────────────\n';
        report += `Overall Score:  ${ciaAssessment.overallScore}/100 (${ciaAssessment.riskLevel})\n`;
        report += `Confidentiality: ${ciaAssessment.confidentialityScore}/100\n`;
        report += `Integrity:       ${ciaAssessment.integrityScore}/100\n`;
        report += `Availability:    ${ciaAssessment.availabilityScore}/100\n\n`;
        report += `Summary: ${ciaAssessment.summary}\n\n`;
        if (ciaAssessment.criticalFindings.length > 0) {
          report += 'Critical Findings:\n';
          ciaAssessment.criticalFindings.forEach(f => report += `  ❌ ${f}\n`);
          report += '\n';
        }
        if (ciaAssessment.recommendations.length > 0) {
          report += 'Recommendations:\n';
          ciaAssessment.recommendations.forEach((r, i) => report += `  ${i + 1}. ${r}\n`);
          report += '\n';
        }
      }

      if (sections.mitre && mitreMapping && mitreMapping.findings.length > 0) {
        report += '───────────────────────────────────────────────────\n';
        report += '  MITRE ATT&CK MAPPING\n';
        report += '───────────────────────────────────────────────────\n';
        report += `${mitreMapping.attackChainSummary}\n\n`;
        for (const f of mitreMapping.findings) {
          report += `  [${f.confidence}] ${f.tactic}\n`;
          report += `           ${f.technique}\n`;
          f.evidence.forEach(e => report += `           → ${e}\n`);
          report += '\n';
        }
      }

      if (sections.notes && activeCase.notes.length > 0) {
        report += '───────────────────────────────────────────────────\n';
        report += '  INVESTIGATOR NOTES\n';
        report += '───────────────────────────────────────────────────\n';
        for (const note of activeCase.notes) {
          report += `  [${new Date(note.timestamp).toLocaleString()}] ${note.author}\n`;
          report += `  ${note.content}\n\n`;
        }
      }

      report += '═══════════════════════════════════════════════════\n';
      report += '              END OF FORENSIC REPORT               \n';
      report += '═══════════════════════════════════════════════════\n';

      setGenerated(report);
    }

    addLog({ level: 'INFO', category: 'Report', message: `Forensic report generated (${format} format)` });
  };

  const downloadReport = () => {
    if (!generated) return;
    const ext = format === 'json' ? 'json' : 'txt';
    const mime = format === 'json' ? 'application/json' : 'text/plain';
    const blob = new Blob([generated], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `case-report-${new Date().toISOString().split('T')[0]}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!activeCase) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border bg-bg-secondary flex items-center gap-3">
        <h2 className="font-display font-semibold text-accent-cyan text-sm flex items-center gap-2">
          <FileText className="w-4 h-4" /> Forensic Report Generator
        </h2>
        <div className="flex-1" />
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as typeof format)}
          className="bg-bg-tertiary border border-border rounded px-2 py-1 text-xs text-text-primary focus:border-accent-cyan focus:outline-none"
        >
          <option value="text">Text Format</option>
          <option value="json">JSON Format</option>
        </select>
        <button className="btn-cyber text-xs filled" onClick={generateReport}>Generate Report</button>
        {generated && (
          <button className="btn-cyber text-xs success" onClick={downloadReport}>
            <Download className="w-3 h-3 inline mr-1" /> Download
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4">
        {!generated ? (
          <div className="max-w-lg mx-auto">
            <h3 className="text-sm font-display font-semibold text-text-primary mb-4">Report Sections</h3>
            <div className="space-y-2">
              {Object.entries(sections).map(([key, value]) => (
                <label key={key} className="flex items-center gap-3 p-2 bg-bg-secondary rounded cursor-pointer hover:bg-bg-tertiary">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setSections(prev => ({ ...prev, [key]: e.target.checked }))}
                    className="accent-accent-cyan"
                  />
                  <span className="text-sm text-text-primary capitalize">{key === 'cia' ? 'CIA Assessment' : key === 'mitre' ? 'MITRE ATT&CK' : key}</span>
                  <div className="flex-1" />
                  <CheckCircle className={`w-4 h-4 ${value ? 'text-accent-green' : 'text-text-secondary/30'}`} />
                </label>
              ))}
            </div>
            <button className="btn-cyber filled w-full mt-4" onClick={generateReport}>
              Generate Report
            </button>
          </div>
        ) : (
          <pre className="font-mono text-xs text-text-primary whitespace-pre-wrap bg-bg-secondary p-4 rounded border border-border overflow-auto max-h-full">
            {generated}
          </pre>
        )}
      </div>
    </div>
  );
}
