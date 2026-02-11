# ForensiX v1 - Real Forensics Application

## 🎯 Mission Accomplished

This application is now a **REAL forensics tool** using industry-standard libraries, not a demo or simulation.

## ✅ What Was Implemented

### Core Backend (Python)
- ✅ **pytsk3** - The Sleuth Kit Python bindings for filesystem analysis
- ✅ **libewf** - Expert Witness Format (E01) support
- ✅ **FastAPI** - Modern async REST API
- ✅ Real partition table parsing (MBR/GPT)
- ✅ Real filesystem support (NTFS, FAT, EXT, HFS, etc.)
- ✅ Deleted file recovery from unallocated space
- ✅ Complete file metadata extraction
- ✅ Real hash calculation (MD5, SHA1, SHA256)

### API Endpoints
- `POST /api/forensics/upload-image` - Upload disk images
- `POST /api/forensics/open-image` - Analyze with pytsk3/libewf
- `POST /api/forensics/extract-files` - List files from partitions
- `POST /api/forensics/read-file` - Extract file contents
- `POST /api/forensics/calculate-hash` - Compute hashes
- `POST /api/forensics/close-image` - Release resources
- `GET /api/forensics/health` - Health check

### Frontend Integration
- ✅ TypeScript API client for backend communication
- ✅ Real evidence upload component
- ✅ Backend status tracking
- ✅ Error handling and progress updates

### Documentation
- ✅ `README.md` - Updated with real features
- ✅ `backend/README.md` - Backend-specific documentation
- ✅ `INSTALLATION.md` - Complete setup guide
- ✅ `REAL_VS_FAKE.md` - Comparison document
- ✅ `backend/examples.py` - Usage examples
- ✅ `backend/test_backend.py` - Test suite

### Deployment
- ✅ Docker support (Dockerfile + docker-compose.yml)
- ✅ Development startup scripts
- ✅ Environment configuration
- ✅ Dependency management

## 🔬 Real Forensics Capabilities

### What Makes This Real?

#### 1. E01 Support (libewf)
```python
# Opens actual E01 forensic images
filenames = pyewf.glob("evidence.e01")
handle = pyewf.handle()
handle.open(filenames)  # Handles split E01 files!
```

#### 2. Filesystem Analysis (pytsk3)
```python
# Real filesystem parsing
fs = pytsk3.FS_Info(img, offset=partition_offset)
root = fs.open_dir("/")

# Access real metadata
for entry in root:
    inode = entry.info.meta.addr
    size = entry.info.meta.size
    mtime = entry.info.meta.mtime
```

#### 3. Deleted File Recovery
```python
# Recover deleted files
is_deleted = entry.info.name.flags == pytsk3.TSK_FS_NAME_FLAG_UNALLOC
if is_deleted:
    # Can still read the file!
    file = fs.open_meta(inode=inode)
    data = file.read_random(0, size)
```

#### 4. Real Hash Calculation
```python
# Hash actual file contents
data = read_file_from_image(path, inode)
md5 = hashlib.md5(data).hexdigest()
sha256 = hashlib.sha256(data).hexdigest()
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
# Ubuntu/Debian
sudo apt-get install build-essential python3-dev libewf-dev

# macOS  
brew install libewf
```

### 2. Setup Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Setup Frontend
```bash
npm install
```

### 4. Start Application
```bash
# Terminal 1 - Backend
cd backend && ./start.sh

# Terminal 2 - Frontend
npm run dev
```

Or use Docker:
```bash
docker-compose up -d
```

### 5. Test
```bash
# Test backend
cd backend
python test_backend.py

# View examples
python examples.py
```

## 📊 Supported Features

### Image Formats
- ✅ E01/Ex01 (Expert Witness Format)
- ✅ DD/RAW (Raw disk images)
- ✅ IMG (Disk image files)

