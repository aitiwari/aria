import React, { useEffect, useRef } from 'react';
import { 
  Play, CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldAlert, ShieldCheck, 
  Terminal, Calendar, User, FileCode, CheckSquare, Github, Database, Award, ClipboardList,
  AlertTriangle, Check, RefreshCw, Layers
} from 'lucide-react';
import { SolutionOption, AuditLog, ScheduleAction, Proposal, Integration } from '../types.js';

// --- TYPE INTERFACES ---
interface PipelineStatusProps {
  proposal: Proposal | null;
  auditLogs: AuditLog[];
  currentStep: string;
}

interface OptionCardsProps {
  options: SolutionOption[];
  selectedId: string | null;
  onSelect: (optionId: string) => void;
  isLoading: boolean;
}

interface MarkdownPreviewProps {
  markdown: string;
}

interface ReviewTabProps {
  score: number | null;
  reviewData: {
    feedback: string;
    strengths: string[];
    improvements: string[];
  } | null;
}

interface GovernanceTabProps {
  status: string | null;
  risks: { severity: string; description: string }[] | null;
  checklist: { rule: string; status: string }[] | null;
}

interface SchedulerTabProps {
  schedule: ScheduleAction[];
}

interface GitHubIssueTabProps {
  proposal: Proposal | null;
  integration: Integration | null;
  onApprove: () => void;
  onSync: (summary: string) => void;
  isApproving: boolean;
  isSyncing: boolean;
  isApproved: boolean;
}

interface AuditLogTabProps {
  logs: AuditLog[];
}

