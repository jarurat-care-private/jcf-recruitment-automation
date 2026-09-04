// components/DailyLogView.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

// ===== HELPER: Get IST Date Range =====
function getISTDateRange(dateStr) {
  // Convert input date (YYYY-MM-DD) to IST start and end
  const startDate = new Date(dateStr + 'T00:00:00+05:30');
  const endDate = new Date(dateStr + 'T23:59:59+05:30');
  
  return {
    start: startDate.toISOString(),
    end: endDate.toISOString()
  };
}

// ===== HELPER: Format IST Time =====
function formatISTTime(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-US', { 
      timeZone: 'Asia/Kolkata',
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true
    });
  } catch (e) {
    return dateString;
  }
}

function DailyLogView({ date }) {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState({
    assignments: [],
    interviews: [],
    statusUpdates: []
  });

  useEffect(() => {
    fetchDailyLogs();
  }, [date]);

  async function fetchDailyLogs() {
    setLoading(true);
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      // Get IST date range for the target date
      const { start, end } = getISTDateRange(targetDate);
      
      const { data: activities, error } = await supabase
        .from('team_activity_log')
        .select('*')
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching daily logs:', error);
        setLogs({ assignments: [], interviews: [], statusUpdates: [] });
        return;
      }

      const grouped = {
        assignments: activities?.filter(a => 
          a.action?.includes('assignment') || 
          a.action === 'assignment_dispatched' ||
          a.action === 'assignment_evaluated'
        ) || [],
        interviews: activities?.filter(a => 
          a.action?.includes('interview') || 
          a.action?.includes('candidate_') ||
          a.action === 'interview_scheduled' ||
          a.action === 'interview_evaluated'
        ) || [],
        statusUpdates: activities?.filter(a => 
          a.action === 'status_updated' ||
          a.action === 'candidate_selected' ||
          a.action === 'candidate_rejected' ||
          a.action === 'candidate_hold' ||
          a.action === 'candidate_withdrawn' ||
          a.action === 'candidate_waitlisted'
        ) || []
      };

      setLogs(grouped);
    } catch (error) {
      console.error('Error fetching daily logs:', error);
      setLogs({ assignments: [], interviews: [], statusUpdates: [] });
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div style={{ 
      padding: '40px', 
      textAlign: 'center', 
      color: 'var(--text-muted)' 
    }}>
      <div style={{ 
        width: '30px', 
        height: '30px', 
        border: '3px solid rgba(255,255,255,0.1)', 
        borderTop: '3px solid var(--primary)', 
        borderRadius: '50%', 
        animation: 'spin 1s linear infinite',
        margin: '0 auto 12px'
      }} />
      Decrypting daily telemetry...
    </div>
  );

  const totalActivities = logs.assignments.length + logs.interviews.length + logs.statusUpdates.length;

  return (
    <div className="animate-fade-up">
      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '16px', 
        marginBottom: '24px' 
      }}>
        <div className="glass-panel" style={{ 
          padding: '20px', 
          textAlign: 'center', 
          borderTop: '2px solid #fff' 
        }}>
          <div style={{ 
            fontSize: '11px', 
            color: 'var(--text-muted)', 
            textTransform: 'uppercase', 
            letterSpacing: '1px', 
            marginBottom: '8px' 
          }}>
            Total Events
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#fff' }}>
            {totalActivities}
          </div>
        </div>
        
        <div className="glass-panel" style={{ 
          padding: '20px', 
          textAlign: 'center', 
          borderTop: '2px solid #fbbf24' 
        }}>
          <div style={{ 
            fontSize: '11px', 
            color: 'var(--text-muted)', 
            textTransform: 'uppercase', 
            letterSpacing: '1px', 
            marginBottom: '8px' 
          }}>
            Assignments
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#fbbf24' }}>
            {logs.assignments.length}
          </div>
        </div>
        
        <div className="glass-panel" style={{ 
          padding: '20px', 
          textAlign: 'center', 
          borderTop: '2px solid #c084fc' 
        }}>
          <div style={{ 
            fontSize: '11px', 
            color: 'var(--text-muted)', 
            textTransform: 'uppercase', 
            letterSpacing: '1px', 
            marginBottom: '8px' 
          }}>
            Interviews
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#c084fc' }}>
            {logs.interviews.length}
          </div>
        </div>
        
        <div className="glass-panel" style={{ 
          padding: '20px', 
          textAlign: 'center', 
          borderTop: '2px solid #60a5fa' 
        }}>
          <div style={{ 
            fontSize: '11px', 
            color: 'var(--text-muted)', 
            textTransform: 'uppercase', 
            letterSpacing: '1px', 
            marginBottom: '8px' 
          }}>
            Updates
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#60a5fa' }}>
            {logs.statusUpdates.length}
          </div>
        </div>
      </div>

      {totalActivities === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '15px' }}>
            📭 Telemetry silence. Zero events logged for this solar cycle.
          </p>
        </div>
      ) : (
        <div className="glass-panel" style={{ overflow: 'hidden', padding: 0 }}>
          {/* Combine all logs and sort by time */}
          {[...logs.interviews, ...logs.assignments, ...logs.statusUpdates]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .map((log, index) => {
              const actionIcon = log.action === 'candidate_selected' ? '🏆' : 
                                log.action === 'candidate_rejected' ? '❌' : 
                                log.action === 'candidate_hold' ? '⏸️' :
                                log.action === 'assignment_dispatched' ? '📝' :
                                log.action === 'assignment_evaluated' ? '✅' :
                                log.action === 'interview_scheduled' ? '📅' :
                                log.action === 'interview_evaluated' ? '🎯' :
                                log.action === 'status_updated' ? '🔄' :
                                log.action === 'candidate_withdrawn' ? '👋' :
                                log.action === 'candidate_waitlisted' ? '⏳' :
                                log.action === 'probation_meeting_scheduled' ? '📆' :
                                log.action === 'onboarding_completed' ? '🎉' : '📌';
              
              return (
                <div key={index} style={{
                  padding: '16px 24px',
                  borderBottom: '1px solid var(--glass-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  background: index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'}
                >
                  <span style={{ fontSize: '24px' }}>{actionIcon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontWeight: '600', 
                      fontSize: '14px', 
                      color: '#fff', 
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}>
                      <span>{log.user_name || 'System'}</span>
                      <span style={{ color: 'var(--primary)', fontWeight: '700' }}>→</span>
                      <span style={{ 
                        background: 'rgba(255,255,255,0.05)',
                        padding: '2px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#94a3b8'
                      }}>
                        {log.team || 'General'}
                      </span>
                      <span style={{ 
                        fontSize: '13px',
                        color: '#e2e8f0'
                      }}>
                        {log.action?.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {log.details?.candidate_name && (
                        <span style={{color: '#e2e8f0'}}>
                          Subject: {log.details.candidate_name}
                        </span>
                      )}
                      {log.details?.round && ` • Phase: ${log.details.round}`}
                      {log.details?.total_score && ` • Score: ${log.details.total_score}`}
                      {log.details?.domain && ` • Domain: ${log.details.domain}`}
                      {log.details?.reason && ` • Reason: ${log.details.reason}`}
                      {log.details?.new_status && ` • New Status: ${log.details.new_status}`}
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#64748b', 
                    fontWeight: '500',
                    textAlign: 'right',
                    minWidth: '80px'
                  }}>
                    {formatISTTime(log.created_at)}
                  </div>
                </div>
              );
            })
          }
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
}

export default DailyLogView;