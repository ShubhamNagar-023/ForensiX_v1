import { Shield, Settings, User, FolderOpen, Plus, ChevronDown } from 'lucide-react';
import { useCaseStore } from '../../stores/caseStore';
import { useState } from 'react';

export default function TopNav({ onNewCase, onOpenCase }: { onNewCase: () => void; onOpenCase: () => void }) {
  const { activeCase, cases, openCase } = useCaseStore();
  const [showCaseDropdown, setShowCaseDropdown] = useState(false);

  return (
    <div className="h-12 bg-bg-secondary border-b border-border flex items-center px-4 gap-4 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <Shield className="w-6 h-6 text-accent-cyan" />
        <span className="text-lg font-display font-bold text-accent-cyan text-glow-cyan tracking-wider">
          ForensicX
        </span>
      </div>

      <div className="w-px h-6 bg-border mx-2" />

      {/* Case Selector */}
      <div className="relative">
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded bg-bg-tertiary border border-border hover:border-accent-cyan/30 transition-colors text-sm"
          onClick={() => setShowCaseDropdown(!showCaseDropdown)}
        >
          <FolderOpen className="w-4 h-4 text-accent-cyan" />
          <span className="text-text-primary max-w-[200px] truncate">
            {activeCase ? activeCase.metadata.name : 'No Case Open'}
          </span>
          <ChevronDown className="w-3 h-3 text-text-secondary" />
        </button>

        {showCaseDropdown && (
          <div className="absolute top-full left-0 mt-1 w-72 bg-bg-secondary border border-border rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="p-2 border-b border-border">
              <button className="btn-cyber w-full text-center" onClick={() => { onNewCase(); setShowCaseDropdown(false); }}>
                <Plus className="w-3 h-3 inline mr-1" /> New Case
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {cases.length === 0 ? (
                <div className="p-4 text-center text-text-secondary text-sm">No cases yet</div>
              ) : (
                cases.map((c) => (
                  <button
                    key={c.metadata.id}
                    className={`w-full text-left px-3 py-2 hover:bg-bg-tertiary transition-colors text-sm ${
                      activeCase?.metadata.id === c.metadata.id ? 'bg-bg-tertiary text-accent-cyan' : 'text-text-primary'
                    }`}
                    onClick={() => { openCase(c.metadata.id); setShowCaseDropdown(false); }}
                  >
                    <div className="font-medium truncate">{c.metadata.name}</div>
                    <div className="text-xs text-text-secondary flex items-center gap-2">
                      <span className={`badge badge-${c.metadata.status.toLowerCase().replace(' ', '-')}`}>
                        {c.metadata.status}
                      </span>
                      <span>{c.evidence.length} evidence items</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Status indicator */}
      {activeCase && (
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span className={`badge badge-${activeCase.metadata.status.toLowerCase().replace(' ', '-')}`}>
            {activeCase.metadata.status}
          </span>
          <span>{activeCase.metadata.leadInvestigator}</span>
        </div>
      )}

      {/* Actions */}
      <button className="btn-cyber" onClick={onOpenCase}>
        <FolderOpen className="w-3.5 h-3.5 inline mr-1" /> Open
      </button>
      <button
        className="p-2 rounded hover:bg-bg-tertiary transition-colors text-text-secondary hover:text-text-primary"
        title="Settings"
      >
        <Settings className="w-4 h-4" />
      </button>
      <button
        className="p-2 rounded hover:bg-bg-tertiary transition-colors text-text-secondary hover:text-text-primary"
        title="User"
      >
        <User className="w-4 h-4" />
      </button>
    </div>
  );
}
