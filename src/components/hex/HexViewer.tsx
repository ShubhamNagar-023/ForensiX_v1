import { useState, useEffect } from 'react';
import { useCaseStore } from '../../stores/caseStore';
import { getFileData } from '../../utils/fileStorage';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function HexViewer() {
  const { selectedFileEntry, activeCase } = useCaseStore();
  const [offset, setOffset] = useState(0);
  const [jumpTo, setJumpTo] = useState('');
  const [hexData, setHexData] = useState<Uint8Array>(new Uint8Array(0));
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const BYTES_PER_ROW = 16;
  const VISIBLE_ROWS = 32;

  // Reset offset when selectedFileEntry changes
  useEffect(() => {
    if (selectedFileEntry?.id !== currentFileId) {
      setCurrentFileId(selectedFileEntry?.id || null);
      setOffset(0);
    }
  }, [selectedFileEntry, currentFileId]);

  // Load actual file data from IndexedDB when file is selected
  useEffect(() => {
    let cancelled = false;
    
    async function loadFileData() {
      if (!selectedFileEntry || !activeCase) {
        if (!cancelled) setHexData(new Uint8Array(0));
        return;
      }

      // Find the evidence item containing this file
      let evidenceId: string | null = null;
      for (const evidence of activeCase.evidence) {
        if (evidence.partitions) {
          for (const partition of evidence.partitions) {
            if (partition.files.some(f => f.id === selectedFileEntry.id)) {
              evidenceId = evidence.id;
              break;
            }
          }
        }
        if (evidenceId) break;
      }

      if (!evidenceId) {
        // If not found in partitions, this might be a standalone file
        const standalone = activeCase.evidence.find(e => e.name === selectedFileEntry.name);
        if (standalone) evidenceId = standalone.id;
      }

      if (evidenceId) {
        try {
          const fileData = await getFileData(evidenceId);
          if (fileData && !cancelled) {
            // For large files, only load the first 1MB for hex viewing
            const maxSize = 1024 * 1024; // 1MB
            const data = new Uint8Array(fileData.slice(0, Math.min(fileData.byteLength, maxSize)));
            setHexData(data);
          } else if (!cancelled) {
            // Fallback: generate minimal data from magic bytes if file data not available
            generateFallbackData();
          }
        } catch (error) {
          console.error('Failed to load file data:', error);
          if (!cancelled) generateFallbackData();
        }
      } else if (!cancelled) {
        generateFallbackData();
      }
    }

    function generateFallbackData() {
      // Generate minimal fallback data from magic bytes
      if (selectedFileEntry?.magicBytes) {
        const bytes = selectedFileEntry.magicBytes.split(' ').map(b => parseInt(b, 16));
        const data = new Uint8Array(Math.max(4096, bytes.length));
        bytes.forEach((b, i) => { data[i] = b; });
        setHexData(data);
      } else {
        setHexData(new Uint8Array(4096));
      }
    }

    loadFileData();
    
    return () => {
      cancelled = true;
    };
  }, [selectedFileEntry, activeCase]);

  const totalRows = Math.ceil(hexData.length / BYTES_PER_ROW);
  const startRow = Math.floor(offset / BYTES_PER_ROW);
  const visibleData = hexData.slice(startRow * BYTES_PER_ROW, (startRow + VISIBLE_ROWS) * BYTES_PER_ROW);

  const handleJump = () => {
    const addr = parseInt(jumpTo, 16);
    if (!isNaN(addr) && addr >= 0 && addr < hexData.length) {
      setOffset(Math.floor(addr / BYTES_PER_ROW) * BYTES_PER_ROW);
    }
  };

  const toHex = (byte: number) => byte.toString(16).padStart(2, '0').toUpperCase();
  const toAscii = (byte: number) => (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.';

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="p-3 border-b border-border bg-bg-secondary flex items-center gap-3">
        <h2 className="font-display font-semibold text-accent-cyan text-sm">
          Hex Viewer {selectedFileEntry ? `- ${selectedFileEntry.name}` : ''}
        </h2>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">Jump to:</span>
          <input
            type="text"
            value={jumpTo}
            onChange={(e) => setJumpTo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJump()}
            placeholder="0x0000"
            className="w-24 bg-bg-tertiary border border-border rounded px-2 py-1 text-xs font-mono text-text-primary focus:border-accent-cyan focus:outline-none"
          />
          <button className="btn-cyber text-xs" onClick={handleJump}>
            <Search className="w-3 h-3 inline" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="p-1 hover:bg-bg-tertiary rounded"
            onClick={() => setOffset(Math.max(0, offset - BYTES_PER_ROW * VISIBLE_ROWS))}
            disabled={offset === 0}
          >
            <ChevronLeft className="w-4 h-4 text-text-secondary" />
          </button>
          <span className="text-xs text-text-secondary font-mono">
            {`0x${offset.toString(16).padStart(8, '0')}`}
          </span>
          <button
            className="p-1 hover:bg-bg-tertiary rounded"
            onClick={() => setOffset(Math.min((totalRows - VISIBLE_ROWS) * BYTES_PER_ROW, offset + BYTES_PER_ROW * VISIBLE_ROWS))}
          >
            <ChevronRight className="w-4 h-4 text-text-secondary" />
          </button>
        </div>
      </div>

      {/* Hex Content */}
      <div className="flex-1 overflow-auto p-2 font-mono text-xs leading-5 select-text">
        {/* Header */}
        <div className="flex items-center text-text-secondary mb-1 border-b border-border pb-1 sticky top-0 bg-bg-primary z-10">
          <span className="w-20 shrink-0">Offset</span>
          <span className="flex-1">
            {Array.from({ length: BYTES_PER_ROW }, (_, i) => (
              <span key={i} className="inline-block w-[22px] text-center">{toHex(i)}</span>
            ))}
          </span>
          <span className="w-4" />
          <span className="w-[144px] shrink-0">ASCII</span>
        </div>

        {/* Rows */}
        {Array.from({ length: Math.min(VISIBLE_ROWS, Math.ceil(visibleData.length / BYTES_PER_ROW)) }, (_, rowIdx) => {
          const rowOffset = (startRow + rowIdx) * BYTES_PER_ROW;
          const rowBytes = visibleData.slice(rowIdx * BYTES_PER_ROW, (rowIdx + 1) * BYTES_PER_ROW);

          return (
            <div key={rowIdx} className="flex items-center hover:bg-bg-tertiary/30 rounded">
              <span className="w-20 shrink-0 text-accent-cyan">
                {`0x${rowOffset.toString(16).padStart(8, '0')}`}
              </span>
              <span className="flex-1">
                {Array.from(rowBytes).map((byte, i) => (
                  <span
                    key={i}
                    className={`hex-cell inline-block w-[22px] text-center ${
                      byte === 0 ? 'text-text-secondary/30' :
                      byte >= 32 && byte <= 126 ? 'text-accent-green' :
                      byte === 0xFF ? 'text-accent-red' :
                      'text-text-primary'
                    }`}
                    title={`Offset: 0x${(rowOffset + i).toString(16)}\nDecimal: ${byte}\nBinary: ${byte.toString(2).padStart(8, '0')}`}
                  >
                    {toHex(byte)}
                  </span>
                ))}
                {/* Padding for incomplete rows */}
                {Array.from({ length: BYTES_PER_ROW - rowBytes.length }, (_, i) => (
                  <span key={`pad-${i}`} className="inline-block w-[22px] text-center text-text-secondary/10">--</span>
                ))}
              </span>
              <span className="w-4 text-border shrink-0">│</span>
              <span className="w-[144px] shrink-0 text-accent-green/70">
                {Array.from(rowBytes).map((byte, i) => (
                  <span
                    key={i}
                    className={byte >= 32 && byte <= 126 ? '' : 'text-text-secondary/30'}
                  >
                    {toAscii(byte)}
                  </span>
                ))}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-border bg-bg-secondary text-xs text-text-secondary flex items-center gap-4">
        <span>Size: {hexData.length} bytes</span>
        <span>Offset: 0x{offset.toString(16).toUpperCase()}</span>
        <span>Row: {startRow + 1} / {totalRows}</span>
      </div>
    </div>
  );
}
