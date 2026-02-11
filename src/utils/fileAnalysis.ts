import CryptoJS from 'crypto-js';
import type { FileEntry, SpoofingResult, HashResult, StringResult, FileTypeResult, CIAAssessment, MitreAttackMapping, TimelineEvent } from '../types';

// File signature database
const FILE_SIGNATURES: { pattern: number[]; offset: number; type: string; mime: string; ext: string[] }[] = [
  // Executables
  { pattern: [0x4D, 0x5A], offset: 0, type: 'PE Executable (Windows)', mime: 'application/x-executable', ext: ['.exe', '.dll', '.sys', '.scr', '.ocx'] },
  { pattern: [0x7F, 0x45, 0x4C, 0x46], offset: 0, type: 'ELF Binary (Linux)', mime: 'application/x-elf', ext: ['.elf', '.so', '.o'] },
  { pattern: [0xFE, 0xED, 0xFA, 0xCE], offset: 0, type: 'Mach-O (macOS 32-bit)', mime: 'application/x-mach-binary', ext: ['.dylib'] },
  { pattern: [0xFE, 0xED, 0xFA, 0xCF], offset: 0, type: 'Mach-O (macOS 64-bit)', mime: 'application/x-mach-binary', ext: ['.dylib'] },
  // Archives
  { pattern: [0x50, 0x4B, 0x03, 0x04], offset: 0, type: 'ZIP Archive', mime: 'application/zip', ext: ['.zip', '.docx', '.xlsx', '.pptx', '.jar', '.apk'] },
  { pattern: [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07], offset: 0, type: 'RAR Archive', mime: 'application/x-rar', ext: ['.rar'] },
  { pattern: [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C], offset: 0, type: '7-Zip Archive', mime: 'application/x-7z-compressed', ext: ['.7z'] },
  { pattern: [0x1F, 0x8B], offset: 0, type: 'GZIP Archive', mime: 'application/gzip', ext: ['.gz', '.tgz'] },
  { pattern: [0x42, 0x5A, 0x68], offset: 0, type: 'BZIP2 Archive', mime: 'application/x-bzip2', ext: ['.bz2'] },
  // Documents
  { pattern: [0x25, 0x50, 0x44, 0x46], offset: 0, type: 'PDF Document', mime: 'application/pdf', ext: ['.pdf'] },
  { pattern: [0x7B, 0x5C, 0x72, 0x74, 0x66], offset: 0, type: 'RTF Document', mime: 'application/rtf', ext: ['.rtf'] },
  { pattern: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], offset: 0, type: 'OLE Compound Document', mime: 'application/x-ole-storage', ext: ['.doc', '.xls', '.ppt', '.msg'] },
  // Images
  { pattern: [0xFF, 0xD8, 0xFF], offset: 0, type: 'JPEG Image', mime: 'image/jpeg', ext: ['.jpg', '.jpeg'] },
  { pattern: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], offset: 0, type: 'PNG Image', mime: 'image/png', ext: ['.png'] },
  { pattern: [0x47, 0x49, 0x46, 0x38], offset: 0, type: 'GIF Image', mime: 'image/gif', ext: ['.gif'] },
  { pattern: [0x42, 0x4D], offset: 0, type: 'BMP Image', mime: 'image/bmp', ext: ['.bmp'] },
  { pattern: [0x49, 0x49, 0x2A, 0x00], offset: 0, type: 'TIFF Image (LE)', mime: 'image/tiff', ext: ['.tif', '.tiff'] },
  { pattern: [0x4D, 0x4D, 0x00, 0x2A], offset: 0, type: 'TIFF Image (BE)', mime: 'image/tiff', ext: ['.tif', '.tiff'] },
  // Media
  { pattern: [0xFF, 0xFB], offset: 0, type: 'MP3 Audio', mime: 'audio/mpeg', ext: ['.mp3'] },
  { pattern: [0x49, 0x44, 0x33], offset: 0, type: 'MP3 Audio (ID3)', mime: 'audio/mpeg', ext: ['.mp3'] },
  { pattern: [0x52, 0x49, 0x46, 0x46], offset: 0, type: 'RIFF Container', mime: 'application/octet-stream', ext: ['.avi', '.wav'] },
  // Databases
  { pattern: [0x53, 0x51, 0x4C, 0x69, 0x74, 0x65], offset: 0, type: 'SQLite Database', mime: 'application/x-sqlite3', ext: ['.db', '.sqlite', '.sqlite3'] },
  // Encryption
  { pattern: [0x4C, 0x55, 0x4B, 0x53, 0xBA, 0xBE], offset: 0, type: 'LUKS Encrypted', mime: 'application/x-luks', ext: [] },
  // Scripts
  { pattern: [0x23, 0x21, 0x2F], offset: 0, type: 'Shell Script', mime: 'text/x-shellscript', ext: ['.sh', '.bash'] },
];

