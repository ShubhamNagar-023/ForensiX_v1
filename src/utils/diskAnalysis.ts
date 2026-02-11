import type { Partition, FileEntry, HiddenSectorResult, SectorScanResult } from '../types';

const SECTOR_SIZE = 512;

// Magic byte signatures for filesystem detection
const FS_SIGNATURES = {
  NTFS: { offset: 0x03, pattern: [0x4E, 0x54, 0x46, 0x53, 0x20, 0x20, 0x20, 0x20], name: 'NTFS' },
  FAT32: { offset: 0x52, pattern: [0x46, 0x41, 0x54, 0x33, 0x32, 0x20, 0x20, 0x20], name: 'FAT32' },
  FAT16: { offset: 0x36, pattern: [0x46, 0x41, 0x54, 0x31, 0x36, 0x20, 0x20, 0x20], name: 'FAT16' },
  EXFAT: { offset: 0x03, pattern: [0x45, 0x58, 0x46, 0x41, 0x54, 0x20, 0x20, 0x20], name: 'exFAT' },
  EXT: { offset: 0x438, pattern: [0x53, 0xEF], name: 'EXT2/3/4' },
};

// MBR partition type codes
const PARTITION_TYPES: Record<number, string> = {
  0x00: 'Empty',
  0x01: 'FAT12',
  0x04: 'FAT16 (<32MB)',
  0x05: 'Extended',
  0x06: 'FAT16 (>32MB)',
  0x07: 'NTFS/exFAT',
  0x0B: 'FAT32 (CHS)',
  0x0C: 'FAT32 (LBA)',
  0x0E: 'FAT16 (LBA)',
  0x0F: 'Extended (LBA)',
  0x11: 'Hidden FAT12',
  0x14: 'Hidden FAT16 (<32MB)',
  0x16: 'Hidden FAT16 (>32MB)',
  0x17: 'Hidden NTFS',
  0x1B: 'Hidden FAT32',
  0x1C: 'Hidden FAT32 (LBA)',
  0x1E: 'Hidden FAT16 (LBA)',
  0x82: 'Linux Swap',
  0x83: 'Linux',
  0xEE: 'GPT Protective',
  0xEF: 'EFI System',
};

const HIDDEN_PARTITION_TYPES = [0x11, 0x14, 0x16, 0x17, 0x1B, 0x1C, 0x1E];

export function parseMBR(data: ArrayBuffer): Partition[] {
  const view = new DataView(data);
  const partitions: Partition[] = [];

  // Check for MBR signature (0x55AA at offset 510)
  if (data.byteLength < 512) return partitions;
  const sig = view.getUint16(510, false);
  if (sig !== 0x55AA) return partitions;

  // Parse 4 partition table entries starting at offset 0x1BE
  for (let i = 0; i < 4; i++) {
    const offset = 0x1BE + (i * 16);
    const status = view.getUint8(offset);
    const typeCode = view.getUint8(offset + 4);
    const startLBA = view.getUint32(offset + 8, true);
    const sizeSectors = view.getUint32(offset + 12, true);

    if (typeCode === 0x00 || sizeSectors === 0) continue;

    const isHidden = HIDDEN_PARTITION_TYPES.includes(typeCode);
    const typeName = PARTITION_TYPES[typeCode] || `Unknown (0x${typeCode.toString(16).padStart(2, '0')})`;

    partitions.push({
      id: `part-${i + 1}`,
      number: i + 1,
      type: typeName,
      filesystemType: getFilesystemFromType(typeCode),
      startSector: startLBA,
      endSector: startLBA + sizeSectors - 1,
      size: sizeSectors * SECTOR_SIZE,
      status: status === 0x80 ? 'active' : isHidden ? 'hidden' : 'inactive',
      files: [],
    });
  }

  return partitions;
}

function getFilesystemFromType(typeCode: number): string {
  if ([0x07, 0x17].includes(typeCode)) return 'NTFS';
  if ([0x0B, 0x0C, 0x1B, 0x1C].includes(typeCode)) return 'FAT32';
  if ([0x04, 0x06, 0x0E, 0x14, 0x16, 0x1E].includes(typeCode)) return 'FAT16';
  if (typeCode === 0x83) return 'EXT4';
  if (typeCode === 0x82) return 'Linux Swap';
  if (typeCode === 0xEE) return 'GPT';
  if (typeCode === 0xEF) return 'EFI';
  return 'Unknown';
}

