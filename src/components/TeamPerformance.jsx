// components/TeamPerformance.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

function TeamPerformance() {
  const { userRole, isAdmin, isHR, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('today');
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedQuarter, setSelectedQuarter] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [teamData, setTeamData] = useState({
    assignmentTeam: [],
    schedulingTeam: [],
    panelR1: [],
    panelR2: [],
    summary: {
      newCandidates: 0,
      totalAssignments: 0,
      totalInterviews: 0,
      totalSelected: 0,
      totalRejected: 0
    }
  });

  // Get current month and week
  useEffect(() => {
    const now = new Date();
    setSelectedMonth(now.getMonth());
    setSelectedQuarter(getCurrentQuarter(now));
    setSelectedWeek(getCurrentWeekNumber(now));
  }, []);

  useEffect(() => {
    fetchTeamPerformance();
  }, [timeframe, selectedMonth, selectedQuarter, selectedWeek]);

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

  // ===== HELPER: Get Date Range =====
  function getDateRange(timeframe, month, quarter, week) {
    const now = new Date();
    const year = now.getFullYear();
    let start = new Date();
    let end = new Date();

    switch(timeframe) {
      case 'today': {
        const istDate = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
        start = new Date(istDate);
        start.setHours(0, 0, 0, 0);
        start.setTime(start.getTime() - (5.5 * 60 * 60 * 1000));
        end = new Date(istDate);
        end.setHours(23, 59, 59, 999);
        end.setTime(end.getTime() - (5.5 * 60 * 60 * 1000));
        break;
      }
      case 'week': {
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

  // ===== FETCH TEAM PERFORMANCE =====
  async function fetchTeamPerformance() {
    setLoading(true);
    try {
      const dateRange = getDateRange(timeframe, selectedMonth, selectedQuarter, selectedWeek);

      let candidatesQuery = supabase.from('candidates').select('*');
      let assignmentsQuery = supabase.from('assignments').select('*');
      let interviewsQuery = supabase.from('interviews').select('*');
      let hrUsersQuery = supabase.from('hr_users').select('name, email, role, team, is_active, panelist_name');

      if (dateRange.start && dateRange.end) {
        candidatesQuery = candidatesQuery
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end);
        
        assignmentsQuery = assignmentsQuery
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end);
        
        interviewsQuery = interviewsQuery
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end);
      }

      const [candidatesRes, assignmentsRes, interviewsRes, hrUsersRes] = await Promise.all([
        candidatesQuery,
        assignmentsQuery,
        interviewsQuery,
        hrUsersQuery
      ]);

      const candidates = candidatesRes.data || [];
      const assignments = assignmentsRes.data || [];
      const interviews = interviewsRes.data || [];
      const hrUsers = hrUsersRes.data || [];

      const assignmentTeam = calculateAssignmentTeamPerformance(assignments, candidates, hrUsers);
      const schedulingTeam = calculateSchedulingTeamPerformance(interviews, hrUsers);
      
      // FIXED: Panel performance - only show Panel 1, Panel 2, Panel 3, Panel 4
      const panelR1 = calculatePanelPerformanceByPanel(interviews, 'R1', candidates, hrUsers);
      const panelR2 = calculatePanelPerformanceByPanel(interviews, 'R2', candidates, hrUsers);

      const summary = {
        newCandidates: candidates.length,
        totalAssignments: assignments.length,
        totalInterviews: interviews.length,
        totalSelected: candidates.filter(c => 
          c.current_stage === 'Selected' || 
          c.current_stage === 'Probation' || 
          c.current_stage === 'Onboarding Done'
        ).length,
        totalRejected: candidates.filter(c => c.current_stage === 'Rejected').length
      };

      setTeamData({
        assignmentTeam,
        schedulingTeam,
        panelR1,
        panelR2,
        summary
      });
    } catch (error) {
      console.error('Error fetching team performance:', error);
    } finally {
      setLoading(false);
    }
  }

  // ===== ASSIGNMENT TEAM PERFORMANCE =====
  function calculateAssignmentTeamPerformance(assignments, candidates, hrUsers) {
    const evaluatorMap = {};
    
    assignments.forEach(a => {
      let evaluatorEmail = a.evaluated_by || a.sent_by;
      let evaluatorName = null;
      
      if (evaluatorEmail) {
        const hrUser = hrUsers.find(u => u.email === evaluatorEmail);
        evaluatorName = hrUser?.name || hrUser?.panelist_name || evaluatorEmail;
      }
      
      if (!evaluatorName || evaluatorName === 'System Admin' || evaluatorName === '') {
        return;
      }
      
      if (!evaluatorMap[evaluatorName]) {
        evaluatorMap[evaluatorName] = {
          evaluator_name: evaluatorName,
          evaluator_email: evaluatorEmail,
          sent: 0,
          evaluated: 0,
          passed: 0,
          rejected: 0,
          late: 0,
          waitlisted: 0,
          total_score: 0
        };
      }

      evaluatorMap[evaluatorName].sent++;

      if (a.assignment_status === 'Evaluated') {
        evaluatorMap[evaluatorName].evaluated++;
        
        const totalScore = (a.content_score || 0) + (a.formatting_score || 0) - (a.ai_score || 0);
        evaluatorMap[evaluatorName].total_score += totalScore;
        
        if (totalScore >= 6 || a.hr_scorecard_approved === true) {
          evaluatorMap[evaluatorName].passed++;
        } else {
          evaluatorMap[evaluatorName].rejected++;
        }
      }

      if (a.is_late_submission) {
        evaluatorMap[evaluatorName].late++;
      }

      if (a.candidate_id) {
        const candidate = candidates.find(c => c.id === a.candidate_id);
        if (candidate && candidate.current_stage === 'Waitlist' && candidate.waitlist_restore_stage === 'Assignment') {
          evaluatorMap[evaluatorName].waitlisted++;
        }
      }
    });

    return Object.values(evaluatorMap).map(e => ({
      ...e,
      pass_rate: e.evaluated > 0 ? Math.round((e.passed / e.evaluated) * 100) : 0,
      avg_score: e.evaluated > 0 ? Math.round((e.total_score / e.evaluated) * 10) / 10 : 0
    })).sort((a, b) => b.evaluated - a.evaluated);
  }

  // ===== FIXED: SCHEDULING TEAM PERFORMANCE =====
  function calculateSchedulingTeamPerformance(interviews, hrUsers) {
    const schedulingMap = {};
    
    if (!interviews || interviews.length === 0) {
      return [];
    }

    interviews.forEach(interview => {
      // Get the scheduler - use the name of the person who scheduled
      let schedulerEmail = interview.scheduled_by || 
                          interview.created_by || 
                          interview.user_email;
      
      if (!schedulerEmail || schedulerEmail === '' || schedulerEmail === 'null' || schedulerEmail === 'undefined') {
        schedulerEmail = 'System';
      }
      
      // Find HR user by email to get the display name
      const hrUser = hrUsers.find(u => u.email === schedulerEmail);
      const schedulerName = hrUser?.name || hrUser?.panelist_name || schedulerEmail || 'Unknown';
      
      // Use the name as the key for display
      const key = schedulerEmail === 'System' ? 'System' : schedulerName;
      
      if (!schedulingMap[key]) {
        schedulingMap[key] = {
          name: key === 'System' ? 'System' : schedulerName,
          email: schedulerEmail,
          r1_scheduled: 0,
          r2_scheduled: 0,
          rescheduled: 0,
          total_scheduled: 0
        };
      }

      const round = interview.round?.toString().toUpperCase();
      if (round === 'R1' || round === '1') {
        schedulingMap[key].r1_scheduled++;
      } else if (round === 'R2' || round === '2') {
        schedulingMap[key].r2_scheduled++;
      }
      
      schedulingMap[key].total_scheduled++;
      
      const rescheduleCount = parseInt(interview.reschedule_count) || 0;
      if (rescheduleCount > 0) {
        schedulingMap[key].rescheduled += rescheduleCount;
      }
    });

    return Object.values(schedulingMap)
      .filter(item => item.total_scheduled > 0)
      .sort((a, b) => b.total_scheduled - a.total_scheduled);
  }

  // ===== FIXED: PANEL PERFORMANCE BY PANEL NAME (Panel 1, 2, 3, 4) =====
  function calculatePanelPerformanceByPanel(interviews, round, candidates, hrUsers) {
    const panelMap = {};
    
    // Define which panels belong to which round
    const isR1Panel = (panelName) => {
      const normalized = panelName?.toString().trim();
      return normalized === 'Panel 1' || normalized === 'Panel 2' || 
             normalized === '1' || normalized === '2';
    };
    const isR2Panel = (panelName) => {
      const normalized = panelName?.toString().trim();
      return normalized === 'Panel 3' || normalized === 'Panel 4' || 
             normalized === '3' || normalized === '4';
    };
    
    const roundStr = round.toString().toUpperCase();
    
    // Initialize panel data for Panel 1-4
    const panelNames = roundStr === 'R1' ? ['Panel 1', 'Panel 2'] : ['Panel 3', 'Panel 4'];
    panelNames.forEach(name => {
      panelMap[name] = {
        panel_name: name,
        evaluated: 0,
        passed: 0,
        failed: 0,
        on_hold: 0,
        waitlisted: 0,
        total_score: 0
      };
    });

    // Filter interviews by round
    const roundInterviews = interviews.filter(i => {
      const iRound = i.round?.toString().toUpperCase();
      return iRound === roundStr || iRound === roundStr.replace('R', '');
    });

    // Process each interview
    roundInterviews.forEach(i => {
      // Get the panel name from the interview
      let panelName = i.panel || '';
      
      // If no panel, try to get from panelists
      if (!panelName || panelName === '') {
        let panelists = [];
        if (Array.isArray(i.panelists)) {
          panelists = i.panelists.filter(p => p && p !== '');
        } else if (typeof i.panelists === 'string') {
          panelists = i.panelists.split(',').map(p => p.trim()).filter(p => p && p !== '');
        }
        
        // Find a panel name in panelists
        for (const p of panelists) {
          if (p.includes('Panel')) {
            panelName = p;
            break;
          }
        }
      }
      
      // Check if this panel belongs to the correct round
      const isCorrectRound = roundStr === 'R1' ? isR1Panel(panelName) : isR2Panel(panelName);
      
      // If panel name doesn't match the round or is empty, skip
      if (!panelName || !isCorrectRound) return;
      
      // Normalize panel name
      let normalizedPanelName = panelName;
      if (panelName.includes('Panel')) {
        normalizedPanelName = panelName;
      } else if (panelName === '1' || panelName === '2') {
        normalizedPanelName = `Panel ${panelName}`;
      } else if (panelName === '3' || panelName === '4') {
        normalizedPanelName = `Panel ${panelName}`;
      }
      
      // Check if this panel exists in our map
      if (!panelMap[normalizedPanelName]) return;
      
      // Check if this interview has a result
      const hasResult = i.result && i.result !== 'Pending' && i.result !== 'pending';
      
      if (hasResult) {
        panelMap[normalizedPanelName].evaluated++;
        panelMap[normalizedPanelName].total_score += (i.total_score || 0);
        
        const result = i.result?.toLowerCase() || '';
        if (['selected', 'passed', 'accept'].includes(result)) {
          panelMap[normalizedPanelName].passed++;
        } else if (['rejected', 'reject'].includes(result)) {
          panelMap[normalizedPanelName].failed++;
        } else if (['on hold', 'hold'].includes(result)) {
          panelMap[normalizedPanelName].on_hold++;
        }
      }
    });

    // Process waitlisted candidates
    candidates.forEach(c => {
      if (c.current_stage === 'Waitlist') {
        const restoreStage = (c.waitlist_restore_stage || '').toLowerCase();
        const isR1Waitlisted = restoreStage.includes('r1') || 
                              restoreStage.includes('interview') ||
                              restoreStage === 'r1 scheduling' ||
                              restoreStage === 'r1 interview';
        const isR2Waitlisted = restoreStage.includes('r2') || 
                              restoreStage === 'r2 scheduling' ||
                              restoreStage === 'r2 interview';
        
        const isRelevantWaitlist = (roundStr === 'R1' && isR1Waitlisted) || 
                                   (roundStr === 'R2' && isR2Waitlisted);
        
        if (isRelevantWaitlist) {
          const candidateInterviews = interviews.filter(i => 
            i.candidate_id === c.id && 
            (i.round?.toString().toUpperCase() === roundStr || 
             i.round?.toString() === roundStr.replace('R', ''))
          );
          
          candidateInterviews.forEach(i => {
            let panelName = i.panel || '';
            if (!panelName || panelName === '') {
              let panelists = [];
              if (Array.isArray(i.panelists)) {
                panelists = i.panelists.filter(p => p && p !== '');
              } else if (typeof i.panelists === 'string') {
                panelists = i.panelists.split(',').map(p => p.trim()).filter(p => p && p !== '');
              }
              for (const p of panelists) {
                if (p.includes('Panel')) {
                  panelName = p;
                  break;
                }
              }
            }
            
            const isCorrectRound = roundStr === 'R1' ? isR1Panel(panelName) : isR2Panel(panelName);
            if (!panelName || !isCorrectRound) return;
            
            let normalizedPanelName = panelName;
            if (panelName.includes('Panel')) {
              normalizedPanelName = panelName;
            } else if (panelName === '1' || panelName === '2') {
              normalizedPanelName = `Panel ${panelName}`;
            } else if (panelName === '3' || panelName === '4') {
              normalizedPanelName = `Panel ${panelName}`;
            }
            
            if (panelMap[normalizedPanelName]) {
              panelMap[normalizedPanelName].waitlisted++;
            }
          });
        }
      }
    });

    // Convert to array and calculate percentages
    return Object.values(panelMap).map(p => ({
      ...p,
      pass_rate: p.evaluated > 0 ? Math.round((p.passed / p.evaluated) * 100) : 0,
      fail_rate: p.evaluated > 0 ? Math.round((p.failed / p.evaluated) * 100) : 0,
      hold_rate: p.evaluated > 0 ? Math.round((p.on_hold / p.evaluated) * 100) : 0,
      // Store raw counts for display
      passed_count: p.passed,
      failed_count: p.failed,
      hold_count: p.on_hold,
      evaluated_count: p.evaluated
    })).sort((a, b) => {
      // Sort by panel number
      const aNum = parseInt(a.panel_name.split(' ')[1] || 0);
      const bNum = parseInt(b.panel_name.split(' ')[1] || 0);
      return aNum - bNum;
    });
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '4px solid rgba(255,255,255,0.1)', 
          borderTop: '4px solid var(--primary)', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px' 
        }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading team performance data...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
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

  const tableHeaderStyle = { 
    padding: '16px 12px', 
    borderBottom: '1px solid var(--glass-border)', 
    color: 'var(--text-muted)', 
    fontWeight: '600' 
  };
  const tableCellStyle = { 
    padding: '16px 12px', 
    color: '#fff', 
    borderBottom: '1px solid rgba(255,255,255,0.02)' 
  };

  return (
    <div className="animate-fade-up">
      {/* Timeframe Filter */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '32px', 
        flexWrap: 'wrap', 
        gap: '16px' 
      }}>
        <h2 style={{ margin: 0, color: '#fff', fontSize: '20px', fontWeight: '700' }}>
          👥 Team Performance
          <span style={{ 
            fontSize: '14px', 
            fontWeight: '400', 
            color: 'var(--text-muted)', 
            marginLeft: '12px' 
          }}>
            ({getTimeframeLabel(timeframe, selectedMonth, selectedQuarter, selectedWeek)})
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
              className="btn-glass" style={{ padding: '8px 12px' }}
            >
              ◀
            </button>
          )}
          
          {['today', 'week', 'month', 'quarter', 'all'].map(t => (
            <button
              key={t}
              onClick={() => {
                setTimeframe(t);
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
              className="btn-glass" style={{ padding: '8px 12px' }}
            >
              ▶
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
        gap: '16px', 
        marginBottom: '32px' 
      }}>
        {[
          { label: 'New Candidates', value: teamData.summary.newCandidates, color: '#fff' },
          { label: 'Assignments', value: teamData.summary.totalAssignments, color: '#fbbf24' },
          { label: 'Interviews', value: teamData.summary.totalInterviews, color: '#c084fc' },
          { label: 'Selected', value: teamData.summary.totalSelected, color: '#34d399' },
          { label: 'Rejected', value: teamData.summary.totalRejected, color: '#f87171' }
        ].map(card => (
          <div key={card.label} className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ 
              fontSize: '13px', 
              color: 'var(--text-muted)', 
              textTransform: 'uppercase', 
              letterSpacing: '1px', 
              marginBottom: '12px' 
            }}>
              {card.label}
            </div>
            <div style={{ fontSize: '36px', fontWeight: '800', color: card.color }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Team Performance Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', 
        gap: '24px' 
      }}>
        
        {/* Assignment Team */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h4 style={{ 
            margin: '0 0 24px 0', 
            color: '#fff', 
            fontSize: '16px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px' 
          }}>
            <span>📋</span> Assignment Team
            <span style={{ 
              fontSize: '13px', 
              fontWeight: '500', 
              color: 'var(--text-muted)', 
              marginLeft: 'auto', 
              background: 'rgba(255,255,255,0.05)', 
              padding: '4px 12px', 
              borderRadius: '20px' 
            }}>
              {teamData.assignmentTeam.reduce((sum, t) => sum + t.evaluated, 0)} evaluations
            </span>
          </h4>
          {teamData.assignmentTeam.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
              No assignment data found.
            </p>
          ) : (
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>Evaluator</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>Sent</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>Evaluated</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>Pass %</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>Late</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>Rejected</th>
                  </tr>
                </thead>
                <tbody>
                  {teamData.assignmentTeam.map((item, index) => (
                    <tr key={index}>
                      <td style={{...tableCellStyle, fontWeight: '600'}}>{item.evaluator_name}</td>
                      <td style={{...tableCellStyle, textAlign: 'center'}}>{item.sent || 0}</td>
                      <td style={{...tableCellStyle, textAlign: 'center'}}>{item.evaluated}</td>
                      <td style={{...tableCellStyle, textAlign: 'center', fontWeight: '700', color: item.pass_rate >= 50 ? '#34d399' : '#f87171'}}>
                        {item.pass_rate}%
                      </td>
                      <td style={{...tableCellStyle, textAlign: 'center', color: item.late > 0 ? '#f87171' : 'var(--text-muted)'}}>
                        {item.late}
                      </td>
                      <td style={{...tableCellStyle, textAlign: 'center', color: item.rejected > 0 ? '#f87171' : 'var(--text-muted)'}}>
                        {item.rejected}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FIXED: Scheduling Team - Shows logged-in account names */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h4 style={{ 
            margin: '0 0 24px 0', 
            color: '#fff', 
            fontSize: '16px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px' 
          }}>
            <span>📅</span> Scheduling Team
            <span style={{ 
              fontSize: '13px', 
              fontWeight: '500', 
              color: 'var(--text-muted)', 
              marginLeft: 'auto', 
              background: 'rgba(255,255,255,0.05)', 
              padding: '4px 12px', 
              borderRadius: '20px' 
            }}>
              {teamData.schedulingTeam.reduce((sum, t) => sum + t.total_scheduled, 0)} scheduled
            </span>
          </h4>
          {teamData.schedulingTeam.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
              No scheduling activity found.
            </p>
          ) : (
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>Name</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>R1</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>R2</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>Total</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>Rescheduled</th>
                  </tr>
                </thead>
                <tbody>
                  {teamData.schedulingTeam.map((item, index) => (
                    <tr key={index}>
                      <td style={{...tableCellStyle, fontWeight: '600'}}>{item.name}</td>
                      <td style={{...tableCellStyle, textAlign: 'center'}}>{item.r1_scheduled}</td>
                      <td style={{...tableCellStyle, textAlign: 'center'}}>{item.r2_scheduled}</td>
                      <td style={{...tableCellStyle, textAlign: 'center', fontWeight: '700', color: '#60a5fa'}}>
                        {item.total_scheduled}
                      </td>
                      <td style={{...tableCellStyle, textAlign: 'center', color: item.rescheduled > 0 ? '#fbbf24' : 'var(--text-muted)'}}>
                        {item.rescheduled}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FIXED: R1 Panelists - Panel 1 & 2 only */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h4 style={{ 
            margin: '0 0 24px 0', 
            color: '#fff', 
            fontSize: '16px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px' 
          }}>
            <span>🎯</span> R1 Panelists (Panel 1 & 2)
            <span style={{ 
              fontSize: '13px', 
              fontWeight: '500', 
              color: 'var(--text-muted)', 
              marginLeft: 'auto', 
              background: 'rgba(255,255,255,0.05)', 
              padding: '4px 12px', 
              borderRadius: '20px' 
            }}>
              {teamData.panelR1.reduce((sum, p) => sum + p.evaluated, 0)} evaluations
            </span>
          </h4>
          {teamData.panelR1.length === 0 || teamData.panelR1.every(p => p.evaluated === 0) ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
              No R1 interview data found.
            </p>
          ) : (
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>Panel</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>Eval.</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>Pass %</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>Fail %</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>Hold %</th>
                  </tr>
                </thead>
                <tbody>
                  {teamData.panelR1.filter(p => p.evaluated > 0).map((item, index) => (
                    <tr key={index}>
                      <td style={{...tableCellStyle, fontWeight: '600'}}>{item.panel_name}</td>
                      <td style={{...tableCellStyle, textAlign: 'center'}}>{item.evaluated}</td>
                      <td style={{...tableCellStyle, textAlign: 'center', fontWeight: '700', color: item.pass_rate >= 50 ? '#34d399' : '#f87171'}}>
                        {item.pass_rate}%
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>
                          ({item.passed_count}/{item.evaluated_count})
                        </span>
                      </td>
                      <td style={{...tableCellStyle, textAlign: 'center', fontWeight: '700', color: item.fail_rate > 50 ? '#f87171' : 'var(--text-muted)'}}>
                        {item.fail_rate}%
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>
                          ({item.failed_count}/{item.evaluated_count})
                        </span>
                      </td>
                      <td style={{...tableCellStyle, textAlign: 'center', color: item.hold_rate > 0 ? '#fbbf24' : 'var(--text-muted)'}}>
                        {item.hold_rate}%
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>
                          ({item.hold_count}/{item.evaluated_count})
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* Show panels with 0 evaluations */}
                  {teamData.panelR1.filter(p => p.evaluated === 0).map((item, index) => (
                    <tr key={`zero-${index}`}>
                      <td style={{...tableCellStyle, fontWeight: '600', color: 'var(--text-muted)'}}>{item.panel_name}</td>
                      <td style={{...tableCellStyle, textAlign: 'center', color: 'var(--text-muted)'}}>0</td>
                      <td style={{...tableCellStyle, textAlign: 'center', color: 'var(--text-muted)'}}>0%</td>
                      <td style={{...tableCellStyle, textAlign: 'center', color: 'var(--text-muted)'}}>0%</td>
                      <td style={{...tableCellStyle, textAlign: 'center', color: 'var(--text-muted)'}}>0%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FIXED: R2 Panelists - Panel 3 & 4 only */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h4 style={{ 
            margin: '0 0 24px 0', 
            color: '#fff', 
            fontSize: '16px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px' 
          }}>
            <span>🏆</span> R2 Panelists (Panel 3 & 4)
            <span style={{ 
              fontSize: '13px', 
              fontWeight: '500', 
              color: 'var(--text-muted)', 
              marginLeft: 'auto', 
              background: 'rgba(255,255,255,0.05)', 
              padding: '4px 12px', 
              borderRadius: '20px' 
            }}>
              {teamData.panelR2.reduce((sum, p) => sum + p.evaluated, 0)} evaluations
            </span>
          </h4>
          {teamData.panelR2.length === 0 || teamData.panelR2.every(p => p.evaluated === 0) ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
              No R2 interview data found.
            </p>
          ) : (
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>Panel</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>Eval.</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>Pass %</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>Fail %</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center'}}>Hold %</th>
                  </tr>
                </thead>
                <tbody>
                  {teamData.panelR2.filter(p => p.evaluated > 0).map((item, index) => (
                    <tr key={index}>
                      <td style={{...tableCellStyle, fontWeight: '600'}}>{item.panel_name}</td>
                      <td style={{...tableCellStyle, textAlign: 'center'}}>{item.evaluated}</td>
                      <td style={{...tableCellStyle, textAlign: 'center', fontWeight: '700', color: item.pass_rate >= 50 ? '#34d399' : '#f87171'}}>
                        {item.pass_rate}%
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>
                          ({item.passed_count}/{item.evaluated_count})
                        </span>
                      </td>
                      <td style={{...tableCellStyle, textAlign: 'center', fontWeight: '700', color: item.fail_rate > 50 ? '#f87171' : 'var(--text-muted)'}}>
                        {item.fail_rate}%
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>
                          ({item.failed_count}/{item.evaluated_count})
                        </span>
                      </td>
                      <td style={{...tableCellStyle, textAlign: 'center', color: item.hold_rate > 0 ? '#fbbf24' : 'var(--text-muted)'}}>
                        {item.hold_rate}%
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>
                          ({item.hold_count}/{item.evaluated_count})
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* Show panels with 0 evaluations */}
                  {teamData.panelR2.filter(p => p.evaluated === 0).map((item, index) => (
                    <tr key={`zero-${index}`}>
                      <td style={{...tableCellStyle, fontWeight: '600', color: 'var(--text-muted)'}}>{item.panel_name}</td>
                      <td style={{...tableCellStyle, textAlign: 'center', color: 'var(--text-muted)'}}>0</td>
                      <td style={{...tableCellStyle, textAlign: 'center', color: 'var(--text-muted)'}}>0%</td>
                      <td style={{...tableCellStyle, textAlign: 'center', color: 'var(--text-muted)'}}>0%</td>
                      <td style={{...tableCellStyle, textAlign: 'center', color: 'var(--text-muted)'}}>0%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default TeamPerformance;