// src/components/GoogleCalendar.jsx - UPDATED WITH DROPDOWN CHECKBOX SELECTION
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI;
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.events.readonly',
];

const TOKEN_KEY = 'google_calendar_token';

// ===== FIXED MEETING LINKS =====
const FIXED_MEET_LINKS = {
  'Panel 1': 'https://meet.google.com/zfz-fqpv-vrd',
  'Panel 2': 'https://meet.google.com/ajj-qafo-cbe',
  'Panel 3': 'https://meet.google.com/oqu-yyit-pna',
  'Panel 4': 'https://meet.google.com/vuj-ijcr-cqi',
  'Probation': 'https://meet.google.com/iuh-adak-cxg',
};

// ===== ACTIVITY LOGGING HELPER =====
async function logCalendarActivity(action, details = {}) {
  const hrUser = localStorage.getItem('hrEmail') || 'system';
  const hrName = localStorage.getItem('userName') || 'System';
  const hrRole = localStorage.getItem('userRole') || 'system';
  const hrTeam = localStorage.getItem('userTeam') || 'scheduling';

  try {
    await supabase
      .from('team_activity_log')
      .insert({
        user_email: hrUser,
        user_name: hrName,
        user_role: hrRole,
        team: hrTeam,
        action: action,
        entity_type: 'calendar',
        entity_id: details.interview_id || null,
        details: details
      });
    console.log(`✅ Calendar log: ${action}`, details);
  } catch (error) {
    console.error('Error logging calendar activity:', error);
  }
}

// ===== Helper: Get IST date string =====
const getISTDateStr = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ===== Helper: Format date for display =====
const formatDateIST = (date) => {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
};

// ===== Helper: Format datetime-local value =====
const formatDateTimeLocal = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// ===== Helper: Generate time slots from 6pm to 9pm =====
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 18; hour < 21; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      slots.push({ hour, minute });
    }
  }
  return slots;
};

