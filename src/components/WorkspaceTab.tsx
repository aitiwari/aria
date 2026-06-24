import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, Mail, CheckSquare, MessageSquare, Clipboard, 
  ExternalLink, Send, Loader2, Check, AlertTriangle, ArrowRight, LogOut,
  Sparkles, HelpCircle
} from 'lucide-react';
import { Proposal, SolutionOption, ScheduleAction } from '../types.js';
import { initAuth, googleSignIn, logout } from '../lib/firebaseAuth.js';
import { 
  createGoogleSheet, sendGmailSummary, exportToGoogleTasks, 
  listChatSpaces, postToChatSpace, createFeedbackForm, ChatSpace 
} from '../lib/workspace.js';

interface WorkspaceTabProps {
  proposal: Proposal | null;
  options: SolutionOption[];
  schedule: ScheduleAction[];
  risks: { severity: string; description: string }[] | null;
}

export const WorkspaceTab: React.FC<WorkspaceTabProps> = ({ 
  proposal, options, schedule, risks 
}) => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Sheets state
  const [isSheetsActive, setIsSheetsActive] = useState(false);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);

  // Gmail state
  const [isGmailActive, setIsGmailActive] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Tasks state
  const [isTasksActive, setIsTasksActive] = useState(false);
  const [tasksExported, setTasksExported] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);

  // Chat state
  const [isChatActive, setIsChatActive] = useState(false);
  const [chatSpaces, setChatSpaces] = useState<ChatSpace[]>([]);
  const [isLoadingSpaces, setIsLoadingSpaces] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [chatPosted, setChatPosted] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Forms state
  const [isFormsActive, setIsFormsActive] = useState(false);
  const [formUrl, setFormUrl] = useState<string | null>(null);
  const [formEditUrl, setFormEditUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Initialize auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
        // Pre-fill email and default inputs
        if (currentUser.email) {
          setRecipientEmail(currentUser.email);
        }
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);
        if (result.user.email) {
          setRecipientEmail(result.user.email);
        }
      }
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setNeedsAuth(true);
    // Reset all status states
    setSheetUrl(null);
    setEmailSent(false);
    setTasksExported(false);
    setChatPosted(false);
    setFormUrl(null);
  };

  // Pre-fill subject and message once proposal updates
  useEffect(() => {
    if (proposal) {
      setEmailSubject(`ARIA Spec Release: ${proposal.id}`);
      setChatMessage(`Hi team, I've compiled our technical architecture report for: "${proposal.problemStatement.slice(0, 60)}...". Let me know your thoughts!`);
    }
  }, [proposal]);

  // Load chat spaces when chat section is opened or authenticated
  const loadSpaces = async () => {
    if (!token) return;
    setIsLoadingSpaces(true);
    setChatError(null);
    try {
      const spaces = await listChatSpaces(token);
      setChatSpaces(spaces);
      if (spaces.length > 0) {
        setSelectedSpace(spaces[0].name);
      }
    } catch (err: any) {
      console.error(err);
      setChatError('Could not load Google Chat spaces. Make sure Chat API is enabled.');
    } finally {
      setIsLoadingSpaces(false);
    }
  };

  // Google Sheets integration
  const handleExportSheet = async () => {
    if (!token || !proposal) return;
    
    const confirmed = window.confirm(
      'Export architecture solutions and risks to a new Google Sheet?'
    );
    if (!confirmed) return;

    setIsSheetsActive(true);
    setSheetError(null);
    try {
      const url = await createGoogleSheet(
        token, 
        proposal.id, 
        options, 
        risks?.map(r => `[${r.severity}] ${r.description}`) || []
      );
      setSheetUrl(url);
    } catch (err: any) {
      setSheetError(err.message || 'Sheets Export failed.');
    } finally {
      setIsSheetsActive(false);
    }
  };

  // Gmail integration
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !proposal || !recipientEmail) return;

    const confirmed = window.confirm(
      `Send architectural specification draft to ${recipientEmail}?`
    );
    if (!confirmed) return;

    setIsGmailActive(true);
    setEmailError(null);
    try {
      await sendGmailSummary(
        token,
        recipientEmail,
        emailSubject,
        proposal.id,
        proposal.finalDocument || ''
      );
      setEmailSent(true);
    } catch (err: any) {
      setEmailError(err.message || 'Gmail send failed.');
    } finally {
      setIsGmailActive(false);
    }
  };

  // Google Tasks integration
  const handleExportTasks = async () => {
    if (!token || !proposal || schedule.length === 0) return;

    const confirmed = window.confirm(
      `Sync all ${schedule.length} architectural follow-up action items directly to your Google Tasks account?`
    );
    if (!confirmed) return;

    setIsTasksActive(true);
    setTasksError(null);
    try {
      await exportToGoogleTasks(token, proposal.id, schedule);
      setTasksExported(true);
    } catch (err: any) {
      setTasksError(err.message || 'Tasks integration failed.');
    } finally {
      setIsTasksActive(false);
    }
  };

  // Google Chat integration
  const handlePostChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !proposal || !selectedSpace) return;

    const confirmed = window.confirm(
      'Post this architectural blueprint update directly to Google Chat?'
    );
    if (!confirmed) return;

    setIsChatActive(true);
    setChatError(null);
    try {
      await postToChatSpace(token, selectedSpace, proposal.id, chatMessage);
      setChatPosted(true);
    } catch (err: any) {
      setChatError(err.message || 'Chat post failed.');
    } finally {
      setIsChatActive(false);
    }
  };

  // Google Forms integration
  const handleCreateForm = async () => {
    if (!token || !proposal) return;

    const confirmed = window.confirm(
      'Generate an interactive Google feedback form mapped to this spec?'
    );
    if (!confirmed) return;

    setIsFormsActive(true);
    setFormError(null);
    try {
      const result = await createFeedbackForm(token, proposal.id);
      setFormUrl(result.formUrl);
      setFormEditUrl(result.editUrl);
    } catch (err: any) {
      setFormError(err.message || 'Forms creation failed.');
    } finally {
      setIsFormsActive(false);
    }
  };

  // Sign In UI panel
  if (needsAuth) {
    return (
      <div className="bg-[#111111] border border-dark-border rounded-lg p-8 max-w-xl mx-auto text-center space-y-6">
        <div className="w-14 h-14 bg-brand-primary/10 border border-brand-primary/20 rounded-full flex items-center justify-center mx-auto text-brand-primary">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h3 className="font-display font-bold text-white text-lg">Connect Google Workspace Tools</h3>
          <p className="text-xs text-text-muted mt-2 max-w-md mx-auto leading-relaxed">
            Link your Google account securely to unlock deep integrations. This lets ARIA push spreadsheets, send reports, sync task lists, notify chat spaces, and spin up team feedback forms.
          </p>
        </div>

        {/* Official GSI Material Button */}
        <button 
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="gsi-material-button w-full sm:w-auto mx-auto justify-center"
          style={{ display: 'inline-flex' }}
        >
          <div className="gsi-material-button-state"></div>
          <div className="gsi-material-button-content-wrapper">
            <div className="gsi-material-button-icon">
              {isLoggingIn ? (
                <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
              ) : (
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
              )}
            </div>
            <span className="gsi-material-button-contents font-semibold">Sign in with Google Workspace</span>
          </div>
        </button>

        <div className="pt-4 border-t border-dark-border text-[10px] text-text-muted flex items-center justify-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" /> Direct secure OAuth connection. In-memory token handling only.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active User Strip */}
      <div className="bg-[#111111] border border-dark-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.displayName} className="w-9 h-9 rounded-full border border-brand-primary/20" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary font-bold text-sm">
              {user.displayName?.[0] || 'U'}
            </div>
          )}
          <div>
            <h4 className="text-xs font-semibold text-white leading-none">{user.displayName || 'Google Workspace User'}</h4>
            <p className="text-[10px] text-text-muted mt-1 font-mono">{user.email}</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="text-[10px] font-mono text-rose-400 hover:text-white transition-all bg-dark-input hover:bg-rose-500/10 border border-dark-border hover:border-rose-500/30 px-3 py-1.5 rounded flex items-center gap-1.5 w-fit"
        >
          <LogOut className="w-3 h-3" /> Disconnect Workspace
        </button>
      </div>

      {/* Main Grid of Workspace Integrations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* 1. GOOGLE SHEETS */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-5 flex flex-col justify-between hover:border-brand-primary/40 transition-all">
          <div>
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <FileSpreadsheet className="w-4.5 h-4.5" />
              </div>
              <h3 className="font-display font-semibold text-sm text-white">Google Sheets Dispatcher</h3>
            </div>
            <p className="text-[11px] text-text-muted mb-4 leading-normal">
              Create an architecture workbook compilation of your selected blueprint alternatives, comprehensive stack descriptions, and risk registry logs.
            </p>

            {sheetUrl && (
              <div className="mb-4 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded flex items-center justify-between text-xs">
                <span className="text-emerald-300 font-mono text-[10px] flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> Spreadsheet Ready
                </span>
                <a 
                  href={sheetUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  View Sheet <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {sheetError && (
              <div className="mb-4 p-2.5 bg-rose-500/5 border border-rose-500/20 rounded text-[11px] text-rose-300 font-mono">
                Error: {sheetError}
              </div>
            )}
          </div>

          <button
            onClick={handleExportSheet}
            disabled={isSheetsActive}
            className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-45 rounded font-display font-bold text-xs transition-all flex items-center justify-center gap-1.5"
          >
            {isSheetsActive ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>Export Specification Sheet <ArrowRight className="w-3.5 h-3.5" /></>
            )}
          </button>
        </div>

        {/* 2. GMAIL CLIENT DISPATCH */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-5 hover:border-brand-primary/40 transition-all">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <Mail className="w-4.5 h-4.5" />
            </div>
            <h3 className="font-display font-semibold text-sm text-white">Gmail Direct Report</h3>
          </div>
          <p className="text-[11px] text-text-muted mb-4 leading-normal">
            Securely compose and transmit the full markdown specification report directly to stakeholders or review bodies.
          </p>

          {emailSent && (
            <div className="mb-4 p-3 bg-brand-primary/10 border border-brand-primary/20 rounded text-xs text-brand-primary flex items-center gap-1.5 font-medium">
              <Check className="w-3.5 h-3.5" /> Document dispatch sent successfully to {recipientEmail}.
            </div>
          )}

          {emailError && (
            <div className="mb-4 p-2.5 bg-rose-500/5 border border-rose-500/20 rounded text-[11px] text-rose-300 font-mono">
              Error: {emailError}
            </div>
          )}

          <form onSubmit={handleSendEmail} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-mono text-text-muted uppercase mb-1">Recipient Email</label>
                <input 
                  type="email" 
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full p-2 bg-dark-input text-xs border border-dark-border rounded focus:outline-none focus:ring-1 focus:ring-brand-primary text-white"
                  placeholder="name@company.com"
                />
              </div>
              <div>
                <label className="block text-[9px] font-mono text-text-muted uppercase mb-1">Subject</label>
                <input 
                  type="text" 
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full p-2 bg-dark-input text-xs border border-dark-border rounded focus:outline-none focus:ring-1 focus:ring-brand-primary text-white"
                  placeholder="Report release subject"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isGmailActive || !recipientEmail}
              className="w-full py-2 px-3 bg-red-600 hover:bg-red-500 text-white disabled:opacity-45 rounded font-display font-bold text-xs transition-all flex items-center justify-center gap-1.5"
            >
              {isGmailActive ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>Dispatch Gmail Spec <Send className="w-3.5 h-3.5" /></>
              )}
            </button>
          </form>
        </div>

        {/* 3. GOOGLE TASKS ROADMAP */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-5 flex flex-col justify-between hover:border-brand-primary/40 transition-all">
          <div>
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <CheckSquare className="w-4.5 h-4.5" />
              </div>
              <h3 className="font-display font-semibold text-sm text-white">Google Tasks Sprint Syncer</h3>
            </div>
            <p className="text-[11px] text-text-muted mb-4 leading-normal">
              Synchronize the {schedule.length} custom follow-up action sprint tasks generated by ARIA directly into a new task list in your Google account.
            </p>

            {tasksExported && (
              <div className="mb-4 p-3 bg-blue-500/5 border border-blue-500/20 rounded flex items-center justify-between text-xs">
                <span className="text-blue-300 font-mono text-[10px] flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> {schedule.length} Tasks Synced
                </span>
                <a 
                  href="https://tasks.google.com/" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  Open Google Tasks <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {tasksError && (
              <div className="mb-4 p-2.5 bg-rose-500/5 border border-rose-500/20 rounded text-[11px] text-rose-300 font-mono">
                Error: {tasksError}
              </div>
            )}
          </div>

          <button
            onClick={handleExportTasks}
            disabled={isTasksActive || schedule.length === 0}
            className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-45 rounded font-display font-bold text-xs transition-all flex items-center justify-center gap-1.5"
          >
            {isTasksActive ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>Export Actions to Google Tasks <ArrowRight className="w-3.5 h-3.5" /></>
            )}
          </button>
        </div>

        {/* 4. GOOGLE CHAT NOTIFIER */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-5 hover:border-brand-primary/40 transition-all">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <MessageSquare className="w-4.5 h-4.5" />
            </div>
            <h3 className="font-display font-semibold text-sm text-white">Google Chat Broadcaster</h3>
          </div>
          <p className="text-[11px] text-text-muted mb-4 leading-normal">
            Broadcast a summary card of the chosen architectural design straight to your engineering team spaces.
          </p>

          {chatPosted && (
            <div className="mb-4 p-3 bg-cyan-500/5 border border-cyan-500/20 rounded text-xs text-cyan-300 flex items-center gap-1.5 font-mono">
              <Check className="w-3.5 h-3.5 text-cyan-400" /> Alert successfully broadcast to space!
            </div>
          )}

          {chatError && (
            <div className="mb-4 p-2.5 bg-rose-500/5 border border-rose-500/20 rounded text-[11px] text-rose-300 font-mono">
              Error: {chatError}
            </div>
          )}

          <form onSubmit={handlePostChat} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-1 gap-2.5">
              <div>
                <label className="block text-[9px] font-mono text-text-muted uppercase mb-1">Target Space / Room</label>
                <div className="flex gap-2">
                  <select 
                    value={selectedSpace}
                    onChange={(e) => setSelectedSpace(e.target.value)}
                    className="flex-1 p-2 bg-dark-input text-xs border border-dark-border rounded focus:outline-none focus:ring-1 focus:ring-brand-primary text-white font-sans"
                  >
                    {chatSpaces.length === 0 ? (
                      <option value="">(No active Chat spaces loaded)</option>
                    ) : (
                      chatSpaces.map((space) => (
                        <option key={space.name} value={space.name}>
                          {space.displayName || space.name}
                        </option>
                      ))
                    )}
                  </select>
                  <button
                    type="button"
                    onClick={loadSpaces}
                    disabled={isLoadingSpaces}
                    className="px-3 bg-dark-input border border-dark-border hover:bg-zinc-800 text-zinc-300 rounded text-[10px] font-semibold"
                  >
                    {isLoadingSpaces ? '...' : 'Load Rooms'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-mono text-text-muted uppercase mb-1">Custom Broadcast Message</label>
                <textarea 
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  className="w-full p-2 bg-dark-input text-xs border border-dark-border rounded focus:outline-none focus:ring-1 focus:ring-brand-primary text-white h-16 resize-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isChatActive || !selectedSpace || !chatMessage}
              className="w-full py-2 px-3 bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-45 rounded font-display font-bold text-xs transition-all flex items-center justify-center gap-1.5"
            >
              {isChatActive ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>Broadcast Alert <Send className="w-3.5 h-3.5" /></>
              )}
            </button>
          </form>
        </div>

        {/* 5. GOOGLE FORMS GENERATOR */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-5 flex flex-col justify-between hover:border-brand-primary/40 transition-all md:col-span-2">
          <div>
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Clipboard className="w-4.5 h-4.5" />
              </div>
              <h3 className="font-display font-semibold text-sm text-white">Google Forms Review Builder</h3>
            </div>
            <p className="text-[11px] text-text-muted mb-4 leading-normal">
              Dynamically build and configure a complete Google feedback form based on this specification, including structured questions regarding overall ratings, compliance hurdles, and tech stack favorites. Give your team a quick feedback mechanism.
            </p>

            {formUrl && (
              <div className="mb-4 p-3 bg-purple-500/5 border border-purple-500/20 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <span className="text-purple-300 font-mono text-[10px] flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> Google Feedback Form Generated
                </span>
                <div className="flex items-center gap-3">
                  <a 
                    href={formUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-purple-400 hover:underline flex items-center gap-1 font-semibold text-[11px]"
                  >
                    View Form <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <span className="text-dark-border">|</span>
                  <a 
                    href={formEditUrl || ''} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-amber-400 hover:underline flex items-center gap-1 font-semibold text-[11px]"
                  >
                    Edit / Responses <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            {formError && (
              <div className="mb-4 p-2.5 bg-rose-500/5 border border-rose-500/20 rounded text-[11px] text-rose-300 font-mono">
                Error: {formError}
              </div>
            )}
          </div>

          <button
            onClick={handleCreateForm}
            disabled={isFormsActive}
            className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-45 rounded font-display font-bold text-xs transition-all flex items-center justify-center gap-1.5"
          >
            {isFormsActive ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>Compile Feedback Form <ArrowRight className="w-3.5 h-3.5" /></>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
