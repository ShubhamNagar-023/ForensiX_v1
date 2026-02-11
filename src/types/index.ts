// Case types
export interface CaseMetadata {
  id: string;
  name: string;
  caseNumber: string;
  dateCreated: string;
  lastModified: string;
  leadInvestigator: string;
  teamMembers: string[];
  description: string;
  status: 'Active' | 'Under Review' | 'Closed' | 'Archived';
  evidenceCustodian: string;
  tags: string[];
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  relatedCases: string[];
}

export interface ForensicCase {
  metadata: CaseMetadata;
  evidence: EvidenceItem[];
  analysisResults: AnalysisResult[];
  bookmarks: Bookmark[];
  notes: Note[];
  logs: LogEntry[];
}

// Evidence types
export interface EvidenceItem {
  id: string;
  name: string;
  type: 'disk-image' | 'file' | 'folder';
  path: string;
  size: number;
  dateAdded: string;
  hashMD5?: string;
  hashSHA256?: string;
  partitions?: Partition[];
  analysisStatus: 'pending' | 'analyzing' | 'complete' | 'error';
}

export interface Partition {
  id: string;
  number: number;
  type: string;
  filesystemType: string;
  startSector: number;
  endSector: number;
  size: number;
  status: 'active' | 'inactive' | 'hidden';
  files: FileEntry[];
}

export interface FileEntry {
  id: string;
  name: string;
  path: string;
  size: number;
  type: 'file' | 'directory';
  extension: string;
  isDeleted: boolean;
  isHidden: boolean;
  isSpoofed: boolean;
  recoverability?: number;
  timestamps: FileTimestamps;
  magicBytes?: string;
  actualType?: string;
  claimedType?: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  children?: FileEntry[];
  metadata?: Record<string, unknown>;
  analysisResults?: FileAnalysisResult;
}

export interface FileTimestamps {
  created: string;
  modified: string;
  accessed: string;
  changed?: string;
}

export interface FileAnalysisResult {
  fileType?: FileTypeResult;
  spoofing?: SpoofingResult;
  strings?: StringResult;
  hashes?: HashResult;
  executable?: ExecutableResult;
  document?: DocumentResult;
  image?: ImageResult;
}

export interface FileTypeResult {
  mimeType: string;
  extension: string;
  description: string;
  magicBytes: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface SpoofingResult {
  isSpoofed: boolean;
  claimedType: string;
  actualType: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  indicators: string[];
  recommendation: string;
}

export interface StringResult {
  asciiStrings: string[];
  unicodeStrings: string[];
  urls: string[];
  emails: string[];
  ipAddresses: string[];
  totalCount: number;
}

export interface HashResult {
  md5: string;
  sha256: string;
  sha1?: string;
  ssdeep?: string;
}

export interface ExecutableResult {
  format: 'PE' | 'ELF' | 'MachO' | 'unknown';
  architecture: string;
  imports: string[];
  exports: string[];
  sections: { name: string; size: number; entropy: number }[];
  isPacked: boolean;
  compiler?: string;
  suspiciousApis: string[];
}

export interface DocumentResult {
  author?: string;
  title?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modificationDate?: string;
  pageCount?: number;
  hasMacros: boolean;
  hasJavaScript: boolean;
  embeddedObjects: string[];
}

export interface ImageResult {
  width: number;
  height: number;
  colorSpace: string;
  bitDepth: number;
  exif?: Record<string, string>;
  gpsCoordinates?: { latitude: number; longitude: number };
  cameraMake?: string;
  cameraModel?: string;
}

// Analysis types
export interface AnalysisResult {
  id: string;
  type: string;
  timestamp: string;
  status: 'running' | 'complete' | 'error';
  data: unknown;
}

// Hidden Sector types
export interface HiddenSectorResult {
  sector: number;
  offset: number;
  type: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  entropy?: number;
  signature?: string;
  status: 'POTENTIAL_HIDDEN_PARTITION' | 'ENCRYPTED_OR_COMPRESSED' | 'CONTAINS_DATA' | 'EMPTY';
}

export interface SectorScanResult {
  hiddenPartitions: HiddenSectorResult[];
  filesystemSignatures: HiddenSectorResult[];
  suspiciousSectors: HiddenSectorResult[];
  encryptedRegions: HiddenSectorResult[];
  scanProgress: number;
  totalSectors: number;
}

// CIA Triad types
export interface CIAAssessment {
  confidentialityScore: number;
  integrityScore: number;
  availabilityScore: number;
  overallScore: number;
  riskLevel: 'LOW RISK' | 'MEDIUM RISK' | 'HIGH RISK' | 'CRITICAL RISK';
  summary: string;
  confidentialityFindings: string[];
  integrityFindings: string[];
  availabilityFindings: string[];
  criticalFindings: string[];
  recommendations: string[];
  timestamp: string;
}

// MITRE ATT&CK types
export interface MitreAttackFinding {
  tactic: string;
  technique: string;
  evidence: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface MitreAttackMapping {
  findings: MitreAttackFinding[];
  attackChainSummary: string;
  recommendedActions: string[];
}

// Timeline types
export interface TimelineEvent {
  id: string;
  timestamp: string;
  eventType: 'created' | 'modified' | 'accessed' | 'deleted' | 'changed';
  filePath: string;
  fileName: string;
  description: string;
  source: string;
}

// Bookmark types
export interface Bookmark {
  id: string;
  itemId: string;
  itemType: 'file' | 'sector' | 'search-result' | 'artifact';
  name: string;
  note: string;
  tags: string[];
  dateCreated: string;
}

// Note types
export interface Note {
  id: string;
  content: string;
  author: string;
  timestamp: string;
  relatedItemId?: string;
  relatedItemType?: string;
}

// Log types
export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG' | 'CRITICAL';
  category: string;
  message: string;
  details?: string;
}

// UI types
export interface PanelSizes {
  left: number;
  center: number;
  right: number;
}

export interface Tab {
  id: string;
  title: string;
  type: 'file-list' | 'hex-viewer' | 'timeline' | 'search' | 'logs' | 'report' | 'dashboard' | 'cia-assessment' | 'mitre-attack' | 'sector-scan';
  data?: unknown;
  isActive: boolean;
}

// Report types
export interface ForensicReport {
  id: string;
  title: string;
  dateGenerated: string;
  sections: ReportSection[];
  format: 'text' | 'json' | 'csv';
}

export interface ReportSection {
  title: string;
  content: string;
  type: 'metadata' | 'evidence' | 'timeline' | 'findings' | 'hashes' | 'notes' | 'cia' | 'mitre';
}
