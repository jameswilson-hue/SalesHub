import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { CompanyCRM, CompanyPerson, CompanyNote, Campaign, ConnectedMailbox, PersonOutreachStep } from '../types';

// Helper function to calculate sentiment across company threads
export function getEffectiveSentiment(company: CompanyCRM): 'Positive' | 'Neutral' | 'Negative' {
  if (company.sentiment) return company.sentiment;
  const hasChampionOrReplied = company.people?.some(
    (p) => p.status === 'Replied' || p.status === 'Meeting Booked' || p.buyingRole === 'Champion'
  );
  const isWonOrOpp = company.buyingStage === 'Closed Won' || company.buyingStage === 'Opportunity';
  const hasOptOutOrBlocker = company.people?.some(
    (p) => p.status === 'Opted Out' || p.buyingRole === 'Blocker'
  );
  const notesText = (company.notes || []).map((n) => n.content.toLowerCase()).join(' ');
  const hasPosNotes = notesText.includes('interested') || notesText.includes('demo') || notesText.includes('positive') || notesText.includes('booked') || notesText.includes('great');
  const hasNegNotes = notesText.includes('unsubscribe') || notesText.includes('not interested') || notesText.includes('pass') || notesText.includes('budget constraint');

  if (hasNegNotes || (hasOptOutOrBlocker && !hasChampionOrReplied) || company.status === 'Cold') {
    return 'Negative';
  }
  if (isWonOrOpp || hasChampionOrReplied || hasPosNotes || (company.intentScore && company.intentScore >= 80)) {
    return 'Positive';
  }
  return 'Neutral';
}

const CustomSentimentTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 border border-white/10 p-3 rounded-xl shadow-2xl text-xs font-['Inter'] backdrop-blur-md max-w-xs space-y-1.5">
        <div className="font-bold text-white flex items-center justify-between border-b border-white/10 pb-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.fill || '#10b981' }}></span>
            <span>{data.name || label} Sentiment</span>
          </span>
          <span className="font-mono text-emerald-400 font-extrabold">{data.threads || data.value} Threads ({data.pct}%)</span>
        </div>
        {data.companies && data.companies.length > 0 && (
          <div className="text-[11px] text-slate-300">
            <span className="text-slate-500 font-mono text-[10px] uppercase block mb-1">Target Accounts:</span>
            <div className="flex flex-wrap gap-1">
              {data.companies.map((cName: string, i: number) => (
                <span key={i} className="bg-slate-800 text-slate-200 border border-white/5 px-2 py-0.5 rounded text-[10px] font-mono">
                  {cName}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  return null;
};

const CustomStageTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-white/10 p-3 rounded-xl shadow-2xl text-xs font-['Inter'] backdrop-blur-md space-y-1">
        <div className="font-bold text-white border-b border-white/10 pb-1 font-mono">
          Stage: {label}
        </div>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between items-center gap-4 text-[11px]" style={{ color: entry.fill }}>
            <span className="font-medium">{entry.name}:</span>
            <span className="font-mono font-bold">{entry.value} Threads</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

interface CrmViewProps {
  companies: CompanyCRM[];
  campaigns: Campaign[];
  connectedMailboxes?: ConnectedMailbox[];
  onAddCompany: (company: CompanyCRM) => void;
  onUpdateCompany: (company: CompanyCRM) => void;
  onDeleteCompany?: (companyId: string) => void;
  onSendCrmEmail?: (
    companyId: string,
    personId: string,
    mailboxId: string,
    subject: string,
    body: string
  ) => void;
}

export const CrmView: React.FC<CrmViewProps> = ({
  companies,
  campaigns,
  connectedMailboxes = [],
  onAddCompany,
  onUpdateCompany,
  onDeleteCompany,
  onSendCrmEmail,
}) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(companies[0]?.id || '');
  const [tierFilter, setTierFilter] = useState<string>('All');
  const [stageFilter, setStageFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [highIntentOnly, setHighIntentOnly] = useState<boolean>(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'committee' | 'intel' | 'sequence' | 'notes'>('committee');

  // Kanban View & Drag and Drop State
  const [crmViewMode, setCrmViewMode] = useState<'kanban' | 'split'>('kanban');
  const [draggedCompanyId, setDraggedCompanyId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [pipelineBanner, setPipelineBanner] = useState<string | null>(null);

  // Modals & Drawers
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [showAddPersonModal, setShowAddPersonModal] = useState(false);
  const [showEditIntelModal, setShowEditIntelModal] = useState(false);
  
  // Stakeholder Workspace Modal
  const [selectedPerson, setSelectedPerson] = useState<CompanyPerson | null>(null);
  const [personActiveTab, setPersonActiveTab] = useState<'timeline' | 'email' | 'followup' | 'linkedin' | 'sequence' | 'notes'>('timeline');
  const [isEditingContext, setIsEditingContext] = useState(false);

  // Timeline Feed State inside Stakeholder Modal
  const [timelineEventType, setTimelineEventType] = useState<'note' | 'email' | 'call' | 'linkedin' | 'meeting' | 'status'>('note');
  const [timelineTitleInput, setTimelineTitleInput] = useState<string>('');
  const [timelineBodyInput, setTimelineBodyInput] = useState<string>('');
  const [timelineFilterCategory, setTimelineFilterCategory] = useState<'all' | 'email' | 'call' | 'linkedin' | 'note' | 'status'>('all');
  const [timelineSearchQuery, setTimelineSearchQuery] = useState<string>('');

  // Direct Email State inside Stakeholder Modal
  const [emailMailboxId, setEmailMailboxId] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [emailBody, setEmailBody] = useState<string>('');
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [emailSentBanner, setEmailSentBanner] = useState<string | null>(null);

  // Follow-up State inside Stakeholder Modal
  const [followupTitle, setFollowupTitle] = useState<string>('');
  const [followupType, setFollowupType] = useState<'email' | 'linkedin' | 'call' | 'note' | 'followup'>('followup');
  const [followupNotes, setFollowupNotes] = useState<string>('');
  const [followupDate, setFollowupDate] = useState<string>('');

  // LinkedIn State inside Stakeholder Modal
  const [linkedinMsgType, setLinkedinMsgType] = useState<'connection' | 'inmail' | 'intro'>('connection');
  const [linkedinMsgText, setLinkedinMsgText] = useState<string>('');
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  // Custom step input state for employee
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepType, setNewStepType] = useState<'email' | 'linkedin' | 'call' | 'note' | 'followup'>('email');
  const [newStepNotes, setNewStepNotes] = useState('');
  const [personNoteInput, setPersonNoteInput] = useState('');

  // New Company Form State
  const [compName, setCompName] = useState('');
  const [compWebUrl, setCompWebUrl] = useState('');
  const [compLinkedinUrl, setCompLinkedinUrl] = useState('');
  const [compEmployeeSize, setCompEmployeeSize] = useState('51-200 employees');
  const [compIndustry, setCompIndustry] = useState('');
  const [compLocation, setCompLocation] = useState('San Francisco, CA');
  const [compContext, setCompContext] = useState('');
  const [compTier, setCompTier] = useState<'Tier 1' | 'Tier 2' | 'Tier 3'>('Tier 1');
  const [compIntentScore, setCompIntentScore] = useState<number>(85);
  const [compIntentSignal, setCompIntentSignal] = useState('');
  const [compIcpMatch, setCompIcpMatch] = useState<number>(95);
  const [compTechStack, setCompTechStack] = useState('Salesforce, Outreach, Google Workspace');
  const [compBuyingStage, setCompBuyingStage] = useState<'Prospecting' | 'Engaging' | 'Qualified' | 'Opportunity' | 'Closed Won'>('Engaging');
  const [compPainPoints, setCompPainPoints] = useState('');
  const [compValueProp, setCompValueProp] = useState('');

  // Initial person when adding company
  const [initialPersonName, setInitialPersonName] = useState('');
  const [initialPersonRole, setInitialPersonRole] = useState('');
  const [initialPersonEmail, setInitialPersonEmail] = useState('');
  const [initialPersonBuyingRole, setInitialPersonBuyingRole] = useState<'Economic Buyer' | 'Champion' | 'Evaluator' | 'End User' | 'Blocker'>('Champion');

  // New Person Form State (for adding person to selected company)
  const [personName, setPersonName] = useState('');
  const [personRole, setPersonRole] = useState('');
  const [personEmail, setPersonEmail] = useState('');
  const [personLinkedin, setPersonLinkedin] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [personBuyingRole, setPersonBuyingRole] = useState<'Economic Buyer' | 'Champion' | 'Evaluator' | 'End User' | 'Blocker'>('Champion');

  // New Note Form State
  const [noteContent, setNoteContent] = useState('');
  const [noteTaggedPersonId, setNoteTaggedPersonId] = useState<string>('');

  // Context Edit State
  const [editedContextText, setEditedContextText] = useState('');

  // Edit Intel Modal Form State
  const [editTier, setEditTier] = useState<'Tier 1' | 'Tier 2' | 'Tier 3'>('Tier 1');
  const [editIntentScore, setEditIntentScore] = useState<number>(90);
  const [editIntentSignal, setEditIntentSignal] = useState('');
  const [editIcpMatch, setEditIcpMatch] = useState<number>(95);
  const [editTechStack, setEditTechStack] = useState('');
  const [editBuyingStage, setEditBuyingStage] = useState<'Prospecting' | 'Engaging' | 'Qualified' | 'Opportunity' | 'Closed Won'>('Engaging');
  const [editSentiment, setEditSentiment] = useState<'Positive' | 'Neutral' | 'Negative'>('Positive');
  const [editPainPoints, setEditPainPoints] = useState('');
  const [editValueProp, setEditValueProp] = useState('');

  // Sentiment Filter & Analytics State
  const [sentimentFilter, setSentimentFilter] = useState<'All' | 'Positive' | 'Neutral' | 'Negative'>('All');
  const [showAnalyticsPanel, setShowAnalyticsPanel] = useState<boolean>(true);
  const [chartViewMode, setChartViewMode] = useState<'sentiment' | 'stageBreakdown'>('sentiment');

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) || companies[0] || null;

  // Filter companies
  const filteredCompanies = companies.filter((c) => {
    const matchesTier = tierFilter === 'All' || c.tier === tierFilter;
    const matchesStage = stageFilter === 'All' || c.buyingStage === stageFilter || c.status === stageFilter;
    const matchesIntent = !highIntentOnly || (c.intentScore && c.intentScore >= 80);
    const matchesSentiment = sentimentFilter === 'All' || getEffectiveSentiment(c) === sentimentFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(query) ||
      c.industry.toLowerCase().includes(query) ||
      c.context.toLowerCase().includes(query) ||
      (c.intentSignal && c.intentSignal.toLowerCase().includes(query)) ||
      c.people?.some((p) => p.name.toLowerCase().includes(query) || p.email.toLowerCase().includes(query) || p.role.toLowerCase().includes(query));

    return matchesTier && matchesStage && matchesIntent && matchesSentiment && matchesSearch;
  });

  // Sentiment Distribution & Pipeline Health Metrics for Recharts Summary
  const sentimentCounts = { Positive: 0, Neutral: 0, Negative: 0 };
  const sentimentCompanies: Record<'Positive' | 'Neutral' | 'Negative', CompanyCRM[]> = {
    Positive: [],
    Neutral: [],
    Negative: [],
  };

  companies.forEach((comp) => {
    const s = getEffectiveSentiment(comp);
    sentimentCounts[s]++;
    sentimentCompanies[s].push(comp);
  });

  const totalCompanyThreadsCount = companies.length || 1;
  const positivePct = Math.round((sentimentCounts.Positive / totalCompanyThreadsCount) * 100);
  const neutralPct = Math.round((sentimentCounts.Neutral / totalCompanyThreadsCount) * 100);
  const negativePct = Math.round((sentimentCounts.Negative / totalCompanyThreadsCount) * 100);
  const pipelineHealthScore = Math.min(
    100,
    Math.round(((sentimentCounts.Positive * 100 + sentimentCounts.Neutral * 50) / (totalCompanyThreadsCount * 100)) * 100)
  );

  const sentimentBarData = [
    {
      name: 'Positive',
      threads: sentimentCounts.Positive,
      pct: positivePct,
      fill: '#10b981',
      companies: sentimentCompanies.Positive.map((c) => c.name),
    },
    {
      name: 'Neutral',
      threads: sentimentCounts.Neutral,
      pct: neutralPct,
      fill: '#f59e0b',
      companies: sentimentCompanies.Neutral.map((c) => c.name),
    },
    {
      name: 'Negative',
      threads: sentimentCounts.Negative,
      pct: negativePct,
      fill: '#f43f5e',
      companies: sentimentCompanies.Negative.map((c) => c.name),
    },
  ];

  const STAGES_LIST = ['Prospecting', 'Engaging', 'Qualified', 'Opportunity', 'Closed Won'] as const;
  const stageBreakdownData = STAGES_LIST.map((stage) => {
    const stageCompanies = companies.filter((c) => (c.buyingStage || 'Prospecting') === stage);
    let pos = 0;
    let neu = 0;
    let neg = 0;
    stageCompanies.forEach((c) => {
      const s = getEffectiveSentiment(c);
      if (s === 'Positive') pos++;
      else if (s === 'Neutral') neu++;
      else if (s === 'Negative') neg++;
    });
    return {
      stage,
      Positive: pos,
      Neutral: neu,
      Negative: neg,
      total: stageCompanies.length,
    };
  });

  // Open Stakeholder Modal
  const handleOpenStakeholderWorkspace = (
    person: CompanyPerson,
    initialTab: 'timeline' | 'email' | 'followup' | 'linkedin' | 'sequence' | 'notes' = 'timeline'
  ) => {
    setSelectedPerson(person);
    setPersonActiveTab(initialTab);
    setEmailSentBanner(null);

    // Populate default email draft
    const firstName = person.name.split(' ')[0];
    const companyName = selectedCompany?.name || 'your team';
    setEmailSubject(`Partnership & Outreach Optimization for ${companyName}`);
    setEmailBody(
      `Hi ${firstName},\n\n` +
      `I noticed ${companyName} is actively scaling outbound sales operations.\n\n` +
      `We help revenue leaders solve deliverability drops, rotate sender mailboxes seamlessly, and maintain 100% SPF/DKIM authentication.\n\n` +
      `Would you be open to a quick 10-minute sync this week to explore how this works?\n\n` +
      `Best regards,\nJames Wilson`
    );
    setEmailMailboxId(connectedMailboxes[0]?.id || '');

    // Populate default LinkedIn message
    setLinkedinMsgText(
      `Hi ${firstName} - noticed your leadership role as ${person.role} at ${companyName}. Would love to connect and share insights on cold deliverability & account outreach strategy!`
    );
  };

  // Generate AI Email Pitch
  const handleGenerateAiEmailPitch = () => {
    if (!selectedPerson || !selectedCompany) return;
    const firstName = selectedPerson.name.split(' ')[0];
    const industryStr = selectedCompany.industry ? `in ${selectedCompany.industry}` : '';
    const painStr = selectedCompany.painPoints ? ` addressing ${selectedCompany.painPoints.toLowerCase()}` : '';
    const techStr = selectedCompany.techStack?.length ? ` integrating with your ${selectedCompany.techStack.join(', ')} stack` : '';

    setEmailSubject(`Quick question regarding ${selectedCompany.name}'s outreach setup`);
    setEmailBody(
      `Hi ${firstName},\n\n` +
      `I hope you're having a productive week. I noticed ${selectedCompany.name}'s recent growth ${industryStr} and wanted to reach out directly to you as ${selectedPerson.role}.\n\n` +
      `Many leaders we partner with mention challenges around${painStr || ' cold email deliverability and manual domain warmup limits'}.\n\n` +
      `Our platform automates mailbox rotation and deliverability protection${techStr}, helping teams achieve 98%+ inbox placement.\n\n` +
      `Would you be open to a brief 10-minute chat this Thursday at 2 PM EST?\n\n` +
      `Best regards,\nJames Wilson`
    );
  };

  // Dispatch Email from CRM
  const handleExecuteSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !selectedCompany || !emailSubject.trim() || !emailBody.trim()) return;

    setIsSendingEmail(true);
    setEmailSentBanner(null);

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      const res = await fetch('/api/mailboxes/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mailboxId: emailMailboxId || connectedMailboxes[0]?.id || '',
          recipientEmail: selectedPerson.email,
          recipientName: selectedPerson.name,
          companyName: selectedCompany.name,
          subject: emailSubject.trim(),
          bodyText: emailBody.trim(),
        }),
      });

      const data = await res.json();

      const newStep: PersonOutreachStep = {
        id: `step-${Date.now()}`,
        stepNumber: (selectedPerson.customOutreachSteps?.length || 0) + 1,
        type: 'email',
        title: `Direct Sent: ${emailSubject}`,
        notesOrBody: emailBody,
        status: 'Completed',
        completedAt: `${new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${nowStr}`,
      };

      const updatedPerson: CompanyPerson = {
        ...selectedPerson,
        status: 'In Sequence',
        customOutreachSteps: [newStep, ...(selectedPerson.customOutreachSteps || [])],
      };

      const newNote: CompanyNote = {
        id: `note-${Date.now()}`,
        companyId: selectedCompany.id,
        author: 'James Wilson',
        content: `📧 Outbound Email Dispatched to ${selectedPerson.name} (${selectedPerson.email}): "${emailSubject}"`,
        createdAt: `${new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${nowStr}`,
        personId: selectedPerson.id,
        personName: selectedPerson.name,
      };

      const updatedPeople = selectedCompany.people.map((p) => (p.id === selectedPerson.id ? updatedPerson : p));
      const updatedCompany: CompanyCRM = {
        ...selectedCompany,
        status: 'In Sequence',
        people: updatedPeople,
        notes: [newNote, ...(selectedCompany.notes || [])],
      };

      onUpdateCompany(updatedCompany);
      setSelectedPerson(updatedPerson);

      if (data.success) {
        setEmailSentBanner(`Email successfully dispatched to ${selectedPerson.name} (${selectedPerson.email})! Logged in Outbox.`);
      } else {
        setEmailSentBanner(`Outreach recorded, but SMTP notice: ${data.error || 'Check mailbox settings'}`);
      }
    } catch (err: any) {
      setEmailSentBanner(`Email logged in CRM timeline. Error reaching server: ${err.message}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Add Follow-up Task inside Stakeholder Modal
  const handleAddFollowupTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !selectedCompany || !followupTitle.trim()) return;

    const nowStr = new Date().toLocaleDateString([], { month: 'short', day: 'numeric' });
    const newStep: PersonOutreachStep = {
      id: `step-${Date.now()}`,
      stepNumber: (selectedPerson.customOutreachSteps?.length || 0) + 1,
      type: followupType,
      title: followupTitle.trim(),
      notesOrBody: followupNotes.trim() || undefined,
      status: 'Pending',
      scheduledDate: followupDate || 'Tomorrow at 10:00 AM',
    };

    const updatedPerson: CompanyPerson = {
      ...selectedPerson,
      customOutreachSteps: [newStep, ...(selectedPerson.customOutreachSteps || [])],
    };

    const newNote: CompanyNote = {
      id: `note-${Date.now()}`,
      companyId: selectedCompany.id,
      author: 'James Wilson',
      content: `⏰ Scheduled Follow-up Task for ${selectedPerson.name}: "${followupTitle.trim()}" (${followupDate || 'Tomorrow'})`,
      createdAt: `${nowStr} at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      personId: selectedPerson.id,
      personName: selectedPerson.name,
    };

    handleUpdatePersonInCompany(updatedPerson);
    const updatedCompany: CompanyCRM = {
      ...selectedCompany,
      notes: [newNote, ...(selectedCompany.notes || [])],
    };
    onUpdateCompany(updatedCompany);

    setFollowupTitle('');
    setFollowupNotes('');
    setFollowupDate('');
  };

  // Log LinkedIn Touch inside Stakeholder Modal
  const handleLogLinkedinTouch = (touchType: string) => {
    if (!selectedPerson || !selectedCompany) return;

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newStep: PersonOutreachStep = {
      id: `step-${Date.now()}`,
      stepNumber: (selectedPerson.customOutreachSteps?.length || 0) + 1,
      type: 'linkedin',
      title: `LinkedIn: ${touchType}`,
      notesOrBody: linkedinMsgText.slice(0, 100),
      status: 'Completed',
      completedAt: `${new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${nowStr}`,
    };

    const updatedPerson: CompanyPerson = {
      ...selectedPerson,
      customOutreachSteps: [newStep, ...(selectedPerson.customOutreachSteps || [])],
    };

    const newNote: CompanyNote = {
      id: `note-${Date.now()}`,
      companyId: selectedCompany.id,
      author: 'James Wilson',
      content: `🔗 LinkedIn Touch Logged for ${selectedPerson.name}: ${touchType}`,
      createdAt: `${new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${nowStr}`,
      personId: selectedPerson.id,
      personName: selectedPerson.name,
    };

    handleUpdatePersonInCompany(updatedPerson);
    const updatedCompany: CompanyCRM = {
      ...selectedCompany,
      notes: [newNote, ...(selectedCompany.notes || [])],
    };
    onUpdateCompany(updatedCompany);
  };

  // Switch LinkedIn Message Type Template
  const handleSelectLinkedinMsgType = (type: 'connection' | 'inmail' | 'intro') => {
    setLinkedinMsgType(type);
    if (!selectedPerson || !selectedCompany) return;
    const firstName = selectedPerson.name.split(' ')[0];

    if (type === 'connection') {
      setLinkedinMsgText(
        `Hi ${firstName} - noticed your leadership role as ${selectedPerson.role} at ${selectedCompany.name}. Would love to connect and share insights on cold deliverability & account outreach strategy!`
      );
    } else if (type === 'inmail') {
      setLinkedinMsgText(
        `Hi ${firstName},\n\n` +
        `Reaching out after reviewing ${selectedCompany.name}'s revenue operations. We provide automated sender mailbox rotation and deliverability protection for sales teams.\n\n` +
        `Open to connecting on a quick 10-min overview this week?`
      );
    } else {
      setLinkedinMsgText(
        `Hi ${firstName} - hope you're well! Seeing great growth at ${selectedCompany.name}. Would you be open to an introduction regarding modern email infrastructure tools?`
      );
    }
  };

  // Copy LinkedIn message
  const handleCopyLinkedinMsg = () => {
    navigator.clipboard.writeText(linkedinMsgText);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  // Log Timeline Interaction Handler
  const handleLogTimelineInteraction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !selectedCompany || !timelineBodyInput.trim()) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const fullTime = `${dateStr} at ${timeStr}`;

    let emojiPrefix = '📝';
    let typeLabel = 'Note';
    if (timelineEventType === 'email') { emojiPrefix = '📧'; typeLabel = 'Outbound Email'; }
    else if (timelineEventType === 'call') { emojiPrefix = '📞'; typeLabel = 'Phone Call / Sync'; }
    else if (timelineEventType === 'linkedin') { emojiPrefix = '🤝'; typeLabel = 'LinkedIn Touch'; }
    else if (timelineEventType === 'meeting') { emojiPrefix = '📅'; typeLabel = 'Meeting Held'; }
    else if (timelineEventType === 'status') { emojiPrefix = '🚀'; typeLabel = 'Status Update'; }

    const titleText = timelineTitleInput.trim() ? `${timelineTitleInput.trim()}` : `${typeLabel} Logged`;
    const formattedContent = `${emojiPrefix} ${titleText}: ${timelineBodyInput.trim()}`;

    const newNote: CompanyNote = {
      id: `note-${Date.now()}`,
      companyId: selectedCompany.id,
      author: 'James Wilson',
      content: formattedContent,
      createdAt: fullTime,
      personId: selectedPerson.id,
      personName: selectedPerson.name,
    };

    const updatedCompany: CompanyCRM = {
      ...selectedCompany,
      notes: [newNote, ...(selectedCompany.notes || [])],
    };

    onUpdateCompany(updatedCompany);
    setTimelineTitleInput('');
    setTimelineBodyInput('');
  };

  // Helper to compute chronological timeline feed for selected person
  const getPersonTimelineEvents = () => {
    if (!selectedPerson || !selectedCompany) return [];

    const events: Array<{
      id: string;
      type: 'email' | 'call' | 'linkedin' | 'meeting' | 'note' | 'status';
      title: string;
      description?: string;
      author: string;
      date: string;
      badgeBg: string;
      icon: string;
      status?: string;
    }> = [];

    // 1. Company Notes for this person or general account
    (selectedCompany.notes || []).forEach((n) => {
      if (!n.personId || n.personId === selectedPerson.id) {
        let type: 'email' | 'call' | 'linkedin' | 'meeting' | 'note' | 'status' = 'note';
        let icon = 'sticky_note_2';
        let badgeBg = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';

        if (n.content.includes('📧') || n.content.toLowerCase().includes('email')) {
          type = 'email';
          icon = 'mail';
          badgeBg = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
        } else if (n.content.includes('📞') || n.content.toLowerCase().includes('call')) {
          type = 'call';
          icon = 'call';
          badgeBg = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
        } else if (n.content.includes('🤝') || n.content.toLowerCase().includes('linkedin') || n.content.toLowerCase().includes('inmail')) {
          type = 'linkedin';
          icon = 'link';
          badgeBg = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
        } else if (n.content.includes('📅') || n.content.toLowerCase().includes('meeting')) {
          type = 'meeting';
          icon = 'calendar_month';
          badgeBg = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
        } else if (n.content.includes('🚀') || n.content.toLowerCase().includes('stage') || n.content.toLowerCase().includes('enrolled')) {
          type = 'status';
          icon = 'rocket_launch';
          badgeBg = 'bg-purple-500/20 text-purple-300 border-purple-500/40';
        }

        events.push({
          id: n.id,
          type,
          title: n.content.split(':')[0] || 'Note Recorded',
          description: n.content.includes(':') ? n.content.substring(n.content.indexOf(':') + 1).trim() : n.content,
          author: n.author || 'James Wilson',
          date: n.createdAt,
          badgeBg,
          icon,
        });
      }
    });

    // 2. Custom outreach steps for this person
    (selectedPerson.customOutreachSteps || []).forEach((step) => {
      let icon = 'task_alt';
      let badgeBg = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      let type: 'email' | 'call' | 'linkedin' | 'meeting' | 'note' | 'status' = 'note';

      if (step.type === 'email') {
        type = 'email';
        icon = 'mail';
        badgeBg = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      } else if (step.type === 'call') {
        type = 'call';
        icon = 'call';
        badgeBg = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      } else if (step.type === 'linkedin') {
        type = 'linkedin';
        icon = 'link';
        badgeBg = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      }

      events.push({
        id: step.id,
        type,
        title: step.title,
        description: step.notesOrBody,
        author: selectedPerson.name,
        date: step.completedAt ? `Completed: ${step.completedAt}` : `Scheduled: ${step.scheduledDate || 'Today'}`,
        badgeBg,
        icon,
        status: step.status,
      });
    });

    // Filter by Category
    let filtered = events;
    if (timelineFilterCategory !== 'all') {
      filtered = filtered.filter((ev) => ev.type === timelineFilterCategory);
    }

    // Filter by Search Query
    if (timelineSearchQuery.trim()) {
      const q = timelineSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (ev) =>
          ev.title.toLowerCase().includes(q) ||
          (ev.description && ev.description.toLowerCase().includes(q)) ||
          ev.author.toLowerCase().includes(q)
      );
    }

    return filtered;
  };

  // Create Company Handler
  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName || !compWebUrl) return;

    const newCompanyId = `comp-${Date.now()}`;
    const initials = compName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    const newPeople: CompanyPerson[] = [];
    if (initialPersonName && initialPersonRole && initialPersonEmail) {
      newPeople.push({
        id: `person-${Date.now()}`,
        companyId: newCompanyId,
        name: initialPersonName,
        initials: initialPersonName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .substring(0, 2)
          .toUpperCase(),
        role: initialPersonRole,
        email: initialPersonEmail,
        linkedinUrl: compLinkedinUrl || `https://linkedin.com/in/${initialPersonName.toLowerCase().replace(/\s+/g, '')}`,
        buyingRole: initialPersonBuyingRole,
        status: 'Target',
        engagementScore: 75,
      });
    }

    const newCompany: CompanyCRM = {
      id: newCompanyId,
      name: compName,
      initials,
      webUrl: compWebUrl,
      linkedinUrl: compLinkedinUrl || `https://linkedin.com/company/${compName.toLowerCase().replace(/\s+/g, '')}`,
      employeeSize: compEmployeeSize,
      industry: compIndustry || 'B2B Software & Services',
      location: compLocation,
      timezone: 'PST (UTC-8)',
      context: compContext || 'High intent target account added for multi-channel sales execution.',
      status: 'Target',
      tier: compTier,
      intentScore: compIntentScore,
      intentSignal: compIntentSignal || '⚡ Manual target account added to pipeline',
      icpMatchScore: compIcpMatch,
      techStack: compTechStack.split(',').map((t) => t.trim()).filter(Boolean),
      buyingStage: compBuyingStage,
      painPoints: compPainPoints || 'Requires dedicated deliverability shield and high domain warmup scores.',
      valueProposition: compValueProp || 'Automated multi-mailbox rotation with zero manual DNS upkeep.',
      createdAt: 'Just now',
      people: newPeople,
      notes: [
        {
          id: `note-${Date.now()}`,
          companyId: newCompanyId,
          author: 'Account Creation',
          content: `Account added to CRM. Tier: ${compTier}. Intent Score: ${compIntentScore}/100.`,
          createdAt: new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }),
        },
      ],
    };

    onAddCompany(newCompany);
    setSelectedCompanyId(newCompanyId);
    setShowAddCompanyModal(false);

    // Reset Form
    setCompName('');
    setCompWebUrl('');
    setCompLinkedinUrl('');
    setCompIndustry('');
    setCompContext('');
    setCompIntentSignal('');
    setCompPainPoints('');
    setCompValueProp('');
    setInitialPersonName('');
    setInitialPersonRole('');
    setInitialPersonEmail('');
  };

  // Add Person to Company Handler
  const handleAddPersonToCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany || !personName || !personRole || !personEmail) return;

    const newPerson: CompanyPerson = {
      id: `person-${Date.now()}`,
      companyId: selectedCompany.id,
      name: personName,
      initials: personName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase(),
      role: personRole,
      email: personEmail,
      linkedinUrl: personLinkedin || `https://linkedin.com/in/${personName.toLowerCase().replace(/\s+/g, '')}`,
      phone: personPhone,
      buyingRole: personBuyingRole,
      status: 'Target',
      engagementScore: 80,
    };

    const updatedPeople = [...(selectedCompany.people || []), newPerson];
    const updatedCompany: CompanyCRM = {
      ...selectedCompany,
      people: updatedPeople,
      notes: [
        {
          id: `note-${Date.now()}`,
          companyId: selectedCompany.id,
          author: 'James Wilson',
          content: `Mapped new stakeholder: ${newPerson.name} (${newPerson.role}) as ${newPerson.buyingRole}.`,
          createdAt: new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }),
          personId: newPerson.id,
          personName: newPerson.name,
        },
        ...(selectedCompany.notes || []),
      ],
    };

    onUpdateCompany(updatedCompany);
    setShowAddPersonModal(false);

    // Reset Form
    setPersonName('');
    setPersonRole('');
    setPersonEmail('');
    setPersonLinkedin('');
    setPersonPhone('');
  };

  // Update Person in Company Handler
  const handleUpdatePersonInCompany = (updatedPerson: CompanyPerson) => {
    if (!selectedCompany) return;
    const updatedPeople = (selectedCompany.people || []).map((p) => (p.id === updatedPerson.id ? updatedPerson : p));
    const updatedCompany: CompanyCRM = {
      ...selectedCompany,
      people: updatedPeople,
    };
    onUpdateCompany(updatedCompany);
    setSelectedPerson(updatedPerson);
  };

  // Assign Multi-Step Sequence to Person
  const handleAssignSequenceToPerson = (personId: string, campaignId: string) => {
    if (!selectedCompany) return;
    const targetCampaign = campaigns.find((c) => c.id === campaignId);
    if (!targetCampaign) return;

    const person = selectedCompany.people.find((p) => p.id === personId);
    if (!person) return;

    const updatedPerson: CompanyPerson = {
      ...person,
      status: 'In Sequence',
      assignedSequenceId: targetCampaign.id,
      assignedSequenceName: targetCampaign.name,
      currentSequenceStep: 1,
    };

    handleUpdatePersonInCompany(updatedPerson);
  };

  // Add Custom Outreach Step to Person
  const handleAddCustomStepToPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !newStepTitle.trim()) return;

    const existingSteps = selectedPerson.customOutreachSteps || [];
    const newStep: PersonOutreachStep = {
      id: `step-${Date.now()}`,
      stepNumber: existingSteps.length + 1,
      type: newStepType,
      title: newStepTitle.trim(),
      notesOrBody: newStepNotes.trim() || undefined,
      status: 'Pending',
      scheduledDate: 'Scheduled Today',
    };

    const updatedPerson: CompanyPerson = {
      ...selectedPerson,
      customOutreachSteps: [...existingSteps, newStep],
    };

    handleUpdatePersonInCompany(updatedPerson);
    setNewStepTitle('');
    setNewStepNotes('');
  };

  // Toggle Custom Step Status
  const handleToggleStepStatus = (stepId: string) => {
    if (!selectedPerson) return;
    const existingSteps = selectedPerson.customOutreachSteps || [];
    const updatedSteps = existingSteps.map((st) => {
      if (st.id === stepId) {
        const nextStatus = st.status === 'Completed' ? 'Pending' : 'Completed';
        return {
          ...st,
          status: nextStatus as any,
          completedAt: nextStatus === 'Completed' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
        };
      }
      return st;
    });

    const updatedPerson: CompanyPerson = {
      ...selectedPerson,
      customOutreachSteps: updatedSteps,
    };

    handleUpdatePersonInCompany(updatedPerson);
  };

  // Add Note to Employee from Modal
  const handleAddPersonNoteInModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !personNoteInput.trim() || !selectedCompany) return;

    const newNote: CompanyNote = {
      id: `note-${Date.now()}`,
      companyId: selectedCompany.id,
      author: 'James Wilson',
      content: personNoteInput.trim(),
      createdAt: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      personId: selectedPerson.id,
      personName: selectedPerson.name,
    };

    const updatedCompany: CompanyCRM = {
      ...selectedCompany,
      notes: [newNote, ...(selectedCompany.notes || [])],
    };

    onUpdateCompany(updatedCompany);
    setPersonNoteInput('');
  };

  // Add Note to Selected Company
  const handleAddNoteToCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany || !noteContent.trim()) return;

    const taggedPerson = selectedCompany.people?.find((p) => p.id === noteTaggedPersonId);

    const newNote: CompanyNote = {
      id: `note-${Date.now()}`,
      companyId: selectedCompany.id,
      author: 'James Wilson',
      content: noteContent.trim(),
      createdAt: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      personId: taggedPerson?.id,
      personName: taggedPerson?.name,
    };

    const updatedCompany: CompanyCRM = {
      ...selectedCompany,
      notes: [newNote, ...(selectedCompany.notes || [])],
    };

    onUpdateCompany(updatedCompany);
    setNoteContent('');
    setNoteTaggedPersonId('');
  };

  // Assign Multi-Step Sequence to Company & All Decision Makers
  const handleAssignSequenceToCompany = (campaignId: string) => {
    if (!selectedCompany) return;

    const targetCampaign = campaigns.find((c) => c.id === campaignId);
    if (!targetCampaign) return;

    const updatedPeople = (selectedCompany.people || []).map((p) => ({
      ...p,
      status: 'In Sequence' as const,
      assignedSequenceId: targetCampaign.id,
      assignedSequenceName: targetCampaign.name,
      currentSequenceStep: 1,
    }));

    const updatedCompany: CompanyCRM = {
      ...selectedCompany,
      assignedSequenceId: targetCampaign.id,
      assignedSequenceName: targetCampaign.name,
      sequenceStatus: 'Active',
      status: 'In Sequence',
      people: updatedPeople,
      notes: [
        {
          id: `note-${Date.now()}`,
          companyId: selectedCompany.id,
          author: 'System Automation',
          content: `Account Multi-Touch Activated: Enrolled account and ${updatedPeople.length} decision makers into campaign sequence "${targetCampaign.name}"`,
          createdAt: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        },
        ...(selectedCompany.notes || []),
      ],
    };

    onUpdateCompany(updatedCompany);
  };

  // Open Edit Intel Modal
  const handleOpenEditIntel = () => {
    if (!selectedCompany) return;
    setEditTier(selectedCompany.tier || 'Tier 1');
    setEditIntentScore(selectedCompany.intentScore || 90);
    setEditIntentSignal(selectedCompany.intentSignal || '');
    setEditIcpMatch(selectedCompany.icpMatchScore || 95);
    setEditTechStack(selectedCompany.techStack?.join(', ') || '');
    setEditBuyingStage(selectedCompany.buyingStage || 'Engaging');
    setEditSentiment(selectedCompany.sentiment || getEffectiveSentiment(selectedCompany));
    setEditPainPoints(selectedCompany.painPoints || '');
    setEditValueProp(selectedCompany.valueProposition || '');
    setShowEditIntelModal(true);
  };

  // Save Intel Edits
  const handleSaveEditIntel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;

    const updatedCompany: CompanyCRM = {
      ...selectedCompany,
      tier: editTier,
      intentScore: editIntentScore,
      intentSignal: editIntentSignal,
      icpMatchScore: editIcpMatch,
      techStack: editTechStack.split(',').map((t) => t.trim()).filter(Boolean),
      buyingStage: editBuyingStage,
      sentiment: editSentiment,
      painPoints: editPainPoints,
      valueProposition: editValueProp,
    };

    onUpdateCompany(updatedCompany);
    setShowEditIntelModal(false);
  };

  // Save Context Text Edit
  const handleSaveContext = () => {
    if (!selectedCompany) return;
    const updatedCompany: CompanyCRM = {
      ...selectedCompany,
      context: editedContextText,
    };
    onUpdateCompany(updatedCompany);
    setIsEditingContext(false);
  };

  // Helper for Buying Role Badges
  const getBuyingRoleBadge = (role?: string) => {
    switch (role) {
      case 'Economic Buyer':
        return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded text-[10px] font-mono font-bold">👑 Economic Buyer</span>;
      case 'Champion':
        return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded text-[10px] font-mono font-bold">🌟 Champion</span>;
      case 'Evaluator':
        return <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded text-[10px] font-mono font-bold">🔍 Evaluator</span>;
      case 'Blocker':
        return <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded text-[10px] font-mono font-bold">⛔ Blocker</span>;
      default:
        return <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded text-[10px] font-mono font-bold">👤 End User</span>;
    }
  };

  // Pipeline Stages Configuration for Kanban
  const PIPELINE_STAGES = [
    {
      id: 'Prospecting' as const,
      label: 'Prospecting',
      badgeBg: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
      headerBg: 'from-slate-900 via-slate-900/90 to-slate-950',
      borderColor: 'border-slate-700/60',
      glowColor: 'ring-2 ring-slate-500/50 bg-slate-900/90 border-slate-500',
      icon: 'search',
    },
    {
      id: 'Engaging' as const,
      label: 'Engaging',
      badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      headerBg: 'from-indigo-950/80 via-slate-900 to-slate-950',
      borderColor: 'border-indigo-800/60',
      glowColor: 'ring-2 ring-indigo-500/50 bg-indigo-950/40 border-indigo-500',
      icon: 'forward_to_inbox',
    },
    {
      id: 'Qualified' as const,
      label: 'Qualified',
      badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      headerBg: 'from-blue-950/80 via-slate-900 to-slate-950',
      borderColor: 'border-blue-800/60',
      glowColor: 'ring-2 ring-blue-500/50 bg-blue-950/40 border-blue-500',
      icon: 'verified',
    },
    {
      id: 'Opportunity' as const,
      label: 'Opportunity',
      badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      headerBg: 'from-purple-950/80 via-slate-900 to-slate-950',
      borderColor: 'border-purple-800/60',
      glowColor: 'ring-2 ring-purple-500/50 bg-purple-950/40 border-purple-500',
      icon: 'work',
    },
    {
      id: 'Closed Won' as const,
      label: 'Closed Won',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      headerBg: 'from-emerald-950/80 via-slate-900 to-slate-950',
      borderColor: 'border-emerald-800/60',
      glowColor: 'ring-2 ring-emerald-500/50 bg-emerald-950/40 border-emerald-500',
      icon: 'emoji_events',
    },
  ];

  // Pipeline Stage Drag and Drop Handlers
  const handleStageChange = (
    companyId: string,
    newStage: 'Prospecting' | 'Engaging' | 'Qualified' | 'Opportunity' | 'Closed Won'
  ) => {
    const company = companies.find((c) => c.id === companyId);
    if (!company) return;
    if (company.buyingStage === newStage) return;

    const oldStage = company.buyingStage || 'Prospecting';
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date().toLocaleDateString([], { month: 'short', day: 'numeric' });

    const newNote: CompanyNote = {
      id: `note-${Date.now()}`,
      companyId: company.id,
      author: 'Pipeline Automation',
      content: `🚀 Stage Advanced: Moved account from "${oldStage}" ➔ "${newStage}"`,
      createdAt: `${dateStr} at ${nowStr}`,
    };

    const updatedCompany: CompanyCRM = {
      ...company,
      buyingStage: newStage,
      status: newStage === 'Closed Won' ? 'Customer' : newStage === 'Prospecting' ? 'Target' : 'In Sequence',
      notes: [newNote, ...(company.notes || [])],
    };

    onUpdateCompany(updatedCompany);
    setPipelineBanner(`Moved "${company.name}" from ${oldStage} ➔ ${newStage}`);
    setTimeout(() => setPipelineBanner(null), 3500);
  };

  const handleDragStart = (e: React.DragEvent, companyId: string) => {
    e.dataTransfer.setData('text/plain', companyId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedCompanyId(companyId);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStage !== stageId) {
      setDragOverStage(stageId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (dragOverStage === stageId) {
      setDragOverStage(null);
    }
  };

  const handleDrop = (
    e: React.DragEvent,
    targetStage: 'Prospecting' | 'Engaging' | 'Qualified' | 'Opportunity' | 'Closed Won'
  ) => {
    e.preventDefault();
    setDragOverStage(null);
    const companyId = e.dataTransfer.getData('text/plain') || draggedCompanyId;
    if (companyId) {
      handleStageChange(companyId, targetStage);
    }
    setDraggedCompanyId(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn font-['Inter'] pb-12">
      
      {/* Top Header & Overview */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-['Plus_Jakarta_Sans'] font-extrabold text-3xl text-white tracking-tight">
              Account-Based Outreach CRM
            </h1>
            <span className="bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-mono text-[10px] uppercase font-bold px-2.5 py-1 rounded-lg">
              ABM Command Center
            </span>
            <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Firestore Syncing</span>
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Map target companies and decision makers. Click any stakeholder to execute direct emails, follow-ups, and LinkedIn touches.
          </p>
        </div>

        <button
          onClick={() => setShowAddCompanyModal(true)}
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 shrink-0"
        >
          <span className="material-symbols-outlined text-sm">domain_add</span>
          <span>Add Target Account</span>
        </button>
      </div>

      {/* Recharts Visual Summary Panel: Sentiment & Pipeline Health */}
      <div className="p-5 rounded-2xl bg-slate-950/90 border border-white/10 backdrop-blur-md shadow-2xl space-y-4">
        {/* Panel Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/30 via-indigo-500/20 to-slate-900 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold shadow-inner">
              <span className="material-symbols-outlined text-xl">analytics</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-['Plus_Jakarta_Sans'] font-extrabold text-base text-white tracking-tight">
                  Manager Pipeline Health & Thread Sentiment Summary
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  Recharts Engine Active
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                Sentiment metrics synthesized across {companies.length} account outreach threads (Positive, Neutral, Negative)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-900 border border-white/10 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setChartViewMode('sentiment')}
                className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  chartViewMode === 'sentiment'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-sm">bar_chart</span>
                <span>Sentiment Overview</span>
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode('stageBreakdown')}
                className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  chartViewMode === 'stageBreakdown'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-sm">stacked_bar_chart</span>
                <span>Stage Breakdown</span>
              </button>
            </div>

            {/* Toggle Expand / Collapse */}
            <button
              type="button"
              onClick={() => setShowAnalyticsPanel(!showAnalyticsPanel)}
              className="p-1.5 rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-white transition-colors"
              title={showAnalyticsPanel ? "Collapse Analytics Panel" : "Expand Analytics Panel"}
            >
              <span className="material-symbols-outlined text-sm">
                {showAnalyticsPanel ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          </div>
        </div>

        {showAnalyticsPanel && (
          <div className="space-y-4 animate-fadeIn">
            {/* KPI Summary Cards Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              {/* Card 1: Total Threads */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 space-y-1">
                <div className="text-slate-400 text-[11px] font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-indigo-400">forum</span>
                  <span>Total Account Threads</span>
                </div>
                <div className="text-xl font-extrabold text-white font-mono">{companies.length}</div>
                <div className="text-[10px] text-slate-500">100% Outreach Coverage</div>
              </div>

              {/* Card 2: Positive Sentiment */}
              <button
                type="button"
                onClick={() => setSentimentFilter(sentimentFilter === 'Positive' ? 'All' : 'Positive')}
                className={`p-3 rounded-xl border transition-all text-left space-y-1 ${
                  sentimentFilter === 'Positive'
                    ? 'bg-emerald-500/20 border-emerald-500/60 ring-2 ring-emerald-500/40'
                    : 'bg-slate-900/80 border-emerald-500/30 hover:border-emerald-500/50'
                }`}
              >
                <div className="text-emerald-300 text-[11px] font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Positive</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">{positivePct}%</span>
                </div>
                <div className="text-xl font-extrabold text-emerald-400 font-mono">
                  {sentimentCounts.Positive} <span className="text-xs text-slate-400 font-normal">Threads</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-white/5">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${positivePct}%` }}></div>
                </div>
              </button>

              {/* Card 3: Neutral Sentiment */}
              <button
                type="button"
                onClick={() => setSentimentFilter(sentimentFilter === 'Neutral' ? 'All' : 'Neutral')}
                className={`p-3 rounded-xl border transition-all text-left space-y-1 ${
                  sentimentFilter === 'Neutral'
                    ? 'bg-amber-500/20 border-amber-500/60 ring-2 ring-amber-500/40'
                    : 'bg-slate-900/80 border-amber-500/30 hover:border-amber-500/50'
                }`}
              >
                <div className="text-amber-300 text-[11px] font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span>Neutral</span>
                  </span>
                  <span className="text-[10px] font-mono text-amber-400">{neutralPct}%</span>
                </div>
                <div className="text-xl font-extrabold text-amber-400 font-mono">
                  {sentimentCounts.Neutral} <span className="text-xs text-slate-400 font-normal">Threads</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-white/5">
                  <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${neutralPct}%` }}></div>
                </div>
              </button>

              {/* Card 4: Negative Sentiment */}
              <button
                type="button"
                onClick={() => setSentimentFilter(sentimentFilter === 'Negative' ? 'All' : 'Negative')}
                className={`p-3 rounded-xl border transition-all text-left space-y-1 ${
                  sentimentFilter === 'Negative'
                    ? 'bg-rose-500/20 border-rose-500/60 ring-2 ring-rose-500/40'
                    : 'bg-slate-900/80 border-rose-500/30 hover:border-rose-500/50'
                }`}
              >
                <div className="text-rose-300 text-[11px] font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                    <span>At Risk / Negative</span>
                  </span>
                  <span className="text-[10px] font-mono text-rose-400">{negativePct}%</span>
                </div>
                <div className="text-xl font-extrabold text-rose-400 font-mono">
                  {sentimentCounts.Negative} <span className="text-xs text-slate-400 font-normal">Threads</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-white/5">
                  <div className="bg-rose-500 h-full rounded-full transition-all duration-500" style={{ width: `${negativePct}%` }}></div>
                </div>
              </button>

              {/* Card 5: Overall Pipeline Health Score */}
              <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 border border-indigo-500/30 space-y-1 col-span-2 sm:col-span-1">
                <div className="text-indigo-300 text-[11px] font-semibold flex items-center justify-between">
                  <span>Pipeline Health Index</span>
                  <span className="material-symbols-outlined text-xs text-indigo-400">favorite</span>
                </div>
                <div className="text-xl font-extrabold text-white font-mono flex items-center gap-1.5">
                  <span>{pipelineHealthScore}%</span>
                  <span className={`text-[10px] font-sans px-1.5 py-0.5 rounded font-bold ${
                    pipelineHealthScore >= 75 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {pipelineHealthScore >= 75 ? 'Strong Health' : 'Needs Attention'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">Weighted conversion score</div>
              </div>
            </div>

            {/* Recharts Render Area */}
            <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5">
              {chartViewMode === 'sentiment' ? (
                /* Mode 1: Sentiment Bar Chart */
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-emerald-400">bar_chart</span>
                      <span>Account Thread Count by Sentiment Classification</span>
                    </span>
                    <span className="text-[11px] text-indigo-300">Click any bar to filter CRM list</span>
                  </div>

                  <div className="w-full h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={sentimentBarData}
                        margin={{ top: 15, right: 20, left: -20, bottom: 5 }}
                        onClick={(state: any) => {
                          if (state && state.activePayload && state.activePayload.length) {
                            const name = state.activePayload[0].payload.name;
                            setSentimentFilter(name as any);
                          }
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<CustomSentimentTooltip />} />
                        <Bar dataKey="threads" radius={[8, 8, 0, 0]} barSize={55} className="cursor-pointer">
                          {sentimentBarData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.fill}
                              stroke={sentimentFilter === entry.name ? '#ffffff' : 'transparent'}
                              strokeWidth={2}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                /* Mode 2: Stage Sentiment Breakdown Chart */
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-emerald-400">stacked_bar_chart</span>
                      <span>Thread Sentiment Distribution Across Pipeline Stages</span>
                    </span>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="flex items-center gap-1 text-emerald-400 font-bold">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Positive
                      </span>
                      <span className="flex items-center gap-1 text-amber-400 font-bold">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Neutral
                      </span>
                      <span className="flex items-center gap-1 text-rose-400 font-bold">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Negative
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={stageBreakdownData}
                        margin={{ top: 15, right: 20, left: -20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                        <XAxis dataKey="stage" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<CustomStageTooltip />} />
                        <Bar dataKey="Positive" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={40} />
                        <Bar dataKey="Neutral" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} barSize={40} />
                        <Bar dataKey="Negative" stackId="a" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-900 border border-white/10 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setCrmViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                crmViewMode === 'kanban'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Kanban Pipeline Visualizer"
            >
              <span className="material-symbols-outlined text-sm">view_kanban</span>
              <span>Kanban Pipeline</span>
            </button>
            <button
              type="button"
              onClick={() => setCrmViewMode('split')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                crmViewMode === 'split'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Account Directory Split View"
            >
              <span className="material-symbols-outlined text-sm">view_sidebar</span>
              <span>Account Details</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-56">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-500 text-sm">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search companies, stakeholders..."
              className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Sentiment Filter Dropdown */}
          <select
            value={sentimentFilter}
            onChange={(e) => setSentimentFilter(e.target.value as any)}
            className="bg-slate-900 border border-emerald-500/40 rounded-xl px-3 py-2 text-emerald-300 focus:outline-none font-bold"
          >
            <option value="All">All Sentiments</option>
            <option value="Positive">🟢 Positive Threads ({sentimentCounts.Positive})</option>
            <option value="Neutral">🟡 Neutral Threads ({sentimentCounts.Neutral})</option>
            <option value="Negative">🔴 Negative / At Risk ({sentimentCounts.Negative})</option>
          </select>

          {/* Tier Filter */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-slate-300 focus:outline-none font-medium"
          >
            <option value="All">All Tiers</option>
            <option value="Tier 1">👑 Tier 1 (VIP Targets)</option>
            <option value="Tier 2">🎯 Tier 2 (Core ICP)</option>
            <option value="Tier 3">🌐 Tier 3 (Broad)</option>
          </select>

          {/* Stage Filter */}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-slate-300 focus:outline-none font-medium"
          >
            <option value="All">All Stages</option>
            <option value="Prospecting">Prospecting</option>
            <option value="Engaging">Engaging</option>
            <option value="Qualified">Qualified</option>
            <option value="Opportunity">Opportunity</option>
            <option value="Closed Won">Closed Won</option>
          </select>

          {/* High Intent Toggle */}
          <button
            onClick={() => setHighIntentOnly(!highIntentOnly)}
            className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all border ${
              highIntentOnly
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">bolt</span>
            <span>High Intent (&ge;80)</span>
          </button>
        </div>

        <div className="text-slate-400 font-mono text-[11px]">
          Showing <span className="text-white font-bold">{filteredCompanies.length}</span> of {companies.length} Accounts
        </div>
      </div>

      {/* Pipeline Update Notification Banner */}
      {pipelineBanner && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/80 to-slate-950 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-emerald-400">check_circle</span>
            <span>{pipelineBanner}</span>
          </div>
          <button onClick={() => setPipelineBanner(null)} className="text-slate-400 hover:text-white">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {crmViewMode === 'kanban' ? (
        /* KANBAN-STYLE PIPELINE VISUALIZER */
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono bg-slate-950/40 p-3 rounded-xl border border-white/5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-indigo-400">touch_app</span>
              <span>Drag & drop account cards to advance sales stages or use quick selector on card.</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                <span>Active Board</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-6 items-start">
            {PIPELINE_STAGES.map((stage) => {
              const stageCompanies = filteredCompanies.filter(
                (c) => (c.buyingStage || 'Prospecting') === stage.id
              );
              const isTargetDropStage = dragOverStage === stage.id;

              return (
                <div
                  key={stage.id}
                  onDragOver={(e) => handleDragOver(e, stage.id)}
                  onDragLeave={(e) => handleDragLeave(e, stage.id)}
                  onDrop={(e) => handleDrop(e, stage.id)}
                  className={`flex flex-col rounded-2xl bg-slate-950/80 border transition-all min-h-[620px] p-3 space-y-3 ${
                    isTargetDropStage
                      ? `${stage.glowColor} scale-[1.01]`
                      : `border-white/10 hover:${stage.borderColor}`
                  }`}
                >
                  {/* Column Header */}
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${stage.headerBg} border border-white/5 space-y-1.5`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-indigo-300">{stage.icon}</span>
                        <h3 className="font-extrabold text-sm text-white font-['Plus_Jakarta_Sans']">{stage.label}</h3>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${stage.badgeBg}`}>
                        {stageCompanies.length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                      <span>
                        Avg Intent:{' '}
                        <strong className="text-white">
                          {stageCompanies.length
                            ? Math.round(
                                stageCompanies.reduce((acc, c) => acc + (c.intentScore || 80), 0) /
                                  stageCompanies.length
                              )
                            : 0}
                          /100
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Cards Container */}
                  <div className="flex-1 space-y-3 overflow-y-auto max-h-[720px] pr-0.5">
                    {stageCompanies.length === 0 ? (
                      <div className="h-44 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center p-4 text-center text-slate-500 text-xs space-y-2">
                        <span className="material-symbols-outlined text-2xl text-slate-600">drag_indicator</span>
                        <p className="text-[11px] font-medium">No accounts in {stage.label}</p>
                        <p className="text-[10px] text-slate-600">Drag accounts here to update stage</p>
                      </div>
                    ) : (
                      stageCompanies.map((comp) => {
                        const isDragged = draggedCompanyId === comp.id;
                        return (
                          <div
                            key={comp.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, comp.id)}
                            onClick={() => {
                              setSelectedCompanyId(comp.id);
                              setCrmViewMode('split');
                            }}
                            className={`p-3.5 rounded-xl bg-slate-900/90 border border-white/10 hover:border-indigo-500/60 transition-all cursor-grab active:cursor-grabbing space-y-2.5 shadow-md relative group ${
                              isDragged
                                ? 'opacity-40 border-dashed border-indigo-400 scale-95'
                                : 'hover:shadow-indigo-500/10 hover:-translate-y-0.5'
                            }`}
                          >
                            {/* Card Header: Initials, Name, Industry, Tier */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/30 to-slate-800 border border-indigo-500/40 text-indigo-200 font-bold text-xs flex items-center justify-center shrink-0 shadow-inner">
                                  {comp.initials}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-bold text-white text-xs group-hover:text-indigo-300 transition-colors truncate flex items-center gap-1">
                                    <span>{comp.name}</span>
                                  </h4>
                                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">{comp.industry}</p>
                                </div>
                              </div>

                              {comp.tier && (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 shrink-0 font-bold">
                                  {comp.tier}
                                </span>
                              )}
                            </div>

                            {/* Intent Signal */}
                            {comp.intentSignal && (
                              <div className="text-[10px] text-amber-300 font-mono bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1 line-clamp-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px] text-amber-400">bolt</span>
                                <span className="truncate">{comp.intentSignal}</span>
                              </div>
                            )}

                            {/* Stakeholders Count & Intent Score */}
                            <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-1.5 border-t border-white/5">
                              <span className="flex items-center gap-1 text-slate-300 font-semibold">
                                <span className="material-symbols-outlined text-xs text-indigo-400">group</span>
                                <span>{comp.people?.length || 0} Stakeholders</span>
                              </span>
                              {comp.intentScore && (
                                <span className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                  Intent: {comp.intentScore}
                                </span>
                              )}
                            </div>

                            {/* Card Footer: Quick Open & Quick Stage Selector */}
                            <div className="pt-2 flex items-center justify-between text-[10px] border-t border-white/5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCompanyId(comp.id);
                                  setCrmViewMode('split');
                                }}
                                className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                              >
                                <span>View Account</span>
                                <span className="material-symbols-outlined text-xs">arrow_forward</span>
                              </button>

                              {/* Quick Stage Move Dropdown */}
                              <select
                                value={comp.buyingStage || 'Prospecting'}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleStageChange(comp.id, e.target.value as any);
                                }}
                                className="bg-slate-950 border border-white/10 text-slate-300 rounded-lg px-1.5 py-0.5 text-[10px] font-mono focus:outline-none focus:border-indigo-500"
                              >
                                <option value="Prospecting">1. Prospecting</option>
                                <option value="Engaging">2. Engaging</option>
                                <option value="Qualified">3. Qualified</option>
                                <option value="Opportunity">4. Opportunity</option>
                                <option value="Closed Won">5. Closed Won</option>
                              </select>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Split-Pane CRM Layout (List + Detail Pane) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT PANE: Accounts List (4 cols) */}
        <div className="lg:col-span-4 bg-slate-950/80 border border-white/10 rounded-2xl p-3 space-y-2 max-h-[800px] overflow-y-auto">
          {filteredCompanies.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs space-y-2">
              <span className="material-symbols-outlined text-3xl text-slate-600">domain_disabled</span>
              <p>No target accounts match your active filters.</p>
            </div>
          ) : (
            filteredCompanies.map((comp) => {
              const isSelected = comp.id === selectedCompanyId;
              return (
                <div
                  key={comp.id}
                  onClick={() => setSelectedCompanyId(comp.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2.5 relative group ${
                    isSelected
                      ? 'bg-gradient-to-r from-indigo-950/80 to-slate-900 border-indigo-500 shadow-lg shadow-indigo-500/10'
                      : 'bg-slate-900/60 hover:bg-slate-900 border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 border border-white/10 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                        {comp.initials}
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs flex items-center gap-1.5">
                          <span>{comp.name}</span>
                          {comp.tier && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                              {comp.tier}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>{comp.industry}</span>
                          <span>•</span>
                          <span>{comp.employeeSize}</span>
                        </div>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                      {comp.buyingStage || comp.status}
                    </span>
                  </div>

                  {/* Intent Signal & Stakeholder Preview */}
                  {comp.intentSignal && (
                    <div className="text-[10px] text-amber-300/90 font-mono bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1 line-clamp-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">bolt</span>
                      <span>{comp.intentSignal}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-1 border-t border-white/5">
                    <span className="flex items-center gap-1 text-slate-300 font-semibold">
                      <span className="material-symbols-outlined text-xs">group</span>
                      <span>{comp.people?.length || 0} Stakeholders</span>
                    </span>

                    {comp.intentScore && (
                      <span className="text-amber-400 font-bold">
                        Intent Score: {comp.intentScore}/100
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* RIGHT PANE: Selected Account Detail & Stakeholders Workspace (8 cols) */}
        <div className="lg:col-span-8 bg-slate-950/80 border border-white/10 rounded-2xl p-6 min-h-[800px] flex flex-col justify-between">
          {selectedCompany ? (
            <div className="space-y-6">
              
              {/* Account Title Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/50 border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/50 text-indigo-200 font-extrabold text-base flex items-center justify-center shadow-lg shadow-indigo-500/20">
                      {selectedCompany.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-['Plus_Jakarta_Sans'] font-extrabold text-2xl text-white">
                          {selectedCompany.name}
                        </h2>
                        <a
                          href={`https://${selectedCompany.webUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-indigo-400 hover:underline flex items-center gap-0.5"
                        >
                          <span>{selectedCompany.webUrl}</span>
                          <span className="material-symbols-outlined text-xs">open_in_new</span>
                        </a>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>{selectedCompany.industry}</span>
                        <span>•</span>
                        <span>{selectedCompany.employeeSize}</span>
                        <span>•</span>
                        <span>{selectedCompany.location}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleOpenEditIntel}
                      className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      <span>Edit Intel</span>
                    </button>
                    <button
                      onClick={() => setShowAddPersonModal(true)}
                      className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">person_add</span>
                      <span>Add Stakeholder</span>
                    </button>
                    {onDeleteCompany && (
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${selectedCompany.name}" from Firestore database?`)) {
                            onDeleteCompany(selectedCompany.id);
                          }
                        }}
                        className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-all"
                        title="Delete account from Firestore"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Strategic Context Box */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/5 text-xs text-slate-300 relative space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-mono text-indigo-300 uppercase tracking-wider font-bold">
                    <span>Strategic Account Intelligence & Research</span>
                    {!isEditingContext ? (
                      <button
                        onClick={() => {
                          setEditedContextText(selectedCompany.context);
                          setIsEditingContext(true);
                        }}
                        className="text-slate-400 hover:text-white flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">edit</span>
                        <span>Edit</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleSaveContext}
                        className="text-emerald-400 font-bold hover:underline flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">check</span>
                        <span>Save</span>
                      </button>
                    )}
                  </div>

                  {!isEditingContext ? (
                    <p className="leading-relaxed">{selectedCompany.context}</p>
                  ) : (
                    <textarea
                      value={editedContextText}
                      onChange={(e) => setEditedContextText(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-900 border border-indigo-500/50 rounded-lg p-2 text-white focus:outline-none"
                    />
                  )}
                </div>

                {/* Tech Stack Pills */}
                {selectedCompany.techStack && selectedCompany.techStack.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
                    <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">Tech Installed:</span>
                    {selectedCompany.techStack.map((tech, idx) => (
                      <span key={idx} className="px-2.5 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-white/10 text-[10px] font-mono">
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Detail Workspace Tabs */}
              <div className="border-b border-white/10 flex gap-6 text-xs font-semibold overflow-x-auto">
                <button
                  onClick={() => setActiveDetailTab('committee')}
                  className={`pb-2.5 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    activeDetailTab === 'committee'
                      ? 'text-indigo-400 border-b-2 border-indigo-500 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">groups</span>
                  <span>Buying Committee & Stakeholders ({(selectedCompany.people?.length || 0)})</span>
                </button>

                <button
                  onClick={() => setActiveDetailTab('intel')}
                  className={`pb-2.5 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    activeDetailTab === 'intel'
                      ? 'text-indigo-400 border-b-2 border-indigo-500 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">psychology</span>
                  <span>Playbook & Value Prop</span>
                </button>

                <button
                  onClick={() => setActiveDetailTab('sequence')}
                  className={`pb-2.5 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    activeDetailTab === 'sequence'
                      ? 'text-indigo-400 border-b-2 border-indigo-500 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">rocket_launch</span>
                  <span>Campaign Sequence</span>
                </button>

                <button
                  onClick={() => setActiveDetailTab('notes')}
                  className={`pb-2.5 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    activeDetailTab === 'notes'
                      ? 'text-indigo-400 border-b-2 border-indigo-500 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">history</span>
                  <span>Activity Feed ({(selectedCompany.notes?.length || 0)})</span>
                </button>
              </div>

              {/* TAB 1: BUYING COMMITTEE STAKEHOLDERS */}
              {activeDetailTab === 'committee' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-sm text-white flex items-center gap-2">
                        Mapped Decision Makers & Stakeholders
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Click any stakeholder or use quick actions to send direct emails, schedule follow-ups, or open LinkedIn.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowAddPersonModal(true)}
                      className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">person_add</span>
                      <span>Add Stakeholder</span>
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {(!selectedCompany.people || selectedCompany.people.length === 0) ? (
                      <div className="p-8 rounded-xl bg-slate-900/50 border border-dashed border-white/10 text-center text-slate-500 text-xs space-y-3">
                        <p>No decision makers mapped for {selectedCompany.name} yet.</p>
                        <button
                          onClick={() => setShowAddPersonModal(true)}
                          className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md shadow-indigo-500/20"
                        >
                          Add First Stakeholder
                        </button>
                      </div>
                    ) : (
                      selectedCompany.people.map((person) => (
                        <div
                          key={person.id}
                          className="p-4 rounded-xl bg-slate-900/90 border border-white/10 hover:border-indigo-500/50 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group shadow-md"
                        >
                          <div
                            onClick={() => handleOpenStakeholderWorkspace(person, 'email')}
                            className="flex items-start gap-3 cursor-pointer flex-1"
                          >
                            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 border border-indigo-400/40 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-md">
                              {person.initials}
                            </div>
                            <div>
                              <div className="font-bold text-white text-sm flex items-center gap-2 group-hover:text-indigo-300 transition-colors flex-wrap">
                                <span>{person.name}</span>
                                {getBuyingRoleBadge(person.buyingRole)}
                                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 text-indigo-300 border border-indigo-500/20">
                                  {person.status || 'Target'}
                                </span>
                              </div>
                              <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                                <span>{person.role}</span>
                                <span>•</span>
                                <span className="text-slate-300 font-mono">✉️ {person.email}</span>
                                {person.phone && <span>• 📞 {person.phone}</span>}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons for Stakeholder */}
                          <div className="flex items-center gap-2 shrink-0 flex-wrap w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                            {/* Timeline Feed Action */}
                            <button
                              type="button"
                              onClick={() => handleOpenStakeholderWorkspace(person, 'timeline')}
                              className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all"
                              title="View Interactive Timeline Feed"
                            >
                              <span className="material-symbols-outlined text-sm">timeline</span>
                              <span>Timeline Feed</span>
                            </button>

                            {/* Email History Action */}
                            <button
                              type="button"
                              onClick={() => handleOpenStakeholderWorkspace(person, 'email')}
                              className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all"
                              title="View Email History & Compose"
                            >
                              <span className="material-symbols-outlined text-sm">mail</span>
                              <span>Email History</span>
                            </button>

                            {/* Follow-up Sequences Action */}
                            <button
                              type="button"
                              onClick={() => handleOpenStakeholderWorkspace(person, 'sequence')}
                              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all"
                              title="Manage Follow-up Sequences & Tasks"
                            >
                              <span className="material-symbols-outlined text-sm">event_upcoming</span>
                              <span>Follow-up Sequences</span>
                            </button>

                            {/* LinkedIn Profile Action */}
                            <button
                              type="button"
                              onClick={() => handleOpenStakeholderWorkspace(person, 'linkedin')}
                              className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all"
                              title="LinkedIn Profile & Outreach"
                            >
                              <span className="material-symbols-outlined text-sm">link</span>
                              <span>LinkedIn Profile</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: PLAYBOOK & VALUE PROP */}
              {activeDetailTab === 'intel' && (
                <div className="space-y-4 text-xs font-['Inter']">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Pain Points Card */}
                    <div className="p-4 rounded-xl bg-slate-900/90 border border-rose-500/30 space-y-2">
                      <div className="font-mono font-bold uppercase text-rose-300 text-[11px] flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">warning</span>
                        <span>Identified Pain Points</span>
                      </div>
                      <p className="text-slate-200 leading-relaxed">
                        {selectedCompany.painPoints || 'Primary pain point: Deliverability drops and manual domain warmup limits.'}
                      </p>
                    </div>

                    {/* Value Proposition Card */}
                    <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30 space-y-2">
                      <div className="font-mono font-bold uppercase text-emerald-300 text-[11px] flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">auto_awesome</span>
                        <span>Tailored Value Proposition</span>
                      </div>
                      <p className="text-slate-200 leading-relaxed">
                        {selectedCompany.valueProposition || 'Automated mailbox rotation + deliverability shield + automated SPF/DKIM verification.'}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-3">
                    <div className="font-mono font-bold text-indigo-300 text-[11px] uppercase tracking-wider flex items-center justify-between">
                      <span>Account Strategy Summary</span>
                      <button
                        onClick={handleOpenEditIntel}
                        className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">edit</span>
                        <span>Update Strategy</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-white/5 space-y-1">
                        <div className="text-[10px] text-slate-500 font-mono">TARGET TIER</div>
                        <div className="font-bold text-amber-300">{selectedCompany.tier || 'Tier 1'}</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-white/5 space-y-1">
                        <div className="text-[10px] text-slate-500 font-mono">BUYING STAGE</div>
                        <div className="font-bold text-indigo-300">{selectedCompany.buyingStage || 'Engaging'}</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-white/5 space-y-1">
                        <div className="text-[10px] text-slate-500 font-mono">INTENT SCORE</div>
                        <div className="font-bold text-amber-400">🔥 {selectedCompany.intentScore || 90}/100</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-white/5 space-y-1">
                        <div className="text-[10px] text-slate-500 font-mono">ICP FIT</div>
                        <div className="font-bold text-emerald-400">{selectedCompany.icpMatchScore || 95}% Fit</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: MULTI-TOUCH SEQUENCE */}
              {activeDetailTab === 'sequence' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div>
                        <h4 className="font-bold text-xs text-white uppercase tracking-wider font-mono">
                          Account Sequence Enrollment
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Enroll {selectedCompany.name} and all mapped decision makers into an active outreach campaign.
                        </p>
                      </div>

                      {/* Sequence Picker */}
                      <select
                        value={selectedCompany.assignedSequenceId || ''}
                        onChange={(e) => handleAssignSequenceToCompany(e.target.value)}
                        className="bg-slate-950 border border-indigo-500/50 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none font-semibold"
                      >
                        <option value="" disabled>Select Campaign Sequence...</option>
                        {campaigns.map((camp) => (
                          <option key={camp.id} value={camp.id}>
                            {camp.name} ({camp.steps.length} Steps)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Display Steps if Assigned */}
                    {selectedCompany.assignedSequenceId ? (
                      <div className="pt-3 border-t border-white/5 space-y-3">
                        <div className="text-xs font-semibold text-indigo-300 flex items-center justify-between">
                          <span>Sequence Roadmap ({selectedCompany.assignedSequenceName}):</span>
                          <span className="text-[10px] font-mono text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded">
                            Status: {selectedCompany.sequenceStatus || 'Active'}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {campaigns
                            .find((c) => c.id === selectedCompany.assignedSequenceId)
                            ?.steps.map((step, idx) => (
                              <div key={step.id || idx} className="p-3 rounded-xl bg-slate-950 border border-white/5 space-y-1">
                                <div className="flex justify-between items-center text-xs font-bold text-white">
                                  <span className="flex items-center gap-1.5">
                                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] flex items-center justify-center font-mono">
                                      {step.stepNumber}
                                    </span>
                                    <span>{step.title}</span>
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-400">
                                    Day {step.dayDelay}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 line-clamp-2 italic">
                                  "{step.body}"
                                </p>
                              </div>
                            ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-slate-500 text-xs">
                        No multi-step sequence assigned yet. Choose a campaign sequence from the dropdown above to enroll this account.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: ACTIVITY FEED & NOTES */}
              {activeDetailTab === 'notes' && (
                <div className="space-y-4">
                  {/* New Note Input */}
                  <form onSubmit={handleAddNoteToCompany} className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                        Log Account Activity / Note
                      </label>

                      {/* Tag Person Dropdown */}
                      {(selectedCompany.people?.length || 0) > 0 && (
                        <select
                          value={noteTaggedPersonId}
                          onChange={(e) => setNoteTaggedPersonId(e.target.value)}
                          className="bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 focus:outline-none"
                        >
                          <option value="">Tag Specific Stakeholder (Optional)</option>
                          {selectedCompany.people?.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.role})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Log call notes, discovery insights, objection handling, or next steps..."
                      rows={2}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                    />

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={!noteContent.trim()}
                        className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">post_add</span>
                        <span>Save Note</span>
                      </button>
                    </div>
                  </form>

                  {/* Notes List */}
                  <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                    {(!selectedCompany.notes || selectedCompany.notes.length === 0) ? (
                      <div className="p-6 text-center text-slate-500 text-xs">
                        No notes recorded for this account yet.
                      </div>
                    ) : (
                      selectedCompany.notes.map((note) => (
                        <div key={note.id} className="p-3.5 rounded-xl bg-slate-900/90 border border-white/5 space-y-1 text-xs">
                          <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                            <span className="font-bold text-indigo-300">{note.author}</span>
                            <span>{note.createdAt}</span>
                          </div>
                          <p className="text-slate-200">{note.content}</p>
                          {note.personName && (
                            <div className="text-[10px] text-slate-400 font-mono pt-1">
                              Tagged Contact: <span className="text-white font-semibold">{note.personName}</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500 text-xs p-12 space-y-3">
              <span className="material-symbols-outlined text-4xl text-slate-600">domain</span>
              <p>Select a target account from the directory on the left or click "Add Target Account" to begin.</p>
            </div>
          )}
        </div>

      </div>
      )}

      {/* MODAL 1: ADD COMPANY MODAL */}
      {showAddCompanyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-white/10 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div>
                <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-xl text-white">
                  Add Target Account
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Save company intel, tiering, intent signal, and initial decision maker contact.
                </p>
              </div>
              <button
                onClick={() => setShowAddCompanyModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="space-y-4 text-xs font-['Inter']">
              
              {/* Company Core Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={compName}
                    onChange={(e) => setCompName(e.target.value)}
                    placeholder="e.g. Stripe, Inc."
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Website URL *</label>
                  <input
                    type="text"
                    required
                    value={compWebUrl}
                    onChange={(e) => setCompWebUrl(e.target.value)}
                    placeholder="e.g. stripe.com"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Account Tier</label>
                  <select
                    value={compTier}
                    onChange={(e) => setCompTier(e.target.value as any)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Tier 1">👑 Tier 1 (VIP Target)</option>
                    <option value="Tier 2">🎯 Tier 2 (Core ICP)</option>
                    <option value="Tier 3">🌐 Tier 3 (Broad Outreach)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Intent Score (0-100)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={compIntentScore}
                    onChange={(e) => setCompIntentScore(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ICP Match %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={compIcpMatch}
                    onChange={(e) => setCompIcpMatch(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Industry</label>
                  <input
                    type="text"
                    value={compIndustry}
                    onChange={(e) => setCompIndustry(e.target.value)}
                    placeholder="e.g. Fintech & Payments"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Buying Stage</label>
                  <select
                    value={compBuyingStage}
                    onChange={(e) => setCompBuyingStage(e.target.value as any)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Prospecting">Prospecting</option>
                    <option value="Engaging">Engaging</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Opportunity">Opportunity</option>
                    <option value="Closed Won">Closed Won</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Intent Signal / Trigger Event</label>
                <input
                  type="text"
                  value={compIntentSignal}
                  onChange={(e) => setCompIntentSignal(e.target.value)}
                  placeholder="e.g. ⚡ Hiring 15 SDRs & raised $30M Series B"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tech Stack (Comma Separated)</label>
                <input
                  type="text"
                  value={compTechStack}
                  onChange={(e) => setCompTechStack(e.target.value)}
                  placeholder="Salesforce, Outreach, HubSpot, Google Workspace"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Account Context & Research</label>
                <textarea
                  value={compContext}
                  onChange={(e) => setCompContext(e.target.value)}
                  placeholder="Enter strategic background, company objectives, or recent news..."
                  rows={2}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Optional First Contact Form */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10 space-y-3">
                <div className="font-bold text-indigo-300 text-xs flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">person_add</span>
                  <span>Add First Stakeholder (Optional)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={initialPersonName}
                    onChange={(e) => setInitialPersonName(e.target.value)}
                    placeholder="Full Name (e.g. Sarah Connor)"
                    className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={initialPersonRole}
                    onChange={(e) => setInitialPersonRole(e.target.value)}
                    placeholder="Role (e.g. VP of Sales)"
                    className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none"
                  />
                  <input
                    type="email"
                    value={initialPersonEmail}
                    onChange={(e) => setInitialPersonEmail(e.target.value)}
                    placeholder="Work Email"
                    className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none"
                  />
                  <select
                    value={initialPersonBuyingRole}
                    onChange={(e) => setInitialPersonBuyingRole(e.target.value as any)}
                    className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="Economic Buyer">👑 Economic Buyer</option>
                    <option value="Champion">🌟 Champion</option>
                    <option value="Evaluator">🔍 Evaluator</option>
                    <option value="End User">👤 End User</option>
                    <option value="Blocker">⛔ Blocker</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddCompanyModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 text-slate-300 font-semibold hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/25 transition-all"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD PERSON TO COMPANY MODAL */}
      {showAddPersonModal && selectedCompany && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div>
                <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-white">
                  Add Stakeholder to {selectedCompany.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Map a decision maker or influencer into this account's buying committee.
                </p>
              </div>
              <button
                onClick={() => setShowAddPersonModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddPersonToCompany} className="space-y-3.5 text-xs font-['Inter']">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder="e.g. Robert Vance"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Job Role / Title *</label>
                <input
                  type="text"
                  required
                  value={personRole}
                  onChange={(e) => setPersonRole(e.target.value)}
                  placeholder="e.g. VP of Demand Gen"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Buying Committee Role *</label>
                <select
                  value={personBuyingRole}
                  onChange={(e) => setPersonBuyingRole(e.target.value as any)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-indigo-500 focus:outline-none font-medium"
                >
                  <option value="Economic Buyer">👑 Economic Buyer (Budget Owner)</option>
                  <option value="Champion">🌟 Champion (Internal Driver)</option>
                  <option value="Evaluator">🔍 Evaluator (Technical / Ops)</option>
                  <option value="End User">👤 End User (Primary User)</option>
                  <option value="Blocker">⛔ Blocker (Risk / Compliance)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Work Email *</label>
                <input
                  type="email"
                  required
                  value={personEmail}
                  onChange={(e) => setPersonEmail(e.target.value)}
                  placeholder={`e.g. robert@${selectedCompany.name.toLowerCase().replace(/[^a-z]/g, '')}.com`}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">LinkedIn Profile URL</label>
                <input
                  type="text"
                  value={personLinkedin}
                  onChange={(e) => setPersonLinkedin(e.target.value)}
                  placeholder="e.g. linkedin.com/in/robertvance"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Direct Phone (Optional)</label>
                <input
                  type="text"
                  value={personPhone}
                  onChange={(e) => setPersonPhone(e.target.value)}
                  placeholder="e.g. +1 (415) 890-1200"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddPersonModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 font-semibold hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/25 transition-all"
                >
                  Add Stakeholder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT ACCOUNT INTEL MODAL */}
      {showEditIntelModal && selectedCompany && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div>
                <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-white">
                  Edit Intel: {selectedCompany.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update account tiering, intent signals, pain points, and tech stack.
                </p>
              </div>
              <button
                onClick={() => setShowEditIntelModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEditIntel} className="space-y-3.5 text-xs font-['Inter']">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Account Tier</label>
                  <select
                    value={editTier}
                    onChange={(e) => setEditTier(e.target.value as any)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none"
                  >
                    <option value="Tier 1">👑 Tier 1 (VIP Target)</option>
                    <option value="Tier 2">🎯 Tier 2 (Core ICP)</option>
                    <option value="Tier 3">🌐 Tier 3 (Broad)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Buying Stage</label>
                  <select
                    value={editBuyingStage}
                    onChange={(e) => setEditBuyingStage(e.target.value as any)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none"
                  >
                    <option value="Prospecting">Prospecting</option>
                    <option value="Engaging">Engaging</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Opportunity">Opportunity</option>
                    <option value="Closed Won">Closed Won</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Thread Sentiment Classification</label>
                  <select
                    value={editSentiment}
                    onChange={(e) => setEditSentiment(e.target.value as any)}
                    className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl px-3.5 py-2.5 text-emerald-300 font-bold focus:outline-none"
                  >
                    <option value="Positive">🟢 Positive (High Interest & Active Responses)</option>
                    <option value="Neutral">🟡 Neutral (Evaluating / Inquiries)</option>
                    <option value="Negative">🔴 Negative / At Risk (Objections / Stalled)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Intent Score (0-100)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editIntentScore}
                    onChange={(e) => setEditIntentScore(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ICP Match %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editIcpMatch}
                    onChange={(e) => setEditIcpMatch(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Active Intent Trigger Signal</label>
                <input
                  type="text"
                  value={editIntentSignal}
                  onChange={(e) => setEditIntentSignal(e.target.value)}
                  placeholder="e.g. ⚡ Website spike on Pricing docs & hiring SDRs"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Installed Tech Stack</label>
                <input
                  type="text"
                  value={editTechStack}
                  onChange={(e) => setEditTechStack(e.target.value)}
                  placeholder="Salesforce, Outreach, HubSpot, Google Workspace"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Account Pain Points</label>
                <textarea
                  value={editPainPoints}
                  onChange={(e) => setEditPainPoints(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tailored Value Proposition</label>
                <textarea
                  value={editValueProp}
                  onChange={(e) => setEditValueProp(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditIntelModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 font-semibold hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/25 transition-all"
                >
                  Save Intel Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: STAKEHOLDER OUTREACH WORKSPACE (EMAIL, FOLLOW-UP, LINKEDIN) */}
      {selectedPerson && selectedCompany && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-white/10 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 border border-indigo-400/40 text-white font-extrabold text-base flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                  {selectedPerson.initials}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-xl text-white">
                      {selectedPerson.name}
                    </h3>
                    {getBuyingRoleBadge(selectedPerson.buyingRole)}
                    <a
                      href={selectedPerson.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 font-mono"
                      title="Open LinkedIn Profile"
                    >
                      <span className="material-symbols-outlined text-xs">link</span>
                      <span>LinkedIn Profile</span>
                    </a>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedPerson.role} at <span className="text-white font-semibold">{selectedCompany.name}</span>
                  </p>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3 font-mono flex-wrap">
                    <span>✉️ {selectedPerson.email}</span>
                    {selectedPerson.phone && <span>📞 {selectedPerson.phone}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {/* Status Selector */}
                <select
                  value={selectedPerson.status || 'Target'}
                  onChange={(e) => {
                    const newStatus = e.target.value as any;
                    handleUpdatePersonInCompany({
                      ...selectedPerson,
                      status: newStatus,
                    });
                  }}
                  className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-indigo-300 font-bold focus:outline-none"
                >
                  <option value="Target">Target</option>
                  <option value="In Sequence">In Sequence</option>
                  <option value="Replied">Replied</option>
                  <option value="Meeting Booked">Meeting Booked</option>
                  <option value="Cold">Cold</option>
                  <option value="Opted Out">Opted Out</option>
                </select>

                <button
                  type="button"
                  onClick={() => setSelectedPerson(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            {/* Email Success Banner */}
            {emailSentBanner && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>{emailSentBanner}</span>
                </div>
                <button
                  onClick={() => setEmailSentBanner(null)}
                  className="text-emerald-300 hover:text-white"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            )}

            {/* Dedicated Stakeholder Panel Tabs */}
            <div className="flex border-b border-white/10 gap-3 text-xs font-semibold overflow-x-auto">
              <button
                type="button"
                onClick={() => setPersonActiveTab('timeline')}
                className={`pb-2.5 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  personActiveTab === 'timeline'
                    ? 'text-emerald-400 border-b-2 border-emerald-500 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-base">timeline</span>
                <span>Interaction Timeline</span>
              </button>

              <button
                type="button"
                onClick={() => setPersonActiveTab('email')}
                className={`pb-2.5 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  personActiveTab === 'email'
                    ? 'text-indigo-400 border-b-2 border-indigo-500 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-base">mail</span>
                <span>Email History</span>
              </button>

              <button
                type="button"
                onClick={() => setPersonActiveTab('sequence')}
                className={`pb-2.5 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  personActiveTab === 'sequence' || personActiveTab === 'followup'
                    ? 'text-indigo-400 border-b-2 border-indigo-500 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-base">event_upcoming</span>
                <span>Follow-up Sequences</span>
              </button>

              <button
                type="button"
                onClick={() => setPersonActiveTab('linkedin')}
                className={`pb-2.5 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  personActiveTab === 'linkedin'
                    ? 'text-blue-400 border-b-2 border-blue-500 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-base">link</span>
                <span>LinkedIn Profile</span>
              </button>

              <button
                type="button"
                onClick={() => setPersonActiveTab('notes')}
                className={`pb-2.5 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  personActiveTab === 'notes'
                    ? 'text-indigo-400 border-b-2 border-indigo-500 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-base">sticky_note_2</span>
                <span>Notes</span>
              </button>
            </div>

            {/* TAB 0: INTERACTION TIMELINE FEED */}
            {personActiveTab === 'timeline' && (
              <div className="space-y-4 text-xs font-['Inter']">
                {/* Log New Interaction Box */}
                <form onSubmit={handleLogTimelineInteraction} className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-xs text-white uppercase font-mono flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-400 text-sm">history_edu</span>
                      <span>Log Activity / Touchpoint for {selectedPerson.name}</span>
                    </label>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Firestore Sync Active</span>
                    </span>
                  </div>

                  {/* Interaction Type Selector */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {[
                      { type: 'note', label: '📝 Note', bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
                      { type: 'email', label: '📧 Outbound Email', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
                      { type: 'call', label: '📞 Phone Call', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
                      { type: 'linkedin', label: '🤝 LinkedIn Touch', bg: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
                      { type: 'meeting', label: '📅 Sync Meeting', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
                      { type: 'status', label: '🚀 Status Change', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
                    ].map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setTimelineEventType(item.type as any)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap border ${
                          timelineEventType === item.type
                            ? `${item.bg} ring-2 ring-emerald-400/50`
                            : 'bg-slate-950 text-slate-400 border-white/10 hover:text-white'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={timelineTitleInput}
                      onChange={(e) => setTimelineTitleInput(e.target.value)}
                      placeholder="Title / Outcome (e.g. Discussed Q4 budget & deliverability)"
                      className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none col-span-2 text-xs"
                    />

                    <button
                      type="submit"
                      disabled={!timelineBodyInput.trim()}
                      className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-extrabold text-xs px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
                    >
                      <span className="material-symbols-outlined text-sm">add_task</span>
                      <span>Log Interaction</span>
                    </button>
                  </div>

                  <textarea
                    required
                    value={timelineBodyInput}
                    onChange={(e) => setTimelineBodyInput(e.target.value)}
                    placeholder="Detailed notes, discussed points, or touch summary..."
                    rows={2}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </form>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                  <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
                    {[
                      { id: 'all', label: 'All Events' },
                      { id: 'email', label: '📧 Emails' },
                      { id: 'call', label: '📞 Calls' },
                      { id: 'linkedin', label: '🤝 LinkedIn' },
                      { id: 'note', label: '📝 Notes' },
                      { id: 'status', label: '🚀 Updates' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setTimelineFilterCategory(cat.id as any)}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                          timelineFilterCategory === cat.id
                            ? 'bg-emerald-500 text-slate-950 shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative shrink-0 w-full sm:w-48">
                    <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-500 text-sm">search</span>
                    <input
                      type="text"
                      value={timelineSearchQuery}
                      onChange={(e) => setTimelineSearchQuery(e.target.value)}
                      placeholder="Filter timeline..."
                      className="w-full bg-slate-950 border border-white/10 rounded-lg pl-8 pr-2 py-1 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Chronological Timeline Feed */}
                <div className="relative pl-6 space-y-4 max-h-[340px] overflow-y-auto pr-2 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
                  {getPersonTimelineEvents().length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs bg-slate-900/30 rounded-xl border border-dashed border-white/10">
                      No interactions recorded for {selectedPerson.name} yet. Use the log form above or send an email to create the first entry.
                    </div>
                  ) : (
                    getPersonTimelineEvents().map((ev) => (
                      <div key={ev.id} className="relative group">
                        {/* Timeline Node Bullet */}
                        <div className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full flex items-center justify-center border text-[10px] shadow-md ${ev.badgeBg}`}>
                          <span className="material-symbols-outlined text-[12px]">{ev.icon}</span>
                        </div>

                        {/* Event Content Card */}
                        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 hover:border-emerald-500/40 transition-all space-y-1.5 shadow-md">
                          <div className="flex justify-between items-start gap-2">
                            <div className="font-bold text-white text-xs flex items-center gap-2 flex-wrap">
                              <span>{ev.title}</span>
                              {ev.status && (
                                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                                  {ev.status}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 shrink-0">
                              {ev.date}
                            </div>
                          </div>

                          {ev.description && (
                            <p className="text-slate-300 text-xs leading-relaxed bg-black/40 p-2.5 rounded-lg border border-white/5 font-['Inter'] whitespace-pre-wrap">
                              {ev.description}
                            </p>
                          )}

                          <div className="flex justify-between items-center pt-1 text-[10px] text-slate-500 font-mono">
                            <span className="flex items-center gap-1 text-slate-400">
                              <span className="material-symbols-outlined text-xs">person</span>
                              <span>Logged by {ev.author}</span>
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(ev.description || ev.title);
                              }}
                              className="hover:text-emerald-300 flex items-center gap-1 transition-colors"
                            >
                              <span className="material-symbols-outlined text-xs">content_copy</span>
                              <span>Copy</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 1: DIRECT EMAIL COMPOSER */}
            {personActiveTab === 'email' && (
              <form onSubmit={handleExecuteSendEmail} className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-3.5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <label className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                      <span className="material-symbols-outlined text-indigo-400 text-sm">send</span>
                      <span>Direct Email Composer to {selectedPerson.name}</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleGenerateAiEmailPitch}
                      className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all shrink-0"
                    >
                      <span className="material-symbols-outlined text-sm">auto_awesome</span>
                      <span>⚡ AI Auto-Pitch Generator</span>
                    </button>
                  </div>

                  {/* Mailbox Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">From Mailbox *</label>
                      <select
                        value={emailMailboxId}
                        onChange={(e) => setEmailMailboxId(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                      >
                        {connectedMailboxes.length === 0 ? (
                          <option value="">James Wilson &lt;james.wilson@tryleadsoll.com&gt;</option>
                        ) : (
                          connectedMailboxes.map((mb) => (
                            <option key={mb.id} value={mb.id}>
                              {mb.senderName} &lt;{mb.email}&gt; ({mb.provider})
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">To Recipient *</label>
                      <input
                        type="text"
                        disabled
                        value={`${selectedPerson.name} <${selectedPerson.email}>`}
                        className="w-full bg-slate-950/60 border border-white/5 rounded-xl px-3 py-2 text-slate-300 font-mono text-xs cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Subject Line */}
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-1">Subject Line *</label>
                    <input
                      type="text"
                      required
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="e.g. Partnership & Deliverability optimization for your team"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none font-medium"
                    />
                  </div>

                  {/* Body Textarea */}
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-1">Email Body *</label>
                    <textarea
                      required
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      rows={6}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-3.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none font-['Inter'] leading-relaxed"
                    />
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-xs text-emerald-400">shield</span>
                      <span>SPF / DKIM Authenticated • Delivered via Cold Engine</span>
                    </div>

                    <button
                      type="submit"
                      disabled={isSendingEmail || !emailSubject.trim() || !emailBody.trim()}
                      className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">send</span>
                      <span>{isSendingEmail ? 'Dispatching...' : 'Send Email Now'}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* TAB 2: FOLLOW-UP TASK PLANNER */}
            {personActiveTab === 'followup' && (
              <div className="space-y-4">
                <form onSubmit={handleAddFollowupTask} className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-3">
                  <div className="font-bold text-xs text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-amber-400 text-sm">event_available</span>
                    <span>Schedule Follow-up Touch / Task</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <input
                      type="text"
                      required
                      value={followupTitle}
                      onChange={(e) => setFollowupTitle(e.target.value)}
                      placeholder="Task Title (e.g. Executive check-in call)"
                      className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none col-span-2"
                    />

                    <select
                      value={followupType}
                      onChange={(e) => setFollowupType(e.target.value as any)}
                      className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none font-medium"
                    >
                      <option value="followup">⏰ Follow-up Task</option>
                      <option value="email">📧 Follow-up Email</option>
                      <option value="call">📞 Cold Call / Sync</option>
                      <option value="linkedin">🔗 LinkedIn InMail</option>
                      <option value="note">📝 Note / Observation</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <input
                      type="text"
                      value={followupDate}
                      onChange={(e) => setFollowupDate(e.target.value)}
                      placeholder="Due Date / Time (e.g. Thursday at 11:00 AM)"
                      className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                    />

                    <input
                      type="text"
                      value={followupNotes}
                      onChange={(e) => setFollowupNotes(e.target.value)}
                      placeholder="Action notes or discussion agenda..."
                      className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!followupTitle.trim()}
                      className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">add_task</span>
                      <span>Save Follow-up Task</span>
                    </button>
                  </div>
                </form>

                {/* Tasks List */}
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {(!selectedPerson.customOutreachSteps || selectedPerson.customOutreachSteps.length === 0) ? (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      No follow-up tasks scheduled for {selectedPerson.name} yet.
                    </div>
                  ) : (
                    selectedPerson.customOutreachSteps.map((step) => (
                      <div
                        key={step.id}
                        className={`p-3 rounded-xl border flex justify-between items-center gap-3 transition-all ${
                          step.status === 'Completed'
                            ? 'bg-slate-900/40 border-white/5 line-through text-slate-500'
                            : 'bg-slate-900/90 border-white/10 text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleStepStatus(step.id)}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                              step.status === 'Completed'
                                ? 'bg-green-500 text-slate-950 border-green-400 font-bold text-xs'
                                : 'border-white/20 hover:border-indigo-500 text-transparent'
                            }`}
                          >
                            ✓
                          </button>

                          <div>
                            <div className="font-bold text-xs flex items-center gap-2">
                              <span>Step {step.stepNumber}: {step.title}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                                {step.type}
                              </span>
                            </div>
                            {step.notesOrBody && (
                              <p className="text-[11px] text-slate-400 mt-0.5 no-underline">
                                {step.notesOrBody}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-[10px] font-mono text-slate-400 shrink-0 text-right">
                          {step.completedAt ? `Completed ${step.completedAt}` : `Due: ${step.scheduledDate || 'Today'}`}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: LINKEDIN OUTREACH & TOUCH HUB */}
            {personActiveTab === 'linkedin' && (
              <div className="space-y-4 text-xs font-['Inter']">
                {/* Profile Link Banner */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/60 to-slate-900 border border-blue-500/30 flex justify-between items-center gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center shrink-0">
                      in
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">
                        LinkedIn Profile: {selectedPerson.name}
                      </div>
                      <div className="text-slate-400 text-xs">
                        {selectedPerson.role} at {selectedCompany.name}
                      </div>
                    </div>
                  </div>

                  <a
                    href={selectedPerson.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shrink-0"
                  >
                    <span>Open LinkedIn</span>
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                  </a>
                </div>

                {/* Message Generator */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-white uppercase font-mono text-xs">
                      LinkedIn Copy Generator
                    </label>

                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelectLinkedinMsgType('connection')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all ${
                          linkedinMsgType === 'connection'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-950 text-slate-400 hover:text-white'
                        }`}
                      >
                        Connection Note
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectLinkedinMsgType('inmail')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all ${
                          linkedinMsgType === 'inmail'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-950 text-slate-400 hover:text-white'
                        }`}
                      >
                        InMail Pitch
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={linkedinMsgText}
                    onChange={(e) => setLinkedinMsgText(e.target.value)}
                    rows={4}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-blue-500 focus:outline-none"
                  />

                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {linkedinMsgText.length} characters
                    </span>

                    <button
                      type="button"
                      onClick={handleCopyLinkedinMsg}
                      className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {copiedSuccess ? 'check' : 'content_copy'}
                      </span>
                      <span>{copiedSuccess ? 'Copied to Clipboard!' : 'Copy Message'}</span>
                    </button>
                  </div>
                </div>

                {/* Quick Log Buttons */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
                  <div className="font-bold text-slate-300 text-xs font-mono uppercase">
                    Log LinkedIn Touch Action
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleLogLinkedinTouch('Sent Connection Request')}
                      className="bg-slate-950 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white p-2 rounded-xl text-center text-xs font-semibold transition-all"
                    >
                      🤝 Connection Sent
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLogLinkedinTouch('Sent InMail Pitch')}
                      className="bg-slate-950 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white p-2 rounded-xl text-center text-xs font-semibold transition-all"
                    >
                      ✉️ InMail Dispatched
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLogLinkedinTouch('Liked/Commented on Post')}
                      className="bg-slate-950 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white p-2 rounded-xl text-center text-xs font-semibold transition-all col-span-2 sm:col-span-1"
                    >
                      💬 Liked / Commented
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SEQUENCE */}
            {personActiveTab === 'sequence' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <h4 className="font-bold text-xs text-white uppercase tracking-wider font-mono">
                        Sequence Enrollment for {selectedPerson.name}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Assign or switch campaign sequence specifically for this contact.
                      </p>
                    </div>

                    <select
                      value={selectedPerson.assignedSequenceId || ''}
                      onChange={(e) => handleAssignSequenceToPerson(selectedPerson.id, e.target.value)}
                      className="bg-slate-950 border border-indigo-500/50 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none font-semibold"
                    >
                      <option value="" disabled>Choose Campaign Sequence...</option>
                      {campaigns.map((camp) => (
                        <option key={camp.id} value={camp.id}>
                          {camp.name} ({camp.steps.length} Steps)
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedPerson.assignedSequenceId ? (
                    <div className="pt-3 border-t border-white/5 space-y-3">
                      <div className="flex justify-between items-center text-xs font-semibold text-indigo-300">
                        <span>Active Sequence: {selectedPerson.assignedSequenceName}</span>
                        <span className="text-[10px] font-mono text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded">
                          Current Step: {selectedPerson.currentSequenceStep || 1}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {campaigns
                          .find((c) => c.id === selectedPerson.assignedSequenceId)
                          ?.steps.map((step, idx) => {
                            const isCurrentStep = (selectedPerson.currentSequenceStep || 1) === step.stepNumber;
                            const isCompletedStep = (selectedPerson.currentSequenceStep || 1) > step.stepNumber;

                            return (
                              <div
                                key={step.id || idx}
                                className={`p-3 rounded-xl border transition-all ${
                                  isCurrentStep
                                    ? 'bg-indigo-500/15 border-indigo-500/50 shadow-md shadow-indigo-500/10'
                                    : isCompletedStep
                                    ? 'bg-slate-900/50 border-white/5 opacity-70'
                                    : 'bg-slate-950 border-white/5'
                                }`}
                              >
                                <div className="flex justify-between items-center text-xs font-bold text-white">
                                  <span className="flex items-center gap-2">
                                    <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-mono ${
                                      isCompletedStep ? 'bg-green-500/20 text-green-400' : isCurrentStep ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
                                    }`}>
                                      {isCompletedStep ? '✓' : step.stepNumber}
                                    </span>
                                    <span>{step.title}</span>
                                  </span>

                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono text-slate-400">Day {step.dayDelay}</span>
                                    {isCurrentStep && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleUpdatePersonInCompany({
                                            ...selectedPerson,
                                            currentSequenceStep: (selectedPerson.currentSequenceStep || 1) + 1,
                                          });
                                        }}
                                        className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-[10px] px-2 py-0.5 rounded"
                                      >
                                        Mark Done & Advance Step
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed bg-black/30 p-2 rounded-lg font-['Inter']">
                                  "{step.body}"
                                </p>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-slate-500 text-xs">
                      No sequence assigned to this stakeholder. Select a campaign sequence above to enroll.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: NOTES */}
            {personActiveTab === 'notes' && (
              <div className="space-y-4">
                <form onSubmit={handleAddPersonNoteInModal} className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-3">
                  <label className="block text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Log Note for {selectedPerson.name}
                  </label>
                  <textarea
                    value={personNoteInput}
                    onChange={(e) => setPersonNoteInput(e.target.value)}
                    placeholder="Enter call outcome, objection response, decision timeline, or personal context..."
                    rows={2}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!personNoteInput.trim()}
                      className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">post_add</span>
                      <span>Save Stakeholder Note</span>
                    </button>
                  </div>
                </form>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {selectedCompany.notes?.filter((n) => n.personId === selectedPerson.id).length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      No specific notes recorded for {selectedPerson.name} yet.
                    </div>
                  ) : (
                    selectedCompany.notes
                      ?.filter((n) => n.personId === selectedPerson.id)
                      .map((note) => (
                        <div key={note.id} className="p-3.5 rounded-xl bg-slate-900/90 border border-white/5 space-y-1 text-xs">
                          <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                            <span className="font-bold text-indigo-300">{note.author}</span>
                            <span>{note.createdAt}</span>
                          </div>
                          <p className="text-slate-200">{note.content}</p>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPerson(null)}
                className="px-5 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-semibold hover:bg-white/10 transition-colors"
              >
                Close Workspace
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
