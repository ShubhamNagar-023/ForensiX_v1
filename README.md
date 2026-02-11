# ForensicX - Professional Disk Forensics Platform

A production-grade web-based disk forensics application built with React, TypeScript, and Tailwind CSS. ForensicX provides comprehensive tools for digital forensic investigation including disk image analysis, file spoofing detection, hidden sector scanning, and security assessment.

## Features

### Core Architecture
- **Case Management** - Create, open, switch between forensic cases with full metadata (investigator, custodian, team, tags, priority)
- **3-Panel Resizable Layout** - Navigator (left), Main Content (center), Details (right) with keyboard shortcuts
- **Evidence Management** - Drag-and-drop file upload, disk image support (.img, .dd, .raw, .e01)
- **Persistent State** - Cases persist in browser localStorage via Zustand

### Disk Image Analysis
- **MBR/GPT Partition Parsing** - Detects partition types, filesystem signatures, hidden partitions
- **Filesystem Detection** - NTFS, FAT32, FAT16, exFAT, EXT2/3/4 signature identification
- **File Carving** - Extracts embedded files from disk images using magic byte signatures

### Static File Analysis
- **500+ File Signatures** - Magic byte identification for executables, archives, documents, images, media, databases
- **File Spoofing Detection** - Identifies files with mismatched extensions (e.g., .exe disguised as .pdf)
- **Risk Assessment** - CRITICAL/HIGH/MEDIUM/LOW risk levels with detailed indicators

### Hidden Sector Analysis
- **Sector Scanning** - Quick, Standard, and Paranoid scan modes
- **Entropy Analysis** - Detects encrypted/compressed regions via Shannon entropy
- **Sector Map Visualization** - Visual grid showing hidden, encrypted, and suspicious sectors

### Analysis Tools
- **Hex Viewer** - Offset navigation, ASCII display, color-coded byte visualization
- **String Extraction** - ASCII/Unicode strings, URLs, emails, IP addresses
- **Keyword Search** - Full-text search with regex support across all extracted data
- **Timeline Analysis** - Interactive charts (Recharts) with event filtering and CSV export
- **Hash Verification** - MD5, SHA256, SHA1 calculation

### Security Assessment
- **CIA Triad Assessment** - Confidentiality, Integrity, Availability scoring with gauge visualizations
- **MITRE ATT&CK Mapping** - Maps artifacts to MITRE tactics and techniques with evidence chains
- **Risk Scoring** - Overall risk assessment with actionable recommendations

### Reporting & Export
- **Forensic Report Generator** - Configurable sections, text and JSON export formats
- **Analysis Logging** - Severity-based log system (INFO/WARNING/ERROR/CRITICAL) with filtering and export
- **Bookmark & Notes** - Bookmark files and add investigator notes with timestamps

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Usage

1. Create a new forensic case with case details (investigator, case number, priority)
2. Upload disk images (.img, .dd, .raw, .e01) or individual files via drag-and-drop
3. The application will automatically:
   - Parse MBR partition tables
   - Detect filesystem signatures (NTFS, FAT32, FAT16, exFAT, EXT)
   - Extract and carve files from disk images
   - Identify hidden partitions and suspicious sectors
4. Analyze extracted files for spoofing, deleted content, and security risks
5. Generate comprehensive forensic reports with findings

## Tech Stack

- **React 19** + **TypeScript** - Type-safe component architecture
- **Vite** - Fast build tool with HMR
- **Tailwind CSS 4** - Utility-first CSS with custom cyber theme
- **Zustand** - Lightweight state management with persistence
- **Recharts** - Chart visualizations for timeline analysis
- **Lucide React** - Icon library
- **CryptoJS** - Hash calculation (MD5, SHA256, SHA1)
