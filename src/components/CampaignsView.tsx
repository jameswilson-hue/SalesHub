import React, { useState } from 'react';
import { Campaign, CampaignStep, ConnectedMailbox } from '../types';

interface CampaignsViewProps {
  campaigns: Campaign[];
  connectedMailboxes?: ConnectedMailbox[];
  onUpdateCampaigns: (campaigns: Campaign[]) => void;
}

export const CampaignsView: React.FC<CampaignsViewProps> = ({
  campaigns,
  connectedMailboxes = [],
  onUpdateCampaigns,
}) => {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(campaigns[0]?.id || '');
  const [showCreateModal, setShowCampaignModal] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Test Email Modal state
  const [showTestEmailModal, setShowTestEmailModal] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState('james.wilson@tryleadsoll.com');
  const [selectedTestStep, setSelectedTestStep] = useState<CampaignStep | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState<string | null>(null);

  // Live Batch Dispatch State
  const [isDispatchingBatch, setIsDispatchingBatch] = useState(false);
  const [dispatchStatusText, setDispatchStatusText] = useState<string | null>(null);

  // Form states for new campaign
  const [newCampaignName, setNewCampaignName] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [valueProp, setValueProp] = useState('');

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId) || campaigns[0];

  const handleOpenTestModal = (step: CampaignStep) => {
    setSelectedTestStep(step);
    setTestEmailStatus(null);
    setShowTestEmailModal(true);
  };

  const handleDispatchTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTestStep || !testEmailRecipient.trim()) return;

    setIsSendingTest(true);
    setTestEmailStatus(null);

    try {
      const res = await fetch('/api/mailboxes/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mailboxId: connectedMailboxes[0]?.id || '',
          recipientEmail: testEmailRecipient.trim(),
          subject: `[TEST] ${selectedTestStep.title}`,
          bodyText: selectedTestStep.body,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestEmailStatus(`Test email dispatched successfully! ${data.message || ''}`);
      } else {
        setTestEmailStatus(`Error sending test email: ${data.error || 'Failed'}`);
      }
    } catch (err: any) {
      setTestEmailStatus(`Failed to connect to SMTP server: ${err.message}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleLaunchBatchDispatch = async (campaign: Campaign) => {
    setIsDispatchingBatch(true);
    setDispatchStatusText('Initiating campaign dispatch...');

    try {
      const emailSteps = campaign.steps.filter((s) => s.type === 'email');
      const firstStep = emailSteps[0];

      const sampleLeads = [
        { name: 'James Wilson', email: testEmailRecipient, company: 'TryLeadSoll' },
      ];

      const res = await fetch('/api/campaigns/dispatch-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          mailboxId: connectedMailboxes[0]?.id || '',
          leads: sampleLeads,
          step: firstStep,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setDispatchStatusText(
          data.mode === 'live'
            ? `Dispatch complete! Sent ${data.dispatchedCount} real emails via SMTP.`
            : data.message
        );
      } else {
        setDispatchStatusText(`Dispatch error: ${data.error}`);
      }
    } catch (err: any) {
      setDispatchStatusText(`Dispatch failed: ${err.message}`);
    } finally {
      setIsDispatchingBatch(false);
      setTimeout(() => setDispatchStatusText(null), 6000);
    }
  };

  const handleToggleStatus = (id: string) => {
    const updated = campaigns.map((c) => {
      if (c.id === id) {
        const nextStatus = c.status === 'Active' ? 'Paused' : 'Active';
        return { ...c, status: nextStatus as 'Active' | 'Paused' | 'Draft' };
      }
      return c;
    });
    onUpdateCampaigns(updated);
  };

  const handleAddStep = (campaignId: string) => {
    const updated = campaigns.map((c) => {
      if (c.id === campaignId) {
        const emailSteps = c.steps.filter((s) => s.type === 'email');
        const nextStepNum = emailSteps.length + 1;
        const newStep: CampaignStep = {
          id: `step-${Date.now()}`,
          stepNumber: nextStepNum,
          dayDelay: nextStepNum * 3,
          title: `Follow-up #${nextStepNum}`,
          body: `Hi {{first_name}}, following up on my previous note. Wanted to verify if {{company}} is evaluating solution options this quarter?`,
          type: 'email',
          openRate: '0% Open',
          replyRate: '0% Reply',
        };
        const newWait: CampaignStep = {
          id: `wait-${Date.now()}`,
          stepNumber: nextStepNum - 0.5,
          dayDelay: 3,
          title: 'Wait 3 days',
          body: 'Wait 3 days before triggering follow-up.',
          type: 'wait',
        };
        return { ...c, steps: [...c.steps, newWait, newStep] };
      }
      return c;
    });
    onUpdateCampaigns(updated);
  };

  const handleCreateCampaignWithAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim()) return;

    setIsGeneratingAi(true);
    try {
      const res = await fetch('/api/ai/generate-sequence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName: newCampaignName,
          targetAudience: targetAudience || 'SaaS Executives',
          valueProp: valueProp || 'Automated outbound pipeline growth',
          stepCount: 3,
        }),
      });

      const data = await res.json();
      const rawSeq = data.sequence || [];

      const generatedSteps: CampaignStep[] = [];
      rawSeq.forEach((item: any, idx: number) => {
        if (idx > 0) {
          generatedSteps.push({
            id: `wait-ai-${idx}`,
            stepNumber: idx + 0.5,
            dayDelay: item.delayDays || 3,
            title: `Wait ${item.delayDays || 3} days`,
            body: 'Wait before dispatching next follow-up step.',
            type: 'wait',
          });
        }
        generatedSteps.push({
          id: `step-ai-${idx}`,
          stepNumber: idx + 1,
          dayDelay: item.delayDays || 1,
          title: item.subject || `Step ${idx + 1}`,
          body: item.body || 'Hi {{first_name}}, following up regarding {{company}}...',
          type: 'email',
          openRate: '0% Open',
          replyRate: '0% Reply',
        });
      });

      const newCampaignObj: Campaign = {
        id: `camp-${Date.now()}`,
        name: newCampaignName,
        status: 'Active',
        lastActive: 'Just now',
        openRate: '0%',
        replyRate: '0%',
        totalLeads: 0,
        steps: generatedSteps,
      };

      onUpdateCampaigns([newCampaignObj, ...campaigns]);
      setSelectedCampaignId(newCampaignObj.id);
      setShowCampaignModal(false);
      setNewCampaignName('');
      setTargetAudience('');
      setValueProp('');
    } catch (err) {
      console.error('Failed to generate AI sequence:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn font-['Inter']">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="font-['Plus_Jakarta_Sans'] font-bold text-2xl text-white tracking-tight">Campaigns</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage and track your active outreach sequences & automated follow-ups.
          </p>
        </div>

        <button
          onClick={() => setShowCampaignModal(true)}
          className="bg-indigo-500 hover:bg-indigo-600 text-white text-[11px] font-bold uppercase tracking-wider px-4 py-2 rounded-lg shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Create New Campaign
        </button>
      </div>

      {/* Main Campaign Grid Split View */}
      <div className="grid grid-cols-12 gap-5 min-h-[540px]">
        {/* Left Column: Sequences List */}
        <div className="col-span-12 lg:col-span-5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl flex flex-col overflow-hidden shadow-xl relative">
          <div className="p-3.5 border-b border-white/10 flex justify-between items-center bg-slate-950/50 backdrop-blur-sm z-10 shrink-0">
            <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-base text-white">Active Sequences</h3>
            <span className="text-[11px] font-mono text-slate-400">{campaigns.length} Campaigns</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 z-10">
            {campaigns.map((camp) => {
              const isSelected = camp.id === selectedCampaignId;
              return (
                <div
                  key={camp.id}
                  onClick={() => setSelectedCampaignId(camp.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all relative overflow-hidden group ${
                    isSelected
                      ? 'bg-indigo-500/15 border-indigo-500/40 shadow-sm'
                      : 'bg-slate-900/40 border-white/5 hover:border-white/15 hover:bg-slate-900/60'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
                  )}

                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4
                        className={`font-semibold text-xs transition-colors ${
                          isSelected ? 'text-indigo-300' : 'text-white group-hover:text-indigo-300'
                        }`}
                      >
                        {camp.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Last active {camp.lastActive}
                      </p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold flex items-center gap-1 border ${
                        camp.status === 'Active'
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : camp.status === 'Paused'
                          ? 'bg-white/10 text-slate-300 border-white/10'
                          : 'bg-white/5 text-slate-400 border-white/5'
                      }`}
                    >
                      {camp.status === 'Active' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_4px_rgba(34,197,94,0.8)]" />
                      )}
                      {camp.status}
                    </span>
                  </div>

                  <div className="flex gap-5">
                    <div>
                      <span className="text-[9px] font-semibold text-slate-400 block uppercase tracking-wider mb-0.5">
                        OPEN RATE
                      </span>
                      <span className="font-mono text-xs font-semibold text-white">
                        {camp.openRate}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] font-semibold text-slate-400 block uppercase tracking-wider mb-0.5">
                        REPLY RATE
                      </span>
                      <span className="font-mono text-xs font-bold text-indigo-400">
                        {camp.replyRate}
                      </span>
                    </div>

                    <div className="ml-auto text-right">
                      <span className="text-[9px] font-semibold text-slate-400 block uppercase tracking-wider mb-0.5">
                        STEPS
                      </span>
                      <span className="font-mono text-xs text-white">
                        {camp.steps.filter((s) => s.type === 'email').length}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Sequence Builder Canvas */}
        <div className="col-span-12 lg:col-span-7 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 flex flex-col relative overflow-hidden shadow-xl">
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-indigo-600/15 rounded-full blur-[100px] pointer-events-none"></div>

          {selectedCampaign && (
            <>
              {/* Campaign Editor Header */}
              <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3 z-10 shrink-0">
                <div>
                  <h2 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-white">
                    {selectedCampaign.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-semibold text-indigo-400">
                      Sequence Builder
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-xs text-slate-400">
                      {selectedCampaign.steps.filter((s) => s.type === 'email').length} Email Steps
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleLaunchBatchDispatch(selectedCampaign)}
                    disabled={isDispatchingBatch}
                    className="p-1.5 px-3 rounded-lg bg-indigo-500 hover:bg-indigo-600 transition-colors text-white flex items-center justify-center gap-1.5 text-xs font-bold shadow-md shadow-indigo-500/20 disabled:opacity-50"
                  >
                    <span className={`material-symbols-outlined text-[16px] ${isDispatchingBatch ? 'animate-spin' : ''}`}>
                      {isDispatchingBatch ? 'sync' : 'send'}
                    </span>
                    <span>{isDispatchingBatch ? 'Dispatching...' : 'Launch Batch Send'}</span>
                  </button>

                  <button
                    onClick={() => handleToggleStatus(selectedCampaign.id)}
                    className="p-1.5 px-3 rounded-lg bg-slate-900/60 border border-white/10 hover:bg-white/10 transition-colors text-white flex items-center justify-center gap-1 text-xs font-semibold"
                    title={selectedCampaign.status === 'Active' ? 'Pause Campaign' : 'Resume Campaign'}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {selectedCampaign.status === 'Active' ? 'pause' : 'play_arrow'}
                    </span>
                    <span>{selectedCampaign.status === 'Active' ? 'Pause' : 'Activate'}</span>
                  </button>
                </div>
              </div>

              {dispatchStatusText && (
                <div className="mb-3 p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-xs text-indigo-300 font-mono flex items-center gap-2 animate-fadeIn z-10">
                  <span className="material-symbols-outlined text-sm text-indigo-400">info</span>
                  <span>{dispatchStatusText}</span>
                </div>
              )}

              {/* Steps Timeline */}
              <div className="flex-1 overflow-y-auto z-10 pr-1 space-y-3 pt-1">
                <div className="relative max-w-xl mx-auto flex flex-col gap-3 pb-6">
                  <div className="absolute left-4 top-6 bottom-10 w-0.5 bg-gradient-to-b from-indigo-500 via-white/20 to-transparent"></div>

                  {selectedCampaign.steps.map((step) => {
                    if (step.type === 'wait') {
                      return (
                        <div key={step.id} className="flex gap-4 relative ml-8 my-0.5">
                          <div className="w-5 h-5 rounded-full bg-slate-900 border border-white/20 flex items-center justify-center shrink-0 z-10 absolute -left-2.5 mt-1.5">
                            <span className="material-symbols-outlined text-[11px] text-slate-400">
                              schedule
                            </span>
                          </div>
                          <div className="flex-1 py-1.5 px-3 rounded-lg bg-slate-900/40 border border-dashed border-white/10 flex items-center justify-between">
                            <span className="text-xs text-slate-400 italic">
                              Wait {step.dayDelay} days. If no reply...
                            </span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={step.id} className="flex gap-3 relative group">
                        <div className="w-8 h-8 rounded-full bg-slate-900 border border-indigo-400 flex items-center justify-center shrink-0 z-10 shadow-[0_0_10px_rgba(129,140,248,0.4)]">
                          <span className="material-symbols-outlined text-indigo-400 text-[16px]">mail</span>
                        </div>

                        <div className="flex-1 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl p-3.5 group-hover:border-indigo-400/40 transition-colors shadow-md">
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] font-bold text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 px-1.5 py-0.5 rounded">
                                STEP {step.stepNumber}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                Day {step.dayDelay}
                              </span>
                            </div>

                            <button
                              onClick={() => handleOpenTestModal(step)}
                              className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-0.5 rounded flex items-center gap-1 transition-colors"
                              title="Send real test email to verify delivery"
                            >
                              <span className="material-symbols-outlined text-[12px]">send</span>
                              Send Test Email
                            </button>
                          </div>

                          <h4 className="font-semibold text-xs text-white mb-1">
                            {step.title}
                          </h4>
                          <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                            {step.body}
                          </p>

                          {step.openRate && (
                            <div className="mt-3 flex gap-4 pt-2 border-t border-white/5">
                              <div className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px] text-green-400">
                                  drafts
                                </span>
                                <span className="font-mono text-[11px] text-slate-300">
                                  {step.openRate}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px] text-indigo-400">
                                  reply
                                </span>
                                <span className="font-mono text-[11px] text-slate-300">
                                  {step.replyRate}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Add Next Step Trigger */}
                  <div className="flex gap-4 relative ml-8 mt-2">
                    <button
                      onClick={() => handleAddStep(selectedCampaign.id)}
                      className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-slate-900/40 border border-dashed border-white/20 hover:bg-slate-900/70 hover:border-indigo-500/50 text-slate-300 hover:text-indigo-400 text-xs font-semibold transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_circle</span>
                      Add Next Step
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Campaign AI Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0B] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#4d8eff]">auto_awesome</span>
                <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-xl text-white">
                  Create AI Campaign
                </h3>
              </div>
              <button
                onClick={() => setShowCampaignModal(false)}
                className="text-[#8c909f] hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateCampaignWithAi} className="space-y-4">
              <div>
                <label className="block font-['Inter'] text-xs font-semibold text-[#c2c6d6] mb-1">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  placeholder="e.g. Q4 Fintech Founders Outreach"
                  className="w-full bg-[#131314] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#4d8eff] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-['Inter'] text-xs font-semibold text-[#c2c6d6] mb-1">
                  Target ICP / Audience
                </label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g. VPs of Sales at Series B B2B SaaS companies"
                  className="w-full bg-[#131314] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#4d8eff] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-['Inter'] text-xs font-semibold text-[#c2c6d6] mb-1">
                  Value Proposition
                </label>
                <textarea
                  rows={3}
                  value={valueProp}
                  onChange={(e) => setValueProp(e.target.value)}
                  placeholder="e.g. Automate personalized cold emails with 98% deliverability and AI hooks"
                  className="w-full bg-[#131314] border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#4d8eff] focus:outline-none resize-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCampaignModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-['Inter'] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingAi}
                  className="px-6 py-2.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white font-['Inter'] text-xs font-bold shadow-[0_0_15px_rgba(59,130,246,0.4)] flex items-center gap-2"
                >
                  {isGeneratingAi ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                      Generating Sequence...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">auto_awesome</span>
                      Generate Sequence
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Test Email Dispatch Modal */}
      {showTestEmailModal && selectedTestStep && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0B] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-400">mark_email_read</span>
                <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-white">
                  Send Test Email
                </h3>
              </div>
              <button
                onClick={() => setShowTestEmailModal(false)}
                className="text-[#8c909f] hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-xl border border-white/10 space-y-1">
              <span className="text-[10px] font-mono font-bold text-indigo-300 uppercase tracking-wider block">Step Preview</span>
              <p className="text-xs font-bold text-white">{selectedTestStep.title}</p>
              <p className="text-[11px] text-slate-300 line-clamp-2 italic">{selectedTestStep.body}</p>
            </div>

            <form onSubmit={handleDispatchTestEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#c2c6d6] mb-1">
                  Recipient Test Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  placeholder="e.g. james.wilson@tryleadsoll.com"
                  className="w-full bg-[#131314] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:border-indigo-400 focus:outline-none"
                />
              </div>

              {testEmailStatus && (
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-xs text-indigo-300 font-mono flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-indigo-400">info</span>
                  <span>{testEmailStatus}</span>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowTestEmailModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSendingTest}
                  className="px-5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSendingTest ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                      Sending Test...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">send</span>
                      Dispatch Test Email
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
