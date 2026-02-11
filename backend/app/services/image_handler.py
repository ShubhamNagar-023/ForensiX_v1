"""
Disk image handler using pytsk3 and libewf
"""
import pytsk3
import pyewf
import os
import hashlib
from typing import List, Optional, BinaryIO, Tuple
from pathlib import Path
from ..models.schemas import DiskImageInfo, PartitionInfo, FileMetadata, FileTimestamps, HashResult


class EWFImageHandle(pytsk3.Img_Info):
    """
    Custom image handler for E01 (Expert Witness Format) files using libewf
    """
    def __init__(self, ewf_handle):
        self._ewf_handle = ewf_handle
        super(EWFImageHandle, self).__init__(url="", type=pytsk3.TSK_IMG_TYPE_EXTERNAL)

    def close(self):
        self._ewf_handle.close()

    def read(self, offset: int, size: int) -> bytes:
        self._ewf_handle.seek(offset)
        return self._ewf_handle.read(size)

    def get_size(self) -> int:
        return self._ewf_handle.get_media_size()


class DiskImageHandler:
    """
    Handles disk image operations using pytsk3 and libewf for E01 support
    """
    
    def __init__(self, image_path: str):
        self.image_path = image_path
        self.img_info = None
        self.ewf_handle = None
        self.format = self._detect_format()
        
    def _detect_format(self) -> str:
        """Detect the format of the disk image"""
        ext = Path(self.image_path).suffix.lower()
        if ext in ['.e01', '.ex01']:
            return 'e01'
        elif ext in ['.dd', '.raw', '.img']:
            return 'raw'
        else:
            # Try to detect by content
            return 'raw'
    
    def open(self) -> pytsk3.Img_Info:
        """Open the disk image"""
        if self.format == 'e01':
            # Open E01 image using libewf
            filenames = pyewf.glob(self.image_path)
            self.ewf_handle = pyewf.handle()
            self.ewf_handle.open(filenames)
            
            # Create pytsk3 image handle using EWF
            self.img_info = EWFImageHandle(self.ewf_handle)
        else:
            # Open raw image directly with pytsk3
            self.img_info = pytsk3.Img_Info(self.image_path)
        
        return self.img_info
    
    def close(self):
        """Close the disk image"""
        if self.ewf_handle:
            self.ewf_handle.close()
        # Note: pytsk3.Img_Info doesn't have an explicit close method
        self.img_info = None
    
    def get_image_info(self) -> DiskImageInfo:
        """Get information about the disk image"""
        if not self.img_info:
            self.open()
        
        size = self.img_info.get_size()
        sector_size = 512  # Standard sector size
        total_sectors = size // sector_size
        
        partitions = self.get_partitions()
        
        return DiskImageInfo(
            filename=os.path.basename(self.image_path),
            size=size,
            format=self.format,
            partitions=partitions,
            sector_size=sector_size,
            total_sectors=total_sectors
        )
    
    def get_partitions(self) -> List[PartitionInfo]:
        """Get partition information from the disk image"""
        if not self.img_info:
            self.open()
        
        partitions = []
        
        try:
            # Try to open volume system (partition table)
            volume = pytsk3.Volume_Info(self.img_info)
            
            for i, part in enumerate(volume):
                # Skip meta partitions and unallocated space
                if part.flags == pytsk3.TSK_VS_PART_FLAG_UNALLOC:
                    continue
                
                # Detect filesystem type
                fs_type = self._detect_filesystem(part)
                
                partition_info = PartitionInfo(
                    id=f"part-{i}",
                    number=i,
                    type=self._get_partition_type_name(part.desc),
                    filesystem_type=fs_type,
                    start_sector=part.start,
                    end_sector=part.start + part.len - 1,
                    size=part.len * 512,
                    status='active' if i == 0 else 'inactive',
                    description=part.desc.decode('utf-8') if isinstance(part.desc, bytes) else str(part.desc)
                )
                partitions.append(partition_info)
        except Exception as e:
            # If no volume system, treat as single partition
            print(f"No partition table found, treating as single volume: {e}")
            partitions.append(PartitionInfo(
                id="part-0",
                number=0,
                type="Single Volume",
                filesystem_type=self._detect_filesystem_direct(),
                start_sector=0,
                end_sector=self.img_info.get_size() // 512 - 1,
                size=self.img_info.get_size(),
                status='active',
                description="Entire disk"
            ))
        
        return partitions
    
    def _detect_filesystem(self, partition) -> str:
        """Detect filesystem type from partition"""
        try:
            # Try to open filesystem
            offset = partition.start * 512
            fs_info = pytsk3.FS_Info(self.img_info, offset=offset)
            fs_type = fs_info.info.ftype
            
            # Map pytsk3 filesystem types to names
            fs_type_map = {
                pytsk3.TSK_FS_TYPE_NTFS: 'NTFS',
                pytsk3.TSK_FS_TYPE_FAT12: 'FAT12',
                pytsk3.TSK_FS_TYPE_FAT16: 'FAT16',
                pytsk3.TSK_FS_TYPE_FAT32: 'FAT32',
                pytsk3.TSK_FS_TYPE_EXFAT: 'exFAT',
                pytsk3.TSK_FS_TYPE_EXT2: 'EXT2',
                pytsk3.TSK_FS_TYPE_EXT3: 'EXT3',
                pytsk3.TSK_FS_TYPE_EXT4: 'EXT4',
                pytsk3.TSK_FS_TYPE_HFS: 'HFS',
                pytsk3.TSK_FS_TYPE_ISO9660: 'ISO9660',
            }
            
            return fs_type_map.get(fs_type, f'Unknown ({fs_type})')
        except Exception as e:
            print(f"Could not detect filesystem: {e}")
            return 'Unknown'
    
    def _detect_filesystem_direct(self) -> str:
        """Detect filesystem when no partition table exists"""
        try:
            fs_info = pytsk3.FS_Info(self.img_info)
            fs_type = fs_info.info.ftype
            
            fs_type_map = {
                pytsk3.TSK_FS_TYPE_NTFS: 'NTFS',
                pytsk3.TSK_FS_TYPE_FAT12: 'FAT12',
                pytsk3.TSK_FS_TYPE_FAT16: 'FAT16',
                pytsk3.TSK_FS_TYPE_FAT32: 'FAT32',
                pytsk3.TSK_FS_TYPE_EXFAT: 'exFAT',
                pytsk3.TSK_FS_TYPE_EXT2: 'EXT2',
                pytsk3.TSK_FS_TYPE_EXT3: 'EXT3',
                pytsk3.TSK_FS_TYPE_EXT4: 'EXT4',
            }
            
            return fs_type_map.get(fs_type, 'Unknown')
        except:
            return 'Unknown'
    
    def _get_partition_type_name(self, desc) -> str:
        """Convert partition description to type name"""
        if isinstance(desc, bytes):
            desc = desc.decode('utf-8', errors='ignore')
        return str(desc).strip()
    
    def get_filesystem(self, partition_id: str) -> pytsk3.FS_Info:
        """Get filesystem object for a partition"""
        if not self.img_info:
            self.open()
        
        partitions = self.get_partitions()
        partition = next((p for p in partitions if p.id == partition_id), None)
        
        if not partition:
            raise ValueError(f"Partition {partition_id} not found")
        
        offset = partition.start_sector * 512
        return pytsk3.FS_Info(self.img_info, offset=offset)
    
    def __enter__(self):
        self.open()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
