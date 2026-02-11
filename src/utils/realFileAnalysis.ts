/**
 * Production-grade file analyzer
 * Performs real forensic analysis on uploaded files
 */

import { getFileData } from './fileStorage';
import { identifyFileType, detectSpoofing, calculateHashes, extractStrings } from './fileAnalysis';
import type { FileEntry } from '../types';

export async function analyzeUploadedFile(evidenceId: string, fileEntry: FileEntry): Promise<FileEntry> {
  try {
    // Get the actual file data from IndexedDB
    const fileData = await getFileData(evidenceId);
    if (!fileData) {
      console.warn(`No file data found for evidence ${evidenceId}`);
      return fileEntry;
    }

    const data = new Uint8Array(fileData);

    // Identify actual file type from magic bytes
    const fileType = identifyFileType(data);
    if (fileType) {
      fileEntry.actualType = fileType.description;
      fileEntry.magicBytes = fileType.magicBytes;
    }

    // Check for file spoofing using the raw data
    const spoofingResult = detectSpoofing(fileEntry, data);
    if (spoofingResult.isSpoofed) {
      fileEntry.isSpoofed = true;
      fileEntry.riskLevel = spoofingResult.riskLevel;
      if (!fileEntry.analysisResults) {
        fileEntry.analysisResults = {};
      }
      fileEntry.analysisResults.spoofing = spoofingResult;
    }

    // Calculate real hashes
    const hashes = await calculateHashes(fileData);
    if (!fileEntry.analysisResults) {
      fileEntry.analysisResults = {};
    }
    fileEntry.analysisResults.hashes = hashes;

    // Extract strings (limit to first 1MB for large files)
    const maxStringExtractSize = 1024 * 1024; // 1MB
    const stringData = data.slice(0, Math.min(data.length, maxStringExtractSize));
    const strings = extractStrings(stringData);
    fileEntry.analysisResults.strings = strings;

    return fileEntry;
  } catch (error) {
    console.error(`Failed to analyze file ${fileEntry.name}:`, error);
    return fileEntry;
  }
}

export async function analyzeAllFiles(evidenceId: string, files: FileEntry[]): Promise<FileEntry[]> {
  const analyzedFiles: FileEntry[] = [];
  
  for (const file of files) {
    const analyzed = await analyzeUploadedFile(evidenceId, file);
    analyzedFiles.push(analyzed);
  }
  
  return analyzedFiles;
}
