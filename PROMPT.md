# Disk Forensics Web Application - Development Prompt

## Project Overview
Create a professional disk forensics web application called "ForensicX" with a dark, cyber-themed UI. The application should provide comprehensive disk analysis capabilities for digital forensic investigators.

**CRITICAL ARCHITECTURE PRINCIPLE**: This is a **CASE-CENTRIC** application. Everything revolves around cases - all logs, files, images, analysis results, reports, and artifacts belong to and are stored within their respective case. There is no global workspace. Users always work within the context of a specific case.

## Design Reference
Base the visual design on: https://forensicx.lovable.app
- Dark mode professional UI with cyber aesthetics
- Matrix-style green/cyan accents on dark backgrounds
- Terminal-inspired fonts and layouts
- Clean, modern card-based layouts
- Neon glow effects for interactive elements
- **3-PANEL LAYOUT** for optimal workflow (see layout section below)

## Core Features & Requirements

### 1. Case Management System (CASE-CENTRIC CORE)
- **Everything belongs to a case**: No analysis can be performed outside of a case context
- **File-based architecture**: Each case is a self-contained, isolated workspace
- **Comprehensive case structure**:
  ```
  /cases
    /case-001-laptop-seizure-2024
      /evidence
        /disk-images
          laptop-primary.img
          laptop-primary.img.hash (MD5 + SHA256)
        /extracted-files
          /partition-1-ntfs
          /partition-2-fat32
        /carved-files
          /deleted
          /unallocated
      /analysis
        /strings
          ascii-strings.txt
          unicode-strings.txt
        /timeline
          filesystem-timeline.csv
        /hashes
          file-hashes.txt
      /reports
        case-report-2024-02-11.txt
        executive-summary.txt
      /logs
        analysis-log-2024-02-11.txt
        error-log.txt
      /artifacts
        /registry (Windows registry hives)
        /browser (browser history, cache)
        /email (email files)
      /bookmarks
        bookmarked-files.json
        suspicious-items.json
      /notes
        investigator-notes.md
      /screenshots
        evidence-screenshot-001.png
      case-metadata.json
      case-index.db (SQLite for fast searching)
  ```
- **Case metadata** (stored in case-metadata.json):
  - Case ID (auto-generated unique identifier)
  - Case name
  - Case number (organizational reference)
  - Date created
  - Last modified
  - Lead investigator
  - Team members
  - Case description
  - Case status (Active, Under Review, Closed, Archived)
  - Evidence custodian
  - Tags/categories
  - Priority level
  - Related cases (linked case IDs)
