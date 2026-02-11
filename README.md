# ForensicX - Real Professional Disk Forensics Platform

A **real production-grade** disk forensics application with Python backend using **pytsk3** (The Sleuth Kit) and **libewf** for E01 support. The application provides genuine forensic capabilities including disk image analysis, filesystem parsing, file extraction, and comprehensive metadata analysis.

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS (Web UI)
- **Backend**: Python FastAPI with pytsk3 and libewf (Real forensics engine)
- **Real Features**: Actual E01 support, filesystem parsing, deleted file recovery

## Features

### Real Forensics Backend (Python + pytsk3 + libewf)
- **E01 Support** - Real Expert Witness Format support using libewf
- **Raw Image Support** - DD, IMG, RAW disk image formats
- **Filesystem Analysis** - NTFS, FAT12/16/32, exFAT, EXT2/3/4, HFS using The Sleuth Kit
- **MBR/GPT Parsing** - Real partition table parsing via pytsk3
- **File Extraction** - Extract files with full metadata (timestamps, permissions, ownership)
- **Deleted File Recovery** - Access deleted files from unallocated space
- **Real Hash Calculation** - MD5, SHA1, SHA256 from actual file contents
- **Inode Analysis** - Direct filesystem metadata access

### Frontend Features
- **Case Management** - Create, open, switch between forensic cases with full metadata (investigator, custodian, team, tags, priority)
- **3-Panel Resizable Layout** - Navigator (left), Main Content (center), Details (right) with keyboard shortcuts
- **Evidence Management** - Upload disk images to backend for real analysis
- **Persistent State** - Cases persist in browser localStorage via Zustand

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

### Backend Setup (Python)
```bash
# Install system dependencies (Ubuntu/Debian)
sudo apt-get install -y build-essential python3-dev libewf-dev

# Setup Python backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start backend server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
# Or use: ./start.sh
```

### Frontend Setup (TypeScript/React)
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Docker Setup (Recommended)
```bash
# Start both frontend and backend
docker-compose up -d

# Backend will be available at http://localhost:8000
# Frontend will be available at http://localhost:5173
```

## Usage

1. **Start the backend** (Python FastAPI server with pytsk3/libewf)
2. **Start the frontend** (React development server)
3. Create a new forensic case with case details (investigator, case number, priority)
4. Upload disk images (.img, .dd, .raw, .e01) - **images are processed by real pytsk3 backend**
5. The backend will:
   - Open E01 files using libewf
   - Parse MBR/GPT partition tables using pytsk3
   - Detect real filesystem signatures (NTFS, FAT, EXT, etc.)
   - Extract files with actual metadata (timestamps, permissions, ownership)
   - Access deleted files from unallocated space
   - Calculate real MD5/SHA1/SHA256 hashes
6. Analyze extracted files for spoofing, deleted content, and security risks
7. Generate comprehensive forensic reports with findings

## Tech Stack

### Backend (Real Forensics Engine)
- **Python 3.11+** - Backend runtime
- **FastAPI** - Modern async web framework
- **pytsk3** - Python bindings for The Sleuth Kit (filesystem analysis)
- **libewf-python** - Expert Witness Format (E01) support
- **Uvicorn** - ASGI server

### Frontend
- **React 19** + **TypeScript** - Type-safe component architecture
- **Vite** - Fast build tool with HMR
- **Tailwind CSS 4** - Utility-first CSS with custom cyber theme
- **Zustand** - Lightweight state management with persistence
- **Recharts** - Chart visualizations for timeline analysis
- **Lucide React** - Icon library
- **CryptoJS** - Hash calculation (frontend fallback)