// ===== Helper: Format time =====
const formatTimeDisplay = (hour, minute) => {
  const h = hour % 12 || 12;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${h}:${String(minute).padStart(2, '0')} ${ampm}`;
};

// ===== Helper: Get fixed meeting link =====
const getFixedMeetingLink = (panel, isProbation = false) => {
  if (isProbation) {
    return FIXED_MEET_LINKS['Probation'] || FIXED_MEET_LINKS['Panel 1'];
  }
  return FIXED_MEET_LINKS[panel] || FIXED_MEET_LINKS['Panel 1'];
};

const GoogleCalendar = ({ 
  candidateId, 
  candidateName, 
  candidateEmail, 
  candidateDomain, 
  round: initialRound,
  onScheduleComplete 
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month');
  const [error, setError] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showProbationModal, setShowProbationModal] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  
  // ===== Dropdown state =====
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [showSlotPicker, setShowSlotPicker] = useState(false);
  const [pendingRescheduleEvent, setPendingRescheduleEvent] = useState(null);

  const [showProbationRescheduleModal, setShowProbationRescheduleModal] = useState(false);
  const [probationRescheduleData, setProbationRescheduleData] = useState({
    eventId: null,
    candidateName: '',
    candidateEmail: '',
    candidateId: null,
    date: '',
    startTime: '',
    endTime: '',
    panelists: '',
    meetingLink: '',
    eventSummary: '',
    candidateDomain: '',
  });

  // Refs for drag auto-scroll
  const calendarGridRef = useRef(null);
  const dragTimeoutRef = useRef(null);
  const isDraggingRef = useRef(false);
  const isMountedRef = useRef(true);
  const fetchInProgressRef = useRef(false);
  const dragDataRef = useRef(null);

  // ===== BATCH PROBATION STATE =====
  const [probationData, setProbationData] = useState({
    date: '',
    startTime: '',
    endTime: '',
    panelists: '',
    meetingLink: '',
  });

  // Panel configuration
  const PANELS = ['Panel 1', 'Panel 2', 'Panel 3', 'Panel 4'];
  const PANEL_COLORS = {
    'Panel 1': '#3b82f6',
    'Panel 2': '#8b5cf6',
    'Panel 3': '#ec4899',
    'Panel 4': '#f59e0b',
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ===== Get available rounds for a candidate =====
  const getAvailableRounds = (candidate) => {
    if (!candidate) return [];
    
    const rounds = [];
    const isReferral = candidate.source?.toLowerCase() === 'referral';
    
    const hasR1Scheduled = candidate.interviews?.some(iv => iv.round === 'R1' && (iv.status === 'Scheduled' || iv.status === 'Reschedule_Requested'));
    const hasR1Passed = candidate.interviews?.some(iv => iv.round === 'R1' && iv.result === 'Selected');
    const hasR1Rejected = candidate.interviews?.some(iv => iv.round === 'R1' && iv.result === 'Rejected');
    const hasR1OnHold = candidate.interviews?.some(iv => iv.round === 'R1' && iv.status === 'On Hold');
    
    const hasR2Scheduled = candidate.interviews?.some(iv => iv.round === 'R2' && (iv.status === 'Scheduled' || iv.status === 'Reschedule_Requested'));
    const hasR2Passed = candidate.interviews?.some(iv => iv.round === 'R2' && iv.result === 'Selected');
    const hasR2Rejected = candidate.interviews?.some(iv => iv.round === 'R2' && iv.result === 'Rejected');
    
    if (isReferral) {
      if (!hasR1Scheduled && !hasR1Passed && !hasR1Rejected) {
        rounds.push('R1');
      }
      return rounds;
    }
    
    if (!hasR1Scheduled && !hasR1Passed && !hasR1Rejected && !hasR1OnHold) {
      rounds.push('R1');
    }
    
    if (hasR1Passed && !hasR2Scheduled && !hasR2Passed && !hasR2Rejected) {
      rounds.push('R2');
    }
    
    return rounds;
  };

  const [newEvent, setNewEvent] = useState({
    candidateId: candidateId || '',
    panel: 'Panel 1',
    round: initialRound || 'R1',
    summary: '',
    startDateTime: '',
    endDateTime: '',
    panelists: '',
  });
  const [draggedEvent, setDraggedEvent] = useState(null);

  // ===== Check authentication on mount =====
  useEffect(() => {
    isMountedRef.current = true;
    const checkAuth = async () => {
      console.log('🔐 Checking authentication...');
      const stored = localStorage.getItem(TOKEN_KEY);
      console.log('🔐 Stored token:', stored ? '✅ Found' : '❌ Not found');
      
      if (stored) {
        try {
          const token = await getAccessToken();
          if (token) {
            console.log('✅ Valid token found');
            setIsAuthenticated(true);
            await fetchEventsForMonth(selectedDate);
            await fetchCandidates();
            await fetchProbationCandidates();
          } else {
            console.log('❌ Token invalid, showing login');
            setIsAuthenticated(false);
          }
        } catch (err) {
          console.error('❌ Auth check error:', err);
          setIsAuthenticated(false);
        }
      } else {
        console.log('ℹ️ No token found, showing login');
        setIsAuthenticated(false);
      }
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    };
    
    checkAuth();
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ===== Handle OAuth callback =====
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      console.log('🔑 OAuth code found, exchanging...');
      handleOAuthCallback(code);
    }
  }, []);

  // ===== If candidateId is provided, auto-select in newEvent =====
  useEffect(() => {
    if (candidateId && candidates.length > 0) {
      const found = candidates.find(c => c.id === parseInt(candidateId));
      if (found) {
        const availableRounds = getAvailableRounds(found);
        const defaultRound = availableRounds.length > 0 ? availableRounds[0] : 'R1';
        setNewEvent(prev => ({
          ...prev,
          candidateId: String(candidateId),
          summary: `[${prev.panel}] ${found.name || 'Candidate'}`,
          round: defaultRound,
        }));
      }
    }
  }, [candidateId, candidates]);

  const handleOAuthCallback = async (code) => {
    try {
      console.log('🔄 Exchanging code for token...');
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: CLIENT_ID,
          client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });
      const data = await response.json();
      
      if (data.access_token) {
        const tokenData = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expiry_date: Date.now() + (data.expires_in || 3600) * 1000,
        };
        localStorage.setItem(TOKEN_KEY, JSON.stringify(tokenData));
        console.log('✅ Token stored successfully');
        setIsAuthenticated(true);
        window.history.replaceState({}, document.title, window.location.pathname);
        await fetchEventsForMonth(selectedDate);
        await fetchCandidates();
        await fetchProbationCandidates();
      } else {
        console.error('❌ No access token:', data);
        setError('Failed to get access token');
      }
    } catch (err) {
      setError('Failed to authenticate with Google');
      console.error(err);
    }
  };

  const getAccessToken = async () => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) return null;
    
    const tokenData = JSON.parse(stored);
    console.log('🔍 Token expiry:', tokenData.expiry_date ? new Date(tokenData.expiry_date).toLocaleString() : 'No expiry');
    
    if (tokenData.expiry_date && Date.now() < tokenData.expiry_date) {
      console.log('✅ Token is valid');
      return tokenData.access_token;
    }
    
    if (!tokenData.refresh_token) {
      console.log('⚠️ No refresh token, re-authenticating...');
      localStorage.removeItem(TOKEN_KEY);
      setIsAuthenticated(false);
      return null;
    }
    
    console.log('🔄 Refreshing token...');
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
          refresh_token: tokenData.refresh_token,
          grant_type: 'refresh_token',
        }),
      });
      
      const data = await response.json();
      
      if (data.access_token) {
        const newTokenData = {
          ...tokenData,
          access_token: data.access_token,
          expiry_date: Date.now() + (data.expires_in || 3600) * 1000,
        };
        localStorage.setItem(TOKEN_KEY, JSON.stringify(newTokenData));
        console.log('✅ Token refreshed successfully');
        return data.access_token;
      } else {
        console.error('❌ Refresh failed:', data);
        localStorage.removeItem(TOKEN_KEY);
        setIsAuthenticated(false);
        return null;
      }
    } catch (err) {
      console.error('❌ Refresh error:', err);
      localStorage.removeItem(TOKEN_KEY);
      setIsAuthenticated(false);
      return null;
    }
  };

  // ===== FETCH PROBATION CANDIDATES (Status = Selected) =====
  const fetchProbationCandidates = async () => {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('id, name, email, domain, current_stage, phone')
        .eq('current_stage', 'Selected')
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error fetching probation candidates:', error);
        return;
      }
      
      if (data && data.length > 0) {
        const candidateIds = data.map(c => c.id);
        const { data: onboardingData } = await supabase
          .from('onboarding')
          .select('candidate_id, probation_meeting_scheduled')
          .in('candidate_id', candidateIds);
        
        data.forEach(candidate => {
          const onboarding = onboardingData?.find(o => o.candidate_id === candidate.id);
          candidate.hasProbationScheduled = onboarding?.probation_meeting_scheduled === true;
        });
      }
      
      if (isMountedRef.current) {
        setCandidates(prev => {
          const existing = prev.filter(c => c.current_stage !== 'Selected');
          return [...existing, ...(data || [])];
        });
      }
    } catch (error) {
      console.error('Error in fetchProbationCandidates:', error);
    }
  };

  // ===== FETCH CANDIDATES - Interview stage =====
  const fetchCandidates = async () => {
    try {
      const { data: candidatesData, error: candidatesError } = await supabase
        .from('candidates')
        .select('id, name, email, domain, current_stage, source')
        .eq('current_stage', 'Interview');
      
      if (candidatesError) {
        console.error('Error fetching candidates:', candidatesError);
        return;
      }
      
      if (candidatesData && candidatesData.length > 0) {
        const candidateIds = candidatesData.map(c => c.id);
        const { data: interviewsData, error: interviewsError } = await supabase
          .from('interviews')
          .select('candidate_id, round, status, result')
          .in('candidate_id', candidateIds);
        
        if (!interviewsError && interviewsData) {
          candidatesData.forEach(candidate => {
            candidate.interviews = interviewsData.filter(iv => iv.candidate_id === candidate.id);
          });
        }
      }
      
      if (isMountedRef.current) {
        setCandidates(prev => {
          const probationCandidates = prev.filter(c => c.current_stage === 'Selected');
          return [...probationCandidates, ...(candidatesData || [])];
        });
      }
      
      if (candidateId && !candidatesData?.find(c => c.id === parseInt(candidateId))) {
        const { data: single } = await supabase
          .from('candidates')
          .select('id, name, email, domain, current_stage, source')
          .eq('id', parseInt(candidateId))
          .single();
        if (single) {
          const { data: singleInterviews } = await supabase
            .from('interviews')
            .select('candidate_id, round, status, result')
            .eq('candidate_id', single.id);
          single.interviews = singleInterviews || [];
          if (isMountedRef.current) {
            setCandidates(prev => [...prev, single]);
          }
        }
      }
    } catch (error) {
      console.error('Error in fetchCandidates:', error);
    }
  };

  // ===== fetchEventsForMonth =====
  const fetchEventsForMonth = async (date) => {
    if (!isMountedRef.current || fetchInProgressRef.current) return;
    
    fetchInProgressRef.current = true;
    setLoading(true);
    
    try {
      const token = await getAccessToken();
      if (!token) {
        setIsAuthenticated(false);
        setLoading(false);
        fetchInProgressRef.current = false;
        return;
      }

      const targetDate = date || selectedDate;
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      
      const startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0));
      const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));

      console.log(`📅 Fetching events for: ${startDate.toISOString()} to ${endDate.toISOString()}`);

      const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
      url.searchParams.append('timeMin', startDate.toISOString());
      url.searchParams.append('timeMax', endDate.toISOString());
      url.searchParams.append('singleEvents', 'true');
      url.searchParams.append('orderBy', 'startTime');

      const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.status === 401) {
        console.log('⚠️ Token expired, clearing...');
        localStorage.removeItem(TOKEN_KEY);
        setIsAuthenticated(false);
        setLoading(false);
        fetchInProgressRef.current = false;
        return;
      }

      const data = await response.json();
      console.log(`📦 Found ${data.items?.length || 0} events for ${year}/${month + 1}`);
      
      if (isMountedRef.current) {
        setEvents(data.items || []);
        setError(null);
      }
    } catch (err) {
      setError('Failed to fetch events');
      console.error('❌ Error fetching events:', err);
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false;
    }
  };

  // ===== getPanelFromEvent =====
  const getPanelFromEvent = (event) => {
    const summary = event.summary || '';
    
    if (summary.includes('[Panel 1]')) return 'Panel 1';
    if (summary.includes('[Panel 2]')) return 'Panel 2';
    if (summary.includes('[Panel 3]')) return 'Panel 3';
    if (summary.includes('[Panel 4]')) return 'Panel 4';
    
    if (event.description) {
      const panelMatch = event.description.match(/Panel:\s*(Panel\s*\d)/i);
      if (panelMatch) return panelMatch[1];
    }
    
    return null;
  };

  // ===== Check if event is a probation event =====
  const isProbationEvent = (event) => {
    const summary = event.summary || '';
    return summary.includes('[Probation]') || summary.includes('Probation Meeting');
  };

  // ===== NAVIGATION FUNCTIONS =====
  const goToPreviousMonth = () => {
    if (viewMode === 'slots') {
      const prevDay = new Date(selectedDate);
      prevDay.setDate(prevDay.getDate() - 1);
      setSelectedDate(prevDay);
      return;
    }
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    console.log(`⬅️ Going to previous month: ${newDate.toLocaleDateString()}`);
    setSelectedDate(newDate);
    fetchEventsForMonth(newDate);
  };

  const goToNextMonth = () => {
    if (viewMode === 'slots') {
      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);
      setSelectedDate(nextDay);
      return;
    }
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    console.log(`➡️ Going to next month: ${newDate.toLocaleDateString()}`);
    setSelectedDate(newDate);
    fetchEventsForMonth(newDate);
  };

  const goToToday = () => {
    const newDate = new Date();
    console.log(`📅 Going to today: ${newDate.toLocaleDateString()}`);
    setSelectedDate(newDate);
    fetchEventsForMonth(newDate);
  };

  // ===== DRAG & DROP HANDLERS =====
  const handleDragStart = (event, eventObj) => {
    setDraggedEvent(eventObj);
    dragDataRef.current = eventObj;
    isDraggingRef.current = true;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', eventObj.id);
    event.dataTransfer.setData('application/json', JSON.stringify(eventObj));
    console.log('🎯 Drag started:', eventObj.id);
  };

  const handleDragEnd = () => {
    console.log('🎯 Drag ended');
    isDraggingRef.current = false;
    dragDataRef.current = null;
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    
    if (calendarGridRef.current) {
      const rect = calendarGridRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const threshold = 80;
      
      if (x > rect.width - threshold) {
        if (!dragTimeoutRef.current) {
          dragTimeoutRef.current = setTimeout(() => {
            if (isDraggingRef.current) {
              goToNextMonth();
              dragTimeoutRef.current = null;
            }
          }, 800);
        }
      } else if (x < threshold) {
        if (!dragTimeoutRef.current) {
          dragTimeoutRef.current = setTimeout(() => {
            if (isDraggingRef.current) {
              goToPreviousMonth();
              dragTimeoutRef.current = null;
            }
          }, 800);
        }
      } else {
        if (dragTimeoutRef.current) {
          clearTimeout(dragTimeoutRef.current);
          dragTimeoutRef.current = null;
        }
      }
    }
  };

  // ===== Get candidate name from event =====
  const getCandidateNameFromEvent = (event) => {
    const summary = event.summary || '';
    let name = summary.replace(/\[Panel\s*\d\]\s*/, '').replace(/\[Probation\]\s*/, '');
    name = name.replace(/\s*-\s*(Probation Meeting|R1|R2|Interview).*$/, '');
    return name.trim();
  };

  // ===== Get candidate email from event =====
  const getCandidateEmailFromEvent = (event) => {
    if (event.attendees && event.attendees.length > 0) {
      const attendees = event.attendees || [];
      for (const attendee of attendees) {
        if (attendee.email && !attendee.email.includes('panel')) {
          return attendee.email;
        }
      }
      return attendees[0]?.email || '';
    }
    return '';
  };

  // ===== Get time from event =====
  const getTimeFromEvent = (event) => {
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    const startTime = start.toTimeString().slice(0, 5);
    const endTime = end.toTimeString().slice(0, 5);
    return { startTime, endTime };
  };

  // ===== Handle drop on date =====
  const handleDropOnDate = async (event, targetDateStr) => {
    event.preventDefault();
    event.stopPropagation();
    console.log('🎯 Drop on date (raw):', targetDateStr);
    
    let draggedEventObj = dragDataRef.current;
    
    if (!draggedEventObj) {
      draggedEventObj = draggedEvent;
    }
    
    if (!draggedEventObj) {
      try {
        const jsonData = event.dataTransfer.getData('application/json');
        if (jsonData) {
          draggedEventObj = JSON.parse(jsonData);
        }
      } catch (e) {}
    }
    
    if (!draggedEventObj) {
      console.log('❌ No dragged event found');
      setDraggedEvent(null);
      return;
    }

    const fullEvent = events.find(e => e.id === draggedEventObj.id);
    if (!fullEvent) {
      console.log('❌ Dragged event not found in events list');
      setDraggedEvent(null);
      return;
    }

    const targetDateParts = targetDateStr.split('-');
    const targetDate = new Date(
      parseInt(targetDateParts[0]),
      parseInt(targetDateParts[1]) - 1,
      parseInt(targetDateParts[2])
    );
    targetDate.setHours(0, 0, 0, 0);
    
    if (isNaN(targetDate.getTime())) {
      console.log('❌ Invalid target date:', targetDateStr);
      setDraggedEvent(null);
      return;
    }

    const originalStart = new Date(fullEvent.start.dateTime || fullEvent.start.date);
    const originalDateStr = getISTDateStr(originalStart);
    
    if (targetDateStr === originalDateStr) {
      console.log('⚠️ Dropping on same date, ignoring');
      setDraggedEvent(null);
      return;
    }

    if (isProbationEvent(fullEvent)) {
      console.log('🎯 Probation event detected, showing confirmation modal');
      
      const candidateName = getCandidateNameFromEvent(fullEvent);
      const candidateEmail = getCandidateEmailFromEvent(fullEvent);
      const { startTime, endTime } = getTimeFromEvent(fullEvent);
      
      let panelists = '';
      if (fullEvent.description) {
        const panelistMatch = fullEvent.description.match(/Panelists:\s*([^\n]+)/i);
        if (panelistMatch) {
          panelists = panelistMatch[1].trim();
        }
      }
      
      if (!panelists && fullEvent.attendees) {
        const panelistEmails = fullEvent.attendees
          .filter(a => a.email !== candidateEmail)
          .map(a => a.email)
          .join(', ');
        panelists = panelistEmails;
      }

      let candidateId = null;
      const foundCandidate = candidates.find(c => 
        c.name === candidateName || c.email === candidateEmail
      );
      if (foundCandidate) {
        candidateId = foundCandidate.id;
      }

      let meetingLink = '';
      if (fullEvent.description) {
        const linkMatch = fullEvent.description.match(/Meeting Link:\s*([^\n]+)/i);
        if (linkMatch) {
          meetingLink = linkMatch[1].trim();
        }
      }

      setProbationRescheduleData({
        eventId: fullEvent.id,
        candidateName: candidateName,
        candidateEmail: candidateEmail,
        candidateId: candidateId,
        date: targetDateStr,
        startTime: startTime,
        endTime: endTime,
        panelists: panelists,
        meetingLink: meetingLink,
        eventSummary: fullEvent.summary || '',
        candidateDomain: foundCandidate?.domain || '',
      });

      setShowProbationRescheduleModal(true);
      setDraggedEvent(null);
      return;
    }

    console.log('📅 Opening slot picker for:', targetDateStr);
    
    setPendingRescheduleEvent({
      eventObj: fullEvent,
      targetDateStr: targetDateStr,
      targetDate: targetDate,
      originalStart: originalStart,
    });
    
    setSelectedDate(targetDate);
    setViewMode('slots');
    setShowSlotPicker(true);
    setDraggedEvent(null);
  };

  // ===== CONFIRM PROBATION RESCHEDULE =====
  const confirmProbationReschedule = async () => {
    const data = probationRescheduleData;
    if (!data.eventId || !data.date || !data.startTime || !data.endTime) {
      alert('Please fill in all required fields.');
      return;
    }

    setIsRescheduling(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        alert('No access token found. Please reconnect your Google account.');
        setIsRescheduling(false);
        return;
      }

      const dateStr = data.date;
      const startDateTime = new Date(`${dateStr}T${data.startTime}:00+05:30`);
      const endDateTime = new Date(`${dateStr}T${data.endTime}:00+05:30`);

      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        alert('Invalid date/time format.');
        setIsRescheduling(false);
        return;
      }

      let newSummary = data.eventSummary || `[Probation] ${data.candidateName} - Probation Meeting`;
      if (!newSummary.includes('[Probation]')) {
        newSummary = `[Probation] ${data.candidateName} - Probation Meeting`;
      }

      const fixedMeetLink = getFixedMeetingLink('Panel 1', true);

      const description = `
Probation Meeting Details:
- Candidate: ${data.candidateName}
- Email: ${data.candidateEmail}
- Domain: ${data.candidateDomain || 'N/A'}
- Panelists: ${data.panelists || 'Not assigned'}
- Meeting Link: ${fixedMeetLink}

This is the probation orientation meeting for the candidate.

Please use the same meeting link for all probation meetings.
      `.trim();

      const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${data.eventId}`);
      url.searchParams.append('sendUpdates', 'all');

      const attendees = [];
      if (data.candidateEmail) {
        attendees.push({ email: data.candidateEmail, responseStatus: 'needsAction' });
      }
      if (data.panelists) {
        const panelistEmails = data.panelists.split(',').map(p => p.trim());
        for (const email of panelistEmails) {
          if (email && !attendees.some(a => a.email === email)) {
            attendees.push({ email, responseStatus: 'needsAction' });
          }
        }
      }

      const requestBody = {
        summary: newSummary,
        description: description,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: 'Asia/Kolkata',
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: 'Asia/Kolkata',
        },
        attendees: attendees,
        guestsCanSeeOtherGuests: false,
        guestsCanInviteOthers: false,
        guestsCanModify: false,
      };

      const response = await fetch(url.toString(), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Probation event rescheduled:', responseData);

        const { error: onboardingError } = await supabase
          .from('onboarding')
          .update({
            probation_meeting_date: startDateTime.toISOString(),
            probation_meeting_end: endDateTime.toISOString(),
            probation_meeting_link: fixedMeetLink,
            probation_meeting_rescheduled: true,
            updated_at: new Date().toISOString(),
          })
          .eq('candidate_id', data.candidateId);

        if (onboardingError) {
          console.error('❌ Error updating onboarding:', onboardingError);
        }

        await logCalendarActivity('probation_rescheduled_via_calendar', {
          candidate_id: data.candidateId,
          candidate_name: data.candidateName,
          new_date: startDateTime.toISOString(),
          new_time_slot: `${data.startTime} - ${data.endTime}`,
          panelists: data.panelists || 'Not assigned',
          event_id: data.eventId,
          rescheduled_by: localStorage.getItem('userName') || 'HR',
          meeting_link: fixedMeetLink,
        });

        await fetchEventsForMonth(selectedDate);
        setShowProbationRescheduleModal(false);
        setProbationRescheduleData({
          eventId: null,
          candidateName: '',
          candidateEmail: '',
          candidateId: null,
          date: '',
          startTime: '',
          endTime: '',
          panelists: '',
          meetingLink: '',
          eventSummary: '',
          candidateDomain: '',
        });

        alert(` Probation meeting rescheduled successfully!\n\n📅 ${data.candidateName}\n📆 ${new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}\n⏰ ${data.startTime} - ${data.endTime}\n🔗 Meeting Link: ${fixedMeetLink}`);

        if (onScheduleComplete) onScheduleComplete();
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to reschedule:', errorData);
        alert(`Failed to reschedule: ${errorData.error?.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('❌ Reschedule error:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsRescheduling(false);
    }
  };

  // ===== CONFIRM RESCHEDULE TO SLOT =====
  const confirmRescheduleToSlot = async (hour, minute, panel) => {
    if (!pendingRescheduleEvent) return;
    
    setIsRescheduling(true);
    try {
      const { eventObj, targetDate } = pendingRescheduleEvent;
      
      const newStart = new Date(targetDate);
      newStart.setHours(hour, minute, 0, 0);
      const newEnd = new Date(newStart);
      newEnd.setMinutes(newStart.getMinutes() + 15);
      
      const panelPrefix = `[${panel}] `;
      let newSummary = eventObj.summary || 'Interview';
      newSummary = newSummary.replace(/\[Panel\s*\d\]\s*/, '');
      newSummary = panelPrefix + newSummary;

      const token = await getAccessToken();
      if (!token) {
        alert('No access token found. Please reconnect your Google account.');
        setIsRescheduling(false);
        return;
      }

      const fixedMeetLink = getFixedMeetingLink(panel, false);

      let description = eventObj.description || '';
      description = description.replace(/Meeting Link:\s*[^\n]+/i, '');
      description = description.trim() + `\n\nMeeting Link: ${fixedMeetLink}`;

      const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventObj.id}`);
      url.searchParams.append('sendUpdates', 'all');

      const response = await fetch(url.toString(), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: newSummary,
          description: description,
          start: {
            dateTime: newStart.toISOString(),
            timeZone: 'Asia/Kolkata',
          },
          end: {
            dateTime: newEnd.toISOString(),
            timeZone: 'Asia/Kolkata',
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Event rescheduled to slot:', data);

        const updatedInterview = await updateSupabaseInterview(
          eventObj.id, 
          newStart.toISOString(), 
          newEnd.toISOString(), 
          panel,
          fixedMeetLink
        );
        
        await logCalendarActivity('interview_rescheduled_via_calendar', {
          interview_id: updatedInterview?.id || null,
          candidate_id: updatedInterview?.candidate_id || null,
          candidate_name: updatedInterview?.candidate_name || 'Unknown',
          round: updatedInterview?.round || 'Unknown',
          old_date: eventObj.start.dateTime || eventObj.start.date,
          new_date: newStart.toISOString(),
          new_time_slot: `${formatTimeDisplay(hour, minute)} - ${formatTimeDisplay(hour, minute + 15)}`,
          panel: panel,
          event_id: eventObj.id,
          rescheduled_by: localStorage.getItem('userName') || 'HR',
          meeting_link: fixedMeetLink,
        });

        await fetchEventsForMonth(selectedDate);
        setShowSlotPicker(false);
        setPendingRescheduleEvent(null);
        
        alert(` Interview rescheduled to ${panel} on ${formatDateIST(newStart)} at ${formatTimeDisplay(hour, minute)}!\n🔗 Meeting Link: ${fixedMeetLink}`);
        
        if (onScheduleComplete) onScheduleComplete();
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to reschedule:', errorData);
        alert(`Failed to reschedule: ${errorData.error?.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('❌ Reschedule error:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsRescheduling(false);
    }
  };

  // ===== UPDATE SUPABASE INTERVIEW =====
  const updateSupabaseInterview = async (eventId, startDateTime, endDateTime, panel, meetingLink) => {
    try {
      const { data: interviews, error: findError } = await supabase
        .from('interviews')
        .select('id, candidate_id, round, reschedule_count')
        .eq('calendar_event_id', eventId)
        .limit(1);

      if (findError || !interviews || interviews.length === 0) {
        console.warn('⚠️ No interview record found for event:', eventId);
        return null;
      }

      const interview = interviews[0];
      const interviewId = interview.id;
      const currentRescheduleCount = interview.reschedule_count || 0;

      const startDate = new Date(startDateTime);
      const endDate = new Date(endDateTime);
      
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istEnd = new Date(endDate.getTime() + istOffset);
      const istEndStr = istEnd.toISOString().replace('T', ' ').slice(0, 19);

      const timeSlot = `${startDate.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit', 
        timeZone: 'Asia/Kolkata', 
        hour12: true 
      })} - ${endDate.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit', 
        timeZone: 'Asia/Kolkata', 
        hour12: true 
      })}`;

      const { data: updatedData, error: updateError } = await supabase
        .from('interviews')
        .update({
          scheduled_date_time: startDate.toISOString(),
          scheduled_end_time: istEndStr,
          panel: panel || 'Panel 1',
          time_slot: timeSlot,
          reschedule_count: currentRescheduleCount + 1,
          status: 'Scheduled',
          meeting_link: meetingLink || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', interviewId)
        .select('id, candidate_id, round');

      if (updateError) {
        console.error('❌ Failed to update interview record:', updateError);
        return null;
      }
      
      await supabase
        .from('interview_reschedule_requests')
        .update({ status: 'Resolved' })
        .eq('interview_id', interviewId)
        .eq('status', 'Pending');
      
      const { data: candidateData } = await supabase
        .from('candidates')
        .select('name')
        .eq('id', updatedData[0]?.candidate_id)
        .single();
      
      return {
        ...updatedData[0],
        candidate_name: candidateData?.name || 'Unknown'
      };
    } catch (err) {
      console.error('❌ Error updating Supabase:', err);
      return null;
    }
  };

  // ===== Create event =====
  const createEvent = async (eventData) => {
    setIsCreating(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        alert('No access token found. Please reconnect your Google account.');
        setIsCreating(false);
        return;
      }

      if (!eventData.candidateId) {
        alert('Please select a candidate.');
        setIsCreating(false);
        return;
      }

      if (!eventData.startDateTime || !eventData.endDateTime) {
        alert('Please select start and end times.');
        setIsCreating(false);
        return;
      }

      let startDateTime, endDateTime;
      try {
        startDateTime = new Date(eventData.startDateTime);
        endDateTime = new Date(eventData.endDateTime);
        
        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
          throw new Error('Invalid date format');
        }
        
        if (startDateTime >= endDateTime) {
          alert('End time must be after start time.');
          setIsCreating(false);
          return;
        }
      } catch (err) {
        alert('Invalid date/time format. Please use the date picker.');
        console.error('Date parsing error:', err);
        setIsCreating(false);
        return;
      }

      const candidate = candidates.find(c => c.id === parseInt(eventData.candidateId));
      const panel = eventData.panel || 'Panel 1';
      const eventSummary = `[${panel}] ${candidate?.name || 'Candidate'} - ${eventData.round || 'R1'}`;

      const fixedMeetLink = getFixedMeetingLink(panel, false);

      const attendees = [];
      if (candidate?.email) {
        attendees.push({ email: candidate.email, responseStatus: 'needsAction' });
      }

      if (eventData.panelists) {
        const panelistEmails = eventData.panelists.split(',').map(p => p.trim());
        for (const email of panelistEmails) {
          if (email && !attendees.some(a => a.email === email)) {
            attendees.push({ email, responseStatus: 'needsAction' });
          }
        }
      }

      const requestBody = {
        summary: eventSummary,
        description: `
