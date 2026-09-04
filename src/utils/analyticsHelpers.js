// utils/analyticsHelpers.js

// ===== HELPER: Calculate Average =====
const avg = (arr) => {
  const filtered = arr.filter(v => v !== null && v !== undefined && !isNaN(v));
  return filtered.length > 0 ? filtered.reduce((a, b) => a + b, 0) / filtered.length : 0;
};

// ===== HELPER: Get Status (Good, Watch, Flag) =====
const getStatus = (value, goodThreshold, investigateThreshold, isLowerBetter = false, upperGoodThreshold = null) => {
  // Handle edge cases
  if (value === null || value === undefined || isNaN(value) || value === 0) {
    return 'good';
  }
  
  // Clamp value to 0-100 for percentage values
  const clampedValue = Math.max(0, Math.min(100, value));
  
  if (isLowerBetter) {
    // Lower is better (e.g., TAT, reschedule rate, withdrawal rate)
    if (clampedValue <= goodThreshold) return 'good';
    if (clampedValue <= investigateThreshold) return 'watch';
    return 'flag';
  } else {
    // Higher is better (e.g., pass rate, conversion rate)
    if (upperGoodThreshold && clampedValue >= upperGoodThreshold) {
      return 'too_easy'; // Too high might indicate issues (too easy)
    }
    if (clampedValue >= goodThreshold) return 'good';
    if (clampedValue >= investigateThreshold) return 'watch';
    return 'flag';
  }
};

// ===== HELPER: Case-insensitive checks =====
const isStatus = (item, statusValue) => {
  if (!item || !item.status) return false;
  return item.status?.toLowerCase() === statusValue.toLowerCase();
};

const isResult = (item, resultValue) => {
  if (!item || !item.result) return false;
  return item.result?.toLowerCase() === resultValue.toLowerCase();
};

const isRound = (item, roundValue) => {
  if (!item || !item.round) return false;
  return item.round?.toString().toLowerCase() === roundValue.toString().toLowerCase();
};

const isScheduled = (item) => {
  if (!item) return false;
  const status = item.status?.toLowerCase() || '';
  // Check if there's a scheduled date time
  if (!item.scheduled_date_time) return false;
  return status === 'scheduled' || 
         status === 'completed' || 
         status === 'evaluated' || 
         status === 'done' ||
         status === 'finished' ||
         status === 'confirmed' ||
         (item.result && item.result !== 'Pending' && item.result !== 'pending');
};

const isEvaluated = (item) => {
  if (!item) return false;
  return item.result && 
         item.result !== 'Pending' && 
         item.result !== 'pending' &&
         item.result !== '' &&
         item.result !== null;
};

const isRescheduled = (item) => {
  if (!item) return false;
  return (item.reschedule_count || 0) > 0;
};

