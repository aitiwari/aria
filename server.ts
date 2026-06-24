import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

// Load Environment Variables
dotenv.config();

import { 
  initDatabase, 
  createProposal, 
  getProposal, 
  updateProposal, 
  saveOptions, 
  getOptions, 
  addAuditLog, 
  getAuditLogs, 
  getSchedule, 
  getIntegration 
} from './src/server/database.js';
import { validateInput } from './src/server/guardrails/guardrails.js';
import { runBreakdownAgent, runResearchAgent, runOptionBuilderAgent } from './src/server/agents/agents.js';
import { runRevisionLoop } from './src/server/orchestration/revisionLoop.js';
import { createGitHubIssue } from './src/server/integrations/github.js';

// Setup file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize SQLite database
  initDatabase();

  // --- API ROUTER ENDPOINTS ---

  // 1. Start Proposal (Runs input guardrails)
  app.post('/api/start-proposal', (req, res) => {
    try {
      const { problemStatement } = req.body;
      const validation = validateInput(problemStatement);
      
      if (!validation.passed) {
        return res.status(400).json({ error: validation.reason });
      }

      const proposal = createProposal(problemStatement);
      res.json({ proposalId: proposal.id, status: proposal.status });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Run Breakdown & Research Agents
  app.post('/api/run-breakdown', async (req, res) => {
    try {
      const { proposalId } = req.body;
      const proposal = getProposal(proposalId);
      if (!proposal) return res.status(404).json({ error: 'Proposal not found' });

      updateProposal(proposalId, { status: 'PROCESSING_OPTIONS' });

      const breakdown = await runBreakdownAgent(proposalId, proposal.problemStatement);
      const research = await runResearchAgent(proposalId, proposal.problemStatement, breakdown);

      res.json({ breakdown, research });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Build Three Solution Options
  app.post('/api/build-options', async (req, res) => {
    try {
      const { proposalId, breakdown, research } = req.body;
      const proposal = getProposal(proposalId);
      if (!proposal) return res.status(404).json({ error: 'Proposal not found' });

      const options = await runOptionBuilderAgent(proposalId, proposal.problemStatement, breakdown, research);
      saveOptions(proposalId, options);
      
      updateProposal(proposalId, { status: 'OPTIONS_READY' });

      res.json({ options });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Select Option (Gates document generation)
  app.post('/api/select-option', (req, res) => {
    try {
      const { proposalId, optionId } = req.body;
      const proposal = getProposal(proposalId);
      if (!proposal) return res.status(404).json({ error: 'Proposal not found' });

      // Requirement: "Require option selection before document generation. Log selected option, selection time, and proposal ID."
      addAuditLog(
        proposalId, 
        'Human Gate', 
        'Option Selected', 
        `User manually selected Option ID: "${optionId}". Selection Timestamp: ${new Date().toISOString()}`
      );

      const updated = updateProposal(proposalId, { 
        selectedOptionId: optionId,
        status: 'PROCESSING_DOCUMENT'
      });

      res.json({ proposal: updated });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Run Iterative Revision Loop Orchestrator
  app.post('/api/run-loop', async (req, res) => {
    try {
      const { proposalId, optionId } = req.body;
      const updatedProposal = await runRevisionLoop(proposalId, optionId);
      res.json({ proposal: updatedProposal });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Approve Dispatch Action (Audit gate before issue creation)
  app.post('/api/approve-action', (req, res) => {
    try {
      const { proposalId } = req.body;
      
      // Requirement: "Require approval before GitHub Issue creation. Log approval or rejection."
      addAuditLog(
        proposalId, 
        'Human Approval Gate', 
        'Task Synced Approved', 
        `Explicit authorization received to dispatch issue at ${new Date().toISOString()}`
      );

      res.json({ success: true, status: 'APPROVED' });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Create GitHub Issue
  app.post('/api/create-github-issue', async (req, res) => {
    try {
      const { proposalId, summary } = req.body;
      const integration = await createGitHubIssue(proposalId, summary);
      res.json({ integration });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // 8. Retrieve Full Proposal State
  app.get('/api/proposal/:id', (req, res) => {
    try {
      const proposal = getProposal(req.params.id);
      if (!proposal) return res.status(404).json({ error: 'Proposal not found' });

      const options = getOptions(req.params.id);
      const integration = getIntegration(req.params.id);

      res.json({ proposal, options, integration });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // 9. Retrieve Audit Logs
  app.get('/api/audit/:id', (req, res) => {
    try {
      const logs = getAuditLogs(req.params.id);
      res.json({ logs });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // 10. Retrieve Scheduled Milestones
  app.get('/api/schedule/:id', (req, res) => {
    try {
      const schedule = getSchedule(req.params.id);
      res.json({ schedule });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // 11. Retrieve AI Engine Status
  app.get('/api/ai-status', (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      const isConfigured = !!apiKey && apiKey !== 'MY_GEMINI_API_KEY';
      res.json({
        isConfigured,
        model: 'gemini-3.5-flash',
        demoMode: process.env.DEMO_MODE === 'true' || !isConfigured
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });


  // --- VITE MIDDLEWARE SETUP ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ARIA Core Server running on http://localhost:${PORT}`);
  });
}

startServer();
