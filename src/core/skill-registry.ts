import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FABLE_REGISTRY_SCHEMA_VERSION,
  type FableSkillId,
  type SkillRegistry,
  type SkillRegistryEntry,
} from './types.js';

const CANONICAL_SKILLS: FableSkillId[] = [
  'get-fable',
  'fable-discover',
  'fable-plan',
  'fable-execute',
  'fable-verify',
  'fable-recover',
];

export function getCoreRepoRoot(): string {
  const currentFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFile), '..', '..');
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseEntry(value: unknown, index: number): SkillRegistryEntry {
  const entry = asRecord(value);
  if (!entry) throw new Error(`skills[${index}] must be an object`);

  const id = entry.id;
  if (typeof id !== 'string' || !CANONICAL_SKILLS.includes(id as FableSkillId)) {
    throw new Error(`skills[${index}].id is not a canonical Fable skill`);
  }
  if (!Number.isInteger(entry.order)) throw new Error(`skills[${index}].order must be an integer`);
  if (typeof entry.phase !== 'string') throw new Error(`skills[${index}].phase must be a string`);
  if (typeof entry.description !== 'string' || !entry.description.trim()) {
    throw new Error(`skills[${index}].description must be non-empty`);
  }
  if (!Array.isArray(entry.next) || !entry.next.every((item) => typeof item === 'string')) {
    throw new Error(`skills[${index}].next must be an array of skill ids`);
  }
  if (!Array.isArray(entry.keywords) || !entry.keywords.every((item) => typeof item === 'string')) {
    throw new Error(`skills[${index}].keywords must be an array of strings`);
  }

  return entry as unknown as SkillRegistryEntry;
}

export function loadSkillRegistry(repoRoot: string = getCoreRepoRoot()): SkillRegistry {
  const registryPath = path.join(repoRoot, 'skills', 'registry.json');
  const raw = JSON.parse(fs.readFileSync(registryPath, 'utf-8')) as unknown;
  const payload = asRecord(raw);
  if (!payload) throw new Error('skills/registry.json must contain an object');
  if (payload.schemaVersion !== FABLE_REGISTRY_SCHEMA_VERSION) {
    throw new Error(`Unsupported skill registry schema: ${String(payload.schemaVersion)}`);
  }
  if (typeof payload.entry !== 'string') throw new Error('Skill registry entry must be a skill id');
  if (!Array.isArray(payload.skills)) throw new Error('Skill registry skills must be an array');

  const skills = payload.skills.map(parseEntry);
  const ids = skills.map((skill) => skill.id);
  if (new Set(ids).size !== ids.length) throw new Error('Skill registry contains duplicate ids');

  for (const required of CANONICAL_SKILLS) {
    if (!ids.includes(required)) throw new Error(`Skill registry is missing ${required}`);
    const skillPath = path.join(repoRoot, 'skills', required, 'SKILL.md');
    if (!fs.existsSync(skillPath)) throw new Error(`Canonical skill file is missing: ${required}`);
  }

  for (const skill of skills) {
    for (const next of skill.next) {
      if (!ids.includes(next)) throw new Error(`${skill.id} references missing next skill ${next}`);
    }
  }

  if (!ids.includes(payload.entry as FableSkillId)) throw new Error('Skill registry entry does not exist');

  const sorted = [...skills].sort((a, b) => a.order - b.order);
  return {
    schemaVersion: 1,
    entry: payload.entry as FableSkillId,
    skills: sorted,
  };
}

export function getSkillEntry(
  id: FableSkillId,
  registry: SkillRegistry = loadSkillRegistry()
): SkillRegistryEntry {
  const skill = registry.skills.find((entry) => entry.id === id);
  if (!skill) throw new Error(`Unknown Fable skill: ${id}`);
  return skill;
}

export function readSkillBody(id: FableSkillId, repoRoot: string = getCoreRepoRoot()): string {
  const skillPath = path.join(repoRoot, 'skills', id, 'SKILL.md');
  const content = fs.readFileSync(skillPath, 'utf-8').trim();
  if (!content.startsWith('---\n')) return content;
  const end = content.indexOf('\n---', 4);
  return end >= 0 ? content.slice(end + 4).trim() : content;
}

export const canonicalSkillIds = (): FableSkillId[] => [...CANONICAL_SKILLS];
