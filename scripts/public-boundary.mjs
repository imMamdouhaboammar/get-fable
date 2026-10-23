#!/usr/bin/env node
// Public edition boundary. No private skill names are embedded in this policy.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../', import.meta.url);
const path = (relative) => new URL(relative, root);
const read = (relative) => JSON.parse(readFileSync(path(relative), 'utf8'));
const write = process.argv.includes('--write');
const problems = [];

function emit(relative, data) {
  const output = `${JSON.stringify(data, null, 2)}\n`;
  if (write) writeFileSync(path(relative), output);
  else if (readFileSync(path(relative), 'utf8') !== output) problems.push(`${relative} is not public-only`);
}

const source = read('skills/get-fable/registry.json');
const all = source.skills;
const allowed = all.filter((skill) =>
  skill.audience === 'consumer' && /^[a-z][a-z0-9-]+$/.test(skill.id) &&
  existsSync(path(`skills/${skill.id}/SKILL.md`))
);
const permitted = new Set(allowed.map((skill) => skill.id));
const excluded = all.filter((skill) => !permitted.has(skill.id)).map((skill) => skill.id);

// A partial export may have consumer metadata but lack actual skill files.
for (const skill of all) {
  if (skill.audience === 'consumer' && !existsSync(path(`skills/${skill.id}/SKILL.md`))) {
    problems.push(`Consumer skill is missing an entrypoint: ${skill.id}`);
  }
}

const pruned = allowed.map((skill) => ({
  ...skill,
  next: Array.isArray(skill.next) ? skill.next.filter((id) => permitted.has(id)) : skill.next,
  fallback: skill.fallback && !permitted.has(skill.fallback) ? null : skill.fallback,
}));

for (const file of ['skills/get-fable/registry.json', 'registry/skills.json']) {
  emit(file, { ...source, skills: pruned });
}

const skillsPackage = read('skills.sh.json');
emit('skills.sh.json', {
  ...skillsPackage,
  skills: skillsPackage.skills.filter((skill) => permitted.has(skill.id)),
});

const lock = read('skills-lock.json');
emit('skills-lock.json', {
  ...lock,
  skills: Object.fromEntries(Object.entries(lock.skills).filter(([id]) => permitted.has(id))),
});

for (const file of readdirSync(path('packs')).filter((name) => name.endsWith('.json'))) {
  const relative = `packs/${file}`;
  const pack = read(relative);
  const skills = pack.skills.filter((id) => permitted.has(id));
  emit(relative, {
    ...pack,
    description: typeof pack.description === 'string'
      ? pack.description.replace(/\b(?:46|44|42) skills\b/g, `${permitted.size} skills`)
      : pack.description,
    skills,
  });
}

const graph = read('registry/neural-graph.json');
const nodes = graph.nodes.filter((node) => permitted.has(node.id));
const linksKey = Array.isArray(graph.edges) ? 'edges' : 'links';
const links = (graph[linksKey] ?? []).filter((edge) =>
  permitted.has(edge.source) && permitted.has(edge.target)
);
emit('registry/neural-graph.json', { ...graph, nodes, [linksKey]: links });

// Nested registries can refer to the skill IDs in capability arrays.
function filterCatalog(value) {
  if (Array.isArray(value)) {
    return value.filter((item) =>
      !(typeof item === 'string' && excluded.includes(item)) &&
      !(item && typeof item === 'object' && excluded.includes(item.id))
    ).map(filterCatalog);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) =>
      [key, filterCatalog(item)]
    ));
  }
  return value;
}
emit('registry/agents.json', filterCatalog(read('registry/agents.json')));
const recipeRegistry = filterCatalog(read('registry/recipes.json'));
const publicRecipeIds = new Set([
  'bug-fix', 'build-feature', 'research-first', 'review-pr',
  'security-review', 'release', 'cowork-session', 'dataviz-dashboard',
  'ui-ux-polish-round', 'redteam-heal-attestation',
  'greenfield-architecture-council', 'disciplined-surgical-implementation',
]);
emit('registry/recipes.json', {
  ...recipeRegistry,
  recipes: recipeRegistry.recipes.filter((recipe) =>
    publicRecipeIds.has(recipe.id) && existsSync(path(recipe.path))
  ),
});
// CI checks the checked-out public export, without untracked local work.
if (process.env.CI) {
  for (const name of readdirSync(path('recipes')).filter((entry) => entry.endsWith('.yaml'))) {
    if (!publicRecipeIds.has(name.slice(0, -5))) problems.push(`Unapproved recipe: ${name}`);
  }
}

const site = read('site/skills.json');
const publicSkills = site.skills.filter((skill) => permitted.has(skill.id));
emit('site/skills.json', {
  ...site,
  title: `get-fable ${permitted.size} Public Community Skills Catalog`,
  totalSkills: permitted.size,
  packs: site.packs.map((pack) => ({
    ...pack,
    skills: pack.skills.filter((id) => permitted.has(id)),
  })),
  skills: publicSkills,
});

for (const base of ['site/skills', 'public/skills']) {
  for (const file of readdirSync(path(base))) {
    const match = file.match(/^([a-z][a-z0-9-]+)\.(?:html|md|txt|json)$/);
    if (match && !permitted.has(match[1])) {
      problems.push(`Unregistered Skill page remains: ${base}/${file}`);
    }
  }
}

for (const file of ['site/sitemap.xml', 'public/sitemap.xml', 'site/skills.html', 'public/skills.html']) {
  const sourceText = readFileSync(path(file), 'utf8');
  for (const match of sourceText.matchAll(/\/skills\/([a-z][a-z0-9-]+)\.(?:html|md|txt|json)/g)) {
    if (!permitted.has(match[1])) problems.push(`Unregistered Skill link remains in ${file}`);
  }
}

for (const entry of readdirSync(path('skills'), { withFileTypes: true })) {
  if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
  if (existsSync(path(`skills/${entry.name}/SKILL.md`)) && !permitted.has(entry.name)) {
    problems.push(`Non-public Skill entrypoint remains: skills/${entry.name}`);
  }
}

const sitePublicIds = new Set(read('site/skills.json').skills.map((skill) => skill.id));
if (sitePublicIds.size !== permitted.size || [...permitted].some((id) => !sitePublicIds.has(id))) {
  problems.push('Site catalog does not match consumer Skill registry');
}

// Public export must not ship engine sources, private operations, or secrets.
for (const forbidden of [
  'src', 'bin', 'crates', 'target', 'dist', 'commercial', 'docs/internal',
  'evals/holdout', '_backups', '_quarantine', '.env', '.env.vault',
]) {
  if (existsSync(path(forbidden))) problems.push(`Forbidden public path: ${forbidden}`);
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Public catalog consistent: ${permitted.size} consumer Skills across 8 packs.`);
}
