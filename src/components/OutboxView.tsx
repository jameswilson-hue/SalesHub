import React, { useState, useEffect } from 'react';
import { OutboundEmail, ConnectedMailbox } from '../types';

interface OutboxViewProps {
  connectedMailboxes: ConnectedMailbox[];
}

export const OutboxView: React.FC<OutboxViewProps> = ({ connectedMailboxes }) => {
  const [emails, setEmails] = useState<OutboundEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'All' | 'Sent' | 'Scheduled' | 'Failed'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<OutboundEmail | null>(null);

  // Modal State for Compose
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [selectedMailboxId, setSelectedMailboxId] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchOutboundEmails = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/outbound/emails');
      const data = await res.json();
      if (data.success) {
        setEmails(data.emails || []);
      }
    } catch (err) {
      console.error('Failed to fetch outbound emails:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutboundEmails();
  }, []);

  useEffect(() => {
    if (connectedMailboxes.length > 0 && !selectedMailboxId) {
      setSelectedMailboxId(connectedMailboxes[0].id);
    }
  }, [connectedMailboxes]);

  const handleSendOrSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail.trim() || !subject.trim() || !bodyText.trim()) return;

    setIsSending(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/mailboxes/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mailboxId: selectedMailboxId,
          recipientEmail: recipientEmail.trim(),
          recipientName: recipientName.trim(),
          companyName: companyName.trim(),
          subject: subject.trim(),
          bodyText: bodyText.trim(),
          scheduleTime: scheduleTime ? new Date(scheduleTime).toISOString() : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage(
          data.mode === 'scheduled'
            ? `Email scheduled successfully for ${new Date(scheduleTime).toLocaleString()}`
            : `Email dispatched successfully! ${data.message || ''}`
        );

        fetchOutboundEmails();

        setTimeout(() => {
          setShowComposeModal(false);
          setRecipientEmail('');
          setRecipientName('');
          setCompanyName('');
          setSubject('');
          setBodyText('');
          setScheduleTime('');
          setStatusMessage(null);
        }, 1500);
      } else {
        setStatusMessage(`Error: ${data.error || 'Failed to process email dispatch.'}`);
      }
    } catch (err: any) {
      setStatusMessage(`Failed: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteEmail = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/outbound/emails/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setEmails((prev) => prev.filter((item) => item.id !== id));
        if (selectedEmail?.id === id) setSelectedEmail(null);
      }
    } catch (err) {
      console.error('Failed to delete outbound email:', err);
    }
  };

  const handleResendEmail = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/outbound/resend/${id}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchOutboundEmails();
      } else {
        alert(`Resend failed: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error resending email: ${err.message}`);
    }
  };

  const filteredEmails = emails.filter((item) => {
    if (activeFilter === 'Sent' && item.status !== 'Sent') return false;
    if (activeFilter === 'Scheduled' && item.status !== 'Scheduled' && item.status !== 'Queued') return false;
    if (activeFilter === 'Failed' && item.status !== 'Failed') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.recipientEmail.toLowerCase().includes(q) ||
        (item.recipientName && item.recipientName.toLowerCase().includes(q)) ||
        (item.companyName && item.companyName.toLowerCase().includes(q)) ||
        item.subject.toLowerCase().includes(q) ||
        item.senderEmail.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalSent = emails.filter((e) => e.status === 'Sent').length;
  const totalScheduled = emails.filter((e) => e.status === 'Scheduled' || e.status === 'Queued').length;
  const totalFailed = emails.filter((e) => e.status === 'Failed').length;

  return (
    <div className="space-y-6 animate-fadeIn font-['Inter']">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-['Plus_Jakarta_Sans'] font-bold text-3xl text-white tracking-tight">
            Outbox & Scheduled Emails
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time tracking for all sent cold emails, queued dispatches, and scheduled outreach messages.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchOutboundEmails}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-colors"
            title="Refresh Outbox"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
          </button>

          <button
            onClick={() => setShowComposeModal(true)}
            className="bg-indigo-500 hover:bg-indigo-600 text-white font-['Inter'] text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Compose Cold Email</span>
          </button>
        </div>
      </div>

      {/* Metrics Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Total Sent</span>
            <span className="material-symbols-outlined text-indigo-400">send</span>
          </div>
          <div className="font-mono text-2xl font-bold text-white">{totalSent}</div>
          <p className="text-[11px] text-slate-400">Dispatched via connected SMTP</p>
        </div>

        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Queued & Scheduled</span>
            <span className="material-symbols-outlined text-amber-400">schedule</span>
          </div>
          <div className="font-mono text-2xl font-bold text-amber-300">{totalScheduled}</div>
          <p className="text-[11px] text-slate-400">Pending automated delivery</p>
        </div>

        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Delivery Failures</span>
            <span className="material-symbols-outlined text-rose-400">report_problem</span>
          </div>
          <div className="font-mono text-2xl font-bold text-rose-300">{totalFailed}</div>
          <p className="text-[11px] text-slate-400">Bounced or SMTP errors</p>
        </div>

        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Connected Mailboxes</span>
            <span className="material-symbols-outlined text-emerald-400">mail</span>
          </div>
          <div className="font-mono text-2xl font-bold text-emerald-300">{connectedMailboxes.length}</div>
          <p className="text-[11px] text-slate-400">Active sending accounts</p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/40 p-3 rounded-2xl border border-white/10">
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
          {(['All', 'Sent', 'Scheduled', 'Failed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                activeFilter === tab
                  ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab === 'Scheduled' ? 'Queued / Scheduled' : tab}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-500 text-base">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recipient, company, subject..."
            className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Emails Table */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <span className="material-symbols-outlined text-3xl text-indigo-400 animate-spin">
              sync
            </span>
            <p className="text-xs text-slate-400">Fetching outbound logs...</p>
          </div>
        ) : filteredEmails.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <span className="material-symbols-outlined text-4xl text-slate-600">outbox</span>
            <h3 className="text-sm font-bold text-white">No Outbound Emails Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Emails sent directly from CRM, Unibox, or scheduled outreach will be listed here.
            </p>
            <button
              onClick={() => setShowComposeModal(true)}
              className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all inline-flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">send</span>
              <span>Send First Cold Email</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-slate-950/60 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Subject & Preview</th>
                  <th className="py-3 px-4">Sender Mailbox</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredEmails.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedEmail(item)}
                    className="hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-bold text-white text-xs">
                          {item.recipientName || item.recipientEmail.split('@')[0]}
                        </p>
                        <p className="font-mono text-[11px] text-slate-400">{item.recipientEmail}</p>
                        {item.companyName && (
                          <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 inline-block mt-0.5">
                            {item.companyName}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 max-w-md">
                      <p className="font-medium text-slate-200 truncate">{item.subject}</p>
                      <p className="text-[11px] text-slate-400 truncate">{item.body}</p>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                      {item.senderEmail}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono ${
                          item.status === 'Sent'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : item.status === 'Scheduled' || item.status === 'Queued'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {item.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {item.status === 'Scheduled' && item.scheduledTime
                        ? new Date(item.scheduledTime).toLocaleString()
                        : item.sentAt
                        ? new Date(item.sentAt).toLocaleString()
                        : new Date(item.createdAt).toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {item.status === 'Failed' && (
                          <button
                            onClick={(e) => handleResendEmail(item.id, e)}
                            className="p-1.5 rounded bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 font-bold text-[10px] flex items-center gap-1"
                            title="Retry Send"
                          >
                            <span className="material-symbols-outlined text-[14px]">replay</span>
                            <span>Retry</span>
                          </button>
                        )}

                        <button
                          onClick={(e) => handleDeleteEmail(item.id, e)}
                          className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-white/5"
                          title="Delete / Cancel Record"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Email Detail Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0B] border border-white/10 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-400">mail</span>
                <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-white">
                  Outbound Email Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedEmail(null)}
                className="text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-slate-900/60 p-3 rounded-xl border border-white/5">
              <div>
                <span className="text-slate-500 block text-[10px]">RECIPIENT</span>
                <span className="text-white font-bold">{selectedEmail.recipientEmail}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">SENDER</span>
                <span className="text-white font-bold">{selectedEmail.senderEmail}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">STATUS</span>
                <span className="text-indigo-400 font-bold">{selectedEmail.status}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">TIMESTAMP</span>
                <span className="text-slate-300">
                  {selectedEmail.sentAt
                    ? new Date(selectedEmail.sentAt).toLocaleString()
                    : new Date(selectedEmail.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Subject
              </span>
              <p className="text-xs font-bold text-white bg-slate-900 p-2.5 rounded-xl border border-white/10">
                {selectedEmail.subject}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Message Body
              </span>
              <div className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-white/10 whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">
                {selectedEmail.body}
              </div>
            </div>

            {selectedEmail.errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 font-mono">
                <span className="font-bold block">Error Log:</span>
                {selectedEmail.errorMessage}
              </div>
            )}

            <div className="pt-3 flex justify-end gap-2 border-t border-white/10">
              <button
                onClick={() => setSelectedEmail(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compose & Schedule Email Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0B] border border-white/10 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-400">edit_square</span>
                <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-white">
                  Compose / Schedule Cold Email
                </h3>
              </div>
              <button
                onClick={() => setShowComposeModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSendOrSchedule} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Send From Mailbox *
                </label>
                <select
                  value={selectedMailboxId}
                  onChange={(e) => setSelectedMailboxId(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 font-mono text-white focus:border-indigo-400 focus:outline-none"
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Recipient Email *</label>
                  <input
                    type="email"
                    required
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="e.g. prospect@company.com"
                    className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 font-mono text-white focus:border-indigo-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Recipient Name</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="e.g. Sarah Connor"
                    className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Subject Line *</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Cold outreach regarding growth targets"
                  className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Email Body *</label>
                <textarea
                  rows={4}
                  required
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  placeholder="Hi Sarah, noticed your team is expanding sales ops..."
                  className="w-full bg-slate-900/80 border border-white/10 rounded-xl p-3 text-white focus:border-indigo-400 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Schedule Send Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 font-mono text-white focus:border-indigo-400 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Leave blank to dispatch immediately.
                </p>
              </div>

              {statusMessage && (
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-xs text-indigo-300 font-mono flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-indigo-400">info</span>
                  <span>{statusMessage}</span>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowComposeModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                      Processing...
                    </>
                  ) : scheduleTime ? (
                    <>
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      Schedule Email
                    </>
                  ) : (
                    <>
                      <span>Dispatch Now</span>
                      <span className="material-symbols-outlined text-sm">send</span>
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
