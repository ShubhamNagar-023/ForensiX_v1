import { useState } from 'react';
import { useCaseStore } from '../../stores/caseStore';
import { Scan, AlertTriangle, Shield, HardDrive, Lock, Download } from 'lucide-react';
import { formatBytes, performSectorScan } from '../../utils/diskAnalysis';
import { getFileData } from '../../utils/fileStorage';

export default function SectorScanView() {
  const { sectorScanResult, setSectorScanResult, addLog, activeCase } = useCaseStore();
  const [scanMode, setScanMode] = useState<'quick' | 'standard' | 'paranoid'>('standard');
  const [scanning, setScanning] = useState(false);

  const runScan = async () => {
    if (!activeCase || activeCase.evidence.length === 0) {
      addLog({
        level: 'WARNING',
        category: 'Sector Scan',
        message: 'No evidence loaded. Please add a disk image first.',
      });
      return;
    }

    // Find the first disk image
    const diskImage = activeCase.evidence.find(e => e.type === 'disk-image');
    if (!diskImage) {
      addLog({
        level: 'WARNING',
        category: 'Sector Scan',
        message: 'No disk image found. Sector scan requires a disk image file.',
      });
      return;
    }

    setScanning(true);
    addLog({
      level: 'INFO',
      category: 'Sector Scan',
      message: `Starting ${scanMode} sector scan on ${diskImage.name}...`,
    });

    try {
      // Load the disk image data
      const fileData = await getFileData(diskImage.id);
      if (!fileData) {
        throw new Error('Failed to load disk image data');
      }

      // Convert ArrayBuffer back to File for the scan function
      const file = new File([fileData], diskImage.name, { type: 'application/octet-stream' });

      // Perform the actual sector scan with progress callback
      const result = await performSectorScan(file, scanMode, (progress, message) => {
        addLog({
          level: 'INFO',
          category: 'Sector Scan',
          message: `[${progress.toFixed(0)}%] ${message}`,
        });
      });
      
      setSectorScanResult(result);

      addLog({
        level: 'INFO',
        category: 'Sector Scan',
        message: `${scanMode} sector scan complete: ${result.hiddenPartitions.length} hidden partition(s), ${result.encryptedRegions.length} encrypted region(s)`,
      });

      if (result.hiddenPartitions.length > 0) {
        addLog({
          level: 'WARNING',
          category: 'Sector Scan',
          message: `Hidden partitions detected at sectors: ${result.hiddenPartitions.map((p) => p.sector).join(', ')}`,
        });
      }

      if (result.encryptedRegions.length > 0) {
        addLog({
          level: 'WARNING',
          category: 'Sector Scan',
          message: `Encrypted/compressed regions detected with high entropy (>7.5)`,
        });
      }
    } catch (error) {
      addLog({
        level: 'ERROR',
        category: 'Sector Scan',
        message: `Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setScanning(false);
    }
  };

  const exportResults = () => {
    if (!sectorScanResult) return;
    const json = JSON.stringify(sectorScanResult, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sector-scan-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border bg-bg-secondary flex items-center gap-3">
        <h2 className="font-display font-semibold text-accent-cyan text-sm flex items-center gap-2">
          <Scan className="w-4 h-4" /> Hidden Sector Analysis
        </h2>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <select
            value={scanMode}
            onChange={(e) => setScanMode(e.target.value as typeof scanMode)}
            className="bg-bg-tertiary border border-border rounded px-2 py-1 text-xs text-text-primary focus:border-accent-cyan focus:outline-none"
          >
            <option value="quick">Quick Scan</option>
            <option value="standard">Standard Scan</option>
            <option value="paranoid">Paranoid Scan</option>
          </select>
          <button 
            className="btn-cyber text-xs filled" 
            onClick={runScan}
            disabled={scanning}
          >
            {scanning ? 'Scanning...' : 'Run Scan'}
          </button>
          {sectorScanResult && (
            <button className="btn-cyber text-xs" onClick={exportResults}>
              <Download className="w-3 h-3 inline mr-1" /> Export
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {!sectorScanResult ? (
          <div className="text-center py-20">
            <Scan className="w-16 h-16 mx-auto mb-4 text-border" />
            <h3 className="text-lg text-text-secondary mb-2">Hidden Sector Analysis</h3>
            <p className="text-sm text-text-secondary mb-4">
              Scan disk images for hidden partitions, encrypted regions, and suspicious sectors
            </p>

            <div className="max-w-md mx-auto space-y-3 mb-6 text-left">
              {[
                { mode: 'quick', time: '~5 min', desc: 'Check partition table + sectors 32, 64, 128' },
                { mode: 'standard', time: '~15 min', desc: 'Everything in Quick + unallocated space + basic entropy' },
                { mode: 'paranoid', time: '~1-3 hrs', desc: 'Scan EVERY sector + deep entropy + HPA/DCO detection' },
              ].map((opt) => (
                <label
                  key={opt.mode}
                  className={`card-cyber p-3 flex items-start gap-3 cursor-pointer ${scanMode === opt.mode ? 'glow-cyan' : ''}`}
                  onClick={() => setScanMode(opt.mode as typeof scanMode)}
                >
                  <input type="radio" checked={scanMode === opt.mode} onChange={() => setScanMode(opt.mode as typeof scanMode)} className="mt-1 accent-accent-cyan" />
                  <div>
                    <div className="text-sm text-text-primary font-semibold capitalize">{opt.mode} Scan ({opt.time})</div>
                    <div className="text-xs text-text-secondary">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <button className="btn-cyber filled" onClick={runScan}>
              Start {scanMode.charAt(0).toUpperCase() + scanMode.slice(1)} Scan
            </button>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { icon: HardDrive, label: 'Hidden Partitions', count: sectorScanResult.hiddenPartitions.length, color: 'text-accent-red' },
                { icon: Shield, label: 'FS Signatures', count: sectorScanResult.filesystemSignatures.length, color: 'text-accent-cyan' },
                { icon: AlertTriangle, label: 'Suspicious Sectors', count: sectorScanResult.suspiciousSectors.length, color: 'text-accent-yellow' },
                { icon: Lock, label: 'Encrypted Regions', count: sectorScanResult.encryptedRegions.length, color: 'text-accent-red' },
              ].map((stat) => (
                <div key={stat.label} className="card-cyber p-3 text-center">
                  <stat.icon className={`w-6 h-6 mx-auto mb-1 ${stat.color}`} />
                  <div className="text-2xl font-display font-bold text-text-primary">{stat.count}</div>
                  <div className="text-xs text-text-secondary">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Sector Map Visualization */}
            <div className="card-cyber p-4">
              <h3 className="text-sm font-display font-semibold text-accent-cyan mb-3">Sector Map</h3>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: 64 }, (_, i) => {
                  const sector = i * Math.floor(sectorScanResult.totalSectors / 64);
                  const isHidden = sectorScanResult.hiddenPartitions.some(h => Math.abs(h.sector - sector) < sectorScanResult.totalSectors / 64);
                  const isEncrypted = sectorScanResult.encryptedRegions.some(e => Math.abs(e.sector - sector) < sectorScanResult.totalSectors / 64);
                  const isSuspicious = sectorScanResult.suspiciousSectors.some(s => Math.abs(s.sector - sector) < sectorScanResult.totalSectors / 64);
                  const isFS = sectorScanResult.filesystemSignatures.some(f => Math.abs(f.sector - sector) < sectorScanResult.totalSectors / 64);

                  let color = '#1a1f2e';
                  if (isHidden) color = '#ff0051';
                  else if (isEncrypted) color = '#ffea00';
                  else if (isSuspicious) color = '#ff7800';
                  else if (isFS) color = '#00ffff';
                  else if (Math.random() > 0.5) color = '#00ff4120';

                  return (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-sm cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ background: color }}
                      title={`Sector ~${sector.toLocaleString()}`}
                    />
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-text-secondary">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ background: '#ff0051' }} /> Hidden</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ background: '#ffea00' }} /> Encrypted</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ background: '#ff7800' }} /> Suspicious</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ background: '#00ffff' }} /> Filesystem</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ background: '#1a1f2e' }} /> Empty/Normal</div>
              </div>
            </div>

            {/* Hidden Partitions */}
            {sectorScanResult.hiddenPartitions.length > 0 && (
              <div className="card-cyber p-4">
                <h3 className="text-sm font-display font-semibold text-accent-red mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Hidden Partitions Detected
                </h3>
                <div className="space-y-3">
                  {sectorScanResult.hiddenPartitions.map((hp, i) => (
                    <div key={i} className="p-3 bg-bg-tertiary rounded border-l-2 border-accent-red">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-text-primary">Sector {hp.sector.toLocaleString()}</span>
                        <span className={`badge badge-${hp.confidence.toLowerCase()}`}>{hp.confidence}</span>
                      </div>
                      <div className="text-xs text-text-secondary space-y-0.5">
                        <div>Offset: {formatBytes(hp.offset)} ({hp.offset.toLocaleString()} bytes)</div>
                        <div>Type: <span className="text-accent-cyan">{hp.type}</span></div>
                        {hp.entropy !== undefined && <div>Entropy: {hp.entropy.toFixed(2)}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Encrypted Regions */}
            {sectorScanResult.encryptedRegions.length > 0 && (
              <div className="card-cyber p-4">
                <h3 className="text-sm font-display font-semibold text-accent-yellow mb-3 flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Encrypted/Compressed Regions
                </h3>
                <div className="space-y-2">
                  {sectorScanResult.encryptedRegions.map((er, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-bg-tertiary rounded text-xs">
                      <span className="text-text-primary">Sector {er.sector.toLocaleString()}</span>
                      <span className="text-text-secondary">Entropy: <span className="text-accent-yellow font-semibold">{er.entropy?.toFixed(2)}</span></span>
                      <span className={`badge badge-${er.confidence.toLowerCase()}`}>{er.confidence}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-text-secondary text-center">
              Scanned {sectorScanResult.totalSectors.toLocaleString()} sectors • Mode: {scanMode}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
