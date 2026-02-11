import { X } from 'lucide-react';
import { useCaseStore } from '../../stores/caseStore';
import CaseDashboard from '../case/CaseDashboard';
import FileListView from '../evidence/FileListView';
import HexViewer from '../hex/HexViewer';
import TimelineView from '../timeline/TimelineView';
import SearchView from '../analysis/SearchView';
import LogViewer from '../analysis/LogViewer';
import ReportView from '../reports/ReportView';
import CIAAssessmentView from '../analysis/CIAAssessmentView';
import MitreAttackView from '../analysis/MitreAttackView';
import SectorScanView from '../analysis/SectorScanView';

export default function CenterPanel() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useCaseStore();

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const renderContent = () => {
    if (!activeTab) return <CaseDashboard />;
    switch (activeTab.type) {
      case 'dashboard': return <CaseDashboard />;
      case 'file-list': return <FileListView />;
      case 'hex-viewer': return <HexViewer />;
      case 'timeline': return <TimelineView />;
      case 'search': return <SearchView />;
      case 'logs': return <LogViewer />;
      case 'report': return <ReportView />;
      case 'cia-assessment': return <CIAAssessmentView />;
      case 'mitre-attack': return <MitreAttackView />;
      case 'sector-scan': return <SectorScanView />;
      default: return <CaseDashboard />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar */}
      {tabs.length > 0 && (
        <div className="flex items-center bg-bg-secondary border-b border-border overflow-x-auto shrink-0">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`tab-item ${tab.id === activeTabId ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="truncate max-w-[120px]">{tab.title}</span>
              {tab.id !== 'dashboard' && (
                <button
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                  className="p-0.5 hover:bg-bg-tertiary rounded opacity-50 hover:opacity-100"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-bg-primary">
        {renderContent()}
      </div>
    </div>
  );
}