// ===== MAIN ANALYTICS FUNCTION =====
export const calculateStageAnalytics = (candidates, assignments, interviews, rescheduleRequests = []) => {
  // ============ STAGE 1: ASSIGNMENTS ============
  const assignmentsSent = assignments.filter(a => 
    a.assignment_status === 'Assigned' || 
    a.assignment_status === 'Submitted' || 
    a.assignment_status === 'Evaluated'
  );
  
  const assignmentsSubmitted = assignments.filter(a => 
    a.assignment_status === 'Submitted' || 
    a.assignment_status === 'Evaluated'
  );
  
  const assignmentsEvaluated = assignments.filter(a => 
    a.assignment_status === 'Evaluated'
  );
  
  // FIXED: Assignment Pass calculation with proper null handling
  const assignmentsPassed = assignments.filter(a => {
    // If HR approved, it's a pass regardless of score
    if (a.hr_scorecard_approved === true) return true;
    
    // Otherwise calculate score
    const contentScore = parseFloat(a.content_score) || 0;
    const formattingScore = parseFloat(a.formatting_score) || 0;
    const aiScore = parseFloat(a.ai_score) || 0;
    const totalScore = contentScore + formattingScore - aiScore;
    
    return totalScore >= 6;
  });

  // Submission Rate: Submitted / Assignment Sent * 100
  const submissionRate = assignmentsSent.length > 0 
    ? (assignmentsSubmitted.length / assignmentsSent.length) * 100 
    : 0;

  // Evaluation TAT: Evaluation Date - Submission Date (in days)
  const evaluationTATs = assignmentsEvaluated
    .filter(a => a.evaluation_date && a.submitted_at)
    .map(a => {
      const evalDate = new Date(a.evaluation_date);
      const subDate = new Date(a.submitted_at);
      const diffDays = (evalDate - subDate) / (1000 * 60 * 60 * 24);
      return Math.max(0, Math.ceil(diffDays));
    });
  const evaluationTAT = evaluationTATs.length > 0 ? avg(evaluationTATs) : 0;

  // Assignment Pass Rate: Passed / Evaluated * 100
  const passRate = assignmentsEvaluated.length > 0 
    ? (assignmentsPassed.length / assignmentsEvaluated.length) * 100 
    : 0;

  const lateSubmissions = assignments.filter(a => a.is_late_submission === true).length;

  // ============ STAGE 2: R1 SCHEDULING ============
  const r1Interviews = interviews.filter(i => isRound(i, 'R1') || isRound(i, '1'));
  
  // R1 TAT: R1 Scheduled Date - Assignment Pass Date (in days)
  const r1TATs = r1Interviews
    .filter(i => i.scheduled_date_time && i.candidate_id)
    .map(i => {
      const candidate = candidates.find(c => c.id === i.candidate_id);
      if (!candidate) return null;
      
      // Find the assignment pass date
      const candidateAssignment = assignments.find(a => a.candidate_id === candidate.id);
      let passDate = null;
      
      if (candidateAssignment && candidateAssignment.assignment_status === 'Evaluated') {
        const totalScore = (candidateAssignment.content_score || 0) + 
                          (candidateAssignment.formatting_score || 0) - 
                          (candidateAssignment.ai_score || 0);
        if (totalScore >= 6 || candidateAssignment.hr_scorecard_approved === true) {
          passDate = candidateAssignment.evaluation_date || candidateAssignment.updated_at;
        }
      }
      
      if (!passDate) return null;
      
      const scheduledDate = new Date(i.scheduled_date_time);
      const passDateObj = new Date(passDate);
      const diffDays = (scheduledDate - passDateObj) / (1000 * 60 * 60 * 24);
      return diffDays > 0 ? Math.ceil(diffDays) : null;
    })
    .filter(d => d !== null);
  const r1TAT = r1TATs.length > 0 ? avg(r1TATs) : 0;

  // ============ STAGE 3: R1 INTERVIEWS ============
  const r1Scheduled = r1Interviews.filter(i => isScheduled(i));
  const r1Evaluated = r1Interviews.filter(i => isEvaluated(i));
  const r1Passed = r1Interviews.filter(i => 
    isResult(i, 'Passed') || 
    isResult(i, 'Selected') || 
    isResult(i, 'Accept')
  );
  const r1Rescheduled = r1Interviews.filter(i => isRescheduled(i));

  // Conducted Rate: Evaluated / Scheduled * 100
  const r1ConductedRate = r1Scheduled.length > 0 ? (r1Evaluated.length / r1Scheduled.length) * 100 : 0;
  
  // Moving Forward Rate: Passed / Evaluated * 100
  const r1MovingForwardRate = r1Evaluated.length > 0 ? (r1Passed.length / r1Evaluated.length) * 100 : 0;
  
  // Reschedule Rate: Rescheduled / Scheduled * 100
  const r1RescheduleRate = r1Scheduled.length > 0 ? (r1Rescheduled.length / r1Scheduled.length) * 100 : 0;

  // ============ STAGE 4: R2 SCHEDULING ============
  const r2Interviews = interviews.filter(i => isRound(i, 'R2') || isRound(i, '2'));
  
  // R2 TAT: R2 Scheduled Date - R1 Pass Date (in days)
  const r2TATs = r2Interviews
    .filter(i => i.scheduled_date_time && i.candidate_id)
    .map(i => {
      const candidate = candidates.find(c => c.id === i.candidate_id);
      if (!candidate) return null;
      
      const r1Pass = interviews.find(interv => 
        interv.candidate_id === i.candidate_id && 
        (isRound(interv, 'R1') || isRound(interv, '1')) && 
        (isResult(interv, 'Passed') || isResult(interv, 'Selected') || isResult(interv, 'Accept'))
      );
      if (!r1Pass || !r1Pass.updated_at) return null;
      const passDate = new Date(r1Pass.updated_at);
      const scheduledDate = new Date(i.scheduled_date_time);
      const diffDays = (scheduledDate - passDate) / (1000 * 60 * 60 * 24);
      return diffDays > 0 ? Math.ceil(diffDays) : null;
    })
    .filter(d => d !== null);
  const r2TAT = r2TATs.length > 0 ? avg(r2TATs) : 0;

  // ============ STAGE 5: R2 INTERVIEWS ============
  const r2Scheduled = r2Interviews.filter(i => isScheduled(i));
  const r2Evaluated = r2Interviews.filter(i => isEvaluated(i));
  const r2Passed = r2Interviews.filter(i => 
    isResult(i, 'Passed') || 
    isResult(i, 'Selected') || 
    isResult(i, 'Accept')
  );
  const r2Rescheduled = r2Interviews.filter(i => isRescheduled(i));

  // Conducted Rate: Evaluated / Scheduled * 100
  const r2ConductedRate = r2Scheduled.length > 0 ? (r2Evaluated.length / r2Scheduled.length) * 100 : 0;
  
  // Moving Forward Rate: Passed / Evaluated * 100
  const r2MovingForwardRate = r2Evaluated.length > 0 ? (r2Passed.length / r2Evaluated.length) * 100 : 0;
  
  // Reschedule Rate: Rescheduled / Scheduled * 100
  const r2RescheduleRate = r2Scheduled.length > 0 ? (r2Rescheduled.length / r2Scheduled.length) * 100 : 0;

  // ============ GENERAL: WITHDRAWAL RATE ============
  const totalWithdrawn = candidates.filter(c => c.current_stage === 'Withdrawn').length;
  const totalCandidates = candidates.length;
  const withdrawalRate = totalCandidates > 0 ? (totalWithdrawn / totalCandidates) * 100 : 0;

  // ============ SOURCE ANALYTICS ============
  const sourceData = {};
  candidates.forEach(c => {
    const source = c.source || 'Unknown';
    if (!sourceData[source]) {
      sourceData[source] = { total: 0, selected: 0, rejected: 0 };
    }
    sourceData[source].total++;
    if (c.current_stage === 'Selected' || c.current_stage === 'Probation' || c.current_stage === 'Onboarding Done') {
      sourceData[source].selected++;
    }
    if (c.current_stage === 'Rejected') {
      sourceData[source].rejected++;
    }
  });

  const topSources = Object.entries(sourceData)
    .map(([source, data]) => ({
      source,
      total: data.total,
      selected: data.selected,
      rejected: data.rejected,
      conversionRate: data.total > 0 ? (data.selected / data.total) * 100 : 0
    }))
    .sort((a, b) => b.conversionRate - a.conversionRate)
    .slice(0, 5);

  // ============ HR WORKLOAD ============
  // Pending Reviews: Assignments with status 'Submitted'
  const pendingReviews = assignments.filter(a => a.assignment_status === 'Submitted').length;
  
  // Pending Interviews: Scheduled interviews without result
  const pendingInterviews = interviews.filter(i => 
    i.status === 'Scheduled' && 
    (!i.result || i.result === 'Pending' || i.result === 'pending')
  ).length;
  
  // ===== RESCHEDULE REQUESTS =====
  // Count pending reschedule requests from interview_reschedule_requests table
  const pendingRescheduleRequests = rescheduleRequests.filter(r => 
    r.status === 'Pending' || r.status === 'pending'
  ).length;
  
  // ===== CORRECTED PENDING SCHEDULING LOGIC WITH REFERRAL HANDLING =====
  
  // R1 Pending Scheduling: Assignment passed, but NO R1 interview exists at all
  const r1PendingIds = [];
  assignments.forEach(a => {
    if (a.assignment_status === 'Evaluated') {
      const totalScore = (a.content_score || 0) + (a.formatting_score || 0) - (a.ai_score || 0);
      if (totalScore >= 6 || a.hr_scorecard_approved === true) {
        // Check if this candidate has ANY R1 interview
        const hasR1 = interviews.some(i => 
          i.candidate_id === a.candidate_id && 
          isRound(i, 'R1')
        );
        if (!hasR1 && !r1PendingIds.includes(a.candidate_id)) {
          r1PendingIds.push(a.candidate_id);
        }
      }
    }
  });
  
  // R2 Pending Scheduling: R1 passed, but NO R2 interview exists at all
  // EXCLUDE referral candidates (they skip R2 and go directly to Probation)
  const r2PendingIds = [];
  interviews.forEach(i => {
    if (isRound(i, 'R1') && (isResult(i, 'Passed') || isResult(i, 'Selected') || isResult(i, 'Accept'))) {
      // Check if this candidate is a referral
      const candidate = candidates.find(c => c.id === i.candidate_id);
      const isReferralCandidate = candidate?.source?.toLowerCase() === 'referral';
      
      // Skip referral candidates - they don't need R2
      if (isReferralCandidate) return;
      
      // Check if this candidate has ANY R2 interview
      const hasR2 = interviews.some(interv => 
        interv.candidate_id === i.candidate_id && 
        isRound(interv, 'R2')
      );
      if (!hasR2 && !r2PendingIds.includes(i.candidate_id)) {
        r2PendingIds.push(i.candidate_id);
      }
    }
  });
  
  // Total Pending Scheduling = R1 Pending + R2 Pending
  const pendingScheduling = r1PendingIds.length + r2PendingIds.length;

  // ============ RETURN ============
  return {
    assignment: {
      sent: assignmentsSent.length,
      submitted: assignmentsSubmitted.length,
      evaluated: assignmentsEvaluated.length,
      passed: assignmentsPassed.length,
      submissionRate: Math.round(submissionRate * 10) / 10,
      evaluationTAT: Math.round(evaluationTAT * 10) / 10,
      passRate: Math.round(passRate * 10) / 10,
      lateSubmissions,
      status: {
        submissionRate: getStatus(submissionRate, 60, 50),
        evaluationTAT: getStatus(evaluationTAT, 1, 2, true),
        passRate: getStatus(passRate, 50, 35, false, 85),
      }
    },
    r1Scheduling: {
      total: r1Interviews.length,
      r1TAT: Math.round(r1TAT * 10) / 10,
      status: { r1TAT: getStatus(r1TAT, 2, 3, true) }
    },
    r1Interview: {
      scheduled: r1Scheduled.length,
      evaluated: r1Evaluated.length,
      passed: r1Passed.length,
      rescheduled: r1Rescheduled.length,
      conductedRate: Math.round(r1ConductedRate * 10) / 10,
      movingForwardRate: Math.round(r1MovingForwardRate * 10) / 10,
      rescheduleRate: Math.round(r1RescheduleRate * 10) / 10,
      status: {
        conductedRate: getStatus(r1ConductedRate, 50, 45),
        movingForwardRate: getStatus(r1MovingForwardRate, 50, 30),
        rescheduleRate: getStatus(r1RescheduleRate, 15, 25, true),
      }
    },
    r2Scheduling: {
      total: r2Interviews.length,
      r2TAT: Math.round(r2TAT * 10) / 10,
      status: { r2TAT: getStatus(r2TAT, 2, 3, true) }
    },
    r2Interview: {
      scheduled: r2Scheduled.length,
      evaluated: r2Evaluated.length,
      passed: r2Passed.length,
      rescheduled: r2Rescheduled.length,
      conductedRate: Math.round(r2ConductedRate * 10) / 10,
      movingForwardRate: Math.round(r2MovingForwardRate * 10) / 10,
      rescheduleRate: Math.round(r2RescheduleRate * 10) / 10,
      status: {
        conductedRate: getStatus(r2ConductedRate, 70, 60),
        movingForwardRate: getStatus(r2MovingForwardRate, 70, 50),
        rescheduleRate: getStatus(r2RescheduleRate, 15, 25, true),
      }
    },
    general: {
      withdrawalRate: Math.round(withdrawalRate * 10) / 10,
      totalCandidates,
      totalWithdrawn,
      status: { withdrawalRate: getStatus(withdrawalRate, 10, 15, true) }
    },
    sources: {
      topSources,
      sourceData,
    },
    workload: {
      pendingReviews,
      pendingInterviews,
      pendingScheduling,
      pendingRescheduleRequests,
      r1PendingScheduling: r1PendingIds.length,
      r2PendingScheduling: r2PendingIds.length,
      totalPending: pendingReviews + pendingInterviews + pendingScheduling + pendingRescheduleRequests,
    }
  };
};