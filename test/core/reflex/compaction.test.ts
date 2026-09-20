import { describe, expect, test } from 'bun:test';
import {
  compact,
  reductionRatio,
  type JevAsker,
  type JevQuestions,
  type JevResponse,
  type JevState,
  type Message,
} from '../../../src/core/reflex/compaction/index.js';

describe('Jev Context Compaction Subsystem', () => {
  test('compacts message history and drops stale tool results using mock Jev asker', async () => {
    const transcript: Message[] = [
      {
        role: 'user',
        text: 'Fix the failing test in src/auth.ts and verify',
        toolUses: [],
      },
      {
        role: 'assistant',
        text: 'Reading the file first',
        toolUses: [
          {
            tool_use_id: 'tool_read_1',
            tool: 'read_file',
            input: { path: 'src/auth.ts' },
          },
        ],
      },
      {
        role: 'user',
        text: '',
        toolUses: [],
        toolResults: [
          {
            tool_use_id: 'tool_read_1',
            text: 'export function authenticate() { return false; } // very large content'.repeat(20),
          },
        ],
      },
      {
        role: 'assistant',
        text: 'Editing the file',
        toolUses: [
          {
            tool_use_id: 'tool_edit_1',
            tool: 'replace_file_content',
            input: { path: 'src/auth.ts' },
          },
        ],
      },
      {
        role: 'user',
        text: '',
        toolUses: [],
        toolResults: [
          {
            tool_use_id: 'tool_edit_1',
            text: 'Successfully replaced content',
          },
        ],
      },
      {
        role: 'assistant',
        text: 'Verification complete, all tests pass',
        toolUses: [],
      },
    ];

    // Mock JevAsker: says call_tool_read_1 should stay (keepCall=0.8), but result is obsolete (keepResult=0.1)
    const mockAsker: JevAsker = {
      async ask(_state: JevState, questions: JevQuestions): Promise<JevResponse> {
        const answers: JevResponse['answers'] = {};
        for (const key of Object.keys(questions)) {
          if (key.startsWith('call_')) {
            answers[key] = { noul: 0.85 };
          } else if (key.startsWith('result_')) {
            answers[key] = { noul: 0.1 }; // drop result
          }
        }
        return {
          model: 'jev-1.13.0',
          answers,
        };
      },
    };

    const result = await compact(transcript, mockAsker, {
      preserveRecentMessages: 2,
      truncateHeadChars: 50,
      keepThreshold: 0.5,
    });

    expect(result.messages.length).toBeGreaterThan(0);
    expect(result.stats.calls).toBeGreaterThan(0);
    expect(result.stats.resultsDropped).toBeGreaterThan(0);
    expect(result.stats.charsAfter).toBeLessThan(result.stats.charsBefore);

    const ratio = reductionRatio(result);
    expect(ratio).toBeGreaterThan(0);
  });
});
