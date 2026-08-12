import React, { useState } from 'react';
import { AuditResult } from '../types';

interface AiAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiAuditModal: React.FC<AiAuditModalProps> = ({ isOpen, onClose }) => {
  const [domainInput, setDomainInput] = useState('acmecorp.com');
  const [loading, setLoading] = useState(false);
  const [auditData, setAuditData] = useState<AuditResult | null>(null);

  if (!isOpen) return null;

  const handleRunAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/ai/audit-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainInput }),
      });

      const data = await res.json();
      setAuditData(data);
    } catch (err) {
      console.error('Audit failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn font-['Inter']">
      <div className="bg-slate-950/90 backdrop-blur-2xl border border-white/10 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-green-400">health_and_safety</span>
            <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-xl text-white">
              AI Deliverability & Spam Audit
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleRunAudit} className="flex gap-2">
          <input
            type="text"
            required
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            placeholder="Enter domain (e.g. acmecorp.com)..."
            className="flex-1 bg-slate-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-sm">sync</span>
            ) : (
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
            )}
            Run Audit
          </button>
        </form>

        {auditData && (
          <div className="space-y-4 pt-2 animate-fadeIn">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-white text-base">{auditData.domain}</h4>
                <p className="text-xs text-green-400">Status: {auditData.status}</p>
              </div>
              <div className="text-right">
                <span className="font-['Plus_Jakarta_Sans'] font-extrabold text-3xl text-white">
                  {auditData.healthScore}%
                </span>
                <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Health Score</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-slate-900/60 rounded-xl border border-white/5 flex justify-between">
                <span className="text-slate-400">SPF:</span>
                <span className="font-mono text-white">{auditData.spfStatus}</span>
              </div>
              <div className="p-2.5 bg-slate-900/60 rounded-xl border border-white/5 flex justify-between">
                <span className="text-slate-400">DKIM:</span>
                <span className="font-mono text-white">{auditData.dkimStatus}</span>
              </div>
              <div className="p-2.5 bg-slate-900/60 rounded-xl border border-white/5 flex justify-between">
                <span className="text-slate-400">DMARC:</span>
                <span className="font-mono text-white">{auditData.dmarcStatus}</span>
              </div>
              <div className="p-2.5 bg-slate-900/60 rounded-xl border border-white/5 flex justify-between">
                <span className="text-slate-400">Blacklists:</span>
                <span className="font-mono text-green-400 font-bold">{auditData.blacklistStatus}</span>
              </div>
            </div>

            <div>
              <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
                AI Recommendations
              </h5>
              <ul className="space-y-1.5">
                {auditData.recommendations?.map((rec, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-center gap-2 bg-slate-900/40 p-2.5 rounded-xl border border-white/5">
                    <span className="material-symbols-outlined text-[14px] text-indigo-400">
                      lightbulb
                    </span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
