import { useState, useCallback, useRef } from 'react';
import { Upload, HardDrive, File, X, AlertCircle, CheckCircle } from 'lucide-react';
import { useCaseStore } from '../../stores/caseStore';
import { uploadDiskImage, openDiskImage, extractFiles } from '../../utils/backendApi';
import type { Partition } from '../../types';

interface Props {
  onClose: () => void;
}

export default function EvidenceUpload({ onClose }: Props) {
  const { addEvidence, addLog } = useCaseStore();
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ [key: string]: 'pending' | 'uploading' | 'success' | 'error' }>({});
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
    setUploading(true);
    
    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isDiskImage = ['img', 'dd', 'raw', 'e01', 'iso', 'bin'].includes(ext);
      const evidenceId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      try {
        setUploadStatus(prev => ({ ...prev, [file.name]: 'uploading' }));
        
        addLog({
          level: 'INFO',
          category: 'Evidence',
          message: `Uploading evidence: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
        });

        if (isDiskImage) {
          // Upload disk image to backend
          addLog({
            level: 'INFO',
            category: 'Analysis',
            message: `Uploading disk image to forensics backend...`,
          });

          const uploadResult = await uploadDiskImage(file);
          
          addLog({
            level: 'INFO',
            category: 'Analysis',
            message: `Processing disk image with pytsk3 and libewf...`,
          });

          // Open the image with pytsk3/libewf
          const imageInfo = await openDiskImage(uploadResult.file_path);
          
          addLog({
            level: 'INFO',
            category: 'Analysis',
            message: `Disk image opened: ${imageInfo.format.toUpperCase()} format, ${imageInfo.partitions.length} partition(s) detected`,
          });

          // Convert backend partition info to frontend format
          const partitions: Partition[] = await Promise.all(
            imageInfo.partitions.map(async (part) => {
              addLog({
                level: 'INFO',
                category: 'Analysis',
                message: `Extracting files from ${part.filesystem_type} partition ${part.number}...`,
              });

              // Extract files from this partition using real pytsk3
              try {
                const fileList = await extractFiles(uploadResult.file_path, part.id, {
                  maxFiles: 1000,
                  includeDeleted: true,
                  includeDirectories: false,
                });

                addLog({
                  level: 'INFO',
                  category: 'Analysis',
                  message: `Extracted ${fileList.length} files from partition ${part.number} (${part.filesystem_type})`,
                });

                # Convert backend file metadata to frontend format
                const convertedFiles = fileList.map((f) => ({
                  id: f.id,
                  name: f.name,
                  path: f.path,
                  size: f.size,
                  type: f.type,
                  extension: f.extension,
                  isDeleted: f.is_deleted,
                  isHidden: f.is_hidden,
                  isSpoofed: false, // TODO: Implement spoofing detection via backend API
                  timestamps: {
                    created: f.timestamps.created || new Date().toISOString(),
                    modified: f.timestamps.modified || new Date().toISOString(),
                    accessed: f.timestamps.accessed || new Date().toISOString(),
                  },
                  magicBytes: '',
                  actualType: '',
                  claimedType: f.extension,
                }));

                return {
                  id: part.id,
                  number: part.number,
                  type: part.type,
                  filesystemType: part.filesystem_type,
                  startSector: part.start_sector,
                  endSector: part.end_sector,
                  size: part.size,
                  status: part.status,
                  files: convertedFiles,
                };
              } catch (extractError) {
                console.error(`Failed to extract files from partition ${part.number}:`, extractError);
                addLog({
                  level: 'ERROR',
                  category: 'Analysis',
                  message: `Failed to extract files from partition ${part.number}: ${extractError}`,
                });
                
                return {
                  id: part.id,
                  number: part.number,
                  type: part.type,
                  filesystemType: part.filesystem_type,
                  startSector: part.start_sector,
                  endSector: part.end_sector,
                  size: part.size,
                  status: part.status,
                  files: [],
                };
              }
            })
          );

          // Count deleted files
          const totalFiles = partitions.reduce((sum, p) => sum + p.files.length, 0);
          const deletedFiles = partitions.flatMap(p => p.files).filter(f => f.isDeleted).length;
          
          if (deletedFiles > 0) {
            addLog({
              level: 'WARNING',
              category: 'Analysis',
              message: `Found ${deletedFiles} deleted file(s) in disk image`,
            });
          }

          addEvidence({
            id: evidenceId,
            name: file.name,
            type: 'disk-image',
            format: imageInfo.format,
            size: file.size,
            hash: '', // Will be calculated if needed
            dateAdded: new Date().toISOString(),
            partitions,
            metadata: {
              totalSectors: imageInfo.total_sectors,
              sectorSize: imageInfo.sector_size,
              backendPath: uploadResult.file_path,
            },
          });

          addLog({
            level: 'INFO',
            category: 'Evidence',
            message: `Successfully processed disk image: ${totalFiles} total files, ${deletedFiles} deleted`,
          });
        } else {
          // Individual file - add without backend processing for now
          addEvidence({
            id: evidenceId,
            name: file.name,
            type: 'file',
            format: ext,
            size: file.size,
            hash: '',
            dateAdded: new Date().toISOString(),
            partitions: [],
          });

          addLog({
            level: 'INFO',
            category: 'Evidence',
            message: `Individual file added: ${file.name}`,
          });
        }

        setUploadStatus(prev => ({ ...prev, [file.name]: 'success' }));
      } catch (error) {
        console.error('Failed to add evidence:', error);
        setUploadStatus(prev => ({ ...prev, [file.name]: 'error' }));
        addLog({
          level: 'ERROR',
          category: 'Evidence',
          message: `Failed to add evidence ${file.name}: ${error}`,
        });
      }
    }

    setUploading(false);
    
    // Only close if all succeeded
    const allSucceeded = Object.values(uploadStatus).every(s => s === 'success');
    if (allSucceeded) {
      setTimeout(onClose, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-lg border border-cyan-500/30 bg-gray-900 p-6 shadow-2xl shadow-cyan-500/20">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-cyan-400">Add Evidence</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-cyan-400"
            disabled={uploading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`mb-6 rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
            isDragging
              ? 'border-cyan-400 bg-cyan-400/10'
              : 'border-gray-700 bg-gray-800/50 hover:border-cyan-500/50'
          }`}
        >
          <Upload className="mx-auto mb-4 h-12 w-12 text-cyan-400" />
          <p className="mb-2 text-lg font-medium text-gray-300">
            Drag and drop disk images or files here
          </p>
          <p className="mb-4 text-sm text-gray-500">or</p>
          <button
            onClick={() => inputRef.current?.click()}
            className="rounded-lg bg-cyan-600 px-6 py-2 font-medium text-white transition-colors hover:bg-cyan-700"
            disabled={uploading}
          >
            Browse Files
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          <p className="mt-4 text-xs text-gray-500">
            Supported: E01, DD, IMG, RAW, ISO and individual files
          </p>
        </div>

        {files.length > 0 && (
          <div className="mb-6 space-y-2">
            <h3 className="text-sm font-medium text-gray-400">Selected Files</h3>
            {files.map((file, index) => {
              const ext = file.name.split('.').pop()?.toLowerCase() || '';
              const isDiskImage = ['img', 'dd', 'raw', 'e01', 'iso', 'bin'].includes(ext);
              const status = uploadStatus[file.name] || 'pending';
              
              return (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 p-3"
                >
                  <div className="flex items-center space-x-3">
                    {isDiskImage ? (
                      <HardDrive className="h-5 w-5 text-purple-400" />
                    ) : (
                      <File className="h-5 w-5 text-blue-400" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-300">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                        {isDiskImage && ' • Disk Image'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {status === 'uploading' && (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                    )}
                    {status === 'success' && <CheckCircle className="h-4 w-4 text-green-400" />}
                    {status === 'error' && <AlertCircle className="h-4 w-4 text-red-400" />}
                    {status === 'pending' && !uploading && (
                      <button
                        onClick={() => removeFile(index)}
                        className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-700 hover:text-red-400"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-700 px-6 py-2 font-medium text-gray-300 transition-colors hover:bg-gray-800"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={files.length === 0 || uploading}
            className="rounded-lg bg-cyan-600 px-6 py-2 font-medium text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? 'Processing...' : `Add ${files.length} File${files.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
