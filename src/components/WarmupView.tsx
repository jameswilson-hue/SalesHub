import React, { useState } from 'react';
import { WarmupDomain } from '../types';

interface WarmupViewProps {
  domains: WarmupDomain[];
  onToggleDomain: (id: string) => void;
  onUpdateCap: (id: string, cap: number) => void;
  onOpenConnectModal: () => void;
}

export const WarmupView: React.FC<WarmupViewProps> = ({
  domains,
  onToggleDomain,
  onUpdateCap,
  onOpenConnectModal,
}) => {
  const [auditDomainInput, setAuditDomainInput] = useState('tryleadsoll.com');
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  const handleRunLiveDnsAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditDomainInput.trim()) return;

    setIsAuditing(true);
    setAuditError(null);
    setAuditResult(null);

    try {
      const res = await fetch('/api/domain/live-dns-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: auditDomainInput.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        setAuditResult(data);
      } else {
        setAuditError(data.error || 'Failed to query DNS records for domain.');
      }
    } catch (err: any) {
      setAuditError(err.message || 'Error executing live DNS query.');
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-['Plus_Jakarta_Sans'] font-bold text-3xl text-white tracking-tight">Warmup & Health</h1>
          <p className="font-['Inter'] text-sm text-slate-400 mt-1">
            Automated domain warmup, peer-to-peer inbox placement, and real-time DNS deliverability auditor.
          </p>
        </div>

        <button
          onClick={onOpenConnectModal}
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-['Inter'] text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Connect New Mailbox
        </button>
      </div>

      {/* Live DNS & Deliverability Auditor Tool */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-400">policy</span>
              <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-xl text-white">
                Live DNS & Technical Audit Tool
              </h3>
            </div>
            <p className="font-['Inter'] text-xs text-slate-300 mt-0.5">
              Queries real public DNS servers for SPF, DKIM, DMARC TXT records and MX exchanges.
            </p>
          </div>

          <form onSubmit={handleRunLiveDnsAudit} className="flex items-center gap-2 w-full md:w-auto">
            <input
              type="text"
              value={auditDomainInput}
              onChange={(e) => setAuditDomainInput(e.target.value)}
              placeholder="e.g. yourcompany.com"
              className="bg-slate-900/90 border border-white/20 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-400 focus:outline-none font-mono w-full md:w-64"
            />
            <button
              type="submit"
              disabled={isAuditing}
              className="bg-indigo-500 hover:bg-indigo-600 text-white font-['Inter'] text-xs font-bold px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center gap-1.5 disabled:opacity-50"
            >
              {isAuditing ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                  <span>Querying DNS...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">search</span>
                  <span>Run Live DNS Audit</span>
                </>
              )}
            </button>
          </form>
        </div>

        {auditError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{auditError}</span>
          </div>
        )}

        {auditResult && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between bg-slate-950/60 p-4 rounded-xl border border-white/10 gap-3">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Audited Domain</span>
                <span className="font-mono font-bold text-lg text-white">{auditResult.domain}</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">DNS Score</span>
                  <span className={`font-mono text-xl font-extrabold ${auditResult.healthScore >= 80 ? 'text-green-400' : 'text-amber-400'}`}>
                    {auditResult.healthScore} / 100
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
              {/* SPF */}
              <div className="p-3 bg-slate-900/80 border border-white/10 rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">SPF Record</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${auditResult.spf.status === 'Pass' ? 'bg-green-500/20 text-green-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {auditResult.spf.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 break-all bg-black/40 p-2 rounded border border-white/5 font-mono">
                  {auditResult.spf.record}
                </p>
              </div>

              {/* DMARC */}
              <div className="p-3 bg-slate-900/80 border border-white/10 rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">DMARC Policy</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${auditResult.dmarc.status === 'Pass' ? 'bg-green-500/20 text-green-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {auditResult.dmarc.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 break-all bg-black/40 p-2 rounded border border-white/5 font-mono">
                  {auditResult.dmarc.record}
                </p>
              </div>

              {/* DKIM */}
              <div className="p-3 bg-slate-900/80 border border-white/10 rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">DKIM Selector</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${auditResult.dkim.status === 'Pass' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-300'}`}>
                    {auditResult.dkim.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 break-all bg-black/40 p-2 rounded border border-white/5 font-mono">
                  {auditResult.dkim.record}
                </p>
              </div>

              {/* MX */}
              <div className="p-3 bg-slate-900/80 border border-white/10 rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">MX Mail Exchange</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${auditResult.mx.status === 'Pass' ? 'bg-green-500/20 text-green-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {auditResult.mx.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 break-all bg-black/40 p-2 rounded border border-white/5 font-mono">
                  {auditResult.mx.records.join(', ') || 'No MX records found'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Top Health Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Sending Volume Chart Card */}
        <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col justify-between shadow-2xl">
          <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4">
            <div>
              <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-xl text-white">
                Daily Warmup Dispatch
              </h3>
              <p className="font-['Inter'] text-xs text-slate-400">
                Automated peer-to-peer email exchanges across active pools
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-green-400 bg-green-500/20 px-3 py-1 rounded-full border border-green-500/30">
              Pool Status: Active
            </span>
          </div>

          {/* Bar Chart Simulation */}
          <div className="h-44 flex items-end justify-between gap-3 pt-6 px-4">
            {[35, 42, 48, 55, 62, 70, 82, 90, 85, 98, 105, 120].map((val, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                <div
                  className="w-full bg-indigo-500/70 group-hover:bg-indigo-500 rounded-t-md transition-all relative"
                  style={{ height: `${(val / 120) * 100}%` }}
                >
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-950 border border-white/20 px-2 py-0.5 rounded text-[10px] text-white font-mono z-20 pointer-events-none">
                    {val} emails
                  </div>
                </div>
                <span className="font-mono text-[10px] text-slate-500">
                  Day {idx + 1}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Global Inbox Placement Donut Score */}
        <div className="lg:col-span-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-between shadow-2xl">
          <div className="w-full border-b border-white/10 pb-3">
            <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-white">
              Placement Score
            </h3>
            <p className="font-['Inter'] text-xs text-slate-400">Global Inbox Reach</p>
          </div>

          <div className="relative w-36 h-36 my-4">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#4edea3"
                strokeWidth="10"
                strokeDasharray="251"
                strokeDashoffset="15"
                className="drop-shadow-[0_0_10px_rgba(78,222,163,0.6)]"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-['Plus_Jakarta_Sans'] font-extrabold text-3xl text-white">
                94%
              </span>
              <span className="font-['Inter'] text-[9px] font-bold text-green-400 uppercase tracking-widest">
                INBOX
              </span>
            </div>
          </div>

          <div className="w-full space-y-2 font-['Inter'] text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" /> Inbox Placement
              </span>
              <span className="font-mono font-bold text-white">94.2%</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" /> Spam Folder
              </span>
              <span className="font-mono font-bold text-white">3.8%</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" /> Other/Categories
              </span>
              <span className="font-mono font-bold text-white">2.0%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Linked Domain Accounts Table */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/10 bg-slate-950/40 flex justify-between items-center">
          <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-white">
            Linked Accounts & Daily Caps
          </h3>
          <span className="font-mono text-xs text-slate-400">{domains.length} Accounts Active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-black/20 text-[11px] font-mono uppercase text-[#8c909f] tracking-wider">
                <th className="py-3.5 px-6">Account Email</th>
                <th className="py-3.5 px-6">Provider</th>
                <th className="py-3.5 px-6">Warmup Status</th>
                <th className="py-3.5 px-6">Health Score</th>
                <th className="py-3.5 px-6">Daily Sent / Cap</th>
                <th className="py-3.5 px-6 text-right">Toggle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-['Inter'] text-sm">
              {domains.map((dom) => (
                <tr key={dom.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="py-4 px-6 font-semibold text-white">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-[#4d8eff]">
                        alternate_email
                      </span>
                      {dom.email}
                    </div>
                  </td>

                  <td className="py-4 px-6 text-xs text-[#c2c6d6]">{dom.provider}</td>

                  <td className="py-4 px-6">
                    <span
                      className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold border ${
                        dom.status === 'Active'
                          ? 'bg-[#4edea3]/10 text-[#4edea3] border-[#4edea3]/30'
                          : 'bg-white/10 text-[#8c909f] border-white/10'
                      }`}
                    >
                      {dom.status}
                    </span>
                  </td>

                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-white w-8">
                        {dom.healthScore}%
                      </span>
                      <div className="w-24 bg-white/10 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            dom.healthScore >= 90
                              ? 'bg-[#4edea3]'
                              : dom.healthScore >= 75
                              ? 'bg-[#4cd7f6]'
                              : 'bg-[#ffb4ab]'
                          }`}
                          style={{ width: `${dom.healthScore}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-white font-bold">{dom.dailySent}</span>
                      <span className="text-[#8c909f]">/</span>
                      <input
                        type="number"
                        value={dom.dailyCap}
                        onChange={(e) => onUpdateCap(dom.id, parseInt(e.target.value) || 10)}
                        className="w-16 bg-[#131314] border border-white/10 rounded px-2 py-1 text-xs text-white text-center focus:border-[#4d8eff] focus:outline-none"
                      />
                      <span className="text-[#8c909f]">cap</span>
                    </div>
                  </td>

                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => onToggleDomain(dom.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-['Inter'] transition-all ${
                        dom.status === 'Active'
                          ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20'
                          : 'bg-[#3b82f6]/20 hover:bg-[#3b82f6]/30 text-[#adc6ff] border border-[#3b82f6]/30'
                      }`}
                    >
                      {dom.status === 'Active' ? 'Pause Warmup' : 'Activate Warmup'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
