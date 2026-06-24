import Database from 'better-sqlite3';
import { Proposal, SolutionOption, AuditLog, ScheduleAction, Integration } from '../types.js';
import path from 'path';
import fs from 'fs';

let db: any = null;
let useMemoryFallback = false;

// Memory stores for fallback
const memoryProposals = new Map<string, Proposal>();
const memoryOptions = new Map<string, SolutionOption[]>();
const memoryAuditLogs = new Map<string, AuditLog[]>();
const memorySchedule = new Map<string, ScheduleAction[]>();
const memoryIntegrations = new Map<string, Integration>();

export function initDatabase() {
  try {
    const dbDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = path.join(dbDir, 'aria.db');
    db = new Database(dbPath);

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS proposals (
        id TEXT PRIMARY KEY,
        problemStatement TEXT NOT NULL,
        selectedOptionId TEXT,
        finalDocument TEXT,
        finalScore INTEGER,
        finalGovernance TEXT,
        finalRisks TEXT,
        revisionCount INTEGER DEFAULT 0,
        status TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS options (
        id TEXT PRIMARY KEY,
        proposalId TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        architecture TEXT NOT NULL,
        pros TEXT NOT NULL, -- JSON string
        cons TEXT NOT NULL, -- JSON string
        complexity TEXT NOT NULL,
        techStack TEXT NOT NULL -- JSON string
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        proposalId TEXT NOT NULL,
        stepName TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS scheduled_actions (
        id TEXT PRIMARY KEY,
        proposalId TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        assignee TEXT NOT NULL,
        timeline TEXT NOT NULL,
        priority TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS integrations (
        id TEXT PRIMARY KEY,
        proposalId TEXT NOT NULL,
        type TEXT NOT NULL,
        referenceUrl TEXT NOT NULL,
        referenceId TEXT NOT NULL,
        status TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
    `);

    console.log('SQLite database initialized successfully at', dbPath);
  } catch (error) {
    console.error('Failed to initialize SQLite, falling back to In-Memory storage:', error);
    useMemoryFallback = true;
  }
}

// Proposals Database Helpers
export function createProposal(problemStatement: string): Proposal {
  const proposal: Proposal = {
    id: 'prop_' + Math.random().toString(36).substr(2, 9),
    problemStatement,
    selectedOptionId: null,
    finalDocument: null,
    finalScore: null,
    finalGovernance: null,
    finalRisks: null,
    revisionCount: 0,
    status: 'INPUT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (useMemoryFallback) {
    memoryProposals.set(proposal.id, proposal);
    addAuditLog(proposal.id, 'Storage Agent', 'Create Proposal', 'Proposal created in-memory fallback.');
    return proposal;
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO proposals (id, problemStatement, selectedOptionId, finalDocument, finalScore, finalGovernance, finalRisks, revisionCount, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      proposal.id,
      proposal.problemStatement,
      proposal.selectedOptionId,
      proposal.finalDocument,
      proposal.finalScore,
      proposal.finalGovernance,
      proposal.finalRisks,
      proposal.revisionCount,
      proposal.status,
      proposal.createdAt,
      proposal.updatedAt
    );
    addAuditLog(proposal.id, 'Storage Agent', 'Create Proposal', 'Proposal created and persisted to SQLite.');
    return proposal;
  } catch (err) {
    console.error('SQLite createProposal failed, falling back to memory:', err);
    memoryProposals.set(proposal.id, proposal);
    return proposal;
  }
}

export function getProposal(id: string): Proposal | null {
  if (useMemoryFallback) {
    return memoryProposals.get(id) || null;
  }

  try {
    const stmt = db.prepare('SELECT * FROM proposals WHERE id = ?');
    const row = stmt.get(id);
    if (!row) return null;
    return {
      ...row,
      revisionCount: Number(row.revisionCount),
      finalScore: row.finalScore !== null ? Number(row.finalScore) : null,
    } as Proposal;
  } catch (err) {
    console.error('SQLite getProposal failed:', err);
    return memoryProposals.get(id) || null;
  }
}

export function updateProposal(id: string, updates: Partial<Proposal>): Proposal | null {
  const existing = getProposal(id);
  if (!existing) return null;

  const updated: Proposal = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  if (useMemoryFallback) {
    memoryProposals.set(id, updated);
    return updated;
  }

  try {
    const keys = Object.keys(updates).filter(k => k !== 'id');
    if (keys.length === 0) return updated;

    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => (updates as any)[k]);
    values.push(id);

    const stmt = db.prepare(`UPDATE proposals SET ${setClause}, updatedAt = datetime('now') WHERE id = ?`);
    stmt.run(...values);
    return updated;
  } catch (err) {
    console.error('SQLite updateProposal failed, updating memory:', err);
    memoryProposals.set(id, updated);
    return updated;
  }
}

// Options Database Helpers
export function saveOptions(proposalId: string, options: SolutionOption[]): SolutionOption[] {
  if (useMemoryFallback) {
    memoryOptions.set(proposalId, options);
    addAuditLog(proposalId, 'Storage Agent', 'Save Options', `Saved ${options.length} options in-memory fallback.`);
    return options;
  }

  try {
    // Delete existing options for this proposal first
    const deleteStmt = db.prepare('DELETE FROM options WHERE proposalId = ?');
    deleteStmt.run(proposalId);

    const insertStmt = db.prepare(`
      INSERT INTO options (id, proposalId, title, summary, architecture, pros, cons, complexity, techStack)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const opt of options) {
      insertStmt.run(
        opt.id,
        opt.proposalId,
        opt.title,
        opt.summary,
        opt.architecture,
        JSON.stringify(opt.pros),
        JSON.stringify(opt.cons),
        opt.complexity,
        JSON.stringify(opt.techStack)
      );
    }
    addAuditLog(proposalId, 'Storage Agent', 'Save Options', `Saved ${options.length} options to SQLite.`);
    return options;
  } catch (err) {
    console.error('SQLite saveOptions failed, falling back to memory:', err);
    memoryOptions.set(proposalId, options);
    return options;
  }
}

export function getOptions(proposalId: string): SolutionOption[] {
  if (useMemoryFallback) {
    return memoryOptions.get(proposalId) || [];
  }

  try {
    const stmt = db.prepare('SELECT * FROM options WHERE proposalId = ?');
    const rows = stmt.all(proposalId);
    return rows.map((row: any) => ({
      id: row.id,
      proposalId: row.proposalId,
      title: row.title,
      summary: row.summary,
      architecture: row.architecture,
      pros: JSON.parse(row.pros),
      cons: JSON.parse(row.cons),
      complexity: row.complexity as 'LOW' | 'MEDIUM' | 'HIGH',
      techStack: JSON.parse(row.techStack),
    }));
  } catch (err) {
    console.error('SQLite getOptions failed:', err);
    return memoryOptions.get(proposalId) || [];
  }
}

// Audit Log Helpers
export function addAuditLog(proposalId: string, stepName: string, action: string, details: string): AuditLog {
  const log: AuditLog = {
    id: 'log_' + Math.random().toString(36).substr(2, 9),
    proposalId,
    stepName,
    action,
    details,
    timestamp: new Date().toISOString(),
  };

  if (useMemoryFallback) {
    const logs = memoryAuditLogs.get(proposalId) || [];
    logs.push(log);
    memoryAuditLogs.set(proposalId, logs);
    return log;
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO audit_log (id, proposalId, stepName, action, details, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(log.id, log.proposalId, log.stepName, log.action, log.details, log.timestamp);
    return log;
  } catch (err) {
    console.error('SQLite addAuditLog failed, saving to memory:', err);
    const logs = memoryAuditLogs.get(proposalId) || [];
    logs.push(log);
    memoryAuditLogs.set(proposalId, logs);
    return log;
  }
}

export function getAuditLogs(proposalId: string): AuditLog[] {
  if (useMemoryFallback) {
    return memoryAuditLogs.get(proposalId) || [];
  }

  try {
    const stmt = db.prepare('SELECT * FROM audit_log WHERE proposalId = ? ORDER BY timestamp ASC');
    return stmt.all(proposalId) as AuditLog[];
  } catch (err) {
    console.error('SQLite getAuditLogs failed:', err);
    return memoryAuditLogs.get(proposalId) || [];
  }
}

// Schedule Helpers
export function saveSchedule(proposalId: string, schedule: ScheduleAction[]): ScheduleAction[] {
  if (useMemoryFallback) {
    memorySchedule.set(proposalId, schedule);
    addAuditLog(proposalId, 'Storage Agent', 'Save Schedule', `Saved schedule with ${schedule.length} actions in-memory fallback.`);
    return schedule;
  }

  try {
    const deleteStmt = db.prepare('DELETE FROM scheduled_actions WHERE proposalId = ?');
    deleteStmt.run(proposalId);

    const insertStmt = db.prepare(`
      INSERT INTO scheduled_actions (id, proposalId, title, description, assignee, timeline, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const act of schedule) {
      insertStmt.run(
        act.id,
        act.proposalId,
        act.title,
        act.description,
        act.assignee,
        act.timeline,
        act.priority
      );
    }
    addAuditLog(proposalId, 'Storage Agent', 'Save Schedule', `Saved schedule with ${schedule.length} actions to SQLite.`);
    return schedule;
  } catch (err) {
    console.error('SQLite saveSchedule failed, falling back to memory:', err);
    memorySchedule.set(proposalId, schedule);
    return schedule;
  }
}

export function getSchedule(proposalId: string): ScheduleAction[] {
  if (useMemoryFallback) {
    return memorySchedule.get(proposalId) || [];
  }

  try {
    const stmt = db.prepare('SELECT * FROM scheduled_actions WHERE proposalId = ?');
    return stmt.all(proposalId) as ScheduleAction[];
  } catch (err) {
    console.error('SQLite getSchedule failed:', err);
    return memorySchedule.get(proposalId) || [];
  }
}

// Integration / GitHub Helpers
export function saveIntegration(proposalId: string, integration: Integration): Integration {
  if (useMemoryFallback) {
    memoryIntegrations.set(proposalId, integration);
    addAuditLog(proposalId, 'Storage Agent', 'Save Integration', `Saved integration reference for ${integration.type} in-memory fallback.`);
    return integration;
  }

  try {
    const deleteStmt = db.prepare('DELETE FROM integrations WHERE proposalId = ?');
    deleteStmt.run(proposalId);

    const stmt = db.prepare(`
      INSERT INTO integrations (id, proposalId, type, referenceUrl, referenceId, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      integration.id,
      integration.proposalId,
      integration.type,
      integration.referenceUrl,
      integration.referenceId,
      integration.status,
      integration.createdAt
    );
    addAuditLog(proposalId, 'Storage Agent', 'Save Integration', `Saved integration reference to SQLite.`);
    return integration;
  } catch (err) {
    console.error('SQLite saveIntegration failed, falling back to memory:', err);
    memoryIntegrations.set(proposalId, integration);
    return integration;
  }
}

export function getIntegration(proposalId: string): Integration | null {
  if (useMemoryFallback) {
    return memoryIntegrations.get(proposalId) || null;
  }

  try {
    const stmt = db.prepare('SELECT * FROM integrations WHERE proposalId = ?');
    const row = stmt.get(proposalId);
    return row ? (row as Integration) : null;
  } catch (err) {
    console.error('SQLite getIntegration failed:', err);
    return memoryIntegrations.get(proposalId) || null;
  }
}
