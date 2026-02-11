import { useState, useCallback, useRef } from 'react';
import { Upload, HardDrive, File, X } from 'lucide-react';
import { useCaseStore } from '../../stores/caseStore';
import { storeFile } from '../../utils/fileStorage';
import { parseMBR, extractFilesFromImage } from '../../utils/diskAnalysis';

interface Props {
  onClose: () => void;
}

export default function EvidenceUpload({ onClose }: Props) {
  const { addEvidence, addLog } = useCaseStore();
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAdd = async () => {
    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isDiskImage = ['img', 'dd', 'raw', 'e01', 'iso', 'bin'].includes(ext);
      const evidenceId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      try {
        // Store the actual file data in IndexedDB
        await storeFile(file, evidenceId);

        addLog({
          level: 'INFO',
          category: 'Evidence',
          message: `Evidence added: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
        });

        // For disk images, parse partitions and extract files
        if (isDiskImage) {
          addLog({
            level: 'INFO',
            category: 'Analysis',
            message: `Processing disk image: ${file.name}`,
          });

          // Read the file to analyze partitions
          const buffer = await file.arrayBuffer();
          const partitions = parseMBR(buffer);
          
          addLog({
            level: 'INFO',
            category: 'Analysis',
            message: `Partition detection complete: ${partitions.length} partition(s) found`,
          });

          // Extract files from the disk image and store them
          addLog({
            level: 'INFO',
            category: 'Analysis',
            message: `Carving files from disk image...`,
          });
          
          const extractedFiles = await extractFilesFromImage(file);
          
          addLog({
            level: 'INFO',
            category: 'Analysis',
            message: `File carving complete: ${extractedFiles.length} file(s) found`,
          });
          
          // Assign extracted files to appropriate partitions
          // Note: File carving identifies file signatures and estimates sizes but doesn't
          // extract full file data from unallocated space. Full file extraction would require
          // implementing filesystem parsers (NTFS, FAT32, etc.) which is beyond the scope
          // of this client-side application. For production use, consider integrating with
          // forensic libraries like The Sleuth Kit for complete file recovery.
          if (partitions.length > 0 && extractedFiles.length > 0) {
            partitions[0].files = extractedFiles;
            
            // Check for potentially spoofed files based on extension mismatch
            const spoofedFiles = extractedFiles.filter(f => f.isSpoofed);
            if (spoofedFiles.length > 0) {
              addLog({
                level: 'CRITICAL',
                category: 'Spoofing',
                message: `Potential file spoofing detected: ${spoofedFiles.length} file signature(s) with suspicious patterns`,
              });
            }
          }

          // Check for hidden partitions
          const hiddenPartitions = partitions.filter(p => p.status === 'hidden');
          if (hiddenPartitions.length > 0) {
            addLog({
              level: 'WARNING',
              category: 'Analysis',
              message: `Hidden partition(s) detected: ${hiddenPartitions.map(p => `${p.filesystemType} at sector ${p.startSector}`).join(', ')}`,
            });
          }

          addEvidence({
            id: evidenceId,
            name: file.name,
            type: 'disk-image',
            path: `/evidence/disk-images/${file.name}`,
            size: file.size,
            dateAdded: new Date().toISOString(),
            partitions,
            analysisStatus: 'complete',
          });
        } else {
          // For regular files, just add the evidence
          addEvidence({
            id: evidenceId,
            name: file.name,
            type: 'file',
            path: `/evidence/files/${file.name}`,
            size: file.size,
            dateAdded: new Date().toISOString(),
            analysisStatus: 'pending',
          });
        }
      } catch (error) {
        addLog({
          level: 'ERROR',
          category: 'Evidence',
          message: `Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }
    onClose();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="card-cyber w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-display font-bold text-accent-cyan flex items-center gap-2">
            <Upload className="w-5 h-5" /> Add Evidence
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-bg-tertiary rounded">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <div className="p-4">
          {/* Drop zone */}
          <div
            className={`drop-zone p-8 text-center mb-4 ${isDragging ? 'active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept=".img,.dd,.raw,.e01,.iso,.bin,.dmg,*"
            />
            <HardDrive className="w-10 h-10 mx-auto mb-3 text-accent-cyan opacity-50" />
            <p className="text-text-primary text-sm mb-1">
              Drag & drop evidence files here
            </p>
            <p className="text-text-secondary text-xs">
              Supported: .img, .dd, .raw, .e01, or any file
            </p>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-bg-tertiary rounded text-sm">
                  <File className="w-4 h-4 text-accent-cyan shrink-0" />
                  <span className="text-text-primary truncate flex-1">{file.name}</span>
                  <span className="text-text-secondary text-xs shrink-0">{formatSize(file.size)}</span>
                  <button onClick={() => removeFile(idx)} className="p-0.5 hover:bg-bg-primary rounded">
                    <X className="w-3 h-3 text-text-secondary" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button
              className="btn-cyber filled flex-1"
              onClick={handleAdd}
              disabled={files.length === 0}
            >
              Add {files.length} Item{files.length !== 1 ? 's' : ''}
            </button>
            <button className="btn-cyber danger" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
