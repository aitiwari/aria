export interface Proposal {
  id: string;
  problemStatement: string;
  selectedOptionId: string | null;
  finalDocument: string | null;
  finalScore: number | null;
  finalGovernance: string | null; // 'PASS' | 'FAIL' | null
  finalRisks: string | null; // JSON array of risks
  revisionCount: number;
  status: 'INPUT' | 'PROCESSING_OPTIONS' | 'OPTIONS_READY' | 'PROCESSING_DOCUMENT' | 'DOCUMENT_READY' | 'REVISING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
}

export interface SolutionOption {
  id: string;
  proposalId: string;
  title: string;
  summary: string;
  architecture: string;
  pros: string[];
  cons: string[];
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
  techStack: string[];
}

export interface AuditLog {
  id: string;
  proposalId: string;
  stepName: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface ScheduleAction {
  id: string;
  proposalId: string;
  title: string;
  description: string;
  assignee: string;
  timeline: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface Integration {
  id: string;
  proposalId: string;
  type: 'github';
  referenceUrl: string;
  referenceId: string;
  status: string;
  createdAt: string;
}

export interface PipelineState {
  proposal: Proposal | null;
  options: SolutionOption[];
  auditLogs: AuditLog[];
  schedule: ScheduleAction[];
  integration: Integration | null;
  error: string | null;
  logs: string[]; // For visual pipeline log scrolling
}
