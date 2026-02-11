# Installation and Testing Guide

## Prerequisites

### System Requirements
- Python 3.11 or higher
- Node.js 18 or higher
- Git

### For Ubuntu/Debian Users
```bash
sudo apt-get update
sudo apt-get install -y \
    build-essential \
    python3-dev \
    python3-pip \
    python3-venv \
    libewf-dev \
    libtool \
    autoconf \
    automake \
    pkg-config \
    git
```

### For macOS Users
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install libewf python@3.11
```

## Installation Steps

### 1. Clone the Repository
```bash
git clone https://github.com/ShubhamNagar-023/ForensiX_v1.git
cd ForensiX_v1
```

### 2. Setup Python Backend

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On Linux/macOS:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Note: If pytsk3 or libewf-python installation fails, see Troubleshooting section
```

### 3. Setup Frontend

```bash
# Navigate back to project root
cd ..

# Install Node.js dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env if needed (default backend URL is http://localhost:8000)
```

## Running the Application

### Method 1: Manual Start (Development)

#### Terminal 1 - Start Backend
```bash
cd backend
source venv/bin/activate  # Linux/macOS
# venv\Scripts\activate  # Windows
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend will be available at: http://localhost:8000
API documentation at: http://localhost:8000/docs

#### Terminal 2 - Start Frontend
```bash
npm run dev
```

Frontend will be available at: http://localhost:5173

### Method 2: Using Docker (Recommended for Production)

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Testing the Application

### 1. Verify Backend is Running
```bash
curl http://localhost:8000/api/forensics/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "ForensiX Backend",
  "active_images": 0
}
```

### 2. Test with Sample Disk Image

#### Create a Test Disk Image (Linux/macOS)
```bash
# Create a 100MB test disk image
dd if=/dev/zero of=test.img bs=1M count=100

# Create a FAT32 filesystem on it
mkfs.vfat test.img

# Mount it and add some test files
mkdir -p /tmp/test_mount
sudo mount -o loop test.img /tmp/test_mount
sudo cp /etc/hosts /tmp/test_mount/
sudo cp /etc/passwd /tmp/test_mount/
sudo umount /tmp/test_mount
```

#### Test with the Application
1. Open http://localhost:5173 in your browser
2. Create a new case
3. Click "Add Evidence"
4. Upload the `test.img` file
5. Backend will:
   - Parse the partition table
   - Detect the FAT32 filesystem
   - Extract the files (hosts, passwd)
   - Show file metadata with timestamps

### 3. Test with Real E01 Image

If you have an E01 forensic image:
```bash
# Test backend directly
curl -X POST http://localhost:8000/api/forensics/upload-image \
  -F "file=@/path/to/your/image.e01"
```

Then use the web interface to analyze it.

### 4. Run Backend Tests (if available)
```bash
cd backend
pytest  # If tests are added
```

## Verifying Real Forensics Capabilities

### Check pytsk3 Installation
```bash
cd backend
source venv/bin/activate
python -c "import pytsk3; print('pytsk3 version:', pytsk3.TSK_VERSION_STR)"
```

### Check libewf Installation
```bash
python -c "import pyewf; print('libewf successfully imported')"
```

### Test Filesystem Analysis
```bash
# Start Python shell
cd backend
source venv/bin/activate
python

# In Python shell:
>>> import pytsk3
>>> from app.services.image_handler import DiskImageHandler
>>> 
>>> # Test with your disk image
>>> handler = DiskImageHandler('/path/to/test.img')
>>> handler.open()
>>> info = handler.get_image_info()
>>> print(f"Found {len(info.partitions)} partitions")
>>> for p in info.partitions:
...     print(f"Partition {p.number}: {p.filesystem_type} - {p.size} bytes")
```

## Troubleshooting

### pytsk3 Installation Fails

**Error**: `fatal error: tsk/libtsk.h: No such file or directory`

**Solution**:
```bash
# Ubuntu/Debian
sudo apt-get install libtsk-dev

# macOS
brew install sleuthkit

# Then retry pip install
pip install pytsk3
```

### libewf-python Installation Fails

**Error**: Package not found on PyPI

**Solution**: Build from source
```bash
# Install build dependencies
sudo apt-get install autoconf automake libtool pkg-config

# Clone and build libewf
git clone https://github.com/libyal/libewf.git
cd libewf
./synclibs.sh
./autogen.sh
./configure --enable-python3
make
sudo make install
sudo ldconfig

# Verify installation
python3 -c "import pyewf; print('Success!')"
```

### Backend Not Connecting

1. Check if backend is running: `curl http://localhost:8000/api/forensics/health`
2. Check firewall settings
3. Verify CORS settings in `backend/app/main.py`
4. Check backend logs for errors

### Frontend Not Loading

1. Clear browser cache
2. Check console for errors (F12)
3. Verify environment variables in `.env`
4. Try: `rm -rf node_modules package-lock.json && npm install`

### Docker Build Fails

1. Ensure Docker has enough resources (4GB+ RAM recommended)
2. Try building without cache: `docker-compose build --no-cache`
3. Check Docker logs: `docker-compose logs backend`

## Next Steps

1. **Explore the UI**: Create cases, upload evidence, analyze files
2. **Check API Docs**: Visit http://localhost:8000/docs for interactive API documentation
3. **Review Backend Logs**: See what pytsk3 is doing under the hood
4. **Test E01 Files**: If you have E01 images, test the libewf integration
5. **Customize**: Modify backend services for your specific forensics needs

## Production Deployment

For production deployment:
1. Use PostgreSQL instead of in-memory storage
2. Add authentication and authorization
3. Configure reverse proxy (nginx)
4. Enable HTTPS
5. Set up proper logging and monitoring
6. Implement rate limiting
7. Use environment variables for secrets
8. Set up automated backups

## Support

For issues:
1. Check the backend logs: `docker-compose logs backend`
2. Check browser console for frontend errors
3. Verify all dependencies are installed
4. See backend/README.md for detailed API documentation
5. Open an issue on GitHub with logs and error messages
