#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const cwd = process.cwd();
const args = process.argv.slice(2);
const command = args[0] || 'help';
const targetArg = firstPositionalAfterCommand();
const target = path.resolve(targetArg || cwd);
const dryRun = args.includes('--dry-run');
const projectIdArg = valueAfter('--project-id');
const textArg = valueAfter('--text');
const outputJson = args.includes('--json');

const vaultRoot = findVaultRoot(cwd);

function valueAfter(flag) {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : undefined;
}

function firstPositionalAfterCommand() {
  const flagsWithValues = new Set(['--project-id', '--text']);
  for (let i = 1; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      if (flagsWithValues.has(arg) && args[i + 1] && !args[i + 1].startsWith('--')) i += 1;
      continue;
    }
    return arg;
  }
  return undefined;
}

function findVaultRoot(start) {
  let dir = start;
  while (true) {
    if (fs.existsSync(path.join(dir, 'VAULT_PROTOCOL.md')) && fs.existsSync(path.join(dir, 'registry.yaml'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

function exists(p) { return fs.existsSync(p); }
function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function safeRead(p) { return exists(p) ? fs.readFileSync(p, 'utf8') : ''; }
function mkdirp(p) { fs.mkdirSync(p, { recursive: true }); }
function writeFile(p, content) { mkdirp(path.dirname(p)); fs.writeFileSync(p, content); }
function sha256(text) { return crypto.createHash('sha256').update(text).digest('hex'); }
function shortHash(text) { return sha256(text).slice(0, 12); }

function git(cmd, dir = target) {
  try { return execSync(`git ${cmd}`, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return ''; }
}

function detectProject(projectPath) {
  const pkgPath = path.join(projectPath, 'package.json');
  const pkg = exists(pkgPath) ? readJson(pkgPath) : null;
  const remote = git('config --get remote.origin.url', projectPath);
  const files = fs.readdirSync(projectPath, { withFileTypes: true }).map(d => d.name);
  const deps = pkg ? Object.keys({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }) : [];
  const languages = [];
  const frameworks = [];

  if (pkg) languages.push('javascript');
  if (exists(path.join(projectPath, 'pyproject.toml')) || exists(path.join(projectPath, 'requirements.txt'))) languages.push('python');
  if (exists(path.join(projectPath, 'go.mod'))) languages.push('go');
  if (exists(path.join(projectPath, 'Cargo.toml'))) languages.push('rust');
  if (files.some(f => f.endsWith('.xcodeproj') || f.endsWith('.xcworkspace'))) languages.push('swift');
  if (deps.includes('electron')) frameworks.push('electron');
  if (deps.includes('next')) frameworks.push('nextjs');
  if (deps.includes('react')) frameworks.push('react');
  if (files.some(f => f.startsWith('docker-compose')) || files.includes('Dockerfile')) frameworks.push('docker');

  const name = projectIdArg || (pkg?.name || path.basename(projectPath)).toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
  return { name, path: projectPath, remote, packageName: pkg?.name || null, files, dependencies: deps, languages, frameworks };
}

function printScan(project) {
  console.log(JSON.stringify(project, null, 2));
}

function loadRegistryText() {
  return safeRead(path.join(vaultRoot, 'registry.yaml'));
}

function parseInlineArray(value) {
  const trimmed = value.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return [];
  return trimmed.slice(1, -1).split(',').map(item => item.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed.startsWith('[')) return parseInlineArray(trimmed);
  return trimmed.replace(/^['"]|['"]$/g, '');
}

function parseRegistry() {
  const assets = [];
  let section = null;
  let current = null;
  let inMatch = false;

  for (const raw of loadRegistryText().split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trimEnd();
    if (!line.trim()) continue;
    const top = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (top && !raw.startsWith(' ')) {
      section = top[1];
      current = null;
      inMatch = false;
      continue;
    }

    const item = line.match(/^\s{2}-\s+id:\s*(.+)$/);
    if (item) {
      current = { id: parseScalar(item[1]), section, match: {} };
      assets.push(current);
      inMatch = false;
      continue;
    }
    if (!current) continue;

    if (/^\s{4}match:\s*$/.test(line)) {
      inMatch = true;
      continue;
    }

    const pair = line.match(/^\s{4}([a-zA-Z_]+):\s*(.+)$/);
    if (pair && !inMatch) {
      current[pair[1]] = parseScalar(pair[2]);
      continue;
    }

    const matchPair = line.match(/^\s{6}([a-zA-Z_]+):\s*(.+)$/);
    if (matchPair && inMatch) current.match[matchPair[1]] = parseScalar(matchPair[2]);
  }
  return assets;
}

function registryPaths() {
  return parseRegistry().map(asset => asset.path).filter(Boolean);
}

function anyOverlap(a = [], b = []) {
  return a.some(item => b.includes(item));
}

function projectHasFile(project, pattern) {
  if (pattern.endsWith('/**')) return exists(path.join(project.path, pattern.slice(0, -3)));
  return exists(path.join(project.path, pattern));
}

function assetReason(asset, project) {
  const match = asset.match || {};
  const reasons = [];
  if (match.always === true) reasons.push('registry match: always');
  if (Array.isArray(match.files) && match.files.some(file => projectHasFile(project, file))) reasons.push('registry match: files');
  if (Array.isArray(match.dependencies) && anyOverlap(match.dependencies, project.dependencies)) reasons.push('registry match: dependencies');
  if (Array.isArray(match.frameworks) && anyOverlap(match.frameworks, project.frameworks)) reasons.push('registry match: frameworks');
  if (Array.isArray(match.languages) && anyOverlap(match.languages, project.languages)) reasons.push('registry match: languages');
  if (Array.isArray(match.packages) && project.packageName && match.packages.includes(project.packageName)) reasons.push('registry match: package');
  if (Array.isArray(match.aliases) && match.aliases.includes(project.name)) reasons.push('registry match: alias');
  if (Array.isArray(match.remotes) && project.remote && match.remotes.includes(project.remote)) reasons.push('registry match: remote');
  if (asset.type === 'project' && exists(path.join(vaultRoot, asset.path || ''))) reasons.push('registry match: project memory exists');
  return reasons.join(', ');
}

function matchAssets(project) {
  const seen = new Set();
  return parseRegistry()
    .filter(asset => asset.path && exists(path.join(vaultRoot, asset.path)))
    .map(asset => ({ ...asset, reason: assetReason(asset, project) }))
    .filter(asset => asset.reason)
    .filter(asset => {
      if (seen.has(asset.id)) return false;
      seen.add(asset.id);
      return true;
    });
}

function assetRecord(asset) {
  const source = path.join(vaultRoot, asset.path);
  const text = safeRead(source);
  return {
    id: asset.id,
    type: asset.type || asset.section,
    title: asset.title || asset.id,
    reason: asset.reason,
    path: asset.path,
    scope: asset.scope || null,
    visibility: asset.visibility || 'unspecified',
    tags: asset.tags || [],
    sha256: sha256(text),
    shortHash: shortHash(text)
  };
}

function claim(project) {
  const matches = matchAssets(project);
  const claimDir = path.join(project.path, '.ai-memory');
  const claudeDir = path.join(project.path, '.claude');
  const skillsDir = path.join(claudeDir, 'skills');
  const assets = matches.map(assetRecord);
  const record = { claimedAt: new Date().toISOString(), project: project.name, sourceVault: vaultRoot, assets };

  if (dryRun) {
    console.log(JSON.stringify(record, null, 2));
    return;
  }

  mkdirp(claimDir);
  mkdirp(skillsDir);
  writeFile(path.join(claimDir, 'claimed-assets.json'), `${JSON.stringify(record, null, 2)}\n`);

  const memoryParts = [
    '# Claimed AI Memory\n',
    `Source vault: ${vaultRoot}\n`,
    `Claimed at: ${record.claimedAt}\n`,
    '## Claimed assets\n',
    ...assets.map(m => `- ${m.id} (${m.type}, ${m.scope || 'scope?'}, ${m.visibility}, ${m.shortHash}): ${m.reason} — ${m.path}\n`),
    '\n## How to use\n',
    '- Treat `.ai-memory/claimed-assets.json` as the authoritative claim manifest.\n',
    '- Read referenced vault files on demand instead of duplicating large memory blocks.\n'
  ];

  for (const m of assets) {
    const source = path.join(vaultRoot, m.path);
    if (m.path.endsWith('SKILL.md') && exists(source)) {
      writeFile(path.join(skillsDir, m.id, 'SKILL.md'), safeRead(source));
    }
  }

  const memoryPath = path.join(claudeDir, 'MEMORY.md');
  const existing = safeRead(memoryPath);
  const block = `<!-- AI_MEMORY_VAULT_CLAIM -->\n${memoryParts.join('')}<!-- /AI_MEMORY_VAULT_CLAIM -->`;
  const next = existing.includes('<!-- AI_MEMORY_VAULT_CLAIM -->')
    ? existing.replace(/<!-- AI_MEMORY_VAULT_CLAIM -->[\s\S]*<!-- \/AI_MEMORY_VAULT_CLAIM -->/m, block)
    : `${existing ? `${existing.trim()}\n\n` : ''}${block}\n`;
  writeFile(memoryPath, next);
  console.log(`Claimed ${assets.length} assets into ${project.path}`);
}

function exportDraft(project) {
  const projectDir = path.join(vaultRoot, 'projects', project.name);
  if (dryRun) { printScan(project); return; }
  mkdirp(projectDir);
  const projectMd = `# ${project.name}\n\n## Identity\n\n- Project ID: ${project.name}\n- Git remote: ${project.remote || 'unknown'}\n- Package/app name: ${project.packageName || 'unknown'}\n\n## Detected stack\n\n- Languages: ${project.languages.join(', ') || 'unknown'}\n- Frameworks: ${project.frameworks.join(', ') || 'unknown'}\n\n## Notes\n\nThis is an AI-generated draft. Refine according to VAULT_PROTOCOL.md before relying on it.\n`;
  writeFile(path.join(projectDir, 'PROJECT.md'), projectMd);
  for (const name of ['memory.md', 'decisions.md', 'mistakes.md', 'commands.md', 'files.md', 'skills.yaml', 'install.yaml']) {
    const template = safeRead(path.join(vaultRoot, 'templates', 'project', name));
    if (!exists(path.join(projectDir, name))) writeFile(path.join(projectDir, name), template || `# ${name}\n`);
  }
  ensureProjectRegistryEntry(project);
  console.log(`Created/updated draft project memory at ${path.relative(vaultRoot, projectDir)}`);
}

function ensureProjectRegistryEntry(project) {
  const registryPath = path.join(vaultRoot, 'registry.yaml');
  const registry = loadRegistryText();
  if (new RegExp(`id:\\s*project:${escapeRegExp(project.name)}\\b`).test(registry)) return;

  const tags = [...new Set([...project.languages, ...project.frameworks, 'project'])];
  const entry = [
    `  - id: project:${project.name}`,
    '    type: project',
    `    title: ${project.name}`,
    `    path: projects/${project.name}`,
    '    scope: project',
    '    visibility: private',
    `    tags: [${tags.join(', ')}]`,
    '    match:',
    `      aliases: [${project.name}]`,
    project.remote ? `      remotes: [${project.remote}]` : null,
    project.packageName ? `      packages: [${project.packageName}]` : null
  ].filter(Boolean).join('\n');

  const next = registry.replace(/projects:\s*\[\]\s*$/m, `projects:\n${entry}\n`);
  writeFile(registryPath, next === registry ? `${registry.trimEnd()}\n${entry}\n` : next);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


function renderContext(project) {
  const assets = matchAssets(project).map(assetRecord);
  const projectMemoryDir = path.join(vaultRoot, 'projects', project.name);
  const lines = [
    '# AI Memory Vault Context',
    '',
    `Project: ${project.name}`,
    `Path: ${project.path}`,
    `Remote: ${project.remote || 'unknown'}`,
    `Package: ${project.packageName || 'unknown'}`,
    `Languages: ${project.languages.join(', ') || 'unknown'}`,
    `Frameworks: ${project.frameworks.join(', ') || 'unknown'}`,
    '',
    '## Relevant assets',
    ...assets.map(asset => `- ${asset.id} (${asset.type}, ${asset.scope || 'scope?'}, ${asset.visibility}, ${asset.shortHash}) — ${asset.path}`),
    '',
    '## Usage instructions',
    '- Read only the referenced assets you need for the current task.',
    '- Treat this output as a compact startup context, not as the full memory corpus.',
    '- Do not copy secrets into the vault; stage uncertain material as a proposal first.'
  ];
  if (exists(projectMemoryDir)) {
    lines.push('', '## Project memory files', ...fs.readdirSync(projectMemoryDir).sort().map(file => `- projects/${project.name}/${file}`));
  }
  console.log(lines.join('\n'));
}

function summarizeProposal(project) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const proposalDir = path.join(vaultRoot, 'inbox', 'proposals');
  const proposalPath = path.join(proposalDir, `${timestamp}-${project.name}.md`);
  const sessionDir = path.join(vaultRoot, 'inbox', 'session-summaries');
  const sessionPath = path.join(sessionDir, `${timestamp}-${project.name}.md`);
  const agentFiles = ['CLAUDE.md', 'AGENTS.md', '.claude', '.cursor', '.codex'].filter(name => exists(path.join(project.path, name)));
  const importantFiles = project.files.filter(file => /^(README|package.json|pyproject.toml|go.mod|Cargo.toml|Dockerfile|docker-compose)/i.test(file));
  const body = [
    `# Summarize Proposal: ${project.name}`,
    '',
    'Status: proposed',
    'Visibility: private',
    `Created: ${new Date().toISOString()}`,
    '',
    '## Detected identity',
    `- Project ID: ${project.name}`,
    `- Path: ${project.path}`,
    `- Git remote: ${project.remote || 'unknown'}`,
    `- Package/app name: ${project.packageName || 'unknown'}`,
    `- Languages: ${project.languages.join(', ') || 'unknown'}`,
    `- Frameworks: ${project.frameworks.join(', ') || 'unknown'}`,
    '',
    '## Candidate source files',
    ...(importantFiles.length ? importantFiles.map(file => `- ${file}`) : ['- none detected']),
    '',
    '## Agent memory/config files detected',
    ...(agentFiles.length ? agentFiles.map(file => `- ${file}`) : ['- none detected']),
    '',
    '## AI extraction checklist',
    '- [ ] Project facts and purpose',
    '- [ ] Architecture decisions and reasons',
    '- [ ] Verified setup/run/test/deploy commands',
    '- [ ] Known mistakes, root causes, and fixes',
    '- [ ] Reusable patterns or skills worth promoting',
    '- [ ] Sensitive/private content reviewed and redacted',
    '',
    '## Proposed durable memory',
    '',
    textArg || '_AI should fill this from inspected project evidence before promotion._',
    '',
    '## Promotion target',
    `- projects/${project.name}/`,
    '- registry.yaml project entry with `visibility: private` by default'
  ].join('\n');

  if (dryRun) {
    console.log(body);
    return;
  }
  writeFile(proposalPath, `${body}\n`);
  writeFile(sessionPath, `# Session Summary: ${project.name}\n\nCreated: ${new Date().toISOString()}\n\nStaged proposal: ${path.relative(vaultRoot, proposalPath)}\n\n${textArg || '_No session summary text provided._'}\n`);
  console.log(`Created summarize proposal at ${path.relative(vaultRoot, proposalPath)}`);
  console.log(`Created session summary at ${path.relative(vaultRoot, sessionPath)}`);
}


function allAssetRecords() {
  return parseRegistry()
    .filter(asset => asset.path && exists(path.join(vaultRoot, asset.path)))
    .map(asset => assetRecord({ ...asset, reason: asset.reason || 'registry asset' }));
}

function findAssetById(id) {
  return parseRegistry().find(asset => asset.id === id);
}

function listAssets() {
  const assets = allAssetRecords();
  if (outputJson) {
    console.log(JSON.stringify(assets, null, 2));
    return;
  }
  console.log('# AI Memory Vault Assets\n');
  for (const asset of assets) {
    console.log(`- ${asset.id} (${asset.type}, ${asset.scope || 'scope?'}, ${asset.visibility}, ${asset.shortHash}) — ${asset.path}`);
  }
}

function printAsset(id) {
  const asset = findAssetById(id);
  if (!asset) {
    console.error(`Asset not found: ${id}`);
    process.exit(1);
  }
  const source = path.join(vaultRoot, asset.path || '');
  if (!asset.path || !exists(source)) {
    console.error(`Asset path missing for ${id}: ${asset.path || '(none)'}`);
    process.exit(1);
  }
  const record = assetRecord({ ...asset, reason: 'direct read' });
  if (outputJson) {
    console.log(JSON.stringify({ ...record, content: safeRead(source) }, null, 2));
    return;
  }
  console.log(`# Asset: ${record.id}`);
  console.log(`Type: ${record.type}`);
  console.log(`Scope: ${record.scope || 'scope?'}`);
  console.log(`Visibility: ${record.visibility}`);
  console.log(`Path: ${record.path}`);
  console.log(`SHA256: ${record.sha256}`);
  console.log('\n---\n');
  console.log(safeRead(source));
}

function readClaimManifest(project) {
  const manifestPath = path.join(project.path, '.ai-memory', 'claimed-assets.json');
  if (!exists(manifestPath)) return null;
  return readJson(manifestPath);
}

function currentAssetRecordById(id) {
  const asset = findAssetById(id);
  if (!asset || !asset.path || !exists(path.join(vaultRoot, asset.path))) return null;
  return assetRecord({ ...asset, reason: 'status check' });
}

function statusReport(project) {
  const manifest = readClaimManifest(project);
  const rows = [];
  if (manifest) {
    for (const claimed of manifest.assets || []) {
      const current = currentAssetRecordById(claimed.id);
      if (!current) {
        rows.push({ id: claimed.id, status: 'missing', claimed: claimed.shortHash || null, current: null, path: claimed.path });
        continue;
      }
      const changedHash = claimed.sha256 !== current.sha256;
      const changedVisibility = claimed.visibility && claimed.visibility !== current.visibility;
      const status = changedVisibility ? 'visibility-changed' : changedHash ? 'stale' : 'fresh';
      rows.push({ id: claimed.id, status, claimed: claimed.shortHash || null, current: current.shortHash, path: current.path, visibility: current.visibility });
    }
  }
  const recommended = matchAssets(project).map(assetRecord).filter(asset => !(manifest?.assets || []).some(claimed => claimed.id === asset.id));
  return { project: project.name, path: project.path, manifestFound: Boolean(manifest), claimedAt: manifest?.claimedAt || null, assets: rows, recommendedNew: recommended };
}

function printStatus(project) {
  const report = statusReport(project);
  if (outputJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log(`# AI Memory Vault Status: ${report.project}`);
  console.log(`Manifest: ${report.manifestFound ? 'found' : 'missing'}`);
  if (report.claimedAt) console.log(`Claimed at: ${report.claimedAt}`);
  console.log('\n## Claimed assets');
  if (!report.assets.length) console.log('- none');
  for (const row of report.assets) console.log(`- ${row.id}: ${row.status} (claimed=${row.claimed || '-'}, current=${row.current || '-'}) — ${row.path || '-'}`);
  console.log('\n## Recommended new assets');
  if (!report.recommendedNew.length) console.log('- none');
  for (const asset of report.recommendedNew) console.log(`- ${asset.id} (${asset.shortHash}) — ${asset.path}`);
}

function impactReport(id) {
  const asset = findAssetById(id);
  if (!asset) {
    console.error(`Asset not found: ${id}`);
    process.exit(1);
  }
  const needle = [id, asset.path].filter(Boolean);
  const references = [];
  for (const other of parseRegistry()) {
    if (other.id === id) continue;
    const haystack = JSON.stringify(other);
    if (needle.some(value => haystack.includes(value))) references.push({ id: other.id, type: other.type || other.section, via: 'registry' });
  }
  const fileRefs = [];
  walk(vaultRoot, file => {
    if (file.includes('/.git/')) return;
    const rel = path.relative(vaultRoot, file).split(path.sep).join('/');
    if (rel === asset.path || rel === 'package-lock.json') return;
    const text = safeRead(file);
    if (needle.some(value => value && text.includes(value))) fileRefs.push(rel);
  });
  return { asset: assetRecord({ ...asset, reason: 'impact target' }), registryReferences: references, fileReferences: [...new Set(fileRefs)].sort() };
}

function printImpact(id) {
  const report = impactReport(id);
  if (outputJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log(`# Impact: ${report.asset.id}`);
  console.log(`Path: ${report.asset.path}`);
  console.log(`Visibility: ${report.asset.visibility}`);
  console.log('\n## Registry references');
  if (!report.registryReferences.length) console.log('- none');
  for (const ref of report.registryReferences) console.log(`- ${ref.id} (${ref.type}) via ${ref.via}`);
  console.log('\n## File references');
  if (!report.fileReferences.length) console.log('- none');
  for (const ref of report.fileReferences) console.log(`- ${ref}`);
}

function renderMap() {
  const assets = parseRegistry().filter(asset => asset.path);
  const lines = ['```mermaid', 'graph TD'];
  const sectionIds = new Set();
  for (const asset of assets) {
    const section = asset.section || 'assets';
    if (!sectionIds.has(section)) {
      lines.push(`  ${section}["${section}"]`);
      sectionIds.add(section);
    }
    const node = asset.id.replace(/[^A-Za-z0-9_]/g, '_');
    lines.push(`  ${node}["${asset.id}<br/>${asset.scope || 'scope?'} / ${asset.visibility || 'visibility?'}"]`);
    lines.push(`  ${section} --> ${node}`);
    const match = asset.match || {};
    for (const dep of [...(match.dependencies || []), ...(match.frameworks || []), ...(match.languages || [])]) {
      const depNode = `match_${String(dep).replace(/[^A-Za-z0-9_]/g, '_')}`;
      lines.push(`  ${depNode}["${dep}"] --> ${node}`);
    }
  }
  lines.push('```');
  console.log(lines.join('\n'));
}

function syncProject(project) {
  if (dryRun) {
    console.log(`# Sync dry-run: ${project.name}`);
    console.log('- Would run: git pull --ff-only in vault root');
    console.log('- Would run: npm run validate');
    console.log('- Would run: ai-vault claim <project>');
    console.log('- Would run: ai-vault status <project>');
    return;
  }
  const before = git('rev-parse HEAD', vaultRoot);
  const pull = git('pull --ff-only', vaultRoot);
  if (pull) console.log(pull);
  const after = git('rev-parse HEAD', vaultRoot);
  console.log(`Vault revision: ${before || 'unknown'} -> ${after || 'unknown'}`);
  validate();
  claim(project);
  printStatus(project);
}

function validate() {
  const required = ['README.md', 'VAULT_PROTOCOL.md', 'registry.yaml', 'skills/vault-maintainer/SKILL.md'];
  const missing = required.filter(p => !exists(path.join(vaultRoot, p)));
  const failures = [];
  const suspicious = [];
  const pkgPath = path.join(vaultRoot, 'package.json');
  const pkg = exists(pkgPath) ? readJson(pkgPath) : {};
  const requiredScripts = ['scan', 'claim', 'export', 'summarize', 'context', 'status', 'sync', 'list-assets', 'asset', 'impact', 'map', 'validate'];
  for (const script of requiredScripts) {
    if (!pkg.scripts?.[script]?.includes(`ai-vault.js ${script}`)) failures.push(`package.json missing usable "${script}" script`);
  }
  if (pkg.bin?.['ai-vault'] !== './scripts/ai-vault.js') failures.push('package.json bin.ai-vault must point to ./scripts/ai-vault.js');

  for (const registryPath of registryPaths()) {
    if (!exists(path.join(vaultRoot, registryPath))) failures.push(`registry path does not exist: ${registryPath}`);
  }
  const validScopes = new Set(['global', 'project', 'team', 'user', 'both']);
  const validVisibility = new Set(['public', 'private', 'internal', 'secret-ref']);
  for (const asset of parseRegistry()) {
    if (asset.scope && !validScopes.has(asset.scope)) failures.push(`invalid scope for ${asset.id}: ${asset.scope}`);
    if (!asset.visibility) failures.push(`missing visibility for ${asset.id}`);
    else if (!validVisibility.has(asset.visibility)) failures.push(`invalid visibility for ${asset.id}: ${asset.visibility}`);
  }
  for (const skill of ['skills/vault-maintainer', 'skills/claude-code-memory']) {
    if (!exists(path.join(vaultRoot, skill, 'SKILL.md'))) failures.push(`missing ${skill}/SKILL.md`);
    if (!exists(path.join(vaultRoot, skill, 'meta.yaml'))) failures.push(`missing ${skill}/meta.yaml`);
  }
  const workflow = safeRead(path.join(vaultRoot, '.github/workflows/validate.yml'));
  if (!workflow.includes('npm run validate')) failures.push('.github/workflows/validate.yml must run npm run validate');

  const patterns = [
    /BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY/,
    /\bghp_[A-Za-z0-9_]{20,}\b/,
    /\bsk-[A-Za-z0-9_-]{20,}\b/,
    /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
    /[?&](access[_-]?token|api[_-]?key|token|secret)=[A-Za-z0-9._~+\/-]{12,}/i,
    /\b[A-Za-z0-9+/]{48,}={0,2}\b/,
    /(api[_-]?key|token|password|secret)\s*[:=]\s*['\"]?[A-Za-z0-9_\-]{16,}/i
  ];
  walk(vaultRoot, file => {
    if (file.includes('/.git/')) return;
    const rel = path.relative(vaultRoot, file);
    if (rel === 'package-lock.json') return;
    const text = safeRead(file);
    for (const p of patterns) if (p.test(text)) suspicious.push(rel);
  });

  if (missing.length || failures.length || suspicious.length) {
    if (missing.length) console.error(`Missing required files: ${missing.join(', ')}`);
    if (failures.length) console.error(`Validation failures:\n- ${failures.join('\n- ')}`);
    if (suspicious.length) console.error(`Potential secrets found in: ${[...new Set(suspicious)].join(', ')}`);
    process.exit(1);
  }
  console.log('Vault validation passed.');
}

function walk(dir, cb) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, cb);
    else cb(p);
  }
}

function help() {
  console.log(`AI Memory Vault CLI\n\nUsage:\n  ai-vault scan [project]\n  ai-vault claim [project] [--dry-run]\n  ai-vault export [project] [--project-id id] [--dry-run]\n  ai-vault summarize [project] [--project-id id] [--text text] [--dry-run]\n  ai-vault context [project] [--project-id id]\n  ai-vault status [project] [--json]\n  ai-vault sync [project] [--dry-run]\n  ai-vault list-assets [--json]\n  ai-vault asset <id> [--json]\n  ai-vault impact <id> [--json]\n  ai-vault map\n  ai-vault validate\n`);
}

if (command === 'scan') printScan(detectProject(target));
else if (command === 'claim') claim(detectProject(target));
else if (command === 'export') exportDraft(detectProject(target));
else if (command === 'summarize') summarizeProposal(detectProject(target));
else if (command === 'context') renderContext(detectProject(target));
else if (command === 'status') printStatus(detectProject(target));
else if (command === 'sync') syncProject(detectProject(target));
else if (command === 'list-assets') listAssets();
else if (command === 'asset') printAsset(targetArg);
else if (command === 'impact') printImpact(targetArg);
else if (command === 'map') renderMap();
else if (command === 'validate') validate();
else help();
