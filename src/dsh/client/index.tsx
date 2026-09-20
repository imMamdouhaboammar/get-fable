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

export interface FableWidgetViewProps {
  status: FableStatusResponse | null;
  loading?: boolean;
  onOpenHub?: () => void;
}

export const FableWidgetView: React.FC<FableWidgetViewProps> = ({
  status,
  loading = false,
  onOpenHub,
}) => {
  if (loading || !status) {
    return (
      <div className="fable-widget-pill">
        <span className="fable-dot" style={{ opacity: 0.5 }} />
        <span>Fable: Loading...</span>
      </div>
    );
  }

  const recoveryThreshold = status.recoveryThreshold ?? 2;
  const hasHighStreak = status.failureStreak >= recoveryThreshold;
  const unverifiedDebt = status.unverifiedMutations ?? 0;

  return (
    <div
      className="fable-widget-pill"
      title={`Fable Phase: ${status.phase} | Fail Streak: ${status.failureStreak}/${recoveryThreshold}${hasHighStreak ? ' (Recovery Triggered)' : ''}${unverifiedDebt > 0 ? ` | Unverified Debt: ${unverifiedDebt}` : ''}`}
      onClick={onOpenHub}
    >
      <span className={`fable-dot ${hasHighStreak ? 'fable-dot-warn' : ''}`} />
      <span>Fable: {status.phase}</span>
      {status.failureStreak > 0 && (
        <span style={{ color: hasHighStreak ? '#f87171' : '#fbbf24', fontSize: '11px', fontWeight: 700 }}>
          ({status.failureStreak}/{recoveryThreshold}{hasHighStreak ? ' - Recovery' : ' streak'})
        </span>
      )}
      {unverifiedDebt > 0 && (
        <span style={{ color: '#fbbf24', fontSize: '10px', marginLeft: '4px', fontWeight: 600 }}>
          [{unverifiedDebt} unverified]
        </span>
      )}
    </div>
  );
};

export interface FableWidgetProps {
  initialStatus?: FableStatusResponse | null;
  skipAutoFetch?: boolean;
}

export const FableWidget: React.FC<FableWidgetProps> = ({
  initialStatus = null,
  skipAutoFetch = false,
}) => {
  const [status, setStatus] = useState<FableStatusResponse | null>(initialStatus);
  const [loading, setLoading] = useState(initialStatus === null && !skipAutoFetch);

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
    if (!skipAutoFetch) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [skipAutoFetch]);

  return (
    <FableWidgetView
      status={status}
      loading={loading}
      onOpenHub={() => {
        const hubEvent = new CustomEvent('dsh:open-tab', { detail: { tabId: 'fable-hub' } });
        window.dispatchEvent(hubEvent);
      }}
    />
  );
};

export interface FableDashboardViewProps {
  status: FableStatusResponse | null;
  skills: FableSkillInfo[];
  skillsState: 'loading' | 'error' | 'loaded';
  skillsError?: string | null;
  activeTab?: 'plan' | 'skills' | 'router' | 'doctor';
  onTabChange?: (tab: 'plan' | 'skills' | 'router' | 'doctor') => void;
  taskInput?: string;
  onTaskInputChange?: (value: string) => void;
  onTestRoute?: () => void;
  routeResult?: any;
  routing?: boolean;
  onRunDoctorFix?: () => void;
  fixing?: boolean;
  fixError?: string | null;
  doctorReport?: any;
}

