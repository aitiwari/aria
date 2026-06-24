import { updateProposal, getProposal, getOptions, addAuditLog } from '../database.js';
import { 
  runDocumentAgent, 
  runReviewerAgent, 
  runGovernanceAgent, 
  runRevisionAgent, 
  runSchedulerAgent 
} from '../agents/agents.js';
import { Proposal, SolutionOption } from '../../types.js';

export interface LoopIterationResult {
  loopIndex: number;
  document: string;
  score: number;
  governanceStatus: 'PASS' | 'FAIL';
  risks: any[];
  checklist: any[];
  feedback: string;
  passed: boolean;
}

export async function runRevisionLoop(proposalId: string, optionId: string): Promise<Proposal> {
  const stepName = 'Pipeline Orchestration';
  addAuditLog(proposalId, stepName, 'Orchestration Started', `Entering agent evaluation loop for option ${optionId}.`);

  const proposal = getProposal(proposalId);
  if (!proposal) throw new Error(`Proposal ${proposalId} not found`);

  const options = getOptions(proposalId);
  const selectedOption = options.find(o => o.id === optionId);
  if (!selectedOption) throw new Error(`Option ${optionId} not found`);

  let currentDoc = '';
  let finalScore = 0;
  let finalGovernance = 'FAIL';
  let finalRisks: any[] = [];
  let passed = false;
  let loopIndex = 0;
  const maxLoops = 3;

  updateProposal(proposalId, { status: 'PROCESSING_DOCUMENT' });

  while (loopIndex < maxLoops && !passed) {
    addAuditLog(proposalId, stepName, `Loop Iteration ${loopIndex + 1}`, `Starting analysis round ${loopIndex + 1}/${maxLoops}.`);

    // 1. Generate / Revise Document
    if (loopIndex === 0) {
      currentDoc = await runDocumentAgent(proposalId, proposal.problemStatement, selectedOption);
    } else {
      // Create a dummy mock review and governance state or use current
      const lastReview = { score: finalScore, feedback: `Needs improvements. Score is ${finalScore}.` };
      const lastGov = { status: finalGovernance, risks: finalRisks };
      currentDoc = await runRevisionAgent(proposalId, currentDoc, lastReview, lastGov, optionId);
    }

    // 2. Technical Evaluation
    const reviewResult = await runReviewerAgent(proposalId, currentDoc, optionId, loopIndex);
    finalScore = reviewResult.score;

    // 3. Governance Compliance Audit
    const govResult = await runGovernanceAgent(proposalId, currentDoc, optionId, loopIndex);
    finalGovernance = govResult.status;
    finalRisks = govResult.risks || [];

    // 4. Validate Exit Conditions
    const highRisks = finalRisks.filter(r => r.severity === 'HIGH' || r.severity === 'CRITICAL');
    const criticalRiskCount = highRisks.length;

    passed = (finalScore >= 85) && (finalGovernance === 'PASS') && (criticalRiskCount === 0);

    addAuditLog(
      proposalId, 
      stepName, 
      `Evaluation Round ${loopIndex + 1} Result`, 
      `Score: ${finalScore}/100 | Governance: ${finalGovernance} | Critical Risks: ${criticalRiskCount}. Passed: ${passed}`
    );

    if (passed) {
      addAuditLog(proposalId, stepName, 'Exit Approved', 'All automated architectural quality and governance guardrails satisfied.');
      break;
    }

    loopIndex++;
  }

  // 5. Finalize loop execution state
  let finalStatus: Proposal['status'] = 'DOCUMENT_READY';
  let auditMessage = '';

  if (passed) {
    finalStatus = 'COMPLETED';
    auditMessage = 'Architecture spec finalized and marked as Confluence-ready.';
  } else {
    finalStatus = 'FAILED'; // Fails auto guardrail, requires human override
    auditMessage = 'Human review required. The document could not pass all checks automatically within 3 attempts.';
  }

  addAuditLog(proposalId, stepName, 'Loop Terminated', auditMessage);

  // Generate Follow-up Schedule actions
  try {
    const actions = await runSchedulerAgent(proposalId, optionId, currentDoc);
    const { saveSchedule } = await import('../database.js');
    saveSchedule(proposalId, actions);
  } catch (err) {
    console.error('Failed to auto-generate schedule:', err);
  }

  const updated = updateProposal(proposalId, {
    finalDocument: currentDoc,
    finalScore: finalScore,
    finalGovernance: finalGovernance,
    finalRisks: JSON.stringify(finalRisks),
    revisionCount: loopIndex,
    status: finalStatus
  });

  return updated!;
}
