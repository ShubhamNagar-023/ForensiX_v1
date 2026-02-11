import { useMemo, useState } from 'react';
import { useCaseStore } from '../../stores/caseStore';
import { generateTimeline } from '../../utils/fileAnalysis';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Clock, Download } from 'lucide-react';
import type { FileEntry } from '../../types';

export default function TimelineView() {
  const { activeCase, timelineEvents, setTimelineEvents, selectFile, addLog } = useCaseStore();
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [eventFilter, setEventFilter] = useState<string>('all');

  const allFiles = useMemo(() => {
    if (!activeCase) return [];
    const files: FileEntry[] = [];
    for (const ev of activeCase.evidence) {
      for (const part of ev.partitions || []) {
        const addFiles = (entries: FileEntry[]) => {
          for (const f of entries) { files.push(f); if (f.children) addFiles(f.children); }
        };
        addFiles(part.files);
      }
    }
    return files;
  }, [activeCase]);

  const events = useMemo(() => {
    if (timelineEvents.length > 0) return timelineEvents;
    if (allFiles.length === 0) return [];
    const generated = generateTimeline(allFiles);
    setTimelineEvents(generated);
    return generated;
  }, [allFiles, timelineEvents, setTimelineEvents]);

  const filteredEvents = useMemo(() => {
    if (eventFilter === 'all') return events;
    return events.filter(e => e.eventType === eventFilter);
  }, [events, eventFilter]);

  // Aggregate events by date for chart
  const chartData = useMemo(() => {
    const dateMap = new Map<string, { date: string; created: number; modified: number; accessed: number; deleted: number }>();
    for (const event of events) {
      const date = new Date(event.timestamp).toLocaleDateString();
      if (!dateMap.has(date)) {
        dateMap.set(date, { date, created: 0, modified: 0, accessed: 0, deleted: 0 });
      }
      const entry = dateMap.get(date)!;
      if (event.eventType === 'created') entry.created++;
      else if (event.eventType === 'modified') entry.modified++;
      else if (event.eventType === 'accessed') entry.accessed++;
      else if (event.eventType === 'deleted') entry.deleted++;
    }
    return Array.from(dateMap.values()).slice(-30); // Last 30 days
  }, [events]);

  const eventColors: Record<string, string> = {
    created: '#00ff41',
    modified: '#00ffff',
    accessed: '#ffea00',
    deleted: '#ff0051',
  };

  const exportTimeline = () => {
    const csv = 'Timestamp,Event Type,File Name,File Path,Description\n' +
      filteredEvents.map(e =>
        `"${e.timestamp}","${e.eventType}","${e.fileName}","${e.filePath}","${e.description}"`
      ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeline-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addLog({ level: 'INFO', category: 'Export', message: `Timeline exported (${filteredEvents.length} events)` });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="p-3 border-b border-border bg-bg-secondary flex items-center gap-3">
        <h2 className="font-display font-semibold text-accent-cyan text-sm flex items-center gap-2">
          <Clock className="w-4 h-4" /> Timeline Analysis
        </h2>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="bg-bg-tertiary border border-border rounded px-2 py-1 text-xs text-text-primary focus:border-accent-cyan focus:outline-none"
          >
            <option value="all">All Events ({events.length})</option>
            <option value="created">Created ({events.filter(e => e.eventType === 'created').length})</option>
            <option value="modified">Modified ({events.filter(e => e.eventType === 'modified').length})</option>
            <option value="accessed">Accessed ({events.filter(e => e.eventType === 'accessed').length})</option>
            <option value="deleted">Deleted ({events.filter(e => e.eventType === 'deleted').length})</option>
          </select>
          <div className="flex border border-border rounded overflow-hidden">
            <button
              className={`px-2 py-1 text-xs ${viewMode === 'chart' ? 'bg-accent-cyan/20 text-accent-cyan' : 'text-text-secondary hover:bg-bg-tertiary'}`}
              onClick={() => setViewMode('chart')}
            >
              Chart
            </button>
            <button
              className={`px-2 py-1 text-xs ${viewMode === 'table' ? 'bg-accent-cyan/20 text-accent-cyan' : 'text-text-secondary hover:bg-bg-tertiary'}`}
              onClick={() => setViewMode('table')}
            >
              Table
            </button>
          </div>
          <button className="btn-cyber text-xs" onClick={exportTimeline}>
            <Download className="w-3 h-3 inline mr-1" /> Export
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {events.length === 0 ? (
          <div className="text-center py-20 text-text-secondary">
            <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No timeline data available</p>
            <p className="text-xs mt-1">Add evidence and run analysis to generate timeline</p>
          </div>
        ) : viewMode === 'chart' ? (
          <div>
            {/* Chart */}
            <div className="card-cyber p-4 mb-4" style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3441" />
                  <XAxis dataKey="date" tick={{ fill: '#a0a0a0', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#a0a0a0', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: '#151922', border: '1px solid #2a3441', borderRadius: 4, fontSize: 11 }}
                    labelStyle={{ color: '#00ffff' }}
                  />
                  <Bar dataKey="created" fill="#00ff41" name="Created" />
                  <Bar dataKey="modified" fill="#00ffff" name="Modified" />
                  <Bar dataKey="accessed" fill="#ffea00" name="Accessed" />
                  <Bar dataKey="deleted" fill="#ff0051" name="Deleted" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mb-4 text-xs">
              {Object.entries(eventColors).map(([type, color]) => (
                <div key={type} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ background: color }} />
                  <span className="text-text-secondary capitalize">{type}</span>
                  <span className="text-text-primary">({events.filter(e => e.eventType === type).length})</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Table View */
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-bg-secondary z-10">
              <tr className="text-text-secondary border-b border-border">
                <th className="text-left p-2">Timestamp</th>
                <th className="text-left p-2">Event</th>
                <th className="text-left p-2">File</th>
                <th className="text-left p-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event) => (
                <tr key={event.id} className="border-b border-border/30 hover:bg-bg-tertiary cursor-pointer" onClick={() => {
                  const file = allFiles.find(f => f.path === event.filePath);
                  if (file) selectFile(file);
                }}>
                  <td className="p-2 font-mono text-text-secondary">{new Date(event.timestamp).toLocaleString()}</td>
                  <td className="p-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: `${eventColors[event.eventType]}20`, color: eventColors[event.eventType] }}>
                      {event.eventType}
                    </span>
                  </td>
                  <td className="p-2 text-text-primary">{event.fileName}</td>
                  <td className="p-2 text-text-secondary">{event.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-border bg-bg-secondary text-xs text-text-secondary flex items-center gap-4">
        <span>{filteredEvents.length} events</span>
        {events.length > 0 && (
          <>
            <span>Range: {new Date(events[0].timestamp).toLocaleDateString()} - {new Date(events[events.length - 1].timestamp).toLocaleDateString()}</span>
          </>
        )}
      </div>
    </div>
  );
}
