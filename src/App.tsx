import { useState, useEffect } from 'react';
import { TabType, Campaign, Lead, UniboxThread, WarmupDomain, ContactCRM, UserProfile, ConnectedMailbox, CompanyCRM, EmailMessage, CompanyPerson, CompanyNote } from './types';
import {
  INITIAL_CAMPAIGNS,
  INITIAL_LEADS,
  INITIAL_THREADS,
  INITIAL_WARMUP_DOMAINS,
  INITIAL_CRM_CONTACTS,
  INITIAL_USER_PROFILE,
  INITIAL_COMPANIES,
} from './data/initialData';
import {
  subscribeToCompanies,
  saveCompanyToFirestore,
  updateCompanyInFirestore,
  deleteCompanyFromFirestore,
} from './lib/firebase';

import { WebGLBackground } from './components/WebGLBackground';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { OutboxView } from './components/OutboxView';
import { UniboxView } from './components/UniboxView';
import { WarmupView } from './components/WarmupView';
import { CrmView } from './components/CrmView';
import { SettingsView } from './components/SettingsView';
import { ConnectInboxModal } from './components/ConnectInboxModal';
import { AiAuditModal } from './components/AiAuditModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Persistent States
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    const saved = localStorage.getItem('saleshub_campaigns');
    return saved ? JSON.parse(saved) : INITIAL_CAMPAIGNS;
  });

  const [leads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('saleshub_leads');
    return saved ? JSON.parse(saved) : INITIAL_LEADS;
  });

  const [threads, setThreads] = useState<UniboxThread[]>(() => {
    const saved = localStorage.getItem('saleshub_threads');
    return saved ? JSON.parse(saved) : INITIAL_THREADS;
  });

  const [connectedMailboxes, setConnectedMailboxes] = useState<ConnectedMailbox[]>(() => {
    const saved = localStorage.getItem('saleshub_connected_mailboxes');
    return saved ? JSON.parse(saved) : [
      {
        id: 'mb-default-1',
        senderName: 'James Wilson',
        email: 'james.wilson@tryleadsoll.com',
        provider: 'Google Workspace',
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpSecure: false,
        imapHost: 'imap.gmail.com',
        imapPort: 993,
        imapSecure: true,
        status: 'Connected',
        healthScore: 99,
        dailySentCount: 14,
        dailyCap: 100,
      }
    ];
  });

  const [warmupDomains, setWarmupDomains] = useState<WarmupDomain[]>(() => {
    const saved = localStorage.getItem('saleshub_warmup_domains');
    return saved ? JSON.parse(saved) : INITIAL_WARMUP_DOMAINS;
  });

  const [companies, setCompanies] = useState<CompanyCRM[]>(() => {
    const saved = localStorage.getItem('saleshub_companies');
    return saved ? JSON.parse(saved) : INITIAL_COMPANIES;
  });

  // Real-time Firestore sync for lead accounts
  useEffect(() => {
    const unsubscribe = subscribeToCompanies((items) => {
      if (items.length === 0) {
        // Seed Firestore if database is empty
        INITIAL_COMPANIES.forEach((comp) => {
          saveCompanyToFirestore(comp).catch((err) => console.error('Error seeding company:', err));
        });
        setCompanies(INITIAL_COMPANIES);
      } else {
        setCompanies(items);
      }
    });

    return () => unsubscribe();
  }, []);

  const [crmContacts, setCrmContacts] = useState<ContactCRM[]>(() => {
    const saved = localStorage.getItem('saleshub_crm_contacts');
    return saved ? JSON.parse(saved) : INITIAL_CRM_CONTACTS;
  });

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('saleshub_user_profile');
    return saved ? JSON.parse(saved) : INITIAL_USER_PROFILE;
  });

  const [selectedThreadId, setSelectedThreadId] = useState<string>(threads[0]?.id || '');
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Save to LocalStorage on updates
  useEffect(() => {
    localStorage.setItem('saleshub_campaigns', JSON.stringify(campaigns));
  }, [campaigns]);

  useEffect(() => {
    localStorage.setItem('saleshub_threads', JSON.stringify(threads));
  }, [threads]);

  useEffect(() => {
    localStorage.setItem('saleshub_connected_mailboxes', JSON.stringify(connectedMailboxes));
  }, [connectedMailboxes]);

  useEffect(() => {
    localStorage.setItem('saleshub_warmup_domains', JSON.stringify(warmupDomains));
  }, [warmupDomains]);

  useEffect(() => {
    localStorage.setItem('saleshub_companies', JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    localStorage.setItem('saleshub_crm_contacts', JSON.stringify(crmContacts));
  }, [crmContacts]);

  useEffect(() => {
    localStorage.setItem('saleshub_user_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  const handleAddCompany = (newCompany: CompanyCRM) => {
    setCompanies((prev) => [newCompany, ...prev]);
    saveCompanyToFirestore(newCompany).catch((err) => console.error('Error adding company to Firestore:', err));
  };

  const handleUpdateCompany = (updatedCompany: CompanyCRM) => {
    setCompanies((prev) => prev.map((c) => (c.id === updatedCompany.id ? updatedCompany : c)));
    updateCompanyInFirestore(updatedCompany).catch((err) => console.error('Error updating company in Firestore:', err));
  };

  const handleDeleteCompany = (companyId: string) => {
    setCompanies((prev) => prev.filter((c) => c.id !== companyId));
    deleteCompanyFromFirestore(companyId).catch((err) => console.error('Error deleting company from Firestore:', err));
  };

  // Handlers
  const handleAddLeadToCampaign = (lead: Lead) => {
    if (campaigns.length === 0) return;
    const target = campaigns[0];
    const updated = campaigns.map((c) => {
      if (c.id === target.id) {
        return { ...c, totalLeads: c.totalLeads + 1 };
      }
      return c;
    });
    setCampaigns(updated);
    alert(`Added ${lead.name} (${lead.company}) to sequence: "${target.name}"`);
  };

  const handleSendReply = (threadId: string, replyContent: string, mailboxId?: string) => {
    const senderMb = connectedMailboxes.find((m) => m.id === mailboxId) || connectedMailboxes[0];
    const updated = threads.map((t) => {
      if (t.id === threadId) {
        const newMsg = {
          id: `msg-${Date.now()}`,
          sender: senderMb ? `${senderMb.senderName} (${senderMb.email})` : `You (${userProfile.firstName} ${userProfile.lastName})`,
          senderEmail: senderMb ? senderMb.email : userProfile.email,
          recipient: t.senderEmail,
          timestamp: 'Just now',
          isUser: true,
          content: replyContent.split('\n'),
        };
        return {
          ...t,
          category: 'All Inbox' as const,
          preview: `You: ${replyContent.slice(0, 50)}...`,
          messages: [...t.messages, newMsg],
        };
      }
      return t;
    });
    setThreads(updated);
  };

  const handleSyncThreads = (newThreads: UniboxThread[]) => {
    setThreads((prev) => {
      const existingMap = new Map<string, UniboxThread>();
      for (const t of prev) {
        if (t && t.id) {
          existingMap.set(t.id, t);
        }
      }

      const emailToIdMap = new Map<string, string>();
      for (const t of existingMap.values()) {
        if (t.senderEmail) {
          emailToIdMap.set(t.senderEmail.trim().toLowerCase(), t.id);
        }
      }

      for (const nt of newThreads) {
        if (!nt) continue;
        const normEmail = nt.senderEmail ? nt.senderEmail.trim().toLowerCase() : '';
        const targetId = (nt.id && existingMap.has(nt.id))
          ? nt.id
          : (normEmail && emailToIdMap.has(normEmail) ? emailToIdMap.get(normEmail)! : null);

        if (targetId && existingMap.has(targetId)) {
          const existing = existingMap.get(targetId)!;
          const mergedThread: UniboxThread = {
            ...existing,
            ...nt,
            id: targetId,
            messages: nt.messages && nt.messages.length > 0 ? nt.messages : existing.messages,
          };
          existingMap.set(targetId, mergedThread);
        } else if (nt.id) {
          existingMap.set(nt.id, nt);
          if (normEmail) {
            emailToIdMap.set(normEmail, nt.id);
          }
        }
      }

      return Array.from(existingMap.values());
    });
  };

  const handleToggleDomainWarmup = (id: string) => {
    setWarmupDomains((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, status: d.status === 'Active' ? 'Paused' : 'Active' } : d
      )
    );
  };

  const handleUpdateDomainCap = (id: string, cap: number) => {
    setWarmupDomains((prev) =>
      prev.map((d) => (d.id === id ? { ...d, dailyCap: cap } : d))
    );
  };

  const handleMailboxConnected = (newMailbox: ConnectedMailbox) => {
    setConnectedMailboxes((prev) => [newMailbox, ...prev]);

    // Also add to warmup list
    const warmupObj: WarmupDomain = {
      id: `warm-${newMailbox.id}`,
      email: newMailbox.email,
      provider: newMailbox.provider === 'Google Workspace' ? 'Google Workspace' : newMailbox.provider.includes('Outlook') ? 'Outlook / Exchange' : 'SMTP',
      status: 'Active',
      healthScore: 100,
      dailySent: 0,
      dailyCap: 50,
    };
    setWarmupDomains((prev) => [warmupObj, ...prev]);
  };

  const handleAddCrmContact = (contact: ContactCRM) => {
    setCrmContacts((prev) => [contact, ...prev]);
  };

  const handleSendCrmEmail = (
    companyId: string,
    personId: string,
    mailboxId: string,
    subject: string,
    body: string
  ) => {
    const company = companies.find((c) => c.id === companyId);
    const person = company?.people.find((p) => p.id === personId);
    if (!company || !person) return;

    const mailbox = connectedMailboxes.find((mb) => mb.id === mailboxId) || connectedMailboxes[0];
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const existingThread = threads.find((t) => t.senderEmail.toLowerCase() === person.email.toLowerCase());

    const newMessage: EmailMessage = {
      id: `msg-${Date.now()}`,
      sender: mailbox?.senderName || 'James Wilson',
      senderEmail: mailbox?.email || 'james.wilson@tryleadsoll.com',
      recipient: person.email,
      timestamp: nowStr,
      isUser: true,
      content: body.split('\n').filter((l) => l.trim() !== ''),
    };

    if (existingThread) {
      setThreads((prev) =>
        prev.map((t) =>
          t.id === existingThread.id
            ? {
                ...t,
                timestamp: 'Just now',
                preview: `You: ${body.slice(0, 80)}...`,
                messages: [...t.messages, newMessage],
              }
            : t
        )
      );
    } else {
      const newThread: UniboxThread = {
        id: `th-${Date.now()}`,
        senderName: person.name,
        senderInitials: person.initials,
        senderTitle: person.role,
        company: company.name,
        senderEmail: person.email,
        timestamp: 'Just now',
        subject: subject,
        preview: `You: ${body.slice(0, 80)}...`,
        unread: false,
        sentiment: 'High Intent',
        tag: 'CRM Outbound',
        category: 'Requires Reply',
        messages: [newMessage],
      };
      setThreads((prev) => [newThread, ...prev]);
    }

    const updatedPerson: CompanyPerson = {
      ...person,
      status: 'In Sequence',
      customOutreachSteps: [
        {
          id: `step-${Date.now()}`,
          stepNumber: (person.customOutreachSteps?.length || 0) + 1,
          type: 'email',
          title: `Direct Sent: ${subject}`,
          notesOrBody: body,
          status: 'Completed',
          completedAt: `${new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${nowStr}`,
        },
        ...(person.customOutreachSteps || []),
      ],
    };

    const newCompanyNote: CompanyNote = {
      id: `note-${Date.now()}`,
      companyId: company.id,
      author: mailbox?.senderName || 'James Wilson',
      content: `📧 Outbound Email Dispatched to ${person.name} (${person.email}): "${subject}"`,
      createdAt: `${new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${nowStr}`,
      personId: person.id,
      personName: person.name,
    };

    const updatedPeople = company.people.map((p) => (p.id === person.id ? updatedPerson : p));

    const updatedCompany: CompanyCRM = {
      ...company,
      status: 'In Sequence',
      people: updatedPeople,
      notes: [newCompanyNote, ...(company.notes || [])],
    };

    handleUpdateCompany(updatedCompany);
  };

  const unreadCount = threads.filter((t) => t.category === 'Requires Reply').length;

  return (
    <div className="min-h-screen bg-[#131314] text-[#e5e2e3] font-['Inter'] relative overflow-x-hidden selection:bg-blue-500/30 selection:text-white">
      {/* WebGL Canvas Shader Background */}
      <WebGLBackground />

      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        user={userProfile}
        unreadCount={unreadCount}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Header */}
      <Header
        user={userProfile}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        onSearchQuery={() => {}}
      />

      {/* Main Content Stage */}
      <main className="pl-4 md:pl-[246px] pr-4 md:pr-6 pt-18 pb-10 transition-all duration-300">
        <div className="max-w-7xl mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              threads={threads}
              onOpenAuditModal={() => setIsAuditModalOpen(true)}
              onSelectThread={setSelectedThreadId}
              onNavigateTab={(tab) => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'outbox' && (
            <OutboxView connectedMailboxes={connectedMailboxes} />
          )}

          {currentTab === 'unibox' && (
            <UniboxView
              threads={threads}
              selectedThreadId={selectedThreadId}
              connectedMailboxes={connectedMailboxes}
              onSelectThread={setSelectedThreadId}
              onSendReply={handleSendReply}
              onSyncThreads={handleSyncThreads}
            />
          )}

          {currentTab === 'warmup' && (
            <WarmupView
              domains={warmupDomains}
              onToggleDomain={handleToggleDomainWarmup}
              onUpdateCap={handleUpdateDomainCap}
              onOpenConnectModal={() => setIsConnectModalOpen(true)}
            />
          )}

          {currentTab === 'crm' && (
            <CrmView
              companies={companies}
              campaigns={campaigns}
              connectedMailboxes={connectedMailboxes}
              onAddCompany={handleAddCompany}
              onUpdateCompany={handleUpdateCompany}
              onDeleteCompany={handleDeleteCompany}
              onSendCrmEmail={handleSendCrmEmail}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              user={userProfile}
              onUpdateProfile={setUserProfile}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      <ConnectInboxModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onMailboxConnected={handleMailboxConnected}
      />

      <AiAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
      />
    </div>
  );
}

