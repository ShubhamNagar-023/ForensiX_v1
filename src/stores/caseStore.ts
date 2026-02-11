import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ForensicCase,
  CaseMetadata,
  EvidenceItem,
  LogEntry,
  Bookmark,
  Note,
  Tab,
  PanelSizes,
  FileEntry,
  Partition,
  CIAAssessment,
  MitreAttackMapping,
  TimelineEvent,
  SectorScanResult,
} from '../types';

interface CaseStore {
  // Cases
  cases: ForensicCase[];
  activeCase: ForensicCase | null;
  
  // UI State
  panelSizes: PanelSizes;
  tabs: Tab[];
  activeTabId: string | null;
  selectedFileEntry: FileEntry | null;
  selectedPartition: Partition | null;
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  
  // Analysis state
  ciaAssessment: CIAAssessment | null;
  mitreMapping: MitreAttackMapping | null;
  timelineEvents: TimelineEvent[];
  sectorScanResult: SectorScanResult | null;
  isAnalyzing: boolean;
  analysisProgress: number;
  currentOperation: string;
  
  // Case operations
  createCase: (metadata: Omit<CaseMetadata, 'id' | 'dateCreated' | 'lastModified'>) => ForensicCase;
  openCase: (caseId: string) => void;
  closeCase: () => void;
  updateCaseMetadata: (metadata: Partial<CaseMetadata>) => void;
  deleteCase: (caseId: string) => void;
  
  // Evidence operations
  addEvidence: (evidence: EvidenceItem) => void;
  updateEvidence: (evidenceId: string, updates: Partial<EvidenceItem>) => void;
  removeEvidence: (evidenceId: string) => void;
  
  // File selection
  selectFile: (file: FileEntry | null) => void;
  selectPartition: (partition: Partition | null) => void;
  
  // Tab operations
  addTab: (tab: Omit<Tab, 'isActive'>) => void;
  setActiveTab: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  
  // Panel operations
  setPanelSizes: (sizes: Partial<PanelSizes>) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  
  // Log operations
  addLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  
  // Bookmark operations
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'dateCreated'>) => void;
  removeBookmark: (bookmarkId: string) => void;
  
  // Note operations
  addNote: (note: Omit<Note, 'id' | 'timestamp'>) => void;
  updateNote: (noteId: string, content: string) => void;
  removeNote: (noteId: string) => void;
  
  // Analysis state
  setCIAAssessment: (assessment: CIAAssessment) => void;
  setMitreMapping: (mapping: MitreAttackMapping) => void;
  setTimelineEvents: (events: TimelineEvent[]) => void;
  setSectorScanResult: (result: SectorScanResult) => void;
  setIsAnalyzing: (analyzing: boolean) => void;
  setAnalysisProgress: (progress: number) => void;
  setCurrentOperation: (operation: string) => void;
}

const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