export function detectFilesystemSignature(data: Uint8Array): { type: string; confidence: 'HIGH' | 'MEDIUM' | 'LOW' } | null {
  for (const [, sig] of Object.entries(FS_SIGNATURES)) {
    if (data.length < sig.offset + sig.pattern.length) continue;
    let match = true;
    for (let j = 0; j < sig.pattern.length; j++) {
      if (data[sig.offset + j] !== sig.pattern[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      return { type: sig.name, confidence: 'HIGH' };
    }
  }
  return null;
}

export function calculateEntropy(data: Uint8Array): number {
  const frequency = new Array(256).fill(0);
  for (let i = 0; i < data.length; i++) {
    frequency[data[i]]++;
  }
  let entropy = 0;
  for (let i = 0; i < 256; i++) {
    if (frequency[i] > 0) {
      const p = frequency[i] / data.length;
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

export function isEmptySector(data: Uint8Array): boolean {
  for (let i = 0; i < data.length; i++) {
    if (data[i] !== 0) return false;
  }
  return true;
}

const COMMON_HIDING_SPOTS = [
  { sector: 32, name: 'SanDisk U3 common location', size: 16384 },
  { sector: 64, name: 'Kingston DataTraveler location', size: 8192 },
  { sector: 128, name: 'Alternative hiding spot', size: 8192 },
  { sector: 256, name: 'Alternative hiding spot', size: 8192 },
  { sector: 2048, name: 'Common GPT data start', size: 2048 },
];

export async function scanHidingSpotsInImage(
  file: File,
  onProgress?: (msg: string) => void
): Promise<HiddenSectorResult[]> {
  const results: HiddenSectorResult[] = [];
  
  for (const spot of COMMON_HIDING_SPOTS) {
    const byteOffset = spot.sector * SECTOR_SIZE;
    if (byteOffset >= file.size) continue;

    onProgress?.(`Checking sector ${spot.sector} (${spot.name})...`);

    const readSize = Math.min(SECTOR_SIZE * 16, file.size - byteOffset);
    const slice = file.slice(byteOffset, byteOffset + readSize);
    const buffer = await slice.arrayBuffer();
    const data = new Uint8Array(buffer);

    if (isEmptySector(data)) continue;

    const fsSignature = detectFilesystemSignature(data);
    const entropy = calculateEntropy(data);

    if (fsSignature) {
      results.push({
        sector: spot.sector,
        offset: byteOffset,
        type: fsSignature.type,
        confidence: fsSignature.confidence,
        entropy,
        signature: fsSignature.type,
        status: 'POTENTIAL_HIDDEN_PARTITION',
      });
    } else if (entropy > 7.5) {
      results.push({
        sector: spot.sector,
        offset: byteOffset,
        type: 'Encrypted/Compressed',
        confidence: 'MEDIUM',
        entropy,
        status: 'ENCRYPTED_OR_COMPRESSED',
      });
    } else {
      results.push({
        sector: spot.sector,
        offset: byteOffset,
        type: 'Unknown Data',
        confidence: 'LOW',
        entropy,
        status: 'CONTAINS_DATA',
      });
    }
  }

  return results;
}

export async function performSectorScan(
  file: File,
  mode: 'quick' | 'standard' | 'paranoid',
  onProgress?: (progress: number, message: string) => void
): Promise<SectorScanResult> {
  const totalSectors = Math.floor(file.size / SECTOR_SIZE);
  const result: SectorScanResult = {
    hiddenPartitions: [],
    filesystemSignatures: [],
    suspiciousSectors: [],
    encryptedRegions: [],
    scanProgress: 0,
    totalSectors,
  };

  // Phase 1: Parse MBR
  onProgress?.(0, 'Reading MBR partition table...');
  const mbrSlice = file.slice(0, SECTOR_SIZE);
  const mbrBuffer = await mbrSlice.arrayBuffer();
  const mbrData = new Uint8Array(mbrBuffer);
  const mbrSig = detectFilesystemSignature(mbrData);
  if (mbrSig) {
    result.filesystemSignatures.push({
      sector: 0,
      offset: 0,
      type: mbrSig.type,
      confidence: mbrSig.confidence,
      status: 'POTENTIAL_HIDDEN_PARTITION',
    });
  }

  // Phase 2: Check common hiding spots
  onProgress?.(5, 'Scanning common hiding spots...');
  const hidingSpots = await scanHidingSpotsInImage(file, (msg) => onProgress?.(10, msg));
  result.hiddenPartitions.push(...hidingSpots.filter((s) => s.status === 'POTENTIAL_HIDDEN_PARTITION'));
  result.encryptedRegions.push(...hidingSpots.filter((s) => s.status === 'ENCRYPTED_OR_COMPRESSED'));
  result.suspiciousSectors.push(...hidingSpots.filter((s) => s.status === 'CONTAINS_DATA'));

  if (mode === 'quick') {
    result.scanProgress = 100;
    return result;
  }

  // Phase 3: Scan unallocated space (standard + paranoid)
  const scanStep = mode === 'paranoid' ? 1 : 64; // every sector vs every 64 sectors
  const maxSectors = Math.min(totalSectors, mode === 'paranoid' ? totalSectors : 100000);

  for (let sector = 0; sector < maxSectors; sector += scanStep) {
    if (sector % 1000 === 0) {
      const progress = 20 + (sector / maxSectors) * 80;
      onProgress?.(progress, `Scanning sector ${sector}/${maxSectors}...`);
    }

    const byteOffset = sector * SECTOR_SIZE;
    const readSize = Math.min(SECTOR_SIZE * 2, file.size - byteOffset);
    if (readSize <= 0) break;

    const slice = file.slice(byteOffset, byteOffset + readSize);
    const buffer = await slice.arrayBuffer();
    const data = new Uint8Array(buffer);

    if (isEmptySector(data)) continue;

    const fsSignature = detectFilesystemSignature(data);
    if (fsSignature && sector > 0) {
      result.filesystemSignatures.push({
        sector,
        offset: byteOffset,
        type: fsSignature.type,
        confidence: fsSignature.confidence,
        status: 'POTENTIAL_HIDDEN_PARTITION',
      });
    }

    if (mode === 'paranoid') {
      const entropy = calculateEntropy(data);
      if (entropy > 7.5) {
        result.encryptedRegions.push({
          sector,
          offset: byteOffset,
          type: 'High Entropy',
          confidence: 'MEDIUM',
          entropy,
          status: 'ENCRYPTED_OR_COMPRESSED',
        });
      }
    }
  }

  result.scanProgress = 100;
  return result;
}

// Extract files from a disk image using file carving
export async function extractFilesFromImage(file: File): Promise<FileEntry[]> {
  const files: FileEntry[] = [];
  const now = new Date().toISOString();
  
  // Read the first 1MB to analyze for file signatures
  const headerSize = Math.min(1024 * 1024, file.size);
  const headerSlice = file.slice(0, headerSize);
  const headerBuffer = await headerSlice.arrayBuffer();
  const headerData = new Uint8Array(headerBuffer);

  // Scan for file signatures in the image
  const FILE_SIGS: { name: string; ext: string; pattern: number[]; mime: string }[] = [
    { name: 'JPEG Image', ext: '.jpg', pattern: [0xFF, 0xD8, 0xFF], mime: 'image/jpeg' },
    { name: 'PNG Image', ext: '.png', pattern: [0x89, 0x50, 0x4E, 0x47], mime: 'image/png' },
    { name: 'PDF Document', ext: '.pdf', pattern: [0x25, 0x50, 0x44, 0x46], mime: 'application/pdf' },
    { name: 'ZIP Archive', ext: '.zip', pattern: [0x50, 0x4B, 0x03, 0x04], mime: 'application/zip' },
    { name: 'PE Executable', ext: '.exe', pattern: [0x4D, 0x5A], mime: 'application/x-executable' },
    { name: 'ELF Binary', ext: '.elf', pattern: [0x7F, 0x45, 0x4C, 0x46], mime: 'application/x-elf' },
    { name: 'GIF Image', ext: '.gif', pattern: [0x47, 0x49, 0x46, 0x38], mime: 'image/gif' },
    { name: 'RAR Archive', ext: '.rar', pattern: [0x52, 0x61, 0x72, 0x21], mime: 'application/x-rar' },
    { name: 'SQLite DB', ext: '.db', pattern: [0x53, 0x51, 0x4C, 0x69, 0x74, 0x65], mime: 'application/x-sqlite3' },
    { name: 'GZIP Archive', ext: '.gz', pattern: [0x1F, 0x8B], mime: 'application/gzip' },
  ];

  let fileIdx = 0;
  const maxFiles = 100; // Limit to prevent excessive carving
  
  for (let offset = 0; offset < headerData.length - 8 && fileIdx < maxFiles; offset++) {
    for (const sig of FILE_SIGS) {
      let match = true;
      for (let j = 0; j < sig.pattern.length; j++) {
        if (headerData[offset + j] !== sig.pattern[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        fileIdx++;
        
        // Estimate file size by searching for next file signature or end of data
        let estimatedSize = 0;
        const maxScanAhead = Math.min(10 * 1024 * 1024, headerData.length - offset); // Max 10MB per file
        
        for (let i = offset + sig.pattern.length; i < offset + maxScanAhead; i++) {
          // Simple heuristic: look for another file signature
          let foundNext = false;
          for (const nextSig of FILE_SIGS) {
            if (i + nextSig.pattern.length <= headerData.length) {
              let nextMatch = true;
              for (let k = 0; k < nextSig.pattern.length; k++) {
                if (headerData[i + k] !== nextSig.pattern[k]) {
                  nextMatch = false;
                  break;
                }
              }
              if (nextMatch) {
                foundNext = true;
                break;
              }
            }
          }
          if (foundNext) {
            estimatedSize = i - offset;
            break;
          }
        }
        
        if (estimatedSize === 0) {
          estimatedSize = Math.min(1024 * 1024, headerData.length - offset); // Default to 1MB or remaining data
        }
        
        files.push({
          id: `carved-${fileIdx}`,
          name: `carved_${fileIdx}${sig.ext}`,
          path: `/carved/carved_${fileIdx}${sig.ext}`,
          size: estimatedSize,
          type: 'file',
          extension: sig.ext,
          isDeleted: offset > headerData.length / 4, // Files in latter part are more likely deleted
          isHidden: false,
          isSpoofed: false,
          timestamps: { created: now, modified: now, accessed: now },
          magicBytes: sig.pattern.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' '),
          actualType: sig.name,
          claimedType: sig.name,
        });
        
        // Skip ahead to avoid duplicate detections
        offset += sig.pattern.length + 100;
        break;
      }
    }
  }

  return files;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

export function formatSector(sector: number): string {
  return sector.toLocaleString();
}
