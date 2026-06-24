import { SolutionOption, ScheduleAction } from '../types.js';

// Base64url helper for Gmail raw format
function buildRawEmail(to: string, subject: string, bodyHtml: string) {
  const email = [
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    bodyHtml
  ].join('\r\n');
  
  // Base64URL encode
  return btoa(unescape(encodeURIComponent(email)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * 1. Google Sheets Integration
 */
export async function createGoogleSheet(accessToken: string, title: string, options: SolutionOption[], risks: string[]): Promise<string> {
  // Create spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: `ARIA Arch - ${title}`
      }
    })
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(err.error?.message || 'Failed to create Google Sheet');
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl;

  // Populate data
  const rows = [
    ['ARIA ARCHITECTURE SPECIFICATION & COMPARISON REPORT'],
    [`Generated: ${new Date().toLocaleDateString()}`],
    [],
    ['SOLUTION OPTIONS'],
    ['Title', 'Summary', 'Complexity', 'Tech Stack', 'Architecture Details'],
    ...options.map(opt => [
      opt.title,
      opt.summary,
      opt.complexity,
      opt.techStack.join(', '),
      opt.architecture
    ]),
    [],
    ['RISK IDENTIFICATION & MITIGATIONS'],
    ['#', 'Risk / Mitigation Parameter'],
    ...risks.map((risk, idx) => [idx + 1, risk]),
  ];

  const appendRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:append?valueInputOption=RAW`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: rows
    })
  });

  if (!appendRes.ok) {
    const err = await appendRes.json();
    throw new Error(err.error?.message || 'Failed to write data to Google Sheet');
  }

  return spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
}

/**
 * 2. Gmail Integration
 */
export async function sendGmailSummary(accessToken: string, toEmail: string, subject: string, proposalTitle: string, documentMarkdown: string): Promise<void> {
  const bodyHtml = `
    <div style="font-family: sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; rounded: 8px;">
      <h2 style="color: #6366f1; margin-bottom: 5px;">ARIA Architectural Review</h2>
      <p style="color: #666; font-size: 14px; margin-top: 0;">Automated Architecture & Governance Dispatch</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <h3>Proposal: ${proposalTitle}</h3>
      <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; border-left: 4px solid #6366f1; font-family: monospace; white-space: pre-wrap; font-size: 13px; max-height: 400px; overflow-y: auto;">
        ${documentMarkdown.replace(/\n/g, '<br/>')}
      </div>
      <p style="font-size: 11px; color: #999; margin-top: 30px;">
        This email was sent securely via ARIA compliance integration using Google OAuth.
      </p>
    </div>
  `;

  const raw = buildRawEmail(toEmail, subject, bodyHtml);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to send email via Gmail');
  }
}

/**
 * 3. Google Tasks Integration
 */
export async function exportToGoogleTasks(accessToken: string, listTitle: string, actions: ScheduleAction[]): Promise<string> {
  // Create a new Task List
  const listRes = await fetch('https://tasks.googleapis.com/v1/users/@default/lists', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: `ARIA Tasklist - ${listTitle}`
    })
  });

  if (!listRes.ok) {
    const err = await listRes.json();
    throw new Error(err.error?.message || 'Failed to create Google Tasks list');
  }

  const taskList = await listRes.json();
  const taskListId = taskList.id;

  // Insert actions into the new task list
  for (const action of actions) {
    const taskRes = await fetch(`https://tasks.googleapis.com/v1/lists/${taskListId}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: `[${action.priority}] ${action.title}`,
        notes: `Assignee: ${action.assignee}\nTimeline: ${action.timeline}\n\nDescription: ${action.description}`,
      })
    });

    if (!taskRes.ok) {
      console.warn('Failed to insert task:', action.title);
    }
  }

  return `https://tasks.google.com/`;
}

/**
 * 4. Google Chat Integration
 */
export interface ChatSpace {
  name: string;
  displayName: string;
  type: string;
}

export async function listChatSpaces(accessToken: string): Promise<ChatSpace[]> {
  const res = await fetch('https://chat.googleapis.com/v1/spaces', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to load Google Chat Spaces');
  }

  const data = await res.json();
  return data.spaces || [];
}

export async function postToChatSpace(accessToken: string, spaceName: string, proposalTitle: string, contentText: string): Promise<void> {
  const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: `🚀 *ARIA Architectural Alert*\n\n*Proposal:* ${proposalTitle}\n\n${contentText}`
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to post message to Google Chat');
  }
}

/**
 * 5. Google Forms Integration
 */
export async function createFeedbackForm(accessToken: string, proposalTitle: string): Promise<{ formUrl: string; editUrl: string }> {
  // Create form
  const createRes = await fetch('https://forms.googleapis.com/v1/forms', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      info: {
        title: `ARIA Feedback: ${proposalTitle}`,
        documentTitle: `Feedback Form - ${proposalTitle}`
      }
    })
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(err.error?.message || 'Failed to create Google Form');
  }

  const formData = await createRes.json();
  const formId = formData.formId;
  const editUrl = formData.responderUri || `https://docs.google.com/forms/d/${formId}/viewform`;

  // Update form with feedback questions
  const updateRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        {
          createItem: {
            item: {
              title: 'What is your overall rating of the proposed architecture?',
              questionItem: {
                question: {
                  required: true,
                  choiceQuestion: {
                    type: 'RADIO',
                    options: [
                      { value: '5 - Outstanding' },
                      { value: '4 - Very Good' },
                      { value: '3 - Acceptable' },
                      { value: '2 - Needs Revisions' },
                      { value: '1 - Reject/Re-evaluate' }
                    ]
                  }
                }
              }
            },
            location: { index: 0 }
          }
        },
        {
          createItem: {
            item: {
              title: 'Do you have any specific concerns regarding the Compliance or Governance bounds?',
              questionItem: {
                question: {
                  required: false,
                  textQuestion: { paragraph: true }
                }
              }
            },
            location: { index: 1 }
          }
        },
        {
          createItem: {
            item: {
              title: 'Which tech stack options do you prefer?',
              questionItem: {
                question: {
                  required: true,
                  choiceQuestion: {
                    type: 'CHECKBOX',
                    options: [
                      { value: 'Option 1: Minimalist Native Cloud' },
                      { value: 'Option 2: Robust Enterprise Multi-Region' },
                      { value: 'Option 3: Budget & Hybrid Alternative' }
                    ]
                  }
                }
              }
            },
            location: { index: 2 }
          }
        }
      ]
    })
  });

  if (!updateRes.ok) {
    const err = await updateRes.json();
    throw new Error(err.error?.message || 'Failed to populate Google Form questions');
  }

  return {
    formUrl: `https://docs.google.com/forms/d/${formId}/viewform`,
    editUrl: `https://docs.google.com/forms/d/${formId}/edit`
  };
}
