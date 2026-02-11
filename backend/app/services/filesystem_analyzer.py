"""
Filesystem analyzer using pytsk3
Extracts files, metadata, and performs analysis
"""
import pytsk3
import hashlib
from typing import List, Optional, Generator, Tuple
from datetime import datetime
from ..models.schemas import FileMetadata, FileTimestamps, HashResult
from .image_handler import DiskImageHandler


class FilesystemAnalyzer:
    """
    Analyzes filesystems and extracts file metadata using pytsk3
    """
    
    def __init__(self, image_handler: DiskImageHandler):
        self.image_handler = image_handler
    
    def list_files(self, partition_id: str, path: str = "/", 
                   max_files: int = 1000, 
                   include_deleted: bool = True,
                   include_directories: bool = False) -> List[FileMetadata]:
        """
        List files in a partition
        
        Args:
            partition_id: Partition identifier
            path: Starting path
            max_files: Maximum number of files to return
            include_deleted: Include deleted files
            include_directories: Include directories in results
        """
        fs_info = self.image_handler.get_filesystem(partition_id)
        files = []
        
        try:
            directory = fs_info.open_dir(path)
            self._recurse_directory(
                fs_info, directory, path, files, 
                max_files, include_deleted, include_directories
            )
        except Exception as e:
            print(f"Error listing files in {path}: {e}")
        
        return files[:max_files]
    
    def _recurse_directory(self, fs_info: pytsk3.FS_Info, directory, 
                          current_path: str, files: List[FileMetadata],
                          max_files: int, include_deleted: bool, 
                          include_directories: bool, depth: int = 0):
        """Recursively traverse directory tree"""
        if len(files) >= max_files or depth > 10:  # Limit depth to prevent infinite recursion
            return
        
        for entry in directory:
            # Skip . and ..
            if not hasattr(entry, 'info') or entry.info is None:
                continue
            
            name = entry.info.name.name.decode('utf-8', errors='ignore')
            if name in ['.', '..']:
                continue
            
            # Check if file is deleted
            is_deleted = entry.info.name.flags == pytsk3.TSK_FS_NAME_FLAG_UNALLOC
            
            if not include_deleted and is_deleted:
                continue
            
            # Check if it's a directory
            is_dir = entry.info.meta and entry.info.meta.type == pytsk3.TSK_FS_META_TYPE_DIR
            
            if is_dir and not include_directories:
                # Recurse into directory but don't add to list
                try:
                    sub_dir = fs_info.open_dir(inode=entry.info.meta.addr)
                    new_path = f"{current_path}/{name}".replace('//', '/')
                    self._recurse_directory(
                        fs_info, sub_dir, new_path, files,
                        max_files, include_deleted, include_directories, depth + 1
                    )
                except:
                    pass
                continue
            
            # Extract file metadata
            file_meta = self._extract_file_metadata(entry, current_path, is_deleted)
            if file_meta:
                files.append(file_meta)
            
            # Recurse into directories
            if is_dir:
                try:
                    sub_dir = fs_info.open_dir(inode=entry.info.meta.addr)
                    new_path = f"{current_path}/{name}".replace('//', '/')
                    self._recurse_directory(
                        fs_info, sub_dir, new_path, files,
                        max_files, include_deleted, include_directories, depth + 1
                    )
                except:
                    pass
    
    def _extract_file_metadata(self, entry, current_path: str, is_deleted: bool) -> Optional[FileMetadata]:
        """Extract metadata from a file entry"""
        try:
            if not entry.info or not entry.info.meta:
                return None
            
            name = entry.info.name.name.decode('utf-8', errors='ignore')
            meta = entry.info.meta
            
            # Determine file type
            file_type = 'directory' if meta.type == pytsk3.TSK_FS_META_TYPE_DIR else 'file'
            
            # Get file extension
            extension = ''
            if '.' in name and file_type == 'file':
                extension = '.' + name.rsplit('.', 1)[-1]
            
            # Extract timestamps
            timestamps = self._extract_timestamps(meta)
            
            # Build file path
            file_path = f"{current_path}/{name}".replace('//', '/')
            
            # Check for hidden files (Unix: starts with ., Windows: check attributes)
            is_hidden = name.startswith('.')
            is_system = False
            
            # For NTFS, check DOS attributes
            if hasattr(meta, 'flags'):
                # NTFS FILE_ATTRIBUTE_HIDDEN = 0x2
                # NTFS FILE_ATTRIBUTE_SYSTEM = 0x4
                if meta.flags & 0x2:
                    is_hidden = True
                if meta.flags & 0x4:
                    is_system = True
            
            return FileMetadata(
                id=f"file-{meta.addr}",
                name=name,
                path=file_path,
                size=meta.size if hasattr(meta, 'size') else 0,
                type=file_type,
                extension=extension,
                is_deleted=is_deleted,
                is_hidden=is_hidden,
                is_system=is_system,
                timestamps=timestamps,
                inode=meta.addr,
                permissions=self._get_permissions(meta) if hasattr(meta, 'mode') else None,
                owner_uid=meta.uid if hasattr(meta, 'uid') else None,
                owner_gid=meta.gid if hasattr(meta, 'gid') else None
            )
        except Exception as e:
            print(f"Error extracting metadata: {e}")
            return None
    
    def _extract_timestamps(self, meta) -> FileTimestamps:
        """Extract file timestamps"""
        timestamps = FileTimestamps()
        
        try:
            # mtime - modification time
            if hasattr(meta, 'mtime') and meta.mtime > 0:
                timestamps.modified = datetime.fromtimestamp(meta.mtime).isoformat()
            
            # atime - access time
            if hasattr(meta, 'atime') and meta.atime > 0:
                timestamps.accessed = datetime.fromtimestamp(meta.atime).isoformat()
            
            # ctime - change time (metadata change)
            if hasattr(meta, 'ctime') and meta.ctime > 0:
                timestamps.changed = datetime.fromtimestamp(meta.ctime).isoformat()
            
            # crtime - creation time (NTFS/EXT4)
            if hasattr(meta, 'crtime') and meta.crtime > 0:
                timestamps.created = datetime.fromtimestamp(meta.crtime).isoformat()
            elif timestamps.modified:
                # Fallback to modification time if creation time not available
                timestamps.created = timestamps.modified
        except Exception as e:
            print(f"Error extracting timestamps: {e}")
        
        return timestamps
    
    def _get_permissions(self, meta) -> str:
        """Convert file mode to permission string (Unix style)"""
        try:
            if not hasattr(meta, 'mode'):
                return None
            
            mode = meta.mode
            perms = []
            
            # File type
            if meta.type == pytsk3.TSK_FS_META_TYPE_DIR:
                perms.append('d')
            else:
                perms.append('-')
            
            # Owner permissions
            perms.append('r' if mode & 0o400 else '-')
            perms.append('w' if mode & 0o200 else '-')
            perms.append('x' if mode & 0o100 else '-')
            
            # Group permissions
            perms.append('r' if mode & 0o040 else '-')
            perms.append('w' if mode & 0o020 else '-')
            perms.append('x' if mode & 0o010 else '-')
            
            # Other permissions
            perms.append('r' if mode & 0o004 else '-')
            perms.append('w' if mode & 0o002 else '-')
            perms.append('x' if mode & 0o001 else '-')
            
            return ''.join(perms)
        except:
            return None
    
    def read_file(self, partition_id: str, file_path: str, inode: Optional[int] = None) -> bytes:
        """
        Read file contents from the filesystem
        
        Args:
            partition_id: Partition identifier
            file_path: Path to the file
            inode: Optional inode number for faster access
        """
        fs_info = self.image_handler.get_filesystem(partition_id)
        
        try:
            if inode:
                # Open by inode (faster)
                file_obj = fs_info.open_meta(inode=inode)
            else:
                # Open by path
                file_obj = fs_info.open(file_path)
            
            # Read file data
            size = file_obj.info.meta.size
            offset = 0
            data = b''
            
            # Read in chunks
            chunk_size = 1024 * 1024  # 1MB chunks
            while offset < size:
                read_size = min(chunk_size, size - offset)
                chunk = file_obj.read_random(offset, read_size)
                if not chunk:
                    break
                data += chunk
                offset += len(chunk)
            
            return data
        except Exception as e:
            print(f"Error reading file {file_path}: {e}")
            raise
    
    def calculate_file_hash(self, partition_id: str, file_path: str, inode: Optional[int] = None) -> HashResult:
        """Calculate hashes for a file"""
        data = self.read_file(partition_id, file_path, inode)
        
        md5 = hashlib.md5(data).hexdigest()
        sha1 = hashlib.sha1(data).hexdigest()
        sha256 = hashlib.sha256(data).hexdigest()
        
        return HashResult(md5=md5, sha1=sha1, sha256=sha256)
