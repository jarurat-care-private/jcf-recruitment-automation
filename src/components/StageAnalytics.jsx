// components/StageAnalytics.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { calculateStageAnalytics } from '../utils/analyticsHelpers';

const StageAnalytics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [timeframe, setTimeframe] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedQuarter, setSelectedQuarter] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  
  // Pending Modal State
  const [showPendingModal, setShowPendingModal] = useState(null);
  const [pendingCandidates, setPendingCandidates] = useState([]);
  const [r1PendingCandidates, setR1PendingCandidates] = useState([]);
  const [r2PendingCandidates, setR2PendingCandidates] = useState([]);
  const [rescheduleRequestsData, setRescheduleRequestsData] = useState([]);
  const [pendingModalLoading, setPendingModalLoading] = useState(false);

  useEffect(() => {
    const now = new Date();
    setSelectedMonth(now.getMonth());
    setSelectedQuarter(getCurrentQuarter(now));
    setSelectedWeek(getCurrentWeekNumber(now));
  }, []);

  // ===== HELPER: Get Current Quarter =====
  function getCurrentQuarter(date) {
    const month = date.getMonth();
    return Math.floor(month / 3);
  }

  // ===== HELPER: Get Current Week Number =====
  function getCurrentWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  // ===== HELPER: Get Week Range =====
  function getWeekRange(weekNumber, year) {
    const firstDayOfYear = new Date(year, 0, 1);
    const daysOffset = (weekNumber - 1) * 7 - firstDayOfYear.getDay();
    const start = new Date(year, 0, 1 + daysOffset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  }

  // ===== FIXED: Get Date Range with IST Timezone =====
  function getDateRange(timeframe, month, quarter, week) {
    const now = new Date();
    const year = now.getFullYear();
    let start = new Date();
    let end = new Date();

    switch(timeframe) {
      case 'today': {
        // IST Today
        const istDate = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
        start = new Date(istDate);
        start.setHours(0, 0, 0, 0);
        start.setTime(start.getTime() - (5.5 * 60 * 60 * 1000)); // Convert back to UTC
        end = new Date(istDate);
        end.setHours(23, 59, 59, 999);
        end.setTime(end.getTime() - (5.5 * 60 * 60 * 1000));
        break;
      }
      case 'week': {
        // Week starting Sunday
        const currentDay = now.getDay();
        const diffToSunday = currentDay;
        start = new Date(now);
        start.setDate(now.getDate() - diffToSunday);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'month': {
        const selectedMonthNum = month !== null && month !== undefined ? month : now.getMonth();
        start = new Date(year, selectedMonthNum, 1);
        end = new Date(year, selectedMonthNum + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'quarter': {
        const selectedQuarterNum = quarter !== null && quarter !== undefined ? quarter : getCurrentQuarter(now);
        const quarterStartMonth = selectedQuarterNum * 3;
        start = new Date(year, quarterStartMonth, 1);
        end = new Date(year, quarterStartMonth + 3, 0);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'all':
      default: {
        return { start: null, end: null };
      }
    }

    return {
      start: start.toISOString(),
      end: end.toISOString()
    };
  }

  // ===== HELPER: Get Timeframe Label =====
  function getTimeframeLabel(timeframe, month, quarter, week) {
    const now = new Date();
    const year = now.getFullYear();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const quarterNames = ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)'];
    
    switch(timeframe) {
      case 'today': return 'Today';
      case 'week': {
        const selectedWeek = week !== null && week !== undefined ? week : getCurrentWeekNumber(now);
        const range = getWeekRange(selectedWeek, year);
        const startStr = range.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endStr = range.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `Week ${selectedWeek} (${startStr} - ${endStr})`;
      }
      case 'month': {
        const selectedMonthNum = month !== null && month !== undefined ? month : now.getMonth();
        return `${monthNames[selectedMonthNum]} ${year}`;
      }
      case 'quarter': {
        const selectedQuarterNum = quarter !== null && quarter !== undefined ? quarter : getCurrentQuarter(now);
        return `${quarterNames[selectedQuarterNum]} ${year}`;
      }
      case 'all':
      default: return 'All Time';
    }
  }

  // ===== Navigation Functions =====
  function navigateWeek(direction) {
    const newWeek = (selectedWeek !== null && selectedWeek !== undefined ? selectedWeek : getCurrentWeekNumber(new Date())) + direction;
    setSelectedWeek(newWeek);
  }

  function navigateMonth(direction) {
    const newMonth = (selectedMonth !== null ? selectedMonth : new Date().getMonth()) + direction;
    if (newMonth < 0) {
      setSelectedMonth(11);
    } else if (newMonth > 11) {
      setSelectedMonth(0);
    } else {
      setSelectedMonth(newMonth);
    }
  }

  function navigateQuarter(direction) {
    const newQuarter = (selectedQuarter !== null ? selectedQuarter : getCurrentQuarter(new Date())) + direction;
    if (newQuarter < 0) {
      setSelectedQuarter(3);
    } else if (newQuarter > 3) {
      setSelectedQuarter(0);
    } else {
      setSelectedQuarter(newQuarter);
    }
  }

  // ===== HANDLE KPI CLICK =====
  const handleKpiClick = async (type) => {
    setShowPendingModal(type);
    setPendingModalLoading(true);
    setPendingCandidates([]);
    setR1PendingCandidates([]);
    setR2PendingCandidates([]);
    setRescheduleRequestsData([]);
    
    try {
      const range = getDateRange(timeframe, selectedMonth, selectedQuarter, selectedWeek);
      
      switch(type) {
        case 'reviews': {
          // Pending Reviews: Assignments with status = 'Submitted'
          let query = supabase
            .from('assignments')
            .select('candidate_id')
            .eq('assignment_status', 'Submitted');
          
          if (range.start && range.end) {
            query = query
              .gte('created_at', range.start)
              .lte('created_at', range.end);
          }
          
          const { data: assignmentData } = await query;
          
          if (assignmentData && assignmentData.length > 0) {
            const candidateIds = assignmentData.map(a => a.candidate_id);
            const { data } = await supabase
              .from('candidates')
              .select('*')
              .in('id', candidateIds);
            setPendingCandidates(data || []);
          }
          break;
        }
        
        case 'interviews': {
          // Pending Interviews: Scheduled interviews without result
          let query = supabase
            .from('interviews')
            .select('candidate_id')
            .eq('status', 'Scheduled')
            .or('result.eq.Pending,result.is.null');
          
          if (range.start && range.end) {
            query = query
              .gte('created_at', range.start)
              .lte('created_at', range.end);
          }
          
          const { data: interviewData } = await query;
          
          if (interviewData && interviewData.length > 0) {
            const candidateIds = [...new Set(interviewData.map(i => i.candidate_id))];
            const { data } = await supabase
              .from('candidates')
              .select('*')
              .in('id', candidateIds);
            setPendingCandidates(data || []);
          }
          break;
        }
        
        case 'scheduling': {
          // ===== FIXED: PENDING SCHEDULING WITH REFERRAL HANDLING =====
          
          // R1 Pending: Assignment passed, but NO R1 interview exists at all
          let assignmentsQuery = supabase
            .from('assignments')
            .select('candidate_id, content_score, formatting_score, ai_score, hr_scorecard_approved')
            .eq('assignment_status', 'Evaluated');
          
          if (range.start && range.end) {
            assignmentsQuery = assignmentsQuery
              .gte('created_at', range.start)
              .lte('created_at', range.end);
          }
          
          const { data: evaluatedAssignments } = await assignmentsQuery;
          
          const r1PendingIds = [];
          
          if (evaluatedAssignments && evaluatedAssignments.length > 0) {
            for (const assignment of evaluatedAssignments) {
              const totalScore = (assignment.content_score || 0) + 
                                (assignment.formatting_score || 0) - 
                                (assignment.ai_score || 0);
              if (totalScore >= 6 || assignment.hr_scorecard_approved === true) {
                // Check if this candidate has ANY R1 interview
                const { data: r1Exists } = await supabase
                  .from('interviews')
                  .select('id')
                  .eq('candidate_id', assignment.candidate_id)
                  .eq('round', 'R1');
                
                if (!r1Exists || r1Exists.length === 0) {
                  if (!r1PendingIds.includes(assignment.candidate_id)) {
                    r1PendingIds.push(assignment.candidate_id);
                  }
                }
              }
            }
          }
          
          // R2 Pending: R1 passed, but NO R2 interview exists at all
          // EXCLUDE referral candidates (they skip R2 and go directly to Probation)
          let r1Query = supabase
            .from('interviews')
            .select('candidate_id')
            .eq('round', 'R1')
            .in('result', ['Selected', 'Passed', 'Accept']);
          
          if (range.start && range.end) {
            r1Query = r1Query
              .gte('created_at', range.start)
              .lte('created_at', range.end);
          }
          
          const { data: r1Passed } = await r1Query;
          
          const r1PassedIds = [...new Set(r1Passed?.map(i => i.candidate_id) || [])];
          const r2PendingIds = [];
          
          for (const candidateId of r1PassedIds) {
            // Check if this candidate is a referral
            const { data: candidateData } = await supabase
              .from('candidates')
              .select('source')
              .eq('id', candidateId)
              .single();
            
            const isReferral = candidateData?.source?.toLowerCase() === 'referral';
            
            // Skip referral candidates - they don't need R2
            if (isReferral) {
              continue;
            }
            
            // Check if this candidate has ANY R2 interview
            const { data: r2Exists } = await supabase
              .from('interviews')
              .select('id')
              .eq('candidate_id', candidateId)
              .eq('round', 'R2');
            
            if (!r2Exists || r2Exists.length === 0) {
              r2PendingIds.push(candidateId);
            }
          }
          
          // Fetch candidate details for R1 pending
          if (r1PendingIds.length > 0) {
            const { data } = await supabase
              .from('candidates')
              .select('*')
              .in('id', r1PendingIds);
            setR1PendingCandidates(data || []);
          }
          
          // Fetch candidate details for R2 pending
          if (r2PendingIds.length > 0) {
            const { data } = await supabase
              .from('candidates')
              .select('*')
              .in('id', r2PendingIds);
            setR2PendingCandidates(data || []);
          }
          
          break;
        }
        
        case 'reschedule': {
          // ===== FIXED: RESCHEDULE REQUESTS WITH TIME RANGE =====
          let query = supabase
            .from('interview_reschedule_requests')
            .select(`
              *,
              interviews (
                id,
                candidate_id,
                round,
                scheduled_date_time,
                panel,
                panelists
              )
            `)
            .eq('status', 'Pending')
            .order('created_at', { ascending: false });
          
          // Apply time range filter
          if (range.start && range.end) {
            query = query
              .gte('created_at', range.start)
              .lte('created_at', range.end);
          }
          
          const { data: requests } = await query;
          
          if (requests && requests.length > 0) {
            // Fetch candidate details for each request
            const candidateIds = requests
              .map(r => r.interviews?.candidate_id)
              .filter(id => id !== null && id !== undefined);
            
            if (candidateIds.length > 0) {
              const { data: candidatesData } = await supabase
                .from('candidates')
                .select('*')
                .in('id', candidateIds);
              
              // Merge candidate data with requests
              const mergedData = requests.map(req => {
                const candidate = candidatesData?.find(c => c.id === req.interviews?.candidate_id);
                return {
                  ...req,
                  candidate: candidate || null
                };
              });
              
              setRescheduleRequestsData(mergedData);
            } else {
              setRescheduleRequestsData(requests);
            }
          }
          break;
        }
      }
    } catch (error) {
      console.error('Error fetching pending data:', error);
    } finally {
      setPendingModalLoading(false);
    }
  };

  // ===== FETCH ALL DATA =====
  async function fetchAllData() {
    setLoading(true);
    try {
      const range = getDateRange(timeframe, selectedMonth, selectedQuarter, selectedWeek);

      let candidatesQuery = supabase.from('candidates').select('*');
      let assignmentsQuery = supabase.from('assignments').select('*');
      let interviewsQuery = supabase.from('interviews').select('*');
      let rescheduleRequestsQuery = supabase.from('interview_reschedule_requests').select('*');

      if (range.start && range.end) {
        candidatesQuery = candidatesQuery
          .gte('created_at', range.start)
          .lte('created_at', range.end);
        
        assignmentsQuery = assignmentsQuery
          .gte('created_at', range.start)
          .lte('created_at', range.end);
        
        interviewsQuery = interviewsQuery
          .gte('created_at', range.start)
          .lte('created_at', range.end);
        
        rescheduleRequestsQuery = rescheduleRequestsQuery
          .gte('created_at', range.start)
          .lte('created_at', range.end);
      }

      const [candidatesRes, assignmentsRes, interviewsRes, rescheduleRequestsRes] = await Promise.all([
        candidatesQuery,
        assignmentsQuery,
        interviewsQuery,
        rescheduleRequestsQuery
      ]);

      const candidates = candidatesRes.data || [];
      const assignments = assignmentsRes.data || [];
      const interviews = interviewsRes.data || [];
      const rescheduleRequests = rescheduleRequestsRes.data || [];

      const analytics = calculateStageAnalytics(candidates, assignments, interviews, rescheduleRequests);
      
      analytics.timeframe = {
        label: getTimeframeLabel(timeframe, selectedMonth, selectedQuarter, selectedWeek),
        range: range
      };
      
      setData(analytics);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAllData();
  }, [timeframe, selectedMonth, selectedQuarter, selectedWeek]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '4px solid rgba(255,255,255,0.1)', 
          borderTop: '4px solid var(--primary)', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px' 
        }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading analytics...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No data available
      </div>
    );
  }

  const navBtnStyle = {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid var(--glass-border)',
    background: 'rgba(255, 255, 255, 0.03)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    textTransform: 'capitalize'
  };

  const activeBtnStyle = {
    ...navBtnStyle,
    background: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid var(--primary)',
    color: '#fff',
    boxShadow: '0 0 15px rgba(59, 130, 246, 0.2)'
  };

  return (
    <div className="animate-fade-up">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '32px', 
        flexWrap: 'wrap', 
        gap: '16px' 
      }}>
        <h2 style={{ margin: 0, color: '#fff', fontSize: '20px', fontWeight: '700' }}>
          📊 Stage Analytics
          <span style={{ 
            fontSize: '14px', 
            fontWeight: '400', 
            color: 'var(--text-muted)', 
            marginLeft: '12px' 
          }}>
            ({data.timeframe?.label || 'All Time'})
          </span>
        </h2>
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {(timeframe === 'week' || timeframe === 'month' || timeframe === 'quarter') && (
            <button
              onClick={() => {
                if (timeframe === 'week') navigateWeek(-1);
                else if (timeframe === 'month') navigateMonth(-1);
                else if (timeframe === 'quarter') navigateQuarter(-1);
              }}
              className="btn-glass"
              style={{ padding: '8px 12px' }}
            >
              ◀
            </button>
          )}
          
          {['today', 'week', 'month', 'quarter', 'all'].map(t => (
            <button
              key={t}
              onClick={() => {
                setTimeframe(t);
                // Reset navigation values when changing timeframe
                if (t === 'all') {
                  setSelectedMonth(null);
                  setSelectedQuarter(null);
                  setSelectedWeek(null);
                }
              }}
              style={timeframe === t ? activeBtnStyle : navBtnStyle}
              onMouseEnter={(e) => { 
                if (timeframe !== t) e.target.style.background = 'rgba(255,255,255,0.08)'; 
              }}
              onMouseLeave={(e) => { 
                if (timeframe !== t) e.target.style.background = 'rgba(255,255,255,0.03)'; 
              }}
            >
              {t === 'all' ? 'All Time' : t === 'today' ? 'Today' : t + 'ly'}
            </button>
          ))}

          {(timeframe === 'week' || timeframe === 'month' || timeframe === 'quarter') && (
            <button
              onClick={() => {
                if (timeframe === 'week') navigateWeek(1);
                else if (timeframe === 'month') navigateMonth(1);
                else if (timeframe === 'quarter') navigateQuarter(1);
              }}
              className="btn-glass"
              style={{ padding: '8px 12px' }}
            >
              ▶
            </button>
          )}
        </div>
      </div>

      {/* Stage Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        <StageCard title="📝 STAGE 1: ASSIGNMENTS">
          <MetricRow 
            label="Submission Rate" 
            value={data.assignment.submissionRate} 
            suffix="%" 
            status={data.assignment.status.submissionRate} 
            tooltip="Submitted / Assignment Sent × 100" 
            thresholds={{ good: '60%+', watch: '50-60%', flag: 'below 40%' }} 
          />
          <MetricRow 
            label="Evaluation TAT" 
            value={data.assignment.evaluationTAT} 
            suffix=" days" 
            status={data.assignment.status.evaluationTAT} 
            tooltip="Evaluation Date - Submission Date" 
            thresholds={{ good: '1 day', watch: '2 days', flag: '3+ days' }} 
          />
          <MetricRow 
            label="Assignment Pass Rate" 
            value={data.assignment.passRate} 
            suffix="%" 
            status={data.assignment.status.passRate} 
            tooltip="Passed ÷ Evaluated × 100" 
            thresholds={{ good: '50-70%', watch: '35-50%', flag: 'below 35%', too_easy: '85%+' }} 
          />
          <div style={{ 
            marginTop: '16px', 
            padding: '12px 16px', 
            background: 'rgba(255,255,255,0.03)', 
            borderRadius: '8px', 
            border: '1px solid var(--glass-border)' 
          }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              📊 Sent: {data.assignment.sent} | Submitted: {data.assignment.submitted} | 
              Evaluated: {data.assignment.evaluated} | Passed: {data.assignment.passed} | 
              Late: {data.assignment.lateSubmissions}
            </span>
          </div>
        </StageCard>

        <StageCard title="📅 STAGE 2: R1 SCHEDULING">
          <MetricRow 
            label="R1 TAT" 
            value={data.r1Scheduling.r1TAT} 
            suffix=" days" 
            status={data.r1Scheduling.status.r1TAT} 
            tooltip="R1 Scheduled Date - Assignment Pass Date" 
            thresholds={{ good: '1-2 days', watch: '3 days', flag: '4+ days' }} 
          />
          <div style={{ 
            marginTop: '16px', 
            padding: '12px 16px', 
            background: 'rgba(255,255,255,0.03)', 
            borderRadius: '8px', 
            border: '1px solid var(--glass-border)' 
          }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              📊 Total R1 Interviews: {data.r1Scheduling.total}
            </span>
          </div>
        </StageCard>

        <StageCard title="🎯 STAGE 3: R1 INTERVIEWS">
          <MetricRow 
            label="Conducted Rate" 
            value={data.r1Interview.conductedRate} 
            suffix="%" 
            status={data.r1Interview.status.conductedRate} 
            tooltip="Evaluated / Scheduled × 100" 
            thresholds={{ good: '50%+', watch: '45-50%', flag: 'below 45%' }} 
          />
          <MetricRow 
            label="Moving Forward Rate" 
            value={data.r1Interview.movingForwardRate} 
            suffix="%" 
            status={data.r1Interview.status.movingForwardRate} 
            tooltip="R1 Passed / R1 Evaluated × 100" 
            thresholds={{ good: '50%+', watch: '30-50%', flag: 'below 30%' }} 
          />
          <MetricRow 
            label="Reschedule Rate" 
            value={data.r1Interview.rescheduleRate} 
            suffix="%" 
            status={data.r1Interview.status.rescheduleRate} 
            tooltip="Rescheduled / Scheduled × 100" 
            thresholds={{ good: 'under 15%', watch: '15-25%', flag: '25%+' }} 
            isLowerBetter 
          />
          <div style={{ 
            marginTop: '16px', 
            padding: '12px 16px', 
            background: 'rgba(255,255,255,0.03)', 
            borderRadius: '8px', 
            border: '1px solid var(--glass-border)' 
          }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              📊 Scheduled: {data.r1Interview.scheduled} | Evaluated: {data.r1Interview.evaluated} | 
              Passed: {data.r1Interview.passed} | Rescheduled: {data.r1Interview.rescheduled}
            </span>
          </div>
        </StageCard>

        <StageCard title="📅 STAGE 4: R2 SCHEDULING">
          <MetricRow 
            label="R2 TAT" 
            value={data.r2Scheduling.r2TAT} 
            suffix=" days" 
            status={data.r2Scheduling.status.r2TAT} 
            tooltip="R2 Scheduled Date - R1 Pass Date" 
            thresholds={{ good: '1-2 days', watch: '3 days', flag: '4+ days' }} 
          />
          <div style={{ 
            marginTop: '16px', 
            padding: '12px 16px', 
            background: 'rgba(255,255,255,0.03)', 
            borderRadius: '8px', 
            border: '1px solid var(--glass-border)' 
          }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              📊 Total R2 Interviews: {data.r2Scheduling.total}
            </span>
          </div>
        </StageCard>

        <StageCard title="🎯 STAGE 5: R2 INTERVIEWS">
          <MetricRow 
            label="Conducted Rate" 
            value={data.r2Interview.conductedRate} 
            suffix="%" 
            status={data.r2Interview.status.conductedRate} 
            tooltip="Evaluated / Scheduled × 100" 
            thresholds={{ good: '70%+', watch: '60-70%', flag: 'below 60%' }} 
          />
          <MetricRow 
            label="Moving Forward Rate" 
            value={data.r2Interview.movingForwardRate} 
            suffix="%" 
            status={data.r2Interview.status.movingForwardRate} 
            tooltip="R2 Passed / R2 Evaluated × 100" 
            thresholds={{ good: '70%+', watch: '50-70%', flag: 'below 50%' }} 
          />
          <MetricRow 
            label="Reschedule Rate" 
            value={data.r2Interview.rescheduleRate} 
            suffix="%" 
            status={data.r2Interview.status.rescheduleRate} 
            tooltip="Rescheduled / Scheduled × 100" 
            thresholds={{ good: 'under 15%', watch: '15-25%', flag: '25%+' }} 
            isLowerBetter 
          />
          <div style={{ 
            marginTop: '16px', 
            padding: '12px 16px', 
            background: 'rgba(255,255,255,0.03)', 
            borderRadius: '8px', 
            border: '1px solid var(--glass-border)' 
          }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              📊 Scheduled: {data.r2Interview.scheduled} | Evaluated: {data.r2Interview.evaluated} | 
              Passed: {data.r2Interview.passed} | Rescheduled: {data.r2Interview.rescheduled}
            </span>
          </div>
        </StageCard>

        <StageCard title="⚠️ GENERAL">
          <MetricRow 
            label="Withdrawal Rate" 
            value={data.general.withdrawalRate} 
            suffix="%" 
            status={data.general.status.withdrawalRate} 
            tooltip="Total Withdrawals / Total Candidates × 100" 
            thresholds={{ good: 'under 10%', watch: '10-15%', flag: '15%+' }} 
            isLowerBetter 
          />
          <div style={{ 
            marginTop: '16px', 
            padding: '12px 16px', 
            background: 'rgba(255,255,255,0.03)', 
            borderRadius: '8px', 
            border: '1px solid var(--glass-border)' 
          }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              📊 Total Candidates: {data.general.totalCandidates} | Withdrawn: {data.general.totalWithdrawn}
            </span>
          </div>
        </StageCard>
      </div>

      {/* SOURCE ANALYTICS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginTop: '24px' }}>
        <StageCard title="📊 SOURCE ANALYTICS">
          {data.sources.topSources.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
              No source data available.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ 
                      padding: '16px', 
                      textAlign: 'left', 
                      borderBottom: '1px solid var(--glass-border)', 
                      color: 'var(--text-muted)' 
                    }}>
                      Source
                    </th>
                    <th style={{ 
                      padding: '16px', 
                      textAlign: 'center', 
                      borderBottom: '1px solid var(--glass-border)', 
                      color: 'var(--text-muted)' 
                    }}>
                      Total
                    </th>
                    <th style={{ 
                      padding: '16px', 
                      textAlign: 'center', 
                      borderBottom: '1px solid var(--glass-border)', 
                      color: 'var(--text-muted)' 
                    }}>
                      Selected
                    </th>
                    <th style={{ 
                      padding: '16px', 
                      textAlign: 'center', 
                      borderBottom: '1px solid var(--glass-border)', 
                      color: 'var(--text-muted)' 
                    }}>
                      Rejected
                    </th>
                    <th style={{ 
                      padding: '16px', 
                      textAlign: 'center', 
                      borderBottom: '1px solid var(--glass-border)', 
                      color: 'var(--text-muted)' 
                    }}>
                      Conversion
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.sources.topSources.map((source, index) => (
                    <tr key={source.source} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '16px', fontWeight: '600', color: '#fff' }}>
                        {index === 0 ? '🥇 ' : index === 1 ? '🥈 ' : index === 2 ? '🥉 ' : ''}
                        {source.source}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center', color: '#fff' }}>
                        {source.total}
                      </td>
                      <td style={{ 
                        padding: '16px', 
                        textAlign: 'center', 
                        color: '#34d399', 
                        fontWeight: '600' 
                      }}>
                        {source.selected}
                      </td>
                      <td style={{ 
                        padding: '16px', 
                        textAlign: 'center', 
                        color: '#f87171', 
                        fontWeight: '600' 
                      }}>
                        {source.rejected}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center', fontWeight: '700' }}>
                        <span style={{ 
                          color: source.conversionRate > 20 ? '#34d399' : 
                                 source.conversionRate > 10 ? '#fbbf24' : '#f87171' 
                        }}>
                          {source.conversionRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </StageCard>

        {/* ===== HR WORKLOAD - CLICKABLE KPI ===== */}
        <StageCard title="📋 HR WORKLOAD">
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
            gap: '16px' 
          }}>
            <div 
              onClick={() => handleKpiClick('reviews')}
              style={{ 
                padding: '20px', 
                background: 'rgba(255,255,255,0.03)', 
                borderRadius: '12px', 
                border: '1px solid var(--glass-border)', 
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            >
              <div style={{ 
                fontSize: '11px', 
                color: 'var(--text-muted)', 
                marginBottom: '6px', 
                textTransform: 'uppercase', 
                letterSpacing: '1px' 
              }}>
                Pending Reviews
              </div>
              <div style={{ fontSize: '32px', fontWeight: '800', color: '#fbbf24' }}>
                {data.workload.pendingReviews}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Click to view
              </div>
            </div>
            
            <div 
              onClick={() => handleKpiClick('interviews')}
              style={{ 
                padding: '20px', 
                background: 'rgba(255,255,255,0.03)', 
                borderRadius: '12px', 
                border: '1px solid var(--glass-border)', 
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            >
              <div style={{ 
                fontSize: '11px', 
                color: 'var(--text-muted)', 
                marginBottom: '6px', 
                textTransform: 'uppercase', 
                letterSpacing: '1px' 
              }}>
                Pending Interviews
              </div>
              <div style={{ fontSize: '32px', fontWeight: '800', color: '#60a5fa' }}>
                {data.workload.pendingInterviews}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Click to view
              </div>
            </div>
            
            <div 
              onClick={() => handleKpiClick('scheduling')}
              style={{ 
                padding: '20px', 
                background: 'rgba(255,255,255,0.03)', 
                borderRadius: '12px', 
                border: '1px solid var(--glass-border)', 
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            >
              <div style={{ 
                fontSize: '11px', 
                color: 'var(--text-muted)', 
                marginBottom: '6px', 
                textTransform: 'uppercase', 
                letterSpacing: '1px' 
              }}>
                Pending Scheduling
              </div>
              <div style={{ fontSize: '32px', fontWeight: '800', color: '#c084fc' }}>
                {data.workload.pendingScheduling}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Click to view
              </div>
            </div>
            
            <div 
              onClick={() => handleKpiClick('reschedule')}
              style={{ 
                padding: '20px', 
                background: 'rgba(255,255,255,0.03)', 
                borderRadius: '12px', 
                border: '1px solid var(--glass-border)', 
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            >
              <div style={{ 
                fontSize: '11px', 
                color: 'var(--text-muted)', 
                marginBottom: '6px', 
                textTransform: 'uppercase', 
                letterSpacing: '1px' 
              }}>
                Reschedule Requests
              </div>
              <div style={{ fontSize: '32px', fontWeight: '800', color: '#f87171' }}>
                {data.workload.pendingRescheduleRequests}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Click to view
              </div>
            </div>
            
            <div style={{ 
              padding: '20px', 
              background: 'rgba(59,130,246,0.1)', 
              borderRadius: '12px', 
              border: '1px solid var(--primary)', 
              textAlign: 'center' 
            }}>
              <div style={{ 
                fontSize: '11px', 
                color: '#93c5fd', 
                marginBottom: '6px', 
                textTransform: 'uppercase', 
                letterSpacing: '1px' 
              }}>
                Total Pending Action
              </div>
              <div style={{ fontSize: '32px', fontWeight: '800', color: '#fff' }}>
                {data.workload.totalPending}
              </div>
            </div>
          </div>
        </StageCard>
      </div>

      {/* ===== PENDING SCHEDULING MODAL - R1 AND R2 COLUMNS ===== */}
      {showPendingModal === 'scheduling' && (
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
            maxWidth: '900px', 
            width: '100%', 
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '20px', 
              paddingBottom: '16px', 
              borderBottom: '1px solid var(--glass-border)' 
            }}>
              <h3 style={{ color: '#fff', margin: 0 }}>
                📅 Pending Scheduling
                <span style={{ 
                  fontSize: '14px', 
                  fontWeight: '400', 
                  color: 'var(--text-muted)', 
                  marginLeft: '12px' 
                }}>
                  (R1: {r1PendingCandidates.length} | R2: {r2PendingCandidates.length} | 
                  Total: {r1PendingCandidates.length + r2PendingCandidates.length})
                </span>
              </h3>
              <button 
                onClick={() => setShowPendingModal(null)} 
                className="btn-glass"
                style={{ padding: '8px 16px' }}
              >
                ✕ Close
              </button>
            </div>
            
            {pendingModalLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ 
                  width: '30px', 
                  height: '30px', 
                  border: '3px solid rgba(255,255,255,0.1)', 
                  borderTop: '3px solid var(--primary)', 
                  borderRadius: '50%', 
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 16px' 
                }} />
                <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
              </div>
            ) : (r1PendingCandidates.length === 0 && r2PendingCandidates.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <span style={{ fontSize: '48px' }}>✅</span>
                <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>
                  No pending scheduling items found
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <h4 style={{ 
                    color: '#60a5fa', 
                    margin: '0 0 16px 0', 
                    fontSize: '16px', 
                    borderBottom: '1px solid var(--glass-border)', 
                    paddingBottom: '12px' 
                  }}>
                    🎯 R1 Pending Scheduling ({r1PendingCandidates.length})
                  </h4>
                  {r1PendingCandidates.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                      No R1 pending
                    </p>
                  ) : (
                    r1PendingCandidates.map(c => (
                      <div 
                        key={c.id} 
                        style={{ 
                          padding: '12px 16px', 
                          borderBottom: '1px solid var(--glass-border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          transition: 'background 0.2s ease'
                        }}
                        onClick={() => {
                          setShowPendingModal(null);
                          navigate(`/candidate/${c.id}`);
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div>
                          <div style={{ color: '#fff', fontWeight: '600' }}>
                            {c.name || c.full_name || 'Unknown'}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                            {c.domain || 'No Domain'} • {c.current_stage || 'No Stage'}
                          </div>
                        </div>
                        <span style={{ color: '#60a5fa', fontSize: '12px', fontWeight: '600' }}>
                          View →
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div>
                  <h4 style={{ 
                    color: '#c084fc', 
                    margin: '0 0 16px 0', 
                    fontSize: '16px', 
                    borderBottom: '1px solid var(--glass-border)', 
                    paddingBottom: '12px' 
                  }}>
                    🏆 R2 Pending Scheduling ({r2PendingCandidates.length})
                  </h4>
                  {r2PendingCandidates.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                      No R2 pending
                    </p>
                  ) : (
                    r2PendingCandidates.map(c => (
                      <div 
                        key={c.id} 
                        style={{ 
                          padding: '12px 16px', 
                          borderBottom: '1px solid var(--glass-border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          transition: 'background 0.2s ease'
                        }}
                        onClick={() => {
                          setShowPendingModal(null);
                          navigate(`/candidate/${c.id}`);
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div>
                          <div style={{ color: '#fff', fontWeight: '600' }}>
                            {c.name || c.full_name || 'Unknown'}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                            {c.domain || 'No Domain'} • {c.current_stage || 'No Stage'}
                          </div>
                        </div>
                        <span style={{ color: '#c084fc', fontSize: '12px', fontWeight: '600' }}>
                          View →
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== RESCHEDULE REQUESTS MODAL ===== */}
      {showPendingModal === 'reschedule' && (
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
            maxWidth: '800px', 
            width: '100%', 
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '20px', 
              paddingBottom: '16px', 
              borderBottom: '1px solid var(--glass-border)' 
            }}>
              <h3 style={{ color: '#fff', margin: 0 }}>
                🔄 Reschedule Requests
                <span style={{ 
                  fontSize: '14px', 
                  fontWeight: '400', 
                  color: 'var(--text-muted)', 
                  marginLeft: '12px' 
                }}>
                  ({rescheduleRequestsData.length} pending)
                </span>
              </h3>
              <button 
                onClick={() => setShowPendingModal(null)} 
                className="btn-glass"
                style={{ padding: '8px 16px' }}
              >
                ✕ Close
              </button>
            </div>
            
            {pendingModalLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ 
                  width: '30px', 
                  height: '30px', 
                  border: '3px solid rgba(255,255,255,0.1)', 
                  borderTop: '3px solid var(--primary)', 
                  borderRadius: '50%', 
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 16px' 
                }} />
                <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
              </div>
            ) : rescheduleRequestsData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <span style={{ fontSize: '48px' }}>✅</span>
                <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>
                  No reschedule requests
                </p>
              </div>
            ) : (
              <div>
                {rescheduleRequestsData.map((req) => (
                  <div 
                    key={req.id} 
                    style={{ 
                      padding: '16px', 
                      borderBottom: '1px solid var(--glass-border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease'
                    }}
                    onClick={() => {
                      setShowPendingModal(null);
                      if (req.candidate) {
                        navigate(`/candidate/${req.candidate.id}`);
                      }
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <span style={{ color: '#fff', fontWeight: '600' }}>
                          {req.candidate?.name || req.candidate?.full_name || 'Unknown Candidate'}
                        </span>
                        <span style={{ 
                          fontSize: '11px', 
                          padding: '4px 10px', 
                          borderRadius: '12px',
                          background: 'rgba(251, 191, 36, 0.15)',
                          color: '#fbbf24',
                          border: '1px solid rgba(251, 191, 36, 0.2)'
                        }}>
                          {req.interviews?.round || 'Unknown Round'}
                        </span>
                        {req.interviews?.panel && (
                          <span style={{ 
                            fontSize: '11px', 
                            padding: '4px 10px', 
                            borderRadius: '12px',
                            background: 'rgba(59, 130, 246, 0.15)',
                            color: '#93c5fd',
                            border: '1px solid rgba(59, 130, 246, 0.2)'
                          }}>
                            {req.interviews.panel}
                          </span>
                        )}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                        <span style={{ color: '#fbbf24' }}>Reason:</span> {req.reason || 'No reason provided'}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
                        Requested: {new Date(req.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <span style={{ color: '#fbbf24', fontSize: '13px', fontWeight: '600' }}>
                      View →
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== OTHER MODALS (Reviews and Interviews) ===== */}
      {showPendingModal && showPendingModal !== 'scheduling' && showPendingModal !== 'reschedule' && (
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
            maxWidth: '700px', 
            width: '100%', 
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '20px', 
              paddingBottom: '16px', 
              borderBottom: '1px solid var(--glass-border)' 
            }}>
              <h3 style={{ color: '#fff', margin: 0 }}>
                {showPendingModal === 'reviews' && '📝 Pending Reviews'}
                {showPendingModal === 'interviews' && '🎯 Pending Interviews'}
              </h3>
              <button 
                onClick={() => setShowPendingModal(null)} 
                className="btn-glass"
                style={{ padding: '8px 16px' }}
              >
                ✕ Close
              </button>
            </div>
            
            {pendingModalLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ 
                  width: '30px', 
                  height: '30px', 
                  border: '3px solid rgba(255,255,255,0.1)', 
                  borderTop: '3px solid var(--primary)', 
                  borderRadius: '50%', 
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 16px' 
                }} />
                <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
              </div>
            ) : pendingCandidates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <span style={{ fontSize: '48px' }}>✅</span>
                <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>
                  No pending items found
                </p>
              </div>
            ) : (
              <div>
                {pendingCandidates.map(c => (
                  <div 
                    key={c.id} 
                    style={{ 
                      padding: '16px', 
                      borderBottom: '1px solid var(--glass-border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease'
                    }}
                    onClick={() => {
                      setShowPendingModal(null);
                      navigate(`/candidate/${c.id}`);
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <div style={{ color: '#fff', fontWeight: '600' }}>
                        {c.name || c.full_name || 'Unknown'}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                        {c.domain || 'No Domain'} • {c.current_stage || 'No Stage'}
                        {c.email && <span style={{ marginLeft: '8px', color: '#64748b' }}>• {c.email}</span>}
                      </div>
                    </div>
                    <span style={{ color: '#60a5fa', fontSize: '13px', fontWeight: '600' }}>
                      View →
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// ===== SUB-COMPONENT: Stage Card =====
const StageCard = ({ title, children }) => (
  <div className="glass-panel" style={{ padding: '30px' }}>
    <h3 style={{ 
      margin: '0 0 24px 0', 
      fontSize: '16px', 
      color: '#fff', 
      letterSpacing: '1px', 
      fontWeight: '700' 
    }}>
      {title}
    </h3>
    {children}
  </div>
);

// ===== SUB-COMPONENT: Metric Row =====
const MetricRow = ({ 
  label, 
  value, 
  suffix, 
  status, 
  tooltip, 
  thresholds, 
  isLowerBetter = false 
}) => {
  const getStatusColor = (status) => {
    switch(status) {
      case 'good': return '#34d399';
      case 'watch': return '#fbbf24';
      case 'flag': return '#f87171';
      case 'too_easy': return '#c084fc';
      default: return '#94a3b8';
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case 'good': return 'Optimal';
      case 'watch': return 'Warning';
      case 'flag': return 'Critical';
      case 'too_easy': return 'Anomalous';
      default: return 'No Data';
    }
  };

  const displayValue = typeof value === 'number' && !isNaN(value) ? value.toFixed(1) : '0.0';
  const color = getStatusColor(status);

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      padding: '16px 0', 
      borderBottom: '1px solid rgba(255,255,255,0.05)' 
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: '500' }}>
          {label}
        </span>
        {tooltip && (
          <span 
            style={{ fontSize: '14px', cursor: 'help', color: 'var(--text-muted)' }} 
            title={tooltip}
          >
            ℹ️
          </span>
        )}
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {thresholds && `(${thresholds.good} / ${thresholds.watch} / ${thresholds.flag})`}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>
          {displayValue}
          <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '500' }}>
            {suffix}
          </span>
        </span>
        <span style={{ 
          fontSize: '11px', 
          fontWeight: '700', 
          color: color, 
          background: `${color}15`, 
          border: `1px solid ${color}40`, 
          padding: '4px 10px', 
          borderRadius: '12px', 
          textTransform: 'uppercase', 
          letterSpacing: '0.5px' 
        }}>
          {getStatusLabel(status)}
        </span>
      </div>
    </div>
  );
};

export default StageAnalytics;