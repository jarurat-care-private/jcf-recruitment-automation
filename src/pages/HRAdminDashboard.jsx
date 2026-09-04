// pages/HRAdminDashboard.jsx - WITH SUPPORT HUB IN SIDEBAR
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RegisterUser from '../components/RegisterUser';
import ChangePasswordModal from '../components/ChangePasswordModal';
import HRRegisterCandidate from '../components/HRRegisterCandidate';
import GoogleCalendar from '../components/GoogleCalendar';
import DomainManagement from '../components/DomainManagement';
import HRAdminAnalytics from '../components/HRAdminAnalytics';
import QuestionsPage from '../pages/QuestionsPage';

// ===== FALLBACK DOMAIN LINKS =====
const FALLBACK_DOMAIN_LINKS = {
  "Automation & Operations": "https://docs.google.com/document/d/1Fx6qmrIjls92CKTHZPzLUemFZHVcsxOlnPeU48vUes0/edit?usp=drive_link",
  "Brand Management & Outreach": "https://docs.google.com/document/d/1nR3M-RTkETWXoR89_DqVaOlbU4cFPM38oNshL9DekII/edit?usp=drive_link",
  "Business Development": "https://docs.google.com/document/d/1gXY9DXjR5ddvs3FWzytbkPBqpovVMvYL-mREV8/edit?usp=drive_link",
  "Clinical Psychologist": "https://docs.google.com/document/d/1zUT32sAcXiWuzy-F49eUXmnOn_o_3nUF41mH1USI7Lc/edit?usp=drive_link",
  "Content Creation": "https://docs.google.com/document/d/1VLxlCu67y_QUFEnypeVhdJQjOsbAub-pezFEH1PxU0o/edit?usp=drive_link",
  "Creative Design": "https://docs.google.com/document/d/1Jx5y6G-gQ0TOcxRRzJ4DODuJl840nohAM3CK0wjA3NU/edit?usp=drive_link",
  "Graphic Design": "https://docs.google.com/document/d/1IDzwWvQHkIF2eFdWHCqtoMlRtTxTR7CRgnBVfyRtiG0/edit?usp=drive_link",
  "HR Psychologist": "https://docs.google.com/document/d/1-KzoBvfOGGvPOwVYWsc9g0D18um3Z4NVd2uiPXv3tWA/edit?usp=drive_link",
  "Human Resources (HR)": "https://docs.google.com/document/d/1c3ad6UexWzChlKCnRL0VVdHfwe3LUy3TYI4Dpv9dT6g/edit?usp=drive_link",
  "Lead Generation": "https://docs.google.com/document/d/1kSBmHXirw-0MhjdCsThcoAOxcHYG3dRUhWHNRpGXRs4/edit?usp=drive_link",
  "Marketing": "https://docs.google.com/document/d/1nm_8xBVtPdBCcnjiDEYlbXBUHTWC3bLAWzM_lCAL4hE/edit?usp=drive_link",
  "Media & Public Relations (PR)": "https://docs.google.com/document/d/1a80WOdBq23d9AYqg_OsySG8QKTUNNk85YSH7x1LvvUM/edit?usp=drive_link",
  "Motion Graphics": "https://docs.google.com/document/d/1QPn2gMvpzFJle6MnsZJd_o07uBZCpp4I5FlrbT0XMIU/edit?usp=drive_link",
  "Operations": "https://docs.google.com/document/d/1KVJ15x6PMZHfbk2W4XCMHPNgthr1au6Q2-70QoKTQm4ZI/edit?usp=drive_link",
  "Project Management": "https://docs.google.com/document/d/1ghbQs8PoPkAfEV5oJ8bRStmIXrO6334NsADa-X88vVY/edit?usp=drive_link",
  "Python Automation": "https://docs.google.com/document/d/1DVcbbnkZPqiPXDc-6ipx_0oTj8Q_THnnK22uOEV2U6w/edit?usp=drive_link",
  "Sales and Marketing": "https://docs.google.com/document/d/1HbS-_TnnqycKi0bQ4A-7mRKGBXZkOhIHbX2PpypQKPg/edit?usp=drive_link",
  "Social Media Management": "https://docs.google.com/document/d/133F3YzYtOWAuqb_-AQQ6MmRYryLX51Q0nmSHqBHEdgw/edit?usp=drive_link",
  "Talent Acquisition": "https://docs.google.com/document/d/1sFXAja3ka1-gqyCKfot112CFCzBPiROtEjEpnswG0Jc/edit?usp=sharing",
  "Video Editing/Making": "https://docs.google.com/document/d/14BUj5SO1ZNyqXtd2MM1lxMkXeMwvtY8rb39m2c_Wh74/edit?usp=drive_link",
  "UI/UX Design": "https://docs.google.com/document/d/1Zs3Jo35y8USq4plJi4FLdk0Ufjxli0hKOvBteE62DnA/edit?usp=drive_link",
  "Full stack Developer": "https://docs.google.com/document/d/1ksB6T-I1nUd49ENcaECLPh6aKlYFx4wyBTk1Tp5tDmg/edit?usp=sharing"
};

function HRAdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userName, userRole, canRegisterUsers, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showRegisterCandidateModal, setShowRegisterCandidateModal] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  
  // Domain Management state
  const [showDomainManagement, setShowDomainManagement] = useState(false);
  const [domainLinks, setDomainLinks] = useState(FALLBACK_DOMAIN_LINKS);
  
  // Bulk assignment states
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [bulkAssignProgress, setBulkAssignProgress] = useState({ current: 0, total: 0, success: 0, failed: 0, errors: [] });
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkCandidates, setBulkCandidates] = useState([]);
  const [bulkMissingDomains, setBulkMissingDomains] = useState([]);
  const [showDomainList, setShowDomainList] = useState(false);
  
  const [metrics, setMetrics] = useState({ 
    total: 0, 
    applied: 0, 
    assignment: 0, 
    interview: 0, 
    selected: 0, 
    rejected: 0, 
    'on hold': 0, 
    probation: 0, 
    'onboarding done': 0, 
    'internship discontinued': 0,
    withdrawn: 0,
    waitlist: 0,
    terminated: 0
  });

  const stageColors = {
    'Applied': '#94a3b8',
    'Assignment': '#fbbf24',
    'Interview': '#c084fc',
    'On Hold': '#fcd34d',
    'Selected': '#818cf8',
    'Probation': '#60a5fa',
    'Onboarding Done': '#34d399',
    'Waitlist': '#a78bfa',
    'Withdrawn': '#a78bfa',
    'Internship Discontinued': '#fb923c',
    'Terminated': '#f87171',
    'Rejected': '#f87171'
  };

  // ===== SIDEBAR NAVIGATION ITEMS - ADDED SUPPORT HUB =====
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '▣' },
    { id: 'analytics', label: 'Analytics', icon: '▤' },
    { id: 'calendar', label: 'Calendar', icon: '▥' },
    { id: 'support', label: 'Support Hub', icon: '▥' },
    { id: 'dispatch', label: 'Assignment Dispatch', icon: '▦' },
  ];

  // ===== DETERMINE ACTIVE TAB BASED ON URL =====
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/analytics') {
      setActiveTab('analytics');
    } else if (path === '/calendar') {
      setActiveTab('calendar');
    } else if (path === '/questions') {
      setActiveTab('support');
    } else if (path === '/hr-dashboard') {
      setActiveTab('dashboard');
    } else {
      setActiveTab('dashboard');
    }
  }, [location]);

  useEffect(() => {
    const storedEmail = localStorage.getItem('hrEmail');
    if (!storedEmail && !user) {
      navigate('/hr-login');
      return;
    }
    fetchDashboardData();
    fetchDomainLinks();
  }, []);

  // ===== FETCH DOMAIN LINKS =====
  async function fetchDomainLinks() {
    try {
      const { data, error } = await supabase
        .from('assignment_templates')
        .select('domain, assignment_link');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const linksMap = {};
        data.forEach(item => {
          linksMap[item.domain] = item.assignment_link;
        });
        setDomainLinks(linksMap);
        return linksMap;
      }
      return FALLBACK_DOMAIN_LINKS;
    } catch (err) {
      console.error('Error fetching domain links:', err);
      return FALLBACK_DOMAIN_LINKS;
    }
  }

  async function fetchDashboardData() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const list = data || [];
      setCandidates(list);

      const counts = { 
        total: list.length, 
        applied: 0, 
        assignment: 0, 
        interview: 0, 
        selected: 0, 
        rejected: 0, 
        'on hold': 0, 
        probation: 0, 
        'onboarding done': 0, 
        'internship discontinued': 0,
        withdrawn: 0,
        waitlist: 0,
        terminated: 0
      };

      list.forEach(c => {
        const stage = c.current_stage?.toLowerCase();
        if (Object.prototype.hasOwnProperty.call(counts, stage)) {
          counts[stage]++;
        }
      });
      setMetrics(counts);
    } catch (err) {
      console.error('Error fetching dashboard records:', err);
    } finally {
      setLoading(false);
    }
  }

  // ===== LOG ACTIVITY HELPER =====
  async function logTeamActivity(action, entityType, entityId, details = {}) {
    const hrUser = localStorage.getItem('hrEmail') || 'system';
    const hrName = localStorage.getItem('userName') || 'System';
    const hrRole = localStorage.getItem('userRole') || 'leadership';
    const hrTeam = localStorage.getItem('userTeam') || 'leadership';

    try {
      await supabase
        .from('team_activity_log')
        .insert({
          user_email: hrUser,
          user_name: hrName,
          user_role: hrRole,
          team: hrTeam,
          action: action,
          entity_type: entityType,
          entity_id: entityId,
          details: details
        });
      console.log(`Activity logged: ${action}`, details);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }

  // ===== OPEN BULK CONFIRMATION =====
  async function openBulkConfirmation() {
    const currentDomainLinks = await fetchDomainLinks();
    const appliedCandidates = candidates.filter(c => c.current_stage === 'Applied');
    
    if (appliedCandidates.length === 0) {
      alert('No candidates in the "Applied" stage to dispatch assignments to.');
      return;
    }

    const missingDomains = [...new Set(
      appliedCandidates
        .filter(c => !currentDomainLinks || !currentDomainLinks[c.domain])
        .map(c => c.domain)
    )];

    setBulkCandidates(appliedCandidates);
    setBulkMissingDomains(missingDomains);
    setShowBulkConfirm(true);
  }

  // ===== EXECUTE BULK DISPATCH =====
  async function executeBulkDispatch() {
    const currentDomainLinks = await fetchDomainLinks();
    
    setShowBulkConfirm(false);
    setBulkAssigning(true);
    setBulkAssignProgress({ 
      current: 0, 
      total: bulkCandidates.length, 
      success: 0, 
      failed: 0, 
      errors: [] 
    });

    let successCount = 0;
    let failedCount = 0;
    const errors = [];
    const currentUser = localStorage.getItem('hrEmail') || localStorage.getItem('userEmail') || 'System Admin';
    const currentUserName = localStorage.getItem('userName') || 'HR';

    for (let i = 0; i < bulkCandidates.length; i++) {
      const candidate = bulkCandidates[i];
      setBulkAssignProgress(prev => ({ ...prev, current: i + 1 }));

      try {
        const mappedTemplateLink = currentDomainLinks ? currentDomainLinks[candidate.domain] : null;
        
        if (!mappedTemplateLink) {
          failedCount++;
          errors.push(`Candidate ${candidate.name || candidate.full_name}: No template mapped for domain "${candidate.domain}"`);
          setBulkAssignProgress(prev => ({ ...prev, failed: failedCount, errors: [...errors] }));
          continue;
        }

        const deadlineTime = new Date();
        deadlineTime.setDate(deadlineTime.getDate() + 2);

        const { data: existingAssignment } = await supabase
          .from('assignments')
          .select('id')
          .eq('candidate_id', candidate.id)
          .maybeSingle();

        let assignmentResult;
        if (existingAssignment) {
          const { data, error } = await supabase
            .from('assignments')
            .update({
              assignment_title: `${candidate.domain} Core Assignment Challenge`,
              task_link_template: mappedTemplateLink,
              deadline: deadlineTime.toISOString(),
              assignment_status: 'Assigned',
              sent_by: currentUser,
              sent_date: new Date().toISOString()
            })
            .eq('candidate_id', candidate.id)
            .select();
          
          if (error) throw error;
          assignmentResult = data;
        } else {
          const { data, error } = await supabase
            .from('assignments')
            .insert({
              candidate_id: candidate.id,
              assignment_title: `${candidate.domain} Core Assignment Challenge`,
              task_link_template: mappedTemplateLink,
              deadline: deadlineTime.toISOString(),
              assignment_status: 'Assigned',
              sent_by: currentUser,
              sent_date: new Date().toISOString()
            })
            .select();
          
          if (error) throw error;
          assignmentResult = data;
        }

        const { error: updateError } = await supabase
          .from('candidates')
          .update({ current_stage: 'Assignment' })
          .eq('id', candidate.id);

        if (updateError) throw updateError;

        await logTeamActivity(
          'assignment_bulk_dispatched',
          'assignment',
          assignmentResult?.[0]?.id || candidate.id,
          {
            candidate_id: candidate.id,
            candidate_name: candidate.name || candidate.full_name,
            domain: candidate.domain,
            deadline: deadlineTime.toISOString(),
            sent_by: currentUserName,
            bulk_dispatch: true,
            batch_index: i + 1,
            total_batch: bulkCandidates.length
          }
        );

        successCount++;
        setBulkAssignProgress(prev => ({ ...prev, success: successCount }));

      } catch (error) {
        failedCount++;
        const errorMsg = `Candidate ${candidate.name || candidate.full_name}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`Failed to dispatch assignment for ${candidate.name}:`, error);
        setBulkAssignProgress(prev => ({ ...prev, failed: failedCount, errors: [...errors] }));
      }
    }

    setBulkAssignProgress(prev => ({ 
      ...prev, 
      current: prev.total, 
      success: successCount, 
      failed: failedCount, 
      errors 
    }));
    
    setBulkAssigning(false);
    await fetchDashboardData();
  }

  // ===== HANDLE DOMAIN ADDED =====
  async function handleDomainAdded() {
    await fetchDomainLinks();
    await fetchDashboardData();
  }

  const filteredCandidates = candidates.filter((candidate) => {
    const nameMatch = (candidate.name || candidate.full_name || '').toLowerCase().includes(search.toLowerCase());
    const domainMatch = domainFilter === '' || candidate.domain === domainFilter;
    const stageMatch = stageFilter === '' || candidate.current_stage === stageFilter;
    return nameMatch && domainMatch && stageMatch;
  });

  const uniqueDomains = [...new Set(candidates.map(c => c.domain).filter(Boolean))].sort((a, b) => a.localeCompare(b));

  const handleLogout = async () => {
    await logout();
    navigate('/hr-login');
  };

  const handleRegistrationSuccess = (newUser) => {
    setRegistrationSuccess(`${newUser.name} registered successfully!`);
    setTimeout(() => setRegistrationSuccess(null), 5000);
    setShowRegisterModal(false);
  };

  const handleCandidateRegistrationSuccess = (newCandidate) => {
    setRegistrationSuccess(`${newCandidate.name} registered as candidate!`);
    setTimeout(() => setRegistrationSuccess(null), 5000);
    fetchDashboardData();
    setShowRegisterCandidateModal(false);
  };

  const handleNavClick = (item) => {
    if (item.id === 'dashboard') {
      setActiveTab('dashboard');
      navigate('/hr-dashboard');
    } else if (item.id === 'analytics') {
      setActiveTab('analytics');
      navigate('/analytics');
    } else if (item.id === 'calendar') {
      setActiveTab('calendar');
      navigate('/calendar');
    } else if (item.id === 'support') {
      setActiveTab('support');
      navigate('/questions');
    } else if (item.id === 'dispatch') {
      openBulkConfirmation();
    }
  };

  // ===== CLOSE ALL MODALS =====
  const closeAllModals = () => {
    setShowRegisterModal(false);
    setShowChangePassword(false);
    setShowRegisterCandidateModal(false);
    setShowDomainManagement(false);
    setShowBulkConfirm(false);
    setShowDomainList(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a1a' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid rgba(255, 255, 255, 0.1)', borderTop: '4px solid #4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '500' }}>Loading Workspace...</p>
        </div>
      </div>
    );
  }

  const kpiData = [
    { label: 'APPLIED', count: metrics.applied, color: '#94a3b8', filterValue: 'Applied' },
    { label: 'ASSIGNMENT', count: metrics.assignment, color: '#fbbf24', filterValue: 'Assignment' },
    { label: 'INTERVIEW', count: metrics.interview, color: '#c084fc', filterValue: 'Interview' },
    { label: 'ON HOLD', count: metrics['on hold'], color: '#fcd34d', filterValue: 'On Hold' },
    { label: 'SELECTED', count: metrics.selected, color: '#818cf8', filterValue: 'Selected' },
    { label: 'PROBATION', count: metrics.probation, color: '#60a5fa', filterValue: 'Probation' },
    { label: 'ONBOARDING', count: metrics['onboarding done'], color: '#34d399', filterValue: 'Onboarding Done' },
    { label: 'WAITLIST', count: metrics.waitlist, color: '#a78bfa', filterValue: 'Waitlist' },
    { label: 'WITHDRAWN', count: metrics.withdrawn, color: '#a78bfa', filterValue: 'Withdrawn' },
    { label: 'DISCONTINUED', count: metrics['internship discontinued'], color: '#fb923c', filterValue: 'Internship Discontinued' },
    { label: 'TERMINATED', count: metrics.terminated, color: '#f87171', filterValue: 'Terminated' },
    { label: 'REJECTED', count: metrics.rejected, color: '#f87171', filterValue: 'Rejected' }
  ];

  const displayName = userName || user?.name || localStorage.getItem('userName') || 'HR User';
  const displayRole = userRole || localStorage.getItem('userRole') || 'team_member';

  const inputStyle = {
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#e2e8f0',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
    minWidth: '280px',
    flex: 1
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer',
    minWidth: '140px',
    flex: '0 0 auto'
  };

  const appliedCount = metrics.applied || 0;

  // ===== DOMAIN LIST MODAL =====
  const DomainListModal = () => {
    if (!showDomainList) return null;

    const domainSet = [...new Set(bulkCandidates.map(c => c.domain))];
    const mappedDomains = domainSet.filter(d => domainLinks && domainLinks[d]);
    const missingDomains = domainSet.filter(d => !domainLinks || !domainLinks[d]);

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}
        onClick={() => setShowDomainList(false)}
      >
        <div
          className="glass-panel"
          style={{
            padding: '32px',
            maxWidth: '420px',
            width: '100%',
            maxHeight: '70vh',
            overflowY: 'auto',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ color: '#fff', margin: 0, fontSize: '18px' }}>
              Domains ({domainSet.length})
            </h3>
            <button
              onClick={() => setShowDomainList(false)}
              className="btn-glass"
              style={{ padding: '4px 12px', fontSize: '16px' }}
            >
              ✕
            </button>
          </div>
          
          <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '16px',
            padding: '12px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ color: '#6ee7b7', fontSize: '18px', fontWeight: '700' }}>{mappedDomains.length}</div>
              <div style={{ color: '#94a3b8', fontSize: '11px' }}>Mapped</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ color: '#fca5a5', fontSize: '18px', fontWeight: '700' }}>{missingDomains.length}</div>
              <div style={{ color: '#94a3b8', fontSize: '11px' }}>Missing</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {domainSet.map((domain, index) => {
              const isMapped = !!(domainLinks && domainLinks[domain]);
              return (
                <div
                  key={index}
                  style={{
                    padding: '10px 14px',
                    background: isMapped ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                    borderRadius: '8px',
                    border: `1px solid ${isMapped ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
                    color: '#e2e8f0',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span style={{ 
                    color: '#94a3b8', 
                    fontSize: '11px', 
                    fontWeight: '600',
                    minWidth: '28px'
                  }}>
                    #{index + 1}
                  </span>
                  <span style={{ flex: 1 }}>{domain}</span>
                  <span style={{ 
                    fontSize: '11px', 
                    fontWeight: '600',
                    color: isMapped ? '#6ee7b7' : '#fca5a5'
                  }}>
                    {isMapped ? 'Mapped' : 'Missing'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ===== BULK CONFIRMATION MODAL =====
  const BulkConfirmModal = () => {
    if (!showBulkConfirm) return null;
    
    const totalCandidates = bulkCandidates.length;
    const domainSet = [...new Set(bulkCandidates.map(c => c.domain))];
    const hasMissingDomains = bulkMissingDomains.length > 0;
    const mappedCount = domainSet.filter(d => domainLinks && domainLinks[d]).length;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}>
        <div className="glass-panel" style={{
          padding: '40px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto'
        }}>
          <h2 style={{ color: '#fff', margin: '0 0 8px 0', fontSize: '22px' }}>
            Bulk Dispatch Assignments
          </h2>
          <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
            You are about to send assignments to {totalCandidates} candidate(s) in the "Applied" stage.
          </p>

          <div style={{
            background: 'rgba(255,255,255,0.03)',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.08)',
            marginBottom: '24px'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              padding: '10px 0',
              borderBottom: '1px solid rgba(255,255,255,0.06)'
            }}>
              <span style={{ color: '#94a3b8' }}>Total Candidates</span>
              <span style={{ color: '#fff', fontWeight: '700' }}>{totalCandidates}</span>
            </div>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '10px 0',
              borderBottom: '1px solid rgba(255,255,255,0.06)'
            }}>
              <span style={{ color: '#94a3b8' }}>Domains Covered</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#fff', fontWeight: '700' }}>{domainSet.length}</span>
                <button
                  onClick={() => setShowDomainList(true)}
                  style={{
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '6px',
                    color: '#60a5fa',
                    padding: '4px 14px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => { 
                    e.target.style.background = 'rgba(59, 130, 246, 0.25)';
                  }}
                  onMouseLeave={(e) => { 
                    e.target.style.background = 'rgba(59, 130, 246, 0.15)';
                  }}
                >
                  View All →
                </button>
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '10px 0'
            }}>
              <span style={{ color: '#94a3b8' }}>Templates Found</span>
              <span style={{ 
                color: mappedCount === domainSet.length ? '#6ee7b7' : '#fbbf24', 
                fontWeight: '700'
              }}>
                {mappedCount}/{domainSet.length}
              </span>
            </div>

            {hasMissingDomains && (
              <div style={{ 
                marginTop: '16px',
                padding: '14px',
                background: 'rgba(239, 68, 68, 0.08)',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.15)'
              }}>
                <span style={{ color: '#fca5a5', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                  Missing templates for:
                </span>
                <span style={{ color: '#f87171', fontWeight: '600', fontSize: '14px' }}>
                  {bulkMissingDomains.join(', ')}
                </span>
                <span style={{ color: '#fca5a5', fontSize: '12px', display: 'block', marginTop: '6px' }}>
                  Candidates with these domains will be skipped.
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={executeBulkDispatch}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
                color: '#000',
                fontWeight: '700',
                fontSize: '15px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontFamily: 'inherit'
              }}
              onMouseEnter={(e) => { e.target.style.transform = 'scale(1.02)'; }}
              onMouseLeave={(e) => { e.target.style.transform = 'scale(1)'; }}
            >
              Confirm Dispatch
            </button>
            <button
              onClick={() => setShowBulkConfirm(false)}
              className="btn-glass"
              style={{ flex: 1, padding: '14px', fontFamily: 'inherit' }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Determine current page content based on URL path
  const currentPath = window.location.pathname;
  const isAnalyticsPage = currentPath === '/analytics';
  const isCalendarPage = currentPath === '/calendar';
  const isSupportPage = currentPath === '/questions';

  return (
    <>
      <div className="aurora-bg" style={{ opacity: 0.4 }}></div>
      <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", background: '#0a0a1a' }}>
        
        {/* ===== SIDEBAR - HOVER TRIGGERED ===== */}
        <div
          onMouseEnter={() => setIsSidebarHovered(true)}
          onMouseLeave={() => setIsSidebarHovered(false)}
          style={{
            width: isSidebarHovered ? '240px' : '0px',
            height: '100vh',
            position: 'fixed',
            top: 0,
            left: 0,
            background: 'rgba(20, 20, 40, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRight: isSidebarHovered ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
            transition: 'width 0.3s ease, border 0.3s ease',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: isSidebarHovered ? '4px 0 30px rgba(0,0,0,0.3)' : 'none'
          }}
        >
          {/* Logo / Header */}
          <div style={{
            padding: isSidebarHovered ? '20px 24px' : '20px 10px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            justifyContent: 'center',
            minHeight: '72px',
            opacity: isSidebarHovered ? 1 : 0,
            transition: 'opacity 0.2s ease'
          }}>
            <img src="/jarurat-logo.png" alt="Logo" style={{ height: '32px', width: '32px', objectFit: 'contain' }} />
            <span style={{ color: '#fff', fontSize: '16px', fontWeight: '700', whiteSpace: 'nowrap' }}>Jarurat Care</span>
          </div>

          {/* Navigation Items */}
          <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px', opacity: isSidebarHovered ? 1 : 0, transition: 'opacity 0.2s ease' }}>
            {navItems.map((item) => {
              const isActive = 
                (item.id === 'dashboard' && !isAnalyticsPage && !isCalendarPage && !isSupportPage) ||
                (item.id === 'analytics' && isAnalyticsPage) ||
                (item.id === 'calendar' && isCalendarPage) ||
                (item.id === 'support' && isSupportPage);
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    width: '100%',
                    border: 'none',
                    background: isActive
                      ? 'rgba(59, 130, 246, 0.15)'
                      : 'transparent',
                    color: isActive
                      ? '#60a5fa'
                      : '#94a3b8',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    justifyContent: 'flex-start',
                    fontSize: '14px',
                    fontWeight: isActive ? '600' : '500',
                    fontFamily: 'inherit',
                    whiteSpace: 'nowrap',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.color = '#e2e8f0';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#94a3b8';
                    }
                  }}
                >
                  <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>{item.icon}</span>
                  <span>{item.label}</span>
                  {item.id === 'dispatch' && appliedCount > 0 && (
                    <span style={{
                      marginLeft: 'auto',
                      background: 'rgba(245, 158, 11, 0.2)',
                      color: '#fbbf24',
                      padding: '1px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      {appliedCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Profile & Actions */}
          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            opacity: isSidebarHovered ? 1 : 0,
            transition: 'opacity 0.2s ease'
          }}>
            {/* User Info */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '4px 0'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '700',
                flexShrink: 0
              }}>
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', whiteSpace: 'nowrap' }}>
                  {displayName}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                  {displayRole.replace('_', ' ')}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {canRegisterUsers() && (
                <button
                  onClick={() => {
                    closeAllModals();
                    setShowDomainManagement(true);
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    background: 'rgba(139, 92, 246, 0.08)',
                    color: '#c084fc',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                    width: '100%'
                  }}
                  onMouseEnter={(e) => { e.target.style.background = 'rgba(139, 92, 246, 0.15)'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'rgba(139, 92, 246, 0.08)'; }}
                >
                  Manage Domains
                </button>
              )}
              {canRegisterUsers() && (
                <button
                  onClick={() => {
                    closeAllModals();
                    setShowRegisterModal(true);
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#e2e8f0',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                    width: '100%'
                  }}
                  onMouseEnter={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.1)'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                >
                  Register HR
                </button>
              )}
              {canRegisterUsers() && (
                <button
                  onClick={() => {
                    closeAllModals();
                    setShowRegisterCandidateModal(true);
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid rgba(16, 185, 129, 0.15)',
                    background: 'rgba(16, 185, 129, 0.05)',
                    color: '#34d399',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                    width: '100%'
                  }}
                  onMouseEnter={(e) => { e.target.style.background = 'rgba(16, 185, 129, 0.1)'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'rgba(16, 185, 129, 0.05)'; }}
                >
                  Register Candidate
                </button>
              )}
              <button
                onClick={() => {
                  closeAllModals();
                  setShowChangePassword(true);
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#e2e8f0',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  width: '100%'
                }}
                onMouseEnter={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.1)'; }}
                onMouseLeave={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.05)'; }}
              >
                Change Password
              </button>
              <button
                onClick={handleLogout}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  background: 'rgba(239, 68, 68, 0.05)',
                  color: '#f87171',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  width: '100%'
                }}
                onMouseEnter={(e) => { e.target.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                onMouseLeave={(e) => { e.target.style.background = 'rgba(239, 68, 68, 0.05)'; }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* ===== SIDEBAR TRIGGER AREA - ALWAYS VISIBLE ===== */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '15px',
            height: '100vh',
            zIndex: 99,
            cursor: 'pointer',
            background: 'rgba(79, 70, 229, 0.08)',
            borderRight: '1px solid rgba(79, 70, 229, 0.15)',
          }}
          onMouseEnter={() => setIsSidebarHovered(true)}
        />

        {/* ===== MAIN CONTENT ===== */}
        <div style={{
          marginLeft: isSidebarHovered ? '240px' : '0px',
          flex: 1,
          padding: '40px 50px',
          transition: 'margin-left 0.3s ease',
          minHeight: '100vh',
          position: 'relative',
          zIndex: 1
        }}>
          {/* Registration Success Message */}
          {registrationSuccess && (
            <div style={{
              padding: '16px 24px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.15)',
              color: '#6ee7b7',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backdropFilter: 'blur(10px)'
            }}>
              {registrationSuccess}
            </div>
          )}

          {/* Show different content based on URL path */}
          {isAnalyticsPage ? (
            <HRAdminAnalytics />
          ) : isCalendarPage ? (
            <GoogleCalendar />
          ) : isSupportPage ? (
            <QuestionsPage />
          ) : (
            // Dashboard content
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <h1 style={{ color: '#fff', fontWeight: '800', fontSize: '36px', letterSpacing: '-1px', margin: 0 }}>
                  Workspace Overview
                </h1>
              </div>

              {/* Bulk Assignment Progress Bar */}
              {bulkAssigning && (
                <div style={{
                  padding: '20px 24px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  marginBottom: '24px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: '#fff', fontWeight: '600' }}>
                      Dispatching Assignments... 
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '14px' }}>
                      {bulkAssignProgress.success} successful, {bulkAssignProgress.failed} failed
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '6px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${(bulkAssignProgress.current / bulkAssignProgress.total) * 100}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                      borderRadius: '3px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '13px', color: '#94a3b8' }}>
                    {bulkAssignProgress.current} of {bulkAssignProgress.total} processed
                  </div>
                </div>
              )}
              
              {/* KPI Cards - 6 columns grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '30px' }}>
                {kpiData.map(m => (
                  <div 
                    key={m.label} 
                    onClick={() => setStageFilter(m.filterValue)} 
                    style={{ 
                      background: stageFilter === m.filterValue ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)', 
                      padding: '16px 12px', 
                      borderRadius: '12px', 
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderTop: `3px solid ${m.color}`, 
                      cursor: 'pointer', 
                      textAlign: 'center',
                      transform: stageFilter === m.filterValue ? 'translateY(-2px)' : 'translateY(0)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      backdropFilter: 'blur(16px)',
                      boxShadow: stageFilter === m.filterValue ? `0 8px 25px ${m.color}20` : 'none'
                    }}
                  >
                    <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '8px', textTransform: 'uppercase' }}>{m.label}</div>
                    <div style={{ fontSize: '28px', fontWeight: '800', color: stageFilter === m.filterValue ? m.color : '#fff' }}>{m.count}</div>
                  </div>
                ))}
              </div>

              {/* Filter Row - REMOVED Support Hub button since it's now in sidebar */}
              <div className="glass-panel" style={{ 
                display: 'flex', 
                gap: '10px', 
                marginBottom: '24px', 
                alignItems: 'center',
                padding: '14px 20px',
                justifyContent: 'space-between',
                flexWrap: 'wrap'
              }}>
                <input 
                  type="text" 
                  placeholder="Search candidate..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
                
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <select 
                    value={domainFilter} 
                    onChange={(e) => setDomainFilter(e.target.value)} 
                    style={selectStyle}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  >
                    <option value="" style={{ color: '#000' }}>All Domains</option>
                    {uniqueDomains.map(d => <option key={d} value={d} style={{ color: '#000' }}>{d}</option>)}
                  </select>

                  <button
                    onClick={() => setStageFilter('')}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: stageFilter === '' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(255, 255, 255, 0.08)',
                      background: stageFilter === '' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.05)',
                      color: stageFilter === '' ? '#ffffff' : '#e2e8f0',
                      fontWeight: '500',
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontFamily: 'inherit',
                      minWidth: '90px',
                      textAlign: 'center'
                    }}
                  >
                    Total ({metrics.total})
                  </button>

                  <button 
                    onClick={() => fetchDashboardData()}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#e2e8f0',
                      fontSize: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontFamily: 'inherit'
                    }}
                    title="Sync Data"
                  >
                    ↻
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="glass-panel" style={{ overflow: 'hidden', padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: 'inherit' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name</th>
                      <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Domain</th>
                      <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Stage</th>
                      <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCandidates.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '15px' }}>
                          No candidates found matching current parameters.
                        </td>
                      </tr>
                    ) : (
                      filteredCandidates.map((c) => {
                        const stage = c.current_stage || '';
                        const stageKey = stage === 'Internship Discontinued' ? 'Internship Discontinued' : stage;
                        const nameColor = stageColors[stageKey] || '#60a5fa';
                        const isFiltered = stageFilter === stage;
                        
                        return (
                          <tr 
                            key={c.id} 
                            onClick={() => navigate(`/candidate/${c.id}`)} 
                            style={{ 
                              borderBottom: '1px solid rgba(255,255,255,0.06)', 
                              cursor: 'pointer', 
                              transition: 'all 0.2s ease',
                              backgroundColor: isFiltered ? 'rgba(255,255,255,0.04)' : 'transparent'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isFiltered ? 'rgba(255,255,255,0.04)' : 'transparent'; }}
                          >
                            <td style={{ padding: '16px 20px', fontWeight: '600', color: '#fff', fontSize: '14px' }}>
                              {c.name || c.full_name}
                            </td>
                            <td style={{ padding: '16px 20px', color: '#94a3b8', fontSize: '14px' }}>{c.domain}</td>
                            <td style={{ padding: '16px 20px' }}>
                              <span style={{ 
                                padding: '4px 12px', 
                                borderRadius: '20px', 
                                fontSize: '11px', 
                                fontWeight: '600', 
                                background: `rgba(${parseInt(nameColor.slice(1,3),16)}, ${parseInt(nameColor.slice(3,5),16)}, ${parseInt(nameColor.slice(5,7),16)}, 0.15)`,
                                color: nameColor,
                                border: `1px solid rgba(${parseInt(nameColor.slice(1,3),16)}, ${parseInt(nameColor.slice(3,5),16)}, ${parseInt(nameColor.slice(5,7),16)}, 0.3)`
                              }}>
                                {c.current_stage}
                              </span>
                            </td>
                            <td style={{ padding: '16px 20px', color: '#94a3b8', fontSize: '14px' }}>{c.source}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Bulk Confirm Modal */}
          <BulkConfirmModal />

          {/* Domain List Modal */}
          <DomainListModal />

          {/* Domain Management Modal */}
          {showDomainManagement && (
            <DomainManagement 
              onClose={() => {
                setShowDomainManagement(false);
              }}
              onDomainAdded={handleDomainAdded}
            />
          )}

          {/* Register User Modal */}
          {showRegisterModal && (
            <RegisterUser 
              onClose={() => {
                setShowRegisterModal(false);
              }}
              onSuccess={handleRegistrationSuccess}
            />
          )}

          {/* Change Password Modal */}
          {showChangePassword && (
            <ChangePasswordModal 
              onClose={() => {
                setShowChangePassword(false);
              }} 
            />
          )}

          {/* Register Candidate Modal */}
          {showRegisterCandidateModal && (
            <HRRegisterCandidate 
              onClose={() => {
                setShowRegisterCandidateModal(false);
              }}
              onSuccess={handleCandidateRegistrationSuccess}
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .btn-glass {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #e2e8f0;
          padding: 10px 20px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
          font-size: 14px;
          font-weight: 500;
        }
        .btn-glass:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .glass-panel {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 20px 24px;
          transition: all 0.3s ease;
        }
        .glass-panel:hover {
          border-color: rgba(255, 255, 255, 0.15);
        }
        :root {
          --bg-dark: #0a0a1a;
          --glass-border: rgba(255, 255, 255, 0.08);
          --text-muted: #94a3b8;
          --primary: #4f46e5;
          --accent: #8b5cf6;
        }
        body { background: #0a0a1a; margin: 0; }
        .aurora-bg {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(ellipse at 10% 20%, rgba(79, 70, 229, 0.15) 0%, transparent 60%),
                      radial-gradient(ellipse at 90% 80%, rgba(139, 92, 246, 0.12) 0%, transparent 60%),
                      radial-gradient(ellipse at 50% 50%, rgba(59, 130, 246, 0.05) 0%, transparent 80%);
          pointer-events: none;
          z-index: 0;
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.25);
        }
      `}</style>
    </>
  );
}

export default HRAdminDashboard;