Interview Details:
- Candidate: ${candidate?.name || 'Candidate'}
- Panel: ${panel}
- Round: ${eventData.round || 'R1'}
- Panelists: ${eventData.panelists || 'Not assigned'}
- Meeting Link: ${fixedMeetLink}

This is the fixed meeting link for ${panel}. All interviews for this panel will use the same link.
Please join at the scheduled time.
        `.trim(),
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: 'Asia/Kolkata',
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: 'Asia/Kolkata',
        },
        attendees: attendees,
        guestsCanSeeOtherGuests: false,
        guestsCanInviteOthers: false,
        guestsCanModify: false,
      };

      const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
      url.searchParams.append('sendUpdates', 'all');

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      if (response.ok) {
        console.log('✅ Calendar event created:', responseData);
        
        const createdInterview = await createInterviewRecord(eventData, fixedMeetLink, responseData.id, startDateTime, endDateTime, panel);
        
        await logCalendarActivity('interview_scheduled_via_calendar', {
          interview_id: createdInterview?.id || null,
          candidate_id: parseInt(eventData.candidateId),
          candidate_name: candidate?.name || 'Unknown',
          round: eventData.round || 'R1',
          panel: panel,
          panelists: eventData.panelists || 'Not assigned',
          date: startDateTime.toISOString(),
          time_slot: `${startDateTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata', hour12: true })} - ${endDateTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata', hour12: true })}`,
          meeting_link: fixedMeetLink,
          event_id: responseData.id,
          scheduled_by: localStorage.getItem('userName') || 'HR'
        });

        await fetchEventsForMonth(selectedDate);
        setShowEventModal(false);
        
        alert(` Interview scheduled for ${panel}!\n\n📧 Invitations sent to ${attendees.length} attendee(s).\n🔗 Meeting Link: ${fixedMeetLink}\n\nNote: This is the fixed link for ${panel}. All interviews for this panel will use the same link.`);
        
        if (onScheduleComplete) onScheduleComplete();
      } else {
        console.error('❌ Google Calendar API error:', responseData);
        alert(`Failed to create calendar event: ${responseData.error?.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('❌ Error in createEvent:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  // ===== createInterviewRecord =====
  const createInterviewRecord = async (eventData, meetLink, calendarEventId, startDateTime, endDateTime, panel) => {
    try {
      if (!eventData.candidateId) {
        console.error('❌ No candidate ID provided');
        return null;
      }

      const candidateId = parseInt(eventData.candidateId);
      
      const startDate = startDateTime || new Date(eventData.startDateTime);
      const endDate = endDateTime || new Date(eventData.endDateTime);

      const istOffset = 5.5 * 60 * 60 * 1000;
      const istEnd = new Date(endDate.getTime() + istOffset);
      const istEndStr = istEnd.toISOString().replace('T', ' ').slice(0, 19);

      const timeSlot = `${startDate.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit', 
        timeZone: 'Asia/Kolkata', 
        hour12: true 
      })} - ${endDate.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit', 
        timeZone: 'Asia/Kolkata', 
        hour12: true 
      })}`;

      const { data, error } = await supabase.from('interviews').insert({
        candidate_id: candidateId,
        panel: panel || eventData.panel || 'Panel 1',
        round: eventData.round || 'R1',
        scheduled_date_time: startDate.toISOString(),
        scheduled_end_time: istEndStr,
        status: 'Scheduled',
        result: 'Pending',
        panelists: eventData.panelists ? eventData.panelists.split(',').map(p => p.trim()) : [],
        meeting_link: meetLink || null,
        calendar_event_id: calendarEventId || null,
        time_slot: timeSlot,
      }).select();

      if (error) {
        console.error('❌ Error creating interview record:', error);
        alert(`Failed to create interview record: ${error.message}`);
        return null;
      }

      console.log('✅ Interview record created:', data);

      const { error: updateError } = await supabase
        .from('candidates')
        .update({ 
          current_stage: 'Interview',
          r1_status: eventData.round === 'R1' ? 'Scheduled' : 'Pending',
          r2_status: eventData.round === 'R2' ? 'Scheduled' : 'Pending',
        })
        .eq('id', candidateId);

      if (updateError) {
        console.error('❌ Error updating candidate:', updateError);
      }
      
      return data?.[0] || null;
    } catch (err) {
      console.error('❌ Error in createInterviewRecord:', err);
      return null;
    }
  };

  // ===== BATCH PROBATION SCHEDULING =====
  const handleBatchProbationSchedule = async () => {
    if (selectedCandidates.length === 0) {
      alert('Please select at least one candidate.');
      return;
    }

    if (!probationData.date || !probationData.startTime || !probationData.endTime) {
      alert('Please select date, start time, and end time.');
      return;
    }

    if (probationData.startTime >= probationData.endTime) {
      alert('End time must be after start time.');
      return;
    }

    setIsCreating(true);
    let successCount = 0;
    let failCount = 0;
    const scheduledCandidates = [];

    try {
      const token = await getAccessToken();
      if (!token) {
        alert('No access token found. Please reconnect your Google account.');
        setIsCreating(false);
        return;
      }

      const dateStr = probationData.date;
      const startTime = probationData.startTime;
      const endTime = probationData.endTime;

      const startDateTime = new Date(`${dateStr}T${startTime}:00+05:30`);
      const endDateTime = new Date(`${dateStr}T${endTime}:00+05:30`);

      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        alert('Invalid date/time format.');
        setIsCreating(false);
        return;
      }

      const fixedMeetLink = getFixedMeetingLink('Panel 1', true);

      for (const candidate of selectedCandidates) {
        try {
          const eventSummary = `[Probation] ${candidate.name} - Probation Meeting`;

          const attendees = [];
          if (candidate.email) {
            attendees.push({ email: candidate.email, responseStatus: 'needsAction' });
          }

          if (probationData.panelists) {
            const panelistEmails = probationData.panelists.split(',').map(p => p.trim());
            for (const email of panelistEmails) {
              if (email && !attendees.some(a => a.email === email)) {
                attendees.push({ email, responseStatus: 'needsAction' });
              }
            }
          }

          const requestBody = {
            summary: eventSummary,
            description: `
Probation Meeting Details:
- Candidate: ${candidate.name}
- Email: ${candidate.email}
- Domain: ${candidate.domain || 'N/A'}
- Panelists: ${probationData.panelists || 'Not assigned'}
- Meeting Link: ${fixedMeetLink}

This is the fixed link for all probation meetings.
Please join at the scheduled time.
            `.trim(),
            start: {
              dateTime: startDateTime.toISOString(),
              timeZone: 'Asia/Kolkata',
            },
            end: {
              dateTime: endDateTime.toISOString(),
              timeZone: 'Asia/Kolkata',
            },
            attendees: attendees,
            guestsCanSeeOtherGuests: false,
            guestsCanInviteOthers: false,
            guestsCanModify: false,
          };

          const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
          url.searchParams.append('sendUpdates', 'all');

          const response = await fetch(url.toString(), {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          const responseData = await response.json();

          if (response.ok) {
            console.log(`✅ Probation event created for ${candidate.name}:`, responseData);

            const { data: onboardingData, error: onboardingError } = await supabase
              .from('onboarding')
              .upsert({
                candidate_id: candidate.id,
                probation_meeting_date: startDateTime.toISOString(),
                probation_meeting_end: endDateTime.toISOString(),
                probation_meeting_link: fixedMeetLink,
                probation_meeting_scheduled: true,
                onboarding_status: 'Pending',
                probation_status: 'Pending',
                updated_at: new Date().toISOString(),
              }, { onConflict: 'candidate_id' })
              .select();

            if (onboardingError) {
              console.error(`❌ Error creating onboarding for ${candidate.name}:`, onboardingError);
              failCount++;
              continue;
            }

            await supabase
              .from('candidates')
              .update({ current_stage: 'Probation' })
              .eq('id', candidate.id);

            await logCalendarActivity('probation_scheduled_via_calendar', {
              candidate_id: candidate.id,
              candidate_name: candidate.name,
              date: startDateTime.toISOString(),
              time_slot: `${startDateTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata', hour12: true })} - ${endDateTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata', hour12: true })}`,
              meeting_link: fixedMeetLink,
              event_id: responseData.id,
              scheduled_by: localStorage.getItem('userName') || 'HR',
              panelists: probationData.panelists || 'Not assigned',
              is_batch: true,
              batch_size: selectedCandidates.length
            });

            successCount++;
            scheduledCandidates.push(candidate.name);

          } else {
            console.error(`❌ Failed to create event for ${candidate.name}:`, responseData);
            failCount++;
          }

        } catch (err) {
          console.error(`❌ Error processing ${candidate.name}:`, err);
          failCount++;
        }
      }

      if (successCount > 0) {
        alert(` Probation meetings scheduled successfully!\n\n📋 Scheduled: ${successCount} candidate(s)\n❌ Failed: ${failCount}\n🔗 Meeting Link: ${fixedMeetLink}\n\nCandidates: ${scheduledCandidates.join(', ')}`);
        
        await fetchEventsForMonth(selectedDate);
        await fetchProbationCandidates();
        setShowProbationModal(false);
        setSelectedCandidates([]);
        setProbationData({
          date: '',
          startTime: '',
          endTime: '',
          panelists: '',
          meetingLink: '',
        });
        
        if (onScheduleComplete) onScheduleComplete();
      } else {
        alert(`❌ Failed to schedule any probation meetings. Please try again.`);
      }

    } catch (err) {
      console.error('❌ Error in batch probation scheduling:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  // ===== Candidate dropdown toggle handlers =====
  const toggleCandidate = (candidate) => {
    const isSelected = selectedCandidates.some(sc => sc.id === candidate.id);
    if (isSelected) {
      setSelectedCandidates(prev => prev.filter(sc => sc.id !== candidate.id));
    } else {
      setSelectedCandidates(prev => [...prev, candidate]);
    }
  };

  const selectAllAvailable = () => {
    const available = candidates.filter(c => c.current_stage === 'Selected' && !c.hasProbationScheduled);
    const allSelected = available.every(c => selectedCandidates.some(sc => sc.id === c.id));
    if (allSelected) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(available);
    }
  };

  const handleLogin = () => {
    console.log('🔑 Redirecting to Google login...');
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.append('client_id', CLIENT_ID);
    url.searchParams.append('redirect_uri', REDIRECT_URI);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('scope', SCOPES.join(' '));
    url.searchParams.append('access_type', 'offline');
    url.searchParams.append('prompt', 'consent');
    console.log('🔑 Login URL:', url.toString());
    window.location.href = url.toString();
  };

  const handleLogout = () => {
    console.log('🚪 Logging out...');
    localStorage.removeItem(TOKEN_KEY);
    setIsAuthenticated(false);
    setEvents([]);
    setError(null);
    console.log('✅ Token cleared, isAuthenticated set to false');
  };

  // ===== Helper: Check if two dates are the same day =====
  const isSameDay = (date1, date2) => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  // ===== RENDER SLOT VIEW =====
  const renderSlotView = () => {
    const dateStr = getISTDateStr(selectedDate);
    const displayDate = selectedDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      timeZone: 'Asia/Kolkata' 
    });
    const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Asia/Kolkata' });
    const slots = generateTimeSlots();

    const getEventsForSlot = (slotHour, slotMinute, panel) => {
      const slotStart = slotHour * 60 + slotMinute;
      const slotEnd = slotStart + 15;

      return events.filter(event => {
        const eventStart = new Date(event.start.dateTime || event.start.date);
        const eventDateStr = getISTDateStr(eventStart);
        if (eventDateStr !== dateStr) return false;

        const eventPanel = getPanelFromEvent(event);
        if (eventPanel !== panel) return false;

        const eventStartMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
        return eventStartMinutes >= slotStart && eventStartMinutes < slotEnd;
      });
    };

    return (
      <div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px',
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '8px',
          border: '1px solid var(--glass-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={goToPreviousMonth} className="btn-glass" style={{ padding: '4px 12px' }}>◀</button>
            <span style={{ color: '#fff', fontSize: '16px', fontWeight: '600' }}>{dayName}, {displayDate}</span>
            <button onClick={goToNextMonth} className="btn-glass" style={{ padding: '4px 12px' }}>▶</button>
            <button onClick={goToToday} className="btn-glass" style={{ padding: '4px 12px', fontSize: '12px' }}>Today</button>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {showSlotPicker ? '🔄 Select a slot to reschedule' : 
              `${events.filter(e => getISTDateStr(new Date(e.start.dateTime || e.start.date)) === dateStr).length} interviews`}
          </div>
        </div>

        {showSlotPicker && pendingRescheduleEvent && (
          <div style={{
            padding: '12px 16px',
            marginBottom: '16px',
            background: 'rgba(245, 158, 11, 0.15)',
            borderRadius: '8px',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
          }}>
            <span style={{ color: '#fcd34d', fontSize: '14px' }}>
              🔄 Rescheduling: <strong>{pendingRescheduleEvent.eventObj.summary?.replace(/\[Panel\s*\d\]\s*/, '') || 'Interview'}</strong>
              <span style={{ color: 'var(--text-muted)', fontSize: '12px', marginLeft: '8px' }}>
                → {formatDateIST(pendingRescheduleEvent.targetDate)}
              </span>
            </span>
            <button
              onClick={() => {
                setShowSlotPicker(false);
                setPendingRescheduleEvent(null);
                setViewMode('month');
              }}
              className="btn-glass"
              style={{ padding: '4px 12px', fontSize: '12px' }}
            >
              Cancel
            </button>
          </div>
        )}

        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '12px',
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '6px',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            🟢 <span style={{ color: '#6ee7b7' }}>Available</span>
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            🔴 <span style={{ color: '#f87171' }}>Booked</span>
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            🟡 <span style={{ color: '#fbbf24' }}>Selected for reschedule</span>
          </span>
          {PANELS.map(panel => (
            <span key={panel} style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              <span style={{ color: PANEL_COLORS[panel], fontWeight: '700' }}>●</span> {panel}
            </span>
          ))}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '70px ' + PANELS.map(() => '1fr').join(' '),
          gap: '2px',
          maxHeight: '500px',
          overflowY: 'auto',
          border: '1px solid var(--glass-border)',
          borderRadius: '8px',
        }}>
          <div style={{
            padding: '10px 8px',
            color: 'var(--text-muted)',
            fontSize: '11px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            borderBottom: '1px solid var(--glass-border)',
            background: 'rgba(255,255,255,0.02)',
            position: 'sticky',
            top: 0,
            zIndex: 2,
          }}>
            Time
          </div>
          {PANELS.map(panel => (
            <div key={panel} style={{
              padding: '10px 8px',
              color: PANEL_COLORS[panel],
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              borderBottom: '1px solid var(--glass-border)',
              background: 'rgba(255,255,255,0.02)',
              textAlign: 'center',
              position: 'sticky',
              top: 0,
              zIndex: 2,
            }}>
              {panel}
            </div>
          ))}

          {slots.map(({ hour, minute }, index) => {
            const timeStr = formatTimeDisplay(hour, minute);
            const isLastSlot = index === slots.length - 1;

            return (
              <React.Fragment key={index}>
                <div style={{
                  padding: '8px 6px',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  borderBottom: !isLastSlot ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {timeStr}
                </div>

                {PANELS.map(panel => {
                  const slotEvents = getEventsForSlot(hour, minute, panel);
                  const isBooked = slotEvents.length > 0;
                  const event = slotEvents[0];
                  const isPendingEvent = pendingRescheduleEvent && 
                    pendingRescheduleEvent.eventObj.id === event?.id;

                  return (
                    <div
                      key={`${panel}-${index}`}
                      style={{
                        padding: '4px',
                        borderBottom: !isLastSlot ? '1px solid rgba(255,255,255,0.05)' : 'none',
                        minHeight: '38px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isBooked ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                        cursor: isBooked ? 'default' : 'pointer',
                        border: isPendingEvent ? '2px solid #fbbf24' : 'none',
                        borderRadius: isPendingEvent ? '4px' : '0',
                      }}
                      onClick={() => {
                        if (isBooked) {
                          const startTime = new Date(event.start.dateTime);
                          const endTime = new Date(event.end.dateTime);
                          alert(`📅 ${event.summary}\n\n🕐 ${startTime.toLocaleString()} - ${endTime.toLocaleString()}\n${event.description || ''}`);
                        } else if (showSlotPicker && pendingRescheduleEvent) {
                          confirmRescheduleToSlot(hour, minute, panel);
                        } else {
                          const startDateTime = `${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+05:30`;
                          const endHour = minute === 45 ? hour + 1 : hour;
                          const endMinute = minute === 45 ? 0 : minute + 15;
                          const endDateTime = `${dateStr}T${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00+05:30`;
                          
                          setNewEvent({
                            ...newEvent,
                            panel: panel,
                            startDateTime,
                            endDateTime,
                            summary: `[${panel}] ${candidateName || 'Candidate'}`,
                          });
                          setShowEventModal(true);
                        }
                      }}
                    >
                      {isBooked ? (
                        <div style={{
                          fontSize: '10px',
                          color: isPendingEvent ? '#fbbf24' : '#fca5a5',
                          textAlign: 'center',
                          width: '100%',
                          padding: '2px 4px',
                          borderRadius: '4px',
                          background: isPendingEvent ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.2)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {isPendingEvent ? '🔄 ' : ''}
                          {event.summary?.replace(/\[Panel \d\]\s*/, '').substring(0, 12) || 'Booked'}
                        </div>
                      ) : (
                        <div style={{
                          fontSize: '10px',
                          color: '#6ee7b7',
                          textAlign: 'center',
                          width: '100%',
                          padding: '2px 4px',
                          borderRadius: '4px',
                          background: showSlotPicker ? 'rgba(251, 191, 36, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                          border: showSlotPicker ? '1px solid rgba(251, 191, 36, 0.4)' : '1px dashed rgba(16, 185, 129, 0.3)',
                        }}>
                          {showSlotPicker ? '🟡 Click to drop' : 'Available'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>

        {showSlotPicker && (
          <div style={{
            marginTop: '12px',
            padding: '8px 12px',
            background: 'rgba(251, 191, 36, 0.1)',
            borderRadius: '6px',
            border: '1px solid rgba(251, 191, 36, 0.2)',
            textAlign: 'center',
          }}>
            <span style={{ fontSize: '12px', color: '#fcd34d' }}>
              🟡 Click an <strong>Available</strong> slot above to drop the interview there
            </span>
          </div>
        )}
      </div>
    );
  };

  // ===== RENDER MONTH VIEW =====
  const renderMonthView = () => {
    console.log('📆 Rendering month view for:', selectedDate.toLocaleDateString());
    console.log('📆 Events in state:', events.length);

    const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
    const startDayOfWeek = firstDay.getDay();
    
    const prevMonthDays = startDayOfWeek;
    const prevMonthDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 0);
    const prevMonthDaysCount = prevMonthDate.getDate();
    
    const lastDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), daysInMonth);
    const endDayOfWeek = lastDayOfMonth.getDay();
    const nextMonthDays = 6 - endDayOfWeek;

    const days = [];
    
    for (let i = prevMonthDaysCount - prevMonthDays + 1; i <= prevMonthDaysCount; i++) {
      const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, i);
      days.push({ date, isOtherMonth: true });
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), d);
      days.push({ date, isOtherMonth: false });
    }
    
    for (let d = 1; d <= nextMonthDays; d++) {
      const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, d);
      days.push({ date, isOtherMonth: true });
    }

    const isToday = (date) => {
      const today = new Date();
      return date.getDate() === today.getDate() &&
             date.getMonth() === today.getMonth() &&
             date.getFullYear() === today.getFullYear();
    };

    return (
      <>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px',
          padding: '8px 0'
        }}>
          <button onClick={goToPreviousMonth} className="btn-glass" style={{ padding: '6px 16px' }}>
            ◀ Previous
          </button>
          <span style={{ color: '#fff', fontSize: '18px', fontWeight: '600' }}>
            {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={goToNextMonth} className="btn-glass" style={{ padding: '6px 16px' }}>
            Next ▶
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} style={{ 
              padding: '8px', 
              textAlign: 'center', 
              color: 'var(--text-muted)', 
              fontWeight: '600', 
              fontSize: '12px' 
            }}>
              {day}
            </div>
          ))}
        </div>
        
        <div 
          ref={calendarGridRef}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}
          onDragOver={handleDragOver}
        >
          {days.map(({ date, isOtherMonth }, index) => {
            const dateStr = getISTDateStr(date);
            const today = isToday(date);
            
            const dayEvents = events.filter(event => {
              const eventStart = new Date(event.start.dateTime || event.start.date);
              return isSameDay(eventStart, date);
            });
            
            return (
              <div
                key={`${dateStr}-${index}`}
                data-date={dateStr}
                style={{
                  padding: '8px',
                  minHeight: '80px',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px',
                  background: today ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  cursor: 'pointer',
                  position: 'relative',
                  opacity: isOtherMonth ? 0.4 : 1,
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => handleDropOnDate(e, dateStr)}
                onClick={() => {
                  setSelectedDate(date);
                  setViewMode('slots');
                  setShowSlotPicker(false);
                  setPendingRescheduleEvent(null);
                }}
              >
                <div style={{ 
                  fontWeight: today ? '700' : '400', 
                  color: today ? '#60a5fa' : (isOtherMonth ? 'var(--text-muted)' : '#fff'), 
                  fontSize: '14px' 
                }}>
                  {date.getDate()}
                </div>
                
                {dayEvents.length > 0 ? (
                  <div style={{ 
                    maxHeight: '55px', 
                    overflowY: 'auto',
                    marginTop: '4px',
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(255,255,255,0.2) transparent',
                  }}>
                    {dayEvents.map((event) => {
                      const panel = getPanelFromEvent(event);
                      const panelColor = panel ? PANEL_COLORS[panel] : '#6ee7b7';
                      let displayName = event.summary || 'Interview';
                      displayName = displayName.replace(/\[Panel\s*\d\]\s*/, '').substring(0, 14);
                      
                      return (
                        <div
                          key={event.id}
                          draggable={true}
                          style={{
                            fontSize: '9px',
                            padding: '2px 4px',
                            margin: '1px 0',
                            borderRadius: '3px',
                            background: panel ? `${panelColor}33` : 'rgba(110, 231, 183, 0.15)',
                            color: panelColor,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            cursor: 'grab',
                            borderLeft: `2px solid ${panelColor}`,
                          }}
                          onDragStart={(e) => handleDragStart(e, event)}
                          onDragEnd={handleDragEnd}
                          title={`${event.summary}\n${panel || 'No Panel'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            const eventStart = new Date(event.start.dateTime || event.start.date);
                            const eventEnd = new Date(event.end.dateTime || event.end.date);
                            alert(`📅 ${event.summary}\n\n🕐 ${eventStart.toLocaleString()} - ${eventEnd.toLocaleString()}\n${event.description || ''}`);
                          }}
                        >
                          {displayName}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: '8px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    No interviews
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {isDraggingRef.current && (
          <div style={{
            marginTop: '8px',
            padding: '8px 12px',
            background: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            textAlign: 'center',
            fontSize: '12px',
            color: '#93c5fd',
          }}>
            🔄 Drag to the edge to change months
          </div>
        )}
      </>
    );
  };

  // ===== Render main component =====
  console.log('🔐 Rendering with isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);
  
  if (!isAuthenticated && !isLoading) {
    console.log('📱 Showing login screen');
    return (
      <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>📅</div>
        <h2 style={{ color: '#fff', marginBottom: '12px' }}>Connect to Google Calendar</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
          Connect your Google account to view and schedule interviews directly from the calendar. Your session will be saved.
        </p>
        <button onClick={handleLogin} className="btn-premium" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          🔗 Connect Google Account
        </button>
        {error && <p style={{ color: '#f87171', marginTop: '16px' }}>{error}</p>}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <div className="spinner" />
        <p style={{ color: 'var(--text-muted)', marginTop: '16px' }}>Loading calendar...</p>
      </div>
    );
  }

  return (
    <>
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '20px' }}>📅 Interview Calendar</h2>
            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            {candidateName && (
              <span style={{ fontSize: '13px', color: '#60a5fa', background: 'rgba(59, 130, 246, 0.15)', padding: '4px 12px', borderRadius: '20px' }}>
                Scheduling: {candidateName}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                setViewMode('month');
                setShowSlotPicker(false);
                setPendingRescheduleEvent(null);
              }}
              className={viewMode === 'month' ? 'btn-premium' : 'btn-glass'}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              📆 Month
            </button>
            <button
              onClick={() => {
                setViewMode('slots');
                setShowSlotPicker(false);
                setPendingRescheduleEvent(null);
              }}
              className={viewMode === 'slots' ? 'btn-premium' : 'btn-glass'}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              🕐 Slots
            </button>
            {viewMode === 'month' && (
              <>
                <button onClick={goToPreviousMonth} className="btn-glass" style={{ padding: '6px 12px' }}>◀</button>
                <button onClick={goToToday} className="btn-glass" style={{ padding: '6px 12px' }}>Today</button>
                <button onClick={goToNextMonth} className="btn-glass" style={{ padding: '6px 12px' }}>▶</button>
              </>
            )}
            <button onClick={() => {
              setNewEvent({
                ...newEvent,
                candidateId: candidateId || '',
                startDateTime: '',
                endDateTime: '',
                panelists: '',
              });
              setShowEventModal(true);
            }} className="btn-premium" style={{ padding: '6px 16px', fontSize: '13px' }}>
              + New Interview
            </button>
            <button 
              onClick={() => {
                setSelectedCandidates([]);
                setProbationData({
                  date: '',
                  startTime: '',
                  endTime: '',
                  panelists: '',
                  meetingLink: '',
                });
                setShowProbationModal(true);
              }} 
              className="btn-premium" 
              style={{ 
                padding: '6px 16px', 
                fontSize: '13px', 
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              📋 Schedule Probation
            </button>
            <button onClick={handleLogout} className="btn-glass" style={{ padding: '6px 12px', color: '#f87171' }}>
              🚪 Logout
            </button>
          </div>
        </div>

        {viewMode === 'month' ? renderMonthView() : renderSlotView()}

        <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
            💡 <strong>Tip:</strong> Drag an interview to a date in Month view, then select a slot to reschedule. Click "Available" to book new interviews. Drag to the edge to change months.
          </p>
        </div>
      </div>

      {/* ===== CREATE EVENT MODAL ===== */}
      {showEventModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ padding: '30px', maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ color: '#fff', marginBottom: '20px' }}>📅 Schedule Interview</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>Candidate *</label>
              <select
                value={newEvent.candidateId}
                onChange={(e) => {
                  const candidateId = e.target.value;
                  const candidate = candidates.find(c => c.id === parseInt(candidateId));
                  const panel = newEvent.panel || 'Panel 1';
                  
                  const availableRounds = candidate ? getAvailableRounds(candidate) : [];
                  const defaultRound = availableRounds.length > 0 ? availableRounds[0] : '';
                  
                  setNewEvent({
                    ...newEvent,
                    candidateId: candidateId,
                    summary: candidate ? `[${panel}] ${candidate.name}` : '',
                    round: defaultRound,
                  });
                }}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
              >
                <option value="">Select Candidate</option>
                {candidates.filter(c => c.current_stage === 'Interview').map(c => {
                  const availableRounds = getAvailableRounds(c);
                  const isReferral = c.source?.toLowerCase() === 'referral';
                  const roundsText = isReferral ? '(Referral - R1 only)' : availableRounds.length > 0 ? `(${availableRounds.join(', ')})` : '(No rounds available)';
                  const isDisabled = availableRounds.length === 0;
                  
                  return (
                    <option 
                      key={c.id} 
                      value={c.id} 
                      style={{ color: '#000' }}
                      disabled={isDisabled}
                    >
                      {c.name} - {c.domain} {roundsText} {isDisabled ? '⚠️' : ''}
                    </option>
                  );
                })}
              </select>
              {newEvent.candidateId && (
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {(() => {
                    const selected = candidates.find(c => c.id === parseInt(newEvent.candidateId));
                    if (!selected) return '';
                    const rounds = getAvailableRounds(selected);
                    const isReferral = selected.source?.toLowerCase() === 'referral';
                    if (rounds.length === 0) return '⚠️ No rounds available for this candidate';
                    if (isReferral) return '📌 Referral candidate - Only Round 1 is available';
                    return `📌 Available rounds: ${rounds.join(', ')}`;
                  })()}
                </p>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>Panel *</label>
              <select
                value={newEvent.panel}
                onChange={(e) => {
                  const panel = e.target.value;
                  setNewEvent({
                    ...newEvent,
                    panel: panel,
                    summary: newEvent.candidateId ? `[${panel}] ${candidates.find(c => c.id === parseInt(newEvent.candidateId))?.name || 'Candidate'}` : '',
                  });
                }}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
              >
                {PANELS.map(p => (
                  <option key={p} value={p} style={{ color: '#000' }}>{p}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>Round</label>
              <select
                value={newEvent.round}
                onChange={(e) => setNewEvent({...newEvent, round: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
              >
                {(() => {
                  const selected = candidates.find(c => c.id === parseInt(newEvent.candidateId));
                  const availableRounds = selected ? getAvailableRounds(selected) : [];
                  const isReferral = selected?.source?.toLowerCase() === 'referral';
                  
                  if (isReferral) {
                    return <option value="R1" style={{ color: '#000' }}>Round 1 (Referral)</option>;
                  }
                  
                  if (availableRounds.length === 0) {
                    return <option value="" style={{ color: '#666' }}>No rounds available</option>;
                  }
                  
                  return availableRounds.map(round => (
                    <option key={round} value={round} style={{ color: '#000' }}>{round}</option>
                  ));
                })()}
              </select>
              {newEvent.candidateId && (
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {(() => {
                    const selected = candidates.find(c => c.id === parseInt(newEvent.candidateId));
                    if (!selected) return '';
                    const isReferral = selected.source?.toLowerCase() === 'referral';
                    const hasR1Passed = selected.interviews?.some(iv => iv.round === 'R1' && iv.result === 'Selected');
                    
                    if (isReferral) {
                      return '🔹 Referral candidates proceed to Probation after R1 selection';
                    }
                    if (hasR1Passed) {
                      return '🔹 R1 passed - R2 is available for scheduling';
                    }
                    return '';
                  })()}
                </p>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Start Date & Time *
              </label>
              <input
                type="datetime-local"
                value={newEvent.startDateTime ? formatDateTimeLocal(newEvent.startDateTime) : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) {
                    const startDate = new Date(value + '+05:30');
                    let endDate;
                    if (newEvent.endDateTime) {
                      endDate = new Date(newEvent.endDateTime);
                      if (endDate <= startDate) {
                        endDate = new Date(startDate.getTime() + 15 * 60 * 1000);
                      }
                    } else {
                      endDate = new Date(startDate.getTime() + 15 * 60 * 1000);
                    }
                    setNewEvent({
                      ...newEvent,
                      startDateTime: startDate.toISOString(),
                      endDateTime: endDate.toISOString(),
                    });
                  }
                }}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                End Date & Time *
              </label>
              <input
                type="datetime-local"
                value={newEvent.endDateTime ? formatDateTimeLocal(newEvent.endDateTime) : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) {
                    const endDate = new Date(value + '+05:30');
                    setNewEvent({
                      ...newEvent,
                      endDateTime: endDate.toISOString(),
                    });
                  }
                }}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
              />
              
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>Panelists (comma separated)</label>
              <input
                type="text"
                placeholder="john@example.com, jane@example.com"
                value={newEvent.panelists}
                onChange={(e) => setNewEvent({...newEvent, panelists: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
              />
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Enter email addresses of panelists (they will receive calendar invitations)
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => {
                  const candidate = candidates.find(c => c.id === parseInt(newEvent.candidateId));
                  if (!candidate) {
                    alert('Please select a candidate');
                    return;
                  }
                  
                  const availableRounds = getAvailableRounds(candidate);
                  if (!availableRounds.includes(newEvent.round)) {
                    alert(`Round ${newEvent.round} is not available for this candidate. Available rounds: ${availableRounds.join(', ')}`);
                    return;
                  }
                  
                  createEvent({
                    ...newEvent,
                    candidateName: candidate?.name || '',
                    candidateEmail: candidate?.email || '',
                  });
                }} 
                className="btn-premium" 
                style={{ flex: 1, opacity: isCreating ? 0.7 : 1 }}
                disabled={isCreating}
              >
                {isCreating ? 'Creating...' : 'Create Interview'}
              </button>
              <button 
                onClick={() => setShowEventModal(false)} 
                className="btn-glass" 
                style={{ flex: 1 }}
                disabled={isCreating}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== BATCH PROBATION SCHEDULING MODAL - WITH DROPDOWN CHECKBOXES ===== */}
      {/* ===== BATCH PROBATION SCHEDULING MODAL - WITH FLOATING DROPDOWN ===== */}
{showProbationModal && (
  <div style={{
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  }}>
    <div className="glass-panel" style={{ 
      padding: '30px', 
      maxWidth: '600px', 
      width: '100%', 
      maxHeight: '90vh', 
      overflowY: 'auto' 
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        borderBottom: '1px solid var(--glass-border)',
        paddingBottom: '16px'
      }}>
        <h3 style={{ color: '#fff', margin: 0 }}>
          📋 Schedule Probation Meetings
          <span style={{ 
            fontSize: '13px', 
            fontWeight: '400', 
            color: 'var(--text-muted)', 
            marginLeft: '12px' 
          }}>
            (Batch Scheduling)
          </span>
        </h3>
        <button 
          onClick={() => {
            setShowProbationModal(false);
            setIsDropdownOpen(false);
          }} 
          className="btn-glass"
          style={{ padding: '6px 14px' }}
          disabled={isCreating}
        >
          ✕ Close
        </button>
      </div>

      

      {/* ===== CANDIDATE SELECTION WITH FLOATING DROPDOWN ===== */}
      <div style={{ marginBottom: '20px', position: 'relative' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '10px'
        }}>
          <label style={{ 
            display: 'block', 
            fontSize: '13px', 
            color: '#e2e8f0', 
            fontWeight: '600'
          }}>
            Select Candidates *
            <span style={{ 
              fontSize: '12px', 
              color: 'var(--text-muted)', 
              fontWeight: '400', 
              marginLeft: '8px' 
            }}>
              ({selectedCandidates.length} selected)
            </span>
          </label>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="btn-premium"
            style={{ 
              padding: '6px 16px', 
              fontSize: '12px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {isDropdownOpen ? '' : '▼ Select Candidates'}
          </button>
        </div>

        {/* ===== FLOATING DROPDOWN CONTENT ===== */}
        {isDropdownOpen && (
          <div 
            ref={dropdownRef}
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              background: 'rgba(20, 20, 40, 0.98)',
              backdropFilter: 'blur(20px)',
              maxHeight: '250px',
              overflowY: 'auto',
              padding: '8px',
              zIndex: 50,
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          >
            {/* Select All / Deselect All inside dropdown */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: '6px',
                marginBottom: '6px',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.15)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={selectAllAvailable}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)';
              }}
            >
              <input
                type="checkbox"
                checked={(() => {
                  const available = candidates.filter(c => c.current_stage === 'Selected' && !c.hasProbationScheduled);
                  const allSelected = available.length > 0 && available.every(c => selectedCandidates.some(sc => sc.id === c.id));
                  return allSelected && available.length > 0;
                })()}
                onChange={() => {}}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer',
                  accentColor: '#10b981'
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ color: '#60a5fa', fontWeight: '500', fontSize: '14px' }}>
                  {(() => {
                    const available = candidates.filter(c => c.current_stage === 'Selected' && !c.hasProbationScheduled);
                    const allSelected = available.length > 0 && available.every(c => selectedCandidates.some(sc => sc.id === c.id));
                    return allSelected ? ' Deselect All' : ' Select All Available';
                  })()}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                  {(() => {
                    const available = candidates.filter(c => c.current_stage === 'Selected' && !c.hasProbationScheduled);
                    return `${available.length} candidate(s) available for selection`;
                  })()}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{
              height: '1px',
              background: 'var(--glass-border)',
              margin: '6px 0'
            }} />

            {/* Candidate List */}
            {candidates.filter(c => c.current_stage === 'Selected').length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0', fontSize: '14px' }}>
                No candidates in "Selected" stage.
              </p>
            ) : (
              candidates.filter(c => c.current_stage === 'Selected').map(c => {
                const hasProbationScheduled = c.hasProbationScheduled === true;
                const isSelected = selectedCandidates.some(sc => sc.id === c.id);
                
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      if (!hasProbationScheduled) {
                        toggleCandidate(c);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      marginBottom: '4px',
                      background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                      border: isSelected ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid transparent',
                      cursor: hasProbationScheduled ? 'not-allowed' : 'pointer',
                      opacity: hasProbationScheduled ? 0.5 : 1,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!hasProbationScheduled && !isSelected) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={hasProbationScheduled}
                      onChange={() => {}}
                      style={{
                        width: '16px',
                        height: '16px',
                        cursor: hasProbationScheduled ? 'not-allowed' : 'pointer',
                        accentColor: '#10b981'
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#fff', fontWeight: '500', fontSize: '14px' }}>
                        {c.name}
                        {hasProbationScheduled && (
                          <span style={{ 
                            fontSize: '10px', 
                            color: '#fbbf24', 
                            marginLeft: '8px',
                            background: 'rgba(245, 158, 11, 0.15)',
                            padding: '2px 8px',
                            borderRadius: '10px'
                          }}>
                            Already Scheduled
                          </span>
                        )}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                        {c.domain || 'No Domain'} • {c.email || 'No Email'}
                      </div>
                    </div>
                    {isSelected && !hasProbationScheduled && (
                      <span style={{ color: '#34d399', fontSize: '12px', fontWeight: '600' }}>✓</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Selected candidates summary */}
        {selectedCandidates.length > 0 && (
          <div style={{
            marginTop: '8px',
            padding: '8px 12px',
            background: 'rgba(16, 185, 129, 0.05)',
            borderRadius: '6px',
            border: '1px solid rgba(16, 185, 129, 0.2)',
          }}>
            <p style={{ fontSize: '12px', color: '#6ee7b7', margin: 0 }}>
              ✅ {selectedCandidates.length} candidate(s) selected: 
              <span style={{ color: '#fff', marginLeft: '4px' }}>
                {selectedCandidates.map(c => c.name).join(', ')}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Date and Time - These stay in place */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '13px', color: '#e2e8f0', marginBottom: '8px', fontWeight: '600' }}>
          Date *
        </label>
        <input
          type="date"
          value={probationData.date}
          onChange={(e) => setProbationData({...probationData, date: e.target.value})}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid var(--glass-border)',
            background: 'rgba(255,255,255,0.05)',
            color: '#fff',
            fontSize: '14px',
            outline: 'none',
          }}
          min={new Date().toISOString().split('T')[0]}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', color: '#e2e8f0', marginBottom: '8px', fontWeight: '600' }}>
            Start Time *
          </label>
          <input
            type="time"
            value={probationData.startTime}
            onChange={(e) => setProbationData({...probationData, startTime: e.target.value})}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid var(--glass-border)',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', color: '#e2e8f0', marginBottom: '8px', fontWeight: '600' }}>
            End Time *
          </label>
          <input
            type="time"
            value={probationData.endTime}
            onChange={(e) => setProbationData({...probationData, endTime: e.target.value})}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid var(--glass-border)',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Panelists and Meeting Link */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '13px', color: '#e2e8f0', marginBottom: '8px', fontWeight: '600' }}>
          Panelists (comma separated)
        </label>
        <input
          type="text"
          placeholder="john@example.com, jane@example.com"
          value={probationData.panelists}
          onChange={(e) => setProbationData({...probationData, panelists: e.target.value})}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid var(--glass-border)',
            background: 'rgba(255,255,255,0.05)',
            color: '#fff',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Panelists will receive calendar invitations for all selected candidates
        </p>
      </div>

      {/* Meeting Link */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '13px', color: '#e2e8f0', marginBottom: '8px', fontWeight: '600' }}>
          Meeting Link 
        </label>
        <input
          type="text"
          value={getFixedMeetingLink('Panel 1', true)}
          readOnly
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid var(--glass-border)',
            background: 'rgba(255,255,255,0.03)',
            color: '#94a3b8',
            fontSize: '14px',
            outline: 'none',
            cursor: 'not-allowed',
          }}
        />
        
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
        <button
          onClick={handleBatchProbationSchedule}
          disabled={selectedCandidates.length === 0 || !probationData.date || !probationData.startTime || !probationData.endTime || isCreating}
          className="btn-premium"
          style={{ 
            flex: 1, 
            opacity: (selectedCandidates.length === 0 || !probationData.date || !probationData.startTime || !probationData.endTime || isCreating) ? 0.5 : 1,
            background: 'linear-gradient(135deg, #10b981, #059669)',
          }}
        >
          {isCreating ? '⏳ Scheduling...' : `📋 Schedule for ${selectedCandidates.length} Candidate(s)`}
        </button>
        <button
          onClick={() => {
            setShowProbationModal(false);
            setIsDropdownOpen(false);
          }}
          className="btn-glass"
          style={{ flex: 1 }}
          disabled={isCreating}
        >
          Cancel
        </button>
      </div>

      {selectedCandidates.length > 0 && probationData.date && probationData.startTime && probationData.endTime && (
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          background: 'rgba(16, 185, 129, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(16, 185, 129, 0.2)',
        }}>
          <p style={{ fontSize: '12px', color: '#6ee7b7', margin: 0 }}>
            📋 Will schedule probation for <strong>{selectedCandidates.length}</strong> candidate(s) on <strong>
              {new Date(probationData.date).toLocaleDateString('en-IN', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
              })}
            </strong> at <strong>
              {new Date(`2000-01-01T${probationData.startTime}`).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })} - {new Date(`2000-01-01T${probationData.endTime}`).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}
            </strong>
            <br />
            🔗 Meeting Link: {getFixedMeetingLink('Panel 1', true)}
          </p>
        </div>
      )}
    </div>
  </div>
)}

      {/* ===== PROBATION RESCHEDULE CONFIRMATION MODAL ===== */}
      {showProbationRescheduleModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ 
            padding: '30px', 
            maxWidth: '550px', 
            width: '100%', 
            maxHeight: '90vh', 
            overflowY: 'auto' 
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '20px',
              borderBottom: '1px solid var(--glass-border)',
              paddingBottom: '16px'
            }}>
              <h3 style={{ color: '#fff', margin: 0 }}>
                🔄 Reschedule Probation Meeting
              </h3>
              <button 
                onClick={() => setShowProbationRescheduleModal(false)} 
                className="btn-glass"
                style={{ padding: '6px 14px' }}
                disabled={isRescheduling}
              >
                ✕ Close
              </button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
              Confirm the reschedule details below. All fields are editable.
            </p>

            {/* Candidate Name - Read-only */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#e2e8f0', marginBottom: '8px', fontWeight: '600' }}>
                Candidate *
              </label>
              <input
                type="text"
                value={probationRescheduleData.candidateName}
                readOnly
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(255,255,255,0.03)',
                  color: '#94a3b8',
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'not-allowed',
                }}
              />
            </div>

            {/* Candidate Email - Read-only */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#e2e8f0', marginBottom: '8px', fontWeight: '600' }}>
                Email
              </label>
              <input
                type="text"
                value={probationRescheduleData.candidateEmail}
                readOnly
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(255,255,255,0.03)',
                  color: '#94a3b8',
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'not-allowed',
                }}
              />
            </div>

            {/* Date - Editable */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#e2e8f0', marginBottom: '8px', fontWeight: '600' }}>
                Date *
              </label>
              <input
                type="date"
                value={probationRescheduleData.date}
                onChange={(e) => setProbationRescheduleData({...probationRescheduleData, date: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                }}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Start Time - Editable */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#e2e8f0', marginBottom: '8px', fontWeight: '600' }}>
                  Start Time *
                </label>
                <input
                  type="time"
                  value={probationRescheduleData.startTime}
                  onChange={(e) => setProbationRescheduleData({...probationRescheduleData, startTime: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--glass-border)',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#e2e8f0', marginBottom: '8px', fontWeight: '600' }}>
                  End Time *
                </label>
                <input
                  type="time"
                  value={probationRescheduleData.endTime}
                  onChange={(e) => setProbationRescheduleData({...probationRescheduleData, endTime: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--glass-border)',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Panelists - Editable */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#e2e8f0', marginBottom: '8px', fontWeight: '600' }}>
                Panelists (comma separated)
              </label>
              <input
                type="text"
                placeholder="john@example.com, jane@example.com"
                value={probationRescheduleData.panelists}
                onChange={(e) => setProbationRescheduleData({...probationRescheduleData, panelists: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Panelists will receive calendar invitations
              </p>
            </div>

            {/* Meeting Link - Shows the fixed link */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#e2e8f0', marginBottom: '8px', fontWeight: '600' }}>
                Meeting Link (Fixed)
              </label>
              <input
                type="text"
                value={getFixedMeetingLink('Panel 1', true)}
                readOnly
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(255,255,255,0.03)',
                  color: '#94a3b8',
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'not-allowed',
                }}
              />
              <p style={{ fontSize: '11px', color: '#6ee7b7', marginTop: '4px' }}>
                🔗 This fixed link is used for all probation meetings.
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
              <button
                onClick={confirmProbationReschedule}
                disabled={!probationRescheduleData.date || !probationRescheduleData.startTime || !probationRescheduleData.endTime || isRescheduling}
                className="btn-premium"
                style={{ 
                  flex: 1, 
                  opacity: (!probationRescheduleData.date || !probationRescheduleData.startTime || !probationRescheduleData.endTime || isRescheduling) ? 0.5 : 1,
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                }}
              >
                {isRescheduling ? ' Rescheduling...' : ' Confirm Reschedule'}
              </button>
              <button
                onClick={() => setShowProbationRescheduleModal(false)}
                className="btn-glass"
                style={{ flex: 1 }}
                disabled={isRescheduling}
              >
                Cancel
              </button>
            </div>

            {probationRescheduleData.date && probationRescheduleData.startTime && probationRescheduleData.endTime && (
              <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: 'rgba(245, 158, 11, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(245, 158, 11, 0.2)',
              }}>
                <p style={{ fontSize: '12px', color: '#fcd34d', margin: 0 }}>
                  📋 Rescheduling <strong>{probationRescheduleData.candidateName}</strong> to <strong>
                    {new Date(probationRescheduleData.date).toLocaleDateString('en-IN', { 
                      day: '2-digit', 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                  </strong> at <strong>
                    {new Date(`2000-01-01T${probationRescheduleData.startTime}`).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })} - {new Date(`2000-01-01T${probationRescheduleData.endTime}`).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </strong>
                  <br />
                  🔗 Meeting Link: {getFixedMeetingLink('Panel 1', true)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default GoogleCalendar;