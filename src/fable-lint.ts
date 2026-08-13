import fs from 'node:fs';
import path from 'node:path';
import { hasPassingEvidence, readFableState } from './core/state.js';
import { logInfo, logSuccess, logError, logWarn } from './utils.js';

export function runFableLint(targetDir: string = process.cwd()): boolean {
  logInfo(`Running Fable lint checks on ${targetDir}...`);
  let hasErrors = false;

  const fableDir = path.join(targetDir, '.fable');
  const ledgerPath = path.join(fableDir, 'LEDGER.md');
  const statePath = path.join(fableDir, 'state.json');
  const specPath = path.join(targetDir, 'docs', 'SPEC.md');

  if (!fs.existsSync(ledgerPath)) {
    logWarn(`No .fable/LEDGER.md found in ${targetDir}`);
  } else {
    const content = fs.readFileSync(ledgerPath, 'utf-8');
    const lines = content.split('\n');
    let openCards = 0;
    let closedCards = 0;

    lines.forEach((line, idx) => {
      const openMatch = line.match(/^\s*-\s*\[\s*\]\s*(.*)/);
      const closedMatch = line.match(/^\s*-\s*\[[xX]\]\s*(.*)/);

      if (openMatch) {
        openCards++;
        const text = openMatch[1];
        if (
          !text.toLowerCase().includes('acceptance') &&
          !text.toLowerCase().includes('test') &&
          !text.toLowerCase().includes('check')
        ) {
          logError(
            `LEDGER.md L${idx + 1}: Open card missing explicit machine-checkable acceptance test`
          );
          hasErrors = true;
        }
      }

      if (closedMatch) {
        closedCards++;
        const evidenceMatch = line.match(/--\s*evidence:\s*(.+)$/i);
        if (!evidenceMatch || evidenceMatch[1].trim().length < 3) {
          logError(`LEDGER.md L${idx + 1}: Closed card missing substantive '-- evidence:' annotation`);
          hasErrors = true;
        }
      }
    });

    logInfo(`LEDGER.md Summary: ${openCards} open cards, ${closedCards} closed cards.`);
  }

  if (fs.existsSync(statePath)) {
    try {
      const state = readFableState(targetDir);
      if (!state) throw new Error('.fable/state.json could not be loaded');
      if (state.phase === 'complete' && state.substantial && !hasPassingEvidence(state)) {
        logError('state.json: substantial work is complete without passing evidence');
        hasErrors = true;
      }
      if (state.failureStreak > 1 && state.phase === 'executing') {
        logError('state.json: repeated failure must route through recovery before more execution');
        hasErrors = true;
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      logError(`state.json: ${reason}`);
      hasErrors = true;
    }
  }

  if (fs.existsSync(specPath)) {
    const specContent = fs.readFileSync(specPath, 'utf-8');
    const tags = ['[measured]', '[inferred]', '[not-shown]'];
    if (!tags.some((tag) => specContent.includes(tag))) {
      logWarn('SPEC.md missing source tags ([measured]/[inferred]/[not-shown]) for claims.');
    }
  }

  if (!hasErrors) logSuccess('Fable lint passed! State, cards, acceptance, and evidence are consistent.');
  return !hasErrors;
}
