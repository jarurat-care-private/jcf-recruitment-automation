// pages/HRAdminAnalytics.jsx - NO NAVIGATION (Uses parent sidebar)
import { useState } from 'react';
import TeamPerformance from '../components/TeamPerformance';
import TeamActivityTracker from '../components/TeamActivityTracker';
import StageAnalytics from '../components/StageAnalytics';

function HRAdminAnalytics() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div style={{ width: '100%' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#fff', fontWeight: '800', fontSize: '36px', letterSpacing: '-1px', margin: 0 }}>
          System Analytics
        </h1>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '30px',
        padding: '16px 24px',
        flexWrap: 'wrap',
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px'
      }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            border: activeTab === 'overview' ? '1px solid rgba(79, 70, 229, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
            background: activeTab === 'overview' ? 'rgba(79, 70, 229, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            color: activeTab === 'overview' ? '#818cf8' : '#e2e8f0',
            fontWeight: '500',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: 'inherit'
          }}
        >
          Stage Analytics
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            border: activeTab === 'performance' ? '1px solid rgba(79, 70, 229, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
            background: activeTab === 'performance' ? 'rgba(79, 70, 229, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            color: activeTab === 'performance' ? '#818cf8' : '#e2e8f0',
            fontWeight: '500',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: 'inherit'
          }}
        >
          Team Performance
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            border: activeTab === 'activity' ? '1px solid rgba(79, 70, 229, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
            background: activeTab === 'activity' ? 'rgba(79, 70, 229, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            color: activeTab === 'activity' ? '#818cf8' : '#e2e8f0',
            fontWeight: '500',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          Activity Log
          <span style={{
            fontSize: '10px',
            background: 'rgba(16, 185, 129, 0.2)',
            color: '#34d399',
            padding: '2px 8px',
            borderRadius: '10px',
            fontWeight: '700'
          }}>
            Live
          </span>
        </button>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'overview' && <StageAnalytics />}
        {activeTab === 'performance' && <TeamPerformance />}
        {activeTab === 'activity' && <TeamActivityTracker />}
      </div>
    </div>
  );
}

export default HRAdminAnalytics;