import { Proposal, SolutionOption, AuditLog, ScheduleAction, Integration } from '../types.js';

export async function startProposal(problemStatement: string): Promise<{ proposalId: string; status: string }> {
  const res = await fetch('/api/start-proposal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ problemStatement })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to start proposal');
  }
  return res.json();
}

export async function runBreakdown(proposalId: string): Promise<{ breakdown: any; research: string }> {
  const res = await fetch('/api/run-breakdown', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proposalId })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to run breakdown');
  }
  return res.json();
}

export async function buildOptions(proposalId: string, breakdown: any, research: string): Promise<{ options: SolutionOption[] }> {
  const res = await fetch('/api/build-options', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proposalId, breakdown, research })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to build options');
  }
  return res.json();
}

export async function selectOption(proposalId: string, optionId: string): Promise<{ proposal: Proposal }> {
  const res = await fetch('/api/select-option', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proposalId, optionId })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to select option');
  }
  return res.json();
}

export async function runLoop(proposalId: string, optionId: string): Promise<{ proposal: Proposal }> {
  const res = await fetch('/api/run-loop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proposalId, optionId })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to execute revision loop');
  }
  return res.json();
}

export async function approveAction(proposalId: string): Promise<{ success: boolean; status: string }> {
  const res = await fetch('/api/approve-action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proposalId })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to approve task dispatch');
  }
  return res.json();
}

export async function createGitHubIssue(proposalId: string, summary: string): Promise<{ integration: Integration }> {
  const res = await fetch('/api/create-github-issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proposalId, summary })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to sync task with GitHub');
  }
  return res.json();
}

export async function getProposalState(proposalId: string): Promise<{ proposal: Proposal; options: SolutionOption[]; integration: Integration | null }> {
  const res = await fetch(`/api/proposal/${proposalId}`);
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to fetch proposal details');
  }
  return res.json();
}

export async function getAuditLogs(proposalId: string): Promise<{ logs: AuditLog[] }> {
  const res = await fetch(`/api/audit/${proposalId}`);
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to fetch audit trails');
  }
  return res.json();
}

export async function getScheduleList(proposalId: string): Promise<{ schedule: ScheduleAction[] }> {
  const res = await fetch(`/api/schedule/${proposalId}`);
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to fetch timelines');
  }
  return res.json();
}

export async function getAiStatus(): Promise<{ isConfigured: boolean; model: string; demoMode: boolean }> {
  const res = await fetch('/api/ai-status');
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to fetch AI status');
  }
  return res.json();
}
