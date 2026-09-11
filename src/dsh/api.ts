import fs from 'node:fs';
import path from 'node:path';
import { readFableState, writeFableState, createInitialState, applyRoutingDecision } from '../core/state.js';
import { routeTask } from '../core/task-router.js';
import { loadSkillRegistry, canonicalSkillIds, readSkillBody } from '../core/skill-registry.js';
import { runDoctor } from '../core/doctor.js';
import type { FableDshConfig, FablePlanStatus, FableSkillInfo, FableStatusResponse } from './types.js';

export function readPlanStatus(projectRoot: string): FablePlanStatus {
  const taskPlanPath = path.join(projectRoot, 'task_plan.md');
  const progressPath = path.join(projectRoot, 'progress.md');
  const findingsPath = path.join(projectRoot, 'findings.md');
  const modePath = path.join(projectRoot, '.mode');
  const attestationPath = path.join(projectRoot, '.attestation');
  const legacyAttestationPath = path.join(projectRoot, '.plan-attestation');

  const hasPlan = fs.existsSync(taskPlanPath);
  const hasProgress = fs.existsSync(progressPath);
  const hasFindings = fs.existsSync(findingsPath);

  const planContent = hasPlan ? fs.readFileSync(taskPlanPath, 'utf-8') : null;
  const progressContent = hasProgress ? fs.readFileSync(progressPath, 'utf-8') : null;
  const findingsContent = hasFindings ? fs.readFileSync(findingsPath, 'utf-8') : null;

  let mode: 'legacy' | 'autonomous' | 'gated' | null = null;
  if (fs.existsSync(modePath)) {
    const rawMode = fs.readFileSync(modePath, 'utf-8').trim();
    if (rawMode.includes('gate')) mode = 'gated';
    else if (rawMode.includes('autonomous')) mode = 'autonomous';
    else mode = 'legacy';
  }

  let attestationSha: string | null = null;
  if (fs.existsSync(attestationPath)) {
    attestationSha = fs.readFileSync(attestationPath, 'utf-8').trim();
  } else if (fs.existsSync(legacyAttestationPath)) {
    attestationSha = fs.readFileSync(legacyAttestationPath, 'utf-8').trim();
  }

  const phases: Array<{ name: string; status: 'pending' | 'in_progress' | 'complete' | 'blocked' }> = [];
  if (planContent) {
    const lines = planContent.split('\n');
    let currentPhase: { name: string; status: 'pending' | 'in_progress' | 'complete' | 'blocked' } | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('### Phase') || trimmed.startsWith('## Phase')) {
        if (currentPhase) phases.push(currentPhase);
        currentPhase = {
          name: trimmed.replace(/^#+\s*/, ''),
          status: 'pending',
        };
      } else if (currentPhase) {
        if (trimmed.toLowerCase().includes('status: complete') || trimmed.startsWith('- [x]')) {
          currentPhase.status = 'complete';
        } else if (trimmed.toLowerCase().includes('status: in_progress')) {
          currentPhase.status = 'in_progress';
        } else if (trimmed.toLowerCase().includes('status: blocked')) {
          currentPhase.status = 'blocked';
        }
      }
    }
    if (currentPhase) phases.push(currentPhase);
  }

  return {
    hasPlan,
    hasProgress,
    hasFindings,
    planContent,
    progressContent,
    findingsContent,
    mode,
    attestationSha,
    phases,
  };
}

export function getAllSkills(repoRoot: string): FableSkillInfo[] {
  const canonical = canonicalSkillIds();
  const results: FableSkillInfo[] = [];

  const skillsDir = path.join(repoRoot, 'skills');
  if (fs.existsSync(skillsDir)) {
    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillId = entry.name;
        const skillMdPath = path.join(skillsDir, skillId, 'SKILL.md');
        if (fs.existsSync(skillMdPath)) {
          const content = fs.readFileSync(skillMdPath, 'utf-8');
          // Parse YAML frontmatter basic fields
          let name = skillId;
          let description = '';
          let version = '1.0.0';
          let pack = 'core';

          const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
          if (frontmatterMatch) {
            const fm = frontmatterMatch[1];
            const nameMatch = fm.match(/^name:\s*(.+)$/m);
            const descMatch = fm.match(/^description:\s*(.+)$/m);
            const verMatch = fm.match(/^version:\s*(.+)$/m);
            const packMatch = fm.match(/^pack:\s*(.+)$/m);

            if (nameMatch) name = nameMatch[1].trim().replace(/^["']|["']$/g, '');
            if (descMatch) description = descMatch[1].trim().replace(/^["']|["']$/g, '');
            if (verMatch) version = verMatch[1].trim().replace(/^["']|["']$/g, '');
            if (packMatch) pack = packMatch[1].trim().replace(/^["']|["']$/g, '');
          }

          results.push({
            id: skillId,
            name,
            description,
            version,
            pack,
          });
        }
      }
    }
  }

  return results;
}

export function createFableApiHandler(projectRoot: string = process.cwd()) {
  return {
    getStatus: (): FableStatusResponse => {
      const state = readFableState(projectRoot);
      const plan = readPlanStatus(projectRoot);
      let healthy = true;
      let issuesCount = 0;

      if (!state && fs.existsSync(path.join(projectRoot, '.fable'))) {
        healthy = false;
        issuesCount = 1;
      }

      return {
        active: state !== null,
        version: '1.5.1',
        stateSchemaVersion: state ? state.schemaVersion : null,
        activeCard: (state as any)?.activeCard ?? null,
        phase: state ? state.phase : 'idle',
        failureStreak: state ? state.failureStreak : 0,
        unverifiedMutations: (state as any)?.unverifiedMutations ?? 0,
        totalCards: (state as any)?.cards ? Object.keys((state as any).cards).length : 0,
        doctorHealthy: healthy,
        issuesCount,
        planning: plan,
      };
    },

    getPlan: (): FablePlanStatus => {
      return readPlanStatus(projectRoot);
    },

    getSkills: (repoRoot: string = projectRoot): FableSkillInfo[] => {
      return getAllSkills(repoRoot);
    },

    postRoute: (task: string, stateOverride?: any) => {
      const state = stateOverride || readFableState(projectRoot) || createInitialState(undefined, projectRoot);
      const decision = routeTask(task, state);
      return {
        decision,
        state,
        applied: false,
      };
    },

    postRouteAndApply: (task: string) => {
      let state = readFableState(projectRoot);
      if (!state) {
        state = createInitialState(undefined, projectRoot);
      }
      const decision = routeTask(task, state);
      const nextState = applyRoutingDecision(state, decision);
      writeFableState(projectRoot, nextState);
      return {
        decision,
        state: nextState,
        applied: true,
      };
    },

    postDoctor: (_fix: boolean = false) => {
      return runDoctor(projectRoot, projectRoot);
    },
  };
}
