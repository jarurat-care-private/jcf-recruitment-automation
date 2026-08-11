// components/HRRegisterCandidate.jsx - WITH REFERRAL ROUND RESTRICTION
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

// ===== ACTIVITY LOGGING HELPER =====
async function logTeamActivity(action, entityType, entityId, details = {}) {
  const hrUser = localStorage.getItem('hrEmail') || 'system';
  const hrName = localStorage.getItem('userName') || 'System';
  const hrRole = localStorage.getItem('userRole') || 'system';
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
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}
// ===== END ACTIVITY LOGGING HELPER =====

const HRRegisterCandidate = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [domains, setDomains] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [registeredCandidate, setRegisteredCandidate] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeFileName, setResumeFileName] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    domain: '',
    source: '',
    current_stage: 'Applied',
    interview_round: 'R1',
    college_name: '',
    degree_course: '',
    graduation_year: '',
    address: '',
    linkedin_profile: '',
    portfolio_link: '',
    referrer_name: '',
    referrer_contact: '',
    other_source: '',
    assignment_content_score: '',
    assignment_formatting_score: '',
    assignment_ai_score: '',
    assignment_remarks: '',
    r1_domain_score: '',
    r1_communication_score: '',
    r1_availability_score: '',
    r1_remarks: '',
  });

  const stageOptions = [
    { value: 'Applied', label: 'Applied' },
    { value: 'Interview', label: 'Interview' },
  ];

  // Round options - filtered based on source
  const getRoundOptions = () => {
    // If source is Referral, only show Round 1
    if (formData.source === 'Referral') {
      return [{ value: 'R1', label: 'Round 1' }];
    }
    // Otherwise show both rounds
    return [
      { value: 'R1', label: 'Round 1' },
      { value: 'R2', label: 'Round 2' },
    ];
  };

  const sourceOptions = [
    'Internshala',
    'Referral',
    'Wellfound',
    'Indeed',
    'College Outreach',
    'Social Media',
    'Other'
  ];

  useEffect(() => {
    fetchDomains();
  }, []);

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

  async function uploadResume(file, candidateId) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${candidateId}/${Date.now()}.${fileExt}`;
    const filePath = `resumes/${fileName}`;
    const { data, error } = await supabase.storage.from('resumes').upload(filePath, file, { 
      cacheControl: '3600', 
      upsert: false, 
      contentType: 'application/pdf' 
    });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('resumes').getPublicUrl(filePath);
    return urlData.publicUrl;
  }

  function validateFile(file) {
    if (file.type !== 'application/pdf') {
      alert('Only PDF files are allowed. Please upload a PDF file.');
      return false;
    }
    if (file.size > 100 * 1024 * 1024) {
      alert('File size exceeds 100MB limit. Please upload a smaller file.');
      return false;
    }
    return true;
  }

  const handleResumeFileChange = (e) => {
    const file = e.target.files[0];
    if (file && validateFile(file)) {
      setResumeFile(file);
      setResumeFileName(file.name);
    } else {
      setResumeFile(null);
      setResumeFileName('');
      e.target.value = '';
    }
  };

  const removeResumeFile = () => {
    setResumeFile(null);
    setResumeFileName('');
    const fileInput = document.getElementById('resumeUpload');
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setMessageType('info');
    setShowSuccess(false);

    // ===== MANDATORY VALIDATION =====
    if (!formData.name.trim()) {
      setMessage('Full Name is required');
      setMessageType('error');
      setLoading(false);
      return;
    }

    if (!formData.email.trim()) {
      setMessage('Email Address is required');
      setMessageType('error');
      setLoading(false);
      return;
    }

    if (!formData.domain) {
      setMessage('Domain is required');
      setMessageType('error');
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setMessage('Please enter a valid email address');
      setMessageType('error');
      setLoading(false);
      return;
    }

    // Validate URL fields (LinkedIn and Portfolio)
    const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    if (formData.linkedin_profile && !urlRegex.test(formData.linkedin_profile.trim())) {
      setMessage('Please enter a valid LinkedIn URL');
      setMessageType('error');
      setLoading(false);
      return;
    }
    if (formData.portfolio_link && !urlRegex.test(formData.portfolio_link.trim())) {
      setMessage('Please enter a valid Portfolio URL');
      setMessageType('error');
      setLoading(false);
      return;
    }

    if (formData.source === 'Referral') {
      if (!formData.referrer_name.trim()) {
        setMessage('Referrer Name is required for Referral source');
        setMessageType('error');
        setLoading(false);
        return;
      }
      if (!formData.referrer_contact.trim()) {
        setMessage('Referrer Contact is required for Referral source');
        setMessageType('error');
        setLoading(false);
        return;
      }
    }

    if (formData.source === 'Other' && !formData.other_source.trim()) {
      setMessage('Please specify the source');
      setMessageType('error');
      setLoading(false);
      return;
    }

    if (formData.current_stage === 'Interview') {
      if (formData.assignment_content_score || formData.assignment_formatting_score || formData.assignment_ai_score) {
        if (!formData.assignment_content_score || !formData.assignment_formatting_score || !formData.assignment_ai_score) {
          setMessage('Please fill all assignment marks (Content, Formatting, AI) or leave all empty');
          setMessageType('error');
          setLoading(false);
          return;
        }
        
        const content = parseFloat(formData.assignment_content_score);
        const formatting = parseFloat(formData.assignment_formatting_score);
        const ai = parseFloat(formData.assignment_ai_score);
        
        if (content < 0 || content > 10 || formatting < 0 || formatting > 10 || ai < 0 || ai > 10) {
          setMessage('Assignment scores must be between 0 and 10');
          setMessageType('error');
          setLoading(false);
          return;
        }
      }

      // Only validate R2 fields if R2 is selected and source is not Referral
      if (formData.interview_round === 'R2' && formData.source !== 'Referral') {
        if (formData.r1_domain_score || formData.r1_communication_score || formData.r1_availability_score) {
          if (!formData.r1_domain_score || !formData.r1_communication_score || !formData.r1_availability_score) {
            setMessage('Please fill all R1 marks (Domain, Communication, Availability) or leave all empty');
            setMessageType('error');
            setLoading(false);
            return;
          }
          
          const r1Domain = parseFloat(formData.r1_domain_score);
          const r1Comm = parseFloat(formData.r1_communication_score);
          const r1Avail = parseFloat(formData.r1_availability_score);
          
          if (r1Domain < 0 || r1Domain > 10 || r1Comm < 0 || r1Comm > 10 || r1Avail < 0 || r1Avail > 10) {
            setMessage('R1 scores must be between 0 and 10');
            setMessageType('error');
            setLoading(false);
            return;
          }
        }
      }
    }

    try {
      const { data: existing, error: checkError } = await supabase
        .from('candidates')
        .select('id, email, name')
        .eq('email', formData.email.trim().toLowerCase())
        .maybeSingle();

      if (checkError) {
        throw new Error('Error checking existing candidate: ' + checkError.message);
      }

      if (existing) {
        setMessage(`❌ A candidate with email "${formData.email}" already exists. Please use a different email.`);
        setMessageType('error');
        setLoading(false);
        return;
      }

      let finalSource = formData.source;
      if (formData.source === 'Other') {
        finalSource = formData.other_source.trim();
      }

      let calculatedAssignmentScore = null;
      let assignmentContent = null, assignmentFormatting = null, assignmentAI = null;
      
      if (formData.assignment_content_score && formData.assignment_formatting_score && formData.assignment_ai_score) {
        assignmentContent = parseFloat(formData.assignment_content_score);
        assignmentFormatting = parseFloat(formData.assignment_formatting_score);
        assignmentAI = parseFloat(formData.assignment_ai_score);
        calculatedAssignmentScore = assignmentContent + assignmentFormatting - assignmentAI;
      }

      let r1CalculatedScore = null;
      let r1Score1 = null, r1Score2 = null, r1Score3 = null;
      
      if (formData.r1_domain_score && formData.r1_communication_score && formData.r1_availability_score) {
        r1Score1 = parseFloat(formData.r1_domain_score);
        r1Score2 = parseFloat(formData.r1_communication_score);
        r1Score3 = parseFloat(formData.r1_availability_score);
        r1CalculatedScore = r1Score1 + r1Score2 + r1Score3;
      }

      let r1Status = 'Pending';
      let r2Status = 'Pending';
      
      if (formData.current_stage === 'Interview') {
        if (formData.interview_round === 'R1') {
          r1Status = 'Scheduled';
        } else if (formData.interview_round === 'R2' && formData.source !== 'Referral') {
          r1Status = 'Passed';
          r2Status = 'Scheduled';
        }
      }

      const insertData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || null,
        domain: formData.domain,
        source: finalSource,
        current_stage: formData.current_stage,
        status: 'In_Progress',
        college_name: formData.college_name.trim() || null,
        degree_course: formData.degree_course.trim() || null,
        graduation_year: formData.graduation_year ? parseInt(formData.graduation_year) : null,
        address: formData.address.trim() || null,
        linkedin_profile: formData.linkedin_profile.trim() || null,
        portfolio_link: formData.portfolio_link.trim() || null,
        assignment_score: calculatedAssignmentScore,
        assignment_remarks: formData.assignment_remarks.trim() || null,
        r1_score: r1CalculatedScore,
        r1_remarks: formData.r1_remarks.trim() || null,
        r1_status: r1Status,
        r2_status: r2Status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Insert candidate first
      const { data: newCandidate, error: insertError } = await supabase
        .from('candidates')
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        throw new Error('Failed to register candidate: ' + insertError.message);
      }

      // Upload resume if provided
      let resumeUrl = null;
      if (resumeFile) {
        setUploadingResume(true);
        try {
          resumeUrl = await uploadResume(resumeFile, newCandidate.id);
          // Update candidate with resume link
          const { error: updateError } = await supabase
            .from('candidates')
            .update({ resume_link: resumeUrl })
            .eq('id', newCandidate.id);
          
          if (updateError) {
            console.error('Failed to update resume link:', updateError);
          }
        } catch (uploadError) {
          console.error('Resume upload failed:', uploadError);
          // Continue with registration even if resume upload fails
        } finally {
          setUploadingResume(false);
        }
      }

      if (assignmentContent !== null && assignmentFormatting !== null && assignmentAI !== null) {
        const assignmentData = {
          candidate_id: newCandidate.id,
          assignment_title: `${formData.domain} Core Assignment`,
          assignment_type: 'Core Assignment',
          assignment_status: 'Evaluated',
          content_score: assignmentContent,
          formatting_score: assignmentFormatting,
          ai_score: assignmentAI,
          total_score: calculatedAssignmentScore,
          evaluated_by: user?.email || localStorage.getItem('hrEmail') || 'HR',
          evaluation_date: new Date().toISOString(),
          deadline: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        await supabase.from('assignments').insert(assignmentData);
      }

      if (r1Score1 !== null && r1Score2 !== null && r1Score3 !== null) {
        const r1Data = {
          candidate_id: newCandidate.id,
          round: 'R1',
          result: r1CalculatedScore >= 15 ? 'Selected' : r1CalculatedScore >= 10 ? 'Pending' : 'Rejected',
          status: r1CalculatedScore >= 15 ? 'Passed' : r1CalculatedScore >= 10 ? 'Pending' : 'Rejected',
          score1: r1Score1,
          score2: r1Score2,
          score3: r1Score3,
          total_score: r1CalculatedScore,
          panelist_feedback: formData.r1_remarks.trim() || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        await supabase.from('interviews').insert(r1Data);
      }

      if (formData.source === 'Referral') {
        await supabase
          .from('referrals')
          .insert({
            candidate_id: newCandidate.id,
            candidate_name: newCandidate.name,
            candidate_email: newCandidate.email,
            referrer_name: formData.referrer_name.trim(),
            referrer_contact: formData.referrer_contact.trim(),
            status: 'Pending'
          });
      }

      await logTeamActivity(
        'candidate_registered_by_hr',
        'candidate',
        newCandidate.id,
        {
          candidate_id: newCandidate.id,
          candidate_name: newCandidate.name,
          candidate_email: newCandidate.email,
          domain: newCandidate.domain,
          current_stage: newCandidate.current_stage,
          interview_round: formData.interview_round,
          source: newCandidate.source,
          assignment_score: calculatedAssignmentScore,
          r1_score: r1CalculatedScore,
          resume_uploaded: !!resumeUrl,
          registered_by: user?.email || localStorage.getItem('hrEmail') || 'HR'
        }
      );

      await supabase
        .from('audit_logs')
        .insert({
          table_name: 'candidates',
          record_id: newCandidate.id,
          action: 'hr_register',
          new_data: {
            name: newCandidate.name,
            email: newCandidate.email,
            domain: newCandidate.domain,
            current_stage: newCandidate.current_stage,
            interview_round: formData.interview_round,
            source: newCandidate.source,
            assignment_score: calculatedAssignmentScore,
            r1_score: r1CalculatedScore,
            resume_uploaded: !!resumeUrl,
            registered_by: user?.email || localStorage.getItem('hrEmail') || 'HR'
          },
          performed_by: user?.email || localStorage.getItem('hrEmail') || 'HR'
        });

      setShowSuccess(true);
      setRegisteredCandidate(newCandidate);
      setMessage('✅ Candidate registered successfully!');
      setMessageType('success');

      setFormData({
        name: '',
        email: '',
        phone: '',
        domain: '',
        source: '',
        current_stage: 'Applied',
        interview_round: 'R1',
        college_name: '',
        degree_course: '',
        graduation_year: '',
        address: '',
        linkedin_profile: '',
        portfolio_link: '',
        referrer_name: '',
        referrer_contact: '',
        other_source: '',
        assignment_content_score: '',
        assignment_formatting_score: '',
        assignment_ai_score: '',
        assignment_remarks: '',
        r1_domain_score: '',
        r1_communication_score: '',
        r1_availability_score: '',
        r1_remarks: '',
      });
      setResumeFile(null);
      setResumeFileName('');
      const fileInput = document.getElementById('resumeUpload');
      if (fileInput) fileInput.value = '';

      if (onSuccess) {
        onSuccess(newCandidate);
      }

      setTimeout(() => {
        if (onClose) onClose();
      }, 5000);

    } catch (error) {
      console.error('Registration error:', error);
      setMessage(error.message || 'Failed to register candidate');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (onClose) onClose();
  };

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
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--text-muted)',
    marginBottom: '6px'
  };

  const showAssignmentMarks = formData.current_stage === 'Interview';
  const showR1Marks = formData.current_stage === 'Interview' && formData.interview_round === 'R2' && formData.source !== 'Referral';

  // Get filtered round options
  const roundOptions = getRoundOptions();

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
        padding: '32px',
        borderRadius: '16px',
        maxWidth: '620px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative'
      }}>
        <button
          onClick={handleClose}
          style={{
            position: 'sticky',
            top: '0',
            right: '0',
            float: 'right',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#94a3b8',
            padding: '4px 8px',
            borderRadius: '8px',
            transition: 'all 0.2s',
            zIndex: 10
          }}
          onMouseEnter={(e) => { e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.target.style.background = 'none'; e.target.style.color = '#94a3b8'; }}
        >
          ✕
        </button>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <span style={{ fontSize: '28px' }}>📝</span>
            <h2 style={{
              margin: 0,
              color: '#fff',
              fontSize: '22px',
              fontWeight: '700'
            }}>
              Register Candidate
            </h2>
          </div>
          <p style={{
            margin: '4px 0 0 0',
            color: 'var(--text-muted)',
            fontSize: '14px',
            paddingLeft: '44px'
          }}>
            Add a new candidate to the funnel. Name, Email, and Domain are required.
          </p>
        </div>

        {message && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
            background: messageType === 'success' ? 'rgba(16, 185, 129, 0.1)' : 
                      messageType === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
            border: `1px solid ${
              messageType === 'success' ? 'rgba(16, 185, 129, 0.3)' : 
              messageType === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'
            }`,
            color: messageType === 'success' ? '#6ee7b7' : 
                   messageType === 'error' ? '#fca5a5' : '#93c5fd',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>{messageType === 'success' ? '✅' : messageType === 'error' ? '❌' : 'ℹ️'}</span>
            {message}
          </div>
        )}

        {showSuccess && registeredCandidate && (
          <div style={{
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎉</div>
            <h3 style={{ margin: '0 0 4px 0', color: '#6ee7b7', fontSize: '18px' }}>
              Candidate Registered!
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '4px 16px',
              margin: '12px 0',
              textAlign: 'left',
              fontSize: '14px',
              color: '#e2e8f0',
              background: 'rgba(0,0,0,0.2)',
              padding: '12px 16px',
              borderRadius: '8px'
            }}>
              <span style={{ color: 'var(--text-muted)' }}>Name:</span>
              <span style={{ fontWeight: '500' }}>{registeredCandidate.name}</span>
              <span style={{ color: 'var(--text-muted)' }}>Email:</span>
              <span style={{ fontWeight: '500' }}>{registeredCandidate.email}</span>
              <span style={{ color: 'var(--text-muted)' }}>Domain:</span>
              <span style={{ fontWeight: '500' }}>{registeredCandidate.domain}</span>
              <span style={{ color: 'var(--text-muted)' }}>Stage:</span>
              <span style={{ fontWeight: '500', color: '#60a5fa' }}>{registeredCandidate.current_stage}</span>
              <span style={{ color: 'var(--text-muted)' }}>Resume:</span>
              <span style={{ fontWeight: '500', color: registeredCandidate.resume_link ? '#6ee7b7' : '#94a3b8' }}>
                {registeredCandidate.resume_link ? '✅ Uploaded' : 'Not Uploaded'}
              </span>
            </div>
            <div style={{
              marginTop: '12px',
              padding: '8px 14px',
              background: 'rgba(245, 158, 11, 0.1)',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#fcd34d'
            }}>
              💡 Candidate can now access the portal. Additional details can be filled later.
            </div>
          </div>
        )}

        {!showSuccess && (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>
                Full Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Enter full name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>
                Email Address <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>
                Domain <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={formData.domain}
                onChange={(e) => setFormData({...formData, domain: e.target.value})}
                required
                style={{...inputStyle, cursor: 'pointer', color: formData.domain ? '#fff' : '#94a3b8'}}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
              >
                <option value="" style={{ color: '#94a3b8' }}>Select Domain</option>
                {domains.map(d => (
                  <option key={d} value={d} style={{ color: '#000' }}>{d}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Phone Number</label>
              <input
                type="tel"
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
              />
            </div>

            {/* Resume Upload */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Resume (PDF only, Max 100MB)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <label 
                  className="btn-glass" 
                  style={{ 
                    padding: '10px 20px', 
                    fontSize: '14px', 
                    display: 'inline-block', 
                    cursor: 'pointer',
                    borderColor: resumeFileName ? 'rgba(16, 185, 129, 0.3)' : 'var(--glass-border)'
                  }}
                >
                  {uploadingResume ? '⏳ Uploading...' : '📎 Choose File'}
                  <input
                    id="resumeUpload"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleResumeFileChange}
                    disabled={uploadingResume}
                    style={{ display: 'none' }}
                  />
                </label>
                {resumeFileName ? (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    color: '#4ade80',
                    fontSize: '14px'
                  }}>
                    <span>📄 {resumeFileName}</span>
                    <span 
                      onClick={removeResumeFile} 
                      style={{ 
                        color: '#fca5a5', 
                        cursor: 'pointer', 
                        fontSize: '16px',
                        fontWeight: 'bold'
                      }}
                    >
                      ×
                    </span>
                  </div>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No file selected</span>
                )}
              </div>
              {uploadingResume && (
                <div style={{ marginTop: '8px', fontSize: '13px', color: '#93c5fd' }}>
                  Uploading resume...
                </div>
              )}
            </div>

            {/* Source Field */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Source</label>
              <select
                value={formData.source}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({
                    ...formData,
                    source: value,
                    referrer_name: value !== 'Referral' ? '' : formData.referrer_name,
                    referrer_contact: value !== 'Referral' ? '' : formData.referrer_contact,
                    other_source: value !== 'Other' ? '' : formData.other_source,
                    // Reset interview_round to R1 when source changes to Referral
                    interview_round: value === 'Referral' ? 'R1' : formData.interview_round,
                  });
                }}
                style={{...inputStyle, cursor: 'pointer', color: formData.source ? '#fff' : '#94a3b8'}}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
              >
                <option value="" style={{ color: '#94a3b8' }}>Select Source</option>
                {sourceOptions.map(s => (
                  <option key={s} value={s} style={{ color: '#000' }}>{s}</option>
                ))}
              </select>
            </div>

            {/* Referral Fields */}
            {formData.source === 'Referral' && (
              <div style={{
                padding: '16px',
                background: 'rgba(16, 185, 129, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '13px', color: '#6ee7b7', marginBottom: '12px', fontWeight: '600' }}>
                  🤝 Referral Details <span style={{ color: '#ef4444' }}>*</span>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={labelStyle}>Referrer Name <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="text"
                    placeholder="Referrer's full name"
                    value={formData.referrer_name}
                    onChange={(e) => setFormData({...formData, referrer_name: e.target.value})}
                    required
                    style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Referrer Contact <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="text"
                    placeholder="Phone or email"
                    value={formData.referrer_contact}
                    onChange={(e) => setFormData({...formData, referrer_contact: e.target.value})}
                    required
                    style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                  />
                </div>
              </div>
            )}

            {/* Other Source Field */}
            {formData.source === 'Other' && (
              <div style={{
                padding: '16px',
                background: 'rgba(245, 158, 11, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '13px', color: '#fbbf24', marginBottom: '12px', fontWeight: '600' }}>
                  📝 Specify Source <span style={{ color: '#ef4444' }}>*</span>
                </div>
                <div>
                  <label style={labelStyle}>Source Name <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="text"
                    placeholder="Enter source name"
                    value={formData.other_source}
                    onChange={(e) => setFormData({...formData, other_source: e.target.value})}
                    required
                    style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                  />
                </div>
              </div>
            )}

            {/* Current Stage */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>
                Current Stage <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={formData.current_stage}
                onChange={(e) => {
                  const newStage = e.target.value;
                  setFormData({
                    ...formData,
                    current_stage: newStage,
                    interview_round: newStage === 'Interview' ? formData.interview_round : 'R1',
                  });
                }}
                required
                style={{...inputStyle, cursor: 'pointer'}}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
              >
                {stageOptions.map(s => (
                  <option key={s.value} value={s.value} style={{ color: '#000' }}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Interview Round Selector - Only shown when stage is Interview */}
            {formData.current_stage === 'Interview' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>
                  Interview Round <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={formData.interview_round}
                  onChange={(e) => {
                    const newRound = e.target.value;
                    setFormData({
                      ...formData,
                      interview_round: newRound,
                      r1_domain_score: newRound === 'R1' ? '' : formData.r1_domain_score,
                      r1_communication_score: newRound === 'R1' ? '' : formData.r1_communication_score,
                      r1_availability_score: newRound === 'R1' ? '' : formData.r1_availability_score,
                      r1_remarks: newRound === 'R1' ? '' : formData.r1_remarks,
                    });
                  }}
                  required
                  style={{...inputStyle, cursor: 'pointer'}}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                >
                  {roundOptions.map(s => (
                    <option key={s.value} value={s.value} style={{ color: '#000' }}>{s.label}</option>
                  ))}
                </select>
                {formData.source === 'Referral' && (
                  <p style={{ fontSize: '12px', color: '#6ee7b7', marginTop: '6px' }}>
                    ℹ️ Referral candidates have only 1 interview round.
                  </p>
                )}
                {formData.source !== 'Referral' && (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    {formData.interview_round === 'R1' 
                      ? 'Select this if the candidate is starting from Round 1' 
                      : 'Select this if the candidate has already cleared Round 1'}
                  </p>
                )}
              </div>
            )}

            {/* DIVIDER */}
            <div style={{
              height: '1px',
              background: 'var(--glass-border)',
              margin: '24px 0',
              position: 'relative'
            }}>
              <span style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                top: '-10px',
                background: 'var(--bg-dark)',
                padding: '0 16px',
                fontSize: '12px',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                Additional Details (Optional)
              </span>
            </div>

            {/* Education */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>College/University</label>
                <input
                  type="text"
                  placeholder="College name"
                  value={formData.college_name}
                  onChange={(e) => setFormData({...formData, college_name: e.target.value})}
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Degree/Course</label>
                <input
                  type="text"
                  placeholder="Degree course"
                  value={formData.degree_course}
                  onChange={(e) => setFormData({...formData, degree_course: e.target.value})}
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Graduation Year</label>
              <input
                type="number"
                placeholder="e.g., 2024"
                min="2000"
                max="2030"
                value={formData.graduation_year}
                onChange={(e) => setFormData({...formData, graduation_year: e.target.value})}
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Address</label>
              <input
                type="text"
                placeholder="Full address"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>LinkedIn Profile</label>
                <input
                  type="url"
                  placeholder="linkedin.com/in/..."
                  value={formData.linkedin_profile}
                  onChange={(e) => setFormData({...formData, linkedin_profile: e.target.value})}
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Portfolio Link</label>
                <input
                  type="url"
                  placeholder="Portfolio URL"
                  value={formData.portfolio_link}
                  onChange={(e) => setFormData({...formData, portfolio_link: e.target.value})}
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                />
              </div>
            </div>

            {/* ===== ASSIGNMENT MARKS ===== */}
            {showAssignmentMarks && (
              <>
                <div style={{
                  height: '1px',
                  background: 'var(--glass-border)',
                  margin: '24px 0',
                  position: 'relative'
                }}>
                  <span style={{
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    top: '-10px',
                    background: 'var(--bg-dark)',
                    padding: '0 16px',
                    fontSize: '11px',
                    color: '#fbbf24',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    📊 Assignment Evaluation (Optional)
                  </span>
                </div>

                <div style={{
                  background: 'rgba(245, 158, 11, 0.05)',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>Content</label>
                      <input
                        type="number"
                        placeholder="0-10"
                        min="0"
                        max="10"
                        step="0.1"
                        value={formData.assignment_content_score}
                        onChange={(e) => setFormData({...formData, assignment_content_score: e.target.value})}
                        style={inputStyle}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Formatting</label>
                      <input
                        type="number"
                        placeholder="0-10"
                        min="0"
                        max="10"
                        step="0.1"
                        value={formData.assignment_formatting_score}
                        onChange={(e) => setFormData({...formData, assignment_formatting_score: e.target.value})}
                        style={inputStyle}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>AI Score</label>
                      <input
                        type="number"
                        placeholder="0-10"
                        min="0"
                        max="10"
                        step="0.1"
                        value={formData.assignment_ai_score}
                        onChange={(e) => setFormData({...formData, assignment_ai_score: e.target.value})}
                        style={inputStyle}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                      />
                    </div>
                  </div>
                  
                  {formData.assignment_content_score && formData.assignment_formatting_score && formData.assignment_ai_score && (
                    <div style={{
                      marginTop: '12px',
                      padding: '10px 14px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      borderRadius: '8px',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        Total Assignment Score:
                      </span>
                      <span style={{
                        fontSize: '16px',
                        fontWeight: '700',
                        color: '#6ee7b7'
                      }}>
                        {parseFloat(formData.assignment_content_score) + parseFloat(formData.assignment_formatting_score) - parseFloat(formData.assignment_ai_score)}
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Assignment Remarks</label>
                  <input
                    type="text"
                    placeholder="Evaluation notes"
                    value={formData.assignment_remarks}
                    onChange={(e) => setFormData({...formData, assignment_remarks: e.target.value})}
                    style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                  />
                </div>
              </>
            )}

            {/* ===== R1 MARKS - Only shown for Round 2 and NOT Referral ===== */}
            {showR1Marks && (
              <>
                <div style={{
                  height: '1px',
                  background: 'var(--glass-border)',
                  margin: '24px 0',
                  position: 'relative'
                }}>
                  <span style={{
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    top: '-10px',
                    background: 'var(--bg-dark)',
                    padding: '0 16px',
                    fontSize: '11px',
                    color: '#60a5fa',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    🎯 Round 1 Evaluation (Optional - Historical Data)
                  </span>
                </div>

                <div style={{
                  background: 'rgba(59, 130, 246, 0.05)',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>Domain Knowledge</label>
                      <input
                        type="number"
                        placeholder="0-10"
                        min="0"
                        max="10"
                        step="0.1"
                        value={formData.r1_domain_score}
                        onChange={(e) => setFormData({...formData, r1_domain_score: e.target.value})}
                        style={inputStyle}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Communication</label>
                      <input
                        type="number"
                        placeholder="0-10"
                        min="0"
                        max="10"
                        step="0.1"
                        value={formData.r1_communication_score}
                        onChange={(e) => setFormData({...formData, r1_communication_score: e.target.value})}
                        style={inputStyle}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Availability</label>
                      <input
                        type="number"
                        placeholder="0-10"
                        min="0"
                        max="10"
                        step="0.1"
                        value={formData.r1_availability_score}
                        onChange={(e) => setFormData({...formData, r1_availability_score: e.target.value})}
                        style={inputStyle}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                      />
                    </div>
                  </div>
                  
                  {formData.r1_domain_score && formData.r1_communication_score && formData.r1_availability_score && (
                    <div style={{
                      marginTop: '12px',
                      padding: '10px 14px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      borderRadius: '8px',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        R1 Total Score:
                      </span>
                      <span style={{
                        fontSize: '16px',
                        fontWeight: '700',
                        color: '#6ee7b7'
                      }}>
                        {parseFloat(formData.r1_domain_score) + parseFloat(formData.r1_communication_score) + parseFloat(formData.r1_availability_score)}
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>R1 Remarks</label>
                  <input
                    type="text"
                    placeholder="Interview feedback"
                    value={formData.r1_remarks}
                    onChange={(e) => setFormData({...formData, r1_remarks: e.target.value})}
                    style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                  />
                </div>
              </>
            )}

            {/* Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '24px'
            }}>
              <button
                type="button"
                onClick={handleClose}
                className="btn-glass"
                style={{ flex: 1, padding: '12px', fontSize: '14px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || uploadingResume}
                className="btn-premium"
                style={{
                  flex: 2,
                  padding: '12px',
                  fontSize: '14px',
                  opacity: (loading || uploadingResume) ? 0.7 : 1,
                  cursor: (loading || uploadingResume) ? 'not-allowed' : 'pointer'
                }}
              >
                {loading || uploadingResume ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{
                      display: 'inline-block',
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                    {uploadingResume ? 'Uploading Resume...' : 'Registering...'}
                  </span>
                ) : 'Register Candidate'}
              </button>
            </div>

            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </form>
        )}

        <div style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid var(--glass-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{
            fontSize: '11px',
            color: 'var(--text-muted)'
          }}>
            {user?.name} ({user?.role})
          </span>
          <span style={{
            fontSize: '11px',
            color: 'var(--text-muted)'
          }}>
            📋 Name & Email required
          </span>
        </div>
      </div>
    </div>
  );
};

export default HRRegisterCandidate;