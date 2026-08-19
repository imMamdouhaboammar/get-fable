import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { runCli } from '../src/cli.ts';
import { getRepoRootDir } from '../src/installer.ts';

describe('Shell system and completions', () => {
  test('shell scripts exist and contain spark integration logic', () => {
    const repoRoot = getRepoRootDir();
    const zsh = fs.readFileSync(path.join(repoRoot, 'shell', 'fable.zsh'), 'utf-8');
    const bash = fs.readFileSync(path.join(repoRoot, 'shell', 'fable.bash'), 'utf-8');
    const fish = fs.readFileSync(path.join(repoRoot, 'shell', 'fable.fish'), 'utf-8');

    expect(zsh).toContain('FABLE_SPARK_HINT');
    expect(zsh).toContain('_fable_chpwd_hook');
    expect(bash).toContain('PROMPT_COMMAND');
    expect(fish).toContain('fish_prompt');
  });

  test('shell completion files exist and define get-fable commands', () => {
    const repoRoot = getRepoRootDir();
    const zshComp = fs.readFileSync(path.join(repoRoot, 'completions', '_get-fable'), 'utf-8');
    const bashComp = fs.readFileSync(path.join(repoRoot, 'completions', 'get-fable.bash'), 'utf-8');
    const fishComp = fs.readFileSync(path.join(repoRoot, 'completions', 'get-fable.fish'), 'utf-8');

    expect(zshComp).toContain('#compdef get-fable');
    expect(bashComp).toContain('complete -F _get_fable_completion');
    expect(fishComp).toContain('complete -c get-fable');
  });

  test('runs shell CLI commands', () => {
    expect(runCli(['shell', 'zsh'])).toBe(0);
    expect(runCli(['shell', 'bash'])).toBe(0);
    expect(runCli(['shell', 'fish'])).toBe(0);
  });

  test('Formula/get-fable.rb is valid Ruby syntax and specifies dependencies', () => {
    const repoRoot = getRepoRootDir();
    const formula = fs.readFileSync(path.join(repoRoot, 'Formula', 'get-fable.rb'), 'utf-8');

    expect(formula).toContain('class GetFable < Formula');
    expect(formula).toContain('depends_on "bun"');
    expect(formula).toContain('depends_on "python@3"');
    expect(formula).toContain('def install');
    expect(formula).toContain('def post_install');
  });
});
