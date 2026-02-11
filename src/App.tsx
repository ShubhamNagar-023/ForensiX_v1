import { useState, useEffect, useCallback } from 'react';
import { useCaseStore } from './stores/caseStore';
import TopNav from './components/layout/TopNav';
import StatusBar from './components/layout/StatusBar';
import ThreePanel from './components/layout/ThreePanel';
import LeftPanel from './components/layout/LeftPanel';
import CenterPanel from './components/layout/CenterPanel';
import RightPanel from './components/layout/RightPanel';
import CaseList from './components/case/CaseList';
import NewCaseDialog from './components/case/NewCaseDialog';
import EvidenceUpload from './components/evidence/EvidenceUpload';

export default function App() {
  const { activeCase, toggleLeftPanel, toggleRightPanel } = useCaseStore();
  const [showNewCase, setShowNewCase] = useState(false);
  const [showEvidenceUpload, setShowEvidenceUpload] = useState(false);
  const [showCaseList, setShowCaseList] = useState(false);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            toggleLeftPanel();
            break;
          case 'i':
            e.preventDefault();
            toggleRightPanel();
            break;
        }
      }
    },
    [toggleLeftPanel, toggleRightPanel]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // If no case is open, show case list
  if (!activeCase) {
    return (
      <div className="h-screen flex flex-col bg-bg-primary">
        <TopNav
          onNewCase={() => setShowNewCase(true)}
          onOpenCase={() => setShowCaseList(!showCaseList)}
        />
        <div className="flex-1 overflow-hidden">
          <CaseList onNewCase={() => setShowNewCase(true)} />
        </div>
        <StatusBar />
        {showNewCase && <NewCaseDialog onClose={() => setShowNewCase(false)} />}
      </div>
    );
  }

  // Case is open - show 3-panel layout
  return (
    <div className="h-screen flex flex-col bg-bg-primary">
      <TopNav
        onNewCase={() => setShowNewCase(true)}
        onOpenCase={() => setShowCaseList(!showCaseList)}
      />
      <ThreePanel
        leftPanel={<LeftPanel onAddEvidence={() => setShowEvidenceUpload(true)} />}
        centerPanel={<CenterPanel />}
        rightPanel={<RightPanel />}
      />
      <StatusBar />
      {showNewCase && <NewCaseDialog onClose={() => setShowNewCase(false)} />}
      {showEvidenceUpload && <EvidenceUpload onClose={() => setShowEvidenceUpload(false)} />}
    </div>
  );
}
