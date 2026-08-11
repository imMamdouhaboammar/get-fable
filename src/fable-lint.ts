import fs from 'node:fs';
import path from 'node:path';
import { logInfo, logSuccess, logError, logWarn } from './utils.js';

export function runFableLint(targetDir: string = process.cwd()): boolean {
  logInfo(`Running Fable lint checks on ${targetDir}...`);
  let hasErrors = false;

  const fableDir = path.join(targetDir, '.fable');
  const ledgerPath = path.join(fableDir, 'LEDGER.md');
  const specPath = path.join(targetDir, 'docs', 'SPEC.md');

  if (!fs.existsSync(ledgerPath)) {
    logWarn(`No .fable/LEDGER.md found in ${targetDir}`);
  } else {
    const content = fs.readFileSync(ledgerPath, 'utf-8');
    const lines = content.split('\n');

    let openCards = 0;
    let closedCards = 0;
    let cardsMissingAcceptance = 0;
    let closedMissingEvidence = 0;

    let currentCard: { line: number; text: string; isClosed: boolean; hasEvidence: boolean } | null = null;

    lines.forEach((line, idx) => {
      const openMatch = line.match(/^\s*-\s*\[\s*\]\s*(.*)/);
      const closedMatch = line.match(/^\s*-\s*\[[xX]\]\s*(.*)/);

      if (openMatch || closedMatch) {
        if (openMatch) {
          openCards++;
          const text = openMatch[1];
          if (!text.toLowerCase().includes('acceptance') && !text.includes('test') && !text.includes('check')) {
            cardsMissingAcceptance++;
            logError(`LEDGER.md L${idx + 1}: Open card missing explicit machine-checkable acceptance test`);
            hasErrors = true;
          }
        } else if (closedMatch) {
          closedCards++;
          currentCard = {
            line: idx + 1,
            text: closedMatch[1],
            isClosed: true,
            hasEvidence: line.includes('-- evidence:'),
          };
          if (!currentCard.hasEvidence) {
            closedMissingEvidence++;
            logError(`LEDGER.md L${idx + 1}: Closed card missing '-- evidence:' annotation`);
            hasErrors = true;
          }
        }
      }
    });

    logInfo(`LEDGER.md Summary: ${openCards} open cards, ${closedCards} closed cards.`);
  }

  if (fs.existsSync(specPath)) {
    const specContent = fs.readFileSync(specPath, 'utf-8');
    const tags = ['[measured]', '[inferred]', '[not-shown]'];
    const hasTags = tags.some((t) => specContent.includes(t));
    if (!hasTags) {
      logWarn(`SPEC.md missing source tags ([measured]/[inferred]/[not-shown]) for claims.`);
    }
  }

  if (!hasErrors) {
    logSuccess('Fable lint passed! All cards and acceptance criteria met.');
  }

  return !hasErrors;
}
