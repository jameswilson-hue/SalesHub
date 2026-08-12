import React, { useState } from 'react';
import { UserProfile } from '../types';

interface SettingsViewProps {
  user: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  onUpdateProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'team' | 'billing'>('profile');
  const [formData, setFormData] = useState<UserProfile>(user);
  const [savedToast, setSavedToast] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(formData);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="font-['Plus_Jakarta_Sans'] font-bold text-3xl text-white tracking-tight">
          Workspace Settings
        </h1>
        <p className="font-['Inter'] text-sm text-slate-400 mt-1">
          Configure profile options, account preferences, team permissions, and billing plan.
        </p>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex border-b border-white/10 gap-2 font-['Inter'] text-xs font-semibold">
        {[
          { id: 'profile', label: 'Profile Information', icon: 'person' },
          { id: 'preferences', label: 'Global Preferences', icon: 'tune' },
          { id: 'team', label: 'Team Members', icon: 'group' },
          { id: 'billing', label: 'Billing & Plan', icon: 'credit_card' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-indigo-400 text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl relative">
        {savedToast && (
          <div className="absolute top-4 right-4 bg-green-400 text-slate-950 font-['Inter'] text-xs font-bold px-4 py-2 rounded-xl shadow-lg flex items-center gap-1.5 animate-bounce">
            <span className="material-symbols-outlined text-base">check_circle</span>
            Settings Saved Successfully!
          </div>
        )}

        {activeTab === 'profile' && (
          <form onSubmit={handleSubmit} className="space-y-6 font-['Inter']">
            {/* Avatar Upload */}
            <div className="flex items-center gap-6 pb-6 border-b border-white/10">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-indigo-500 shadow-lg shadow-indigo-500/30 shrink-0">
                <img
                  src={formData.avatarUrl}
                  alt={formData.firstName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-white uppercase tracking-wider">Profile Avatar</p>
                <input
                  type="text"
                  value={formData.avatarUrl}
                  onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                  placeholder="Avatar image URL..."
                  className="w-full sm:w-80 bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">First Name</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Last Name</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Account Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Timezone</label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="(GMT-05:00) Eastern Time" className="bg-slate-900 text-white">(GMT-05:00) Eastern Time (US & Canada)</option>
                <option value="(GMT-08:00) Pacific Time" className="bg-slate-900 text-white">(GMT-08:00) Pacific Time (US & Canada)</option>
                <option value="(GMT+00:00) London Time" className="bg-slate-900 text-white">(GMT+00:00) London / UTC</option>
              </select>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-500/20"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}

        {activeTab === 'preferences' && (
          <div className="space-y-6 font-['Inter']">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div>
                <p className="text-sm font-bold text-white">Enforce Dark Glassmorphic UI</p>
                <p className="text-xs text-[#8c909f]">Optimized dark environment for all team users.</p>
              </div>
              <input
                type="checkbox"
                checked={formData.darkModeEnforced}
                onChange={(e) => setFormData({ ...formData, darkModeEnforced: e.target.checked })}
                className="w-5 h-5 accent-[#3b82f6]"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div>
                <p className="text-sm font-bold text-white">Compact Table Density</p>
                <p className="text-xs text-[#8c909f]">Reduce row padding in Lead Finder & Unibox views.</p>
              </div>
              <input
                type="checkbox"
                checked={formData.compactTableDensity}
                onChange={(e) => setFormData({ ...formData, compactTableDensity: e.target.checked })}
                className="w-5 h-5 accent-[#3b82f6]"
              />
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="space-y-4 font-['Inter']">
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <h3 className="font-bold text-white text-sm">Team Seats (3/5 Active)</h3>
              <button
                onClick={() => alert('Invite member modal opened')}
                className="bg-[#3b82f6] text-white text-xs font-bold px-3 py-1.5 rounded-lg"
              >
                Invite Member
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                <div>
                  <p className="text-xs font-bold text-white">{formData.firstName} {formData.lastName} (You)</p>
                  <p className="text-[10px] text-[#8c909f]">{formData.email}</p>
                </div>
                <span className="text-[10px] font-mono text-[#3b82f6] bg-[#3b82f6]/10 px-2 py-0.5 rounded font-bold">
                  Owner
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="space-y-6 font-['Inter']">
            <div className="p-6 rounded-2xl bg-gradient-to-r from-[#3b82f6]/20 to-[#4cd7f6]/20 border border-[#3b82f6]/30 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#4cd7f6] uppercase tracking-widest bg-[#4cd7f6]/10 px-2 py-0.5 rounded">
                  Active Plan
                </span>
                <h3 className="font-['Plus_Jakarta_Sans'] font-extrabold text-2xl text-white mt-1">
                  SalesHub Growth Plan
                </h3>
                <p className="text-xs text-[#c2c6d6] mt-1">
                  5,000 Verified Prospects/mo • Unlimited Warmup • 5 Team Seats
                </p>
              </div>

              <div className="text-right">
                <span className="font-mono font-extrabold text-2xl text-white">$149</span>
                <span className="text-xs text-[#8c909f]">/month</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
