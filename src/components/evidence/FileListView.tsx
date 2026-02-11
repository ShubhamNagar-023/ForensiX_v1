import { useCaseStore } from '../../stores/caseStore';
import { File, Folder, AlertTriangle, Eye, Trash2, Search } from 'lucide-react';
import { formatBytes } from '../../utils/diskAnalysis';
import { useState, useMemo } from 'react';
import type { FileEntry } from '../../types';

export default function FileListView() {
  const { activeCase, selectedFileEntry, selectFile, activeTabId } = useCaseStore();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'deleted' | 'spoofed' | 'hidden'>('all');
  const [sortField, setSortField] = useState<'name' | 'size' | 'type' | 'modified'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

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

  const filteredFiles = useMemo(() => {
    let result = allFiles;
    
    // Apply tab-specific filters
    if (activeTabId === 'deleted') {
      result = result.filter(f => f.isDeleted);
    } else if (activeTabId === 'spoofing') {
      result = result.filter(f => f.isSpoofed);
    }

    // Apply user filters
    if (filterType === 'deleted') result = result.filter(f => f.isDeleted);
    else if (filterType === 'spoofed') result = result.filter(f => f.isSpoofed);
    else if (filterType === 'hidden') result = result.filter(f => f.isHidden);

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(f => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q));
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'size': cmp = a.size - b.size; break;
        case 'type': cmp = (a.actualType || a.extension).localeCompare(b.actualType || b.extension); break;
        case 'modified': cmp = (new Date(a.timestamps?.modified || 0).getTime()) - (new Date(b.timestamps?.modified || 0).getTime()); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [allFiles, search, filterType, sortField, sortDir, activeTabId]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  if (!activeCase) return null;

  const title = activeTabId === 'deleted' ? 'Deleted Files' : activeTabId === 'spoofing' ? 'Spoofed Files' : 'All Files';
  const deletedCount = allFiles.filter(f => f.isDeleted).length;
  const spoofedCount = allFiles.filter(f => f.isSpoofed).length;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="p-3 border-b border-border bg-bg-secondary flex items-center gap-3">
        <h2 className="font-display font-semibold text-accent-cyan text-sm">{title}</h2>
        <div className="flex-1 relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter files..."
            className="w-full bg-bg-tertiary border border-border rounded pl-8 pr-3 py-1.5 text-xs text-text-primary focus:border-accent-cyan focus:outline-none"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as typeof filterType)}
          className="bg-bg-tertiary border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:border-accent-cyan focus:outline-none"
        >
          <option value="all">All ({allFiles.length})</option>
          <option value="deleted">Deleted ({deletedCount})</option>
          <option value="spoofed">Spoofed ({spoofedCount})</option>
          <option value="hidden">Hidden ({allFiles.filter(f => f.isHidden).length})</option>
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {filteredFiles.length === 0 ? (
          <div className="text-center py-20 text-text-secondary">
            <File className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No files to display</p>
            <p className="text-xs mt-1">Add evidence and run analysis to see files</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-bg-secondary z-10">
              <tr className="text-text-secondary border-b border-border">
                <th className="text-left p-2 w-8"></th>
                <th className="text-left p-2 cursor-pointer hover:text-accent-cyan" onClick={() => handleSort('name')}>
                  Name {sortField === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left p-2 cursor-pointer hover:text-accent-cyan" onClick={() => handleSort('size')}>
                  Size {sortField === 'size' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left p-2 cursor-pointer hover:text-accent-cyan" onClick={() => handleSort('type')}>
                  Type {sortField === 'type' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left p-2 cursor-pointer hover:text-accent-cyan" onClick={() => handleSort('modified')}>
                  Modified {sortField === 'modified' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map((file) => (
                <tr
                  key={file.id}
                  onClick={() => selectFile(file)}
                  className={`border-b border-border/30 cursor-pointer transition-colors ${
                    selectedFileEntry?.id === file.id ? 'bg-accent-cyan/10' : 'hover:bg-bg-tertiary'
                  } ${file.isDeleted ? 'opacity-70' : ''}`}
                >
                  <td className="p-2">
                    {file.type === 'directory'
                      ? <Folder className="w-4 h-4 text-accent-yellow" />
                      : <File className={`w-4 h-4 ${file.isSpoofed ? 'text-accent-red' : 'text-text-secondary'}`} />}
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-1">
                      <span className={`${file.isSpoofed ? 'text-accent-red' : file.isDeleted ? 'text-accent-yellow' : 'text-text-primary'}`}>
                        {file.name}
                      </span>
                      {file.isSpoofed && <AlertTriangle className="w-3 h-3 text-accent-red" title="Spoofed file" />}
                    </div>
                  </td>
                  <td className="p-2 text-text-secondary">{formatBytes(file.size)}</td>
                  <td className="p-2 text-text-secondary">{file.actualType || file.extension || 'Unknown'}</td>
                  <td className="p-2 text-text-secondary">{new Date(file.timestamps.modified).toLocaleDateString()}</td>
                  <td className="p-2">
                    <div className="flex gap-1">
                      {file.isDeleted && <span className="badge badge-critical"><Trash2 className="w-2.5 h-2.5" /></span>}
                      {file.isSpoofed && <span className="badge badge-critical"><Eye className="w-2.5 h-2.5" /></span>}
                      {file.isHidden && <span className="badge badge-medium">H</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer stats */}
      <div className="p-2 border-t border-border bg-bg-secondary text-xs text-text-secondary flex items-center gap-4">
        <span>{filteredFiles.length} files</span>
        {deletedCount > 0 && <span className="text-accent-yellow">{deletedCount} deleted</span>}
        {spoofedCount > 0 && <span className="text-accent-red">{spoofedCount} spoofed</span>}
      </div>
    </div>
  );
}
