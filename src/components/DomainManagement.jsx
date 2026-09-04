// components/DomainManagement.jsx - UPDATED WITH BETTER UI
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

function DomainManagement({ onClose, onDomainAdded }) {
  const [domains, setDomains] = useState([]);
  const [newDomain, setNewDomain] = useState('');
  const [newLink, setNewLink] = useState('');
  const [newAssignmentName, setNewAssignmentName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editDomain, setEditDomain] = useState('');
  const [editLink, setEditLink] = useState('');
  const [editAssignmentName, setEditAssignmentName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Load domains when component mounts
  useEffect(() => {
    fetchDomains();
  }, []);

  // Fetch all domains from assignment_templates table
  async function fetchDomains() {
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from('assignment_templates')
        .select('*')
        .order('domain', { ascending: true });

      if (error) throw error;
      setDomains(data || []);
    } catch (err) {
      console.error('Error fetching domains:', err);
      setError('Failed to load domains');
    } finally {
      setFetching(false);
    }
  }

  // Log activity to team_activity_log
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

  // Add new domain
  async function handleAddDomain(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate inputs
    if (!newDomain.trim()) {
      setError('Domain name is required');
      return;
    }

    if (!newLink.trim()) {
      setError('Assignment link is required');
      return;
    }

    // Validate URL
    try {
      new URL(newLink.trim());
    } catch (_) {
      setError('Please enter a valid URL');
      return;
    }

    // Check if domain already exists
    const existing = domains.find(d => d.domain.toLowerCase() === newDomain.trim().toLowerCase());
    if (existing) {
      setError(`Domain "${newDomain.trim()}" already exists. You can edit it instead.`);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assignment_templates')
        .insert({
          domain: newDomain.trim(),
          assignment_name: newAssignmentName.trim() || `${newDomain.trim()} Core Assignment`,
          assignment_link: newLink.trim(),
          description: description.trim() || `Core assignment for ${newDomain.trim()} domain`
        })
        .select()
        .single();

      if (error) throw error;

      await logTeamActivity(
        'domain_added',
        'assignment_templates',
        data.id,
        {
          domain: newDomain.trim(),
          assignment_name: newAssignmentName.trim() || `${newDomain.trim()} Core Assignment`,
          assignment_link: newLink.trim(),
          description: description.trim() || null,
          added_by: localStorage.getItem('userName') || 'HR'
        }
      );

      setSuccess(`Domain "${newDomain.trim()}" added successfully!`);
      
      // Clear form
      setNewDomain('');
      setNewLink('');
      setNewAssignmentName('');
      setDescription('');
      
      // Refresh list
      await fetchDomains();
      if (onDomainAdded) onDomainAdded();

      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      console.error('Error adding domain:', err);
      setError(err.message || 'Failed to add domain');
    } finally {
      setLoading(false);
    }
  }

  // Edit existing domain
  async function handleEditDomain(domainId) {
    setError('');
    setSuccess('');

    if (!editDomain.trim()) {
      setError('Domain name is required');
      return;
    }

    if (!editLink.trim()) {
      setError('Assignment link is required');
      return;
    }

    try {
      new URL(editLink.trim());
    } catch (_) {
      setError('Please enter a valid URL');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assignment_templates')
        .update({
          domain: editDomain.trim(),
          assignment_name: editAssignmentName.trim() || `${editDomain.trim()} Core Assignment`,
          assignment_link: editLink.trim(),
          description: editDescription.trim() || `Core assignment for ${editDomain.trim()} domain`
        })
        .eq('id', domainId)
        .select()
        .single();

      if (error) throw error;

      await logTeamActivity(
        'domain_updated',
        'assignment_templates',
        domainId,
        {
          domain: editDomain.trim(),
          assignment_name: editAssignmentName.trim(),
          assignment_link: editLink.trim(),
          description: editDescription.trim() || null,
          updated_by: localStorage.getItem('userName') || 'HR'
        }
      );

      setSuccess(`Domain updated successfully!`);
      
      setEditingId(null);
      setEditDomain('');
      setEditLink('');
      setEditAssignmentName('');
      setEditDescription('');
      
      await fetchDomains();
      if (onDomainAdded) onDomainAdded();

      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      console.error('Error updating domain:', err);
      setError(err.message || 'Failed to update domain');
    } finally {
      setLoading(false);
    }
  }

  // Delete domain
  async function handleDeleteDomain(domainId, domainName) {
    if (!window.confirm(`Are you sure you want to delete domain "${domainName}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('assignment_templates')
        .delete()
        .eq('id', domainId);

      if (error) throw error;

      await logTeamActivity(
        'domain_deleted',
        'assignment_templates',
        domainId,
        {
          domain: domainName,
          deleted_by: localStorage.getItem('userName') || 'HR'
        }
      );

      setSuccess(`Domain "${domainName}" deleted successfully!`);
      await fetchDomains();
      if (onDomainAdded) onDomainAdded();

      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      console.error('Error deleting domain:', err);
      setError(err.message || 'Failed to delete domain');
    } finally {
      setLoading(false);
    }
  }

  // Start editing a domain
  function startEditing(domain) {
    setEditingId(domain.id);
    setEditDomain(domain.domain);
    setEditLink(domain.assignment_link);
    setEditAssignmentName(domain.assignment_name || '');
    setEditDescription(domain.description || '');
  }

  // Cancel editing
  function cancelEditing() {
    setEditingId(null);
    setEditDomain('');
    setEditLink('');
    setEditAssignmentName('');
    setEditDescription('');
  }

  // Styles - UPDATED with better contrast
  const buttonStyle = {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#e2e8f0',
    fontWeight: '500',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit'
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    border: 'none',
    color: '#fff',
    fontWeight: '600'
  };

  const editButtonStyle = {
    ...buttonStyle,
    border: '1px solid rgba(59, 130, 246, 0.3)',
    color: '#60a5fa',
    background: 'rgba(59, 130, 246, 0.1)'
  };

  const deleteButtonStyle = {
    ...buttonStyle,
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    background: 'rgba(239, 68, 68, 0.1)'
  };

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
    width: '100%',
    boxSizing: 'border-box'
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        padding: '40px',
        maxWidth: '700px',
        width: '100%',
        maxHeight: '85vh',
        overflowY: 'auto',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ color: '#fff', margin: 0, fontSize: '22px' }}>
            Manage Domain Templates
          </h2>
          <button
            onClick={onClose}
            style={buttonStyle}
          >
            Close
          </button>
        </div>

        {error && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#fca5a5',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            color: '#6ee7b7',
            marginBottom: '16px'
          }}>
            {success}
          </div>
        )}

        {/* Add New Domain Form */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.08)',
          marginBottom: '24px'
        }}>
          <h3 style={{ color: '#fff', margin: '0 0 16px 0', fontSize: '16px' }}>
            Add New Domain
          </h3>
          <form onSubmit={handleAddDomain}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                Domain Name *
              </label>
              <input
                type="text"
                placeholder="e.g., Cloud Architecture"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                Assignment Name *
              </label>
              <input
                type="text"
                placeholder="e.g., Cloud Architecture Core Assignment"
                value={newAssignmentName}
                onChange={(e) => setNewAssignmentName(e.target.value)}
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                Assignment Link *
              </label>
              <input
                type="url"
                placeholder="https://docs.google.com/document/d/..."
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                Description (Optional)
              </label>
              <input
                type="text"
                placeholder="Brief description of this domain assignment"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...primaryButtonStyle,
                width: '100%',
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Adding...' : 'Add Domain'}
            </button>
          </form>
        </div>

        {/* Existing Domains List */}
        <div>
          <h3 style={{ color: '#fff', margin: '0 0 16px 0', fontSize: '16px' }}>
            Existing Domains ({domains.length})
          </h3>
          
          {fetching ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
              Loading domains...
            </div>
          ) : domains.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
              No domains configured yet. Add your first domain above.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {domains.map((domain) => (
                <div
                  key={domain.id}
                  style={{
                    padding: '16px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.08)'
                  }}
                >
                  {editingId === domain.id ? (
                    // Edit Mode
                    <div>
                      <div style={{ marginBottom: '10px' }}>
                        <input
                          type="text"
                          value={editDomain}
                          onChange={(e) => setEditDomain(e.target.value)}
                          style={inputStyle}
                          placeholder="Domain name"
                        />
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <input
                          type="text"
                          value={editAssignmentName}
                          onChange={(e) => setEditAssignmentName(e.target.value)}
                          style={inputStyle}
                          placeholder="Assignment name"
                        />
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <input
                          type="url"
                          value={editLink}
                          onChange={(e) => setEditLink(e.target.value)}
                          style={inputStyle}
                          placeholder="Assignment link"
                        />
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <input
                          type="text"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          style={inputStyle}
                          placeholder="Description (optional)"
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => handleEditDomain(domain.id)}
                          disabled={loading}
                          style={{
                            ...primaryButtonStyle,
                            flex: 1,
                            opacity: loading ? 0.6 : 1,
                            cursor: loading ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          onClick={cancelEditing}
                          style={buttonStyle}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode - IMPROVED LAYOUT
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: '#fff', fontWeight: '600', fontSize: '15px' }}>
                            {domain.domain}
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>
                            {domain.assignment_name}
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px', wordBreak: 'break-all' }}>
                            <a 
                              href={domain.assignment_link} 
                              target="_blank" 
                              rel="noreferrer"
                              style={{ color: '#60a5fa', textDecoration: 'none' }}
                            >
                              {domain.assignment_link}
                            </a>
                          </div>
                          {domain.description && (
                            <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>
                              {domain.description}
                            </div>
                          )}
                          <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>
                            Added: {new Date(domain.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        {/* Buttons with better visibility */}
                        <div style={{ 
                          display: 'flex', 
                          gap: '8px', 
                          flexShrink: 0,
                          marginLeft: '16px',
                          alignItems: 'center'
                        }}>
                          <button
                            onClick={() => startEditing(domain)}
                            style={editButtonStyle}
                            onMouseEnter={(e) => { 
                              e.target.style.background = 'rgba(59, 130, 246, 0.2)';
                              e.target.style.transform = 'scale(1.02)';
                            }}
                            onMouseLeave={(e) => { 
                              e.target.style.background = 'rgba(59, 130, 246, 0.1)';
                              e.target.style.transform = 'scale(1)';
                            }}
                          >
                            ✎ Edit
                          </button>
                          <button
                            onClick={() => handleDeleteDomain(domain.id, domain.domain)}
                            style={deleteButtonStyle}
                            onMouseEnter={(e) => { 
                              e.target.style.background = 'rgba(239, 68, 68, 0.2)';
                              e.target.style.transform = 'scale(1.02)';
                            }}
                            onMouseLeave={(e) => { 
                              e.target.style.background = 'rgba(239, 68, 68, 0.1)';
                              e.target.style.transform = 'scale(1)';
                            }}
                          >
                            ✕ Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DomainManagement;