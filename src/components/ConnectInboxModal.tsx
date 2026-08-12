import React, { useState } from 'react';
import { ConnectedMailbox } from '../types';

interface ConnectInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMailboxConnected: (mailbox: ConnectedMailbox) => void;
}

type ProviderType = 'Google Workspace' | 'Microsoft 365 / Outlook' | 'Zoho Mail' | 'Custom SMTP / IMAP';

export const ConnectInboxModal: React.FC<ConnectInboxModalProps> = ({
  isOpen,
  onClose,
  onMailboxConnected,
}) => {
  const [provider, setProvider] = useState<ProviderType>('Google Workspace');
  const [senderName, setSenderName] = useState('');
  const [email, setEmail] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [showAdvancedHosts, setShowAdvancedHosts] = useState(false);

  // Custom host overrides
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [imapHost, setImapHost] = useState('');
  const [imapPort, setImapPort] = useState('993');

  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStepText, setVerifyStepText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMailbox, setSuccessMailbox] = useState<ConnectedMailbox | null>(null);

  if (!isOpen) return null;

  const handleProviderSelect = (selected: ProviderType) => {
    setProvider(selected);
    setErrorMessage(null);
    if (selected === 'Google Workspace') {
      setSmtpHost('smtp.gmail.com');
      setSmtpPort('587');
      setImapHost('imap.gmail.com');
      setImapPort('993');
    } else if (selected === 'Microsoft 365 / Outlook') {
      setSmtpHost('smtp.office365.com');
      setSmtpPort('587');
      setImapHost('outlook.office365.com');
      setImapPort('993');
    } else if (selected === 'Zoho Mail') {
      setSmtpHost('smtp.zoho.com');
      setSmtpPort('465');
      setImapHost('imap.zoho.com');
      setImapPort('993');
    } else {
      setSmtpHost('');
      setSmtpPort('587');
      setImapHost('');
      setImapPort('993');
    }
  };

  const handleTestAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !appPassword) {
      setErrorMessage('Please provide your professional email address and 16-digit App Password.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);
    setVerifyStepText('Step 1/2: Testing SMTP Authentication...');

    try {
      const response = await fetch('/api/mailboxes/test-and-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName: senderName || email.split('@')[0],
          email: email.trim(),
          provider,
          appPassword: appPassword.trim(),
          smtpHost: smtpHost || (provider === 'Google Workspace' ? 'smtp.gmail.com' : provider === 'Microsoft 365 / Outlook' ? 'smtp.office365.com' : 'smtp.zoho.com'),
          smtpPort: parseInt(smtpPort) || 587,
          smtpSecure: smtpPort === '465',
          imapHost: imapHost || (provider === 'Google Workspace' ? 'imap.gmail.com' : provider === 'Microsoft 365 / Outlook' ? 'outlook.office365.com' : 'imap.zoho.com'),
          imapPort: parseInt(imapPort) || 993,
          imapSecure: true,
        }),
      });

      setVerifyStepText('Step 2/2: Verifying IMAP Inbox Synchronization...');
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to authenticate mailbox.');
      }

      setSuccessMailbox(data.mailbox);
      onMailboxConnected(data.mailbox);
    } catch (err: any) {
      setErrorMessage(err.message || 'Connection test failed. Please verify your credentials.');
    } finally {
      setIsVerifying(false);
      setVerifyStepText('');
    }
  };

  const handleResetForm = () => {
    setSuccessMailbox(null);
    setErrorMessage(null);
    setEmail('');
    setAppPassword('');
    setSenderName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-slate-950/95 backdrop-blur-2xl border border-white/10 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5 font-['Inter'] relative my-8">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <span className="material-symbols-outlined text-xl">mark_email_read</span>
            </div>
            <div>
              <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-white">
                Add Professional Mailbox
              </h3>
              <p className="text-xs text-slate-400">
                Connect Google Workspace, Microsoft 365, or Custom SMTP using a 16-digit App Password
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Success View */}
        {successMailbox ? (
          <div className="space-y-5 animate-fadeIn">
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 space-y-3">
              <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                <span className="material-symbols-outlined text-lg">check_circle</span>
                Mailbox Successfully Connected & Verified!
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                SMTP and IMAP servers authenticated for <span className="font-bold text-white">{successMailbox.email}</span>. You can now dispatch real emails and receive real replies directly inside your Unibox.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-3 bg-slate-900/60 rounded-xl border border-white/5">
                <span className="text-slate-400">Sender Identity</span>
                <span className="font-semibold text-white">{successMailbox.senderName} ({successMailbox.email})</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-900/60 rounded-xl border border-white/5">
                <span className="text-slate-400">SMTP Server</span>
                <span className="font-mono text-green-400 font-semibold">{successMailbox.smtpHost}:{successMailbox.smtpPort} (Connected)</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-900/60 rounded-xl border border-white/5">
                <span className="text-slate-400">IMAP Reply Sync</span>
                <span className="font-mono text-green-400 font-semibold">{successMailbox.imapHost}:{successMailbox.imapPort} (Active)</span>
              </div>
            </div>

            <button
              onClick={handleResetForm}
              className="w-full py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-500/20 transition-all"
            >
              Done & Return to Workspace
            </button>
          </div>
        ) : (
          /* Connection Form */
          <form onSubmit={handleTestAndConnect} className="space-y-4">
            
            {/* Provider Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                1. Select Professional Provider
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'Google Workspace', name: 'Google', icon: 'workspace_premium' },
                  { id: 'Microsoft 365 / Outlook', name: 'Microsoft 365', icon: 'domain' },
                  { id: 'Zoho Mail', name: 'Zoho Mail', icon: 'mail_lock' },
                  { id: 'Custom SMTP / IMAP', name: 'Custom Domain', icon: 'dns' },
                ].map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => handleProviderSelect(p.id as ProviderType)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-semibold transition-all ${
                      provider === p.id
                        ? 'bg-indigo-500/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                        : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">{p.icon}</span>
                    <span className="text-[11px] text-center leading-tight">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Guide Accordion for App Password */}
            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-3.5 text-xs space-y-2">
              <div 
                onClick={() => setShowGuide(!showGuide)}
                className="flex items-center justify-between cursor-pointer font-bold text-indigo-300"
              >
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">help_outline</span>
                  How to generate a 16-digit App Password for {provider}?
                </span>
                <span className="material-symbols-outlined text-sm">
                  {showGuide ? 'expand_less' : 'expand_more'}
                </span>
              </div>

              {showGuide && (
                <div className="pt-2 text-slate-300 space-y-1.5 text-[11px] border-t border-indigo-500/20 leading-relaxed">
                  {provider === 'Google Workspace' && (
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>Go to <strong>Google Account</strong> (myaccount.google.com) &gt; <strong>Security</strong>.</li>
                      <li>Ensure <strong>2-Step Verification</strong> is ON.</li>
                      <li>In the search bar at top, type <strong>"App Passwords"</strong>.</li>
                      <li>Create an app password named <em>"SalesHub"</em> and copy the generated <strong>16-letter code</strong> below.</li>
                    </ol>
                  )}
                  {provider === 'Microsoft 365 / Outlook' && (
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>Log in to <strong>Microsoft Security Settings</strong>.</li>
                      <li>Under <strong>Advanced Security Options</strong>, enable 2-Step Verification.</li>
                      <li>Under <strong>App Passwords</strong>, click <strong>Create a new app password</strong>.</li>
                      <li>Copy the 16-character password into the field below.</li>
                    </ol>
                  )}
                  {provider === 'Zoho Mail' && (
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>Go to <strong>Zoho Accounts</strong> &gt; <strong>Security</strong> &gt; <strong>App Passwords</strong>.</li>
                      <li>Click <strong>Generate New Password</strong> for SalesHub.</li>
                      <li>Paste the 16-character key below.</li>
                    </ol>
                  )}
                  {provider === 'Custom SMTP / IMAP' && (
                    <p>
                      Use your domain's standard SMTP/IMAP credentials or app-specific password provided by your hosting admin.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Inputs: Display Name, Email, 16-digit App Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Sender Display Name
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. Alex Carter"
                  className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Account Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. alex@yourcompany.com"
                  className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none placeholder:text-slate-500 font-mono"
                />
              </div>
            </div>

            {/* 16-Digit App Password */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  16-Digit App Password *
                </label>
                <span className="text-[10px] text-indigo-400 font-mono">e.g. abcd efgh ijkl mnop</span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                  placeholder="Paste 16-character app password..."
                  className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-3.5 pr-10 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none placeholder:text-slate-500 font-mono tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <span className="material-symbols-outlined text-sm">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Advanced Host Settings Dropdown */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvancedHosts(!showAdvancedHosts)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-semibold transition-colors"
              >
                <span className="material-symbols-outlined text-sm">settings_suggest</span>
                <span>{showAdvancedHosts ? 'Hide Advanced Host Settings' : 'View / Edit Server Host Ports'}</span>
              </button>

              {showAdvancedHosts && (
                <div className="grid grid-cols-2 gap-3 pt-3 p-3 bg-slate-900/50 border border-white/5 rounded-xl text-xs mt-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">SMTP Host</label>
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="smtp.gmail.com"
                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">SMTP Port</label>
                    <input
                      type="text"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                      placeholder="587"
                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">IMAP Host</label>
                    <input
                      type="text"
                      value={imapHost}
                      onChange={(e) => setImapHost(e.target.value)}
                      placeholder="imap.gmail.com"
                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">IMAP Port</label>
                    <input
                      type="text"
                      value={imapPort}
                      onChange={(e) => setImapPort(e.target.value)}
                      placeholder="993"
                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2">
                <span className="material-symbols-outlined text-sm shrink-0 mt-0.5">error</span>
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-3 flex justify-end gap-2.5 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isVerifying}
                className="px-5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                    <span>{verifyStepText || 'Testing Credentials...'}</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">verified</span>
                    <span>Test & Connect Mailbox</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

