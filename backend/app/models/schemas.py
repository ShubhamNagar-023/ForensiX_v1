"""
Pydantic models for disk forensics application
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime


class FileTimestamps(BaseModel):
    """File timestamp information"""
    created: Optional[str] = None
    modified: Optional[str] = None
    accessed: Optional[str] = None
    changed: Optional[str] = None  # MFT change time for NTFS


class FileMetadata(BaseModel):
    """File metadata extracted from filesystem"""
    id: str
    name: str
    path: str
    size: int
    type: str  # 'file' or 'directory'
    extension: str
    is_deleted: bool = False
    is_hidden: bool = False
    is_system: bool = False
    timestamps: FileTimestamps
    inode: Optional[int] = None
    permissions: Optional[str] = None
    owner_uid: Optional[int] = None
    owner_gid: Optional[int] = None


class PartitionInfo(BaseModel):
    """Partition information"""
    id: str
    number: int
    type: str
    filesystem_type: str
    start_sector: int
    end_sector: int
    size: int
    status: str
    description: Optional[str] = None


class DiskImageInfo(BaseModel):
    """Disk image information"""
    filename: str
    size: int
    format: str  # 'raw', 'e01', 'dd'
    partitions: List[PartitionInfo]
    sector_size: int = 512
    total_sectors: int


class HashResult(BaseModel):
    """File hash results"""
    md5: str
    sha1: str
    sha256: str


class FileAnalysisRequest(BaseModel):
    """Request to analyze a file"""
    image_path: str
    file_path: str
    partition_id: Optional[str] = None


class DiskImageOpenRequest(BaseModel):
    """Request to open a disk image"""
    file_path: str


class FileExtractionRequest(BaseModel):
    """Request to extract files from a partition"""
    image_path: str
    partition_id: str
    max_files: int = 1000
    include_deleted: bool = True
    include_directories: bool = False


class ProgressUpdate(BaseModel):
    """Progress update for long-running operations"""
    operation: str
    progress: float  # 0.0 to 100.0
    message: str
    current: int = 0
    total: int = 0
