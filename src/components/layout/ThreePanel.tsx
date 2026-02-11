import { useState, useCallback, useRef, useEffect } from 'react';
import { useCaseStore } from '../../stores/caseStore';
import { PanelLeftClose, PanelRightClose } from 'lucide-react';

interface ThreePanelProps {
  leftPanel: React.ReactNode;
  centerPanel: React.ReactNode;
  rightPanel: React.ReactNode;
}

export default function ThreePanel({ leftPanel, centerPanel, rightPanel }: ThreePanelProps) {
  const { panelSizes, setPanelSizes, leftPanelCollapsed, rightPanelCollapsed, toggleLeftPanel, toggleRightPanel } = useCaseStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [resizing, setResizing] = useState<'left' | 'right' | null>(null);

  const handleMouseDown = useCallback((panel: 'left' | 'right') => {
    setResizing(panel);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!resizing || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalWidth = rect.width;
      const x = e.clientX - rect.left;
      const percentage = (x / totalWidth) * 100;

      if (resizing === 'left') {
        const newLeft = Math.max(10, Math.min(40, percentage));
        setPanelSizes({ left: newLeft });
      } else if (resizing === 'right') {
        const newRight = Math.max(10, Math.min(50, 100 - percentage));
        setPanelSizes({ right: newRight });
      }
    },
    [resizing, setPanelSizes]
  );

  const handleMouseUp = useCallback(() => {
    setResizing(null);
  }, []);

  useEffect(() => {
    if (resizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizing, handleMouseMove, handleMouseUp]);

  const leftWidth = leftPanelCollapsed ? 0 : panelSizes.left;
  const rightWidth = rightPanelCollapsed ? 0 : panelSizes.right;
  const centerWidth = 100 - leftWidth - rightWidth;

  return (
    <div ref={containerRef} className="flex flex-1 overflow-hidden relative">
      {/* Left Panel */}
      {!leftPanelCollapsed && (
        <>
          <div style={{ width: `${leftWidth}%` }} className="flex flex-col overflow-hidden bg-bg-secondary border-r border-border">
            <div className="flex items-center justify-between px-2 py-1 border-b border-border">
              <span className="text-xs font-display font-semibold text-text-secondary uppercase tracking-wider">Navigator</span>
              <button onClick={toggleLeftPanel} className="p-1 hover:bg-bg-tertiary rounded" title="Collapse (Ctrl+B)">
                <PanelLeftClose className="w-3.5 h-3.5 text-text-secondary" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {leftPanel}
            </div>
          </div>
          <div
            className={`resize-handle ${resizing === 'left' ? 'active' : ''}`}
            onMouseDown={() => handleMouseDown('left')}
          />
        </>
      )}

      {/* Left panel collapsed toggle */}
      {leftPanelCollapsed && (
        <button
          onClick={toggleLeftPanel}
          className="w-6 flex items-center justify-center bg-bg-secondary border-r border-border hover:bg-bg-tertiary transition-colors"
          title="Expand Navigator (Ctrl+B)"
        >
          <PanelLeftClose className="w-3.5 h-3.5 text-text-secondary rotate-180" />
        </button>
      )}

      {/* Center Panel */}
      <div style={{ width: `${centerWidth}%` }} className="flex flex-col overflow-hidden flex-1 min-w-0">
        {centerPanel}
      </div>

      {/* Right panel collapsed toggle */}
      {rightPanelCollapsed && (
        <button
          onClick={toggleRightPanel}
          className="w-6 flex items-center justify-center bg-bg-secondary border-l border-border hover:bg-bg-tertiary transition-colors"
          title="Expand Details (Ctrl+I)"
        >
          <PanelRightClose className="w-3.5 h-3.5 text-text-secondary rotate-180" />
        </button>
      )}

      {/* Right Panel */}
      {!rightPanelCollapsed && (
        <>
          <div
            className={`resize-handle ${resizing === 'right' ? 'active' : ''}`}
            onMouseDown={() => handleMouseDown('right')}
          />
          <div style={{ width: `${rightWidth}%` }} className="flex flex-col overflow-hidden bg-bg-secondary border-l border-border">
            <div className="flex items-center justify-between px-2 py-1 border-b border-border">
              <span className="text-xs font-display font-semibold text-text-secondary uppercase tracking-wider">Details</span>
              <button onClick={toggleRightPanel} className="p-1 hover:bg-bg-tertiary rounded" title="Collapse (Ctrl+I)">
                <PanelRightClose className="w-3.5 h-3.5 text-text-secondary" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {rightPanel}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
