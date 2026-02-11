import { useState, useMemo } from 'react';
import { Search, FileText, Globe, Mail, Wifi } from 'lucide-react';
import { useCaseStore } from '../../stores/caseStore';
import type { FileEntry } from '../../types';

export default function SearchView() {
  const { activeCase, selectFile, addLog } = useCaseStore();
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'keyword' | 'regex'>('keyword');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [results, setResults] = useState<{ file: FileEntry; matches: string[] }[]>([]);
  const [searched, setSearched] = useState(false);

  const allFiles = useMemo(() => {
    if (!activeCase) return [];
    const files: FileEntry[] = [];
    for (const ev of activeCase.evidence) {
      for (const part of ev.partitions || []) {
        const addFiles = (entries: FileEntry[]) => {
          for (const f of entries) {
            files.push(f);
            if (f.children) addFiles(f.children);
          }
        };
        addFiles(part.files);
      }
    }
    return files;
  }, [activeCase]);

  // Aggregate string analysis results
  const allUrls = useMemo(() => {
    const urls = new Set<string>();
    allFiles.forEach(f => f.analysisResults?.strings?.urls.forEach(u => urls.add(u)));
    return Array.from(urls);
  }, [allFiles]);

  const allEmails = useMemo(() => {
    const emails = new Set<string>();
    allFiles.forEach(f => f.analysisResults?.strings?.emails.forEach(e => emails.add(e)));
    return Array.from(emails);
  }, [allFiles]);

  const allIPs = useMemo(() => {
    const ips = new Set<string>();
    allFiles.forEach(f => f.analysisResults?.strings?.ipAddresses.forEach(ip => ips.add(ip)));
    return Array.from(ips);
  }, [allFiles]);

  const handleSearch = () => {
    if (!query.trim()) return;
    const q = caseSensitive ? query : query.toLowerCase();
    const searchResults: typeof results = [];

    for (const file of allFiles) {
      const matches: string[] = [];
      const name = caseSensitive ? file.name : file.name.toLowerCase();
      const path = caseSensitive ? file.path : file.path.toLowerCase();

      if (searchType === 'keyword') {
        if (name.includes(q)) matches.push(`Filename match: ${file.name}`);
        if (path.includes(q)) matches.push(`Path match: ${file.path}`);
        if (file.actualType && (caseSensitive ? file.actualType : file.actualType.toLowerCase()).includes(q)) {
          matches.push(`Type match: ${file.actualType}`);
        }
        // Search in extracted strings
        if (file.analysisResults?.strings) {
          const strings = file.analysisResults.strings;
          const stringMatches = strings.asciiStrings.filter(s =>
            (caseSensitive ? s : s.toLowerCase()).includes(q)
          );
          if (stringMatches.length > 0) {
            matches.push(`${stringMatches.length} string match(es)`);
          }
        }
      } else {
        try {
          const regex = new RegExp(query, caseSensitive ? 'g' : 'gi');
          if (regex.test(file.name)) matches.push(`Filename regex match: ${file.name}`);
          if (file.analysisResults?.strings) {
            const count = file.analysisResults.strings.asciiStrings.filter(s => regex.test(s)).length;
            if (count > 0) matches.push(`${count} string regex match(es)`);
          }
        } catch {
          // Invalid regex
        }
      }

      if (matches.length > 0) searchResults.push({ file, matches });
    }

    setResults(searchResults);
    setSearched(true);
    addLog({
      level: 'INFO',
      category: 'Search',
      message: `Search "${query}": ${searchResults.length} results across ${allFiles.length} files`,
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-4 border-b border-border bg-bg-secondary space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search files, strings, content..."
              className="w-full bg-bg-tertiary border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary focus:border-accent-cyan focus:outline-none"
            />
          </div>
          <button className="btn-cyber filled" onClick={handleSearch}>Search</button>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <label className="flex items-center gap-1.5 text-text-secondary cursor-pointer">
            <input
              type="radio"
              checked={searchType === 'keyword'}
              onChange={() => setSearchType('keyword')}
              className="accent-accent-cyan"
            />
            Keyword
          </label>
          <label className="flex items-center gap-1.5 text-text-secondary cursor-pointer">
            <input
              type="radio"
              checked={searchType === 'regex'}
              onChange={() => setSearchType('regex')}
              className="accent-accent-cyan"
            />
            Regex
          </label>
          <label className="flex items-center gap-1.5 text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              className="accent-accent-cyan"
            />
            Case Sensitive
          </label>
        </div>
      </div>

      {/* Results / Extracted Data */}
      <div className="flex-1 overflow-auto p-4">
        {searched && (
          <div className="mb-4">
            <h3 className="text-sm font-display font-semibold text-accent-cyan mb-2">
              Search Results ({results.length})
            </h3>
            {results.length === 0 ? (
              <p className="text-text-secondary text-sm">No results found for "{query}"</p>
            ) : (
              <div className="space-y-2">
                {results.map(({ file, matches }) => (
                  <div
                    key={file.id}
                    className="card-cyber p-3 cursor-pointer hover:glow-cyan"
                    onClick={() => selectFile(file)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-accent-cyan" />
                      <span className="text-text-primary text-sm font-medium">{file.name}</span>
                      <span className="text-text-secondary text-xs">{file.path}</span>
                    </div>
                    <div className="text-xs text-text-secondary space-y-0.5">
                      {matches.map((m, i) => (
                        <div key={i}>• {m}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Extracted Data Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card-cyber p-3">
            <h4 className="text-xs font-display font-semibold text-accent-cyan uppercase tracking-wider mb-2 flex items-center gap-1">
              <Globe className="w-3 h-3" /> URLs ({allUrls.length})
            </h4>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {allUrls.length === 0 ? (
                <p className="text-text-secondary text-xs">No URLs extracted</p>
              ) : (
                allUrls.map((url, i) => (
                  <div key={i} className="text-xs text-accent-cyan font-mono break-all">{url}</div>
                ))
              )}
            </div>
          </div>
          <div className="card-cyber p-3">
            <h4 className="text-xs font-display font-semibold text-accent-cyan uppercase tracking-wider mb-2 flex items-center gap-1">
              <Mail className="w-3 h-3" /> Emails ({allEmails.length})
            </h4>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {allEmails.length === 0 ? (
                <p className="text-text-secondary text-xs">No emails extracted</p>
              ) : (
                allEmails.map((email, i) => (
                  <div key={i} className="text-xs text-accent-green font-mono">{email}</div>
                ))
              )}
            </div>
          </div>
          <div className="card-cyber p-3">
            <h4 className="text-xs font-display font-semibold text-accent-cyan uppercase tracking-wider mb-2 flex items-center gap-1">
              <Wifi className="w-3 h-3" /> IP Addresses ({allIPs.length})
            </h4>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {allIPs.length === 0 ? (
                <p className="text-text-secondary text-xs">No IPs extracted</p>
              ) : (
                allIPs.map((ip, i) => (
                  <div key={i} className="text-xs text-accent-yellow font-mono">{ip}</div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
