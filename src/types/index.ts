// Core data models for the JavaScript API Testing App

export interface TestScript {
  id: string;
  name: string;
  code: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockConfig {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  response: any;
  statusCode: number;
  headers?: Record<string, string>;
  delay?: number;
  enabled: boolean;
}

export interface RequestLog {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  response?: any;
  timestamp: Date;
  duration: number;
  statusCode?: number;
  error?: string;
}

export interface ScriptExecution {
  id: string;
  scriptId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'error';
  result?: any;
  error?: string;
  logs: ExecutionLog[];
  requests: RequestLog[];
}

export interface ExecutionLog {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: Date;
  data?: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface DashboardState {
  activeScript?: TestScript;
  scripts: TestScript[];
  mockConfigs: MockConfig[];
  requestLogs: RequestLog[];
  executions: ScriptExecution[];
  selectedExecution?: ScriptExecution;
}

// UI Component Props
export interface ScriptEditorProps {
  script?: TestScript;
  onChange: (code: string) => void;
  onSave: (script: TestScript) => void;
  onRun: () => void;
  isRunning?: boolean;
}

export interface PayloadViewerProps {
  data: any;
  title?: string;
  collapsible?: boolean;
  maxHeight?: string;
}

export interface MockConfigPanelProps {
  configs: MockConfig[];
  onAdd: (config: MockConfig) => void;
  onUpdate: (config: MockConfig) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
}

export interface RequestLoggerProps {
  logs: RequestLog[];
  onClear: () => void;
  onFilter: (filter: RequestLogFilter) => void;
}

export interface RequestLogFilter {
  method?: string;
  statusCode?: number;
  timeRange?: [Date, Date];
  search?: string;
}

export interface TestResultsProps {
  execution?: ScriptExecution;
  onClear: () => void;
}

// Store interfaces for Zustand
export interface AppStore extends DashboardState {
  // Script management
  createScript: (name: string, code?: string) => TestScript;
  updateScript: (script: TestScript) => void;
  deleteScript: (id: string) => void;
  setActiveScript: (script: TestScript | undefined) => void;
  
  // Mock configuration
  addMockConfig: (config: Omit<MockConfig, 'id'>) => void;
  updateMockConfig: (config: MockConfig) => void;
  deleteMockConfig: (id: string) => void;
  toggleMockConfig: (id: string) => void;
  
  // Request logging
  addRequestLog: (log: Omit<RequestLog, 'id'>) => void;
  clearRequestLogs: () => void;
  
  // Script execution
  startExecution: (scriptId: string) => ScriptExecution;
  updateExecution: (execution: ScriptExecution) => void;
  setSelectedExecution: (execution: ScriptExecution | undefined) => void;
  
  // UI state
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

// Monaco Editor types
export interface EditorConfig {
  language: string;
  theme: 'vs-dark' | 'vs-light';
  fontSize: number;
  wordWrap: 'on' | 'off';
  minimap: {
    enabled: boolean;
  };
  scrollBeyondLastLine: boolean;
  automaticLayout: boolean;
}