export function identifyFileType(data: Uint8Array): FileTypeResult | null {
  for (const sig of FILE_SIGNATURES) {
    if (data.length < sig.offset + sig.pattern.length) continue;
    let match = true;
    for (let j = 0; j < sig.pattern.length; j++) {
      if (data[sig.offset + j] !== sig.pattern[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      return {
        mimeType: sig.mime,
        extension: sig.ext[0] || '',
        description: sig.type,
        magicBytes: sig.pattern.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' '),
        confidence: 'HIGH',
      };
    }
  }
  return null;
}

export function detectSpoofing(file: FileEntry, data: Uint8Array): SpoofingResult {
  const actualType = identifyFileType(data);
  const fileExt = file.extension.toLowerCase();

  if (!actualType) {
    return {
      isSpoofed: false,
      claimedType: fileExt,
      actualType: 'Unknown',
      riskLevel: 'LOW',
      indicators: [],
      recommendation: 'File type could not be determined from magic bytes',
    };
  }

  const expectedExtensions = FILE_SIGNATURES.find((s) => s.type === actualType.description)?.ext || [];
  const isSpoofed = expectedExtensions.length > 0 && !expectedExtensions.includes(fileExt);

  if (!isSpoofed) {
    return {
      isSpoofed: false,
      claimedType: fileExt,
      actualType: actualType.description,
      riskLevel: 'LOW',
      indicators: [],
      recommendation: 'File extension matches actual file type',
    };
  }

  // Determine risk level
  let riskLevel: SpoofingResult['riskLevel'] = 'MEDIUM';
  const indicators: string[] = [];

  if (actualType.description.includes('Executable') || actualType.description.includes('ELF') || actualType.description.includes('Mach-O')) {
    riskLevel = 'CRITICAL';
    indicators.push(`Executable file disguised with ${fileExt} extension`);
    indicators.push('File may be malware disguised as document');
    indicators.push('Common social engineering attack pattern');
  } else if (actualType.description.includes('Archive')) {
    riskLevel = 'HIGH';
    indicators.push(`Archive file disguised with ${fileExt} extension`);
    indicators.push('May contain hidden malicious files');
  } else {
    indicators.push(`Extension ${fileExt} does not match actual type: ${actualType.description}`);
  }

  const recommendation = riskLevel === 'CRITICAL'
    ? 'QUARANTINE - Do not open, likely malicious'
    : riskLevel === 'HIGH'
    ? 'CAUTION - Inspect archive contents before opening'
    : 'REVIEW - File type mismatch detected';

  return {
    isSpoofed: true,
    claimedType: fileExt,
    actualType: actualType.description,
    riskLevel,
    indicators,
    recommendation,
  };
}

export async function calculateHashes(data: ArrayBuffer): Promise<HashResult> {
  const wordArray = CryptoJS.lib.WordArray.create(data as unknown as number[]);
  return {
    md5: CryptoJS.MD5(wordArray).toString(),
    sha256: CryptoJS.SHA256(wordArray).toString(),
    sha1: CryptoJS.SHA1(wordArray).toString(),
  };
}

export function extractStrings(data: Uint8Array, minLength: number = 4): StringResult {
  const asciiStrings: string[] = [];
  const unicodeStrings: string[] = [];
  const urls: string[] = [];
  const emails: string[] = [];
  const ipAddresses: string[] = [];

  // Extract ASCII strings
  let current = '';
  for (let i = 0; i < data.length; i++) {
    const byte = data[i];
    if (byte >= 32 && byte <= 126) {
      current += String.fromCharCode(byte);
    } else {
      if (current.length >= minLength) {
        asciiStrings.push(current);
      }
      current = '';
    }
  }
  if (current.length >= minLength) asciiStrings.push(current);

  // Extract Unicode (UTF-16 LE) strings
  let unicodeCurrent = '';
  for (let i = 0; i < data.length - 1; i += 2) {
    const char = data[i] | (data[i + 1] << 8);
    if (char >= 32 && char <= 126) {
      unicodeCurrent += String.fromCharCode(char);
    } else {
      if (unicodeCurrent.length >= minLength) {
        unicodeStrings.push(unicodeCurrent);
      }
      unicodeCurrent = '';
    }
  }
  if (unicodeCurrent.length >= minLength) unicodeStrings.push(unicodeCurrent);

  // Extract URLs, emails, IPs from all strings
  const allStrings = [...asciiStrings, ...unicodeStrings];
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const ipPattern = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g;

  for (const str of allStrings) {
    const foundUrls = str.match(urlPattern);
    if (foundUrls) urls.push(...foundUrls);
    const foundEmails = str.match(emailPattern);
    if (foundEmails) emails.push(...foundEmails);
    const foundIps = str.match(ipPattern);
    if (foundIps) ipAddresses.push(...foundIps);
  }

  return {
    asciiStrings: [...new Set(asciiStrings)].slice(0, 1000),
    unicodeStrings: [...new Set(unicodeStrings)].slice(0, 500),
    urls: [...new Set(urls)],
    emails: [...new Set(emails)],
    ipAddresses: [...new Set(ipAddresses)],
    totalCount: asciiStrings.length + unicodeStrings.length,
  };
}

export function performCIAAssessment(files: FileEntry[]): CIAAssessment {
  let confidentialityScore = 100;
  let integrityScore = 100;
  let availabilityScore = 100;
  const confidentialityFindings: string[] = [];
  const integrityFindings: string[] = [];
  const availabilityFindings: string[] = [];
  const criticalFindings: string[] = [];
  const recommendations: string[] = [];

  const spoofedFiles = files.filter((f) => f.isSpoofed);
  const deletedFiles = files.filter((f) => f.isDeleted);
  const hiddenFiles = files.filter((f) => f.isHidden);
  const executableExts = ['.exe', '.dll', '.sys', '.bat', '.cmd', '.ps1', '.vbs', '.js'];
  const sensitiveExts = ['.pem', '.key', '.pfx', '.p12', '.cer', '.crt'];

  // Confidentiality assessment
  const sensitiveFiles = files.filter((f) => sensitiveExts.includes(f.extension.toLowerCase()));
  if (sensitiveFiles.length > 0) {
    confidentialityScore -= sensitiveFiles.length * 10;
    confidentialityFindings.push(`Found ${sensitiveFiles.length} unencrypted sensitive file(s) (keys, certificates)`);
    recommendations.push('Encrypt all sensitive key files and certificates');
  }

  if (hiddenFiles.length > 0) {
    confidentialityFindings.push(`${hiddenFiles.length} hidden file(s) detected`);
  }

  // Integrity assessment
  if (spoofedFiles.length > 0) {
    integrityScore -= spoofedFiles.length * 10;
    const criticalSpoofed = spoofedFiles.filter((f) => f.riskLevel === 'CRITICAL');
    integrityFindings.push(`${spoofedFiles.length} file(s) with extension/signature mismatch`);
    if (criticalSpoofed.length > 0) {
      criticalFindings.push(`${criticalSpoofed.length} executable(s) disguised as documents`);
      recommendations.push('Immediately quarantine all spoofed executable files');
    }
  }

  const anomalousTimestamps = files.filter((f) => {
    if (!f.timestamps.created || !f.timestamps.modified) return false;
    return new Date(f.timestamps.created) > new Date(f.timestamps.modified);
  });
  if (anomalousTimestamps.length > 0) {
    integrityScore -= anomalousTimestamps.length * 5;
    integrityFindings.push(`${anomalousTimestamps.length} file(s) with impossible timestamp combinations`);
    recommendations.push('Investigate files with timestamp anomalies for evidence of tampering');
  }

  // Availability assessment
  if (deletedFiles.length > 0) {
    availabilityScore -= Math.min(deletedFiles.length * 5, 40);
    availabilityFindings.push(`${deletedFiles.length} file(s) recently deleted`);
    recommendations.push('Review deleted files for evidence of data destruction');
  }

  const suspiciousExecutables = files.filter((f) => 
    executableExts.includes(f.extension.toLowerCase()) && f.isDeleted
  );
  if (suspiciousExecutables.length > 0) {
    availabilityScore -= suspiciousExecutables.length * 10;
    availabilityFindings.push(`${suspiciousExecutables.length} executable(s) deleted (possible malware cleanup)`);
    criticalFindings.push('Deleted executables suggest malware removal attempt');
  }

  // Clamp scores
  confidentialityScore = Math.max(0, Math.min(100, confidentialityScore));
  integrityScore = Math.max(0, Math.min(100, integrityScore));
  availabilityScore = Math.max(0, Math.min(100, availabilityScore));

  const overallScore = confidentialityScore * 0.35 + integrityScore * 0.35 + availabilityScore * 0.30;

  let riskLevel: CIAAssessment['riskLevel'];
  if (overallScore >= 90) riskLevel = 'LOW RISK';
  else if (overallScore >= 70) riskLevel = 'MEDIUM RISK';
  else if (overallScore >= 50) riskLevel = 'HIGH RISK';
  else riskLevel = 'CRITICAL RISK';

  const summary = `System analysis reveals ${riskLevel.toLowerCase()} status. `
    + `${spoofedFiles.length} spoofed file(s), ${deletedFiles.length} deleted file(s), `
    + `${hiddenFiles.length} hidden file(s) detected across ${files.length} total files analyzed.`;

  return {
    confidentialityScore,
    integrityScore,
    availabilityScore,
    overallScore: Math.round(overallScore * 10) / 10,
    riskLevel,
    summary,
    confidentialityFindings,
    integrityFindings,
    availabilityFindings,
    criticalFindings,
    recommendations,
    timestamp: new Date().toISOString(),
  };
}

export function performMitreMapping(files: FileEntry[]): MitreAttackMapping {
  const findings: MitreAttackMapping['findings'] = [];
  const recommendedActions: string[] = [];

  const spoofedExes = files.filter((f) => f.isSpoofed && f.riskLevel === 'CRITICAL');
  if (spoofedExes.length > 0) {
    findings.push({
      tactic: 'TA0001 - Initial Access',
      technique: 'T1566.001 - Phishing: Spearphishing Attachment',
      evidence: spoofedExes.map((f) => `Spoofed executable: ${f.name} (${f.actualType} disguised as ${f.claimedType})`),
      confidence: 'HIGH',
    });
    recommendedActions.push('Investigate email logs for spearphishing campaigns');
  }

  const deletedFiles = files.filter((f) => f.isDeleted);
  const deletedLogs = deletedFiles.filter((f) => 
    f.extension.toLowerCase() === '.evtx' || f.name.toLowerCase().includes('log')
  );
  if (deletedLogs.length > 0) {
    findings.push({
      tactic: 'TA0005 - Defense Evasion',
      technique: 'T1070.001 - Indicator Removal: Clear Windows Event Logs',
      evidence: deletedLogs.map((f) => `Deleted log file: ${f.name}`),
      confidence: 'HIGH',
    });
    recommendedActions.push('Check network logs for data exfiltration');
  }

  const hiddenFiles = files.filter((f) => f.isHidden);
  if (hiddenFiles.length > 0) {
    findings.push({
      tactic: 'TA0005 - Defense Evasion',
      technique: 'T1564.001 - Hide Artifacts: Hidden Files and Directories',
      evidence: hiddenFiles.map((f) => `Hidden file: ${f.name}`),
      confidence: 'MEDIUM',
    });
    recommendedActions.push('Review all hidden files for malicious content');
  }

  const archives = files.filter((f) => ['.zip', '.rar', '.7z', '.tar'].includes(f.extension.toLowerCase()));
  if (archives.length > 0) {
    findings.push({
      tactic: 'TA0009 - Collection',
      technique: 'T1560.001 - Archive Collected Data: Archive via Utility',
      evidence: archives.map((f) => `Archive file: ${f.name} (${f.size} bytes)`),
      confidence: 'LOW',
    });
    recommendedActions.push('Examine archive contents for sensitive data');
  }

  const attackChainSummary = findings.length > 0
    ? `Evidence suggests potential compromise involving ${findings.length} MITRE ATT&CK technique(s). ` +
      findings.map((f) => f.tactic.split(' - ')[1]).join(', ') + ' tactics identified.'
    : 'No significant MITRE ATT&CK indicators detected.';

  return { findings, attackChainSummary, recommendedActions };
}

export function generateTimeline(files: FileEntry[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  let eventId = 0;

  for (const file of files) {
    if (file.timestamps.created) {
      events.push({
        id: `evt-${++eventId}`,
        timestamp: file.timestamps.created,
        eventType: 'created',
        filePath: file.path,
        fileName: file.name,
        description: `File created: ${file.name}`,
        source: 'filesystem',
      });
    }
    if (file.timestamps.modified && file.timestamps.modified !== file.timestamps.created) {
      events.push({
        id: `evt-${++eventId}`,
        timestamp: file.timestamps.modified,
        eventType: 'modified',
        filePath: file.path,
        fileName: file.name,
        description: `File modified: ${file.name}`,
        source: 'filesystem',
      });
    }
    if (file.timestamps.accessed && file.timestamps.accessed !== file.timestamps.modified) {
      events.push({
        id: `evt-${++eventId}`,
        timestamp: file.timestamps.accessed,
        eventType: 'accessed',
        filePath: file.path,
        fileName: file.name,
        description: `File accessed: ${file.name}`,
        source: 'filesystem',
      });
    }
    if (file.isDeleted) {
      events.push({
        id: `evt-${++eventId}`,
        timestamp: file.timestamps.modified || file.timestamps.created,
        eventType: 'deleted',
        filePath: file.path,
        fileName: file.name,
        description: `File deleted: ${file.name}`,
        source: 'filesystem',
      });
    }
  }

  return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}
