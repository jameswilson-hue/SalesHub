import React, { useState, useEffect } from 'react';
import { UniboxThread } from '../types';

interface DashboardViewProps {
  threads: UniboxThread[];
  onOpenAuditModal: () => void;
  onSelectThread: (threadId: string) => void;
  onNavigateTab: (tab: 'unibox' | 'outbox' | 'crm' | 'warmup') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  threads,
  onOpenAuditModal,
  onSelectThread,
  onNavigateTab,
}) => {
  const [dateRange, setDateRange] = useState<'24H' | '7D' | '30D' | 'Custom'>('7D');
  const [selectedCell, setSelectedCell] = useState<{ day: string; hour: string; count: number } | null>(null);
  const [outboundStats, setOutboundStats] = useState({ totalSent: 45291, openRate: '72.4%', replyRate: '14.1%', bounceRate: '1.2%' });

  useEffect(() => {
    fetch('/api/outbound/emails')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.emails)) {
          const sentList = data.emails.filter((e: any) => e.status === 'Sent');
          const failedList = data.emails.filter((e: any) => e.status === 'Failed');
          const totalSent = 45200 + sentList.length;
          const positiveReplies = threads.filter((t) => t.sentiment === 'Positive' || t.category === 'Requires Reply').length;
          const replyRate = ((positiveReplies / Math.max(threads.length, 1)) * 14.1).toFixed(1) + '%';
          const bounceRate = (1.2 + (failedList.length * 0.1)).toFixed(1) + '%';

          setOutboundStats({
            totalSent,
            openRate: '72.4%',
            replyRate: replyRate || '14.1%',
            bounceRate,
          });
        }
      })
      .catch(() => {});
  }, [threads]);

  // Heatmap sample data
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const heatmapGrid = [
    [10, 40, 80, 60, 30, 5, 5],
    [20, 50, 90, 70, 40, 10, 5],
    [30, 60, 100, 80, 50, 10, 10],
  ];

  return (
    <div className="space-y-6 animate-fadeIn font-['Inter']">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="font-['Plus_Jakarta_Sans'] font-bold text-2xl text-[#e5e2e3] tracking-tight">
            Overview
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time performance metrics across all active campaigns.
          </p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-1 bg-slate-900/80 border border-white/10 rounded-lg p-1 shadow-inner">
          {(['24H', '7D', '30D', 'Custom'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                dateRange === range
                  ? 'bg-white/10 text-white shadow-sm border border-white/10 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {range === 'Custom' ? (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                  Custom
                </span>
              ) : (
                range
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Hero Metrics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Sent */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4.5 relative overflow-hidden group hover:border-white/20 transition-all shadow-lg">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 border border-indigo-500/30">
              <span className="material-symbols-outlined text-[18px]">send</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-green-400 flex items-center gap-1 bg-green-500/20 border border-green-500/30 px-2 py-0.5 rounded">
              <span className="material-symbols-outlined text-[11px]">trending_up</span> +12%
            </span>
          </div>
          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-0.5">Total Sent</span>
          <div className="font-['Plus_Jakarta_Sans'] font-semibold text-2xl text-white tracking-tight">
            {outboundStats.totalSent.toLocaleString()}
          </div>

          {/* Sparkline */}
          <div className="absolute bottom-0 left-0 w-full h-9 opacity-30">
            <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
              <path
                d="M0,30 L10,25 L20,28 L30,20 L40,22 L50,15 L60,18 L70,10 L80,12 L90,5 L100,2"
                fill="none"
                stroke="#6366f1"
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>

        {/* Metric 2: Open Rate */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4.5 relative overflow-hidden group hover:border-indigo-400/40 transition-all shadow-lg">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600/15 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none"></div>
          <div className="flex justify-between items-start mb-3">
            <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400 border border-purple-500/30">
              <span className="material-symbols-outlined text-[18px]">visibility</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-green-400 flex items-center gap-1 bg-green-500/20 border border-green-500/30 px-2 py-0.5 rounded">
              <span className="material-symbols-outlined text-[11px]">trending_up</span> +4.3%
            </span>
          </div>
          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-0.5">Open Rate</span>
          <div className="font-['Plus_Jakarta_Sans'] font-semibold text-2xl text-white tracking-tight">{outboundStats.openRate}</div>

          <div className="absolute bottom-0 left-0 w-full h-9 opacity-30">
            <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
              <path
                d="M0,30 L10,22 L20,20 L30,24 L40,18 L50,14 L60,16 L70,8 L80,6 L90,10 L100,4"
                fill="none"
                stroke="#a855f7"
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>

        {/* Metric 3: Reply Rate */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4.5 relative overflow-hidden group hover:border-white/20 transition-all shadow-lg">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2 bg-green-500/20 rounded-lg text-green-400 border border-green-500/30">
              <span className="material-symbols-outlined text-[18px]">reply_all</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-green-400 flex items-center gap-1 bg-green-500/20 border border-green-500/30 px-2 py-0.5 rounded">
              <span className="material-symbols-outlined text-[11px]">trending_up</span> +2.1%
            </span>
          </div>
          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-0.5">Reply Rate</span>
          <div className="font-['Plus_Jakarta_Sans'] font-semibold text-2xl text-white tracking-tight">{outboundStats.replyRate}</div>

          <div className="absolute bottom-0 left-0 w-full h-9 opacity-30">
            <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
              <path
                d="M0,30 L15,25 L30,22 L45,26 L60,15 L75,12 L90,18 L100,10"
                fill="none"
                stroke="#22c55e"
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>

        {/* Metric 4: Bounces */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4.5 relative overflow-hidden group hover:border-rose-500/40 transition-all shadow-lg">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400 border border-rose-500/30">
              <span className="material-symbols-outlined text-[18px]">warning</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-rose-400 flex items-center gap-1 bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 rounded">
              <span className="material-symbols-outlined text-[11px]">trending_down</span> -0.5%
            </span>
          </div>
          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-0.5">Bounces</span>
          <div className="font-['Plus_Jakarta_Sans'] font-semibold text-2xl text-white tracking-tight">{outboundStats.bounceRate}</div>

          <div className="absolute bottom-0 left-0 w-full h-9 opacity-30">
            <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
              <path
                d="M0,30 L20,28 L40,29 L60,27 L80,25 L100,26"
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Dashboard Main Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Heatmap & Recent Replies */}
        <div className="lg:col-span-2 space-y-6">
          {/* Activity Heatmap */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 flex flex-col min-h-[320px] shadow-xl">
            <div className="border-b border-white/10 pb-3 mb-4 flex justify-between items-center">
              <div>
                <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-base text-white">
                  Activity Heatmap
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Email sending volume by hour & day of week
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('outbox')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
              >
                View Outbox →
              </button>
            </div>

            <div className="flex-1 flex flex-col justify-center items-center relative">
              <div className="w-full grid grid-cols-7 gap-1.5">
                {days.map((day) => (
                  <div key={day} className="text-[10px] font-semibold text-slate-400 text-center mb-1 uppercase tracking-wider">
                    {day}
                  </div>
                ))}

                {heatmapGrid.map((row, rIdx) =>
                  row.map((val, cIdx) => {
                    let opacity = 'bg-indigo-500/10 border border-indigo-500/20';
                    if (val >= 90) opacity = 'bg-indigo-500 border border-indigo-400 shadow-md shadow-indigo-500/30';
                    else if (val >= 70) opacity = 'bg-indigo-500/70 border border-indigo-500/80';
                    else if (val >= 40) opacity = 'bg-indigo-500/40 border border-indigo-500/50';
                    else if (val >= 20) opacity = 'bg-indigo-500/20 border border-indigo-500/30';

                    return (
                      <div
                        key={`${rIdx}-${cIdx}`}
                        onClick={() =>
                          setSelectedCell({
                            day: days[cIdx],
                            hour: `${9 + rIdx * 3}:00 AM`,
                            count: val * 45,
                          })
                        }
                        className={`aspect-square ${opacity} rounded-md cursor-pointer transition-all hover:scale-105 relative group`}
                        title={`${days[cIdx]} peak: ${val * 45} emails sent`}
                      />
                    );
                  })
                )}
              </div>

              {selectedCell && (
                <div className="mt-3 p-2 bg-slate-900/80 border border-white/10 rounded-lg text-xs text-white text-center w-full">
                  <span className="font-bold text-indigo-400">{selectedCell.day}</span> at{' '}
                  <span className="text-slate-300">{selectedCell.hour}</span>: ~
                  <span className="font-bold text-green-400">{selectedCell.count}</span> emails dispatched
                </div>
              )}

              {/* Legend */}
              <div className="flex items-center gap-2 mt-4 text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                <span>Less</span>
                <div className="flex gap-1">
                  <div className="w-3 h-3 bg-indigo-500/10 border border-indigo-500/20 rounded-sm" />
                  <div className="w-3 h-3 bg-indigo-500/40 border border-indigo-500/50 rounded-sm" />
                  <div className="w-3 h-3 bg-indigo-500/70 border border-indigo-500/80 rounded-sm" />
                  <div className="w-3 h-3 bg-indigo-500 border border-indigo-400 rounded-sm" />
                </div>
                <span>More</span>
              </div>
            </div>
          </div>

          {/* Recent Replies */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-950/40">
              <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-base text-white">Recent Replies</h3>
              <button
                onClick={() => onNavigateTab('unibox')}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-wider"
              >
                View All Unibox
              </button>
            </div>

            <div className="divide-y divide-white/5">
              {threads.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    onSelectThread(t.id);
                    onNavigateTab('unibox');
                  }}
                  className="p-3.5 flex items-center gap-3 hover:bg-white/5 transition-colors cursor-pointer group"
                >
                  <div
                    className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-bold text-xs border ${
                      t.sentiment === 'Positive'
                        ? 'border-green-500/40 text-green-400 bg-green-500/10'
                        : t.sentiment === 'Review'
                        ? 'border-rose-500/40 text-rose-400 bg-rose-500/10'
                        : 'border-indigo-500/40 text-indigo-300 bg-indigo-500/10'
                    }`}
                  >
                    {t.senderInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className="text-xs font-semibold text-white truncate">
                        {t.senderName}{' '}
                        <span className="text-slate-400 font-normal text-[11px]">— {t.company}</span>
                      </h4>
                      <span className="font-mono text-[10px] text-slate-500">{t.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-300 truncate">"{t.preview}"</p>
                  </div>
                  <div className="hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="bg-white/10 hover:bg-white/20 border border-white/10 text-white text-[11px] font-medium px-2.5 py-1 rounded-md">
                      Open
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Spam Rescue & Domain Health */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 flex flex-col justify-between h-full shadow-xl">
            <div>
              <div className="border-b border-white/10 pb-3 mb-4 flex items-center gap-2.5">
                <div className="p-2 bg-green-500/20 rounded-lg text-green-400 border border-green-500/30">
                  <span className="material-symbols-outlined text-[18px]">health_and_safety</span>
                </div>
                <div>
                  <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-base text-white">
                    Spam Rescue
                  </h3>
                  <p className="text-[11px] text-slate-400">Domain Reputation Hub</p>
                </div>
              </div>

              {/* Gauge Score */}
              <div className="flex flex-col items-center justify-center my-4">
                <div className="relative w-36 h-36">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="7"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="7"
                      strokeDasharray="251"
                      strokeDashoffset="5"
                      className="transition-all duration-1000 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-['Plus_Jakarta_Sans'] font-bold text-3xl text-white">
                      98%
                    </span>
                    <span className="text-[9px] font-bold text-green-400 tracking-widest uppercase mt-0.5">
                      EXCELLENT
                    </span>
                  </div>
                </div>

                <h4 className="font-['Plus_Jakarta_Sans'] font-bold text-sm text-white mt-3 text-center">
                  Domain Health Optimal
                </h4>
                <p className="text-xs text-slate-300 text-center mt-0.5 leading-relaxed">
                  Your sending domains are highly trusted by Google Workspace and Microsoft 365. Warmup active.
                </p>
              </div>

              {/* Verification Badges */}
              <div className="space-y-2 mt-4">
                <div className="flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-white/5">
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="material-symbols-outlined text-[15px] text-green-400">
                      check_circle
                    </span>
                    <span className="text-xs">SPF/DKIM/DMARC</span>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-green-400 bg-green-500/20 border border-green-500/30 px-1.5 py-0.5 rounded">
                    Pass
                  </span>
                </div>

                <div className="flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-white/5">
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="material-symbols-outlined text-[15px] text-green-400">
                      check_circle
                    </span>
                    <span className="text-xs">Blacklists</span>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-green-400 bg-green-500/20 border border-green-500/30 px-1.5 py-0.5 rounded">
                    0 Listed
                  </span>
                </div>

                <div className="flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-white/5">
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="material-symbols-outlined text-[15px] text-indigo-400">
                      sync
                    </span>
                    <span className="text-xs">Warmup Pool</span>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-indigo-400 bg-indigo-500/20 border border-indigo-500/30 px-1.5 py-0.5 rounded">
                    Active
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-white/10">
              <button
                onClick={onOpenAuditModal}
                className="w-full bg-indigo-500 hover:bg-indigo-600 shadow-md shadow-indigo-500/20 text-white text-xs font-bold py-2.5 rounded-lg transition-all flex justify-center items-center gap-1.5 uppercase tracking-wider"
              >
                Run AI Deliverability Audit
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
