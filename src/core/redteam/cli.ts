import { runRedTeamScan } from './engine.js';
import { generateMarkdownReport } from './reporter.js';
import type { RedTeamProfile, ScanOptions } from './types.js';

export function printRedTeamHelp(): void {
  console.log(`get-fable redteam (or pentest) - Native Agentic Ethical Penetration Engine

Usage:
  get-fable redteam --target <url> [options]
  get-fable pentest --target <url> [options]

Options:
  --target <url>     Target HTTP/HTTPS URL to test (Required)
  --profile <name>   Scan profile: passive (default), api-logic, comprehensive
  --scope <path>     Path to custom scope JSON configuration (defaults to .fable/redteam.json)
  --token <token>    Bearer/Auth token for testing authenticated endpoints
  --json             Output machine-readable JSON results
  -h, --help         Show this help message

Examples:
  get-fable redteam --target http://localhost:3000
  get-fable redteam --target https://staging.example.com --profile api-logic --token "Bearer test-jwt"
  get-fable pentest --target http://127.0.0.1:8080 --json
`);
}

export async function handleRedTeamCli(argv: string[]): Promise<number> {
  if (argv.includes('-h') || argv.includes('--help')) {
    printRedTeamHelp();
    return 0;
  }

  let target = '';
  let profile: RedTeamProfile = 'passive';
  let scopeFilePath: string | undefined;
  let authToken: string | undefined;
  let jsonOutput = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--target' && i + 1 < argv.length) {
      target = argv[++i];
    } else if (arg === '--profile' && i + 1 < argv.length) {
      profile = argv[++i] as RedTeamProfile;
    } else if (arg === '--scope' && i + 1 < argv.length) {
      scopeFilePath = argv[++i];
    } else if (arg === '--token' && i + 1 < argv.length) {
      authToken = argv[++i];
    } else if (arg === '--json') {
      jsonOutput = true;
    }
  }

  if (!target) {
    if (jsonOutput) {
      console.log(JSON.stringify({ error: 'Missing required argument: --target <url>' }));
    } else {
      console.error('Error: Missing required argument: --target <url>');
      console.error('Run "get-fable redteam --help" for usage information.');
    }
    return 1;
  }

  const options: ScanOptions = {
    target,
    profile,
    scopeFilePath,
    authToken,
    outputFormat: jsonOutput ? 'json' : 'text',
  };

  try {
    const result = await runRedTeamScan(options, true);

    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(generateMarkdownReport(result));
      console.log('\n✔ RedTeam audit complete. Report saved to docs/security/REDTEAM_REPORT.md');
    }

    return result.summary.critical > 0 ? 2 : 0;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (jsonOutput) {
      console.log(JSON.stringify({ error: message }));
    } else {
      console.error(`\n❌ RedTeam Engine Error: ${message}`);
    }
    return 1;
  }
}
