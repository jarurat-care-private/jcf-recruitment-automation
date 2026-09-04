// src/components/RegisterUser.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const RegisterUser = ({ onClose, onSuccess }) => {
  const { canRegisterUsers, registerUser } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: '',
    team: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    boxSizing: 'border-box',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '10px',
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
    color: '#94a3b8',
    marginBottom: '8px'
  };

  if (!canRegisterUsers()) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '20px'
      }}>
        <div style={{
          padding: '40px',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
          background: 'rgba(20, 20, 40, 0.95)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
          <h3 style={{ color: '#fca5a5', margin: '0 0 12px 0', fontSize: '22px' }}>Access Denied</h3>
          <p style={{ color: '#94a3b8', margin: '0 0 30px 0', fontSize: '15px' }}>
            You need HR Lead or Project Manager permissions.
          </p>
          <button onClick={onClose} style={{
            width: '100%',
            padding: '12px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '10px',
            color: '#fff',
            cursor: 'pointer'
          }}>
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!formData.role || !formData.team) {
      setMessage('Please select both Role and Team');
      setLoading(false);
      return;
    }

    try {
      const result = await registerUser(formData);
      console.log('📝 Registration result:', result);

      if (result.success) {
        const password = result.tempPassword || 'NO-PASSWORD';
        const userName = formData.name || 'User';
        const userEmail = formData.email || 'No Email';
        
        // ===== METHOD 1: SHOW IN CONSOLE WITH COPY INSTRUCTION =====
        console.log('%c🔑 TEMPORARY PASSWORD', 'font-size: 20px; font-weight: bold; color: #fbbf24;');
        console.log('%c' + password, 'font-size: 32px; font-weight: bold; color: #fbbf24; background: #1a1a2e; padding: 10px; border: 2px solid #f59e0b;');
        console.log('📋 Copy this password from the line above 👆');
        
        // ===== METHOD 2: SHOW IN ALERT WITH CLEAR INSTRUCTION =====
        const alertMessage = 
          '🔑 TEMPORARY PASSWORD\n' +
          '═══════════════════════════\n' +
          '  ' + password + '\n' +
          '═══════════════════════════\n\n' +
          '👤 User: ' + userName + '\n' +
          '📧 Email: ' + userEmail + '\n\n' +
          '📋 To copy:\n' +
          '1. Press Ctrl+C (or Cmd+C on Mac)\n' +
          '2. The password is selected above\n\n' +
          '⚠️ Share this password securely.';
        
        // Create a textarea with the password for easy copying
        const textArea = document.createElement('textarea');
        textArea.value = password;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          // Try to copy automatically
          document.execCommand('copy');
          textArea.remove();
          
          // Show success message
          alert(
            '✅ PASSWORD COPIED TO CLIPBOARD!\n\n' +
            '🔑 Password: ' + password + '\n\n' +
            '👤 User: ' + userName + '\n' +
            '📧 Email: ' + userEmail + '\n\n' +
            '⚠️ Share this password securely.'
          );
        } catch (err) {
          textArea.remove();
          // If copy fails, show alert with password
          alert(alertMessage);
        }
        
        // Clear form
        setFormData({ email: '', name: '', role: '', team: '' });
        
        if (onSuccess) {
          onSuccess(result.user);
        }
        
        // Close the modal
        setTimeout(() => {
          onClose();
        }, 500);

      } else {
        setMessage(result.error || 'Provisioning failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setMessage(error.message || 'Provisioning failed');
    } finally {
      setLoading(false);
    }
  };

  // Registration form
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '20px'
    }}>
      <div style={{
        padding: '40px',
        maxWidth: '480px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative',
        background: 'rgba(20, 20, 40, 0.95)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            padding: '6px 12px',
            fontSize: '18px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px',
            color: '#fff',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>

        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '24px', fontWeight: '800' }}>
            Create HR User
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
            Fill in the details to create a new HR user account.
          </p>
        </div>

        {message && (
          <div style={{
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '24px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            color: '#fca5a5',
            fontSize: '14px'
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Full Name *</label>
            <input
              type="text"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Email *</label>
            <input
              type="email"
              placeholder="john@jarurat.care"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Role *</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              required
              style={{ ...inputStyle, color: '#000' }}
            >
              <option value="">Select Role</option>
              <option value="panelist">Panel Evaluator</option>
              <option value="assignment_team">Assignment Controller</option>
              <option value="scheduling_team">Scheduler</option>
            </select>
          </div>
          <div style={{ marginBottom: '32px' }}>
            <label style={labelStyle}>Team *</label>
            <select
              value={formData.team}
              onChange={(e) => setFormData({ ...formData, team: e.target.value })}
              required
              style={{ ...inputStyle, color: '#000' }}
            >
              <option value="">Select Team</option>
              <option value="panel_r1">Panel R1</option>
              <option value="panel_r2">Panel R2</option>
              <option value="assignment">Assignment Hub</option>
              <option value="scheduling">Scheduling Core</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '14px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '10px',
                color: '#94a3b8',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2,
                padding: '14px',
                background: loading ? '#4b5563' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none',
                borderRadius: '10px',
                color: '#fff',
                fontWeight: '700',
                fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterUser;