import { useState } from 'react';
import { X, Shield } from 'lucide-react';
import { useCaseStore } from '../../stores/caseStore';

interface Props {
  onClose: () => void;
}

export default function NewCaseDialog({ onClose }: Props) {
  const { createCase, addLog } = useCaseStore();
  const [form, setForm] = useState({
    name: '',
    caseNumber: '',
    leadInvestigator: '',
    description: '',
    status: 'Active' as const,
    priority: 'Medium' as const,
    tags: '',
    evidenceCustodian: '',
    teamMembers: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.leadInvestigator.trim()) return;

    createCase({
      name: form.name.trim(),
      caseNumber: form.caseNumber.trim() || `CASE-${Date.now().toString(36).toUpperCase()}`,
      leadInvestigator: form.leadInvestigator.trim(),
      description: form.description.trim(),
      status: form.status,
      priority: form.priority,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      evidenceCustodian: form.evidenceCustodian.trim(),
      teamMembers: form.teamMembers.split(',').map((t) => t.trim()).filter(Boolean),
      relatedCases: [],
    });

    addLog({
      level: 'INFO',
      category: 'Case Management',
      message: `Case "${form.name}" created successfully`,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="card-cyber w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent-cyan" />
            <h2 className="text-lg font-display font-bold text-accent-cyan">New Forensic Case</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-bg-tertiary rounded">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Case Name <span className="text-accent-red">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-bg-tertiary border border-border rounded px-3 py-2 text-sm text-text-primary focus:border-accent-cyan focus:outline-none"
              placeholder="e.g., Laptop Seizure Investigation 2024"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Case Number</label>
              <input
                type="text"
                value={form.caseNumber}
                onChange={(e) => setForm({ ...form, caseNumber: e.target.value })}
                className="w-full bg-bg-tertiary border border-border rounded px-3 py-2 text-sm text-text-primary focus:border-accent-cyan focus:outline-none"
                placeholder="Auto-generated"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as typeof form.priority })}
                className="w-full bg-bg-tertiary border border-border rounded px-3 py-2 text-sm text-text-primary focus:border-accent-cyan focus:outline-none"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Lead Investigator <span className="text-accent-red">*</span>
            </label>
            <input
              type="text"
              value={form.leadInvestigator}
              onChange={(e) => setForm({ ...form, leadInvestigator: e.target.value })}
              className="w-full bg-bg-tertiary border border-border rounded px-3 py-2 text-sm text-text-primary focus:border-accent-cyan focus:outline-none"
              placeholder="Investigator name"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Evidence Custodian</label>
            <input
              type="text"
              value={form.evidenceCustodian}
              onChange={(e) => setForm({ ...form, evidenceCustodian: e.target.value })}
              className="w-full bg-bg-tertiary border border-border rounded px-3 py-2 text-sm text-text-primary focus:border-accent-cyan focus:outline-none"
              placeholder="Custodian name"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Team Members</label>
            <input
              type="text"
              value={form.teamMembers}
              onChange={(e) => setForm({ ...form, teamMembers: e.target.value })}
              className="w-full bg-bg-tertiary border border-border rounded px-3 py-2 text-sm text-text-primary focus:border-accent-cyan focus:outline-none"
              placeholder="Comma-separated names"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-bg-tertiary border border-border rounded px-3 py-2 text-sm text-text-primary focus:border-accent-cyan focus:outline-none h-20 resize-none"
              placeholder="Brief case description..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Tags</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="w-full bg-bg-tertiary border border-border rounded px-3 py-2 text-sm text-text-primary focus:border-accent-cyan focus:outline-none"
              placeholder="malware, usb, laptop (comma-separated)"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-cyber filled flex-1">Create Case</button>
            <button type="button" onClick={onClose} className="btn-cyber danger flex-1">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
