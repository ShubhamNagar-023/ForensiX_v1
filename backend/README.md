# ForensiX Backend - Real Forensics with pytsk3 and libewf

This is the Python backend for ForensiX, providing real disk forensics capabilities using:
- **pytsk3**: Python bindings for The Sleuth Kit (TSK) for filesystem analysis
- **libewf**: Library for reading Expert Witness Format (E01) forensic disk images

## Features

- **Real E01 Support**: Open and analyze E01 forensic disk images using libewf
- **Multiple Filesystem Support**: NTFS, FAT12/16/32, exFAT, EXT2/3/4, HFS, ISO9660
- **MBR/GPT Parsing**: Detect and parse partition tables
- **File Extraction**: Extract files and metadata from disk images
- **Deleted File Recovery**: Access deleted files from unallocated space
- **Timestamp Analysis**: Extract creation, modification, access, and change times
- **Hash Calculation**: MD5, SHA1, SHA256 for files
- **File Metadata**: Permissions, ownership, inode numbers, file attributes

## Installation

### Prerequisites

#### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install -y \
    build-essential \
    python3-dev \
    libewf-dev \
    libtool \
    autoconf \
    automake \
    pkg-config
```

#### macOS
```bash
brew install libewf
```

### Python Dependencies

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Running the Backend

### Development Mode
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Or use the startup script:
```bash
chmod +x start.sh
./start.sh
```

### Docker
```bash
# Build and run with Docker Compose (from project root)
docker-compose up -d backend

# Or build the backend image directly
cd backend
docker build -t forensix-backend .
docker run -p 8000:8000 -v $(pwd):/app forensix-backend
```

## API Endpoints

### Upload Disk Image
```http
POST /api/forensics/upload-image
Content-Type: multipart/form-data

Returns: { success, file_path, filename, size }
```

### Open Disk Image
```http
POST /api/forensics/open-image
Content-Type: application/json

{
  "file_path": "/path/to/image.e01"
}

Returns: DiskImageInfo (partitions, size, format, etc.)
```

### Extract Files
```http
POST /api/forensics/extract-files
Content-Type: application/json

{
  "image_path": "/path/to/image.e01",
  "partition_id": "part-0",
  "max_files": 1000,
  "include_deleted": true,
  "include_directories": false
}

Returns: FileMetadata[] (file list with timestamps, sizes, etc.)
```

### Read File
```http
POST /api/forensics/read-file
Content-Type: application/json

{
  "image_path": "/path/to/image.e01",
  "partition_id": "part-0",
  "file_path": "/path/to/file.txt"
}

Returns: File contents as binary stream
```

### Calculate Hash
```http
POST /api/forensics/calculate-hash
Content-Type: application/json

{
  "image_path": "/path/to/image.e01",
  "partition_id": "part-0",
  "file_path": "/path/to/file.txt"
}

Returns: { md5, sha1, sha256 }
```

### Close Image
```http
POST /api/forensics/close-image
Content-Type: application/json

{
  "file_path": "/path/to/image.e01"
}

Returns: { success, message }
```

### Health Check
```http
GET /api/forensics/health

Returns: { status, service, active_images }
```

## Architecture

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py           # API endpoints
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py          # Pydantic models
│   └── services/
│       ├── __init__.py
│       ├── image_handler.py    # Disk image handler (E01/raw)
│       └── filesystem_analyzer.py  # Filesystem analysis
├── requirements.txt
├── Dockerfile
└── start.sh
```

## Supported Image Formats

- **E01/Ex01**: Expert Witness Format (EnCase)
- **Raw/DD**: Raw disk images
- **IMG**: Raw disk images with .img extension

## Supported Filesystems

- **NTFS**: Windows NT File System
- **FAT12/16/32**: File Allocation Table
- **exFAT**: Extended File Allocation Table
- **EXT2/3/4**: Linux Extended Filesystem
- **HFS/HFS+**: Apple Hierarchical File System
- **ISO9660**: CD-ROM filesystem

## Notes

- The backend stores active image handles in memory for performance
- In production, implement proper session management and cleanup
- Large disk images may require significant memory
- File extraction is limited to prevent memory exhaustion
- Deleted files may be partially recoverable depending on filesystem state

## Troubleshooting

### pytsk3 Installation Issues
If pytsk3 fails to install:
```bash
# Ubuntu/Debian
sudo apt-get install libtsk-dev

# Then retry
pip install pytsk3
```

### libewf-python Issues
The version specified (20171104) may not be available on PyPI. Alternative:
```bash
# Install from system packages
sudo apt-get install python3-libewf

# Or build from source
git clone https://github.com/libyal/libewf.git
cd libewf
./synclibs.sh
./autogen.sh
./configure --enable-python3
make
sudo make install
```

## Security Considerations

- **Validate Input**: Always validate disk image paths
- **Sandboxing**: Run backend in isolated environment
- **File Size Limits**: Implement limits on file extraction
- **Authentication**: Add authentication for production use
- **Rate Limiting**: Protect against DoS attacks
- **Path Traversal**: Sanitize all file paths

## License

See main project LICENSE file.
