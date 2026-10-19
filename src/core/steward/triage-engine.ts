import { execSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import type {
  GitHubIssueSnapshot,
  GitHubPrSnapshot,
  GitHubRunSnapshot,
  LocalAuditSnapshot,
  TriageDecision,
} from './types.js';

export interface RepositoryProbeResult {
  ghAvailable: boolean;
  ghAuthenticated: boolean;
  runs: GitHubRunSnapshot[];
  prs: GitHubPrSnapshot[];
  issues: GitHubIssueSnapshot[];
  localAudit: LocalAuditSnapshot;
}

export function probeGitHub(cwd: string): {
  available: boolean;
  authenticated: boolean;
  runs: GitHubRunSnapshot[];
  prs: GitHubPrSnapshot[];
  issues: GitHubIssueSnapshot[];
} {
  const result = {
    available: false,
    authenticated: false,
    runs: [] as GitHubRunSnapshot[],
    prs: [] as GitHubPrSnapshot[],
    issues: [] as GitHubIssueSnapshot[],
  };

  try {
    const whichGh = spawnSync('which', ['gh'], { encoding: 'utf-8' });
    if (whichGh.status !== 0) {
      return result;
    }
    result.available = true;

    const authCheck = spawnSync('gh', ['auth', 'status'], {
      cwd,
      encoding: 'utf-8',
    });
    if (authCheck.status !== 0 && !authCheck.stderr?.includes('Logged in to')) {
      return result;
    }
    result.authenticated = true;

    // 1. Probe recent workflow runs
    const runsProc = spawnSync(
      'gh',
      [
        'run',
        'list',
        '--limit',
        '10',
        '--json',
        'databaseId,name,conclusion,workflowName,headBranch,url',
      ],
      { cwd, encoding: 'utf-8' }
    );
    if (runsProc.status === 0 && runsProc.stdout) {
      try {
        result.runs = JSON.parse(runsProc.stdout.trim());
      } catch {
        result.runs = [];
      }
    }

    // 2. Probe open PRs
    const prsProc = spawnSync(
      'gh',
      [
        'pr',
        'list',
        '--state',
        'open',
        '--limit',
        '10',
        '--json',
        'number,title,headRefName,baseRefName,isDraft,author,url',
      ],
      { cwd, encoding: 'utf-8' }
    );
    if (prsProc.status === 0 && prsProc.stdout) {
      try {
        result.prs = JSON.parse(prsProc.stdout.trim());
      } catch {
        result.prs = [];
      }
    }

    // 3. Probe open issues
    const issuesProc = spawnSync(
      'gh',
      [
        'issue',
        'list',
        '--state',
        'open',
        '--limit',
        '10',
        '--json',
        'number,title,labels,body,url',
      ],
      { cwd, encoding: 'utf-8' }
    );
    if (issuesProc.status === 0 && issuesProc.stdout) {
      try {
        result.issues = JSON.parse(issuesProc.stdout.trim());
      } catch {
        result.issues = [];
      }
    }
  } catch {
    // Fail soft if gh commands error
  }

  return result;
}

export function probeLocalRepository(cwd: string): LocalAuditSnapshot {
  const snapshot: LocalAuditSnapshot = {
    findings: [],
    hasFailingLocalTests: false,
    untrackedFilesCount: 0,
    modifiedFilesCount: 0,
  };

  try {
    const gitStatus = spawnSync('git', ['status', '-s'], {
      cwd,
      encoding: 'utf-8',
    });
    if (gitStatus.status === 0 && gitStatus.stdout) {
      const lines = gitStatus.stdout
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      for (const line of lines) {
        if (line.startsWith('??')) {
          snapshot.untrackedFilesCount += 1;
        } else {
          snapshot.modifiedFilesCount += 1;
        }
      }
    }
  } catch {
    // Soft fallback
  }

  return snapshot;
}

export function evaluateTriageMatrix(
  probe: RepositoryProbeResult,
  ignoredTargets: string[] = []
): TriageDecision {
  // Tier 1: Failing Mainline CI Runs
  const failingMainlineRun = probe.runs.find(
    (r) =>
      r.conclusion === 'failure' &&
      (r.headBranch === 'main' || r.headBranch === 'master') &&
      !ignoredTargets.includes(String(r.databaseId)) &&
      !ignoredTargets.includes(r.workflowName || '') &&
      !ignoredTargets.includes(r.name || '')
  );
  if (failingMainlineRun) {
    return {
      tier: 1,
      category: 'failing-ci',
      title: `Failing CI workflow: ${failingMainlineRun.workflowName || failingMainlineRun.name}`,
      description: `GitHub Actions workflow run ${failingMainlineRun.databaseId} on branch ${failingMainlineRun.headBranch} failed. Mainline stability is priority #1.`,
      targetReference: String(failingMainlineRun.databaseId),
      recommendedSkill: 'fable-tend',
      suggestedTask: `Diagnose and repair failing CI workflow "${failingMainlineRun.workflowName || failingMainlineRun.name}" on ${failingMainlineRun.headBranch}`,
      reasons: [
        'Mainline CI build failure detected',
        'fable-tend prioritized for automated CI diagnosis and repair',
        'Mainline must be green before deploying or merging new features',
      ],
      confidence: 0.98,
    };
  }

  // Tier 2: Open Pull Requests Awaiting Review
  const pendingPr = probe.prs.find(
    (pr) => !pr.isDraft && !ignoredTargets.includes(String(pr.number))
  );
  if (pendingPr) {
    return {
      tier: 2,
      category: 'pending-pr',
      title: `Review and verify PR #${pendingPr.number}: ${pendingPr.title}`,
      description: `Pull Request #${pendingPr.number} ("${pendingPr.title}") from branch "${pendingPr.headRefName}" is open and ready for independent diff audit and regression verification.`,
      targetReference: String(pendingPr.number),
      recommendedSkill: 'fable-review',
      suggestedTask: `Review PR #${pendingPr.number} "${pendingPr.title}", verify diff against anti-slop rules, and run full test suites`,
      reasons: [
        'Active open Pull Request pending review',
        'fable-review prioritized for independent diff and test adequacy verification',
        'fable-judge will adversarial-check test assertions',
      ],
      confidence: 0.95,
    };
  }

  // Tier 3: Open GitHub Issues
  const openIssue = probe.issues.find(
    (issue) => !ignoredTargets.includes(String(issue.number))
  );
  if (openIssue) {
    return {
      tier: 3,
      category: 'open-issue',
      title: `Resolve Issue #${openIssue.number}: ${openIssue.title}`,
      description: `GitHub Issue #${openIssue.number} ("${openIssue.title}") requires bounded reproduction, test-driven fix, and PR submission.`,
      targetReference: String(openIssue.number),
      recommendedSkill: 'fable-tdd',
      suggestedTask: `Reproduce defect from Issue #${openIssue.number} "${openIssue.title}" with a failing test fixture, implement fix, and verify`,
      reasons: [
        'Open GitHub issue prioritized for resolution',
        'fable-tdd ensures observable regression test passes before closing',
        'fable-plan establishes clear acceptance criteria',
      ],
      confidence: 0.92,
    };
  }

  // Tier 4: Code Hygiene / Slop & Vulnerability Remediation
  if (
    probe.localAudit.modifiedFilesCount > 0 &&
    !ignoredTargets.includes('local-diff') &&
    !ignoredTargets.includes('anti-slop')
  ) {
    return {
      tier: 4,
      category: 'slop-vulnerability',
      title: 'Remediate active workspace modifications & anti-slop compliance',
      description: `Active workspace contains ${probe.localAudit.modifiedFilesCount} modified file(s). Run anti-slop scan and verify regression tests before committing.`,
      targetReference: 'local-diff',
      recommendedSkill: 'fable-anti-slop-engineering',
      suggestedTask:
        'Audit active modified files for anti-slop compliance, run unit tests, and verify fresh evidence',
      reasons: [
        'Uncommitted workspace modifications detected',
        'fable-anti-slop-engineering guards against swallowed errors and weak assertions',
        'fable-verify ensures clean build and tests before branch release',
      ],
      confidence: 0.9,
    };
  }

  // Tier 5: Autonomous Feature Innovation
  return {
    tier: 5,
    category: 'feature-innovation',
    title: 'Autonomous Feature Innovation & Capability Packaging',
    description:
      'Repository mainline is healthy with zero pending PRs or issues. Packaging next high-impact capability from roadmap and untracked components.',
    targetReference: 'feature-packaging',
    recommendedSkill: 'fable-spark',
    suggestedTask:
      'Evaluate architectural vectors, package untracked feature modules with full test coverage, and update documentation',
    reasons: [
      'Repository mainline is fully green and clean',
      'Zero blocking issues or pending reviews',
      'fable-spark and fable-cowork activated for autonomous continuous building',
    ],
    confidence: 0.88,
  };
}

export function probeAndTriage(
  cwd: string,
  ignoredTargets: string[] = []
): {
  probe: RepositoryProbeResult;
  decision: TriageDecision;
} {
  const ghProbe = probeGitHub(cwd);
  const localAudit = probeLocalRepository(cwd);
  const probe: RepositoryProbeResult = {
    ghAvailable: ghProbe.available,
    ghAuthenticated: ghProbe.authenticated,
    runs: ghProbe.runs,
    prs: ghProbe.prs,
    issues: ghProbe.issues,
    localAudit,
  };

  // Automatically treat already-investigated CI incidents as triaged
  const effectiveIgnored = new Set(ignoredTargets);
  const incidentsDir = path.join(cwd, '.fable', 'incidents');
  if (fs.existsSync(incidentsDir)) {
    try {
      const files = fs.readdirSync(incidentsDir);
      for (const f of files) {
        const match = f.match(/^ci-(\d+)\.md$/);
        if (match) {
          effectiveIgnored.add(match[1]);
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  const decision = evaluateTriageMatrix(probe, Array.from(effectiveIgnored));
  return { probe, decision };
}
