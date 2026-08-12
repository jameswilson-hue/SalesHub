import React from 'react';
import { TabType, UserProfile } from '../types';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  user: UserProfile;
  unreadCount: number;
  onOpenConnectModal: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  user,
  unreadCount,
  onOpenConnectModal,
  isMobileOpen,
  onCloseMobile,
}) => {
  const navItems: { id: TabType; label: string; icon: string; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'crm', label: 'CRM Leads', icon: 'group' },
    { id: 'outbox', label: 'Outbox & Scheduled', icon: 'outbox' },
    { id: 'unibox', label: 'Unibox', icon: 'mail', badge: unreadCount },
    { id: 'warmup', label: 'Warmup & Health', icon: 'fireplace' },
    { id: 'settings', label: 'Settings & Mailboxes', icon: 'settings' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-[230px] bg-slate-950/80 backdrop-blur-xl border-r border-white/10 flex flex-col py-5 z-50 transition-transform duration-300 md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand */}
        <div className="px-5 mb-6 flex items-center gap-2.5">
          <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
            <span className="material-symbols-outlined text-white text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              bolt
            </span>
          </div>
          <div>
            <h1 className="font-['Plus_Jakarta_Sans'] font-bold text-base tracking-tight text-white leading-tight">
              SALESHUB <span className="text-indigo-400">CORE</span>
            </h1>
            <p className="font-['Inter'] text-[9px] text-slate-400 uppercase tracking-widest font-semibold">Growth Plan</p>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 flex flex-col gap-0.5 px-3 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-['Inter'] text-xs font-medium transition-all duration-150 active:scale-[0.98] text-left ${
                  isActive
                    ? 'bg-white/10 text-white font-semibold shadow-sm border border-white/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full transition-all shrink-0 ${
                    isActive ? 'bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.8)]' : 'bg-transparent border border-slate-600'
                  }`}
                />
                <span
                  className="material-symbols-outlined text-[17px] shrink-0"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto bg-indigo-500/20 text-indigo-300 font-mono text-[10px] px-1.5 py-0.5 rounded-full font-semibold border border-indigo-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Action & System Health */}
        <div className="px-3 mt-auto pt-3 border-t border-white/10 space-y-2">
          <button
            onClick={onOpenConnectModal}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-white/5 transition-colors font-['Inter'] text-xs text-left"
          >
            <span className="material-symbols-outlined text-[16px]">sync_alt</span>
            <span>Switch Account</span>
          </button>

          {/* System Health Card */}
          <div className="bg-slate-900/60 rounded-lg p-2.5 border border-white/5">
            <div className="text-[9px] uppercase text-slate-500 font-bold mb-1 tracking-wider">SYSTEM HEALTH</div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-green-400 font-mono font-semibold">99.98% Deliverability</span>
              <div className="flex gap-1">
                <div className="w-1 h-2.5 bg-green-500/40 rounded-full"></div>
                <div className="w-1 h-2.5 bg-green-500/40 rounded-full"></div>
                <div className="w-1 h-2.5 bg-green-500 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* User Profile Snippet */}
          <div
            onClick={() => onSelectTab('settings')}
            className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/10 cursor-pointer transition-colors border border-white/5 bg-slate-900/50"
          >
            <div className="w-7 h-7 rounded-full border border-white/20 bg-gradient-to-tr from-indigo-500 to-purple-500 overflow-hidden shrink-0">
              <img
                src={user.avatarUrl}
                alt={user.firstName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-['Inter'] text-[11px] font-semibold text-slate-200 truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="font-['Inter'] text-[9px] text-slate-400 truncate">
                {user.email}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
