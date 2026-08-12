import React, { useState, useEffect } from 'react';
import { UniboxThread, ConnectedMailbox } from '../types';

// Custom Hook: Auto-Saves Unibox Reply Draft to LocalStorage every 5 seconds
function useAutoSaveReply(
  threadId: string | undefined,
  replyText: string,
  setReplyText: React.Dispatch<React.SetStateAction<string>>
) {
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);

  // Restore draft when threadId changes
  useEffect(() => {
    if (!threadId) return;
    const savedDraft = localStorage.getItem(`unibox_reply_draft_${threadId}`);
    if (savedDraft !== null) {
      setReplyText(savedDraft);
      if (savedDraft.trim()) {
        setDraftSavedAt('Restored draft');
      } else {
        setDraftSavedAt(null);
      }
    } else {
      setReplyText('');
      setDraftSavedAt(null);
    }
  }, [threadId]);

  // Save draft every 5 seconds if modified
  useEffect(() => {
    if (!threadId) return;

    const interval = setInterval(() => {
      const storageKey = `unibox_reply_draft_${threadId}`;
      const currentInStorage = localStorage.getItem(storageKey) || '';

      if (replyText !== currentInStorage) {
        if (replyText.trim()) {
          localStorage.setItem(storageKey, replyText);
          const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setDraftSavedAt(`Auto-saved at ${time}`);
        } else {
          localStorage.removeItem(storageKey);
          setDraftSavedAt(null);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [threadId, replyText]);

  const clearDraft = (targetThreadId?: string) => {
    const tid = targetThreadId || threadId;
    if (tid) {
      localStorage.removeItem(`unibox_reply_draft_${tid}`);
      setDraftSavedAt(null);
    }
  };

  return { draftSavedAt, clearDraft };
}

interface UniboxViewProps {
  threads: UniboxThread[];
  selectedThreadId: string;
  connectedMailboxes?: ConnectedMailbox[];
  onSelectThread: (threadId: string) => void;
  onSendReply: (threadId: string, replyContent: string, mailboxId?: string) => void;
  onSyncThreads?: (newThreads: UniboxThread[]) => void;
}

export const UniboxView: React.FC<UniboxViewProps> = ({
  threads,
  selectedThreadId,
  connectedMailboxes = [],
  onSelectThread,
  onSendReply,
  onSyncThreads,
}) => {
  const [activeTab, setActiveTab] = useState<'All Inbox' | 'Requires Reply' | 'Meeting Booked'>('Requires Reply');
  const [replyText, setReplyText] = useState('');
  const [selectedMailboxId, setSelectedMailboxId] = useState<string>('');
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isSyncingImap, setIsSyncingImap] = useState(false);
  const [isSendingReal, setIsSendingReal] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState<string | null>(null);

  // Compose New Email Modal State
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeToEmail, setComposeToEmail] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [isSendingCompose, setIsSendingCompose] = useState(false);
  const [composeStatus, setComposeStatus] = useState<string | null>(null);

  // Load backend unibox threads on mount
  useEffect(() => {
    const fetchThreads = async () => {
      try {
        const res = await fetch('/api/unibox/threads');
        const data = await res.json();
        if (data.success && data.threads && data.threads.length > 0) {
          if (onSyncThreads) {
            onSyncThreads(data.threads);
          }
        }
      } catch (err) {
        console.error('Failed to fetch unibox threads from server:', err);
      }
    };
    fetchThreads();
  }, []);

  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simLeadEmail, setSimLeadEmail] = useState('sarah.j@acmecorp.com');
  const [simLeadName, setSimLeadName] = useState('Sarah Jenkins');
  const [simLeadText, setSimLeadText] = useState('Hi James, thanks for the update! We are ready to proceed with the contract.');
  const [isSimulatingReply, setIsSimulatingReply] = useState(false);

  const handleSimulateLeadReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simLeadEmail.trim() || !simLeadText.trim()) return;

    setIsSimulatingReply(true);
    try {
      const res = await fetch('/api/unibox/lead-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderEmail: simLeadEmail.trim(),
          senderName: simLeadName.trim(),
          replyText: simLeadText.trim(),
          sentiment: 'Positive',
        }),
      });

      const data = await res.json();
      if (data.success && data.threads) {
        if (onSyncThreads) {
          onSyncThreads(data.threads);
        }
        if (data.thread?.id) {
          onSelectThread(data.thread.id);
        }
        setShowSimulateModal(false);
        setSimLeadText('');
      }
    } catch (err) {
      console.error('Failed to simulate lead reply:', err);
    } finally {
      setIsSimulatingReply(false);
    }
  };

  const handleSendNewColdEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeToEmail.trim() || !composeSubject.trim() || !composeBody.trim()) return;

    setIsSendingCompose(true);
    setComposeStatus(null);

    try {
      const res = await fetch('/api/mailboxes/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mailboxId: selectedMailboxId,
          recipientEmail: composeToEmail.trim(),
          subject: composeSubject.trim(),
          bodyText: composeBody.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setComposeStatus(`Email dispatched successfully! ${data.message || ''}`);
        
        // Add new thread locally
        const newThread: UniboxThread = {
          id: `thread-${Date.now()}`,
          senderName: composeToEmail.split('@')[0] || 'Recipient',
          senderEmail: composeToEmail.trim(),
          senderTitle: 'Prospect',
          senderInitials: (composeToEmail[0] || 'P').toUpperCase(),
          company: composeToEmail.split('@')[1]?.split('.')[0] || 'External',
          subject: composeSubject.trim(),
          category: 'All Inbox',
          sentiment: 'Neutral',
          tag: 'Cold Outreach',
          timestamp: 'Just now',
          preview: composeBody.slice(0, 80) + '...',
          messages: [
            {
              id: `msg-${Date.now()}`,
              sender: 'You',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isUser: true,
              content: [composeBody],
            },
          ],
        };

        if (onSyncThreads) {
          onSyncThreads([newThread]);
        }

        setTimeout(() => {
          setShowComposeModal(false);
          setComposeToEmail('');
          setComposeSubject('');
          setComposeBody('');
          setComposeStatus(null);
        }, 1500);
      } else {
        setComposeStatus(`Error sending email: ${data.error || 'Failed'}`);
      }
    } catch (err: any) {
      setComposeStatus(`Failed to send: ${err.message}`);
    } finally {
      setIsSendingCompose(false);
    }
  };

  const activeThread = threads.find((t) => t.id === selectedThreadId) || threads[0];
  const { draftSavedAt, clearDraft } = useAutoSaveReply(
    activeThread?.id,
    replyText,
    setReplyText
  );

  const seenThreadIds = new Set<string>();
  const filteredThreads = threads.filter((t) => {
    if (!t || !t.id || seenThreadIds.has(t.id)) return false;
    seenThreadIds.add(t.id);
    if (activeTab === 'All Inbox') return true;
    return t.category === activeTab;
  });

  const handleSyncImapInbox = async () => {
    setIsSyncingImap(true);
    setSyncStatusText('Connecting to IMAP inbox...');

    try {
      const response = await fetch('/api/mailboxes/sync-inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mailboxId: selectedMailboxId }),
      });

      const data = await response.json();
      if (data.success && data.threads && data.threads.length > 0) {
        if (onSyncThreads) {
          onSyncThreads(data.threads);
        }
        setSyncStatusText(`Synced! Fetched ${data.threads.length} new response(s).`);
      } else {
        setSyncStatusText(data.message || 'Sync complete. No new messages in IMAP inbox.');
      }
    } catch (err: any) {
      setSyncStatusText('IMAP sync failed. Verify mailbox credentials.');
    } finally {
      setIsSyncingImap(false);
      setTimeout(() => setSyncStatusText(null), 4000);
    }
  };

  const handleAiSmartReply = async (goal: string) => {
    if (!activeThread) return;
    setIsGeneratingDraft(true);

    try {
      const res = await fetch('/api/ai/draft-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: activeThread.senderName,
          company: activeThread.company,
          threadHistory: activeThread.messages.map((m) => `${m.sender}: ${m.content.join(' ')}`),
          replyGoal: goal,
        }),
      });

      const data = await res.json();
      setReplyText(data.reply || '');
    } catch (err) {
      console.error('Failed to generate AI draft reply:', err);
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeThread) return;

    setIsSendingReal(true);

    try {
      const res = await fetch('/api/unibox/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: activeThread.id,
          replyText: replyText.trim(),
          mailboxId: selectedMailboxId,
        }),
      });

      const data = await res.json();
      if (data.success && data.threads) {
        if (onSyncThreads) {
          onSyncThreads(data.threads);
        }
      } else {
        onSendReply(activeThread.id, replyText, selectedMailboxId);
      }
      clearDraft(activeThread.id);
      setReplyText('');
    } catch (err) {
      console.error('Error in send reply:', err);
      onSendReply(activeThread.id, replyText, selectedMailboxId);
      clearDraft(activeThread.id);
      setReplyText('');
    } finally {
      setIsSendingReal(false);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn font-['Inter']">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="font-['Plus_Jakarta_Sans'] font-bold text-2xl text-white tracking-tight">Unibox</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Unified inbox combining real-time replies across all linked Google Workspace, Microsoft 365 & Custom mailboxes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {syncStatusText && (
            <span className="text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 rounded-lg animate-fadeIn font-mono">
              {syncStatusText}
            </span>
          )}

          <button
            onClick={() => setShowComposeModal(true)}
            className="bg-indigo-500 hover:bg-indigo-600 text-white font-['Inter'] text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">edit_note</span>
            <span>Compose Email</span>
          </button>

          <button
            onClick={() => setShowSimulateModal(true)}
            className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-['Inter'] text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">move_to_inbox</span>
            <span>Receive Test Reply</span>
          </button>

          <button
            onClick={handleSyncImapInbox}
            disabled={isSyncingImap}
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[16px] ${isSyncingImap ? 'animate-spin text-indigo-400' : ''}`}>
              sync
            </span>
            <span>{isSyncingImap ? 'Syncing IMAP...' : 'Sync IMAP Inbox'}</span>
          </button>
        </div>
      </div>

      {/* Main Unibox Container */}
      <div className="grid grid-cols-12 gap-0 min-h-[560px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-xl">
        {/* Left Column: Thread List */}
        <div className="col-span-12 lg:col-span-5 border-r border-white/10 flex flex-col bg-slate-900/60">
          {/* Category Tabs */}
          <div className="p-2.5 border-b border-white/10 flex gap-1 bg-slate-950/60">
            {(['All Inbox', 'Requires Reply', 'Meeting Booked'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`flex-1 py-1.5 rounded-lg font-['Inter'] text-xs font-semibold transition-all ${
                  activeTab === cat
                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Threads List */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {filteredThreads.map((thread) => {
              const isSelected = thread.id === activeThread?.id;
              return (
                <div
                  key={thread.id}
                  onClick={() => onSelectThread(thread.id)}
                  className={`p-3 cursor-pointer transition-all relative ${
                    isSelected
                      ? 'bg-indigo-500/15 border-l-2 border-indigo-400'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-xs flex items-center justify-center border border-indigo-500/40 shrink-0">
                        {thread.senderInitials}
                      </div>
                      <div>
                        <h4 className="font-semibold text-xs text-white">
                          {thread.senderName}
                        </h4>
                        <span className="text-[10px] text-slate-400">{thread.company}</span>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-slate-500">{thread.timestamp}</span>
                  </div>

                  <p className="font-['Inter'] text-xs font-semibold text-white truncate mt-1">
                    {thread.subject}
                  </p>
                  <p className="font-['Inter'] text-xs text-slate-300 truncate mt-0.5">
                    {thread.preview}
                  </p>

                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        thread.sentiment === 'Positive'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : thread.sentiment === 'Review'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}
                    >
                      {thread.sentiment}
                    </span>
                    <span className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                      {thread.tag}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Thread Detail & Composer */}
        <div className="col-span-12 lg:col-span-7 flex flex-col justify-between bg-slate-900/30">
          {activeThread ? (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-950/30 shrink-0">
                <div>
                  <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-white">
                    {activeThread.subject}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-300">
                    <span className="font-semibold text-white">{activeThread.senderName}</span>
                    <span className="text-slate-500">({activeThread.senderEmail})</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-indigo-400">{activeThread.senderTitle}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                    {activeThread.sentiment}
                  </span>
                </div>
              </div>

              {/* Message History Timeline */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {activeThread.messages.map((msg, mIdx) => (
                  <div
                    key={msg.id ? `${msg.id}-${mIdx}` : `msg-${mIdx}`}
                    className={`flex flex-col ${
                      msg.isUser ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-['Inter'] text-xs font-bold text-slate-300">
                        {msg.sender}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">
                        {msg.timestamp}
                      </span>
                    </div>

                    <div
                      className={`max-w-xl p-4 rounded-2xl font-['Inter'] text-xs leading-relaxed space-y-2 ${
                        msg.isUser
                          ? 'bg-indigo-500 text-white rounded-tr-none shadow-lg shadow-indigo-500/20'
                          : 'bg-slate-900/80 text-slate-200 border border-white/10 rounded-tl-none'
                      }`}
                    >
                      {msg.content.map((p, pIdx) => (
                        <p key={pIdx}>{p}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* AI Quick Reply Actions & Composer */}
              <div className="p-4 border-t border-white/10 bg-slate-950/50 space-y-3 shrink-0">
                
                {/* Mailbox Sender Selector */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="material-symbols-outlined text-sm text-indigo-400">mark_email_read</span>
                    <span>Send via Mailbox:</span>
                  </div>
                  <select
                    value={selectedMailboxId}
                    onChange={(e) => setSelectedMailboxId(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                  >
                    {connectedMailboxes.length > 0 ? (
                      connectedMailboxes.map((mb) => (
                        <option key={mb.id} value={mb.id}>
                          {mb.email} ({mb.provider})
                        </option>
                      ))
                    ) : (
                      <option value="">Default SMTP Mailbox</option>
                    )}
                  </select>
                </div>

                {/* AI Reply Shortcuts */}
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1 font-['Inter'] uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                    AI Reply:
                  </span>

                  <button
                    onClick={() => handleAiSmartReply('Confirm Tuesday at 2 PM')}
                    className="px-3 py-1 rounded-xl bg-white/5 hover:bg-indigo-500/20 border border-white/10 text-xs text-slate-300 hover:text-white transition-all"
                  >
                    Confirm Tuesday at 2 PM
                  </button>

                  <button
                    onClick={() => handleAiSmartReply('Propose Alternative Time')}
                    className="px-3 py-1 rounded-xl bg-white/5 hover:bg-indigo-500/20 border border-white/10 text-xs text-slate-300 hover:text-white transition-all"
                  >
                    Propose Alternative Time
                  </button>

                  <button
                    onClick={() => handleAiSmartReply('Send Booking Link')}
                    className="px-3 py-1 rounded-xl bg-white/5 hover:bg-indigo-500/20 border border-white/10 text-xs text-slate-300 hover:text-white transition-all"
                  >
                    Send Booking Link
                  </button>
                </div>

                {/* Reply Composer */}
                <form onSubmit={handleSend} className="space-y-2">
                  <div className="relative">
                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write your response or click an AI reply button above..."
                      className="w-full bg-slate-900/80 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-indigo-500 focus:outline-none resize-none placeholder:text-slate-500"
                    />
                    {isGeneratingDraft && (
                      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm rounded-xl flex items-center justify-center text-xs text-indigo-400 font-bold gap-2">
                        <span className="material-symbols-outlined animate-spin">sync</span>
                        Drafting AI Response...
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex gap-2 items-center text-slate-400">
                      <button type="button" className="p-1 hover:text-white" title="Attach File">
                        <span className="material-symbols-outlined text-base">attach_file</span>
                      </button>
                      <button type="button" className="p-1 hover:text-white" title="Insert Link">
                        <span className="material-symbols-outlined text-base">link</span>
                      </button>
                      {draftSavedAt && (
                        <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 ml-1">
                          <span className="material-symbols-outlined text-[12px]">save</span>
                          {draftSavedAt}
                        </span>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSendingReal}
                      className="bg-indigo-500 hover:bg-indigo-600 text-white font-['Inter'] text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20 uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isSendingReal ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                          <span>Dispatching...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Response</span>
                          <span className="material-symbols-outlined text-sm">send</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8 text-slate-500 font-['Inter'] text-sm">
              Select a conversation to view thread details.
            </div>
          )}
        </div>
      </div>
      {/* Compose New Email Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 font-['Inter']">
          <div className="bg-[#0A0A0B] border border-white/10 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-400">edit_square</span>
                <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-white">
                  Compose New Cold Email
                </h3>
              </div>
              <button
                onClick={() => setShowComposeModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSendNewColdEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Send From Mailbox
                </label>
                <select
                  value={selectedMailboxId}
                  onChange={(e) => setSelectedMailboxId(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-indigo-400 focus:outline-none"
                >
                  {connectedMailboxes.length > 0 ? (
                    connectedMailboxes.map((mb) => (
                      <option key={mb.id} value={mb.id}>
                        {mb.senderName} ({mb.email})
                      </option>
                    ))
                  ) : (
                    <option value="">Default System Mailbox</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Recipient Email *
                </label>
                <input
                  type="email"
                  required
                  value={composeToEmail}
                  onChange={(e) => setComposeToEmail(e.target.value)}
                  placeholder="e.g. prospect@targetcompany.com"
                  className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email Subject *
                </label>
                <input
                  type="text"
                  required
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="e.g. Quick question regarding your sales workflow"
                  className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email Body *
                </label>
                <textarea
                  rows={5}
                  required
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Hi {{first_name}}, noticed your company is scaling outreach..."
                  className="w-full bg-slate-900/80 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-indigo-400 focus:outline-none resize-none"
                />
              </div>

              {composeStatus && (
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-xs text-indigo-300 font-mono flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-indigo-400">info</span>
                  <span>{composeStatus}</span>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowComposeModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingCompose}
                  className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSendingCompose ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                      Sending Email...
                    </>
                  ) : (
                    <>
                      <span>Send Cold Email</span>
                      <span className="material-symbols-outlined text-sm">send</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Simulate Incoming Lead Reply Modal */}
      {showSimulateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 font-['Inter']">
          <div className="bg-[#0A0A0B] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400">move_to_inbox</span>
                <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-white">
                  Simulate Incoming Lead Reply
                </h3>
              </div>
              <button
                onClick={() => setShowSimulateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSimulateLeadReply} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Lead Name
                </label>
                <input
                  type="text"
                  value={simLeadName}
                  onChange={(e) => setSimLeadName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Lead Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={simLeadEmail}
                  onChange={(e) => setSimLeadEmail(e.target.value)}
                  placeholder="sarah.j@acmecorp.com"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Incoming Message Content *
                </label>
                <textarea
                  rows={4}
                  required
                  value={simLeadText}
                  onChange={(e) => setSimLeadText(e.target.value)}
                  placeholder="Write message from prospect..."
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-emerald-400 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowSimulateModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSimulatingReply}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSimulatingReply ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                      Receiving...
                    </>
                  ) : (
                    <>
                      <span>Trigger Incoming Reply</span>
                      <span className="material-symbols-outlined text-sm">download</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

