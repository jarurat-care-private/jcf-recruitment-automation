// pages/CandidateDetailsPage.jsx - UPDATED WITH CALENDAR NAVIGATION
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

// ===== FALLBACK DOMAIN LINKS (used if database fetch fails) =====
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

// ===== HELPER: Format IST Date with Time =====
function formatISTDateTime(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch (e) {
    return dateString;
  }
}

// ===== HELPER: Format IST Date only =====
function formatISTDate(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
}

// ===== HELPER: Extract IST Time with fallback for naive timestamps =====
function extractISTTime(isoString) {
  if (!isoString) return '';
  try {
    let date = new Date(isoString);
    if (isNaN(date.getTime())) {
      date = new Date(isoString + '+05:30');
      if (isNaN(date.getTime())) return '';
    }
    return date.toLocaleTimeString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true 
    });
  } catch (e) {
    console.error('Error extracting time:', e);
    return '';
  }
}

// ===== HELPER: Format Time Slot with IST - Handles naive timestamps =====
function formatTimeSlotIST(startDateTime, endDateTime) {
  if (!startDateTime) return '';
  try {
    let start = new Date(startDateTime);
    if (isNaN(start.getTime())) {
      start = new Date(startDateTime + '+05:30');
      if (isNaN(start.getTime())) return '';
    }
    
    const startStr = start.toLocaleTimeString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    });
    
    if (endDateTime) {
      let end = new Date(endDateTime);
      if (isNaN(end.getTime())) {
        end = new Date(endDateTime + '+05:30');
      }
      if (!isNaN(end.getTime())) {
        const endStr = end.toLocaleTimeString('en-IN', { 
          timeZone: 'Asia/Kolkata',
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: true 
        });
        return `${startStr} - ${endStr}`;
      }
    }
    return startStr;
  } catch (e) {
    console.error('Error formatting time slot:', e);
    return '';
  }
}

// ===== FIXED: Format Probation Time Display - Converts UTC to IST =====
function formatProbationTime(dateString, endDateString) {
  if (!dateString) return 'Not scheduled';
  
  try {
    let startDate = new Date(dateString);
    if (isNaN(startDate.getTime())) {
      startDate = new Date(dateString.replace(' ', 'T') + 'Z');
    }
    if (isNaN(startDate.getTime())) return 'Invalid time';
    
    const istStartDate = new Date(startDate.getTime() + (5.5 * 60 * 60 * 1000));
    const startTimeStr = istStartDate.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    if (endDateString) {
      let endDate = new Date(endDateString);
      if (isNaN(endDate.getTime())) {
        endDate = new Date(endDateString.replace(' ', 'T') + 'Z');
      }
      if (!isNaN(endDate.getTime())) {
        const istEndDate = new Date(endDate.getTime() + (5.5 * 60 * 60 * 1000));
        const endTimeStr = istEndDate.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        return `${startTimeStr} - ${endTimeStr}`;
      }
    }
    return startTimeStr;
  } catch (e) {
    console.error('Error formatting probation time:', e);
    return 'Invalid time';
  }
}

// ===== HELPER: Get IST Date =====
function getISTDate() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() + istOffset);
}

