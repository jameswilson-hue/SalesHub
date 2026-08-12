import React, { useState } from 'react';
import { UserProfile } from '../types';

interface HeaderProps {
  user: UserProfile;
  onOpenConnectModal: () => void;
  onOpenMobileSidebar: () => void;
  onSearchQuery: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onOpenConnectModal,
  onOpenMobileSidebar,
  onSearchQuery,
}) => {
  const [query, setQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onSearchQuery(val);
  };

  return (
    <header className="fixed top-0 w-full h-14 bg-slate-950/80 backdrop-blur-md border-b border-white/10 flex justify-between items-center pl-4 md:pl-[246px] pr-5 z-30 transition-all duration-300">
      {/* Mobile Menu Trigger */}
      <button
        onClick={onOpenMobileSidebar}
        className="md:hidden text-slate-400 hover:text-white p-1.5 mr-2 hover:bg-white/5 rounded-lg transition-colors"
        aria-label="Toggle Navigation"
      >
        <span className="material-symbols-outlined text-[20px]">menu</span>
      </button>

      {/* Global Search */}
      <div className="flex-1 max-w-sm relative">
        <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-[16px]">
          search
        </span>
        <input
          type="text"
          value={query}
          onChange={handleSearchChange}
          placeholder="Search campaigns, leads, accounts..."
          className="w-full bg-slate-900/60 border border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-slate-200 font-['Inter'] text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2.5 ml-auto">
        <button
          onClick={() => alert('SalesHub Growth Plan Help Center\n\nNeed assistance? Contact support@saleshub.io or use our 24/7 AI Sales Copilot.')}
          className="text-slate-400 hover:text-slate-200 hover:bg-white/5 p-1.5 rounded-md transition-colors hidden sm:block"
          title="Help & Support"
        >
          <span className="material-symbols-outlined text-[18px]">help</span>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="text-slate-400 hover:text-slate-200 hover:bg-white/5 p-1.5 rounded-md transition-colors relative"
            title="Notifications"
          >
            <span className="material-symbols-outlined text-[18px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-400 rounded-full shadow-[0_0_6px_rgba(129,140,248,0.8)]"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 bg-slate-950/95 border border-white/10 backdrop-blur-xl rounded-xl shadow-2xl p-3 z-50 font-['Inter']">
              <div className="flex justify-between items-center mb-2.5 pb-1.5 border-b border-white/10">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Notifications</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded-full font-mono">2 New</span>
              </div>
              <div className="space-y-2">
                <div className="p-2 rounded-lg bg-slate-900/60 border border-white/5 hover:border-white/10 transition-all">
                  <p className="text-xs font-semibold text-white">Sarah Jenkins replied</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">"The proposal looks solid. Let's talk Tuesday..."</p>
                  <span className="text-[9px] text-slate-500 mt-1 block font-mono">10 mins ago</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900/60 border border-white/5 hover:border-white/10 transition-all">
                  <p className="text-xs font-semibold text-white">Domain Health Optimal</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">hello@acmecorp.com scored 98% in deliverability audit.</p>
                  <span className="text-[9px] text-slate-500 mt-1 block font-mono">1 hour ago</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-3.5 w-px bg-white/10 mx-0.5 hidden sm:block"></div>

        {/* Add Account Button */}
        <button
          onClick={onOpenConnectModal}
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-['Inter'] text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 active:scale-95 transition-all flex items-center gap-1 uppercase tracking-wider"
        >
          <span className="material-symbols-outlined text-[15px]">add</span>
          <span>Add Account</span>
        </button>

        {/* Small Avatar Mobile */}
        <div className="w-7 h-7 rounded-full border border-white/20 bg-gradient-to-tr from-indigo-500 to-purple-500 overflow-hidden md:hidden ml-1 shrink-0">
          <img src={user.avatarUrl} alt={user.firstName} className="w-full h-full object-cover" />
        </div>
      </div>
    </header>
  );
};
