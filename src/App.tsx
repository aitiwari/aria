import { useState, useEffect, FormEvent } from 'react';
import { 
  Play, Loader2, RefreshCw, Layers, ArrowRight, ShieldCheck, ShieldAlert,
  ClipboardList, Calendar, Github, Database, FileText, Settings, Sparkles
} from 'lucide-react';
import { Proposal, SolutionOption, AuditLog, ScheduleAction, Integration } from './types.js';
import { 
  startProposal, runBreakdown, buildOptions, selectOption, runLoop, 
  approveAction, createGitHubIssue, getProposalState, getAuditLogs, getScheduleList,
  getAiStatus
} from './lib/api.js';
import { 
  PipelineStatus, OptionCards, MarkdownPreview, ReviewTab, GovernanceTab, 
  SchedulerTab, GitHubIssueTab, AuditLogTab 
} from './components/AriaComponents.js';
import { WorkspaceTab } from './components/WorkspaceTab.js';

export default function App() {
  // Main Proposal & Pipeline States
  const [problem, setProblem] = useState('');
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [options, setOptions] = useState<SolutionOption[]>([]);
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [schedule, setSchedule] = useState<ScheduleAction[]>([]);

  // Navigation & Tabs State
  const [activeTab, setActiveTab] = useState<'doc' | 'review' | 'gov' | 'schedule' | 'github' | 'audit' | 'workspace'>('doc');

  // Loading / Spinner States
  const [isInitializing, setIsInitializing] = useState(false);
  const [currentStepText, setCurrentStepText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Human Gates State
  const [isApproved, setIsApproved] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // AI status state
  const [aiStatus, setAiStatus] = useState<{ isConfigured: boolean; model: string; demoMode: boolean } | null>(null);

  // Restore session from localStorage on mount (survives refresh requirement)
  useEffect(() => {
    const savedId = localStorage.getItem('aria_active_proposal_id');
    if (savedId) {
      loadFullState(savedId);
    }
    fetchAiStatus();
  }, []);

  const fetchAiStatus = async () => {
    try {
      const status = await getAiStatus();
      setAiStatus(status);
    } catch (err) {
      console.error('Failed to load AI status:', err);
    }
  };

  // Poll state occasionally if processing
  useEffect(() => {
    let interval: any;
    if (proposalId && (proposal?.status === 'PROCESSING_OPTIONS' || proposal?.status === 'PROCESSING_DOCUMENT')) {
      interval = setInterval(() => {
        refreshStateOnly(proposalId);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [proposalId, proposal?.status]);

  const loadFullState = async (id: string) => {
    try {
      setIsInitializing(true);
      setError(null);
      const state = await getProposalState(id);
      const logsData = await getAuditLogs(id);
      const schedData = await getScheduleList(id);

      setProposalId(id);
      setProposal(state.proposal);
      setOptions(state.options);
      setIntegration(state.integration);
      setAuditLogs(logsData.logs);
      setSchedule(schedData.schedule);

      // Restore approval state if synced or synced locally
      if (state.integration) {
        setIsApproved(true);
      }
      
      // Update form text if starting fresh
      if (state.proposal && !problem) {
        setProblem(state.proposal.problemStatement);
      }
    } catch (err: any) {
      console.error('Failed to reload proposal state:', err);
      setError(err.message);
      localStorage.removeItem('aria_active_proposal_id');
    } finally {
      setIsInitializing(false);
    }
  };

  const refreshStateOnly = async (id: string) => {
    try {
      const state = await getProposalState(id);
      const logsData = await getAuditLogs(id);
      const schedData = await getScheduleList(id);

      setProposal(state.proposal);
      setOptions(state.options);
      setIntegration(state.integration);
      setAuditLogs(logsData.logs);
      setSchedule(schedData.schedule);
    } catch (err) {
      console.error('Polling error:', err);
    }
  };

  // 1. Launch Agent Pipeline Action
  const handleLaunchPipeline = async (e: FormEvent) => {
    e.preventDefault();
    if (!problem.trim()) return;

    try {
      setError(null);
      setIsInitializing(true);
      setProposalId(null);
      setProposal(null);
      setOptions([]);
      setIntegration(null);
      setAuditLogs([]);
      setSchedule([]);
      setIsApproved(false);
      setActiveTab('doc');

      // Step A: Start Proposal (Ingress Guardrails)
      setCurrentStepText('Running Input Guardrails & Threat Checks');
      const startRes = await startProposal(problem);
      const activeId = startRes.proposalId;
      setProposalId(activeId);
      localStorage.setItem('aria_active_proposal_id', activeId);

      // Step B: Trigger Breakdown & Research
      setCurrentStepText('Breakdown Agent analyzing structural constraints');
      const breakdownRes = await runBreakdown(activeId);

      // Step C: Trigger Alternative Option Builder
      setCurrentStepText('Option Builder Agent drafting architecture variants');
      const optionsRes = await buildOptions(activeId, breakdownRes.breakdown, breakdownRes.research);

      // Fetch consolidated final state for phase 1
      await loadFullState(activeId);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsInitializing(false);
      setCurrentStepText('');
    }
  };

  // 2. Select Architectural Blueprint Gate
  const handleOptionSelect = async (optionId: string) => {
    if (!proposalId) return;

    try {
      setError(null);
      setIsInitializing(true);
      setCurrentStepText('Registering Primary Solution Blueprint Selection');

      const selectRes = await selectOption(proposalId, optionId);
      setProposal(selectRes.proposal);

      // Immediately run the Multi-Agent Evaluation & Revision Loop
      setCurrentStepText('Starting Orchestrated Peer Audit & Compliance Revision Loops');
      const loopRes = await runLoop(proposalId, optionId);
      
      await loadFullState(proposalId);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsInitializing(false);
      setCurrentStepText('');
    }
  };

  // 3. Human Gate Authorization Approval
  const handleApproveDispatch = async () => {
    if (!proposalId) return;

    try {
      setIsApproving(true);
      setError(null);
      const res = await approveAction(proposalId);
      if (res.success) {
        setIsApproved(true);
        // Refresh logs
        const logsData = await getAuditLogs(proposalId);
        setAuditLogs(logsData.logs);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsApproving(false);
    }
  };

  // 4. Sync Task to GitHub
  const handleSyncGitHub = async (summaryText: string) => {
    if (!proposalId) return;

    try {
      setIsSyncing(true);
      setError(null);
      const res = await createGitHubIssue(proposalId, summaryText);
      setIntegration(res.integration);
      
      // Refresh logs & details
      const logsData = await getAuditLogs(proposalId);
      setAuditLogs(logsData.logs);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Clear current active proposal to start fresh
  const handleReset = () => {
    localStorage.removeItem('aria_active_proposal_id');
    setProposalId(null);
    setProposal(null);
    setOptions([]);
    setIntegration(null);
    setAuditLogs([]);
    setSchedule([]);
    setProblem('');
    setError(null);
    setIsApproved(false);
  };

  // Parse risks string safely
  const parsedRisks = proposal?.finalRisks ? JSON.parse(proposal.finalRisks) : null;
  const isDocPassing = proposal?.finalScore && proposal.finalScore >= 85;

  return (
    <div className="min-h-screen bg-dark-base text-text-main flex flex-col font-sans selection:bg-brand-primary/20 selection:text-white">
      {/* HEADER BAR */}
      <header className="bg-dark-header border-b border-dark-border h-16 px-6 sticky top-0 z-40 flex items-center">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-brand-primary border border-brand-primary/40 flex items-center justify-center text-dark-base font-display font-bold tracking-wide shadow-inner">
              Æ
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-display font-bold text-sm tracking-tight text-white leading-none">ARIA</h1>
                <span className="text-[9px] font-mono font-semibold tracking-wider bg-brand-primary/10 text-brand-primary border border-brand-primary/25 px-1.5 py-0.5 rounded uppercase leading-none">
                  V1.1_Live
                </span>
              </div>
              <p className="text-[10px] text-text-muted font-mono leading-none mt-1">Multi-Agent Solution Architect Pipeline</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {proposalId && (
              <button 
                onClick={handleReset}
                className="text-[10px] font-mono font-semibold text-brand-primary hover:text-white transition-all bg-dark-input border border-dark-border px-3 py-1.5 rounded flex items-center gap-1.5"
              >
                Reset Canvas
              </button>
            )}
            {aiStatus && (
              <div className="text-[9px] font-mono bg-dark-input px-3 py-1.5 rounded border border-dark-border hidden md:flex items-center gap-1.5">
                AI ENGINE: <strong className={aiStatus.demoMode ? "text-amber-500" : "text-brand-primary animate-pulse"}>
                  {aiStatus.demoMode ? "SANDBOX" : aiStatus.model.toUpperCase()}
                </strong>
              </div>
            )}
            <div className="text-[9px] text-text-muted font-mono bg-dark-input px-3 py-1.5 rounded border border-dark-border hidden md:block">
              SERVER STATUS: <strong className="text-brand-primary">ONLINE</strong>
            </div>
          </div>
        </div>
      </header>

      {/* BODY CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-4">
        
        {/* UPPER ROW: PROBLEM INPUT & LOADER STATUS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* PROBLEM INPUT CARD */}
          <div className="lg:col-span-6 bg-dark-card border border-dark-border rounded p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-brand-primary" />
                <h2 className="font-display font-bold text-white text-sm">Define Architectural Problem Space</h2>
              </div>
              <p className="text-[11px] text-text-muted mb-3 leading-normal">
                Input your business goals, latency targets, payload requirements, and constraints. ARIA will securely analyze the bounds, consult compliance, and output 3 distinct alternatives.
              </p>

              {aiStatus && aiStatus.demoMode && (
                <div className="p-3 mb-3 bg-amber-500/5 border border-amber-500/20 text-amber-200 text-[10px] rounded flex gap-2.5 leading-normal items-start">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-300 font-bold block mb-0.5">Sandbox Mode Active:</strong>
                    Generating specs using curated high-fidelity blueprints. To enable <strong>Live AI Generation</strong> custom-tailored to your exact prompt, add your <strong>GEMINI_API_KEY</strong> under <strong>Settings &gt; Secrets</strong>.
                  </div>
                </div>
              )}
              {aiStatus && !aiStatus.demoMode && (
                <div className="p-3 mb-3 bg-brand-primary/5 border border-brand-primary/25 text-brand-primary text-[10px] rounded flex gap-2.5 leading-normal items-start">
                  <Sparkles className="w-3.5 h-3.5 text-brand-primary shrink-0 animate-pulse mt-0.5" />
                  <div>
                    <strong className="text-white font-bold block mb-0.5">Live AI Generation Active:</strong>
                    Using <strong>Gemini 3.5 Flash</strong> to compile customized multi-agent blueprints, compliance reports, and timelines mapped to your exact problem parameters.
                  </div>
                </div>
              )}

              <form onSubmit={handleLaunchPipeline} className="space-y-3">
                <textarea
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  disabled={isInitializing || (proposal !== null && proposal.status !== 'INPUT')}
                  placeholder="Example: High latency and frequent database contention during peak transaction hours, leading to user checkout timeouts and abandoned carts. Must handle 10,000 req/sec while maintaining PCI-DSS security compliance..."
                  className="w-full h-32 p-3 text-xs font-sans border border-dark-border rounded focus:outline-none focus:ring-1 focus:ring-brand-primary bg-dark-input focus:bg-dark-input/80 text-white transition-all resize-none leading-relaxed"
                />

                {error && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded text-rose-200 text-xs flex gap-2.5 items-start">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <div>
                      <strong className="font-bold">Guardrail Alert:</strong>
                      <p className="mt-0.5 text-rose-300">{error}</p>
                    </div>
                  </div>
                )}

                {proposal?.status === 'INPUT' || !proposalId ? (
                  <button
                    type="submit"
                    disabled={isInitializing || !problem.trim()}
                    className="w-full py-2 px-4 rounded bg-brand-primary text-dark-base font-display font-bold text-xs hover:bg-brand-primary-hover transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                  >
                    {isInitializing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-dark-base" /> {currentStepText || 'Evaluating Guardrails...'}
                      </>
                    ) : (
                      <>
                        Launch Solution Architect Pipeline <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-brand-primary/10 text-white rounded border border-brand-primary/20 text-xs font-medium">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-brand-primary" /> Ingress security check passed. Proposal is locked.
                    </div>
                    <button 
                      type="button" 
                      onClick={handleReset} 
                      className="text-brand-primary font-semibold hover:underline"
                    >
                      New Spec
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* ACTIVE PIPELINE TELEMETRY */}
          <div className="lg:col-span-6 bg-[#111111] border border-dark-border rounded p-4 flex flex-col justify-between text-white">
            <div>
              <h3 className="font-display font-semibold text-xs text-brand-primary tracking-wider uppercase mb-1">State Machine Watch</h3>
              <p className="text-[10px] text-text-muted font-mono mb-3">Orchestration events currently registering inside the AI pipeline.</p>
            </div>
            
            <div className="flex-1 min-h-[140px] flex flex-col justify-center">
              {proposalId ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-dark-border pb-1.5 text-xs font-mono">
                    <span className="text-text-muted">Proposal ID</span>
                    <span className="text-brand-primary font-semibold">{proposalId}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-dark-border pb-1.5 text-xs font-mono">
                    <span className="text-text-muted">Current Phase</span>
                    <span className="text-brand-primary font-semibold uppercase">{proposal?.status}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-dark-border pb-1.5 text-xs font-mono">
                    <span className="text-text-muted">Evaluation Retries</span>
                    <span className="text-brand-primary font-semibold">
                      {proposal?.revisionCount !== undefined ? `${proposal.revisionCount} / 3 Attempts` : '0 / 3'}
                    </span>
                  </div>
                  {proposal?.status === 'FAILED' && (
                    <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-[10px] font-mono text-rose-300 leading-normal">
                      🔴 Automated loop terminated. Quality benchmarks failed. Human revision & override is required.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Layers className="w-8 h-8 text-[#262626] mx-auto mb-2 animate-pulse" />
                  <p className="text-text-muted text-xs font-mono">Telemetry stream offline. Launch the pipeline to connect core agent threads.</p>
                </div>
              )}
            </div>

            {isInitializing && (
              <div className="pt-2 border-t border-dark-border mt-2 flex items-center gap-2 text-brand-primary text-xs font-mono animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-primary" />
                <span>{currentStepText || 'Processing pipeline state...'}</span>
              </div>
            )}
          </div>
        </div>

        {/* AGENT TERMINAL TIMELINE PANEL */}
        {proposalId && (
          <PipelineStatus 
            proposal={proposal} 
            auditLogs={auditLogs} 
            currentStep={isInitializing ? currentStepText : ''} 
          />
        )}

        {/* DOWNSTREAM STEPS: ALTERNATIVE BLUEPRINTS & DETAILED AUDITED REPORTS */}
        {options.length > 0 && (
          <OptionCards 
            options={options} 
            selectedId={proposal?.selectedOptionId || null} 
            onSelect={handleOptionSelect}
            isLoading={isInitializing && proposal?.status === 'PROCESSING_OPTIONS'}
          />
        )}

        {/* MAIN ANALYSIS REPORT CONTAINER */}
        {proposal && proposal.finalDocument && (
          <div id="spec-report-card" className="space-y-4">
            
            {/* TABS SELECTOR STRIP */}
            <div className="flex border-b border-dark-border overflow-x-auto gap-1">
              <button
                onClick={() => setActiveTab('doc')}
                className={`py-2 px-3 text-xs font-display font-semibold border-b-2 transition-all shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'doc' 
                    ? 'border-brand-primary text-brand-primary' 
                    : 'border-transparent text-text-muted hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Solution Blueprint Spec
              </button>
              
              <button
                onClick={() => setActiveTab('review')}
                className={`py-2 px-3 text-xs font-display font-semibold border-b-2 transition-all shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'review' 
                    ? 'border-brand-primary text-brand-primary' 
                    : 'border-transparent text-text-muted hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Technical Review Audit
                {proposal.finalScore && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isDocPassing ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {proposal.finalScore}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('gov')}
                className={`py-2 px-3 text-xs font-display font-semibold border-b-2 transition-all shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'gov' 
                    ? 'border-brand-primary text-brand-primary' 
                    : 'border-transparent text-text-muted hover:text-white'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" /> Safety & Governance
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  proposal.finalGovernance === 'PASS' ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {proposal.finalGovernance}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('schedule')}
                className={`py-2 px-3 text-xs font-display font-semibold border-b-2 transition-all shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'schedule' 
                    ? 'border-brand-primary text-brand-primary' 
                    : 'border-transparent text-text-muted hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" /> Implementation Task List
                {schedule.length > 0 && (
                  <span className="text-[10px] font-mono bg-dark-input text-brand-primary px-1.5 py-0.5 rounded border border-dark-border">
                    {schedule.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('github')}
                className={`py-2 px-3 text-xs font-display font-semibold border-b-2 transition-all shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'github' 
                    ? 'border-brand-primary text-brand-primary' 
                    : 'border-transparent text-text-muted hover:text-white'
                }`}
              >
                <Github className="w-3.5 h-3.5" /> GitHub Dispatcher
                {integration && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    integration.status === 'Synced' ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {integration.status}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('workspace')}
                className={`py-2 px-3 text-xs font-display font-semibold border-b-2 transition-all shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'workspace' 
                    ? 'border-brand-primary text-brand-primary' 
                    : 'border-transparent text-text-muted hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-brand-primary" /> Google Workspace
              </button>

              <button
                onClick={() => setActiveTab('audit')}
                className={`py-2 px-3 text-xs font-display font-semibold border-b-2 transition-all shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'audit' 
                    ? 'border-brand-primary text-brand-primary' 
                    : 'border-transparent text-text-muted hover:text-white'
                }`}
              >
                <Database className="w-3.5 h-3.5" /> System Audit Trail
              </button>
            </div>

            {/* TAB CONTENTS SWITCHER */}
            <div className="transition-all duration-300">
              {activeTab === 'doc' && (
                <MarkdownPreview markdown={proposal.finalDocument} />
              )}

              {activeTab === 'review' && (
                <ReviewTab 
                  score={proposal.finalScore} 
                  reviewData={
                    proposal.selectedOptionId === 'opt_hybrid_monolith_optimized' && proposal.revisionCount === 0
                      ? {
                          feedback: "Simple and robust, but lacks details on backup strategies and high availability setup.",
                          strengths: ["Fast implementation time", "Reduced network hop latency"],
                          improvements: ["Add secondary database replica architecture.", "Include automated hourly DB snapshot procedures."]
                        }
                      : {
                          feedback: "Peer auditor confirms the document addresses core scaling limitations while retaining PCI-DSS standards.",
                          strengths: ["Detailed high availability specification", "Added database Multi-Zone backup snapshot recovery steps"],
                          improvements: ["Continually log latency performance on connection pooling caches."]
                        }
                  } 
                />
              )}

              {activeTab === 'gov' && (
                <GovernanceTab 
                  status={proposal.finalGovernance} 
                  risks={parsedRisks} 
                  checklist={
                    proposal.selectedOptionId === 'opt_hybrid_monolith_optimized' && proposal.revisionCount === 0
                      ? [
                          { rule: "High Availability Redundancy", status: "NON_COMPLIANT" },
                          { rule: "Automated Backup Policy", status: "NON_COMPLIANT" },
                          { rule: "Least Privilege DB Access", status: "COMPLIANT" }
                        ]
                      : [
                          { rule: "High Availability Redundancy", status: "COMPLIANT" },
                          { rule: "Automated Backup Policy", status: "COMPLIANT" },
                          { rule: "Least Privilege DB Access", status: "COMPLIANT" }
                        ]
                  } 
                />
              )}

              {activeTab === 'schedule' && (
                <SchedulerTab schedule={schedule} />
              )}

              {activeTab === 'github' && (
                <GitHubIssueTab 
                  proposal={proposal} 
                  integration={integration}
                  onApprove={handleApproveDispatch}
                  onSync={handleSyncGitHub}
                  isApproving={isApproving}
                  isSyncing={isSyncing}
                  isApproved={isApproved}
                />
              )}

              {activeTab === 'workspace' && (
                <WorkspaceTab 
                  proposal={proposal} 
                  options={options} 
                  schedule={schedule}
                  risks={parsedRisks}
                />
              )}

              {activeTab === 'audit' && (
                <AuditLogTab logs={auditLogs} />
              )}
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-dark-header text-text-muted py-5 px-6 text-center border-t border-dark-border text-[11px] font-mono mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <p>© 2026 ARIA • High-Fidelity Solution Architect Engine.</p>
          <p className="text-[10px] text-text-muted/60">
            Running in sandboxed secure Cloud Run container environment. Port: 3000
          </p>
        </div>
      </footer>
    </div>
  );
}