- **Case list view**: 
  - Grid/card view of all cases
  - Search and filter by status, investigator, date, tags
  - Sort by date, name, priority
  - Case statistics preview (# of evidence items, # of files extracted, analysis progress)
- **Case dashboard**: 
  - Overview of all case contents
  - Evidence summary
  - Analysis progress indicators
  - Recent activity timeline
  - Quick access to logs, reports, and key findings
  - Bookmarked items
  - Case notes section

### 2. File Input & Selection
- **Native OS file picker**: Use HTML5 file input with native dialogs
- **Folder selection**: Enable directory upload for bulk evidence intake
- **Drag-and-drop support**: Drop files/folders directly into the interface
- **Supported formats**: 
  - RAW disk images (.img, .dd, .raw)
  - E01 forensic images (EnCase format)
  - Individual files for analysis

### 3. Disk Image Analysis Engine

#### Partition Detection
- **Sleuth Kit integration**: Use TSK (The Sleuth Kit) or similar library
- **Partition table parsing**: MBR, GPT detection
- **Partition list view**: Display all detected partitions with:
  - Partition number
  - File system type
  - Start sector
  - Size
  - Status (active/inactive)
- **All results stored in case**: `/analysis/partition-info.json`

#### Filesystem Analysis
- **Supported filesystems**:
  - NTFS (Windows)
  - FAT32, exFAT (Legacy Windows/removable media)
  - EXT2/3/4 (Linux)
- **Filesystem signature detection**: Scan for magic bytes and superblock structures
- **File extraction**: Automatically extract file listings from detected filesystems
- **Metadata preservation**: Timestamps (Created, Modified, Accessed), permissions, attributes
- **All extracted files saved to**: `/evidence/extracted-files/`

#### Deleted File Recovery
- **Unallocated space scanning**: Parse filesystem structures for deleted entries
- **File carving**: Signature-based recovery from unallocated sectors
- **Visual distinction**: Highlight deleted files with red/orange indicators
- **Recovery status**: Show recoverability percentage
- **Deleted files saved to**: `/evidence/carved-files/deleted/`

#### Advanced Scanning
- **Brute-force sector scan**: Exhaustive search for hidden/orphaned filesystems
- **Slack space analysis**: Examine slack space in allocated clusters
- **Signature detection**: Identify filesystem signatures at any sector offset
- **Progress indicator**: Real-time progress bar with sector count
- **Scan results logged to**: `/logs/analysis-log-[date].txt`

### 3.1. Hidden Sector Analysis (CRITICAL FOR REMOVABLE MEDIA)

**IMPORTANT**: USB flash drives (especially SanDisk, Kingston, Transcend) and SD cards often contain hidden sectors and reserved areas that may hide data or malicious code. These sectors are NOT visible through normal filesystem access.

## How the Reference Python Tool Handles Partition Detection

The DForensics_Tool.py uses **The Sleuth Kit (pytsk3)** for partition detection, which works as follows:

### Method 1: Standard Volume/Partition Table Detection (Lines 606-672)

```python
# Step 1: Open the disk image
img_info = pytsk3.Img_Info(image_path)

# Step 2: Try to read partition table (MBR or GPT)
volume = pytsk3.Volume_Info(img_info)

# Step 3: Iterate through partitions
for idx, part in enumerate(volume):
    # Each partition has:
    # - part.desc: Partition description (e.g., "NTFS / exFAT (0x07)")
    # - part.start: Starting sector/block number
    # - part.len: Length in blocks
    # - volume.info.block_size: Block size (usually 512 bytes)
    
    # Calculate actual byte offset
    offset = part.start * volume.info.block_size
    size = part.len * volume.info.block_size
    
    # Try to detect filesystem at this offset
    fs = pytsk3.FS_Info(img_info, offset=offset)
```

**Key Insight**: This method ONLY finds partitions listed in the partition table. It will **NOT** find:
- Hidden partitions at sector 32 if they're not in the partition table
- Unallocated space between partitions
- Hidden Protected Areas (HPA)
- Device Configuration Overlay (DCO)
- Data in slack space

### Method 2: Logical Volume Detection (Fallback - Lines 652-671)

If partition table reading fails (e.g., no MBR/GPT), the tool tries to open the entire image as one logical volume:

```python
# If no partition table found, try entire image as single filesystem
fs_info = pytsk3.FS_Info(img_info)  # Offset = 0
```

**Limitation**: This assumes filesystem starts at sector 0, which won't detect hidden filesystems at sector 32 or other offsets.

## The Problem: What Gets Missed

The current approach **ONLY scans known partitions** from the partition table. It misses:

1. **Sector 32 hidden partitions** on SanDisk drives (not in partition table)
2. **Unallocated space** between partitions
3. **Slack space** at the end of partitions
4. **HPA/DCO** hidden areas
5. **Data hidden in "empty" sectors** (sectors not allocated to any partition)

## The Solution: Comprehensive Sector-by-Sector Scanning

To build an application like **Autopsy**, we need a **hybrid approach**:

### Phase 1: Standard Partition Detection (Fast)
Use pytsk3/Sleuth Kit to detect known partitions from partition table

### Phase 2: Brute-Force Sector Scanning (Thorough)
Scan EVERY sector from 0 to end of disk, looking for:
- Filesystem signatures at ANY offset
- Hidden partitions
- Encrypted containers
- File signatures in unallocated space

### Implementation Strategy for Web Application

```javascript
class ComprehensiveDiskScanner {
  
  /**
   * Phase 1: Standard partition detection using partition table
   */
  async detectStandardPartitions(imageFile) {
    // Read MBR at sector 0 (offset 0x1BE)
    const mbr = await this.readSectors(0, 1);
    const partitionTable = this.parseMBR(mbr);
    
    // Read GPT if present
    const gpt = await this.readSectors(1, 33);
    const gptPartitions = this.parseGPT(gpt);
    
    // Combine MBR and GPT partitions
    const knownPartitions = [...partitionTable, ...gptPartitions];
    
    return knownPartitions;
  }
  
  /**
   * Phase 2: Comprehensive sector-by-sector scan
   * This finds EVERYTHING the partition table might miss
   */
  async scanAllSectors(imageFile, progressCallback) {
    const SECTOR_SIZE = 512;
    const totalSectors = imageFile.size / SECTOR_SIZE;
    const results = {
      hiddenPartitions: [],
      filesystemSignatures: [],
      suspiciousSectors: [],
      encryptedRegions: []
    };
    
    // Build map of known partition ranges
    const knownRanges = this.buildKnownRanges(this.knownPartitions);
    
    // Scan every sector
    for (let sector = 0; sector < totalSectors; sector++) {
      // Update progress every 1000 sectors
      if (sector % 1000 === 0) {
        progressCallback({
          current: sector,
          total: totalSectors,
          percentage: (sector / totalSectors) * 100
        });
      }
      
      // Skip sectors that are part of known, analyzed partitions
      // (Optional optimization - can be disabled for paranoid mode)
      if (this.isInKnownPartition(sector, knownRanges)) {
        continue;
      }
      
      // Read this sector
      const sectorData = await this.readSectors(sector, 1);
      
      // Check 1: Is this sector truly empty (all zeros)?
      if (this.isEmptySector(sectorData)) {
        continue;
      }
      
      // Check 2: Filesystem signature detection
      const fsSignature = this.detectFilesystemSignature(sectorData);
      if (fsSignature) {
        results.filesystemSignatures.push({
          sector: sector,
          offset: sector * SECTOR_SIZE,
          type: fsSignature.type,
          confidence: fsSignature.confidence
        });
        
        // If filesystem found, try to mount and analyze
        await this.analyzeHiddenFilesystem(sector, fsSignature.type);
      }
      
      // Check 3: Entropy analysis (detect encryption)
      const entropy = this.calculateEntropy(sectorData);
      if (entropy > 7.5) {
        results.encryptedRegions.push({
          sector: sector,
          entropy: entropy
        });
      }
      
      // Check 4: File signature detection (files without filesystem)
      const fileSignature = this.detectFileSignature(sectorData);
      if (fileSignature) {
        results.suspiciousSectors.push({
          sector: sector,
          fileType: fileSignature.type,
          confidence: fileSignature.confidence
        });
      }
    }
    
    return results;
  }
  
  /**
   * Special attention to common hidden partition locations
   */
  async scanCommonHidingSpots() {
    const spotsToCheck = [
      { sector: 32, name: "SanDisk U3 common location", size: 16384 },      // 8MB
      { sector: 64, name: "Kingston DataTraveler location", size: 8192 },   // 4MB
      { sector: 128, name: "Alternative hiding spot", size: 8192 },
      { sector: 256, name: "Alternative hiding spot", size: 8192 },
      { sector: 2048, name: "Common GPT data start", size: 2048 }
    ];
    
    const findings = [];
    
    for (const spot of spotsToCheck) {
      const data = await this.readSectors(spot.sector, 16); // Read first 8KB
      
      // Check if this looks like a filesystem
      const signature = this.detectFilesystemSignature(data);
      if (signature) {
        findings.push({
          location: spot,
          signature: signature,
          status: 'POTENTIAL_HIDDEN_PARTITION'
        });
        
        // Try to mount this filesystem
        await this.mountHiddenPartition(spot.sector, signature.type);
      }
      
      // Check if non-zero data (not just empty space)
      if (!this.isEmptySector(data)) {
        const entropy = this.calculateEntropy(data);
        findings.push({
          location: spot,
          entropy: entropy,
          status: entropy > 7.5 ? 'ENCRYPTED_OR_COMPRESSED' : 'CONTAINS_DATA'
        });
      }
    }
    
    return findings;
  }
  
  /**
   * Detect filesystem signatures at any offset
   */
  detectFilesystemSignature(sectorData) {
    const signatures = {
      // NTFS: "NTFS    " at offset 0x03
      NTFS: {
        offset: 0x03,
        pattern: [0x4E, 0x54, 0x46, 0x53, 0x20, 0x20, 0x20, 0x20],
        name: 'NTFS'
      },
      
      // FAT32: "FAT32   " at offset 0x52
      FAT32: {
        offset: 0x52,
        pattern: [0x46, 0x41, 0x54, 0x33, 0x32, 0x20, 0x20, 0x20],
        name: 'FAT32'
      },
      
      // FAT16: "FAT16   " at offset 0x36
      FAT16: {
        offset: 0x36,
        pattern: [0x46, 0x41, 0x54, 0x31, 0x36, 0x20, 0x20, 0x20],
        name: 'FAT16'
      },
      
      // exFAT: "EXFAT   " at offset 0x03
      EXFAT: {
        offset: 0x03,
        pattern: [0x45, 0x58, 0x46, 0x41, 0x54, 0x20, 0x20, 0x20],
        name: 'exFAT'
      },
      
      // EXT2/3/4: 0x53EF at offset 0x438 (1080 bytes - need to read more)
      EXT: {
        offset: 0x438,
        pattern: [0x53, 0xEF],
        name: 'EXT2/3/4'
      }
    };
    
    for (const [key, sig] of Object.entries(signatures)) {
      if (this.matchesPattern(sectorData, sig.offset, sig.pattern)) {
        return {
          type: sig.name,
          confidence: 'HIGH',
          offset: sig.offset
        };
      }
    }
    
    return null;
  }
  
  /**
   * Try to mount and analyze a hidden filesystem
   */
  async analyzeHiddenFilesystem(startSector, fsType) {
    try {
      // Calculate byte offset
      const offset = startSector * 512;
      
      // Try to open filesystem at this offset
      const fs = await this.openFilesystem(this.imageFile, offset, fsType);
      
      // Scan all files in this hidden filesystem
      const files = await this.scanFilesystem(fs);
      
      // Add to case as "Hidden Partition"
      this.case.addHiddenPartition({
        startSector: startSector,
        offset: offset,
        fsType: fsType,
        files: files,
        discovered: 'SECTOR_SCAN'
      });
      
      // Log finding
      logger.critical(`HIDDEN PARTITION FOUND at sector ${startSector} (${fsType})`);
      
    } catch (error) {
      logger.debug(`Failed to mount filesystem at sector ${startSector}: ${error}`);
    }
  }
  
  /**
   * Calculate Shannon entropy (0-8) to detect encryption/compression
   */
  calculateEntropy(data) {
    const frequency = new Array(256).fill(0);
    
    // Count byte frequencies
    for (let i = 0; i < data.length; i++) {
      frequency[data[i]]++;
    }
    
    // Calculate entropy
    let entropy = 0;
    for (let i = 0; i < 256; i++) {
      if (frequency[i] > 0) {
        const p = frequency[i] / data.length;
        entropy -= p * Math.log2(p);
      }
    }
    
    return entropy;
  }
}
```

## Complete Workflow for Web Application

### Step 1: Load Disk Image
```javascript
const image = await loadDiskImage(file);
```

### Step 2: Quick Partition Detection (Standard Method)
```javascript
const partitions = await detectStandardPartitions(image);
// This finds partitions in MBR/GPT
```

### Step 3: Analyze Known Partitions
```javascript
for (const partition of partitions) {
  await analyzePartition(partition);
}
```

### Step 4: Check Common Hiding Spots (Fast)
```javascript
const hiddenSpots = await scanCommonHidingSpots(image);
// Check sectors 32, 64, 128, 256, 2048
```

### Step 5: Full Sector Scan (Thorough but Slow)
```javascript
const findings = await scanAllSectors(image, (progress) => {
  updateProgressBar(progress.percentage);
});
```

### Step 6: Report All Findings
```javascript
generateReport({
  knownPartitions: partitions,
  hiddenPartitions: findings.hiddenPartitions,
  suspiciousSectors: findings.suspiciousSectors,
  encryptedRegions: findings.encryptedRegions
});
```

## Key Implementation Details

### 1. Don't Just Check Offset 0
The Python tool's limitation is that it only checks filesystem signatures at offsets defined by the partition table. Our web app must:
- Check EVERY sector from 0 to end of disk
- Look for filesystem signatures at ANY byte offset
- Not assume filesystems only start at "clean" boundaries

### 2. Parallel Processing
Use Web Workers to scan sectors in parallel:
```javascript
const workers = [];
const sectorsPerWorker = totalSectors / 4;

for (let i = 0; i < 4; i++) {
  workers[i] = new Worker('sector-scanner.js');
  workers[i].postMessage({
    startSector: i * sectorsPerWorker,
    endSector: (i + 1) * sectorsPerWorker,
    imageFile: image
  });
}
```

### 3. Smart Caching
Cache scan results so we don't re-scan on every load:
```javascript
await cacheResults(`/analysis/sector-scan-cache.json`, findings);
```

### 4. User Control
Give users options:
- **Quick Scan**: Only check common hiding spots (sectors 32, 64, 128)
- **Standard Scan**: Check partition table + common spots
- **Paranoid Scan**: Every single sector (slow but thorough)

## Storage Structure

```
/case-folder
  /analysis
    /hidden-sectors
      sector-scan-results.json      # Complete scan results
      sector-map.bin                # Binary map of entire disk
      hidden-partition-32.json      # Details of partition at sector 32
      /extracted-files-sector-32    # Files from hidden partition
        autorun.inf
        U3Launcher.exe
```

## UI Integration

### Evidence Tree (Left Panel)
```
📁 Evidence
  📁 Disk Images
    💿 usb-drive.img
      📊 Partition Table (MBR)
        💾 Partition 1: NTFS (60 GB)
        💾 Partition 2: FAT32 (2 GB)
      ⚠️ Hidden Sectors
        🔍 Sector 32: FAT16 (8 MB) ← FOUND BY SECTOR SCAN
        🔍 Sector 2048: Encrypted Data
        🔍 Unallocated: 45 MB with data
```

### Analysis Dashboard (Center Panel)
- Sector map visualization (color-coded)
- Click any sector to see details
- Export findings

### Right Panel
Shows details of selected hidden partition:
- Filesystem type
- Files found
- Security assessment
- Recommended actions

#### Common Hidden Sector Locations Reference:

**USB Flash Drives (SanDisk Pattern)**:
- **Sector 0**: Master Boot Record (MBR) / Partition Table
- **Sectors 1-31**: Reserved boot area (often empty, but can hide data)
- **Sector 32**: Common hidden partition start for SanDisk drives
  - Many SanDisk drives create a hidden partition at sector 32
  - This may contain U3 software, security software, or hidden data
  - Size: typically 6-8 MB
  - Often formatted as FAT16 or contains raw data
- **Sectors 32-2047**: Extended boot area / Hidden partition space
- **Last sectors**: Some drives reserve last 1-2 MB for firmware or wear-leveling

**Kingston DataTraveler Pattern**:
- Hidden partition typically at sector 64 or 128
- May contain IronKey workspace or security software

**Generic USB Drives**:
- Host Protected Area (HPA): Area at end of drive hidden from OS
- Device Configuration Overlay (DCO): Firmware-level hidden area

**USB Flash Drives (SanDisk Pattern)**:
- **Sector 0**: Master Boot Record (MBR) / Partition Table
- **Sectors 1-31**: Reserved boot area (often empty, but can hide data)
- **Sector 32**: Common hidden partition start for SanDisk drives
  - Many SanDisk drives create a hidden partition at sector 32
  - This may contain U3 software, security software, or hidden data
  - Size: typically 6-8 MB
  - Often formatted as FAT16 or contains raw data
- **Sectors 32-2047**: Extended boot area / Hidden partition space
- **Last sectors**: Some drives reserve last 1-2 MB for firmware or wear-leveling

**Kingston DataTraveler Pattern**:
- Hidden partition typically at sector 64 or 128
- May contain IronKey workspace or security software

**Generic USB Drives**:
- Host Protected Area (HPA): Area at end of drive hidden from OS
- Device Configuration Overlay (DCO): Firmware-level hidden area

#### Hidden Sector Detection & Analysis Features:

**1. Sector-by-Sector Scanning**:
- Scan entire disk image from sector 0 to last sector
- Read and analyze every single sector (512 bytes or 4096 bytes)
- Identify sectors that:
  - Contain non-zero data but not part of any partition
  - Have recognizable signatures (file headers, magic bytes)
  - Show encryption/compression patterns (high entropy)
  - Contain strings or metadata

**2. Partition Table Analysis**:
- Parse MBR partition table (sector 0)
- Identify GPT partition table (sector 1+)
- Detect gaps between partitions (unallocated space)
- Find partitions marked as "hidden" (type 0x11, 0x14, 0x16, 0x1B, 0x1C, 0x1E)
- Detect partitions with unusual starting sectors (e.g., sector 32, 64, 128)

**3. Signature-Based Detection**:
Scan for these signatures at ANY sector offset:
- **Filesystems**:
  - NTFS: "NTFS    " at offset 0x03
  - FAT32: "FAT32   " at offset 0x52
  - FAT16: "FAT16   " at offset 0x36
  - exFAT: "EXFAT   " at offset 0x03
  - EXT2/3/4: 0x53EF at offset 0x438
- **Archives/Compressed**:
  - ZIP: "PK\x03\x04" (50 4B 03 04)
  - RAR: "Rar!\x1A\x07"
  - 7Z: "7z\xBC\xAF\x27\x1C"
  - GZIP: 0x1F 0x8B
- **Executables**:
  - PE (Windows): "MZ" (4D 5A)
  - ELF (Linux): 0x7F "ELF"
- **Documents**:
  - PDF: "%PDF"
  - Office 2007+: "PK" (ZIP container)
- **Images**:
  - JPEG: 0xFF 0xD8 0xFF
  - PNG: 0x89 "PNG"
  - GIF: "GIF89a" or "GIF87a"
- **Encrypted Containers**:
  - TrueCrypt: "TRUE" at various offsets
  - VeraCrypt: High entropy sectors with no clear structure
  - LUKS: "LUKS\xBA\xBE"

**4. Entropy Analysis**:
- Calculate Shannon entropy for each sector
- High entropy (>7.5) indicates:
  - Encrypted data
  - Compressed data
  - Random/noise data
- Low entropy (<2.0) indicates:
  - Empty/zero sectors
  - Repeated patterns
- Medium entropy (4-6) indicates:
  - Normal file data
  - Text content

**5. Hidden Partition Recovery**:
When hidden partition detected at sector 32 (or other offset):
- Extract partition size from partition table or by scanning
- Create virtual partition entry
- Mount partition for filesystem analysis
- Extract all files from hidden partition
- Compare files with main partition (detect duplicates)
- Flag suspicious files (executables, scripts, encrypted files)

**6. HPA/DCO Detection**:
- Query disk image for reported size vs actual size
- If mismatch detected, scan for HPA
- Attempt to access HPA area
- Analyze HPA content

**7. Visualization**:
Create visual sector map showing:
- Color-coded sectors by content type:
  - Gray: Empty/zero sectors
  - Blue: Normal filesystem data
  - Green: Known file types (documents, images)
  - Yellow: Executables
  - Red: Encrypted/high entropy data
  - Purple: Hidden partitions
  - Orange: Unallocated but non-zero
- Interactive map allowing click-to-inspect
- Export as image for reports

**8. SanDisk Sector 32 Analysis Workflow**:
```
1. Load disk image
2. Parse MBR at sector 0
3. Check if any partition starts at sector 32
4. If no partition at sector 32:
   a. Read sector 32-2047 (1MB sample)
   b. Check for filesystem signatures
   c. If signature found, attempt filesystem mount
   d. Extract files
5. If partition exists at sector 32:
   a. Check if marked as hidden (partition type)
   b. Check if partition is reported by OS
   c. Mount and analyze partition
   d. Flag as "Potential Hidden Partition"
6. Log all findings to case logs
7. Add to "Hidden Sectors" section in evidence tree
```

**9. Reporting**:
- List all detected hidden sectors/partitions
- Show sector ranges and sizes
- Display signatures found
- Include entropy graphs
- List extracted files from hidden areas
- Flag suspicious patterns
- Provide recommendations (e.g., "Hidden partition contains autorun.inf and suspicious .exe")

**10. Analysis Database**:
Store in `/analysis/hidden-sectors/`:
- `sector-map.json` - Complete sector-by-sector analysis
- `hidden-partitions.json` - List of detected hidden partitions
- `extracted-files/` - Files recovered from hidden areas
- `entropy-graph.png` - Visualization of entropy across disk
- `sector-signatures.csv` - All detected signatures with offsets

#### Example Hidden Sector Findings:

```json
{
  "hidden_partitions": [
    {
      "start_sector": 32,
      "end_sector": 16415,
      "size_bytes": 8388608,
      "filesystem": "FAT16",
      "partition_type": "0x06 (FAT16)",
      "marked_hidden": false,
      "contains": {
        "files": 15,
        "executables": 2,
        "suspicious_files": [
          "U3System/U3Launcher.exe",
          "autorun.inf"
        ]
      },
      "analysis": "Appears to be SanDisk U3 smart drive partition. Contains autorun launcher."
    }
  ],
  "suspicious_sectors": [
    {
      "sector_range": "2048-2050",
      "entropy": 7.92,
      "signature": "None detected",
      "analysis": "High entropy, possibly encrypted data"
    }
  ]
}
```

**Integration with Main Application**:
- Hidden sector analysis runs automatically during disk image load
- Results appear in left panel under "Evidence → Hidden Sectors"
- Click to view details in center panel
- Right panel shows analysis results and extracted files
- All findings logged and included in forensic report

#### Summary: Comprehensive vs Standard Scanning

**What the Python Tool Does** (Standard Method):
✅ Reads partition table (MBR/GPT)
✅ Detects partitions listed in table
✅ Analyzes filesystems at partition offsets
❌ Misses sector 32 if not in partition table
❌ Misses unallocated space with data
❌ Misses HPA/DCO areas
❌ Only checks offsets from partition table

**What Our Web App Must Do** (Comprehensive Method):
✅ Read partition table (MBR/GPT)
✅ Detect all partitions in table
✅ **ADDITIONALLY**: Scan every sector 0 to end
✅ Check common hiding spots (32, 64, 128, 256, 2048)
✅ Detect filesystem signatures at ANY offset
✅ Calculate entropy for encryption detection
✅ Find files in unallocated space
✅ Detect HPA/DCO if present
✅ Three scan modes: Quick/Standard/Paranoid

**Implementation Priority**:
1. Implement standard partition detection (like Python tool)
2. Add common hiding spot checks (sectors 32, 64, 128) - **HIGH PRIORITY**
3. Implement full sector scan with progress bar
4. Add entropy analysis
5. Add visualization (sector map)
6. Optimize with Web Workers for parallel scanning

**User Experience**:
```
[Scan Options]
○ Quick Scan (5 minutes)
  - Check partition table
  - Check sectors 32, 64, 128

○ Standard Scan (15 minutes) ← Recommended
  - Everything in Quick Scan
  - Scan unallocated space
  - Basic entropy analysis

○ Paranoid Scan (1-3 hours)
  - Scan EVERY sector
  - Deep entropy analysis
  - HPA/DCO detection
```

### 4. Static File Analysis Engine (COMPREHENSIVE)

**CRITICAL**: Every extracted file undergoes comprehensive static analysis. All analysis results are stored within the case structure under `/analysis/`.

#### File Type Identification
- **Magic byte analysis**: Identify true file type regardless of extension
- **Extension verification**: Flag mismatches between magic bytes and extension
- **MIME type detection**: Determine proper MIME type
- **File signatures database**: Support for 500+ file types
- **Results stored in**: `/analysis/file-types.json`

#### File Spoofing Detection (CRITICAL SECURITY FEATURE)
Based on the reference Python tool's spoofing detection engine:

**What is File Spoofing?**
File spoofing occurs when a file's extension doesn't match its actual content. This is a common technique used by attackers to:
- Hide malware as innocent-looking files (e.g., virus.jpg is actually an .exe)
- Bypass security filters and firewalls
- Trick users into opening malicious files

**Detection Method**:
1. Read first 16-512 bytes of file (magic bytes/file signature)
2. Identify true file type from signature database
3. Compare against file extension
4. Flag mismatches with severity levels

**Common Spoofing Patterns to Detect**:
```javascript
{
  // Executables disguised as documents
  "PE_as_PDF": {
    "signature": "4D 5A", // MZ header
    "extension": ".pdf",
    "risk": "CRITICAL",
    "description": "Windows executable disguised as PDF"
  },
  
  // Archives disguised as images  
  "ZIP_as_JPG": {
    "signature": "50 4B 03 04", // PK (ZIP header)
    "extension": ".jpg",
    "risk": "HIGH",
    "description": "ZIP archive disguised as JPEG image"
  },
  
  // Scripts disguised as text
  "HTML_as_TXT": {
    "signature": "<html" or "<!DOCTYPE",
    "extension": ".txt",
    "risk": "MEDIUM",
    "description": "HTML file disguised as plain text"
  }
}
```

**Signature Database** (partial list):
- **Windows Executables**: 
  - PE: 4D 5A (MZ)
  - DLL: 4D 5A (MZ) + specific PE header
- **Linux Executables**:
  - ELF: 7F 45 4C 46
- **Archives**:
  - ZIP: 50 4B 03 04 or 50 4B 05 06
  - RAR: 52 61 72 21 1A 07
  - 7Z: 37 7A BC AF 27 1C
  - GZIP: 1F 8B
  - BZIP2: 42 5A 68
- **Documents**:
  - PDF: 25 50 44 46 (%PDF)
  - RTF: 7B 5C 72 74 66
  - Office 2007+: 50 4B 03 04 (ZIP container)
- **Images**:
  - JPEG: FF D8 FF
  - PNG: 89 50 4E 47 0D 0A 1A 0A
  - GIF: 47 49 46 38 (GIF8)
  - BMP: 42 4D
  - TIFF: 49 49 2A 00 or 4D 4D 00 2A
- **Media**:
  - MP3: FF FB or FF F3 or ID3
  - MP4: 00 00 00 [18-20] 66 74 79 70
  - AVI: 52 49 46 46 ... 41 56 49 20
  - WAV: 52 49 46 46 ... 57 41 56 45
- **Scripts**:
  - Shell script: 23 21 2F (#!)
  - Python: Often starts with #! or import
  - JavaScript: Often starts with function or var

**Spoofing Indicators Output**:
```javascript
{
  "file_path": "/partition1/Downloads/invoice.pdf",
  "extension": ".pdf",
  "claimed_type": "PDF Document",
  "actual_signature": "4D 5A 90 00",
  "actual_type": "PE32 Executable (Windows)",
  "is_spoofed": true,
  "risk_level": "CRITICAL",
  "indicators": [
    "Extension .pdf does not match PE executable signature",
    "File may be malware disguised as document",
    "Common social engineering attack pattern"
  ],
  "recommendation": "QUARANTINE - Do not open, likely malicious"
}
```

**UI Display**:
- Spoofed files highlighted in RED in file list
- Warning icon (⚠️) next to filename
- Right panel shows detailed spoofing analysis
- Filter option: "Show only spoofed files"
- Statistics counter: "X spoofed files detected"

#### File Tampering Detection
Detect files that have been modified or have suspicious attributes:

**Timestamp Anomalies**:
- Created date AFTER modified date (impossible)
- Accessed date before created date (filesystem error or tampering)
- All timestamps identical (possible timestamp stomping)
- Timestamps in the future
- Timestamps in distant past (e.g., year 1980)

**Attribute Anomalies**:
- System files in user directories
- Executable files with document extensions
- Hidden files in unusual locations
- Files with unusual permissions (e.g., world-writable system files)

**Content Anomalies**:
- File size is 0 but extension suggests content
- File size doesn't match typical size for type
- Corrupted headers or truncated files

**Tampering Indicators**:
```javascript
{
  "file_path": "/system32/cmd.exe",
  "is_tampered": true,
  "tampering_indicators": [
    "Modified date (2024-02-10) is AFTER created date (2024-02-11) - Impossible",
    "File hash doesn't match known good hash for Windows cmd.exe",
    "File size (45KB) differs from expected size (51KB)"
  ],
  "severity": "HIGH",
  "recommendation": "File may have been replaced with malicious version"
}
```

**Alternate Data Streams (ADS) Detection** (NTFS-specific):
- Scan for files with Alternate Data Streams
- Extract ADS content
- Check if ADS contains executable code
- Common ADS hiding techniques:
  ```
  Normal file: document.txt (visible)
  Hidden ADS:  document.txt:malware.exe (hidden executable)
  Hidden ADS:  document.txt:secret.txt (hidden data)
  ```
- Display ADS in file details:
  ```javascript
  {
    "file": "document.txt",
    "has_ads": true,
    "ads_streams": [
      {
        "name": "Zone.Identifier", 
        "size": 26,
        "content": "Downloaded from internet"
      },
      {
        "name": "hidden.exe",
        "size": 45056,
        "type": "PE Executable",
        "risk": "CRITICAL"
      }
    ]
  }
  ```

**Integration**:
- Spoofing/tampering checks run during file extraction
- Results cached in `/analysis/spoofing-tampering/`
- Filters in UI to show only spoofed/tampered files
- Included in forensic report with high priority
- Statistics dashboard shows counts

#### Executable Analysis (PE/ELF/Mach-O)
- **PE (Windows executables)**:
  - Parse PE headers (DOS header, NT headers, section headers)
  - Extract import/export tables (DLL dependencies, exported functions)
  - Identify compiler/packer (detect UPX, ASPack, etc.)
  - Extract resources (icons, strings, version info)
  - Digital signature verification
  - Entropy analysis (detect packed/encrypted sections)
  - Suspicious API calls (CreateRemoteThread, WriteProcessMemory)
  - PEiD signature matching
- **ELF (Linux executables)**:
  - Parse ELF headers
  - Extract program headers and section headers
  - Identify shared library dependencies
  - Symbol table extraction
  - Detect stripped binaries
- **Mach-O (macOS executables)**:
  - Parse Mach-O headers
  - Extract load commands
  - Identify code signatures
  - Framework dependencies
- **Results stored in**: `/analysis/executables/`

#### Document Analysis
- **Office documents** (DOCX, XLSX, PPTX):
  - Metadata extraction (author, created date, modified date, company)
  - Track changes detection
  - Comments and annotations extraction
  - Hidden content detection
  - Embedded object extraction
  - Macro detection and analysis
  - OLE stream analysis for older formats (DOC, XLS, PPT)
- **PDF files**:
  - Metadata extraction (author, producer, creation date)
  - JavaScript detection
  - Embedded file extraction
  - Form field analysis
  - Encryption/password protection detection
  - Suspicious object detection (Launch actions, OpenAction)
  - Stream analysis
- **Results stored in**: `/analysis/documents/`

#### Image Analysis
- **EXIF metadata extraction**:
  - Camera make/model
  - GPS coordinates
  - Timestamp (DateTimeOriginal)
  - Software used
  - Copyright information
- **Image properties**:
  - Dimensions, color space, bit depth
  - Compression type
- **Thumbnail extraction**: Extract embedded thumbnails
- **Steganography detection**: Basic LSB analysis
- **Results stored in**: `/analysis/images/`

#### Archive Analysis
- **Supported formats**: ZIP, RAR, 7Z, TAR, GZ, BZ2
- **Recursive extraction**: Extract nested archives
- **Password-protected detection**: Flag encrypted archives
- **Archive listing**: Complete file manifest
- **Compression ratio analysis**: Detect suspicious compression
- **Extracted contents**: `/evidence/extracted-files/archives/`

#### Email Analysis
- **Supported formats**: PST, OST, MBOX, EML, MSG
- **Email parsing**:
  - Headers (From, To, CC, BCC, Subject, Date)
  - Body content (plain text and HTML)
  - Attachment extraction
  - Email threading
- **Metadata extraction**:
  - Sender IP addresses
  - Mail server paths
  - Message IDs
- **Results stored in**: `/analysis/email/`

#### Browser Artifact Analysis
- **History databases** (Chrome, Firefox, Edge, Safari):
  - URLs visited with timestamps
  - Visit frequency
  - Last visit time
  - Page titles
- **Cache analysis**: Extract cached web content
- **Cookie analysis**: Parse cookie databases
- **Download history**: List of downloaded files
- **Bookmarks extraction**
- **Form autofill data**
- **Results stored in**: `/artifacts/browser/`

#### Registry Analysis (Windows)
- **Supported hives**: NTUSER.DAT, SAM, SYSTEM, SOFTWARE, SECURITY
- **Key extraction**:
  - Recently used files (MRU lists)
  - USB device history
  - Network connections
  - Installed programs
  - User account information
  - Startup programs
  - ShellBags (folder access history)
  - TypedURLs (typed web addresses)
- **Timeline generation**: Registry modification timeline
- **Results stored in**: `/artifacts/registry/`

#### Network Artifact Analysis
- **PCAP file parsing**: Extract network traffic details
- **Connection logs**: IP addresses, ports, protocols
- **DNS queries**: Domain name resolutions
- **HTTP requests**: URLs, headers, cookies
- **Results stored in**: `/analysis/network/`

#### Cryptographic Analysis
- **Encryption detection**: Identify encrypted files/containers
- **Certificate analysis**: Parse X.509 certificates
- **Key detection**: Search for cryptographic keys
- **Results stored in**: `/analysis/crypto/`

#### Malware Indicators
- **YARA rule scanning**: Run YARA rules against all files
- **IOC matching**: Match against known indicators of compromise
- **Suspicious patterns**:
  - Obfuscated code
  - Anti-debugging techniques
  - Unusual entropy
  - Known malicious file hashes
- **Sandbox analysis integration**: (Future) Submit to sandbox
- **Results stored in**: `/analysis/malware-indicators/`

#### Audio/Video Analysis
- **Metadata extraction**:
  - Duration, codec, bitrate
  - Creation timestamp
  - GPS coordinates (if available)
  - Camera/device information
- **Thumbnail generation**: Extract video thumbnails
- **Results stored in**: `/analysis/media/`

#### SQLite Database Analysis
- **Database detection**: Identify SQLite files
- **Schema extraction**: Table and column definitions
- **Data extraction**: Query and export table contents
- **Common databases**:
  - Browser databases (history, cookies)
  - Mobile app databases (WhatsApp, iMessage)
  - System databases
- **Results stored in**: `/analysis/databases/`

#### String Analysis (Enhanced)
- **ASCII string extraction**: Printable ASCII characters
- **Unicode extraction**: UTF-8, UTF-16 LE/BE
- **Base64 encoded strings**: Decode and extract
- **Hex encoded strings**: Detect and decode
- **URL extraction**: Extract all URLs
- **Email extraction**: Extract email addresses
- **IP address extraction**: IPv4 and IPv6
- **Credit card number detection**: Pattern matching (with masking)
- **Phone number extraction**: International formats
- **Keyword matching**: User-defined keyword lists
- **Results stored in**: `/analysis/strings/`

#### File Similarity Analysis
- **Fuzzy hashing**: Generate ssdeep hashes
- **Similar file detection**: Find near-duplicate files
- **File clustering**: Group related files
- **Results stored in**: `/analysis/similarity/`

#### All Analysis Results Integration
- **Unified analysis database**: SQLite database indexing all findings
- **Cross-reference capability**: Link related artifacts
- **Searchable index**: Full-text search across all analysis results
- **Export capabilities**: Export analysis results in JSON, CSV, or text
- **Visualization**: Generate graphs and charts from analysis data

### 5. Hex Viewer Component
- **Synchronized view**: Linked to selected files and sector offsets
- **Features**:
  - Hexadecimal and ASCII side-by-side display
  - Offset column (show sector/byte offset)
  - Clickable bytes for inspection
  - Jump to offset functionality
  - Sector navigation controls
  - Color coding for different data types
  - Search within hex view
- **Performance**: Virtual scrolling for large files

### 6. String Extraction & Search
- **String extraction**:
  - ASCII string extraction (printable characters)
  - Unicode (UTF-16) string extraction
  - Minimum string length filter (default: 4 characters)
  - Export strings to text file
  - **Strings saved to**: `/analysis/strings/`
- **Keyword search**:
  - Case-sensitive/insensitive toggle
  - Search across entire disk image
  - Regular expression support
  - Results with context (surrounding bytes)
  - Export search results
  - Highlight matches in hex viewer
  - **Search results saved to**: `/analysis/search-results-[timestamp].json`

### 7. Timeline Analysis
- **Metadata timeline generation**:
  - Parse all file timestamps (MAC times: Modified, Accessed, Changed)
  - Create chronological timeline view
  - Filter by date range
  - Filter by event type (created, modified, deleted)
  - Visual timeline graph
  - Export timeline to CSV/text
  - **Timeline saved to**: `/analysis/timeline/`
- **Super timeline**: Combine multiple artifact timelines
- **Timeline correlation**: Link related events

### 8. Hash Verification
- **Supported algorithms**: MD5, SHA256
- **Use cases**:
  - Forensic image integrity verification
  - Chain of custody documentation
  - File deduplication
- **Features**:
  - Calculate hash for entire disk image
  - Calculate hash for individual files
  - Compare against known hash values
  - Bulk hash calculation
  - Export hash list
  - **Hash database stored in**: `/analysis/hashes/`
- **Known file detection**: Match against NSRL, VirusTotal, custom hash sets

### 9. Reporting & Export
- **Forensic report generation**:
  - Text format export (.txt)
  - Include case metadata
  - List of evidence items analyzed
  - Findings summary
  - Timeline of events
  - Hash values for verification
  - Investigator notes
  - Analysis results from all modules
  - **Reports saved to**: `/reports/`
- **Export options**:
  - Export extracted files
  - Export search results
  - Export timeline data
  - Export hash lists
  - Export analysis results (JSON, CSV, XML)
  - **All exports saved to**: `/reports/exports/`

### 11. CIA Triad Security Assessment

Based on the reference Python forensic tool's CIA assessment engine (lines 1792-1917), implement a comprehensive security evaluation framework:

**CIA Triad Overview**:
- **Confidentiality**: Protection of sensitive information from unauthorized access
- **Integrity**: Assurance that data has not been tampered with or altered
- **Availability**: Ensuring data and systems are accessible when needed

**Assessment Methodology**:

#### Confidentiality Score (0-100)
**Deductions**:
- Unencrypted sensitive files: -10 points per file
  - Passwords in plain text files
  - SSH private keys without password protection
  - Credit card numbers in documents
  - Social security numbers
  - Medical records (PHI)
  - Financial data (bank statements, tax returns)
- Files with weak permissions: -5 points per file
  - World-readable sensitive files
  - Group-readable private files
- Exposed credentials: -15 points per instance
  - Browsers with saved passwords (unencrypted)
  - Configuration files with credentials
  - Database connection strings with passwords

**Findings**:
```javascript
{
  "confidentiality_score": 75,
  "findings": [
    "Found 3 unencrypted password files in /Documents/",
    "Browser stored 15 passwords without master password",
    "SSH private key found without password protection",
    "Credit card numbers detected in spreadsheet.xlsx"
  ]
}
```

#### Integrity Score (0-100)
**Deductions**:
- Tampered files: -15 points per file
  - Modified system files
  - Files with timestamp anomalies
  - Files failing hash verification
- Spoofed files: -10 points per file
  - Executables disguised as documents
  - Suspicious file extensions
- Missing critical files: -20 points
  - Deleted security logs
  - Missing system files
  - Corrupted registry hives
- Files from untrusted sources: -5 points
  - Downloads from suspicious domains
  - Files with Zone.Identifier showing untrusted origins

**Findings**:
```javascript
{
  "integrity_score": 60,
  "findings": [
    "5 files detected with extension/signature mismatch (potential malware)",
    "System file 'cmd.exe' has been modified (hash mismatch)",
    "Security event logs deleted (3 files missing)",
    "2 files have impossible timestamp combinations"
  ]
}
```

#### Availability Score (0-100)
**Deductions**:
- Deleted files: -5 points per critical file
  - Important documents deleted
  - System files deleted
  - Application data deleted
- Corrupted files: -10 points per file
  - Files with invalid headers
  - Truncated files
  - Unreadable files
- Encrypted with unknown key: -15 points per file
  - Ransomware-encrypted files
  - Password-protected archives (password unknown)

**Findings**:
```javascript
{
  "availability_score": 85,
  "findings": [
    "45 files recently deleted from /Documents/",
    "2 corrupted Excel files detected",
    "Database backup files deleted from /Backup/"
  ]
}
```

#### Overall Risk Assessment
Calculate weighted score:
```javascript
overall_score = (confidentiality * 0.35) + (integrity * 0.35) + (availability * 0.30)
```

**Risk Levels**:
- 90-100: **LOW RISK** - System appears secure
- 70-89: **MEDIUM RISK** - Some security concerns detected
- 50-69: **HIGH RISK** - Significant security issues found
- 0-49: **CRITICAL RISK** - Severe security compromise

**CIA Assessment Output**:
```javascript
{
  "cia_assessment": {
    "confidentiality_score": 75,
    "integrity_score": 60,
    "availability_score": 85,
    "overall_score": 72.5,
    "risk_level": "MEDIUM RISK",
    
    "summary": "System shows signs of compromise. Multiple spoofed files detected suggesting possible malware infection. Security logs have been deleted indicating potential cover-up activity.",
    
    "critical_findings": [
      "5 executable files disguised as documents",
      "Security event logs deleted",
      "System file tampering detected"
    ],
    
    "recommendations": [
      "Immediately quarantine all spoofed executable files",
      "Investigate log deletion - possible evidence tampering",
      "Run full antivirus scan on system",
      "Review recent user activity for unauthorized access",
      "Restore system files from known good backup",
      "Enable auditing to track future changes"
    ],
    
    "timeline": "Assessment performed: 2024-02-11 14:30:00 UTC"
  }
}
```

**UI Integration**:
- CIA dashboard widget showing three gauges (Confidentiality, Integrity, Availability)
- Color-coded overall risk badge (Green/Yellow/Orange/Red)
- Detailed findings list with severity indicators
- Export CIA report as separate document
- Include in main forensic report

**Storage**: `/analysis/cia-assessment.json`

### 12. MITRE ATT&CK Framework Integration

Map detected artifacts and activities to MITRE ATT&CK tactics and techniques:

**Common ATT&CK Mappings**:

```javascript
{
  "mitre_attack_findings": [
    {
      "tactic": "TA0001 - Initial Access",
      "technique": "T1566.001 - Phishing: Spearphishing Attachment",
      "evidence": [
        "Email attachment 'invoice.pdf.exe' (spoofed executable)",
        "File downloaded from suspicious domain"
      ],
      "confidence": "HIGH"
    },
    {
      "tactic": "TA0005 - Defense Evasion",
      "technique": "T1070.001 - Indicator Removal: Clear Windows Event Logs",
      "evidence": [
        "Security.evtx deleted at 2024-02-10 03:15:00",
        "System.evtx deleted at 2024-02-10 03:15:05"
      ],
      "confidence": "HIGH"
    },
    {
      "tactic": "TA0005 - Defense Evasion", 
      "technique": "T1564.001 - Hide Artifacts: Hidden Files and Directories",
      "evidence": [
        "15 files with hidden attribute in system directories",
        "NTFS Alternate Data Streams detected on 8 files"
      ],
      "confidence": "MEDIUM"
    },
    {
      "tactic": "TA0009 - Collection",
      "technique": "T1005 - Data from Local System",
      "evidence": [
        "Suspicious file access patterns to /Documents/",
        "Large ZIP archive created containing financial docs"
      ],
      "confidence": "MEDIUM"
    },
    {
      "tactic": "TA0010 - Exfiltration",
      "technique": "T1041 - Exfiltration Over C2 Channel", 
      "evidence": [
        "Network connections to unknown IP during file access",
        "Encrypted outbound traffic detected"
      ],
      "confidence": "LOW"
    }
  ],
  
  "attack_chain_summary": "Evidence suggests initial compromise via spearphishing attachment, followed by defense evasion through log deletion and use of hidden files. Data collection from local system likely occurred before potential exfiltration.",
  
  "recommended_actions": [
    "Investigate email logs for spearphishing campaigns",
    "Check network logs for data exfiltration",
    "Review all hidden files and ADS for malicious content",
    "Examine recent file access logs",
    "Implement email attachment filtering",
    "Enable comprehensive audit logging"
  ]
}
```

**UI Integration**:
- MITRE ATT&CK matrix visualization showing detected tactics
- Click tactics to see techniques and evidence
- Export ATT&CK mapping as JSON or CSV
- Include in forensic report with evidence links

**Storage**: `/analysis/mitre-attack-mapping.json`
### 13. Analysis Logs (CASE-SPECIFIC)
- **CRITICAL**: Every case maintains its own isolated log files
- **Real-time logging**:
  - All operations logged with timestamps
  - Syntax highlighting for different log levels (INFO, WARNING, ERROR)
  - Auto-scroll to latest entry
  - Filter logs by severity
  - Export logs for documentation
  - **Logs saved to**: `/logs/analysis-log-[date].txt`
- **Log categories**:
  - Image loading
  - Partition detection
  - Filesystem analysis
  - File extraction
  - Static analysis operations
  - Search operations
  - Errors and warnings
  - User actions (audit trail)
- **Log persistence**: All logs preserved within case folder for chain of custody

## Technical Architecture

### Frontend Stack
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS for cyber-themed dark UI
- **State Management**: React Context or Zustand
- **File Processing**: Web Workers for heavy computations
- **UI Components**: 
  - Shadcn/ui for base components
  - Custom cyber-themed overlays
  - Monaco Editor for hex viewing
  - Recharts for timeline visualization

### Backend/Processing
- **Disk image parsing**: 
  - Use JavaScript libraries for forensic analysis
  - pytsk3 (Python Sleuth Kit) equivalent in JavaScript: sleuthkit.js or node-sleuthkit
  - Support for E01 (Expert Witness Format) via libewf bindings
  - Support for RAW images (.img, .dd, .raw)
- **File system libraries**:
  - NTFS: ntfs-parser or custom implementation
  - FAT: fat-parser
  - EXT: ext2fs (Node.js bindings) or js-ext
  - exFAT: exfat-parser
- **Partition table parsing**:
  - MBR parser for DOS/Windows partition tables
  - GPT parser for GUID Partition Tables
  - Custom sector reader for hidden partition detection
- **Hashing**: 
  - crypto-js or Web Crypto API for MD5, SHA1, SHA256
  - Stream-based hashing for large files
- **String extraction**: 
  - Custom regex patterns + TextDecoder API
  - Binary scanning for ASCII and Unicode strings
  - Configurable minimum string length (default: 4 characters)

### Key Implementation Details from Reference Tool:

**1. Disk Image Handling**:
```javascript
// Equivalent to Python's EWFImgInfo class
class DiskImageReader {
  // Support both E01 and RAW formats
  // Implement read(offset, size) method
  // Implement get_size() for total image size
  // Handle multi-segment E01 files (E01, E02, E03...)
}
```

**2. Partition Detection** (from Python tool lines 1134-1235):
- Parse MBR at sector 0 (offset 0x1BE for partition table)
- Identify partition type codes (0x07=NTFS, 0x0B/0x0C=FAT32, 0x83=Linux, etc.)
- Calculate partition offsets and sizes
- Detect extended partitions (type 0x05, 0x0F)
- Flag hidden partitions (types 0x11, 0x14, 0x16, etc.)

**3. Filesystem Mounting**:
- Create pytsk3.Img_Info equivalent wrapper
- Open filesystem with partition offset
- Recursively walk directory tree
- Handle root directory specially
- Support for different filesystem types

**4. File Metadata Extraction** (from FileEntry dataclass, lines 145-197):
Essential metadata to extract:
- MAC times (Modified, Accessed, Created, Changed)
- File size and inode number
- File type (regular, directory, symlink)
- Allocation status (allocated vs deleted)
- NTFS-specific: Alternate Data Streams (ADS)
- Unix-specific: UID, GID, permissions
- File attributes: hidden, system, readonly, archive
- Magic bytes (first 16 bytes for signature detection)

**5. Deleted File Detection** (lines 1428-1516):
- Check if file is allocated in filesystem
- For deleted files, check if inode still has data pointers
- Assess recoverability based on:
  - Whether file data blocks are reallocated
  - Size of file (large files harder to recover fully)
  - Fragmentation level
- Mark with recoverable flag

**6. File Spoofing Detection** (lines 1518-1600):
- Read first 16 bytes of file (magic bytes)
- Compare against known file signatures
- Check if extension matches magic bytes
- Flag mismatches (e.g., .jpg file with PDF signature)
- Common spoofing patterns:
  - Executable disguised as document
  - Archive disguised as image
  - Script disguised as text file

**7. CIA Triad Assessment** (lines 1792-1917):
Scoring system based on:
- **Confidentiality**: Unencrypted sensitive files, exposed passwords
- **Integrity**: Tampered files, missing critical system files
- **Availability**: Deleted files, corrupted data

**8. Statistics Tracking**:
- Total files and directories
- Deleted files count
- Spoofed files count
- Tampered files count
- Files with ADS (NTFS)
- Total data size
- Category breakdown (documents, images, executables, etc.)

### Static Analysis Libraries (Comprehensive)
- **File type detection**:
  - file-type (NPM) - Magic byte detection
  - mmmagic - libmagic bindings for Node.js
- **Executable analysis**:
  - pe-library - PE file parser for Windows executables
  - elf-parser - ELF file parser for Linux binaries
  - macho-parser - Mach-O parser for macOS binaries
- **Document parsing**:
  - mammoth.js - DOCX to HTML conversion
  - xlsx - Excel file parsing
  - pdf-parse - PDF text extraction
  - pdf.js - PDF rendering and parsing
  - officegen - Office document generation (for reports)
- **Image analysis**:
  - exif-parser - EXIF metadata extraction
  - sharp - Image processing and thumbnail generation
  - jpeg-js, png-js - Image format parsers
- **Archive handling**:
  - jszip - ZIP file handling
  - node-7z - 7-Zip archive support
  - tar-stream - TAR archive parsing
- **Email parsing**:
  - pst-extractor - PST/OST file parsing
  - mailparser - EML/MSG parsing
  - mbox-parser - MBOX format support
- **Registry analysis**:
  - regedit - Windows registry parser
  - hivex (Node.js bindings) - Registry hive parsing
- **Database analysis**:
  - sql.js - SQLite database in browser/Node
  - better-sqlite3 - Fast SQLite operations
- **String analysis**:
  - string-scanner - Advanced string extraction
  - iconv-lite - Character encoding conversion
  - base64-js - Base64 encoding/decoding
- **Cryptography**:
  - crypto-js - Hash algorithms, encryption detection
  - node-forge - Certificate parsing, crypto operations
- **Malware analysis**:
  - yara-nodejs - YARA rule engine bindings
  - ssdeep.js - Fuzzy hashing for file similarity
- **Network analysis**:
  - pcap-parser - PCAP file parsing
  - http-parser-js - HTTP request/response parsing
- **Compression analysis**:
  - pako - Deflate/inflate (ZLIB)
  - lz4, brotli - Additional compression algorithms

### Storage (Case-Centric)
- **File system based**: Each case is a folder on disk/cloud
- **Case isolation**: All case data in self-contained folders
- **IndexedDB**: For browser-based case metadata and quick search index
- **SQLite**: Case-specific database (`case-index.db`) for:
  - File metadata indexing
  - Analysis results querying
  - Full-text search
  - Timeline data
  - Cross-references
- **LocalStorage**: UI state and preferences per case
- **Large files**: 
  - Handle via streaming/chunking
  - Store in `/evidence/` subfolder
  - Never load entire disk image into memory
- **Analysis results**: JSON files in `/analysis/` subfolders
- **Logs**: Text files in `/logs/` subfolder
- **Backup/sync**: Case folders can be:
  - Copied to external storage
  - Synced to cloud storage (Dropbox, Google Drive)
  - Archived for long-term storage
  - Shared with team members

## UI/UX Design Specifications

### Color Scheme (Cyber Theme)
```css
--bg-primary: #0a0e17
--bg-secondary: #151922
--bg-tertiary: #1a1f2e
--accent-cyan: #00ffff
--accent-green: #00ff41
--accent-red: #ff0051
--accent-yellow: #ffea00
--text-primary: #e0e0e0
--text-secondary: #a0a0a0
--border: #2a3441
```

### Typography
- **Headers**: Orbitron or Rajdhani (cyber/tech fonts)
- **Body**: Inter or Roboto Mono
- **Code/Hex**: JetBrains Mono or Fira Code

### Component Styling
- **Cards**: Dark background with subtle border glow
- **Buttons**: Neon glow on hover, cyber-style borders
- **Tables**: Zebra striping with hover highlight
- **Progress bars**: Animated gradient fills
- **Alerts**: Color-coded with icon (success, warning, error)

### Layout Structure (3-PANEL DESIGN)

**CRITICAL**: The application uses a **3-PANEL LAYOUT** for optimal forensic workflow:

```
┌──────────────────────────────────────────────────────────────────┐
│                    Top Navigation Bar                            │
│  [ForensicX Logo] | Case: [Active Case Name] | [Settings] [User]│
├───────────┬──────────────────────────┬───────────────────────────┤
│           │                          │                           │
│  LEFT     │      CENTER PANEL        │      RIGHT PANEL          │
│  PANEL    │      (Main Content)      │      (Details/Context)    │
│           │                          │                           │
│  Tree/    │  ┌────────────────────┐  │  ┌─────────────────────┐ │
│  Nav      │  │                    │  │  │                     │ │
│           │  │  Primary Work Area │  │  │   File Details      │ │
│  Evidence │  │                    │  │  │   - Metadata        │ │
│  ├─Images │  │  • File List       │  │  │   - Properties      │ │
│  ├─Files  │  │  • Hex Viewer      │  │  │   - Analysis Results│ │
│  ├─Carved │  │  • Timeline        │  │  │   - Preview         │ │
│  └─Logs   │  │  • Search Results  │  │  │                     │ │
│           │  │                    │  │  │   Quick Actions     │ │
│  Analysis │  └────────────────────┘  │  │   [Analyze]         │ │
│  ├─Strings│                          │  │   [Bookmark]        │ │
│  ├─Hashes │                          │  │   [Export]          │ │
│  ├─Timeline                          │  │                     │ │
│  └─Reports│                          │  └─────────────────────┘ │
│           │                          │                           │
└───────────┴──────────────────────────┴───────────────────────────┘
│                    Bottom Status Bar                             │
│  [Case Status] | [Current Operation] | [Progress] | [Logs ▼]    │
└──────────────────────────────────────────────────────────────────┘
```

#### Panel Specifications:

**LEFT PANEL (Navigation Tree)** - 20% width, **FULLY RESIZABLE**
- **Minimum width**: 200px
- **Maximum width**: 40% of viewport
- **Resize handle**: Visible drag handle on right edge
- **Case selector** at top (dropdown to switch between open cases)
- **Evidence tree**:
  - Disk images (with partition children)
  - Extracted files (hierarchical file tree)
  - Carved files (deleted/recovered)
  - Logs (clickable to view in center panel)
- **Analysis tree**:
  - Strings
  - Hashes
  - Timeline
  - Search results
  - Reports
- **Bookmarks** section (starred items)
- **Collapsible sections** for organization
- **Search bar** to filter tree items
- **Right-click context menus** for actions

**CENTER PANEL (Main Work Area)** - 50% width, **FULLY RESIZABLE**
- **Minimum width**: 400px
- **Maximum width**: 80% of viewport
- **Resize handles**: On both left and right edges
- **Dynamic content area** that changes based on left panel selection:
  - **File list view**: When folder selected, shows table of files
  - **Hex viewer**: When file selected for inspection
  - **Timeline view**: When timeline selected from analysis
  - **Search interface**: When performing searches
  - **Log viewer**: When logs selected
  - **Report viewer**: When viewing generated reports
- **Tabbed interface**: Multiple items can be open in tabs
- **Split view option**: Divide center panel horizontally (e.g., file list top, hex viewer bottom)
- **Full-screen toggle** for focused analysis

**RIGHT PANEL (Details & Context)** - 30% width, **FULLY RESIZABLE AND COLLAPSIBLE**
- **Minimum width**: 250px (when expanded)
- **Maximum width**: 50% of viewport
- **Resize handle**: Visible drag handle on left edge
- **Collapse button**: Quick collapse to maximize workspace
- **Context-sensitive content** based on center panel selection:
  - **File details** (when file selected):
    - File name, path, size, dates
    - File type and MIME type
    - Hashes (MD5, SHA256)
    - Permissions and attributes
  - **Static analysis results**:
    - File type analysis
    - Executable analysis (PE/ELF details)
    - Document metadata
    - EXIF data
    - Malware indicators
    - YARA rule matches
  - **File preview**:
    - Image thumbnails
    - Text preview
    - PDF preview (first page)
  - **Related artifacts**:
    - Files with similar hashes
    - Files in same directory
    - Files with same extension
  - **Quick actions**:
    - Run analysis
    - Add to bookmarks
    - Export file
    - Add note
    - Tag file
  - **Notes section**: Case-specific investigator notes
  - **Tags/labels**: Color-coded tags for organization

**BOTTOM STATUS BAR** - Fixed height
- **Case information**: Current case name and status
- **Current operation**: What the application is currently doing
- **Progress bar**: For long-running operations
- **Log toggle**: Button to show/hide log panel overlay
- **Notification icons**: Warnings, errors, completed tasks

#### Panel Behavior:
- **Resizable**: All panels can be resized by dragging borders with mouse
- **Smooth resizing**: Use CSS transitions for fluid resize animations
- **Resize constraints**: Enforce minimum/maximum widths to prevent UI breaking
- **Resize persistence**: Save panel sizes to case preferences (stored in LocalStorage per case)
- **Visual feedback**: Change cursor to resize indicator when hovering over borders
- **Collapsible**: Left and right panels can collapse to maximize center panel
- **Collapse state persistence**: Remember collapsed state per case
- **Keyboard shortcuts**: 
  - Quick navigation between panels (Ctrl+1/2/3)
  - Toggle left panel (Ctrl+B for "Browse")
  - Toggle right panel (Ctrl+I for "Info")
  - Full-screen center panel (F11)
- **Responsive**: Adapts to different screen sizes
  - On smaller screens (<1200px), right panel auto-collapses
  - On mobile/tablet, switch to single-panel accordion layout
- **Double-click border to reset**: Double-click resize handle to reset to default size

## Key User Flows (Case-Centric)

### 1. Create New Case
1. Click "New Case" button in top navigation or case selector
2. Fill case metadata form:
   - Case name (required)
   - Case number (optional)
   - Lead investigator (required)
   - Description (optional)
   - Tags/categories
   - Priority level
3. Case folder structure automatically created in `/cases/[case-name]/`
4. Case opens in 3-panel interface
5. Ready to add evidence

### 2. Open Existing Case
1. Click case selector dropdown in top navigation
2. Search/filter cases by name, date, investigator, or status
3. Click case to open
4. Case loads with all previous state restored:
   - Evidence tree populated
   - Previous panel layout restored
   - Last viewed files/tabs reopened
   - Analysis results available

### 3. Add Evidence to Case
1. With case open, click "Add Evidence" in left panel
2. Choose input method:
   - Native file picker (for disk images)
   - Folder selection (for extracted data)
   - Drag-and-drop into evidence area
3. Evidence copied/linked to `/evidence/disk-images/`
4. Automatic hash calculation (MD5 + SHA256)
5. Hash saved to `.hash` file alongside image
6. Evidence appears in left panel tree under "Evidence"
7. Log entry created in case logs

### 4. Analyze Disk Image
1. Select disk image from left panel evidence tree
2. Center panel shows disk image overview:
   - File size
   - Calculated hash
   - Analysis options
3. Click "Analyze Image" button
4. Automatic analysis begins:
   - Partition detection (results logged)
   - Filesystem identification
   - File extraction to `/evidence/extracted-files/`
   - Deleted file scanning to `/evidence/carved-files/`
5. Progress shown in bottom status bar
6. Real-time logs displayed (can toggle log panel)
7. When complete:
   - Partitions appear as children in evidence tree
   - Extracted files accessible in file tree
   - Analysis summary shown in center panel
   - All results saved to case folder

### 5. Browse Extracted Files (3-Panel Workflow)
1. **Left panel**: Expand partition in evidence tree
2. **Left panel**: Navigate file/folder structure
3. **Center panel**: File list shows contents of selected folder
4. Click on file in center panel
5. **Right panel**: File details populate:
   - Basic metadata (name, size, dates)
   - File type analysis results
   - Hash values
   - Preview (if image/text/PDF)
6. **Center panel**: Can switch to hex viewer tab to inspect bytes
7. **Right panel**: Shows hex viewer offset and context

### 6. Run Static Analysis on File
1. Select file in center panel
2. **Right panel**: Shows existing analysis results (if cached)
3. Click "Analyze" button in right panel
4. Select analysis types:
   - File type identification
   - Executable analysis (if PE/ELF)
   - Document metadata extraction (if Office/PDF)
   - EXIF extraction (if image)
   - String extraction
   - Hash calculation
   - YARA scanning
5. Analysis runs (progress in status bar)
6. Results appear in right panel in real-time
7. Results saved to `/analysis/[file-type]/[filename].json`
8. Log entry created
9. File tagged with analysis status in file list

### 7. Search for Keywords
1. Click search icon or press Ctrl+F
2. Center panel switches to search interface
3. Enter keyword(s)
4. Configure search:
   - Case sensitive/insensitive
   - Search scope (entire case, specific partition, selected files)
   - File types to include
   - Regular expression toggle
5. Click "Search"
6. Progress shown in status bar
7. Results appear in center panel:
   - File path
   - Match context (surrounding text)
   - Byte offset
   - Number of matches per file
8. Click result to open in hex viewer with highlight
9. Right panel shows file details and match context
10. Search results saved to `/analysis/search-results-[timestamp].json`
11. Can export results from right panel

### 8. View Timeline
1. **Left panel**: Click "Timeline" under Analysis section
2. **Center panel**: Timeline visualization loads:
   - Horizontal timeline graph
   - Events plotted chronologically
   - Color-coded by event type
3. **Timeline controls** (above graph):
   - Date range slider
   - Event type filters (created, modified, deleted, accessed)
   - Zoom controls
4. Click event on timeline
5. **Right panel**: Event details:
   - File path
   - Event type
   - Timestamp
   - Associated metadata
6. **Center panel**: Option to switch to table view
7. Export timeline from right panel (CSV, JSON, text)
8. Timeline data stored in `/analysis/timeline/`

### 9. Bookmark Important Items
1. Select file/artifact in center panel
2. Click bookmark icon in right panel or press Ctrl+B
3. Add note to bookmark (optional)
4. Add tags/labels (optional)
5. Bookmark added to "Bookmarks" section in left panel
6. Bookmarks saved to `/bookmarks/bookmarked-files.json`
7. Can filter and search bookmarked items
8. Bookmarks appear in final report

### 10. Generate Forensic Report
1. **Left panel**: Click "Reports" under Analysis
2. **Center panel**: Report generation interface
3. Select report sections to include:
   - Case metadata
   - Evidence summary
   - Timeline
   - Search results
   - Static analysis findings
   - Bookmarked items
   - Investigator notes
   - Hash values
4. Configure report format (text, JSON, CSV)
5. Click "Generate Report"
6. **Center panel**: Report preview shows
7. **Right panel**: Report metadata and export options
8. Click "Export" to save
9. Report saved to `/reports/case-report-[timestamp].txt`
10. Report available for future viewing in left panel

### 11. Case Collaboration & Notes
1. **Right panel**: Notes section always available
2. Add investigator notes:
   - General case notes
   - File-specific notes (when file selected)
   - Bookmark notes
   - Analysis observations
3. Notes auto-save to `/notes/investigator-notes.md`
4. Notes timestamped with investigator name
5. Notes searchable across case
6. Notes included in final report

### 12. Export Evidence
1. Select files to export (multi-select in center panel)
2. Right-click → "Export Selected"
3. Choose export options:
   - Original files only
   - Include analysis results
   - Include metadata
   - Preserve directory structure
4. Export package created in `/reports/exports/`
5. Export logged in case logs
6. Export hash calculated for integrity

## Security & Best Practices
- **Data integrity**: Never modify original evidence
- **Read-only operations**: All analysis non-destructive
- **Chain of custody**: Log all operations with timestamps
- **Hash verification**: Automatic hash calculation on load
- **Session isolation**: Each case independent

## Performance Considerations
- **Streaming**: Process large disk images in chunks
- **Web Workers**: Offload heavy parsing to background threads
- **Virtual scrolling**: For large file lists and hex views
- **Lazy loading**: Load partition data on-demand
- **Caching**: Cache parsed filesystem structures

## Accessibility
- Keyboard navigation for all features
- Screen reader support for critical operations
- High contrast mode option
- Zoom support for hex viewer

## Future Enhancements (Nice-to-Have)
- Network evidence capture
- Memory dump analysis
- Registry parsing (Windows)
- SQLite database viewer
- Email (.pst/.mbox) parser
- Browser artifact analysis
- Image metadata (EXIF) extraction
- AI-assisted anomaly detection

## Implementation Priority

### Phase 1: Foundation & Case Management (Week 1-2)
- Case-centric folder structure creation
- 3-panel layout implementation
- Case creation/opening/switching
- Basic file input and evidence loading
- Case metadata management
- Navigation tree (left panel)
- Basic hex viewer (center panel)
- File details display (right panel)

### Phase 2: Disk Image Analysis (Week 3-4)
- Partition detection (MBR/GPT)
- Filesystem parsing (NTFS, FAT32, EXT)
- File extraction and tree building
- Deleted file detection
- Basic string extraction (ASCII/Unicode)
- Hash calculation (MD5/SHA256)
- Real-time logging system

### Phase 3: Static File Analysis - Core (Week 5-6)
- File type identification (magic bytes)
- Executable analysis (PE/ELF headers, imports/exports)
- Document metadata extraction (Office, PDF)
- Image EXIF extraction
- Archive extraction (ZIP, RAR, 7Z)
- Hash database and deduplication
- Analysis results display in right panel

### Phase 4: Static File Analysis - Advanced (Week 7-8)
- Registry parsing (Windows hives)
- Browser artifact analysis (history, cache, cookies)
- Email parsing (PST, MBOX, EML)
- SQLite database analysis
- String analysis (URLs, emails, IPs, Base64)
- Network artifact analysis (PCAP)
- Malware indicators (YARA, entropy, suspicious APIs)

### Phase 5: Search & Timeline (Week 9-10)
- Keyword search across disk images
- Regular expression search
- Search result highlighting
- Timeline generation from file metadata
- Timeline visualization (graph + table)
- Timeline filtering and correlation
- Search and timeline export

### Phase 6: Reporting & Export (Week 11-12)
- Forensic report generation
- Report templates
- Evidence export functionality
- Analysis result export (JSON, CSV)
- Bookmark system
- Investigator notes
- Chain of custody documentation

### Phase 7: Polish & Performance (Week 13-14)
- Advanced scanning (brute-force sector scan)
- UI/UX refinements
- Performance optimization (Web Workers, streaming)
- Virtual scrolling for large datasets
- Keyboard shortcuts
- Error handling and validation
- Documentation and help system

### Phase 8: Advanced Features (Week 15+)
- File similarity analysis (fuzzy hashing)
- Carving engine improvements
- Multiple case comparison
- Case collaboration features
- Plugin system for custom analyzers
- Cloud backup/sync integration
- Advanced visualization and graphing

---

**Development Notes**:
- Focus on case isolation - no cross-case data leakage
- Every feature must respect case boundaries
- All data persists within case folder structure
- Static analysis results must be cached and reusable
- Performance is critical - use Web Workers for heavy tasks
- Maintain forensic integrity - never modify original evidence
- Comprehensive logging for audit trail

---

## Summary

Build ForensicX as a **case-centric**, single-page React application with a professional cyber-themed interface that forensic professionals would be proud to use.

**Core Principles**:
1. **Case-Centric Architecture**: Everything belongs to a case - no global workspace
2. **3-Panel Layout**: Efficient workflow with navigation tree, main work area, and context panel (ALL PANELS FULLY RESIZABLE)
3. **Comprehensive Static Analysis**: Every extracted file undergoes full static analysis
4. **Hidden Sector Detection**: Automatic detection of hidden partitions (especially sector 32 on USB drives like SanDisk)
5. **Forensic Integrity**: All operations are non-destructive and fully logged
6. **Self-Contained Cases**: Each case folder is portable and includes all evidence, analysis, and logs
7. **Security Assessment**: CIA Triad evaluation and MITRE ATT&CK framework mapping
8. **Spoofing Detection**: Automatic detection of files with mismatched extensions/signatures

**Key Differentiators**:
- Industrial-strength forensic analysis in a web application
- Professional cyber aesthetic that matches forensic tools like AXIOM and EnCase
- Complete static file analysis covering executables, documents, images, archives, emails, and more
- Intuitive 3-panel interface optimized for investigative workflow with fully resizable panels
- Hidden sector analysis targeting common USB drive hiding techniques (sector 32, HPA, DCO)
- Portable case format - entire investigations in organized folders
- CIA Triad security scoring system
- MITRE ATT&CK framework integration for threat intelligence

**Reference Implementation**:
This prompt is based on analysis of a production Python forensic tool (DForensics_Tool.py) which implements:
- The Sleuth Kit (pytsk3) integration for filesystem parsing
- E01/EWF image support for Expert Witness Format
- Comprehensive partition detection (MBR/GPT)
- File spoofing and tampering detection algorithms
- CIA Triad assessment scoring system
- Deleted file recovery with recoverability assessment
- NTFS Alternate Data Stream detection
- Real-time progress tracking and logging
- Professional GUI with resizable panels and filtering

**Critical Implementation Notes**:
1. **Panel Resizing**: Use CSS resize handles with JavaScript event listeners. Persist panel sizes per case in LocalStorage.
2. **Hidden Sectors**: Scan sectors 0-2047 on USB drive images, looking for signatures at offsets 32, 64, 128, etc.
3. **File Spoofing**: Always read first 16 bytes minimum, compare against 500+ signature database.
4. **CIA Assessment**: Run automatically after file extraction, store results in JSON format.
5. **Performance**: Use Web Workers for sector scanning, file hashing, and large file operations.
6. **Logging**: All operations logged with microsecond timestamps for forensic audit trail.

Focus on **reliability**, **accuracy**, **performance**, and maintaining **forensic integrity** throughout all operations. The goal is to create a tool that forensic investigators can trust for real-world investigations, with the capability to detect sophisticated hiding techniques and security compromises.
