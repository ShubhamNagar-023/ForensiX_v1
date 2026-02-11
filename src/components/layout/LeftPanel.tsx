import { useState } from 'react';
import {
  ChevronDown, ChevronRight, HardDrive, File, Folder, FolderOpen,
  Search, Hash, Clock, FileText, Plus, AlertTriangle, Eye, Bookmark,
  StickyNote, Shield, Crosshair, Scan, Trash2
} from 'lucide-react';
import { useCaseStore } from '../../stores/caseStore';
import type { FileEntry, Partition } from '../../types';

interface Props {
  onAddEvidence: () => void;
}

interface TreeNodeProps {
  icon: React.ReactNode;
  label: string;
  badge?: number | string;
  badgeColor?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  isSpoofed?: boolean;
  indent?: number;
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
}

function TreeNode({ icon, label, badge, badgeColor, isActive, isDeleted, isSpoofed, indent = 0, expandable, expanded, onToggle, onClick }: TreeNodeProps) {
  return (
    <div
      className={`tree-item ${isActive ? 'active' : ''} ${isDeleted ? 'deleted' : ''} ${isSpoofed ? 'spoofed' : ''}`}
      style={{ paddingLeft: `${8 + indent * 16}px` }}
      onClick={(e) => {
        if (expandable && onToggle) {
          onToggle();
        }
        onClick?.();
        e.stopPropagation();
      }}
    >
      {expandable && (
        <span className="shrink-0 w-3">
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </span>
      )}
      <span className="shrink-0">{icon}</span>
      <span className="truncate flex-1">{label}</span>
      {badge !== undefined && (
        <span className={`text-[10px] px-1.5 rounded-full ${badgeColor || 'bg-bg-tertiary text-text-secondary'}`}>
          {badge}
        </span>
      )}
    </div>
  );
}

function FileTreeNode({ file, indent, onSelect }: { file: FileEntry; indent: number; onSelect: (f: FileEntry) => void }) {
  const [expanded, setExpanded] = useState(false);
  const { selectedFileEntry } = useCaseStore();
  const isDir = file.type === 'directory';
  const icon = isDir
    ? (expanded ? <FolderOpen className="w-3.5 h-3.5 text-accent-yellow" /> : <Folder className="w-3.5 h-3.5 text-accent-yellow" />)
    : <File className="w-3.5 h-3.5 text-text-secondary" />;

  return (
    <>
      <TreeNode
        icon={icon}
        label={file.name}
        indent={indent}
        isActive={selectedFileEntry?.id === file.id}
        isDeleted={file.isDeleted}
        isSpoofed={file.isSpoofed}
        expandable={isDir && (file.children?.length ?? 0) > 0}
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
        onClick={() => onSelect(file)}
        badge={file.isSpoofed ? '⚠️' : file.isDeleted ? '🗑️' : undefined}
      />
      {expanded && file.children?.map((child) => (
        <FileTreeNode key={child.id} file={child} indent={indent + 1} onSelect={onSelect} />
      ))}
    </>
  );
}

