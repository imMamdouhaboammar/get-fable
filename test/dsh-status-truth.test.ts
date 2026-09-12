import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import React from 'react';
import {
  createFableApiHandler,
  type FableStatusResponse,
} from '../src/dsh/index.js';
import { FableDashboardView, FableWidgetView } from '../src/dsh/client/index.js';
import {
  addEvidence,
  createInitialState,
  recordMutation,
  writeFableState,
} from '../src/core/state.js';
import {
  routeTask,
  RECOVERY_FAILURE_THRESHOLD,
} from '../src/core/task-router.js';
import { evaluateFableSpark } from '../src/core/spark.js';

function renderToHtml(node: any): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(renderToHtml).join('');
  if (typeof node.type === 'function') {
    return renderToHtml(node.type(node.props));
  }
  if (typeof node.type === 'string') {
    const className = node.props?.className ? ` class="${node.props.className}"` : '';
    const children = node.props?.children !== undefined ? renderToHtml(node.props.children) : '';
    return `<${node.type}${className}>${children}</${node.type}>`;
  }
  return '';
}

describe('DSH truthful status metrics (Issues #61, #62, #66, #67)', () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-dsh-truth-'));
  });

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  describe('Issue #61: Truthful unverified-mutation debt', () => {
    test('reports 0 unverified mutations for uninitialized workspace', () => {
      const api = createFableApiHandler(projectRoot);
      const status = api.getStatus();
      expect(status.active).toBe(false);
      expect(status.unverifiedMutations).toBe(0);
    });

    test('reports 0 unverified mutations for initial state where mutation equals verified generation', () => {
      const api = createFableApiHandler(projectRoot);
      const initial = createInitialState(undefined, projectRoot);
      writeFableState(projectRoot, initial);

      const status = api.getStatus();
      expect(status.active).toBe(true);
      expect(status.unverifiedMutations).toBe(0);
    });

    test('calculates pending debt strictly as mutationGeneration - verifiedGeneration', () => {
      const api = createFableApiHandler(projectRoot);
      let state = createInitialState(undefined, projectRoot);

      // Record first mutation
      state = recordMutation(state, 'edit-1');
      writeFableState(projectRoot, state);
      expect(api.getStatus().unverifiedMutations).toBe(1);

      // Record second mutation
      state = recordMutation(state, 'edit-2');
      writeFableState(projectRoot, state);
      expect(api.getStatus().unverifiedMutations).toBe(2);

      // Record third mutation
      state = recordMutation(state, 'edit-3');
      writeFableState(projectRoot, state);
      expect(api.getStatus().unverifiedMutations).toBe(3);
    });

    test('resets unverified mutation debt to 0 once fresh passing evidence verifies all mutations', () => {
      const api = createFableApiHandler(projectRoot);
      let state = createInitialState(undefined, projectRoot);

      state = recordMutation(state, 'feat-mutation');
      writeFableState(projectRoot, state);
      expect(api.getStatus().unverifiedMutations).toBe(1);

      // Add passing test evidence
      state = addEvidence(state, {
        kind: 'test',
        source: 'bun test',
        result: 'pass',
        detail: 'all tests green',
      });
      writeFableState(projectRoot, state);

      const updated = api.getStatus();
      expect(updated.unverifiedMutations).toBe(0);
    });

    test('renders unverified debt badge and indicator in UI when unverifiedMutations > 0', () => {
      const statusWithDebt: FableStatusResponse = {
        active: true,
        version: '1.5.1',
        stateSchemaVersion: 3,
        activeCard: 'CARD-101',
        phase: 'executing',
        failureStreak: 0,
        recoveryThreshold: 2,
        unverifiedMutations: 3,
        doctorHealthy: true,
        issuesCount: 0,
        planning: {
          hasPlan: false,
          hasProgress: false,
          hasFindings: false,
          planContent: null,
          progressContent: null,
          findingsContent: null,
          mode: null,
          attestationSha: null,
          phases: [],
        },
      };

      const html = renderToHtml(
        React.createElement(FableDashboardView, {
          status: statusWithDebt,
          skills: [],
          skillsState: 'loaded',
        })
      );

      expect(html).toContain('Unverified Debt: 3');
      expect(html).toContain('3 unverified mutations');

      const widgetHtml = renderToHtml(
        React.createElement(FableWidgetView, {
          status: statusWithDebt,
          loading: false,
        })
      );
      expect(widgetHtml).toContain('[3 unverified]');
    });
  });

  describe('Issue #62: Removal of unsupported totalCards metric', () => {
    test('getStatus() does not expose totalCards and does not query state.cards', () => {
      const api = createFableApiHandler(projectRoot);
      const state = createInitialState(undefined, projectRoot);
      writeFableState(projectRoot, state);

      const status: any = api.getStatus();
      expect(status.totalCards).toBeUndefined();
      expect('totalCards' in status).toBe(false);
    });

    test('arbitrary state.cards injection is ignored and never presented', () => {
      const api = createFableApiHandler(projectRoot);
      const state = createInitialState(undefined, projectRoot) as any;
      state.cards = { 'card-1': {}, 'card-2': {}, 'card-3': {} };
      writeFableState(projectRoot, state);

      const status: any = api.getStatus();
      expect(status.totalCards).toBeUndefined();
      expect(status.activeCard).toBeNull();
    });
  });

  describe('Issue #66: Canonical recovery-failure threshold alignment', () => {
    test('canonical RECOVERY_FAILURE_THRESHOLD is exported as 2', () => {
      expect(RECOVERY_FAILURE_THRESHOLD).toBe(2);
    });

    test('getStatus() returns canonical recoveryThreshold matching RECOVERY_FAILURE_THRESHOLD', () => {
      const api = createFableApiHandler(projectRoot);
      const status = api.getStatus();
      expect(status.recoveryThreshold).toBe(RECOVERY_FAILURE_THRESHOLD);
    });

    test('task router activates fable-recover when failureStreak reaches RECOVERY_FAILURE_THRESHOLD', () => {
      const stateNormal = {
        ...createInitialState(undefined, projectRoot),
        failureStreak: RECOVERY_FAILURE_THRESHOLD - 1,
      };
      const decisionNormal = routeTask('implement authentication', stateNormal);
      expect(decisionNormal.reasons.some((r) => r.includes('repeated failure'))).toBe(false);

      const stateRecover = {
        ...createInitialState(undefined, projectRoot),
        failureStreak: RECOVERY_FAILURE_THRESHOLD,
      };
      const decisionRecover = routeTask('implement authentication', stateRecover);
      expect(decisionRecover.selectedSkill).toBe('fable-recover');
      expect(decisionRecover.reasons.some((r) => r.includes('repeated failure'))).toBe(true);
    });

    test('spark activates failure loop diagnosis when failureStreak reaches RECOVERY_FAILURE_THRESHOLD', () => {
      const stateRecover = {
        ...createInitialState(undefined, projectRoot),
        failureStreak: RECOVERY_FAILURE_THRESHOLD,
      };
      const spark = evaluateFableSpark({ state: stateRecover });
      expect(spark.reasonCode).toBe('failure-loop-diagnose-required');
    });

    test('dashboard UI renders dynamic threshold and clear recovery state without hardcoded /3', () => {
      const baseStatus: FableStatusResponse = {
        active: true,
        version: '1.5.1',
        stateSchemaVersion: 3,
        activeCard: null,
        phase: 'executing',
        failureStreak: 0,
        recoveryThreshold: 2,
        unverifiedMutations: 0,
        doctorHealthy: true,
        issuesCount: 0,
        planning: {
          hasPlan: false,
          hasProgress: false,
          hasFindings: false,
          planContent: null,
          progressContent: null,
          findingsContent: null,
          mode: null,
          attestationSha: null,
          phases: [],
        },
      };

      // Normal state (0 streak)
      const html0 = renderToHtml(
        React.createElement(FableDashboardView, {
          status: baseStatus,
          skills: [],
          skillsState: 'loaded',
        })
      );
      expect(html0).toContain('0/2');
      expect(html0).not.toContain('/3');
      expect(html0).not.toContain('Recovery Triggered');

      // Warning state at threshold (2 streak)
      const html2 = renderToHtml(
        React.createElement(FableDashboardView, {
          status: { ...baseStatus, failureStreak: 2 },
          skills: [],
          skillsState: 'loaded',
        })
      );
      expect(html2).toContain('2/2');
      expect(html2).not.toContain('/3');
      expect(html2).toContain('Recovery Triggered');

      // Custom dynamic threshold changes presentation automatically
      const htmlCustom = renderToHtml(
        React.createElement(FableDashboardView, {
          status: { ...baseStatus, failureStreak: 1, recoveryThreshold: 4 },
          skills: [],
          skillsState: 'loaded',
        })
      );
      expect(htmlCustom).toContain('1/4');
      expect(htmlCustom).not.toContain('/3');
      expect(htmlCustom).not.toContain('/2');
    });

    test('widget UI renders dynamic threshold and recovery trigger without hardcoded /3', () => {
      const baseStatus: FableStatusResponse = {
        active: true,
        version: '1.5.1',
        stateSchemaVersion: 3,
        activeCard: null,
        phase: 'executing',
        failureStreak: 2,
        recoveryThreshold: 2,
        unverifiedMutations: 0,
        doctorHealthy: true,
        issuesCount: 0,
        planning: {
          hasPlan: false,
          hasProgress: false,
          hasFindings: false,
          planContent: null,
          progressContent: null,
          findingsContent: null,
          mode: null,
          attestationSha: null,
          phases: [],
        },
      };

      const widgetHtml = renderToHtml(
        React.createElement(FableWidgetView, {
          status: baseStatus,
          loading: false,
        })
      );
      expect(widgetHtml).toContain('2/2 - Recovery');
      expect(widgetHtml).not.toContain('/3');
    });
  });

  describe('Issue #67: Truthful skills count and state reporting', () => {
    const dummyStatus: FableStatusResponse = {
      active: true,
      version: '1.5.1',
      stateSchemaVersion: 3,
      activeCard: null,
      phase: 'idle',
      failureStreak: 0,
      recoveryThreshold: 2,
      unverifiedMutations: 0,
      doctorHealthy: true,
      issuesCount: 0,
      planning: {
        hasPlan: false,
        hasProgress: false,
        hasFindings: false,
        planContent: null,
        progressContent: null,
        findingsContent: null,
        mode: null,
        attestationSha: null,
        phases: [],
      },
    };

    test('renders 0 (and not 25) when skills registry loads an empty list', () => {
      const html = renderToHtml(
        React.createElement(FableDashboardView, {
          status: dummyStatus,
          skills: [],
          skillsState: 'loaded',
          activeTab: 'skills',
        })
      );

      // Available Skills card must display 0
      expect(html).toContain('<span class="fable-stat-label">Available Skills</span><span class="fable-stat-val">0</span>');
      expect(html).not.toContain('<span class="fable-stat-val">25</span>');
      expect(html).toContain('No registered skills found in repository');
    });

    test('renders Unavailable (and not 25) when skills registry fetch fails', () => {
      const html = renderToHtml(
        React.createElement(FableDashboardView, {
          status: dummyStatus,
          skills: [],
          skillsState: 'error',
        })
      );

      expect(html).toContain('<span class="fable-stat-label">Available Skills</span><span class="fable-stat-val">Unavailable</span>');
      expect(html).not.toContain('<span class="fable-stat-val">25</span>');
    });

    test('renders Loading... when skills registry fetch is pending', () => {
      const html = renderToHtml(
        React.createElement(FableDashboardView, {
          status: dummyStatus,
          skills: [],
          skillsState: 'loading',
        })
      );

      expect(html).toContain('<span class="fable-stat-label">Available Skills</span><span class="fable-stat-val">Loading...</span>');
      expect(html).not.toContain('<span class="fable-stat-val">25</span>');
    });

    test('renders real skill count when skills are loaded', () => {
      const sampleSkills = [
        { id: 'fable-plan', name: 'fable-plan', description: 'Plan', version: '1.0.0', pack: 'core' },
        { id: 'fable-verify', name: 'fable-verify', description: 'Verify', version: '1.0.0', pack: 'core' },
      ];

      const html = renderToHtml(
        React.createElement(FableDashboardView, {
          status: dummyStatus,
          skills: sampleSkills,
          skillsState: 'loaded',
        })
      );

      expect(html).toContain('<span class="fable-stat-label">Available Skills</span><span class="fable-stat-val">2</span>');
      expect(html).toContain('Skills Registry (2)');
      expect(html).not.toContain('25 Skills');
    });
  });
});