// --- 1. PIPELINE STATUS & TERMINAL LOGS ---
export const PipelineStatus: React.FC<PipelineStatusProps> = ({ proposal, auditLogs, currentStep }) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [auditLogs]);

  const pipelineSteps = [
    { name: 'Input Guardrails', status: proposal ? 'COMPLETED' : 'IDLE' },
    { name: 'Breakdown Agent', status: proposal?.status === 'PROCESSING_OPTIONS' ? 'RUNNING' : (proposal && proposal.status !== 'INPUT' ? 'COMPLETED' : 'IDLE') },
    { name: 'Research Agent', status: proposal?.status === 'PROCESSING_OPTIONS' ? 'RUNNING' : (proposal && proposal.status !== 'INPUT' ? 'COMPLETED' : 'IDLE') },
    { name: 'Option Builder', status: proposal?.status === 'PROCESSING_OPTIONS' ? 'RUNNING' : (proposal && proposal.status !== 'INPUT' && proposal.status !== 'PROCESSING_OPTIONS' ? 'COMPLETED' : 'IDLE') },
    { name: 'Document Agent', status: proposal?.status === 'PROCESSING_DOCUMENT' ? 'RUNNING' : (proposal && (proposal.status === 'DOCUMENT_READY' || proposal.status === 'COMPLETED' || proposal.status === 'FAILED') ? 'COMPLETED' : 'IDLE') },
    { name: 'Reviewer Agent', status: proposal?.status === 'PROCESSING_DOCUMENT' ? 'RUNNING' : (proposal && (proposal.status === 'DOCUMENT_READY' || proposal.status === 'COMPLETED' || proposal.status === 'FAILED') ? 'COMPLETED' : 'IDLE') },
    { name: 'Governance Agent', status: proposal?.status === 'PROCESSING_DOCUMENT' ? 'RUNNING' : (proposal && (proposal.status === 'DOCUMENT_READY' || proposal.status === 'COMPLETED' || proposal.status === 'FAILED') ? 'COMPLETED' : 'IDLE') },
    { name: 'Revision Loop', status: proposal?.status === 'PROCESSING_DOCUMENT' ? 'RUNNING' : (proposal && (proposal.status === 'COMPLETED' || proposal.status === 'FAILED') ? 'COMPLETED' : 'IDLE') },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
      {/* Visual Agent Pipeline Map */}
      <div id="pipeline-map" className="lg:col-span-5 bg-dark-sidebar border border-dark-border rounded p-4 text-text-main">
        <h3 className="font-display font-medium text-[10px] text-brand-primary tracking-widest uppercase mb-4 flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-brand-primary" />
          Agent Pipeline Orchestrator
        </h3>
        <div className="space-y-1.5">
          {pipelineSteps.map((step, index) => (
            <div key={index} className="flex items-center justify-between p-2 rounded bg-dark-input border border-dark-border">
              <span className="text-xs font-mono text-text-main/90 flex items-center gap-2">
                <span className="text-brand-primary">{String(index + 1).padStart(2, '0')}.</span>
                {step.name}
              </span>
              <div>
                {step.status === 'COMPLETED' && (
                  <span className="text-[10px] font-mono text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-2 py-0.5 rounded flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" /> DONE
                  </span>
                )}
                {step.status === 'RUNNING' && (
                  <span className="text-[10px] font-mono text-[#87A396] bg-[#87A396]/20 border border-[#87A396]/30 px-2 py-0.5 rounded flex items-center gap-1 pulse-glow">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> ACTIVE
                  </span>
                )}
                {step.status === 'IDLE' && (
                  <span className="text-[10px] font-mono text-text-muted bg-dark-panel px-2 py-0.5 rounded border border-dark-border/40">
                    PENDING
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Terminal Real-time Console */}
      <div id="terminal-console" className="lg:col-span-7 bg-[#050505] border border-dark-border rounded p-4 flex flex-col h-[340px]">
        <div className="flex items-center justify-between border-b border-dark-border pb-2 mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-brand-primary" />
            <span className="font-mono text-xs font-semibold text-brand-primary">ARIA_SYSTEM_KERNEL@LOGS</span>
          </div>
          <div className="flex gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500/40"></span>
            <span className="w-2 h-2 rounded-full bg-amber-500/40"></span>
            <span className="w-2 h-2 rounded-full bg-emerald-500/40"></span>
          </div>
        </div>
        
        {/* Scrollable logs */}
        <div className="flex-1 overflow-y-auto space-y-1.5 font-mono text-[11px] pr-1 text-zinc-300">
          {auditLogs.length === 0 ? (
            <p className="text-text-muted italic">SYSTEM IDLE. Awaiting input proposal statement to initialize agent sub-threads...</p>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="p-2 rounded bg-dark-panel border border-dark-border/60">
                <div className="flex items-center justify-between text-[9px] text-text-muted mb-1 border-b border-dark-border/20 pb-0.5">
                  <span className="text-brand-primary">[{log.stepName}]</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="text-text-main font-semibold text-xs">{log.action}</div>
                <div className="text-text-main/70 mt-0.5">{log.details}</div>
              </div>
            ))
          )}
          {currentStep && (
            <div className="flex items-center gap-2 text-brand-primary pulse-glow bg-brand-primary/5 p-2 rounded border border-brand-primary/20">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>[KERNEL] {currentStep}...</span>
            </div>
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
};

// --- 2. Blueprints / Options List ---
export const OptionCards: React.FC<OptionCardsProps> = ({ options, selectedId, onSelect, isLoading }) => {
  return (
    <div id="option-cards-container" className="mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
        <div>
          <h3 className="font-display font-bold text-lg text-white">Architectural Alternatives</h3>
          <p className="text-xs text-text-muted mt-0.5">Select a primary blueprint path to compile, verify compliance, and run the revision loop.</p>
        </div>
        {isLoading && (
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 bg-[#111111] p-2 rounded border border-amber-500/20">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating Blueprints...
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {options.map((opt) => {
          const isSelected = selectedId === opt.id;
          const complexityColors = {
            LOW: 'bg-brand-primary/10 text-brand-primary border-brand-primary/20',
            MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            HIGH: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          };

          return (
            <div 
              key={opt.id} 
              className={`flex flex-col justify-between border rounded p-4 bg-[#111111] transition-all duration-300 ${
                isSelected 
                  ? 'border-brand-primary ring-1 ring-brand-primary/30 shadow-[0_0_15px_rgba(135,163,150,0.15)]' 
                  : 'border-dark-border hover:border-brand-primary/60 hover:shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded border ${complexityColors[opt.complexity]}`}>
                    {opt.complexity} COMPLEXITY
                  </span>
                  {isSelected && (
                    <span className="text-[9px] font-mono font-semibold bg-brand-primary text-[#0A0A0A] px-2 py-0.5 rounded">
                      PRIMARY DESIGN
                    </span>
                  )}
                </div>
                <h4 className="font-display font-semibold text-sm text-white leading-snug mb-2">{opt.title}</h4>
                <p className="text-xs text-zinc-300 mb-4 line-clamp-3">{opt.summary}</p>

                <div className="mb-4">
                  <div className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-1.5">Core Architecture</div>
                  <p className="text-xs text-zinc-400 font-mono bg-[#0F0F0F] p-2.5 rounded border border-dark-border leading-normal line-clamp-3">
                    {opt.architecture}
                  </p>
                </div>

                <div className="mb-4">
                  <div className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-1.5">Tech Stack</div>
                  <div className="flex flex-wrap gap-1">
                    {opt.techStack.map((tech, idx) => (
                      <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1A1A1A] text-brand-primary border border-dark-border">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onSelect(opt.id)}
                className={`w-full py-2 px-4 rounded font-display font-semibold text-xs transition-all duration-200 flex items-center justify-center gap-1.5 mt-2 ${
                  isSelected 
                    ? 'bg-brand-primary text-[#0A0A0A] cursor-default' 
                    : 'bg-[#1A1A1A] text-[#87A396] border border-dark-border hover:bg-[#222] hover:border-brand-primary'
                }`}
              >
                {isSelected ? (
                  <>Selected Blueprint <Check className="w-3.5 h-3.5" /></>
                ) : (
                  <>Select Option <ArrowRight className="w-3.5 h-3.5" /></>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- 3. Markdown Shortlist Preview ---
export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ markdown }) => {
  return (
    <div className="bg-[#0F0F0F] border border-dark-border rounded p-4 md:p-6">
      <div className="flex items-center justify-between border-b border-dark-border pb-4 mb-6">
        <div className="flex items-center gap-2">
          <FileCode className="w-5 h-5 text-brand-primary" />
          <h3 className="font-display font-bold text-base text-white">Confluence Specification Draft</h3>
        </div>
        <span className="text-[10px] font-mono text-brand-primary bg-brand-primary/10 px-2.5 py-1 rounded border border-brand-primary/20">
          SHORTLIST FORMAT
        </span>
      </div>
      
      {/* Markdown Render Container */}
      <div className="prose prose-invert max-w-none font-sans text-xs text-text-main space-y-4">
        {markdown.split('\n').map((line, idx) => {
          if (line.startsWith('# ')) {
            return <h1 key={idx} className="font-display font-bold text-xl text-white pt-3 pb-1.5 border-b border-dark-border">{line.replace('# ', '')}</h1>;
          }
          if (line.startsWith('## ')) {
            return <h2 key={idx} className="font-display font-bold text-base text-white pt-2.5 pb-1">{line.replace('## ', '')}</h2>;
          }
          if (line.startsWith('### ')) {
            return <h3 key={idx} className="font-display font-semibold text-sm text-white pt-2">{line.replace('### ', '')}</h3>;
          }
          if (line.startsWith('- ')) {
            return <li key={idx} className="ml-4 list-disc pl-1 leading-relaxed text-zinc-300">{line.replace('- ', '')}</li>;
          }
          if (line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ') || line.startsWith('4. ')) {
            return <li key={idx} className="ml-4 list-decimal pl-1 leading-relaxed text-zinc-300">{line}</li>;
          }
          if (line.startsWith('```')) {
            return null; // Skip raw codeblocks, render simply
          }
          if (line.trim().startsWith('|') || line.trim().startsWith('[')) {
            return <pre key={idx} className="bg-dark-input border border-dark-border rounded p-3 font-mono text-xs overflow-x-auto my-2 text-[#E4E4E4]">{line}</pre>;
          }
          if (line.trim() === '') {
            return <div key={idx} className="h-1" />;
          }
          return <p key={idx} className="leading-relaxed text-zinc-300">{line}</p>;
        })}
      </div>
    </div>
  );
};

// --- 4. Technical Peer Review Report ---
export const ReviewTab: React.FC<ReviewTabProps> = ({ score, reviewData }) => {
  if (!reviewData) {
    return (
      <div className="p-12 text-center border border-dashed border-dark-border rounded bg-dark-panel">
        <Award className="w-8 h-8 text-text-muted mx-auto mb-3 animate-pulse" />
        <p className="text-text-muted text-xs">Please compile the architectural blueprint to trigger technical reviewer logs.</p>
      </div>
    );
  }

  const isPassing = (score || 0) >= 85;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-[#111111] border border-dark-border rounded p-4">
      {/* Score gauge */}
      <div className="md:col-span-4 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-dark-border pb-6 md:pb-0 md:pr-6 text-center">
        <div className="relative flex items-center justify-center w-28 h-28 mb-3">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1A1A1A" strokeWidth="8" />
            <circle 
              cx="50" 
              cy="50" 
              r="40" 
              fill="transparent" 
              stroke={isPassing ? '#87A396' : '#ef4444'} 
              strokeWidth="8" 
              strokeDasharray="251.2"
              strokeDashoffset={251.2 - (251.2 * (score || 0)) / 100}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute text-center">
            <span className="text-2xl font-display font-bold text-white">{score}</span>
            <span className="text-[10px] text-text-muted block font-mono">/100</span>
          </div>
        </div>
        <div className={`text-[10px] font-mono font-semibold px-2.5 py-1 rounded border ${
          isPassing 
            ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20' 
            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        }`}>
          {isPassing ? 'PEER EXCELLENT (PASS)' : 'REVISION GAPS DETECTED'}
        </div>
      </div>

      {/* Review details */}
      <div className="md:col-span-8 space-y-4">
        <div>
          <h4 className="font-display font-semibold text-white text-sm mb-1">Peer Auditor Evaluation Summary</h4>
          <p className="text-xs text-zinc-300 leading-relaxed">{reviewData.feedback}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-brand-primary/5 rounded border border-brand-primary/10">
            <div className="text-xs font-mono font-semibold text-brand-primary mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary" /> Key Strengths
            </div>
            <ul className="space-y-1">
              {reviewData.strengths.map((str, idx) => (
                <li key={idx} className="text-xs text-zinc-300 flex items-start gap-1">
                  <span className="text-brand-primary font-bold">•</span>
                  <span>{str}</span>
                </li>
               ))}
            </ul>
          </div>

          <div className="p-3 bg-rose-500/5 rounded border border-rose-500/10">
            <div className="text-xs font-mono font-semibold text-rose-400 mb-2 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> Recommended Improvements
            </div>
            <ul className="space-y-1">
              {reviewData.improvements.map((imp, idx) => (
                <li key={idx} className="text-xs text-zinc-300 flex items-start gap-1">
                  <span className="text-rose-400 font-bold">•</span>
                  <span>{imp}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 5. Governance Checklist & Risk Registry ---
export const GovernanceTab: React.FC<GovernanceTabProps> = ({ status, risks, checklist }) => {
  if (!checklist) {
    return (
      <div className="p-12 text-center border border-dashed border-dark-border rounded bg-dark-panel">
        <ClipboardList className="w-8 h-8 text-text-muted mx-auto mb-3 animate-pulse" />
        <p className="text-text-muted text-xs">Awaiting architectural compilation to run safety and compliance gates.</p>
      </div>
    );
  }

  const passesGov = status === 'PASS';

  return (
    <div className="space-y-6">
      {/* Summary status bar */}
      <div className={`p-4 rounded border flex items-center gap-3 ${
        passesGov 
          ? 'bg-brand-primary/10 text-white border-brand-primary/20' 
          : 'bg-rose-500/10 text-white border-rose-500/20'
      }`}>
        {passesGov ? (
          <ShieldCheck className="w-5 h-5 text-brand-primary shrink-0" />
        ) : (
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
        )}
        <div>
          <h4 className="font-display font-bold text-sm">
            Governance & Security Status: {status}
          </h4>
          <p className="text-xs text-zinc-300 mt-0.5">
            {passesGov 
              ? 'Meets organizational criteria for high availability, least-privilege configuration, and audit logging.' 
              : 'The solution draft violates mandatory architectural standards. An automated corrective rewrite is required.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Compliance Checklist */}
        <div className="md:col-span-5 bg-[#111111] border border-dark-border rounded p-4">
          <h4 className="font-display font-semibold text-sm text-white mb-3.5">Security Compliance Rules</h4>
          <div className="space-y-2">
            {checklist.map((item, idx) => {
              const compliant = item.status === 'COMPLIANT';
              return (
                <div key={idx} className="flex items-center justify-between p-2 rounded bg-dark-input border border-dark-border/60">
                  <span className="text-xs text-zinc-300 font-medium">{item.rule}</span>
                  {compliant ? (
                    <span className="text-[10px] font-mono text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-2 py-0.5 rounded flex items-center gap-1">
                      <Check className="w-2.5 h-2.5" /> COMPLIANT
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5" /> FAILURE
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Risk Registry */}
        <div className="md:col-span-7 bg-[#111111] border border-dark-border rounded p-4">
          <h4 className="font-display font-semibold text-sm text-white mb-3.5">Audit Risk Registry</h4>
          {(!risks || risks.length === 0) ? (
            <div className="text-center py-8 text-text-muted text-xs italic">
              No active security or implementation risks found in document spec.
            </div>
          ) : (
            <div className="space-y-2.5">
              {risks.map((risk, idx) => (
                <div key={idx} className={`p-3 rounded border flex gap-3 ${
                  risk.severity === 'HIGH' || risk.severity === 'CRITICAL'
                    ? 'bg-rose-500/5 border-rose-500/20 text-rose-200'
                    : 'bg-amber-500/5 border-amber-500/20 text-amber-200'
                }`}>
                  <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${
                    risk.severity === 'HIGH' || risk.severity === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'
                  }`} />
                  <div>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border mr-2 ${
                      risk.severity === 'HIGH' || risk.severity === 'CRITICAL'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}>
                      {risk.severity} RISK
                    </span>
                    <p className="text-xs text-zinc-300 mt-1.5 font-medium leading-relaxed">{risk.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- 6. Implementation Follow-up Scheduler ---
export const SchedulerTab: React.FC<SchedulerTabProps> = ({ schedule }) => {
  if (schedule.length === 0) {
    return (
      <div className="p-12 text-center border border-dashed border-dark-border rounded bg-dark-panel">
        <Calendar className="w-8 h-8 text-text-muted mx-auto mb-3" />
        <p className="text-text-muted text-xs">timeline roadmap actions will generate automatically once the architecture passes audits.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#111111] border border-dark-border rounded p-4">
      <h3 className="font-display font-semibold text-white text-sm mb-1 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-brand-primary" /> Follow-up Action Roadmap
      </h3>
      <p className="text-xs text-text-muted mb-4">Agile sprint task breakdown auto-generated by the Scheduler Agent to support construction kickoff.</p>
      
      <div className="space-y-2">
        {schedule.map((task) => {
          const priorityColors = {
            HIGH: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
            MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            LOW: 'bg-brand-primary/10 text-brand-primary border-brand-primary/20',
          };

          return (
            <div key={task.id} className="p-3 border border-dark-border rounded bg-dark-input hover:bg-dark-input/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-1 md:max-w-[70%]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[8px] font-mono font-semibold px-1.5 py-0.5 rounded border ${priorityColors[task.priority]}`}>
                    {task.priority} PRIORITY
                  </span>
                  <span className="text-[10px] text-brand-primary font-mono bg-brand-primary/5 border border-brand-primary/20 px-2 py-0.5 rounded">
                    {task.timeline}
                  </span>
                </div>
                <h4 className="font-display font-semibold text-xs text-white">{task.title}</h4>
                <p className="text-xs text-zinc-300 leading-normal">{task.description}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0 md:border-l md:border-dark-border md:pl-4">
                <User className="w-3.5 h-3.5 text-text-muted" />
                <span className="text-xs text-brand-primary font-medium font-mono">{task.assignee}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- 7. GitHub Integration & Human Approval Gate ---
export const GitHubIssueTab: React.FC<GitHubIssueTabProps> = ({ 
  proposal, integration, onApprove, onSync, isApproving, isSyncing, isApproved 
}) => {
  const [summary, setSummary] = React.useState('');
  const [autoApprove, setAutoApprove] = React.useState(() => {
    return localStorage.getItem('aria_auto_approve_github') === 'true';
  });

  const isSynced = integration && integration.status === 'Synced';

  // Automatically trigger approval if auto-approve is active
  React.useEffect(() => {
    if (autoApprove && !isApproved && !isSynced && !isApproving && proposal) {
      onApprove();
    }
  }, [autoApprove, isApproved, isSynced, isApproving, onApprove, proposal]);

  const handleToggleAutoApprove = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setAutoApprove(checked);
    localStorage.setItem('aria_auto_approve_github', checked ? 'true' : 'false');
  };

  return (
    <div className="bg-[#111111] border border-dark-border rounded p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between border-b border-dark-border pb-3 mb-4">
        <h3 className="font-display font-semibold text-white text-sm flex items-center gap-2">
          <Github className="w-4 h-4 text-brand-primary" /> GitHub Delivery Sync Dispatch
        </h3>
        {isSynced && (
          <span className="text-[10px] font-mono text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-2 py-0.5 rounded">
            SYNC COMPLETED
          </span>
        )}
      </div>

      {!isApproved && !isSynced ? (
        // APPROVAL GATE SHIELD
        <div className="text-center py-6 px-4 bg-dark-input border border-dark-border rounded space-y-4">
          <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto animate-pulse" />
          <div>
            <h4 className="font-display font-bold text-white text-sm">Human Approval Authorization Gate Required</h4>
            <p className="text-xs text-text-muted mt-1 max-w-md mx-auto leading-relaxed">
              In accordance with security standards, ARIA cannot dispatch external tickets or synchronize work logs without explicit human approval.
            </p>
          </div>
          
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={onApprove}
              disabled={isApproving}
              className="px-5 py-2.5 rounded bg-brand-primary text-[#0A0A0A] hover:bg-brand-primary-hover transition-all text-xs font-display font-bold flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              {isApproving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>Approve Delivery Task <ArrowRight className="w-3.5 h-3.5" /></>
              )}
            </button>

            <label className="flex items-center gap-2 text-[11px] text-text-muted hover:text-zinc-300 transition-colors cursor-pointer mt-1">
              <input 
                type="checkbox" 
                checked={autoApprove}
                onChange={handleToggleAutoApprove}
                className="rounded border-dark-border bg-dark-input text-brand-primary focus:ring-brand-primary"
              />
              <span>Auto-approve future dispatches (Bypass gate)</span>
            </label>
          </div>
        </div>
      ) : (
        // ACTION INPUT & SYNCHRONIZATION SUMMARY
        <div className="space-y-4">
          {isSynced ? (
            <div className="p-4 bg-brand-primary/5 border border-brand-primary/10 rounded space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-primary" />
                <h4 className="font-display font-bold text-white text-sm">GitHub Issue Successfully Created</h4>
              </div>
              <p className="text-xs text-zinc-300">
                Delivery ticket published. Developers can begin implementation and pull tasks directly from repository backlogs.
              </p>
              <div className="text-xs font-mono bg-dark-input p-3 rounded border border-dark-border flex items-center justify-between">
                <span>Task Reference: <strong className="text-brand-primary">{integration?.referenceId}</strong></span>
                {integration?.referenceUrl !== '#' ? (
                  <a 
                    href={integration?.referenceUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-brand-primary hover:underline flex items-center gap-1 font-semibold"
                  >
                    Open GitHub Issue <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded text-[9px]">LOCAL SYNC</span>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-2 bg-brand-primary/10 text-white rounded text-xs font-medium flex items-center gap-2 border border-brand-primary/20">
                <ShieldCheck className="w-4 h-4 text-brand-primary" /> Human Approval Gate Verified. Ready to sync task to repository.
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-display font-semibold text-zinc-300">Optional: Customize Dispatch Summary</label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Incorporate specific engineering backlog tags, epic links, or focus requirements to append to this GitHub delivery card."
                  className="w-full h-20 text-xs font-sans p-3 border border-dark-border rounded bg-dark-input text-white focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <button
                onClick={() => onSync(summary)}
                disabled={isSyncing}
                className="w-full py-2 rounded bg-brand-primary text-[#0A0A0A] hover:bg-brand-primary-hover transition-all font-display font-bold text-xs flex items-center justify-center gap-1.5"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Synchronizing Ticket...
                  </>
                ) : (
                  <>
                    Sync Delivery Task with GitHub <Github className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- 8. Audit Trail Chronology Log ---
export const AuditLogTab: React.FC<AuditLogTabProps> = ({ logs }) => {
  if (logs.length === 0) {
    return (
      <div className="p-12 text-center border border-dashed border-dark-border rounded bg-dark-panel">
        <Database className="w-8 h-8 text-text-muted mx-auto mb-3" />
        <p className="text-text-muted text-xs">The ledger log audit trail records system steps sequentially. Run a pipeline to populate.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#111111] border border-dark-border rounded p-4 max-w-3xl mx-auto">
      <h3 className="font-display font-semibold text-white text-sm mb-1 flex items-center gap-2">
        <Database className="w-4 h-4 text-brand-primary" /> Immutable State Audit Trail Ledger
      </h3>
      <p className="text-xs text-text-muted mb-4">Cryptographically logged transaction steps representing multi-agent orchestration states, human approvals, and guardrail validations.</p>

      <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-dark-border">
        {logs.map((log) => (
          <div key={log.id} className="relative pl-7 flex gap-3 text-xs">
            {/* Timeline bullet dot */}
            <span className="absolute left-3 w-3 h-3 rounded-full bg-dark-base border-2 border-brand-primary -translate-x-1/2 flex items-center justify-center shrink-0">
              <span className="w-1 h-1 rounded-full bg-brand-primary" />
            </span>

            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-mono text-[9px] text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded border border-brand-primary/20 font-semibold">
                  {log.stepName}
                </span>
                <span className="text-[10px] text-text-muted font-mono">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <h4 className="font-display font-bold text-white text-xs">{log.action}</h4>
              <p className="text-zinc-300 leading-normal">{log.details}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
