import React, { useState, useEffect } from 'react';
import { FABLE_CSS } from './styles.js';
import type { FableStatusResponse, FableSkillInfo } from '../types.js';

function injectFableStyles() {
  const tagId = 'get-fable/styles';
  if (typeof document !== 'undefined' && document.querySelector(`style[data-plugin-css="${tagId}"]`) === null) {
    const tag = document.createElement('style');
    tag.dataset.plugin = 'get-fable';
    tag.dataset.pluginCss = tagId;
    tag.textContent = FABLE_CSS;
    document.head.appendChild(tag);
  }
}

export const FableWidget: React.FC = () => {
  const [status, setStatus] = useState<FableStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/fable/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // ignore in offline/unmounted state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    injectFableStyles();
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !status) {
    return (
      <div className="fable-widget-pill">
        <span className="fable-dot" style={{ opacity: 0.5 }} />
        <span>Fable: Loading...</span>
      </div>
    );
  }

  const hasHighStreak = status.failureStreak >= 2;

  return (
    <div
      className="fable-widget-pill"
      title={`Fable Phase: ${status.phase} | Fail Streak: ${status.failureStreak}`}
      onClick={() => {
        const hubEvent = new CustomEvent('dsh:open-tab', { detail: { tabId: 'fable-hub' } });
        window.dispatchEvent(hubEvent);
      }}
    >
      <span className={`fable-dot ${hasHighStreak ? 'fable-dot-warn' : ''}`} />
      <span>Fable: {status.phase}</span>
      {status.failureStreak > 0 && (
        <span style={{ color: hasHighStreak ? '#f87171' : '#fbbf24', fontSize: '11px', fontWeight: 700 }}>
          ({status.failureStreak} streak)
        </span>
      )}
    </div>
  );
};