// ===== ACTIVITY LOGGING HELPER =====
async function logTeamActivity(action, entityType, entityId, details = {}) {
  const hrUser = localStorage.getItem('hrEmail') || 'system';
  const hrName = localStorage.getItem('userName') || 'System';
  const hrRole = localStorage.getItem('userRole') || 'system';
  const hrTeam = localStorage.getItem('userTeam') || 'leadership';

  if (action === 'interview_scheduled' && details) {
    details.panel = details.panel || 'Panelist Not Assigned';
  }

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
    console.log(`✅ Activity logged: ${action}`, details);
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

function CandidateDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [candidate, setCandidate] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [onboarding, setOnboarding] = useState(null);
  const [domains, setDomains] = useState([]);
  const [referralData, setReferralData] = useState(null);
  const [domainLinks, setDomainLinks] = useState(FALLBACK_DOMAIN_LINKS);

  // Enhanced Notes State
  const [hrNotes, setHrNotes] = useState([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  
  const [scores, setScores] = useState({ content: '', formatting: '', ai: '' });
  
  // REMOVED: probationInput state (no longer needed for manual scheduling)
  
  const [roundGrades, setRoundGrades] = useState({});
  const [overrideReason, setOverrideReason] = useState('');
  const [rescheduleRequest, setRescheduleRequest] = useState(null);

  const [candidateQuestions, setCandidateQuestions] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [isAddingFAQ, setIsAddingFAQ] = useState(false);
  const [faqForm, setFaqForm] = useState({ question: '', answer: '', category: '' });
  
  const [similarFAQ, setSimilarFAQ] = useState(null);
  const [checkingSimilar, setCheckingSimilar] = useState(false);

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');

  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [waitlistReason, setWaitlistReason] = useState('');
  const [waitlistNotes, setWaitlistNotes] = useState('');

  // REMOVED: showRescheduleProbationModal state (no longer needed)
  // REMOVED: rescheduleProbationData state (no longer needed)

  const [downloadLoading, setDownloadLoading] = useState(false);
  const [uploadResumeLoading, setUploadResumeLoading] = useState(false);

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [showFilesModal, setShowFilesModal] = useState(false);

  // Profile edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    domain: '',
    source: '',
    college_name: '',
    degree_course: '',
    graduation_year: '',
    address: '',
    linkedin_profile: '',
    portfolio_link: '',
    referrer_name: '',
    referrer_contact: '',
    other_source: '',
  });

  const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
  const standardSources = ['Internshala', 'Referral', 'Wellfound', 'Indeed', 'College Outreach', 'Social Media'];

  const fieldLabels = {
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    domain: 'Domain',
    source: 'Source',
    college_name: 'College/University',
    degree_course: 'Degree/Course',
    graduation_year: 'Graduation Year',
    address: 'Address',
    linkedin_profile: 'LinkedIn Profile',
    portfolio_link: 'Portfolio Link',
    referrer_name: 'Referrer Name',
    referrer_contact: 'Referrer Contact',
    other_source: 'Source Name'
  };

  // ===== FETCH DOMAIN LINKS FROM DATABASE =====
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

  useEffect(() => {
    fetchCompleteProfile();
    fetchDomains();
    fetchDomainLinks();
  }, [id]);

  useEffect(() => {
    if (candidate) {
      fetchCandidateQuestions();
      fetchUploadedFiles();
      fetchReferralData();
    }
  }, [candidate]);

  useEffect(() => {
    if (!faqForm.question) {
      setSimilarFAQ(null);
      return;
    }
    
    const checkDuplicate = async () => {
      setCheckingSimilar(true);
      const result = await checkFAQExists(faqForm.question);
      setSimilarFAQ(result.exists ? result.match : null);
      setCheckingSimilar(false);
    };
    
    const timer = setTimeout(checkDuplicate, 600);
    return () => clearTimeout(timer);
  }, [faqForm.question]);

  async function fetchReferralData() {
    if (!candidate || candidate.source !== 'Referral') {
      setReferralData(null);
      return;
    }
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('candidate_id', candidate.id)
      .maybeSingle();
    if (!error && data) {
      setReferralData(data);
    }
  }

  async function fetchDomains() {
    try {
      const { data, error } = await supabase
        .from('assignment_templates')
        .select('domain')
        .order('domain', { ascending: true });

      if (error) {
        console.error('Error fetching domains:', error);
        setDomains([
          "Automation & Operations",
          "Brand Management & Outreach",
          "Business Development",
          "Clinical Psychologist",
          "Content Creation",
          "Creative Design",
          "Graphic Design",
          "HR Psychologist",
          "Human Resources (HR)",
          "Lead Generation",
          "Marketing",
          "Media & Public Relations (PR)",
          "Motion Graphics",
          "Operations",
          "Project Management",
          "Python Automation",
          "Sales and Marketing",
          "Social Media Management",
          "Talent Acquisition",
          "Video Editing/Making",
          "UI/UX Design",
          "Full stack Developer"
        ]);
        return;
      }

      if (data && data.length > 0) {
        setDomains(data.map(d => d.domain));
      }
    } catch (err) {
      console.error('Error in fetchDomains:', err);
    }
  }

  async function fetchUploadedFiles() {
    if (!candidate) return;
    
    const { data, error } = await supabase
      .from('assignment_files')
      .select('*')
      .eq('candidate_id', candidate.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching uploaded files:', error);
    } else {
      setUploadedFiles(data || []);
    }
  }

  async function handleUploadResume(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Only PDF files are allowed. Please upload a PDF file.');
      e.target.value = '';
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      alert('File size exceeds 100MB limit. Please upload a smaller file.');
      e.target.value = '';
      return;
    }

    setUploadResumeLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${candidate.id}/${Date.now()}.${fileExt}`;
      const filePath = `resumes/${fileName}`;
      
      const { data, error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file, { 
          cacheControl: '3600', 
          upsert: true,
          contentType: 'application/pdf'
        });
      
      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: urlData } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('candidates')
        .update({ resume_link: urlData.publicUrl })
        .eq('id', candidate.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      await logTeamActivity(
        'resume_uploaded',
        'candidate',
        candidate.id,
        {
          candidate_id: candidate.id,
          candidate_name: candidate.name || candidate.full_name,
          file_name: file.name,
          file_size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          uploaded_by: localStorage.getItem('userName') || 'HR'
        }
      );

      alert('✅ Resume uploaded successfully!');
      fetchCompleteProfile();
      
    } catch (error) {
      console.error('Error uploading resume:', error);
      alert('Failed to upload resume. Please try again.');
    } finally {
      setUploadResumeLoading(false);
      e.target.value = '';
    }
  }

  async function handleDownloadResume() {
    if (!candidate?.resume_link) {
      alert('No resume available to download.');
      return;
    }

    try {
      setDownloadLoading(true);
      const downloadBtn = document.getElementById('downloadResumeBtn');
      if (downloadBtn) {
        downloadBtn.textContent = 'Downloading...';
        downloadBtn.disabled = true;
      }

      const response = await fetch(candidate.resume_link);
      
      if (!response.ok) {
        throw new Error('Failed to fetch resume');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${candidate.name || 'candidate'}_resume.pdf`;
      
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error downloading resume:', error);
      alert('Failed to download resume. Please try again.');
    } finally {
      setDownloadLoading(false);
      const downloadBtn = document.getElementById('downloadResumeBtn');
      if (downloadBtn) {
        downloadBtn.textContent = '📥 Download Resume';
        downloadBtn.disabled = false;
      }
    }
  }

  async function handleFileDownload(fileUrl, fileName) {
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('Failed to fetch file');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file. Please try again.');
    }
  }

  async function fetchCompleteProfile() {
    const { data: c } = await supabase.from('candidates').select('*').eq('id', id).single();
    if (!c) return;
    setCandidate(c);
    
    try {
      const parsedNotes = JSON.parse(c.hr_notes || '[]');
      setHrNotes(parsedNotes);
    } catch (e) {
      if (c.hr_notes && typeof c.hr_notes === 'string') {
        const oldNotes = [{
          content: c.hr_notes,
          author: 'System',
          timestamp: new Date().toISOString()
        }];
        setHrNotes(oldNotes);
      } else {
        setHrNotes([]);
      }
    }

    const { data: a } = await supabase.from('assignments').select('*').eq('candidate_id', id).maybeSingle();
    setAssignment(a);
    if (a) {
      setScores({ content: a.content_score ?? '', formatting: a.formatting_score ?? '', ai: a.ai_score ?? '' });
    }

    const { data: i } = await supabase
      .from('interviews')
      .select('*')
      .eq('candidate_id', id)
      .order('id', { ascending: true });
    setInterviews(i || []);

    let { data: o, error: fetchError } = await supabase.from('onboarding').select('*').eq('candidate_id', id).maybeSingle();
    
    if (!o) {
      const { data: newOnboarding, error: createError } = await supabase
        .from('onboarding')
        .upsert({ candidate_id: id, onboarding_status: 'Pending', probation_status: 'Pending' }, { onConflict: 'candidate_id' })
        .select()
        .single();
      if (!createError) o = newOnboarding;
    }
    setOnboarding(o);
    setRescheduleRequest(null);

    const activeRequestedInterview = (i || []).find(iv => iv.status === 'Reschedule_Requested');
    if (activeRequestedInterview) {
      const { data: req } = await supabase
        .from('interview_reschedule_requests')
        .select('*')
        .eq('interview_id', activeRequestedInterview.id)
        .eq('status', 'Pending')
        .maybeSingle();
      if (req) setRescheduleRequest(req);
    }
  }

  async function fetchCandidateQuestions() {
    if (!candidate) return;
    const { data, error } = await supabase
      .from('candidate_questions')
      .select('*, question_replies(*)')
      .eq('candidate_id', candidate.id)
      .order('created_at', { ascending: false });
    if (!error) setCandidateQuestions(data || []);
  }

  async function handleReplyToQuestion(questionId) {
    if (!replyText.trim()) { alert('Please enter your reply.'); return; }
    
    const { error: replyError } = await supabase
      .from('question_replies')
      .insert({
        question_id: questionId,
        reply: replyText.trim(),
        replied_by: localStorage.getItem('hrEmail') || localStorage.getItem('userEmail') || 'HR',
        is_hr_reply: true
      });
    
    if (replyError) { alert(`Failed to send reply: ${replyError.message}`); return; }
    
    await supabase.from('candidate_questions').update({ status: 'Replied', updated_at: new Date().toISOString() }).eq('id', questionId);
    
    const question = candidateQuestions.find(q => q.id === questionId);
    await logTeamActivity('hr_replied_to_question', 'candidate_question', questionId, {
      candidate_id: id,
      candidate_name: candidate.name || candidate.full_name,
      question: question?.question || 'Question',
      reply: replyText.trim()
    });
    
    alert('✅ Reply sent to candidate!');
    setReplyText('');
    setReplyingTo(null);
    fetchCandidateQuestions();
  }

  async function handleMarkAsFAQ(questionId) {
    const question = candidateQuestions.find(q => q.id === questionId);
    if (!question) return;
    
    await logTeamActivity('faq_marked_from_question', 'candidate_question', questionId, {
      candidate_id: id,
      candidate_name: candidate.name || candidate.full_name,
      question: question.question
    });
    
    setFaqForm({ question: question.question, answer: '', category: 'General', questionId: questionId });
    setIsAddingFAQ(true);
    setSimilarFAQ(null);
  }

  async function checkFAQExists(question) {
    if (!question) return { exists: false, match: null };
    const normalizedQuestion = question.trim().toLowerCase();
    const { data, error } = await supabase.from('faqs').select('question, id').eq('is_active', true);
    
    if (error || data.length === 0) return { exists: false, match: null };
    
    const stopWords = ['what', 'is', 'the', 'are', 'for', 'to', 'of', 'a', 'an', 'on', 'at', 'by', 'in', 'with', 'without', 'and', 'or', 'but', 'for', 'nor', 'from', 'so', 'yet', 'do', 'does', 'did', 'have', 'has', 'had', 'can', 'will', 'would', 'could', 'should', 'may', 'might', 'must'];
    const keywords = normalizedQuestion.replace(/[^a-zA-Z0-9\s]/g, '').split(' ').filter(word => word.length > 2 && !stopWords.includes(word));
    
    if (keywords.length === 0) return { exists: false, match: null };
    
    for (const faq of data) {
      const existingNormalized = faq.question.trim().toLowerCase();
      if (existingNormalized === normalizedQuestion) return { exists: true, match: faq };
      
      const existingWords = existingNormalized.replace(/[^a-zA-Z0-9\s]/g, '').split(' ').filter(word => word.length > 2 && !stopWords.includes(word));
      const matchedKeywords = keywords.filter(keyword => existingWords.some(word => word === keyword));
      const matchRatio = matchedKeywords.length / keywords.length;
      
      if (matchRatio >= 0.65) return { exists: true, match: faq };
      if (keywords.length >= 3) {
        const longKeywords = keywords.filter(k => k.length > 4);
        if (longKeywords.length > 0) {
          const matchedLong = longKeywords.filter(k => existingNormalized.includes(k));
          if (matchedLong.length / longKeywords.length >= 0.8) return { exists: true, match: faq };
        }
      }
    }
    return { exists: false, match: null };
  }

  async function handleAddFAQ(e) {
    e.preventDefault();
    if (!faqForm.answer.trim()) { alert('Please enter the FAQ answer.'); return; }
    
    const result = await checkFAQExists(faqForm.question);
    if (result.exists) {
      const confirmed = window.confirm(`⚠️ A similar question already exists in the FAQ list:\n\n"${result.match.question}"\n\nDo you still want to add this as a new FAQ?`);
      if (!confirmed) return;
    }
    
    const { data, error } = await supabase.from('faqs').insert({
      question: faqForm.question,
      answer: faqForm.answer.trim(),
      category: faqForm.category || 'General',
      is_active: true,
      created_by: localStorage.getItem('hrEmail') || localStorage.getItem('userEmail') || 'HR'
    }).select().single();
    
    if (error) { alert(`Failed to add FAQ: ${error.message}`); } else {
      await logTeamActivity('faq_added', 'faq', data?.id || null, {
        question: faqForm.question, category: faqForm.category || 'General',
        added_by: localStorage.getItem('hrEmail') || localStorage.getItem('userEmail') || 'HR',
        source_question_id: faqForm.questionId || null
      });
      alert('✅ FAQ added successfully!');
      await supabase.from('candidate_questions').update({ is_public: true }).eq('id', faqForm.questionId || candidateQuestions.find(q => q.question === faqForm.question)?.id);
      setIsAddingFAQ(false);
      setFaqForm({ question: '', answer: '', category: '', questionId: null });
      setSimilarFAQ(null);
      fetchCandidateQuestions();
    }
  }

  async function handleWithdrawCandidate() {
    if (!withdrawReason.trim()) { alert('Please enter a reason for withdrawal.'); return; }
    try {
      const userName = localStorage.getItem('userName') || 'HR User';
      const newNote = {
        content: `[WITHDRAWN] ${formatISTDateTime(new Date().toISOString())}: ${withdrawReason.trim()}`,
        author: userName,
        timestamp: new Date().toISOString()
      };
      const updatedNotes = [newNote, ...hrNotes];
      
      const { error } = await supabase.from('candidates').update({ 
        current_stage: 'Withdrawn',
        hr_notes: JSON.stringify(updatedNotes)
      }).eq('id', id);

      if (error) { alert(`Failed to withdraw candidate: ${error.message}`); return; }

      await logTeamActivity('candidate_withdrawn', 'candidate', id, { 
        candidate_id: id, 
        candidate_name: candidate.name || candidate.full_name, 
        reason: withdrawReason.trim() 
      });
      alert('✅ Candidate has been marked as Withdrawn.');
      setShowWithdrawModal(false);
      setWithdrawReason('');
      fetchCompleteProfile();
    } catch (err) { alert('An error occurred while withdrawing the candidate.'); }
  }

  async function handleWaitlistCandidate() {
    if (!waitlistReason.trim()) { alert('Please enter a reason for adding to waitlist.'); return; }
    const restoreStage = candidate.current_stage;
    try {
      const istDate = getISTDate();
      const istTimestamp = istDate.toISOString();
      const istFormatted = formatISTDateTime(istTimestamp);

      const userName = localStorage.getItem('userName') || 'HR User';
      const newNote = {
        content: `[WAITLISTED] ${istFormatted}: ${waitlistReason.trim()}`,
        author: userName,
        timestamp: new Date().toISOString()
      };
      const updatedNotes = [newNote, ...hrNotes];

      const { error } = await supabase.from('candidates').update({ 
        current_stage: 'Waitlist', 
        waitlist_restore_stage: restoreStage, 
        waitlist_reason: waitlistReason.trim(), 
        waitlist_notes: waitlistNotes.trim() || null, 
        waitlisted_at: istTimestamp, 
        waitlist_status: 'Active',
        hr_notes: JSON.stringify(updatedNotes)
      }).eq('id', id);

      if (error) { alert(`Failed to add candidate to waitlist: ${error.message}`); return; }

      await logTeamActivity('candidate_waitlisted', 'candidate', id, { 
        candidate_id: id, 
        candidate_name: candidate.name || candidate.full_name, 
        reason: waitlistReason.trim(), 
        restore_stage: restoreStage, 
        waitlisted_at: istFormatted 
      });

      const waitlistMessage = `Dear ${candidate.name || 'Candidate'},\n\nThank you for your interest in joining Jarurat Care Foundation. We have reviewed your application and appreciate the time and effort you've invested in our recruitment process.\n\nWhile we are impressed with your profile, we currently do not have an opening that perfectly matches your skills and experience. However, we believe you would be a valuable addition to our team in the future.\n\nWe have placed your application on our waitlist. Should a suitable position become available in the coming months, we will reach out to you directly with an opportunity to reopen your application.\n\nWe appreciate your understanding and wish you the very best in your career journey.\n\nWarm regards,\nHR Team\nJarurat Care Foundation`;
      
      const { error: questionError } = await supabase.from('candidate_questions').insert({ 
        candidate_id: id, 
        candidate_name: candidate.name || candidate.full_name, 
        candidate_email: candidate.email, 
        question: `📋 Application Status Update`, 
        status: 'Replied', 
        is_public: false, 
        is_system_message: true, 
        created_at: new Date().toISOString() 
      });

      if (!questionError) {
        const { data: questionData } = await supabase.from('candidate_questions').select('id').eq('candidate_id', id).order('created_at', { ascending: false }).limit(1).single();
        if (questionData) {
          await supabase.from('question_replies').insert({ 
            question_id: questionData.id, 
            reply: waitlistMessage, 
            replied_by: 'Jarurat Care Foundation', 
            is_hr_reply: false, 
            is_system_reply: true, 
            created_at: new Date().toISOString() 
          });
        }
      }

      alert('✅ Candidate has been added to the waitlist.');
      setShowWaitlistModal(false);
      setWaitlistReason('');
      setWaitlistNotes('');
      fetchCompleteProfile();
    } catch (err) { alert('An error occurred while adding the candidate to waitlist.'); }
  }

  async function handleRestoreFromWaitlist() {
    if (!candidate.waitlist_restore_stage) { alert('No restore stage found for this candidate.'); return; }
    try {
      const istDate = getISTDate();
      const istFormatted = formatISTDateTime(istDate.toISOString());

      const userName = localStorage.getItem('userName') || 'HR User';
      const newNote = {
        content: `[RESTORED FROM WAITLIST] ${istFormatted}`,
        author: userName,
        timestamp: new Date().toISOString()
      };
      const updatedNotes = [newNote, ...hrNotes];

      const { error } = await supabase.from('candidates').update({ 
        current_stage: candidate.waitlist_restore_stage, 
        waitlist_status: 'Restored', 
        waitlist_restored_at: istDate.toISOString(),
        hr_notes: JSON.stringify(updatedNotes)
      }).eq('id', id);

      if (error) { alert(`Failed to restore candidate: ${error.message}`); return; }

      await logTeamActivity('candidate_restored_from_waitlist', 'candidate', id, { 
        candidate_id: id, 
        candidate_name: candidate.name || candidate.full_name, 
        restored_stage: candidate.waitlist_restore_stage, 
        restored_at: istFormatted 
      });

      const restoreMessage = `Dear ${candidate.name || 'Candidate'},\n\nWe hope this message finds you well!\n\nWe are pleased to inform you that a position matching your profile has become available at Jarurat Care Foundation. Your application is being reopened from our waitlist.\n\nYou can now log in to your candidate portal to continue the recruitment process from where you left off. Please check your portal for the next steps.\n\nWe look forward to reconnecting with you!\n\nWarm regards,\nHR Team\nJarurat Care Foundation`;
      
      const { error: questionError } = await supabase.from('candidate_questions').insert({ 
        candidate_id: id, 
        candidate_name: candidate.name || candidate.full_name, 
        candidate_email: candidate.email, 
        question: `🔔 Application Reopened`, 
        status: 'Replied', 
        is_public: false, 
        is_system_message: true, 
        created_at: new Date().toISOString() 
      });

      if (!questionError) {
        const { data: questionData } = await supabase.from('candidate_questions').select('id').eq('candidate_id', id).order('created_at', { ascending: false }).limit(1).single();
        if (questionData) {
          await supabase.from('question_replies').insert({ 
            question_id: questionData.id, 
            reply: restoreMessage, 
            replied_by: 'Jarurat Care Foundation', 
            is_hr_reply: false, 
            is_system_reply: true, 
            created_at: new Date().toISOString() 
          });
        }
      }

      alert('✅ Candidate has been restored from the waitlist.');
      fetchCompleteProfile();
    } catch (err) { alert('An error occurred while restoring the candidate.'); }
  }

  // ===== UPDATED: Send Assignment - Uses Database Links =====
  async function handleSendAssignment() {
    const links = await fetchDomainLinks();
    const mappedTemplateLink = links[candidate.domain];
    
    if (!mappedTemplateLink) {
      alert(`No task URL template mapped for domain: ${candidate.domain}. Please add this domain in Manage Domains.`);
      return;
    }

    const deadlineTime = new Date();
    deadlineTime.setDate(deadlineTime.getDate() + 2);

    const { data, error } = await supabase.from('assignments').upsert({
      candidate_id: id, 
      assignment_title: `${candidate.domain} Core Assignment Challenge`, 
      task_link_template: mappedTemplateLink, 
      deadline: deadlineTime.toISOString(), 
      assignment_status: 'Assigned', 
      sent_by: localStorage.getItem('hrEmail') || localStorage.getItem('userEmail') || 'System Admin', 
      sent_date: new Date().toISOString()
    }, { onConflict: 'candidate_id' }).select();

    if (error) { alert(`Failed to send assignment: ${error.message}`); return; }

    await supabase.from('candidates').update({ current_stage: 'Assignment' }).eq('id', id);
    
    await logTeamActivity(
      'assignment_dispatched',
      'assignment',
      data?.[0]?.id || id,
      {
        candidate_id: id,
        candidate_name: candidate.name || candidate.full_name,
        domain: candidate.domain,
        deadline: deadlineTime.toISOString(),
        sent_by: localStorage.getItem('userName') || 'HR'
      }
    );
    
    alert('Assignment link dispatched.');
    fetchCompleteProfile();
  }

  async function handleSaveEvaluation() {
    if (assignment?.assignment_status === 'Evaluated') { alert('Assignment has already been evaluated.'); return; }
    
    const cScore = parseFloat(scores.content) || 0;
    const fScore = parseFloat(scores.formatting) || 0;
    const aiScore = parseFloat(scores.ai) || 0;
    const calculatedTotal = cScore + fScore - aiScore;
    const currentUser = localStorage.getItem('hrEmail') || localStorage.getItem('userEmail') || 'Unknown';
    const currentUserName = localStorage.getItem('userName') || 'HR';

    const { error: assignError } = await supabase.from('assignments').update({ 
      content_score: cScore, 
      formatting_score: fScore, 
      ai_score: aiScore, 
      assignment_status: 'Evaluated', 
      evaluated_by: currentUser, 
      evaluation_date: new Date().toISOString() 
    }).eq('candidate_id', id);

    if (assignError) { alert(`Failed to save matrix grades: ${assignError.message}`); return; }

    await logTeamActivity(
      'assignment_evaluated',
      'assignment',
      assignment?.id || id,
      {
        candidate_id: id,
        candidate_name: candidate.name || candidate.full_name,
        total_score: calculatedTotal,
        content_score: cScore,
        formatting_score: fScore,
        ai_score: aiScore,
        evaluated_by: currentUserName
      }
    );

    if (calculatedTotal < 6) {
      await supabase.from('candidates').update({ assignment_score: Math.round(calculatedTotal) }).eq('id', id);
      alert(`Scores saved! Calculated Total Score: ${calculatedTotal} (< 6).\nCandidate kept in 'Assignment' stage for custom manual selection triage override.`);
    } else {
      await supabase.from('candidates').update({ 
        current_stage: 'Interview', 
        r1_status: 'Pending', 
        assignment_score: Math.round(calculatedTotal) 
      }).eq('id', id);
      alert(`Scores saved! Calculated Total Score: ${calculatedTotal} (>= 6).\nPipeline advanced to 'Interview' state, and Round 1 has been provisioned.`);
    }
    fetchCompleteProfile();
  }

  // REMOVED: handleScheduleProbationMeeting function (manual scheduling removed)
  // REMOVED: handleRescheduleProbationMeeting function (manual rescheduling removed)
  // REMOVED: formatDateDisplay function (no longer needed)
  // REMOVED: formatTimeForDisplay function (no longer needed)

  function isValidUrl(string) {
    if (!string || string.startsWith('File submission')) return false;
    try { new URL(string); return true; } catch (_) { return false; }
  }

  async function handleGradeInterview(interviewId, round, decision) {
    const metrics = roundGrades[interviewId] || {};
    const totalScore = Number((parseFloat(metrics.score1) || 0) + (parseFloat(metrics.score2) || 0) + (parseFloat(metrics.score3) || 0));

    const panelistName = localStorage.getItem('panelistName') || localStorage.getItem('userName') || localStorage.getItem('hrEmail') || 'Panelist';
    let sqlUpdateParams = { 
      p_interview_id: interviewId, 
      p_result: decision, 
      p_status: 'Evaluated', 
      p_total_score: totalScore, 
      p_round: round, 
      p_s1: (parseFloat(metrics.score1) || 0), 
      p_s2: (parseFloat(metrics.score2) || 0), 
      p_s3: (parseFloat(metrics.score3) || 0) 
    };

    const { error } = await supabase.rpc('execute_interview_grade_update', sqlUpdateParams);
    if (error) { alert(`Failed to save scores: ${error.message}`); return; }

    const actionType = decision === 'Selected' ? 'candidate_selected' : decision === 'Rejected' ? 'candidate_rejected' : 'candidate_hold';
    
    await logTeamActivity(actionType, 'interview', interviewId, { 
      candidate_id: id, 
      candidate_name: candidate.name || candidate.full_name, 
      round: round, 
      total_score: totalScore, 
      panelist: panelistName, 
      s1: sqlUpdateParams.p_s1, 
      s2: sqlUpdateParams.p_s2, 
      s3: sqlUpdateParams.p_s3,
      decision: decision,
      evaluated_by: localStorage.getItem('userName') || 'HR'
    });

    const r1Total = Number(interviews.find(iv => iv.round === 'R1')?.total_score) || (round === 'R1' ? totalScore : 0);
    const r2Total = Number(interviews.find(iv => iv.round === 'R2')?.total_score) || (round === 'R2' ? totalScore : 0);
    await supabase.from('candidates').update({ 
      r1_score: r1Total, 
      r2_score: r2Total, 
      final_interview_score: r1Total + r2Total 
    }).eq('id', id);

    if (decision === 'Rejected') {
      await supabase.from('candidates').update({ current_stage: 'Rejected' }).eq('id', id);
      alert(`Candidate rejected at ${round}.`);
    } else if (decision === 'On Hold') {
      await supabase.from('interviews').update({ status: 'On Hold', result: 'On Hold' }).eq('id', interviewId);
      await supabase.from('candidates').update({ current_stage: 'On Hold' }).eq('id', id);
      alert(`Interview ${round} placed on hold.`);
    } else if (decision === 'Selected') {
      if (round === 'R1') {
        await supabase.from('candidates').update({ r1_status: 'Passed' }).eq('id', id);
        if (candidate.source?.toLowerCase() === 'referral') {
          await supabase.from('candidates').update({ current_stage: 'Selected' }).eq('id', id);
          await supabase.from('onboarding').upsert({ 
            candidate_id: id, 
            onboarding_status: 'Pending', 
            probation_status: 'Pending', 
            probation_meeting_scheduled: false 
          }, { onConflict: 'candidate_id' });
          alert("Round 1 Cleared! (Referral) Proceeding directly to Selected.");
        } else {
          alert("Round 1 Cleared! You may now schedule Round 2.");
        }
      } else if (round === 'R2') {
        await supabase.from('candidates').update({ current_stage: 'Selected' }).eq('id', id);
        await supabase.from('onboarding').upsert({ 
          candidate_id: id, 
          onboarding_status: 'Pending', 
          probation_status: 'Pending', 
          probation_meeting_scheduled: false 
        }, { onConflict: 'candidate_id' });
        alert("Final Round Cleared! Candidate moved to Selected.");
      }
    }
    fetchCompleteProfile();
  }

  async function handleResumeProcess(interviewId, round) {
    await supabase.from('interviews').update({ status: 'Pending', result: 'Pending' }).eq('id', interviewId);
    await supabase.from('candidates').update({ current_stage: 'Interview' }).eq('id', id);
    alert("Process resumed.");
    fetchCompleteProfile();
  }

  // Styles
  const inputStyle = { 
    width: '100%', 
    padding: '12px 16px', 
    boxSizing: 'border-box', 
    border: '1px solid var(--glass-border)', 
    borderRadius: '8px', 
    outline: 'none', 
    fontSize: '14px', 
    backgroundColor: 'rgba(255, 255, 255, 0.05)', 
    color: '#fff', 
    transition: 'all 0.2s', 
    fontFamily: 'inherit' 
  };
  const labelStyle = { 
    display: 'block', 
    textAlign: 'left', 
    fontSize: '13px', 
    fontWeight: '500', 
    color: 'var(--text-muted)', 
    marginBottom: '6px' 
  };

  if (!candidate) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)' }}>
      <div style={{ 
        width: '40px', 
        height: '40px', 
        border: '4px solid rgba(255, 255, 255, 0.1)', 
        borderTop: '4px solid var(--primary)', 
        borderRadius: '50%', 
        animation: 'spin 1s linear infinite' 
      }} />
    </div>
  );

  const calculatedAssignmentScore = (assignment?.content_score || 0) + (assignment?.formatting_score || 0) - (assignment?.ai_score || 0);
  const assignmentLocked = assignment?.assignment_status === 'Evaluated';

  const r1TotalScore = candidate.r1_score || 0;
  const r2TotalScore = candidate.r2_score || 0;
  const grandTotal = (r1TotalScore || 0) + (r2TotalScore || 0);

  const isOnboardingLocked = candidate.current_stage === 'Onboarding Done' || candidate.current_stage === 'Internship Discontinued' || candidate.current_stage === 'Withdrawn' || candidate.current_stage === 'Terminated' || candidate.current_stage === 'Waitlist';
  const isInterviewLocked = candidate.current_stage === 'Probation' || candidate.current_stage === 'Selected' || isOnboardingLocked || candidate.current_stage === 'Withdrawn' || candidate.current_stage === 'Waitlist';
  const isReferral = candidate.source?.toLowerCase() === 'referral';

  const isAssignmentLate = () => {
    if (!assignment) return false;
    if (assignment.is_late_submission === true) return true;
    if (assignment.submitted_at && assignment.deadline) return new Date(assignment.submitted_at).getTime() > new Date(assignment.deadline).getTime();
    return false;
  };

  const getLateDuration = () => {
    if (!assignment || assignment.late_duration) return assignment?.late_duration || null;
    if (assignment.submitted_at && assignment.deadline) {
      const lateMs = new Date(assignment.submitted_at).getTime() - new Date(assignment.deadline).getTime();
      if (lateMs <= 0) return null;
      return `${Math.floor(lateMs / (1000 * 60 * 60))}h ${Math.floor((lateMs % (1000 * 60 * 60)) / (1000 * 60))}m`;
    }
    return null;
  };

  const showProbationMeeting = candidate.current_stage === 'Selected' && onboarding && onboarding.probation_meeting_scheduled !== true;
  const showProbationManagement = (candidate.current_stage === 'Selected' || candidate.current_stage === 'Probation') && onboarding && onboarding.probation_meeting_scheduled === true;
  const isOnWaitlist = candidate.current_stage === 'Waitlist';
  const probationMeetingDetails = !onboarding ? null : { 
    date: onboarding.probation_meeting_date, 
    end: onboarding.probation_meeting_end, 
    link: onboarding.probation_meeting_link 
  };
  const hasValidLink = assignment?.submitted_link && isValidUrl(assignment.submitted_link);
  const hasFiles = uploadedFiles.length > 0;

  const r1Passed = interviews.some(iv => iv.round === 'R1' && iv.result === 'Selected');
  const r1Scheduled = interviews.some(iv => iv.round === 'R1' && (iv.status === 'Scheduled' || iv.status === 'Reschedule_Requested'));
  const r2Scheduled = interviews.some(iv => iv.round === 'R2' && (iv.status === 'Scheduled' || iv.status === 'Reschedule_Requested'));
  const r2Passed = interviews.some(iv => iv.round === 'R2' && iv.result === 'Selected');

  return (
    <>
      <div className="aurora-bg" style={{ opacity: 0.4 }}></div>
      <div style={{ padding: '30px 40px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <button onClick={() => navigate('/hr-dashboard')} className="btn-glass" style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ← Back to Dashboard
          </button>
          <button onClick={fetchCompleteProfile} className="btn-glass" style={{ padding: '8px 16px', fontSize: '13px' }}>
            🔄 Refresh Data
          </button>
        </div>
        
        {/* Waitlist Banner */}
        {isOnWaitlist && (
          <div className="glass-panel animate-fade-up" style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid var(--accent)', padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span style={{ fontWeight: '700', color: '#c4b5fd', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>⏳ Candidate on Waitlist</span>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#e2e8f0' }}>{candidate.waitlisted_at && `Waitlisted: ${formatISTDateTime(candidate.waitlisted_at)}`}</p>
              {candidate.waitlist_notes && <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Notes: {candidate.waitlist_notes}</p>}
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <button onClick={handleRestoreFromWaitlist} className="btn-premium" style={{ background: 'linear-gradient(135deg, #8b5cf6, #c084fc)' }}>
                🔄 Restore Candidate
              </button>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Resumes from: <strong style={{color: '#fff'}}>{candidate.waitlist_restore_stage || 'Applied'}</strong></span>
            </div>
          </div>
        )}

        {/* HR Manual Intervention Banner */}
        {candidate.current_stage === 'Assignment' && assignment?.assignment_status === 'Evaluated' && calculatedAssignmentScore < 6 && (
          <div className="glass-panel animate-fade-up" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', padding: '24px', marginBottom: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontWeight: '700', color: '#fbbf24', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>⚠️ HR Manual Intervention Required</span>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#e2e8f0' }}>Candidate score fell below target threshold. Manually select or reject for pipeline continuation.</p>
            </div>
            <textarea value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Enter reason for manual override" style={{ ...inputStyle, minHeight: '80px', marginBottom: '16px' }} />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={async () => {
                if (!overrideReason.trim()) { alert('Please enter override reason'); return; }
                await logTeamActivity('candidate_force_scheduled', 'candidate', id, { 
                  candidate_id: id, 
                  candidate_name: candidate.name || candidate.full_name, 
                  reason: overrideReason.trim(), 
                  assignment_score: calculatedAssignmentScore, 
                  action: 'Force Schedule R1' 
                });
                await supabase.from('assignments').update({ hr_scorecard_approved: true, hr_scorecard_remarks: overrideReason }).eq('candidate_id', id);
                await supabase.from('candidates').update({ current_stage: 'Interview' }).eq('id', id); 
                alert('Candidate manually selected. HR can now schedule R1.'); fetchCompleteProfile();
              }} className="btn-premium">Force Schedule R1</button>
              
              <button onClick={async () => {
                await logTeamActivity('candidate_rejected_low_score', 'candidate', id, { 
                  candidate_id: id, 
                  candidate_name: candidate.name || candidate.full_name, 
                  assignment_score: calculatedAssignmentScore, 
                  reason: overrideReason.trim() || 'Score below threshold' 
                });
                await supabase.from('candidates').update({ current_stage: 'Rejected' }).eq('id', id);
                alert('Candidate rejected.'); fetchCompleteProfile();
              }} className="btn-glass" style={{ color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.3)' }}>Reject Candidate</button>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }} className="animate-fade-up delay-100">
          
          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Candidate Profile */}
            <div className="glass-panel" style={{ padding: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: '#fff', fontSize: '22px', fontWeight: '800' }}>Candidate Profile</h2>
                <button 
                  onClick={() => {
                    const newEditState = !isEditingProfile;
                    setIsEditingProfile(newEditState);
                    if (newEditState) {
                      setEditProfileData({
                        name: candidate.name || candidate.full_name || '',
                        email: candidate.email || '',
                        phone: candidate.phone || '',
                        domain: candidate.domain || '',
                        source: candidate.source || '',
                        college_name: candidate.college_name || '',
                        degree_course: candidate.degree_course || '',
                        graduation_year: candidate.graduation_year || '',
                        address: candidate.address || '',
                        linkedin_profile: candidate.linkedin_profile || '',
                        portfolio_link: candidate.portfolio_link || '',
                        referrer_name: referralData?.referrer_name || '',
                        referrer_contact: referralData?.referrer_contact || '',
                        other_source: candidate.source && !standardSources.includes(candidate.source) ? candidate.source : '',
                      });
                    }
                  }}
                  className="btn-glass"
                  style={{ padding: '6px 16px', fontSize: '13px' }}
                >
                  {isEditingProfile ? 'Cancel' : '✏️ Edit'}
                </button>
              </div>
              
              {isEditingProfile ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', marginBottom: '20px' }}>
                    <div>
                      <label style={labelStyle}>Name</label>
                      <input
                        type="text"
                        value={editProfileData.name}
                        onChange={(e) => setEditProfileData({...editProfileData, name: e.target.value})}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Email</label>
                      <input
                        type="email"
                        value={editProfileData.email}
                        onChange={(e) => setEditProfileData({...editProfileData, email: e.target.value})}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Phone</label>
                      <input
                        type="text"
                        value={editProfileData.phone}
                        onChange={(e) => setEditProfileData({...editProfileData, phone: e.target.value})}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Domain</label>
                      <select
                        value={editProfileData.domain}
                        onChange={(e) => setEditProfileData({...editProfileData, domain: e.target.value})}
                        style={{...inputStyle, cursor: 'pointer', color: editProfileData.domain ? '#fff' : '#94a3b8'}}
                      >
                        <option value="" style={{ color: '#94a3b8' }}>Select Domain</option>
                        {domains.map(d => (
                          <option key={d} value={d} style={{ color: '#000' }}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Source</label>
                      <select
                        value={editProfileData.source}
                        onChange={(e) => {
                          const newSource = e.target.value;
                          setEditProfileData({
                            ...editProfileData,
                            source: newSource,
                            other_source: newSource === 'Other' ? editProfileData.other_source : '',
                          });
                        }}
                        style={{...inputStyle, cursor: 'pointer', color: editProfileData.source ? '#fff' : '#94a3b8'}}
                      >
                        <option value="" style={{ color: '#94a3b8' }}>Select Source</option>
                        <option value="Internshala" style={{ color: '#000' }}>Internshala</option>
                        <option value="Referral" style={{ color: '#000' }}>Referral</option>
                        <option value="Wellfound" style={{ color: '#000' }}>Wellfound</option>
                        <option value="Indeed" style={{ color: '#000' }}>Indeed</option>
                        <option value="College Outreach" style={{ color: '#000' }}>College Outreach</option>
                        <option value="Social Media" style={{ color: '#000' }}>Social Media</option>
                        <option value="Other" style={{ color: '#000' }}>Other</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>College/University</label>
                      <input
                        type="text"
                        value={editProfileData.college_name}
                        onChange={(e) => setEditProfileData({...editProfileData, college_name: e.target.value})}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Degree/Course</label>
                      <input
                        type="text"
                        value={editProfileData.degree_course}
                        onChange={(e) => setEditProfileData({...editProfileData, degree_course: e.target.value})}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Graduation Year</label>
                      <input
                        type="number"
                        value={editProfileData.graduation_year}
                        onChange={(e) => setEditProfileData({...editProfileData, graduation_year: e.target.value})}
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>Address</label>
                      <input
                        type="text"
                        value={editProfileData.address}
                        onChange={(e) => setEditProfileData({...editProfileData, address: e.target.value})}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>LinkedIn Profile</label>
                      <input
                        type="url"
                        placeholder="https://linkedin.com/in/..."
                        value={editProfileData.linkedin_profile}
                        onChange={(e) => setEditProfileData({...editProfileData, linkedin_profile: e.target.value})}
                        style={inputStyle}
                        onBlur={(e) => {
                          if (e.target.value && !urlRegex.test(e.target.value)) {
                            alert('Please enter a valid LinkedIn URL');
                          }
                        }}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Portfolio Link</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={editProfileData.portfolio_link}
                        onChange={(e) => setEditProfileData({...editProfileData, portfolio_link: e.target.value})}
                        style={inputStyle}
                        onBlur={(e) => {
                          if (e.target.value && !urlRegex.test(e.target.value)) {
                            alert('Please enter a valid Portfolio URL');
                          }
                        }}
                      />
                    </div>
                  </div>

                  {editProfileData.source === 'Referral' && (
                    <div style={{
                      padding: '16px',
                      background: 'rgba(16, 185, 129, 0.05)',
                      borderRadius: '8px',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      marginBottom: '20px'
                    }}>
                      <div style={{ fontSize: '13px', color: '#6ee7b7', marginBottom: '12px', fontWeight: '600' }}>
                        🤝 Referral Details
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={labelStyle}>Referrer Name</label>
                          <input
                            type="text"
                            value={editProfileData.referrer_name}
                            onChange={(e) => setEditProfileData({...editProfileData, referrer_name: e.target.value})}
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Referrer Contact</label>
                          <input
                            type="text"
                            value={editProfileData.referrer_contact}
                            onChange={(e) => setEditProfileData({...editProfileData, referrer_contact: e.target.value})}
                            style={inputStyle}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {editProfileData.source === 'Other' && (
                    <div style={{
                      padding: '16px',
                      background: 'rgba(245, 158, 11, 0.05)',
                      borderRadius: '8px',
                      border: '1px solid rgba(245, 158, 11, 0.2)',
                      marginBottom: '20px'
                    }}>
                      <div style={{ fontSize: '13px', color: '#fbbf24', marginBottom: '12px', fontWeight: '600' }}>
                        📝 Specify Source
                      </div>
                      <div>
                        <label style={labelStyle}>Source Name</label>
                        <input
                          type="text"
                          placeholder="Enter source name"
                          value={editProfileData.other_source}
                          onChange={(e) => setEditProfileData({...editProfileData, other_source: e.target.value})}
                          style={inputStyle}
                        />
                      </div>
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <button
                      onClick={async () => {
                        try {
                          if (editProfileData.linkedin_profile && !urlRegex.test(editProfileData.linkedin_profile.trim())) {
                            alert('Please enter a valid LinkedIn URL');
                            return;
                          }
                          if (editProfileData.portfolio_link && !urlRegex.test(editProfileData.portfolio_link.trim())) {
                            alert('Please enter a valid Portfolio URL');
                            return;
                          }

                          let finalSource = editProfileData.source;
                          if (editProfileData.source === 'Other' && editProfileData.other_source.trim()) {
                            finalSource = editProfileData.other_source.trim();
                          }

                          const updateData = {
                            name: editProfileData.name.trim(),
                            email: editProfileData.email.trim(),
                            phone: editProfileData.phone.trim() || null,
                            domain: editProfileData.domain,
                            source: finalSource,
                            college_name: editProfileData.college_name.trim() || null,
                            degree_course: editProfileData.degree_course.trim() || null,
                            graduation_year: editProfileData.graduation_year ? parseInt(editProfileData.graduation_year) : null,
                            address: editProfileData.address.trim() || null,
                            linkedin_profile: editProfileData.linkedin_profile.trim() || null,
                            portfolio_link: editProfileData.portfolio_link.trim() || null,
                          };
                          
                          const changes = [];
                          const oldValues = {};
                          const newValues = {};
                          
                          Object.keys(updateData).forEach(key => {
                            const oldVal = candidate[key] || '';
                            const newVal = updateData[key] || '';
                            if (oldVal !== newVal) {
                              changes.push(key);
                              oldValues[key] = oldVal;
                              newValues[key] = newVal;
                            }
                          });

                          const { error } = await supabase
                            .from('candidates')
                            .update(updateData)
                            .eq('id', candidate.id);
                          
                          if (error) {
                            alert('Failed to update profile: ' + error.message);
                            return;
                          }

                          if (changes.length > 0) {
                            const changeSummary = changes.map(key => {
                              const label = fieldLabels[key] || key;
                              const oldVal = oldValues[key] || 'N/A';
                              const newVal = newValues[key] || 'N/A';
                              return `${label}: "${oldVal}" → "${newVal}"`;
                            }).join('; ');

                            await logTeamActivity(
                              'profile_updated',
                              'candidate',
                              candidate.id,
                              {
                                candidate_id: candidate.id,
                                candidate_name: candidate.name || candidate.full_name,
                                updated_fields: changes,
                                old_values: oldValues,
                                new_values: newValues,
                                change_summary: changeSummary,
                                updated_by: localStorage.getItem('userName') || 'HR'
                              }
                            );
                          }

                          if (editProfileData.source === 'Referral') {
                            const referralUpdateData = {
                              referrer_name: editProfileData.referrer_name.trim(),
                              referrer_contact: editProfileData.referrer_contact.trim(),
                              candidate_name: editProfileData.name.trim(),
                              candidate_email: editProfileData.email.trim(),
                            };
                            
                            if (referralData) {
                              await supabase
                                .from('referrals')
                                .update(referralUpdateData)
                                .eq('candidate_id', candidate.id);
                            } else {
                              await supabase
                                .from('referrals')
                                .insert({
                                  candidate_id: candidate.id,
                                  ...referralUpdateData,
                                  status: 'Pending'
                                });
                            }
                          }

                          if (candidate.source === 'Referral' && editProfileData.source !== 'Referral') {
                            await supabase
                              .from('referrals')
                              .delete()
                              .eq('candidate_id', candidate.id);
                          }
                          
                          alert(`✅ Profile updated successfully! ${changes.length} field(s) changed.`);
                          setIsEditingProfile(false);
                          fetchCompleteProfile();
                        } catch (error) {
                          alert('Error updating profile: ' + error.message);
                        }
                      }}
                      className="btn-premium"
                      style={{ flex: 1 }}
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => setIsEditingProfile(false)}
                      className="btn-glass"
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', marginBottom: '20px' }}>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Name: <strong style={{color: '#fff'}}>{candidate.name || candidate.full_name || 'N/A'}</strong></p>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Email: <strong style={{color: '#fff'}}>{candidate.email || 'N/A'}</strong></p>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Phone: <strong style={{color: '#fff'}}>{candidate.phone || 'N/A'}</strong></p>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Domain: <strong style={{color: '#fff'}}>{candidate.domain || 'N/A'}</strong></p>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Source: <strong style={{color: '#fff'}}>{candidate.source || 'N/A'}</strong></p>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Stage: 
                      <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(255,255,255,0.1)', color: '#60a5fa', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase' }}>
                        {candidate.current_stage || 'N/A'}
                      </span>
                    </p>
                  </div>

                  {candidate.source === 'Referral' && referralData && (
                    <>
                      <div style={{ height: '1px', background: 'var(--glass-border)', margin: '20px 0' }} />
                      <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>🤝 Referral Details</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Referrer Name: <strong style={{color: '#fff'}}>{referralData.referrer_name || 'N/A'}</strong></p>
                        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Referrer Contact: <strong style={{color: '#fff'}}>{referralData.referrer_contact || 'N/A'}</strong></p>
                      </div>
                    </>
                  )}

                  {candidate.source && !standardSources.includes(candidate.source) && (
                    <>
                      <div style={{ height: '1px', background: 'var(--glass-border)', margin: '20px 0' }} />
                      <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>📝 Source Details</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Source Name: <strong style={{color: '#fff'}}>{candidate.source}</strong></p>
                      </div>
                    </>
                  )}

                  {(candidate.college_name || candidate.degree_course || candidate.graduation_year) && (
                    <>
                      <div style={{ height: '1px', background: 'var(--glass-border)', margin: '20px 0' }} />
                      <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>🎓 Education</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                        {candidate.college_name && <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>College: <strong style={{color: '#fff'}}>{candidate.college_name}</strong></p>}
                        {candidate.degree_course && <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Degree: <strong style={{color: '#fff'}}>{candidate.degree_course}</strong></p>}
                        {candidate.graduation_year && <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Grad. Year: <strong style={{color: '#fff'}}>{candidate.graduation_year}</strong></p>}
                      </div>
                    </>
                  )}

                  {(candidate.address || candidate.linkedin_profile || candidate.portfolio_link) && (
                    <>
                      <div style={{ height: '1px', background: 'var(--glass-border)', margin: '20px 0' }} />
                      <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>📍 Links & Location</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {candidate.address && <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Address: <strong style={{color: '#fff'}}>{candidate.address}</strong></p>}
                        {candidate.linkedin_profile && <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>LinkedIn: <a href={candidate.linkedin_profile} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'none' }}>{candidate.linkedin_profile}</a></p>}
                        {candidate.portfolio_link && <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Portfolio: <a href={candidate.portfolio_link} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'none' }}>{candidate.portfolio_link}</a></p>}
                      </div>
                    </>
                  )}

                  <div style={{ height: '1px', background: 'var(--glass-border)', margin: '20px 0' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Resume:</span>
                    {candidate.resume_link ? (
                      <>
                        <button id="downloadResumeBtn" onClick={handleDownloadResume} disabled={downloadLoading} className="btn-glass" style={{ padding: '6px 16px', fontSize: '13px', opacity: downloadLoading ? 0.7 : 1 }}>
                          {downloadLoading ? '⏳ Downloading...' : '📥 Download PDF'}
                        </button>
                        <label className="btn-glass" style={{ padding: '6px 16px', fontSize: '13px', cursor: 'pointer', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                          {uploadResumeLoading ? '⏳ Uploading...' : '📤 Replace'}
                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={handleUploadResume}
                            disabled={uploadResumeLoading}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </>
                    ) : (
                      <label className="btn-premium" style={{ padding: '6px 16px', fontSize: '13px', cursor: 'pointer' }}>
                        {uploadResumeLoading ? '⏳ Uploading...' : '📤 Upload Resume'}
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          onChange={handleUploadResume}
                          disabled={uploadResumeLoading}
                          style={{ display: 'none' }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Internal Notes */}
            <div className="glass-panel" style={{ padding: '30px' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '18px', fontWeight: '700', display: 'flex', justifyContent: 'space-between' }}>
                <span>📝 Internal Context Notes</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '400' }}>
                  {Array.isArray(hrNotes) ? `${hrNotes.length} note(s)` : '0 notes'}
                </span>
              </h3>
              
              <div style={{ 
                background: 'rgba(0,0,0,0.2)', 
                border: '1px solid var(--glass-border)', 
                borderRadius: '8px', 
                padding: '16px', 
                marginBottom: '16px', 
                maxHeight: '250px',
                overflowY: 'auto',
                color: '#e2e8f0', 
                fontSize: '14px', 
                lineHeight: '1.6',
              }}>
                {Array.isArray(hrNotes) && hrNotes.length > 0 ? (
                  hrNotes.map((note, index) => (
                    <div key={index} style={{ 
                      padding: '12px', 
                      marginBottom: '8px', 
                      background: 'rgba(255,255,255,0.03)', 
                      borderRadius: '8px',
                      borderLeft: `3px solid ${index === 0 ? 'var(--accent)' : 'var(--primary)'}`,
                    }}>
                      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {note.content}
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginTop: '8px',
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                        paddingTop: '8px'
                      }}>
                        <span>
                          ✍️ <strong style={{ color: '#60a5fa' }}>{note.author || 'Unknown'}</strong>
                        </span>
                        <span>
                          🕐 {note.timestamp ? formatISTDateTime(note.timestamp) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No internal notes captured yet.</span>
                )}
              </div>

              <textarea 
                value={newNoteContent} 
                onChange={(e) => setNewNoteContent(e.target.value)} 
                placeholder="Add a new note here..." 
                style={{ ...inputStyle, minHeight: '60px', marginBottom: '12px', resize: 'vertical' }} 
              />
              
              <button 
                onClick={async () => {
                  if (!newNoteContent.trim()) {
                    alert('Please enter some content for the note.');
                    return;
                  }
                  
                  const userName = localStorage.getItem('userName') || localStorage.getItem('hrEmail') || 'HR User';
                  const currentTime = new Date().toISOString();
                  
                  const newNote = {
                    content: newNoteContent.trim(),
                    author: userName,
                    timestamp: currentTime
                  };
                  
                  let existingNotes = Array.isArray(hrNotes) ? hrNotes : [];
                  const updatedNotes = [newNote, ...existingNotes];
                  
                  const { error } = await supabase
                    .from('candidates')
                    .update({ hr_notes: JSON.stringify(updatedNotes) })
                    .eq('id', id);
                  
                  if (error) {
                    alert('❌ Failed to save note: ' + error.message);
                  } else {
                    setHrNotes(updatedNotes);
                    setNewNoteContent('');
                    setCandidate({ ...candidate, hr_notes: JSON.stringify(updatedNotes) });
                    
                    await logTeamActivity(
                      'candidate_note_added',
                      'candidate',
                      id,
                      {
                        candidate_id: id,
                        candidate_name: candidate.name || candidate.full_name,
                        note_content: newNoteContent.trim().substring(0, 200),
                        note_author: userName,
                        note_timestamp: currentTime,
                        action_by: localStorage.getItem('userName') || 'HR'
                      }
                    );
                    
                    alert('✅ Note added successfully!');
                  }
                }} 
                className="btn-premium" 
                style={{ width: '100%' }}
              >
                ➕ Add Note
              </button>
            </div>

            {/* Support Messages */}
            <div className="glass-panel" style={{ padding: '30px' }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#fff', fontSize: '18px', fontWeight: '700', display: 'flex', justifyContent: 'space-between' }}>
                <span>💬 Direct Support Line</span>
                <span style={{ fontSize: '13px', color: '#fbbf24', fontWeight: '600', background: 'rgba(245, 158, 11, 0.1)', padding: '4px 12px', borderRadius: '20px' }}>
                  {candidateQuestions.filter(q => q.status === 'Pending').length} Actionable
                </span>
              </h3>
              
              {candidateQuestions.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No inbound queries from candidate.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {candidateQuestions.map(q => {
                    const isSystem = q.is_system_message === true;
                    return (
                      <div key={q.id} style={{ padding: '16px', background: isSystem ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255,255,255,0.03)', borderRadius: '12px', border: `1px solid ${isSystem ? 'var(--accent)' : 'var(--glass-border)'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: isSystem ? '#c4b5fd' : (q.status === 'Replied' ? '#6ee7b7' : '#fca5a5'), textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {isSystem ? 'System Notification' : (q.status === 'Replied' ? 'Resolved Query' : 'Pending Action')}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatISTDateTime(q.created_at)}</span>
                        </div>
                        
                        {isSystem ? (
                          <>
                            <p style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#fff' }}>{q.question}</p>
                            {q.question_replies?.map(r => (
                              <div key={r.id} style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', fontSize: '13px', color: '#e2e8f0', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{r.reply}</div>
                            ))}
                          </>
                        ) : (
                          <>
                            <p style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#fff', fontWeight: '500' }}>Q: {q.question}</p>
                            {q.question_replies?.map(r => (
                              <div key={r.id} style={{ paddingLeft: '12px', borderLeft: '2px solid var(--primary)', marginTop: '8px' }}>
                                <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#bfdbfe' }}><strong>HR Reply:</strong> {r.reply}</p>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{formatISTDateTime(r.created_at)}</span>
                              </div>
                            ))}
                            
                            {!isSystem && (
                              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                {q.status !== 'Replied' ? (
                                  <button onClick={() => { setReplyingTo(q.id); setReplyText(''); }} className="btn-premium" style={{ padding: '6px 16px', fontSize: '12px' }}>Transmit Reply</button>
                                ) : (
                                  !q.is_public && <button onClick={() => { setFaqForm({ question: q.question, answer: '', category: 'General', questionId: q.id }); setIsAddingFAQ(true); setSimilarFAQ(null); }} className="btn-glass" style={{ padding: '6px 16px', fontSize: '12px', color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.3)' }}>Pin to Knowledge Base</button>
                                )}
                              </div>
                            )}
                            
                            {replyingTo === q.id && (
                              <div style={{ marginTop: '16px' }}>
                                <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Type resolution..." style={{ ...inputStyle, minHeight: '80px', marginBottom: '12px' }} />
                                <div style={{ display: 'flex', gap: '12px' }}>
                                  <button onClick={() => handleReplyToQuestion(q.id)} className="btn-premium" style={{ padding: '8px 16px', fontSize: '12px' }}>Dispatch</button>
                                  <button onClick={() => { setReplyingTo(null); setReplyText(''); }} className="btn-glass" style={{ padding: '8px 16px', fontSize: '12px' }}>Cancel</button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div className="glass-panel" style={{ padding: '30px' }}>
              <h2 style={{ margin: '0 0 24px 0', color: '#fff', fontSize: '22px', fontWeight: '800', borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px' }}>Workflow Command</h2>
              
              {!['Withdrawn', 'Rejected', 'Onboarding Done', 'Internship Discontinued', 'Terminated', 'Waitlist'].includes(candidate.current_stage) && (
                <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
                  <button onClick={() => setShowWithdrawModal(true)} className="btn-glass" style={{ flex: 1, padding: '12px', color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.3)', fontSize: '14px' }}>🚫 Withdraw</button>
                  <button onClick={() => setShowWaitlistModal(true)} className="btn-glass" style={{ flex: 1, padding: '12px', color: '#c4b5fd', borderColor: 'rgba(139, 92, 246, 0.3)', fontSize: '14px' }}>⏳ Waitlist</button>
                </div>
              )}

              {candidate.current_stage === 'On Hold' && (
                <div style={{ marginBottom: '32px', background: 'rgba(245, 158, 11, 0.1)', padding: '20px', borderRadius: '12px', border: '1px solid #f59e0b', textAlign: 'center' }}>
                  <button onClick={async () => {
                    const onHoldInterview = interviews.find(iv => iv.status === 'On Hold' && iv.result === 'On Hold');
                    if (onHoldInterview) {
                      await supabase.from('interviews').update({ status: 'Pending', result: 'Pending' }).eq('id', onHoldInterview.id);
                      await supabase.from('candidates').update({ current_stage: 'Interview' }).eq('id', id);
                      await logTeamActivity('candidate_restored_from_on_hold', 'candidate', id, { 
                        candidate_id: id, 
                        candidate_name: candidate.name || candidate.full_name, 
                        interview_id: onHoldInterview.id, 
                        round: onHoldInterview.round 
                      });
                      alert('✅ Restored to Interview stage.'); fetchCompleteProfile();
                    } else { alert('No on-hold interview found.'); }
                  }} className="btn-premium" style={{ width: '100%', marginBottom: '12px', background: '#f59e0b', color: '#000' }}>
                    🔄 Restore to Active Pipeline
                  </button>
                  <p style={{ fontSize: '13px', color: '#fcd34d', margin: 0 }}>Resume the candidate evaluation process.</p>
                </div>
              )}

              {rescheduleRequest && (
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', padding: '24px', borderRadius: '12px', marginBottom: '32px' }}>
                  <h4 style={{ color: '#fbbf24', margin: '0 0 12px 0', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '1px' }}>📅 Reschedule Requested</h4>
                  <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#e2e8f0', lineHeight: '1.6' }}><strong>Reason:</strong> {rescheduleRequest.reason}</p>
                  
                  {/* UPDATED: Navigate directly to /calendar */}
                  <button 
                    onClick={() => navigate('/calendar')} 
                    className="btn-premium"
                    style={{ background: '#f59e0b', color: '#000', width: '100%' }}
                  >
                    📅 Go to Calendar to Reschedule
                  </button>
                </div>
              )}

              {/* Assignment Phase */}
              {candidate.current_stage === 'Applied' && (
                <div style={{ marginBottom: '32px' }}>
                  <h4 style={{ margin: '0 0 16px 0', color: 'var(--text-muted)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Pending Task Assignment</h4>
                  <button onClick={handleSendAssignment} className="btn-premium" style={{ width: '100%' }}>Dispatch Assessment Module</button>
                </div>
              )}

              {(candidate.current_stage === 'Assignment' || (assignment && (candidate.current_stage === 'Interview' || candidate.current_stage === 'Selected' || candidate.current_stage === 'Probation' || isOnboardingLocked))) && (
                <div style={{ marginBottom: '40px' }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#fff', fontWeight: '700' }}>Assignment Evaluation Board</h4>
                  
                  {assignment && (
                    <div style={{ background: isAssignmentLate() ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: `1px solid ${isAssignmentLate() ? '#ef4444' : 'var(--glass-border)'}` }}>
                      {assignment.deadline && new Date(assignment.deadline).getFullYear() > 1970 && (
                        <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                          Deadline: <span style={{color: '#fff'}}>{formatISTDateTime(assignment.deadline)}</span>
                        </p>
                      )}
                      
                      {assignment.submitted_at && (
                        <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: isAssignmentLate() ? '#fca5a5' : '#6ee7b7' }}>
                          Submitted: {formatISTDateTime(assignment.submitted_at)} {isAssignmentLate() && `(LATE by ${getLateDuration()})`}
                        </p>
                      )}
                      
                      {candidate.assignment_score != null && (
                        <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6ee7b7', fontWeight: '600' }}>
                          Calculated Grade: {candidate.assignment_score} Marks
                        </p>
                      )}

                      {(hasValidLink || hasFiles) && (
                        <button onClick={() => setShowFilesModal(true)} className="btn-glass" style={{ width: '100%', fontSize: '13px' }}>
                          📁 Access Deliverables {hasFiles && `(${uploadedFiles.length})`}
                        </button>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                    <div>
                      <label style={labelStyle}>Content</label>
                      <input type="number" min="0" max="10" value={scores.content} disabled={assignmentLocked} onChange={(e) => setScores({...scores, content: e.target.value})} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Formatting</label>
                      <input type="number" min="0" max="10" value={scores.formatting} disabled={assignmentLocked} onChange={(e) => setScores({...scores, formatting: e.target.value})} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>AI Match</label>
                      <input type="number" min="0" max="10" value={scores.ai} disabled={assignmentLocked} onChange={(e) => setScores({...scores, ai: e.target.value})} style={inputStyle} />
                    </div>
                  </div>
                  <button onClick={handleSaveEvaluation} disabled={assignmentLocked} className={assignmentLocked ? 'btn-glass' : 'btn-premium'} style={{ width: '100%', opacity: assignmentLocked ? 0.5 : 1 }}>
                    {assignmentLocked ? 'Matrix Locked' : 'Commit Matrix Grades'}
                  </button>
                </div>
              )}

              {/* ===== INTERVIEW PHASE ===== */}
              {candidate.current_stage === 'Interview' && (
                <div style={{ marginTop: '24px', borderTop: '1px solid var(--glass-border)', paddingTop: '24px' }}>
                  <div style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--glass-border)' }}>
                    <h5 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#fff', fontWeight: '600' }}>
                      📅 Schedule Interview
                    </h5>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                      Go to the Calendar tab to schedule interviews. This will send calendar invitations to the candidate and panelists.
                    </p>
                    
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {/* UPDATED: Navigate directly to /calendar */}
                      <button 
                        onClick={() => navigate('/calendar')} 
                        disabled={r1Scheduled || r1Passed}
                        className={r1Scheduled || r1Passed ? 'btn-glass' : 'btn-premium'} 
                        style={{ flex: 1, opacity: (r1Scheduled || r1Passed) ? 0.5 : 1 }}
                      >
                        {r1Scheduled ? '✅ R1 Scheduled' : r1Passed ? '✅ R1 Completed' : '📆 Go to Calendar - R1'}
                      </button>
                      {!isReferral && (
                        /* UPDATED: Navigate directly to /calendar */
                        <button 
                          onClick={() => navigate('/calendar')} 
                          disabled={!r1Passed || r2Scheduled || r2Passed}
                          className={(!r1Passed || r2Scheduled || r2Passed) ? 'btn-glass' : 'btn-premium'} 
                          style={{ 
                            flex: 1, 
                            opacity: (!r1Passed || r2Scheduled || r2Passed) ? 0.5 : 1,
                            background: r1Passed && !r2Scheduled && !r2Passed ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : undefined
                          }}
                        >
                          {r2Scheduled ? '✅ R2 Scheduled' : r2Passed ? '✅ R2 Completed' : r1Passed ? '📆 Go to Calendar - R2' : '🔒 R1 Required First'}
                        </button>
                      )}
                    </div>
                    {!r1Passed && candidate.current_stage === 'Interview' && !r1Scheduled && (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px', textAlign: 'center' }}>
                        Go to the Calendar tab to schedule Round 1. After R1 is passed, you can schedule Round 2.
                      </p>
                    )}
                  </div>

                  {/* ===== DISPLAY SCHEDULED INTERVIEWS ===== */}
                  {(() => {
                    const scheduledInterviews = interviews.filter(iv => iv.scheduled_date_time);
                    
                    if (scheduledInterviews.length === 0) {
                      return (
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
                          No interviews scheduled yet. Go to the Calendar tab to schedule.
                        </p>
                      );
                    }
                    
                    return (
                      <>
                        <h4 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '16px', fontWeight: '700' }}>Active Interview Loops</h4>
                        {scheduledInterviews.map((iv) => {
                          const g = roundGrades[iv.id] || { score1: '', score2: '', score3: '' };
                          const total = (parseFloat(g.score1) || 0) + (parseFloat(g.score2) || 0) + (parseFloat(g.score3) || 0);
                          
                          let badgeBg = 'rgba(255,255,255,0.1)'; let badgeColor = '#e2e8f0'; let badgeText = iv.status || 'Pending';
                          if (iv.result === 'Rejected') { badgeBg = 'rgba(239, 68, 68, 0.1)'; badgeColor = '#fca5a5'; badgeText = 'Rejected'; }
                          else if (iv.status === 'On Hold' || iv.result === 'On Hold') { badgeBg = 'rgba(245, 158, 11, 0.1)'; badgeColor = '#fcd34d'; badgeText = 'On Hold'; }
                          else if (iv.result === 'Selected') { badgeBg = 'rgba(16, 185, 129, 0.1)'; badgeColor = '#6ee7b7'; badgeText = 'Selected'; }
                          else if (iv.status === 'Reschedule_Requested') { badgeBg = 'rgba(245, 158, 11, 0.1)'; badgeColor = '#fcd34d'; badgeText = 'Reschedule Req'; }
                          else if (iv.status === 'Scheduled') { badgeBg = 'rgba(59, 130, 246, 0.1)'; badgeColor = '#93c5fd'; badgeText = 'Scheduled'; }

                          const timeSlotDisplay = formatTimeSlotIST(iv.scheduled_date_time, iv.scheduled_end_time);
                          const dateDisplay = formatISTDate(iv.scheduled_date_time);

                          return (
                            <div key={iv.id} style={{ border: '1px solid var(--glass-border)', padding: '20px', borderRadius: '12px', marginBottom: '16px', background: 'rgba(255,255,255,0.02)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <span style={{ fontWeight: '800', color: iv.round === 'R1' ? '#60a5fa' : '#c084fc', fontSize: '16px', letterSpacing: '1px' }}>{iv.round === 'R1' ? '🎯 Interview Round 1' : '🚀 Interview Round 2'}</span>
                                <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', backgroundColor: badgeBg, color: badgeColor, textTransform: 'uppercase' }}>{badgeText}</span>
                              </div>
                              
                              {iv.panel && <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-muted)' }}>Panel: <span style={{color: '#fff'}}>{iv.panel}</span></p>}
                              {iv.panelists?.length > 0 && <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-muted)' }}>Panelists: <span style={{color: '#fff'}}>{iv.panelists.join(', ')}</span></p>}
                              
                              <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-muted)' }}>
                                Date: <span style={{color: '#fff'}}>{dateDisplay}</span>
                              </p>
                              {iv.scheduled_date_time && (
                                <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-muted)' }}>
                                  Time: <span style={{color: '#fff'}}>{timeSlotDisplay}</span>
                                </p>
                              )}
                              
                              {iv.meeting_link && (
                                <div style={{ marginBottom: '16px' }}>
                                  <a href={iv.meeting_link} target="_blank" rel="noreferrer" className="btn-glass" style={{ textDecoration: 'none', fontSize: '13px', padding: '8px 16px' }}>
                                    🔗 Access Room
                                  </a>
                                </div>
                              )}

                              {iv.calendar_event_id && (
                                <div style={{ marginBottom: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                  📅 Calendar Event: <span style={{ color: '#93c5fd' }}>Linked</span>
                                </div>
                              )}

                              {iv.candidate_accepted && <div style={{ marginBottom: '16px', color: '#6ee7b7', fontSize: '13px', fontWeight: '600' }}>✅ Candidate Acknowledged</div>}

                              {(iv.status === 'Scheduled' || iv.status === 'Reschedule_Requested') && iv.result === 'Pending' && !isInterviewLocked && (
                                /* UPDATED: Navigate directly to /calendar */
                                <button 
                                  onClick={() => navigate('/calendar')} 
                                  className="btn-glass" 
                                  style={{ padding: '8px 16px', fontSize: '12px', marginBottom: '16px' }}
                                >
                                  📅 Reschedule via Calendar
                                </button>
                              )}

                              {iv.result === 'Pending' && iv.status !== 'On Hold' && !isInterviewLocked && (
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                    <div>
                                      <label style={labelStyle}>{iv.round === 'R1' ? 'Domain' : 'Tech'}</label>
                                      <input 
                                        type="number" 
                                        min="0" 
                                        max="10" 
                                        value={g.score1} 
                                        onChange={(e) => setRoundGrades({...roundGrades, [iv.id]: {...g, score1: e.target.value}})} 
                                        style={inputStyle} 
                                      />
                                    </div>
                                    <div>
                                      <label style={labelStyle}>{iv.round === 'R1' ? 'Comm' : 'Problem'}</label>
                                      <input 
                                        type="number" 
                                        min="0" 
                                        max="10" 
                                        value={g.score2} 
                                        onChange={(e) => setRoundGrades({...roundGrades, [iv.id]: {...g, score2: e.target.value}})} 
                                        style={inputStyle} 
                                      />
                                    </div>
                                    <div>
                                      <label style={labelStyle}>{iv.round === 'R1' ? 'Avail.' : 'Culture'}</label>
                                      <input 
                                        type="number" 
                                        min="0" 
                                        max="10" 
                                        value={g.score3} 
                                        onChange={(e) => setRoundGrades({...roundGrades, [iv.id]: {...g, score3: e.target.value}})} 
                                        style={inputStyle} 
                                      />
                                    </div>
                                  </div>
                                  <p style={{ color: '#fff', fontWeight: '700', marginBottom: '16px', fontSize: '14px' }}>Calculated Total: {total}</p>
                                  
                                  <div style={{ display: 'flex', gap: '12px' }}>
                                    <button 
                                      onClick={() => handleGradeInterview(iv.id, iv.round, 'Selected')} 
                                      className="btn-premium" 
                                      style={{ flex: 1, padding: '10px', fontSize: '13px', background: '#10b981' }}
                                    >
                                      ✅ Pass
                                    </button>
                                    <button 
                                      onClick={() => handleGradeInterview(iv.id, iv.round, 'Rejected')} 
                                      className="btn-premium" 
                                      style={{ flex: 1, padding: '10px', fontSize: '13px', background: '#ef4444' }}
                                    >
                                      ❌ Reject
                                    </button>
                                    <button 
                                      onClick={() => handleGradeInterview(iv.id, iv.round, 'On Hold')} 
                                      className="btn-premium" 
                                      style={{ flex: 1, padding: '10px', fontSize: '13px', background: '#f59e0b', color: '#000' }}
                                    >
                                      ⏸ Hold
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}

                  {(candidate.current_stage !== 'Assignment' && (r1TotalScore > 0 || r2TotalScore > 0)) && (
                    <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)', textAlign: 'center' }}>
                      <p style={{ margin: '0 0 8px 0', color: '#6ee7b7', fontSize: '14px' }}>R1: {r1TotalScore} | R2: {r2TotalScore}</p>
                      <p style={{ margin: 0, color: '#34d399', fontWeight: '800', fontSize: '18px' }}>Global Interview Score: {grandTotal}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ===== PROBATION MEETING - UPDATED: Only "Schedule via Calendar" ===== */}
              {showProbationMeeting && (
                <div style={{ padding: '24px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px', border: '1px solid var(--accent)', marginTop: '30px' }}>
                  <h4 style={{ color: '#c4b5fd', margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700' }}>
                    📆 Schedule Probation Orientation
                  </h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                    Go to the Calendar tab to schedule the probation meeting. This will send calendar invitations to the candidate and panelists.
                  </p>
                  {/* UPDATED: Navigate directly to /calendar */}
                  <button 
                    onClick={() => navigate('/calendar')} 
                    className="btn-premium" 
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #c084fc)', width: '100%' }}
                  >
                    📆 Go to Calendar - Schedule Probation
                  </button>
                </div>
              )}

              {/* ===== PROBATION MANAGEMENT ===== */}
              {showProbationManagement && (
                <div style={{ padding: '24px', background: candidate.current_stage === 'Selected' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', border: `1px solid ${candidate.current_stage === 'Selected' ? 'var(--accent)' : 'var(--primary)'}`, marginTop: '30px' }}>
                  <h4 style={{ color: '#fff', margin: '0 0 20px 0', fontSize: '16px', fontWeight: '700' }}>
                    {candidate.current_stage === 'Selected' ? '📋 Orientation Scheduled' : '🚀 Active Probation'}
                  </h4>
                  
                  {probationMeetingDetails && (
                    <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <p style={{ margin: 0, fontWeight: '600', fontSize: '14px', color: '#c4b5fd' }}>Scheduled Orientation</p>
                        {/* UPDATED: Navigate directly to /calendar */}
                        <button
                          onClick={() => navigate('/calendar')}
                          className="btn-glass"
                          style={{ padding: '4px 12px', fontSize: '12px', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.3)' }}
                        >
                          📅 Reschedule via Calendar
                        </button>
                      </div>
                      <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                        Date: <span style={{color: '#fff'}}>{formatISTDate(probationMeetingDetails.date)}</span>
                      </p>
                      <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                        Time: <span style={{color: '#fff'}}>
                          {formatProbationTime(probationMeetingDetails.date, probationMeetingDetails.end)}
                        </span>
                      </p>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <a href={probationMeetingDetails.link} target="_blank" rel="noreferrer" className="btn-glass" style={{ textDecoration: 'none', padding: '6px 16px', fontSize: '12px' }}>🔗 Access Link</a>
                      </div>
                    </div>
                  )}

                  <div style={{ marginBottom: '20px' }}>
                    <label style={labelStyle}>Onboarding Status Engine</label>
                    <p style={{ margin: 0, color: '#34d399', fontWeight: '700', fontSize: '15px' }}>
                      {onboarding?.onboarding_status === 'Active' ? 'Active' : onboarding?.onboarding_status === 'Completed' ? 'Completed' : onboarding?.onboarding_status === 'Discontinued' ? 'Discontinued' : onboarding?.onboarding_status === 'Terminated' ? 'Terminated' : 'Pending'}
                    </p>
                  </div>

                  <div>
                    <label style={labelStyle}>Update Probation Lifecycle</label>
                    <select value={onboarding?.probation_status || 'Pending'} onChange={async (e) => {
                      const newStatus = e.target.value; if (newStatus === 'Select') return;
                      let obStatus = 'Pending'; let stage = candidate.current_stage; let action = '';
                      if (newStatus === 'In Progress') { obStatus = 'Active'; stage = 'Probation'; action = 'probation_started'; }
                      else if (newStatus === 'Completed') { obStatus = 'Completed'; stage = 'Onboarding Done'; action = 'onboarding_completed'; }
                      else if (newStatus === 'Discontinued') { obStatus = 'Discontinued'; stage = 'Internship Discontinued'; action = 'internship_discontinued'; }
                      else if (newStatus === 'Terminated') { obStatus = 'Terminated'; stage = 'Terminated'; action = 'candidate_terminated'; }
                      else if (newStatus === 'Pending') { obStatus = 'Pending'; stage = 'Selected'; action = 'probation_pending'; }
                      await supabase.from('onboarding').update({ probation_status: newStatus, onboarding_status: obStatus }).eq('candidate_id', id);
                      await supabase.from('candidates').update({ current_stage: stage }).eq('id', id);
                      
                      await logTeamActivity(
                        action || 'probation_updated',
                        'onboarding',
                        id,
                        {
                          candidate_id: id,
                          candidate_name: candidate.name || candidate.full_name,
                          new_status: newStatus,
                          new_stage: stage,
                          updated_by: localStorage.getItem('userName') || 'HR'
                        }
                      );
                      
                      alert(`Lifecycle updated to: ${newStatus}`); fetchCompleteProfile();
                    }} style={{ ...inputStyle, cursor: 'pointer' }}>
                      <option value="Pending" style={{color:'#000'}}>Pending (Awaiting Activation)</option>
                      <option value="In Progress" style={{color:'#000'}}>Active Probation</option>
                      <option value="Completed" style={{color:'#000'}}>Onboarding Completed</option>
                      <option value="Discontinued" style={{color:'#000'}}>Internship Discontinued</option>
                      <option value="Terminated" style={{color:'#000'}}>Terminated</option>
                    </select>
                  </div>
                </div>
              )}

              {/* End states banners */}
              {candidate.current_stage === 'Selected' && !showProbationMeeting && !showProbationManagement && (
                <div style={{ padding: '24px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)', marginTop: '30px', textAlign: 'center' }}>
                  <h4 style={{ color: '#34d399', margin: '0 0 8px 0', fontSize: '18px' }}>Candidate Selected</h4>
                  <p style={{ color: '#e2e8f0', fontSize: '14px', margin: 0 }}>Schedule a probation orientation to proceed.</p>
                </div>
              )}
              {candidate.current_stage === 'Probation' && !showProbationManagement && (
                <div style={{ padding: '24px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', border: '1px solid var(--primary)', marginTop: '30px', textAlign: 'center' }}>
                  <h4 style={{ color: '#60a5fa', margin: '0 0 8px 0', fontSize: '18px' }}>Probation Active</h4>
                </div>
              )}
              {candidate.current_stage === 'Rejected' && (
                <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#fca5a5' }}>Candidate Rejected</h4>
                </div>
              )}
              {candidate.current_stage === 'Withdrawn' && (
                <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#fca5a5' }}>Candidate Withdrawn</h4>
                </div>
              )}
              {candidate.current_stage === 'Terminated' && (
                <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#fca5a5' }}>Candidate Terminated</h4>
                </div>
              )}
              {candidate.current_stage === 'Onboarding Done' && (
                <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#34d399' }}>Onboarding Finalized</h4>
                </div>
              )}
              {candidate.current_stage === 'Internship Discontinued' && (
                <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#fbbf24' }}>Internship Discontinued</h4>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= MODALS ================= */}
        
        {/* Uploaded Files Modal */}
        {showFilesModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div className="glass-panel" style={{ padding: '30px', maxWidth: '600px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>📁 Assignment Artifacts</h3>
                <button onClick={() => setShowFilesModal(false)} className="btn-glass" style={{ padding: '4px 12px' }}>Close</button>
              </div>
              {hasValidLink && (
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid var(--glass-border)', marginBottom: '20px' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>External Link</p>
                  <a href={assignment.submitted_link} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'none', fontSize: '14px', wordBreak: 'break-all' }}>{assignment.submitted_link}</a>
                </div>
              )}
              {hasFiles ? (
                <div>
                  <p style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Uploaded Files ({uploadedFiles.length})</p>
                  {uploadedFiles.map((file) => (
                    <div key={file.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--glass-border)', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, overflow: 'hidden' }}>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#fff', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.file_name}</p>
                          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>{(file.file_size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button onClick={() => handleFileDownload(file.file_url, file.file_name)} className="btn-glass" style={{ padding: '6px 16px', fontSize: '12px' }}>Download</button>
                    </div>
                  ))}
                </div>
              ) : !hasValidLink ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 0' }}>No artifacts located.</p>
              ) : null}
            </div>
          </div>
        )}

        {/* FAQ Modal */}
        {isAddingFAQ && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ padding: '30px', maxWidth: '500px', width: '90%' }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#fff' }}>📖 Add to Knowledge Base</h3>
              {checkingSimilar ? (
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}><p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Scanning matrix for duplicates...</p></div>
              ) : similarFAQ ? (
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                  <p style={{ color: '#fcd34d', fontSize: '13px', margin: 0 }}>⚠️ Similar entry detected: <strong>"{similarFAQ.question}"</strong></p>
                </div>
              ) : null}
              <form onSubmit={handleAddFAQ}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Question</label>
                  <input value={faqForm.question} readOnly style={{...inputStyle, opacity: 0.7}} />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Verified Answer</label>
                  <textarea value={faqForm.answer} onChange={(e) => setFaqForm({...faqForm, answer: e.target.value})} rows="3" required style={{...inputStyle, resize: 'vertical'}} />
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <label style={labelStyle}>Category</label>
                  <select value={faqForm.category} onChange={(e) => setFaqForm({...faqForm, category: e.target.value})} style={{...inputStyle, color: '#000'}}>
                    <option value="General">General</option>
                    <option value="Assignment">Assignment</option>
                    <option value="Interview">Interview</option>
                    <option value="Onboarding">Onboarding</option>
                    <option value="Technical">Technical</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="submit" className="btn-premium" style={{ flex: 1 }}>Commit to KB</button>
                  <button type="button" onClick={() => { setIsAddingFAQ(false); setFaqForm({ question: '', answer: '', category: '', questionId: null }); setSimilarFAQ(null); }} className="btn-glass" style={{ flex: 1 }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Withdraw Modal */}
        {showWithdrawModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ padding: '30px', maxWidth: '500px', width: '90%' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#fca5a5' }}>🚫 Terminate Candidacy</h3>
              <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '20px', lineHeight: '1.6' }}>
                Are you sure you want to withdraw <strong>{candidate.name || candidate.full_name}</strong>? This action will alert the candidate and freeze the pipeline.
              </p>
              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>Reasoning <span style={{ color: '#ef4444' }}>*</span></label>
                <textarea value={withdrawReason} onChange={(e) => setWithdrawReason(e.target.value)} rows="3" style={{...inputStyle, resize: 'vertical'}} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={handleWithdrawCandidate} className="btn-premium" style={{ flex: 1, background: '#ef4444' }}>Confirm Withdrawal</button>
                <button onClick={() => { setShowWithdrawModal(false); setWithdrawReason(''); }} className="btn-glass" style={{ flex: 1 }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Waitlist Modal */}
        {showWaitlistModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ padding: '30px', maxWidth: '500px', width: '90%' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#c4b5fd' }}>⏳ Suspend to Waitlist</h3>
              <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '24px' }}><strong>Freezing at Stage:</strong> {candidate.current_stage}</p>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Internal Context <span style={{ color: '#ef4444' }}>*</span></label>
                <textarea value={waitlistReason} onChange={(e) => setWaitlistReason(e.target.value)} rows="2" style={{...inputStyle, resize: 'vertical'}} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>Additional Notes</label>
                <textarea value={waitlistNotes} onChange={(e) => setWaitlistNotes(e.target.value)} rows="2" style={{...inputStyle, resize: 'vertical'}} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={handleWaitlistCandidate} className="btn-premium" style={{ flex: 1, background: '#8b5cf6' }}>Confirm Waitlist</button>
                <button onClick={() => { setShowWaitlistModal(false); setWaitlistReason(''); setWaitlistNotes(''); }} className="btn-glass" style={{ flex: 1 }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* REMOVED: Reschedule Probation Meeting Modal - No longer needed since probation is scheduled via calendar */}
        
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

export default CandidateDetailsPage;