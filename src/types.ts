export type TabType = 
  | 'dashboard' 
  | 'outbox' 
  | 'unibox' 
  | 'warmup' 
  | 'crm' 
  | 'settings';

export interface OutboundEmail {
  id: string;
  recipientEmail: string;
  recipientName?: string;
  companyName?: string;
  subject: string;
  body: string;
  senderEmail: string;
  mailboxId?: string;
  status: 'Sent' | 'Queued' | 'Scheduled' | 'Failed';
  scheduledTime?: string;
  sentAt?: string;
  createdAt: string;
  errorMessage?: string;
  trackingStats?: {
    opened?: boolean;
    clicked?: boolean;
    replied?: boolean;
  };
}

export interface AgentJob {
  id: string;
  type: 'email_dispatch' | 'health_check' | 'campaign_drip';
  targetEmail?: string;
  campaignId?: string;
  intervalMinutes?: number;
  scheduledTime?: string;
  status: 'Active' | 'Completed' | 'Paused';
  description: string;
  createdAt: string;
  lastRunAt?: string;
  nextRunAt?: string;
  dispatchedCount?: number;
}

export interface CampaignStep {
  id: string;
  stepNumber: number;
  dayDelay: number;
  title: string;
  body: string;
  type: 'email' | 'linkedin' | 'call' | 'wait';
  openRate?: string;
  replyRate?: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: 'Active' | 'Paused' | 'Draft';
  lastActive: string;
  openRate: string;
  replyRate: string;
  totalLeads: number;
  steps: CampaignStep[];
}

export interface Lead {
  id: string;
  name: string;
  initials: string;
  linkedinUrl: string;
  title: string;
  company: string;
  tag: string;
  location: string;
  emailStatus: 'Verified' | 'Pending' | 'Invalid';
  phoneStatus: 'Verified' | 'Pending' | 'Invalid';
  email: string;
  phone: string;
  industry: string;
  companySize: string;
  enriched?: boolean;
  buyingIntentScore?: number;
  keyPainPoints?: string[];
  personalizedHook?: string;
}

export interface EmailMessage {
  id: string;
  sender: string;
  senderEmail: string;
  recipient: string;
  timestamp: string;
  isUser: boolean;
  content: string[];
}

export interface UniboxThread {
  id: string;
  senderName: string;
  senderInitials: string;
  senderTitle: string;
  company: string;
  senderEmail: string;
  timestamp: string;
  subject: string;
  preview: string;
  unread: boolean;
  sentiment: 'Positive' | 'High Intent' | 'Review' | 'OOO';
  tag: string;
  category: 'All Inbox' | 'Requires Reply' | 'Meeting Booked';
  messages: EmailMessage[];
}

export interface ConnectedMailbox {
  id: string;
  senderName: string;
  email: string;
  provider: 'Google Workspace' | 'Microsoft 365 / Outlook' | 'Zoho Mail' | 'Custom SMTP / IMAP';
  appPassword?: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  status: 'Connected' | 'Error' | 'Warmup Active';
  healthScore: number;
  dailySentCount: number;
  dailyCap: number;
  lastSyncedAt?: string;
  errorMessage?: string;
}

export interface WarmupDomain {
  id: string;
  email: string;
  provider: 'Google Workspace' | 'Outlook / Exchange' | 'SMTP';
  status: 'Active' | 'Paused';
  healthScore: number;
  dailySent: number;
  dailyCap: number;
}

export interface PersonOutreachStep {
  id: string;
  stepNumber: number;
  type: 'email' | 'linkedin' | 'call' | 'note' | 'followup';
  title: string;
  notesOrBody?: string;
  status: 'Pending' | 'Completed' | 'Skipped';
  scheduledDate?: string;
  completedAt?: string;
}

export interface CompanyPerson {
  id: string;
  companyId: string;
  name: string;
  initials: string;
  role: string;
  email: string;
  linkedinUrl: string;
  phone?: string;
  avatar?: string;
  status: 'Target' | 'In Sequence' | 'Replied' | 'Meeting Booked' | 'Cold' | 'Opted Out';
  buyingRole?: 'Economic Buyer' | 'Champion' | 'Evaluator' | 'End User' | 'Blocker';
  engagementScore?: number;
  assignedSequenceId?: string;
  assignedSequenceName?: string;
  currentSequenceStep?: number;
  customOutreachSteps?: PersonOutreachStep[];
}

export interface CompanyNote {
  id: string;
  companyId: string;
  author: string;
  content: string;
  createdAt: string;
  personId?: string;
  personName?: string;
}

export interface CompanyCRM {
  id: string;
  name: string;
  initials: string;
  logo?: string;
  linkedinUrl: string;
  webUrl: string;
  employeeSize: string;
  industry: string;
  context: string;
  status: 'Target' | 'In Sequence' | 'Customer' | 'Cold';
  tier?: 'Tier 1' | 'Tier 2' | 'Tier 3';
  intentScore?: number;
  intentSignal?: string;
  icpMatchScore?: number;
  techStack?: string[];
  accountOwner?: string;
  buyingStage?: 'Prospecting' | 'Engaging' | 'Qualified' | 'Opportunity' | 'Closed Won';
  sentiment?: 'Positive' | 'Neutral' | 'Negative';
  painPoints?: string;
  valueProposition?: string;
  location: string;
  timezone: string;
  createdAt: string;
  assignedSequenceId?: string;
  assignedSequenceName?: string;
  sequenceStatus?: 'Active' | 'Paused' | 'Not Started' | 'Completed';
  people: CompanyPerson[];
  notes: CompanyNote[];
}

export interface ContactCRM {
  id: string;
  name: string;
  initials: string;
  avatar?: string;
  role: string;
  company: string;
  status: 'Customer' | 'Warm Lead' | 'Cold';
  lastContacted: string;
  location: string;
  timezone: string;
  recentActivities: {
    title: string;
    time: string;
    type: 'email' | 'call' | 'meeting';
    subtext?: string;
  }[];
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  timezone: string;
  avatarUrl: string;
  darkModeEnforced: boolean;
  compactTableDensity: boolean;
}

export interface AuditResult {
  domain: string;
  healthScore: number;
  status: string;
  spfStatus: string;
  dkimStatus: string;
  dmarcStatus: string;
  blacklistStatus: string;
  recommendations: string[];
}
