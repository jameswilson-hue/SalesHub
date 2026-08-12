import React, { useState, useEffect, useRef } from 'react';
import { Campaign, ConnectedMailbox, Lead, AgentJob } from '../types';

interface AgentViewProps {
  campaigns: Campaign[];
  connectedMailboxes: ConnectedMailbox[];
  leads: Lead[];
  unreadRepliesCount: number;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  executedTools?: string[];
  executedActionSummary?: string;
  graphStep?: string;
}

export const AgentView: React.FC<AgentViewProps> = ({
  campaigns,
  connectedMailboxes,
  leads,
  unreadRepliesCount,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'agent',
      text: `Hello! I am your **LangGraph AI Sales Copilot Agent**.\n\nI operate as an autonomous sales supervisor with full real-time knowledge of your workspace:\n- **${connectedMailboxes.length} Connected Professional Mailboxes**\n- **${campaigns.length} Active Campaigns**\n- **${leads.length} Verified Leads**\n- **${unreadRepliesCount} Unibox Replies Pending**\n\nYou can chat with me to discuss strategy, or give me direct instructions like:\n1. ⚡ *"Send email to sara@techcorp.com saying..."*\n2. 📅 *"Schedule an automated email dispatch job every 30 minutes"*\n3. 🔍 *"Audit domain deliverability & warmup health"*\n\nHow would you like to direct your outreach today?`,
      timestamp: 'Just now',
      graphStep: 'Node 3: Response Synthesizer Node',
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [activeJobs, setActiveJobs] = useState<AgentJob[]>([]);
  const [showJobsPanel, setShowJobsPanel] = useState(false);
  const [currentGraphStep, setCurrentGraphStep] = useState('Node 1: Knowledge & Context Collector');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/agent/jobs');
      const data = await res.json();
      if (data.jobs) {
        setActiveJobs(data.jobs);
      }
    } catch (err) {
      console.error('Error fetching agent jobs:', err);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputMessage;
    if (!textToSend.trim() || isThinking) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputMessage('');
    setIsThinking(true);
    setCurrentGraphStep('Node 2: Intent Evaluator & Tool Decision');

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: textToSend,
          messages: messages.slice(-5),
          context: {
            connectedMailboxesCount: connectedMailboxes.length,
            campaignsCount: campaigns.length,
            leadsCount: leads.length,
            unreadReplies: unreadRepliesCount,
          },
        }),
      });

      const data = await response.json();

      const agentMsg: ChatMessage = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: data.reply || 'I have evaluated your request and updated the outreach engine state.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        executedTools: data.executedTools || [],
        executedActionSummary: data.executedActionSummary,
        graphStep: data.graphState?.currentStep || 'Node 3: Response Synthesizer Node',
      };

      setMessages((prev) => [...prev, agentMsg]);
      setCurrentGraphStep(data.graphState?.currentStep || 'Idle / Waiting for Input');
      fetchJobs();
    } catch (err) {
      console.error('Agent execution error:', err);
      const errorMsg: ChatMessage = {
        id: `agent-err-${Date.now()}`,
        sender: 'agent',
        text: 'I encountered an issue executing that command on the server. Please verify your connection.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleCreateManualJob = async (type: 'email_dispatch' | 'health_check' | 'campaign_drip', description: string) => {
    try {
      await fetch('/api/agent/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          description,
          intervalMinutes: 15,
        }),
      });
      fetchJobs();
    } catch (err) {
      console.error('Error creating job:', err);
    }
  };

  const handleDeleteJob = async (id: string) => {
    try {
      await fetch(`/api/agent/jobs/${id}`, { method: 'DELETE' });
      fetchJobs();
    } catch (err) {
      console.error('Error deleting job:', err);
    }
  };

  return (
    <div className="space-y-6 font-['Inter'] pb-12">
      {/* Top Banner & Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0">
            <span className="material-symbols-outlined text-2xl">smart_toy</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-['Plus_Jakarta_Sans'] font-bold text-xl text-white tracking-tight">
                LangGraph Sales Copilot Agent
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold border border-indigo-500/30 uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping"></span>
                State Graph Engine Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
              Discuss strategy, craft cold outreach sequences, and schedule automated background jobs that send emails automatically according to your guidelines.
            </p>
          </div>
        </div>

        {/* Action Toggle & Active Jobs Indicator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowJobsPanel(!showJobsPanel)}
            className="px-3.5 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center gap-2 transition-all"
          >
            <span className="material-symbols-outlined text-base">schedule</span>
            <span>Automated Jobs ({activeJobs.filter((j) => j.status === 'Active').length})</span>
          </button>
        </div>
      </div>

      {/* Main Container: Chat + Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left 2 Cols: Interactive Chat UI */}
        <div className="lg:col-span-2 bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col h-[680px] shadow-2xl relative overflow-hidden">
          
          {/* Chat Header Bar */}
          <div className="px-5 py-3.5 border-b border-white/10 bg-slate-900/50 flex justify-between items-center text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              <span className="font-semibold text-white">LangGraph Agent Session</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400 font-mono text-[11px]">{currentGraphStep}</span>
            </div>
            <button
              onClick={() => setMessages([messages[0]])}
              className="text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1 text-[11px]"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              <span>Reset Chat</span>
            </button>
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'agent' && (
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-lg">smart_toy</span>
                  </div>
                )}

                <div
                  className={`max-w-[82%] rounded-2xl p-4 text-xs leading-relaxed space-y-2 ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-600/20 font-medium'
                      : 'bg-slate-900/90 border border-white/10 text-slate-200 rounded-tl-none shadow-lg'
                  }`}
                >
                  {/* Tool Execution Badge */}
                  {msg.executedActionSummary && (
                    <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 font-mono text-[11px] space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-indigo-300">
                        <span className="material-symbols-outlined text-sm">bolt</span>
                        <span>Tool Execution Triggered</span>
                      </div>
                      <div className="text-slate-300">{msg.executedActionSummary}</div>
                    </div>
                  )}

                  {/* Message Content */}
                  <div className="whitespace-pre-wrap font-['Inter'] space-y-2">
                    {msg.text.split('\n\n').map((paragraph, idx) => (
                      <p key={idx}>{paragraph}</p>
                    ))}
                  </div>

                  {/* Metadata Timestamp */}
                  <div className={`text-[10px] ${msg.sender === 'user' ? 'text-indigo-200 text-right' : 'text-slate-500'}`}>
                    {msg.timestamp}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-white/10 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-lg">person</span>
                  </div>
                )}
              </div>
            ))}

            {isThinking && (
              <div className="flex gap-3 justify-start animate-fadeIn">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-lg animate-spin">sync</span>
                </div>
                <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 text-xs text-slate-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]"></span>
                  <span className="font-mono text-[11px] text-slate-400 ml-1">LangGraph State Machine Evaluating Node State...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Shortcuts */}
          <div className="px-4 py-2 border-t border-white/5 bg-slate-900/40 flex gap-2 overflow-x-auto text-[11px]">
            <button
              onClick={() => handleSendMessage('Send email to prospect@acmecorp.com regarding product demo')}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 whitespace-nowrap flex items-center gap-1 shrink-0 transition-colors"
            >
              <span className="material-symbols-outlined text-sm text-indigo-400">send</span>
              <span>Send Email Now</span>
            </button>
            <button
              onClick={() => handleSendMessage('Schedule automated outreach job every 30 mins to verified leads')}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 whitespace-nowrap flex items-center gap-1 shrink-0 transition-colors"
            >
              <span className="material-symbols-outlined text-sm text-indigo-400">schedule</span>
              <span>Schedule Auto Job</span>
            </button>
            <button
              onClick={() => handleSendMessage('Audit my deliverability health and give me cold email copywriting tips')}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 whitespace-nowrap flex items-center gap-1 shrink-0 transition-colors"
            >
              <span className="material-symbols-outlined text-sm text-indigo-400">analytics</span>
              <span>Outreach Strategy Audit</span>
            </button>
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 border-t border-white/10 bg-slate-950 flex gap-2 items-center"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask for strategy, or tell agent e.g. 'Send email to sara@domain.com'..."
              className="flex-1 bg-slate-900/90 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isThinking}
              className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <span>Send</span>
              <span className="material-symbols-outlined text-sm">send</span>
            </button>
          </form>
        </div>

        {/* Right Col: Knowledge Graph Context & Scheduled Automated Jobs */}
        <div className="space-y-5">
          
          {/* Active Knowledge Base Card */}
          <div className="bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-sm text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-400 text-lg">database</span>
                Workspace Context Knowledge
              </h3>
              <span className="text-[10px] font-mono text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-full">
                Synced
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Mailboxes</div>
                <div className="text-lg font-bold text-white font-mono">{connectedMailboxes.length} Active</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Campaigns</div>
                <div className="text-lg font-bold text-indigo-400 font-mono">{campaigns.length} Sequences</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Prospects</div>
                <div className="text-lg font-bold text-green-400 font-mono">{leads.length} Verified</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Unibox Inbox</div>
                <div className="text-lg font-bold text-purple-400 font-mono">{unreadRepliesCount} Unread</div>
              </div>
            </div>
          </div>

          {/* LangGraph Node Visualizer */}
          <div className="bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-3 shadow-xl">
            <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-sm text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-400 text-lg">account_tree</span>
              LangGraph Agent Architecture
            </h3>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 flex items-center justify-between">
                <span>Node 1: Context Knowledge</span>
                <span className="material-symbols-outlined text-sm">check_circle</span>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 flex items-center justify-between">
                <span>Node 2: Intent & Tool Executor</span>
                <span className="material-symbols-outlined text-sm">bolt</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-300 flex items-center justify-between">
                <span>Node 3: Strategy & Response</span>
                <span className="material-symbols-outlined text-sm text-slate-500">auto_awesome</span>
              </div>
            </div>
          </div>

          {/* Active Automated Jobs Monitor */}
          <div className="bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-3 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-sm text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-400 text-lg">pending_actions</span>
                Automated Background Jobs
              </h3>
              <button
                onClick={() => handleCreateManualJob('email_dispatch', 'Automated Campaign Follow-up Dispatch')}
                className="text-[10px] bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-2 py-1 rounded-lg transition-all"
              >
                + Add Job
              </button>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {activeJobs.map((job) => (
                <div key={job.id} className="p-3 rounded-xl bg-slate-900/80 border border-white/5 space-y-1.5 text-xs">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-white truncate max-w-[170px]">{job.description}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-green-500/20 text-green-300 border border-green-500/30">
                      {job.status}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                    <span>Dispatched: {job.dispatchedCount} times</span>
                    <span>Interval: {job.intervalMinutes ? `${job.intervalMinutes}m` : 'Once'}</span>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleDeleteJob(job.id)}
                      className="text-[10px] text-rose-400 hover:text-rose-300 transition-colors"
                    >
                      Cancel Job
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