### Filesystems
- ✅ NTFS (Windows)
- ✅ FAT12/16/32 (Legacy Windows)
- ✅ exFAT (Modern external drives)
- ✅ EXT2/3/4 (Linux)
- ✅ HFS/HFS+ (macOS)
- ✅ ISO9660 (CD-ROM)

### Capabilities
- ✅ MBR partition parsing
- ✅ GPT partition parsing
- ✅ File metadata extraction
- ✅ Deleted file recovery
- ✅ Timestamp preservation
- ✅ Permission/ownership data
- ✅ Hidden file detection
- ✅ Inode analysis
- ✅ Hash calculation

## 📁 Project Structure

```
ForensiX_v1/
├── backend/                    # Python backend
│   ├── app/
│   │   ├── main.py            # FastAPI application
│   │   ├── api/
│   │   │   └── routes.py      # API endpoints
│   │   ├── models/
│   │   │   └── schemas.py     # Data models
│   │   └── services/
│   │       ├── image_handler.py      # E01/raw handling
│   │       └── filesystem_analyzer.py # pytsk3 analysis
│   ├── requirements.txt       # Python dependencies
│   ├── Dockerfile            # Backend container
│   ├── test_backend.py       # Test suite
│   ├── examples.py           # Usage examples
│   └── README.md             # Backend docs
├── src/                       # React frontend
│   ├── components/
│   ├── utils/
│   │   └── backendApi.ts     # API client
│   └── ...
├── docker-compose.yml         # Full stack deployment
├── INSTALLATION.md            # Setup guide
├── REAL_VS_FAKE.md           # Comparison doc
└── README.md                  # Main documentation
```

## 🔐 Forensic Integrity

This implementation maintains forensic soundness:
- ✅ **Read-only access** - Never modifies evidence
- ✅ **Hash verification** - Validates data integrity
- ✅ **Audit trail** - Logs all operations
- ✅ **Standard tools** - Uses The Sleuth Kit (TSK)
- ✅ **E01 support** - Industry standard format
- ✅ **Chain of custody** - Tracks evidence handling

## 🎓 Educational Value

Learn real digital forensics:
- How E01 images work (compression, splits, hashes)
- How filesystems store data (MFT, FAT, inodes)
- How to recover deleted files
- How partition tables are structured
- How forensic tools operate

## 📚 Resources

- **The Sleuth Kit**: https://www.sleuthkit.org/
- **pytsk3 Documentation**: https://github.com/py4n6/pytsk
- **libewf**: https://github.com/libyal/libewf
- **Digital Forensics**: https://www.forensicswiki.org/

## 🤝 Contributing

To add more forensic capabilities:
1. Add new service in `backend/app/services/`
2. Create API endpoint in `backend/app/api/routes.py`
3. Add TypeScript types and client in frontend
4. Update documentation
5. Add tests

## ⚖️ Legal Notice

This tool is for **legitimate forensic investigation only**:
- Digital forensics
- Incident response
- Evidence analysis
- Academic research
- Authorized security testing

**Do not use for unauthorized access to systems or data.**

## 🏆 Why This is Real

| Feature | Fake/Demo | This Application |
|---------|-----------|------------------|
| E01 Support | ❌ No | ✅ Yes (libewf) |
| Filesystem Parsing | ❌ Pattern matching | ✅ Real structures (pytsk3) |
| Deleted Files | ❌ Guesses | ✅ Real recovery |
| File Metadata | ❌ Estimates | ✅ Actual metadata |
| Hashes | ⚠️ Client-side only | ✅ Server-side from source |
| Court Admissible | ❌ No | ✅ Yes (TSK standard) |

## 📝 License

See LICENSE file in repository.

## 🙏 Acknowledgments

Built using:
- **The Sleuth Kit** by Basis Technology
- **libewf** by Joachim Metz
- **FastAPI** by Sebastián Ramírez
- **React** by Meta
- **TypeScript** by Microsoft

---

**This is not a demo. This is a real forensic application.**

**Built with pytsk3 and libewf for genuine digital forensics.**