export const FableDashboardView: React.FC<FableDashboardViewProps> = ({
  status,
  skills,
  skillsState,
  skillsError = null,
  activeTab = 'plan',
  onTabChange,
  taskInput = '',
  onTaskInputChange,
  onTestRoute,
  routeResult,
  routing = false,
  onRunDoctorFix,
  fixing = false,
  fixError = null,
  doctorReport,
}) => {
  const completedPhases = status?.planning?.phases?.filter((p) => p.status === 'complete').length ?? 0;
  const totalPhases = status?.planning?.phases?.length ?? 0;
  const recoveryThreshold = status?.recoveryThreshold ?? 2;
  const isRecovering = (status?.failureStreak ?? 0) >= recoveryThreshold;
  const unverifiedDebt = status?.unverifiedMutations ?? 0;

  return (
    <div className="fable-root">
      {/* Header */}
      <div className="fable-header">
        <div className="fable-title-box">
          <div className="fable-logo">F</div>
          <div>
            <h2 className="fable-title">Fable Frontier Discipline Hub</h2>
            <p className="fable-subtitle">Evidence-First Agent Lifecycle, Skill Registry & File Planning for DSH</p>
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
          {isRecovering && (
            <span className="fable-badge fable-badge-warn">Recovery Triggered (Streak: {status?.failureStreak})</span>
          )}
          {unverifiedDebt > 0 && (
            <span className="fable-badge fable-badge-warn" title={`${unverifiedDebt} unverified mutation(s)`}>
              Unverified Debt: {unverifiedDebt}
            </span>
          )}
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="fable-stats-grid">
        <div className="fable-stat-card">
          <span className="fable-stat-label">Active Work Card</span>
          <span className="fable-stat-val">{status?.activeCard || 'Root Session'}</span>
          {unverifiedDebt > 0 && (
            <span style={{ display: 'block', fontSize: '11px', color: '#fbbf24', marginTop: '4px' }}>
              {unverifiedDebt} unverified mutation{unverifiedDebt === 1 ? '' : 's'}
            </span>
          )}
        </div>
        <div className="fable-stat-card">
          <span className="fable-stat-label">Planning Progress</span>
          <span className="fable-stat-val">
            {completedPhases}/{totalPhases} <span style={{ fontSize: '13px', fontWeight: 400 }}>Phases</span>
          </span>
        </div>
        <div className="fable-stat-card">
          <span className="fable-stat-label">Failure Streak</span>
          <span className="fable-stat-val" style={{ color: isRecovering ? '#ef4444' : 'inherit' }}>
            {status?.failureStreak ?? 0}/{recoveryThreshold}
            {isRecovering && (
              <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#ef4444' }}>
                Recovery Triggered
              </span>
            )}
          </span>
        </div>
        <div className="fable-stat-card">
          <span className="fable-stat-label">Available Skills</span>
          <span className="fable-stat-val">
            {skillsState === 'loading'
              ? 'Loading...'
              : skillsState === 'error'
              ? 'Unavailable'
              : skills.length}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="fable-tabs">
        <button
          className={`fable-tab-btn ${activeTab === 'plan' ? 'active' : ''}`}
          onClick={() => onTabChange?.('plan')}
        >
          Manus-Style Plan
        </button>
        <button
          className={`fable-tab-btn ${activeTab === 'skills' ? 'active' : ''}`}
          onClick={() => onTabChange?.('skills')}
        >
          {skillsState === 'loaded' ? `Skills Registry (${skills.length})` : 'Skills Registry'}
        </button>
        <button
          className={`fable-tab-btn ${activeTab === 'router' ? 'active' : ''}`}
          onClick={() => onTabChange?.('router')}
        >
          Interactive Router
        </button>
        <button
          className={`fable-tab-btn ${activeTab === 'doctor' ? 'active' : ''}`}
          onClick={() => onTabChange?.('doctor')}
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
          {skillsState === 'loading' && (
            <p style={{ color: '#9ca3af', fontSize: '13px' }}>Loading registered skills...</p>
          )}
          {skillsState === 'error' && (
            <p style={{ color: '#f87171', fontSize: '13px' }}>{skillsError || 'Unable to load skills registry.'}</p>
          )}
          {skillsState === 'loaded' && skills.length === 0 && (
            <p style={{ color: '#9ca3af', fontSize: '13px' }}>No registered skills found in repository.</p>
          )}
          {skillsState === 'loaded' && skills.length > 0 && (
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
          )}
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
              onChange={(e) => onTaskInputChange?.(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onTestRoute?.()}
            />
            <button className="fable-btn" onClick={onTestRoute} disabled={routing}>
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
            <button className="fable-btn" onClick={onRunDoctorFix} disabled={fixing}>
              {fixing ? 'Running Doctor...' : 'Run Fable Doctor Fix'}
            </button>
          </div>
          {fixError && (
            <div style={{ padding: '10px 12px', marginBottom: '12px', background: '#3b1219', border: '1px solid #7f1d1d', borderRadius: '6px', color: '#fca5a5', fontSize: '12px' }}>
              <strong>Repair Error:</strong> {fixError}
            </div>
          )}
          {doctorReport && (() => {
            const isHealthy = doctorReport.healthy !== undefined
              ? (doctorReport.healthy && (!doctorReport.repairErrors || doctorReport.repairErrors.length === 0))
              : (doctorReport.ok ?? false);
            const errCount = (doctorReport.checks ? doctorReport.checks.filter((c: any) => c.status === 'ERROR').length : (doctorReport.issues?.length ?? 0))
              + (doctorReport.repairErrors?.length ?? 0);
            return (
              <div style={{ padding: '12px', background: '#121316', borderRadius: '8px', border: '1px solid #2e3035' }}>
                <div style={{ fontWeight: 600, color: isHealthy ? '#34d399' : '#f87171', fontSize: '13px' }}>
                  Status: {isHealthy ? 'Healthy (No issues found)' : `${errCount} Issues Detected`}
                </div>
                {doctorReport.fixed && doctorReport.repaired?.length > 0 && (
                  <div style={{ marginTop: '8px', padding: '8px', background: '#14291f', borderRadius: '4px', border: '1px solid #166534', fontSize: '12px', color: '#86efac' }}>
                    <strong>Auto-repaired ({doctorReport.repaired.length}):</strong>
                    <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                      {doctorReport.repaired.map((item: string, i: number) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {doctorReport.repairErrors?.length > 0 && (
                  <div style={{ marginTop: '8px', padding: '8px', background: '#3b1219', borderRadius: '4px', border: '1px solid #7f1d1d', fontSize: '12px', color: '#fca5a5' }}>
                    <strong>Repair Errors ({doctorReport.repairErrors.length}):</strong>
                    <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                      {doctorReport.repairErrors.map((err: string, i: number) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {doctorReport.checks?.filter((c: any) => c.status === 'ERROR').length > 0 && (
                  <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '12px', color: '#d1d5db' }}>
                    {doctorReport.checks.filter((c: any) => c.status === 'ERROR').map((iss: any, i: number) => (
                      <li key={i}>{iss.message || iss.id}</li>
                    ))}
                  </ul>
                )}
                {!doctorReport.checks && doctorReport.issues?.length > 0 && (
                  <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '12px', color: '#d1d5db' }}>
                    {doctorReport.issues.map((iss: any, i: number) => (
                      <li key={i}>{typeof iss === 'string' ? iss : iss.message || JSON.stringify(iss)}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export interface FableDashboardProps {
  initialStatus?: FableStatusResponse | null;
  initialSkills?: FableSkillInfo[];
  initialSkillsState?: 'loading' | 'error' | 'loaded';
  skipAutoFetch?: boolean;
}

export const FableDashboard: React.FC<FableDashboardProps> = ({
  initialStatus = null,
  initialSkills = [],
  initialSkillsState = 'loading',
  skipAutoFetch = false,
}) => {
  const [status, setStatus] = useState<FableStatusResponse | null>(initialStatus);
  const [skills, setSkills] = useState<FableSkillInfo[]>(initialSkills);
  const [skillsState, setSkillsState] = useState<'loading' | 'error' | 'loaded'>(
    initialSkills.length > 0 ? 'loaded' : initialSkillsState
  );
  const [skillsError, setSkillsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'plan' | 'skills' | 'router' | 'doctor'>('plan');
  const [taskInput, setTaskInput] = useState('');
  const [routeResult, setRouteResult] = useState<any>(null);
  const [routing, setRouting] = useState(false);
  const [doctorReport, setDoctorReport] = useState<any>(null);
  const [fixing, setFixing] = useState(false);
  const [fixError, setFixError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [statusRes, skillsRes] = await Promise.allSettled([
        fetch('/api/fable/status'),
        fetch('/api/fable/skills'),
      ]);
      if (statusRes.status === 'fulfilled' && statusRes.value.ok) {
        setStatus(await statusRes.value.json());
      }
      if (skillsRes.status === 'fulfilled' && skillsRes.value.ok) {
        const data = await skillsRes.value.json();
        setSkills(data);
        setSkillsState('loaded');
        setSkillsError(null);
      } else {
        setSkillsState('error');
        setSkillsError('Failed to load skills registry');
      }
    } catch (err: any) {
      setSkillsState('error');
      setSkillsError(err?.message || 'Failed to load skills registry');
    }
  };

  useEffect(() => {
    injectFableStyles();
    if (!skipAutoFetch) {
      loadData();
      const interval = setInterval(loadData, 6000);
      return () => clearInterval(interval);
    }
  }, [skipAutoFetch]);

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
    setFixError(null);
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
      } else {
        const errorData = await res.json().catch(() => ({}));
        setFixError(errorData.error || `Doctor repair failed with HTTP ${res.status}`);
      }
    } catch (err: any) {
      setFixError(err.message || 'Network error executing doctor repair');
    } finally {
      setFixing(false);
    }
  };

  return (
    <FableDashboardView
      status={status}
      skills={skills}
      skillsState={skillsState}
      skillsError={skillsError}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      taskInput={taskInput}
      onTaskInputChange={setTaskInput}
      onTestRoute={handleTestRoute}
      routeResult={routeResult}
      routing={routing}
      onRunDoctorFix={handleRunDoctorFix}
      fixing={fixing}
      fixError={fixError}
      doctorReport={doctorReport}
    />
  );
};

export const name = 'get-fable';

export function apply(ctx: any) {
  injectFableStyles();
  try {
    const slots = ctx?.get?.('slots') || ctx?.slots;
    if (slots && typeof slots.inject === 'function') {
      // Safe slot registration hooks if available
    }
  } catch (e) {
    console.warn('[get-fable client] Notice:', e);
  }
}

// DSH Micro-Frontend registration contract
if (typeof window !== 'undefined') {
  (window as any).__ModuleLoader__?.load?.({
    id: 'get-fable',
    factory: (require: any) => {
      var module: any = { exports: {} };
      var exports = module.exports;
      injectFableStyles();

      exports.name = 'get-fable';
      exports.apply = apply;
      exports.Widget = FableWidget;
      exports.Dashboard = FableDashboard;
      exports.FableWidget = FableWidget;
      exports.FableDashboard = FableDashboard;
      return module.exports;
    },
  });
}
