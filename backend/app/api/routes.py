"""
FastAPI routes for disk forensics operations
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import StreamingResponse, JSONResponse
from typing import List, Optional
import os
import tempfile
import shutil
from pathlib import Path

from ..models.schemas import (
    DiskImageInfo, DiskImageOpenRequest, FileExtractionRequest,
    FileMetadata, FileAnalysisRequest, HashResult, ProgressUpdate
)
from ..services.image_handler import DiskImageHandler
from ..services.filesystem_analyzer import FilesystemAnalyzer


router = APIRouter(prefix="/api/forensics", tags=["forensics"])

# Store active image handlers (in production, use proper session management)
active_images = {}


@router.post("/upload-image")
async def upload_disk_image(file: UploadFile = File(...)):
    """
    Upload a disk image file
    Returns the path where the image is stored
    """
    try:
        # Create temporary directory for uploaded images
        upload_dir = Path(tempfile.gettempdir()) / "forensix_uploads"
        upload_dir.mkdir(exist_ok=True)
        
        # Save uploaded file
        file_path = upload_dir / file.filename
        
        with open(file_path, 'wb') as f:
            shutil.copyfileobj(file.file, f)
        
        return {
            "success": True,
            "file_path": str(file_path),
            "filename": file.filename,
            "size": file_path.stat().st_size
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")


@router.post("/open-image", response_model=DiskImageInfo)
async def open_disk_image(request: DiskImageOpenRequest):
    """
    Open a disk image and get its information
    Supports E01 and raw disk images
    """
    try:
        if not os.path.exists(request.file_path):
            raise HTTPException(status_code=404, detail=f"Image file not found: {request.file_path}")
        
        # Create image handler
        handler = DiskImageHandler(request.file_path)
        handler.open()
        
        # Store handler for later use
        active_images[request.file_path] = handler
        
        # Get image information
        image_info = handler.get_image_info()
        
        return image_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to open image: {str(e)}")


@router.post("/extract-files", response_model=List[FileMetadata])
async def extract_files(request: FileExtractionRequest):
    """
    Extract file metadata from a partition
    """
    try:
        # Get the image handler
        handler = active_images.get(request.image_path)
        if not handler:
            # Try to open it
            handler = DiskImageHandler(request.image_path)
            handler.open()
            active_images[request.image_path] = handler
        
        # Create filesystem analyzer
        analyzer = FilesystemAnalyzer(handler)
        
        # List files from the partition
        files = analyzer.list_files(
            partition_id=request.partition_id,
            path="/",
            max_files=request.max_files,
            include_deleted=request.include_deleted,
            include_directories=False
        )
        
        return files
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract files: {str(e)}")


@router.post("/read-file")
async def read_file(request: FileAnalysisRequest):
    """
    Read file contents from a disk image
    """
    try:
        # Get the image handler
        handler = active_images.get(request.image_path)
        if not handler:
            handler = DiskImageHandler(request.image_path)
            handler.open()
            active_images[request.image_path] = handler
        
        # Create filesystem analyzer
        analyzer = FilesystemAnalyzer(handler)
        
        # Read file
        file_data = analyzer.read_file(
            partition_id=request.partition_id,
            file_path=request.file_path
        )
        
        # Return as streaming response
        return StreamingResponse(
            iter([file_data]),
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename={os.path.basename(request.file_path)}"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {str(e)}")


@router.post("/calculate-hash", response_model=HashResult)
async def calculate_file_hash(request: FileAnalysisRequest):
    """
    Calculate hash values for a file
    """
    try:
        # Get the image handler
        handler = active_images.get(request.image_path)
        if not handler:
            handler = DiskImageHandler(request.image_path)
            handler.open()
            active_images[request.image_path] = handler
        
        # Create filesystem analyzer
        analyzer = FilesystemAnalyzer(handler)
        
        # Calculate hashes
        hash_result = analyzer.calculate_file_hash(
            partition_id=request.partition_id,
            file_path=request.file_path
        )
        
        return hash_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate hash: {str(e)}")


@router.post("/close-image")
async def close_disk_image(request: DiskImageOpenRequest):
    """
    Close a disk image and free resources
    """
    try:
        handler = active_images.get(request.file_path)
        if handler:
            handler.close()
            del active_images[request.file_path]
        
        return {"success": True, "message": "Image closed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to close image: {str(e)}")


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ForensiX Backend",
        "active_images": len(active_images)
    }
