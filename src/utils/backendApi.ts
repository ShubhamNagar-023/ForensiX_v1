/**
 * API client for ForensiX backend
 * Communicates with Python backend using pytsk3 and libewf
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface DiskImageInfo {
  filename: string;
  size: number;
  format: string;
  partitions: PartitionInfo[];
  sector_size: number;
  total_sectors: number;
}

export interface PartitionInfo {
  id: string;
  number: number;
  type: string;
  filesystem_type: string;
  start_sector: number;
  end_sector: number;
  size: number;
  status: string;
  description?: string;
}

export interface FileMetadata {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  extension: string;
  is_deleted: boolean;
  is_hidden: boolean;
  is_system: boolean;
  timestamps: {
    created?: string;
    modified?: string;
    accessed?: string;
    changed?: string;
  };
  inode?: number;
  permissions?: string;
  owner_uid?: number;
  owner_gid?: number;
}

export interface HashResult {
  md5: string;
  sha1: string;
  sha256: string;
}

/**
 * Upload a disk image to the backend
 */
export async function uploadDiskImage(file: File): Promise<{ success: boolean; file_path: string; filename: string; size: number }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/forensics/upload-image`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to upload image');
  }

  return response.json();
}

/**
 * Open a disk image and get its information
 */
export async function openDiskImage(filePath: string): Promise<DiskImageInfo> {
  const response = await fetch(`${API_BASE_URL}/api/forensics/open-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file_path: filePath }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to open image');
  }

  return response.json();
}

/**
 * Extract files from a partition
 */
export async function extractFiles(
  imagePath: string,
  partitionId: string,
  options?: {
    maxFiles?: number;
    includeDeleted?: boolean;
    includeDirectories?: boolean;
  }
): Promise<FileMetadata[]> {
  const response = await fetch(`${API_BASE_URL}/api/forensics/extract-files`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_path: imagePath,
      partition_id: partitionId,
      max_files: options?.maxFiles || 1000,
      include_deleted: options?.includeDeleted !== false,
      include_directories: options?.includeDirectories || false,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to extract files');
  }

  return response.json();
}

/**
 * Read file contents from a disk image
 */
export async function readFile(imagePath: string, partitionId: string, filePath: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/api/forensics/read-file`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_path: imagePath,
      partition_id: partitionId,
      file_path: filePath,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to read file');
  }

  return response.blob();
}

/**
 * Calculate hash values for a file
 */
export async function calculateFileHash(imagePath: string, partitionId: string, filePath: string): Promise<HashResult> {
  const response = await fetch(`${API_BASE_URL}/api/forensics/calculate-hash`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_path: imagePath,
      partition_id: partitionId,
      file_path: filePath,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to calculate hash');
  }

  return response.json();
}

/**
 * Close a disk image
 */
export async function closeDiskImage(filePath: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/forensics/close-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file_path: filePath }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to close image');
  }

  return response.json();
}

/**
 * Health check
 */
export async function healthCheck(): Promise<{ status: string; service: string; active_images: number }> {
  const response = await fetch(`${API_BASE_URL}/api/forensics/health`);

  if (!response.ok) {
    throw new Error('Backend not responding');
  }

  return response.json();
}