export const FableDashboard: React.FC = () => {
  const [status, setStatus] = useState<FableStatusResponse | null>(null);
  const [skills, setSkills] = useState<FableSkillInfo[]>([]);
  const [activeTab, setActiveTab] = useState<'plan' | 'skills' | 'router' | 'doctor'>('plan');
  const [taskInput, setTaskInput] = useState('');
  const [routeResult, setRouteResult] = useState<any>(null);
  const [routing, setRouting] = useState(false);
  const [doctorReport, setDoctorReport] = useState<any>(null);
  const [fixing, setFixing] = useState(false);

  const loadData = async () => {
    try {
      const [statusRes, skillsRes] = await Promise.all([
        fetch('/api/fable/status'),
        fetch('/api/fable/skills'),
      ]);
      if (statusRes.ok) setStatus(await statusRes.json());
      if (skillsRes.ok) setSkills(await skillsRes.json());
    } catch {
      // offline fallback
    }
  };

  useEffect(() => {
    injectFableStyles();
    loadData();
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleTestRoute = async () => {
    if (!taskInput.trim()) return;
    setRouting(true);
    try {
      const res = await fetch('/api/fable/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: taskInput }),
      });
      if (res.ok) {
        setRouteResult(await res.json());
      }
    } catch (err: any) {
      setRouteResult({ error: err.message });
    } finally {
      setRouting(false);
    }
  };

  const handleRunDoctorFix = async () => {
    setFixing(true);
    try {
      const res = await fetch('/api/fable/doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fix: true }),
      });
      if (res.ok) {
        const report = await res.json();
        setDoctorReport(report);
        loadData();
      }
    } finally {
      setFixing(false);
    }
  };

  const completedPhases = status?.planning?.phases?.filter((p) => p.status === 'complete').length ?? 0;
  const totalPhases = status?.planning?.phases?.length ?? 0;

  return (
    <div className="fable-root">
      {/* Header */}
      <div className="fable-header">
        <div className="fable-title-box">
          <div className="fable-logo">F</div>
          <div>
            <h2 className="fable-title">Fable Frontier Discipline Hub</h2>
            <p className="fable-subtitle">Evidence-First Agent Lifecycle, 25-Skill Engine & File Planning for DSH</p>
          </div>
        </div>
        <div className="fable-badge-row">
          <span className="fable-badge fable-badge-phase">Phase: {status?.phase ?? 'idle'}</span>
          {status?.planning?.mode && (
            <span className="fable-badge fable-badge-mode">Mode: {status.planning.mode}</span>
          )}
          {status?.planning?.attestationSha && (
            <span className="fable-badge fable-badge-mode" title={`Attestation: ${status.planning.attestationSha}`}>
              🔒 Attested
            </span>
          )}
          {(status?.failureStreak ?? 0) >= 2 && (
            <span className="fable-badge fable-badge-warn">Fail Streak: {status?.failureStreak}</span>
          )}
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="fable-stats-grid">
        <div className="fable-stat-card">
          <span className="fable-stat-label">Active Work Card</span>
          <span className="fable-stat-val">{status?.activeCard || 'Root Session'}</span>
        </div>
        <div className="fable-stat-card">
          <span className="fable-stat-label">Planning Progress</span>
          <span className="fable-stat-val">
            {completedPhases}/{totalPhases} <span style={{ fontSize: '13px', fontWeight: 400 }}>Phases</span>
          </span>
        </div>
        <div className="fable-stat-card">
          <span className="fable-stat-label">Failure Streak</span>
          <span className="fable-stat-val" style={{ color: (status?.failureStreak ?? 0) >= 2 ? '#ef4444' : 'inherit' }}>
            {status?.failureStreak ?? 0}/3
          </span>
        </div>
        <div className="fable-stat-card">
          <span className="fable-stat-label">Available Skills</span>
          <span className="fable-stat-val">{skills.length || 25}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="fable-tabs">
        <button
          className={`fable-tab-btn ${activeTab === 'plan' ? 'active' : ''}`}
          onClick={() => setActiveTab('plan')}
        >
          Manus-Style Plan
        </button>
        <button
          className={`fable-tab-btn ${activeTab === 'skills' ? 'active' : ''}`}
          onClick={() => setActiveTab('skills')}
        >
          25 Skills Registry
        </button>
        <button
          className={`fable-tab-btn ${activeTab === 'router' ? 'active' : ''}`}
          onClick={() => setActiveTab('router')}
        >
          Interactive Router
        </button>
        <button
          className={`fable-tab-btn ${activeTab === 'doctor' ? 'active' : ''}`}
          onClick={() => setActiveTab('doctor')}
        >
          Doctor & Diagnostics
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'plan' && (
        <div className="fable-card-body">
          <h3 style={{ margin: '0 0 12px 0', fontSize: '15px' }}>task_plan.md Live Phases</h3>
          {status?.planning?.phases && status.planning.phases.length > 0 ? (
            <div className="fable-phase-list">
              {status.planning.phases.map((ph, idx) => (
                <div key={idx} className="fable-phase-item">
                  <span className="fable-phase-name">{ph.name}</span>
                  <span className={`fable-status-tag fable-status-${ph.status}`}>
                    {ph.status === 'complete' ? '✓ Complete' : ph.status === 'in_progress' ? '● In Progress' : '○ Pending'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#9ca3af', fontSize: '13px' }}>
              No active `task_plan.md` found in current project. Run `get-fable init` or start a structured task.
            </p>
          )}
        </div>
      )}

      {activeTab === 'skills' && (
        <div className="fable-card-body">
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px' }}>Canonical Fable Skills Matrix</h3>
          <div className="fable-skill-grid">
            {skills.map((s) => (
              <div key={s.id} className="fable-skill-card">
                <span className="fable-skill-name">{s.name || s.id}</span>
                <span className="fable-skill-desc">{s.description || 'Fable lifecycle skill'}</span>
                <div style={{ display: 'flex', gap: '4px', marginTop: 'auto' }}>
                  <span style={{ fontSize: '10px', background: '#2e3035', padding: '2px 6px', borderRadius: '4px' }}>
                    v{s.version}
                  </span>
                  <span style={{ fontSize: '10px', background: '#312e81', color: '#c7d2fe', padding: '2px 6px', borderRadius: '4px' }}>
                    {s.pack}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'router' && (
        <div className="fable-card-body">
          <h3 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>Fable Task Router Sandbox</h3>
          <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: '#9ca3af' }}>
            Test how Fable's evidence-first router dispatches your prompts to the right specialized skill.
          </p>
          <div className="fable-router-box">
            <input
              className="fable-input"
              placeholder="e.g. Write unit tests for OAuth token rotation and verify failure cases"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTestRoute()}
            />
            <button className="fable-btn" onClick={handleTestRoute} disabled={routing}>
              {routing ? 'Analyzing Route...' : 'Analyze Route'}
            </button>
            {routeResult && (
              <div style={{ marginTop: '12px', padding: '14px', background: '#121316', borderRadius: '8px', border: '1px solid #2e3035' }}>
                <h4 style={{ margin: '0 0 6px 0', color: '#818cf8', fontSize: '14px' }}>
                  Selected Skill: {routeResult.decision?.selectedSkill} (Phase: {routeResult.decision?.targetPhase})
                </h4>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#d1d5db' }}>
                  <strong>Reason:</strong> {routeResult.decision?.reason}
                </p>
                <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                  Confidence Score: {routeResult.decision?.matchingScore} | Failure Streak: {routeResult.state?.failureStreak ?? 0}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'doctor' && (
        <div className="fable-card-body">
          <h3 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>Fable Health Diagnostics & Auto-Repair</h3>
          <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: '#9ca3af' }}>
            Validates `.fable/state.json`, hooks, skill packs, and environment configurations.
          </p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            <button className="fable-btn" onClick={handleRunDoctorFix} disabled={fixing}>
              {fixing ? 'Running Doctor...' : 'Run Fable Doctor Fix'}
            </button>
          </div>
          {doctorReport && (
            <div style={{ padding: '12px', background: '#121316', borderRadius: '8px', border: '1px solid #2e3035' }}>
              <div style={{ fontWeight: 600, color: doctorReport.healthy ? '#34d399' : '#f87171', fontSize: '13px' }}>
                Status: {doctorReport.healthy ? 'Healthy (No issues found)' : `${doctorReport.issues.length} Issues Detected`}
              </div>
              {doctorReport.issues?.length > 0 && (
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '12px', color: '#d1d5db' }}>
                  {doctorReport.issues.map((iss: any, i: number) => (
                    <li key={i}>{typeof iss === 'string' ? iss : iss.message || JSON.stringify(iss)}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// DSH Micro-Frontend registration contract
if (typeof window !== 'undefined') {
  (window as any).__ModuleLoader__?.load?.({
    id: 'get-fable',
    factory: (require: any) => {
      injectFableStyles();
      return {
        Widget: FableWidget,
        Dashboard: FableDashboard,
      };
    },
  });
}
