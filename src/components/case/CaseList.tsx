import { Plus, Search, FolderOpen, Calendar, User, Tag, HardDrive } from 'lucide-react';
import { useCaseStore } from '../../stores/caseStore';
import { useState } from 'react';

interface Props {
  onNewCase: () => void;
}

export default function CaseList({ onNewCase }: Props) {
  const { cases, openCase } = useCaseStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = cases.filter((c) => {
    const matchesSearch = c.metadata.name.toLowerCase().includes(search.toLowerCase()) ||
      c.metadata.caseNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.metadata.leadInvestigator.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.metadata.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="h-full bg-bg-primary flex flex-col">
      {/* Header */}
      <div className="p-8 text-center">
        <h1 className="text-4xl font-display font-bold text-accent-cyan text-glow-cyan mb-2">ForensicX</h1>
        <p className="text-text-secondary text-sm">Professional Disk Forensics Platform</p>
      </div>

      {/* Controls */}
      <div className="px-8 pb-4 flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cases..."
            className="w-full bg-bg-secondary border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary focus:border-accent-cyan focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-accent-cyan focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="Active">Active</option>
          <option value="Under Review">Under Review</option>
          <option value="Closed">Closed</option>
          <option value="Archived">Archived</option>
        </select>
        <button className="btn-cyber filled" onClick={onNewCase}>
          <Plus className="w-4 h-4 inline mr-1" /> New Case
        </button>
      </div>

      {/* Case Grid */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <FolderOpen className="w-16 h-16 mx-auto text-border mb-4" />
            <h3 className="text-lg text-text-secondary mb-2">
              {cases.length === 0 ? 'No cases yet' : 'No matching cases'}
            </h3>
            <p className="text-sm text-text-secondary mb-6">
              {cases.length === 0
                ? 'Create your first forensic case to get started'
                : 'Try adjusting your search or filters'}
            </p>
            {cases.length === 0 && (
              <button className="btn-cyber filled" onClick={onNewCase}>
                <Plus className="w-4 h-4 inline mr-1" /> Create First Case
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c) => (
              <button
                key={c.metadata.id}
                onClick={() => openCase(c.metadata.id)}
                className="card-cyber p-4 text-left hover:glow-cyan transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-display font-semibold text-text-primary group-hover:text-accent-cyan transition-colors truncate pr-2">
                    {c.metadata.name}
                  </h3>
                  <span className={`badge badge-${c.metadata.status.toLowerCase().replace(' ', '-')} shrink-0`}>
                    {c.metadata.status}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mb-3 line-clamp-2">
                  {c.metadata.description || 'No description'}
                </p>
                <div className="space-y-1.5 text-xs text-text-secondary">
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3" />
                    <span>{c.metadata.leadInvestigator}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(c.metadata.dateCreated).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-3 h-3" />
                    <span>{c.evidence.length} evidence items</span>
                  </div>
                  {c.metadata.tags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <Tag className="w-3 h-3 shrink-0" />
                      {c.metadata.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 bg-bg-tertiary rounded text-[10px]">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className={`badge badge-${c.metadata.priority.toLowerCase()}`}>
                    {c.metadata.priority}
                  </span>
                  <span className="text-text-secondary">{c.metadata.caseNumber}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