export const useCaseStore = create<CaseStore>()(
  persist(
    (set, get) => ({
      // Initial state
      cases: [],
      activeCase: null,
      panelSizes: { left: 20, center: 50, right: 30 },
      tabs: [],
      activeTabId: null,
      selectedFileEntry: null,
      selectedPartition: null,
      leftPanelCollapsed: false,
      rightPanelCollapsed: false,
      ciaAssessment: null,
      mitreMapping: null,
      timelineEvents: [],
      sectorScanResult: null,
      isAnalyzing: false,
      analysisProgress: 0,
      currentOperation: '',
      
      // Case operations
      createCase: (metadata) => {
        const now = new Date().toISOString();
        const newCase: ForensicCase = {
          metadata: {
            ...metadata,
            id: generateId(),
            dateCreated: now,
            lastModified: now,
          },
          evidence: [],
          analysisResults: [],
          bookmarks: [],
          notes: [],
          logs: [],
        };
        set((state) => ({
          cases: [...state.cases, newCase],
          activeCase: newCase,
          tabs: [{
            id: 'dashboard',
            title: 'Case Dashboard',
            type: 'dashboard',
            isActive: true,
          }],
          activeTabId: 'dashboard',
          ciaAssessment: null,
          mitreMapping: null,
          timelineEvents: [],
          sectorScanResult: null,
        }));
        return newCase;
      },
      
      openCase: (caseId) => {
        const targetCase = get().cases.find((c) => c.metadata.id === caseId);
        if (targetCase) {
          set({
            activeCase: targetCase,
            tabs: [{
              id: 'dashboard',
              title: 'Case Dashboard',
              type: 'dashboard',
              isActive: true,
            }],
            activeTabId: 'dashboard',
            selectedFileEntry: null,
            selectedPartition: null,
            ciaAssessment: null,
            mitreMapping: null,
            timelineEvents: [],
            sectorScanResult: null,
          });
        }
      },
      
      closeCase: () => {
        set({
          activeCase: null,
          tabs: [],
          activeTabId: null,
          selectedFileEntry: null,
          selectedPartition: null,
          ciaAssessment: null,
          mitreMapping: null,
          timelineEvents: [],
          sectorScanResult: null,
        });
      },
      
      updateCaseMetadata: (updates) => {
        set((state) => {
          if (!state.activeCase) return state;
          const updatedCase = {
            ...state.activeCase,
            metadata: {
              ...state.activeCase.metadata,
              ...updates,
              lastModified: new Date().toISOString(),
            },
          };
          return {
            activeCase: updatedCase,
            cases: state.cases.map((c) =>
              c.metadata.id === updatedCase.metadata.id ? updatedCase : c
            ),
          };
        });
      },
      
      deleteCase: (caseId) => {
        set((state) => ({
          cases: state.cases.filter((c) => c.metadata.id !== caseId),
          activeCase: state.activeCase?.metadata.id === caseId ? null : state.activeCase,
        }));
      },
      
      // Evidence operations
      addEvidence: (evidence) => {
        set((state) => {
          if (!state.activeCase) return state;
          const updatedCase = {
            ...state.activeCase,
            evidence: [...state.activeCase.evidence, evidence],
          };
          return {
            activeCase: updatedCase,
            cases: state.cases.map((c) =>
              c.metadata.id === updatedCase.metadata.id ? updatedCase : c
            ),
          };
        });
      },
      
      updateEvidence: (evidenceId, updates) => {
        set((state) => {
          if (!state.activeCase) return state;
          const updatedCase = {
            ...state.activeCase,
            evidence: state.activeCase.evidence.map((e) =>
              e.id === evidenceId ? { ...e, ...updates } : e
            ),
          };
          return {
            activeCase: updatedCase,
            cases: state.cases.map((c) =>
              c.metadata.id === updatedCase.metadata.id ? updatedCase : c
            ),
          };
        });
      },
      
      removeEvidence: (evidenceId) => {
        set((state) => {
          if (!state.activeCase) return state;
          const updatedCase = {
            ...state.activeCase,
            evidence: state.activeCase.evidence.filter((e) => e.id !== evidenceId),
          };
          return {
            activeCase: updatedCase,
            cases: state.cases.map((c) =>
              c.metadata.id === updatedCase.metadata.id ? updatedCase : c
            ),
          };
        });
      },
      
      // File selection
      selectFile: (file) => set({ selectedFileEntry: file }),
      selectPartition: (partition) => set({ selectedPartition: partition }),
      
      // Tab operations
      addTab: (tab) => {
        set((state) => {
          const existing = state.tabs.find((t) => t.id === tab.id);
          if (existing) {
            return {
              tabs: state.tabs.map((t) => ({ ...t, isActive: t.id === tab.id })),
              activeTabId: tab.id,
            };
          }
          return {
            tabs: [...state.tabs.map((t) => ({ ...t, isActive: false })), { ...tab, isActive: true }],
            activeTabId: tab.id,
          };
        });
      },
      
      setActiveTab: (tabId) => {
        set((state) => ({
          tabs: state.tabs.map((t) => ({ ...t, isActive: t.id === tabId })),
          activeTabId: tabId,
        }));
      },
      
      closeTab: (tabId) => {
        set((state) => {
          const newTabs = state.tabs.filter((t) => t.id !== tabId);
          const wasActive = state.activeTabId === tabId;
          return {
            tabs: wasActive && newTabs.length > 0
              ? newTabs.map((t, i) => ({ ...t, isActive: i === newTabs.length - 1 }))
              : newTabs,
            activeTabId: wasActive && newTabs.length > 0
              ? newTabs[newTabs.length - 1].id
              : wasActive ? null : state.activeTabId,
          };
        });
      },
      
      // Panel operations
      setPanelSizes: (sizes) => {
        set((state) => ({ panelSizes: { ...state.panelSizes, ...sizes } }));
      },
      toggleLeftPanel: () => set((state) => ({ leftPanelCollapsed: !state.leftPanelCollapsed })),
      toggleRightPanel: () => set((state) => ({ rightPanelCollapsed: !state.rightPanelCollapsed })),
      
      // Log operations
      addLog: (entry) => {
        set((state) => {
          if (!state.activeCase) return state;
          const log: LogEntry = {
            ...entry,
            id: generateId(),
            timestamp: new Date().toISOString(),
          };
          const updatedCase = {
            ...state.activeCase,
            logs: [...state.activeCase.logs, log],
          };
          return {
            activeCase: updatedCase,
            cases: state.cases.map((c) =>
              c.metadata.id === updatedCase.metadata.id ? updatedCase : c
            ),
          };
        });
      },
      
      // Bookmark operations
      addBookmark: (bookmark) => {
        set((state) => {
          if (!state.activeCase) return state;
          const bm: Bookmark = {
            ...bookmark,
            id: generateId(),
            dateCreated: new Date().toISOString(),
          };
          const updatedCase = {
            ...state.activeCase,
            bookmarks: [...state.activeCase.bookmarks, bm],
          };
          return {
            activeCase: updatedCase,
            cases: state.cases.map((c) =>
              c.metadata.id === updatedCase.metadata.id ? updatedCase : c
            ),
          };
        });
      },
      
      removeBookmark: (bookmarkId) => {
        set((state) => {
          if (!state.activeCase) return state;
          const updatedCase = {
            ...state.activeCase,
            bookmarks: state.activeCase.bookmarks.filter((b) => b.id !== bookmarkId),
          };
          return {
            activeCase: updatedCase,
            cases: state.cases.map((c) =>
              c.metadata.id === updatedCase.metadata.id ? updatedCase : c
            ),
          };
        });
      },
      
      // Note operations
      addNote: (note) => {
        set((state) => {
          if (!state.activeCase) return state;
          const n: Note = {
            ...note,
            id: generateId(),
            timestamp: new Date().toISOString(),
          };
          const updatedCase = {
            ...state.activeCase,
            notes: [...state.activeCase.notes, n],
          };
          return {
            activeCase: updatedCase,
            cases: state.cases.map((c) =>
              c.metadata.id === updatedCase.metadata.id ? updatedCase : c
            ),
          };
        });
      },
      
      updateNote: (noteId, content) => {
        set((state) => {
          if (!state.activeCase) return state;
          const updatedCase = {
            ...state.activeCase,
            notes: state.activeCase.notes.map((n) =>
              n.id === noteId ? { ...n, content, timestamp: new Date().toISOString() } : n
            ),
          };
          return {
            activeCase: updatedCase,
            cases: state.cases.map((c) =>
              c.metadata.id === updatedCase.metadata.id ? updatedCase : c
            ),
          };
        });
      },
      
      removeNote: (noteId) => {
        set((state) => {
          if (!state.activeCase) return state;
          const updatedCase = {
            ...state.activeCase,
            notes: state.activeCase.notes.filter((n) => n.id !== noteId),
          };
          return {
            activeCase: updatedCase,
            cases: state.cases.map((c) =>
              c.metadata.id === updatedCase.metadata.id ? updatedCase : c
            ),
          };
        });
      },
      
      // Analysis state
      setCIAAssessment: (assessment) => set({ ciaAssessment: assessment }),
      setMitreMapping: (mapping) => set({ mitreMapping: mapping }),
      setTimelineEvents: (events) => set({ timelineEvents: events }),
      setSectorScanResult: (result) => set({ sectorScanResult: result }),
      setIsAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),
      setAnalysisProgress: (progress) => set({ analysisProgress: progress }),
      setCurrentOperation: (operation) => set({ currentOperation: operation }),
    }),
    {
      name: 'forensix-storage',
      partialize: (state) => ({
        cases: state.cases,
        panelSizes: state.panelSizes,
      }),
    }
  )
);
