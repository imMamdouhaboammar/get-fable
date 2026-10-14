import type { FableSkillId, SkillResourceEntry } from './types.js';
import { listSkillResources, readSkillResource } from './skill-package.js';

export type ProgressiveResourceKind = 'reference' | 'template' | 'example' | 'policy';

export interface RelevantResourceOptions {
  kinds?: ProgressiveResourceKind[];
  maxResources?: number;
  maxTotalBytes?: number;
}

export interface ReadSelectedResourceOptions {
  maxBytes?: number;
}

const DEFAULT_MAX_RESOURCES = 6;
const DEFAULT_TOTAL_BYTES = 64 * 1024;
const DEFAULT_READ_BYTES = 64 * 1024;
const POLICY_NAME = /(?:policy|rules|constraints)/i;

function matchesKind(resource: SkillResourceEntry, kinds: ProgressiveResourceKind[]): boolean {
  if (kinds.includes('policy') && resource.type === 'reference' && POLICY_NAME.test(resource.path)) return true;
  return kinds.includes(resource.type as ProgressiveResourceKind);
}

export function listRelevantSkillResources(
  id: FableSkillId,
  options: RelevantResourceOptions = {}
): SkillResourceEntry[] {
  const kinds: ProgressiveResourceKind[] = options.kinds?.length ? options.kinds : ['reference', 'template', 'example', 'policy'];
  const maxResources = Math.max(1, Math.min(options.maxResources ?? DEFAULT_MAX_RESOURCES, 32));
  const maxTotalBytes = Math.max(1, Math.min(options.maxTotalBytes ?? DEFAULT_TOTAL_BYTES, 256 * 1024));
  const selected: SkillResourceEntry[] = [];
  let bytes = 0;
  for (const resource of listSkillResources(id)) {
    if (!resource.exists || !matchesKind(resource, kinds)) continue;
    if (selected.length >= maxResources) break;
    if (bytes + resource.byteSize > maxTotalBytes) continue;
    selected.push(resource);
    bytes += resource.byteSize;
  }
  return selected;
}

export function inspectSkillResource(id: FableSkillId, relativePath: string): SkillResourceEntry | null {
  return listSkillResources(id).find((resource) => resource.path === relativePath) ?? null;
}

export function readSelectedSkillResource(
  id: FableSkillId,
  relativePath: string,
  options: ReadSelectedResourceOptions = {}
): string {
  const maxBytes = Math.max(1, Math.min(options.maxBytes ?? DEFAULT_READ_BYTES, 256 * 1024));
  const resource = inspectSkillResource(id, relativePath);
  if (!resource || !resource.exists) throw new Error(`Selected skill resource not found: ${id}/${relativePath}`);
  if (!['reference', 'template', 'example'].includes(resource.type)) {
    throw new Error(`Resource category "${resource.type}" is not available through progressive disclosure`);
  }
  if (resource.byteSize > maxBytes) {
    throw new Error(`Selected skill resource exceeds read budget of ${maxBytes} bytes`);
  }
  return readSkillResource(id, relativePath);
}