export default function LeftPanel({ onAddEvidence }: Props) {
  const { activeCase, selectFile, selectPartition, addTab } = useCaseStore();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    evidence: true,
    analysis: true,
    bookmarks: false,
    notes: false,
  });

  const toggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  if (!activeCase) return null;

  const handleFileSelect = (file: FileEntry) => {
    selectFile(file);
    addTab({ id: `file-${file.id}`, title: file.name, type: 'file-list', data: file });
  };

  const handlePartitionSelect = (partition: Partition) => {
    selectPartition(partition);
    addTab({ id: `partition-${partition.id}`, title: `Partition ${partition.number}`, type: 'file-list', data: partition });
  };

  const totalFiles = activeCase.evidence.reduce(
    (acc, e) => acc + (e.partitions?.reduce((a, p) => a + p.files.length, 0) ?? 0), 0
  );

  return (
    <div className="text-sm select-none">
      {/* Add Evidence Button */}
      <div className="p-2 border-b border-border">
        <button className="btn-cyber w-full text-center text-xs" onClick={onAddEvidence}>
          <Plus className="w-3 h-3 inline mr-1" /> Add Evidence
        </button>
      </div>

      {/* Evidence Tree */}
      <TreeNode
        icon={<HardDrive className="w-3.5 h-3.5 text-accent-cyan" />}
        label="Evidence"
        badge={activeCase.evidence.length}
        expandable
        expanded={expanded.evidence}
        onToggle={() => toggle('evidence')}
      />
      {expanded.evidence && (
        <>
          {activeCase.evidence.map((ev) => (
            <div key={ev.id}>
              <TreeNode
                icon={<HardDrive className="w-3.5 h-3.5 text-accent-green" />}
                label={ev.name}
                indent={1}
                expandable={!!ev.partitions?.length}
                expanded={!!expanded[`ev-${ev.id}`]}
                onToggle={() => toggle(`ev-${ev.id}`)}
                badge={ev.analysisStatus === 'analyzing' ? '⏳' : ev.analysisStatus === 'complete' ? '✅' : undefined}
              />
              {expanded[`ev-${ev.id}`] && ev.partitions?.map((part) => (
                <div key={part.id}>
                  <TreeNode
                    icon={<HardDrive className="w-3.5 h-3.5 text-accent-yellow" />}
                    label={`P${part.number}: ${part.filesystemType} (${(part.size / 1024 / 1024).toFixed(0)} MB)`}
                    indent={2}
                    expandable={part.files.length > 0}
                    expanded={!!expanded[`part-${part.id}`]}
                    onToggle={() => toggle(`part-${part.id}`)}
                    onClick={() => handlePartitionSelect(part)}
                    badge={part.files.length}
                    badgeColor={part.status === 'hidden' ? 'bg-accent-red/20 text-accent-red' : undefined}
                  />
                  {expanded[`part-${part.id}`] && part.files.map((file) => (
                    <FileTreeNode key={file.id} file={file} indent={3} onSelect={handleFileSelect} />
                  ))}
                </div>
              ))}
            </div>
          ))}
          {activeCase.evidence.length === 0 && (
            <div className="px-4 py-2 text-xs text-text-secondary italic">No evidence added</div>
          )}
        </>
      )}

      {/* Analysis Section */}
      <TreeNode
        icon={<Search className="w-3.5 h-3.5 text-accent-cyan" />}
        label="Analysis"
        badge={totalFiles > 0 ? totalFiles : undefined}
        expandable
        expanded={expanded.analysis}
        onToggle={() => toggle('analysis')}
      />
      {expanded.analysis && (
        <>
          <TreeNode
            icon={<FileText className="w-3.5 h-3.5 text-text-secondary" />}
            label="Strings"
            indent={1}
            onClick={() => addTab({ id: 'strings', title: 'String Analysis', type: 'search' })}
          />
          <TreeNode
            icon={<Hash className="w-3.5 h-3.5 text-text-secondary" />}
            label="Hashes"
            indent={1}
            onClick={() => addTab({ id: 'hashes', title: 'Hash Verification', type: 'search' })}
          />
          <TreeNode
            icon={<Clock className="w-3.5 h-3.5 text-text-secondary" />}
            label="Timeline"
            indent={1}
            onClick={() => addTab({ id: 'timeline', title: 'Timeline Analysis', type: 'timeline' })}
          />
          <TreeNode
            icon={<Eye className="w-3.5 h-3.5 text-text-secondary" />}
            label="Spoofing Detection"
            indent={1}
            onClick={() => addTab({ id: 'spoofing', title: 'File Spoofing', type: 'file-list' })}
          />
          <TreeNode
            icon={<AlertTriangle className="w-3.5 h-3.5 text-text-secondary" />}
            label="Deleted Files"
            indent={1}
            onClick={() => addTab({ id: 'deleted', title: 'Deleted Files', type: 'file-list' })}
          />
          <TreeNode
            icon={<Scan className="w-3.5 h-3.5 text-text-secondary" />}
            label="Sector Scan"
            indent={1}
            onClick={() => addTab({ id: 'sector-scan', title: 'Sector Scan', type: 'sector-scan' })}
          />
          <TreeNode
            icon={<Shield className="w-3.5 h-3.5 text-text-secondary" />}
            label="CIA Assessment"
            indent={1}
            onClick={() => addTab({ id: 'cia', title: 'CIA Assessment', type: 'cia-assessment' })}
          />
          <TreeNode
            icon={<Crosshair className="w-3.5 h-3.5 text-text-secondary" />}
            label="MITRE ATT&CK"
            indent={1}
            onClick={() => addTab({ id: 'mitre', title: 'MITRE ATT&CK', type: 'mitre-attack' })}
          />
          <TreeNode
            icon={<FileText className="w-3.5 h-3.5 text-text-secondary" />}
            label="Reports"
            indent={1}
            onClick={() => addTab({ id: 'reports', title: 'Reports', type: 'report' })}
          />
          <TreeNode
            icon={<Trash2 className="w-3.5 h-3.5 text-text-secondary" />}
            label="Logs"
            indent={1}
            onClick={() => addTab({ id: 'logs', title: 'Analysis Logs', type: 'logs' })}
          />
        </>
      )}

      {/* Bookmarks */}
      <TreeNode
        icon={<Bookmark className="w-3.5 h-3.5 text-accent-yellow" />}
        label="Bookmarks"
        badge={activeCase.bookmarks.length || undefined}
        expandable
        expanded={expanded.bookmarks}
        onToggle={() => toggle('bookmarks')}
      />
      {expanded.bookmarks && (
        activeCase.bookmarks.length === 0 ? (
          <div className="px-4 py-2 text-xs text-text-secondary italic">No bookmarks</div>
        ) : (
          activeCase.bookmarks.map((bm) => (
            <TreeNode
              key={bm.id}
              icon={<Bookmark className="w-3.5 h-3.5 text-accent-yellow" />}
              label={bm.name}
              indent={1}
            />
          ))
        )
      )}

      {/* Notes */}
      <TreeNode
        icon={<StickyNote className="w-3.5 h-3.5 text-accent-green" />}
        label="Notes"
        badge={activeCase.notes.length || undefined}
        expandable
        expanded={expanded.notes}
        onToggle={() => toggle('notes')}
      />
      {expanded.notes && (
        activeCase.notes.length === 0 ? (
          <div className="px-4 py-2 text-xs text-text-secondary italic">No notes</div>
        ) : (
          activeCase.notes.map((note) => (
            <TreeNode
              key={note.id}
              icon={<StickyNote className="w-3.5 h-3.5 text-accent-green" />}
              label={note.content.substring(0, 30) + (note.content.length > 30 ? '...' : '')}
              indent={1}
            />
          ))
        )
      )}
    </div>
  );
}
