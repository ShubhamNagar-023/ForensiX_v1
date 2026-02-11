import { useCaseStore } from '../../stores/caseStore';
import {
  File, Shield, AlertTriangle, BookmarkPlus,
  StickyNote, Tag, Eye, Clock, Download, Play
} from 'lucide-react';
import { useState } from 'react';
import { formatBytes } from '../../utils/diskAnalysis';

export default function RightPanel() {
  const { selectedFileEntry, activeCase, addBookmark, addNote, addLog } = useCaseStore();
  const [noteText, setNoteText] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  if (!activeCase) return null;

  // If a file is selected, show file details
  if (selectedFileEntry) {
    const file = selectedFileEntry;
    return (
      <div className="p-3 text-sm space-y-4">
        {/* File Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <File className={`w-5 h-5 ${file.isSpoofed ? 'text-accent-red' : file.isDeleted ? 'text-accent-yellow' : 'text-accent-cyan'}`} />
            <h3 className="font-display font-semibold text-text-primary truncate">{file.name}</h3>
          </div>
          {file.isSpoofed && (
            <div className="p-2 bg-accent-red/10 border border-accent-red/30 rounded text-xs text-accent-red flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <div>
                <div className="font-semibold">⚠️ FILE SPOOFING DETECTED</div>
                <div>Extension: {file.extension} | Actual: {file.actualType}</div>
                <div>Risk: {file.riskLevel}</div>
              </div>
            </div>
          )}
          {file.isDeleted && (
            <div className="p-2 bg-accent-yellow/10 border border-accent-yellow/30 rounded text-xs text-accent-yellow flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Deleted file {file.recoverability !== undefined ? `(${file.recoverability}% recoverable)` : ''}</span>
            </div>
          )}
        </div>

        {/* File Properties */}
        <div className="card-cyber p-3">
          <h4 className="text-xs font-display font-semibold text-accent-cyan uppercase tracking-wider mb-2">Properties</h4>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-text-secondary">Path</span>
              <span className="text-text-primary truncate ml-2 max-w-[60%] text-right">{file.path}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Size</span>
              <span className="text-text-primary">{formatBytes(file.size)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Extension</span>
              <span className="text-text-primary">{file.extension || 'None'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Type</span>
              <span className="text-text-primary">{file.actualType || 'Unknown'}</span>
            </div>
            {file.magicBytes && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Magic Bytes</span>
                <span className="text-text-primary font-mono text-[10px]">{file.magicBytes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Timestamps */}
        <div className="card-cyber p-3">
          <h4 className="text-xs font-display font-semibold text-accent-cyan uppercase tracking-wider mb-2 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Timestamps
          </h4>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-text-secondary">Created</span>
              <span className="text-text-primary">{file.timestamps.created ? new Date(file.timestamps.created).toLocaleString() : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Modified</span>
              <span className="text-text-primary">{file.timestamps.modified ? new Date(file.timestamps.modified).toLocaleString() : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Accessed</span>
              <span className="text-text-primary">{file.timestamps.accessed ? new Date(file.timestamps.accessed).toLocaleString() : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Analysis Results */}
        {file.analysisResults && (
          <div className="card-cyber p-3">
            <h4 className="text-xs font-display font-semibold text-accent-cyan uppercase tracking-wider mb-2 flex items-center gap-1">
              <Eye className="w-3 h-3" /> Analysis Results
            </h4>
            {file.analysisResults.hashes && (
              <div className="space-y-1 text-xs mb-2">
                <div>
                  <span className="text-text-secondary">MD5: </span>
                  <span className="text-text-primary font-mono text-[10px] break-all">{file.analysisResults.hashes.md5}</span>
                </div>
                <div>
                  <span className="text-text-secondary">SHA256: </span>
                  <span className="text-text-primary font-mono text-[10px] break-all">{file.analysisResults.hashes.sha256}</span>
                </div>
              </div>
            )}
            {file.analysisResults.strings && (
              <div className="text-xs text-text-secondary">
                {file.analysisResults.strings.totalCount} strings extracted
                {file.analysisResults.strings.urls.length > 0 && `, ${file.analysisResults.strings.urls.length} URLs`}
                {file.analysisResults.strings.emails.length > 0 && `, ${file.analysisResults.strings.emails.length} emails`}
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="card-cyber p-3">
          <h4 className="text-xs font-display font-semibold text-accent-cyan uppercase tracking-wider mb-2">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-cyber text-xs" onClick={() => {
              addBookmark({
                itemId: file.id,
                itemType: 'file',
                name: file.name,
                note: '',
                tags: [],
              });
              addLog({ level: 'INFO', category: 'Bookmark', message: `Bookmarked: ${file.name}` });
            }}>
              <BookmarkPlus className="w-3 h-3 inline mr-1" /> Bookmark
            </button>
            <button className="btn-cyber text-xs" onClick={() => setShowNoteInput(!showNoteInput)}>
              <StickyNote className="w-3 h-3 inline mr-1" /> Add Note
            </button>
            <button className="btn-cyber text-xs">
              <Download className="w-3 h-3 inline mr-1" /> Export
            </button>
            <button className="btn-cyber text-xs">
              <Play className="w-3 h-3 inline mr-1" /> Analyze
            </button>
          </div>
          {showNoteInput && (
            <div className="mt-2">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add investigator note..."
                className="w-full bg-bg-tertiary border border-border rounded px-2 py-1 text-xs text-text-primary focus:border-accent-cyan focus:outline-none h-16 resize-none"
              />
              <button
                className="btn-cyber text-xs mt-1 w-full"
                onClick={() => {
                  if (noteText.trim()) {
                    addNote({
                      content: noteText.trim(),
                      author: activeCase.metadata.leadInvestigator,
                      relatedItemId: file.id,
                      relatedItemType: 'file',
                    });
                    setNoteText('');
                    setShowNoteInput(false);
                    addLog({ level: 'INFO', category: 'Notes', message: `Note added for: ${file.name}` });
                  }
                }}
              >
                Save Note
              </button>
            </div>
          )}
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-1.5">
          {file.isDeleted && <span className="badge badge-critical">Deleted</span>}
          {file.isHidden && <span className="badge badge-medium">Hidden</span>}
          {file.isSpoofed && <span className="badge badge-critical">Spoofed</span>}
          {file.riskLevel && <span className={`badge badge-${file.riskLevel.toLowerCase()}`}>{file.riskLevel}</span>}
        </div>
      </div>
    );
  }

  // Default: Case summary
  return (
    <div className="p-3 text-sm space-y-4">
      <div className="card-cyber p-3">
        <h4 className="text-xs font-display font-semibold text-accent-cyan uppercase tracking-wider mb-2 flex items-center gap-1">
          <Shield className="w-3 h-3" /> Case Info
        </h4>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-text-secondary">Case</span>
            <span className="text-text-primary">{activeCase.metadata.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Status</span>
            <span className={`badge badge-${activeCase.metadata.status.toLowerCase().replace(' ', '-')}`}>
              {activeCase.metadata.status}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Evidence</span>
            <span className="text-text-primary">{activeCase.evidence.length} items</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Bookmarks</span>
            <span className="text-text-primary">{activeCase.bookmarks.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Notes</span>
            <span className="text-text-primary">{activeCase.notes.length}</span>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="card-cyber p-3">
        <h4 className="text-xs font-display font-semibold text-accent-cyan uppercase tracking-wider mb-2 flex items-center gap-1">
          <StickyNote className="w-3 h-3" /> Investigator Notes
        </h4>
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Add investigator note..."
          className="w-full bg-bg-tertiary border border-border rounded px-2 py-1 text-xs text-text-primary focus:border-accent-cyan focus:outline-none h-20 resize-none mb-2"
        />
        <button
          className="btn-cyber text-xs w-full"
          onClick={() => {
            if (noteText.trim()) {
              addNote({
                content: noteText.trim(),
                author: activeCase.metadata.leadInvestigator,
              });
              setNoteText('');
              addLog({ level: 'INFO', category: 'Notes', message: 'Note added to case' });
            }
          }}
        >
          Save Note
        </button>
        {activeCase.notes.length > 0 && (
          <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
            {activeCase.notes.slice().reverse().map((note) => (
              <div key={note.id} className="p-2 bg-bg-tertiary rounded text-xs">
                <div className="flex justify-between text-text-secondary mb-1">
                  <span>{note.author}</span>
                  <span>{new Date(note.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-text-primary">{note.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tags */}
      {activeCase.metadata.tags.length > 0 && (
        <div className="card-cyber p-3">
          <h4 className="text-xs font-display font-semibold text-accent-cyan uppercase tracking-wider mb-2 flex items-center gap-1">
            <Tag className="w-3 h-3" /> Tags
          </h4>
          <div className="flex flex-wrap gap-1">
            {activeCase.metadata.tags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-bg-tertiary rounded text-xs text-text-secondary">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-text-secondary text-center py-2">
        Select a file to view details
      </div>
    </div>
  );
}
