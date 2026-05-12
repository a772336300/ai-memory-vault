#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const cwd = process.cwd();
const args = process.argv.slice(2);
const command = args[0] || 'help';
const targetArg = args.find((a, i) => i > 0 && !a.startsWith('--'));
const target = path.resolve(targetArg || cwd);
const dryRun = args.includes('--dry-run');
const projectIdArg = valueAfter('--project-id');

const vaultRoot = findVaultRoot(cwd);

function valueAfter(flag) {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : undefined;
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

function matchAssets(project) {
  const registry = loadRegistryText();
  const matches = [];
  const add = (id, reason, sourcePath) => matches.push({ id, reason, path: sourcePath });

  add('global-instructions', 'global default', 'global/instructions.md');
  add('coding-style', 'global default', 'global/coding-style.md');
  add('vault-maintainer', 'vault operations', 'skills/vault-maintainer/SKILL.md');

  if (exists(path.join(project.path, 'CLAUDE.md')) || exists(path.join(project.path, '.claude'))) {
    add('claude-code-memory', 'project has Claude Code files', 'skills/claude-code-memory/SKILL.md');
  }
  if (project.frameworks.includes('docker')) add('deployment-patterns', 'docker/deployment files detected', 'patterns/deployment/README.md');
  if (project.dependencies.length || project.languages.length) add('debugging-patterns', 'code project detected', 'patterns/debugging/README.md');

  const projectDir = path.join(vaultRoot, 'projects', project.name);
  if (exists(projectDir)) add(`project:${project.name}`, 'matching project memory directory exists', `projects/${project.name}`);

  return matches;
}

function claim(project) {
  const matches = matchAssets(project);
  const claimDir = path.join(project.path, '.ai-memory');
  const claudeDir = path.join(project.path, '.claude');
  const skillsDir = path.join(claudeDir, 'skills');
  const record = { claimedAt: new Date().toISOString(), project: project.name, sourceVault: vaultRoot, assets: matches };

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
    ...matches.map(m => `- ${m.id}: ${m.reason} (${m.path})\n`)
  ];

  for (const m of matches) {
    const source = path.join(vaultRoot, m.path);
    if (m.path.endsWith('SKILL.md') && exists(source)) {
      const skillId = m.id.replace(/^skill:/, '');
      writeFile(path.join(skillsDir, skillId, 'SKILL.md'), safeRead(source));
    }
  }

  const memoryPath = path.join(claudeDir, 'MEMORY.md');
  const existing = safeRead(memoryPath);
  const next = existing.includes('<!-- AI_MEMORY_VAULT_CLAIM -->')
    ? existing.replace(/<!-- AI_MEMORY_VAULT_CLAIM -->[\s\S]*<!-- \/AI_MEMORY_VAULT_CLAIM -->/m, `<!-- AI_MEMORY_VAULT_CLAIM -->\n${memoryParts.join('')}<!-- /AI_MEMORY_VAULT_CLAIM -->`)
    : `${existing ? `${existing.trim()}\n\n` : ''}<!-- AI_MEMORY_VAULT_CLAIM -->\n${memoryParts.join('')}<!-- /AI_MEMORY_VAULT_CLAIM -->\n`;
  writeFile(memoryPath, next);
  console.log(`Claimed ${matches.length} assets into ${project.path}`);
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
  console.log(`Created/updated draft project memory at ${path.relative(vaultRoot, projectDir)}`);
}

function validate() {
  const required = ['README.md', 'VAULT_PROTOCOL.md', 'registry.yaml', 'skills/vault-maintainer/SKILL.md'];
  const missing = required.filter(p => !exists(path.join(vaultRoot, p)));
  const suspicious = [];
  const patterns = [
    /BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY/,
    /\bghp_[A-Za-z0-9_]{20,}\b/,
    /\bsk-[A-Za-z0-9_-]{20,}\b/,
    /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
    /(api[_-]?key|token|password|secret)\s*[:=]\s*['\"]?[A-Za-z0-9_\-]{16,}/i
  ];
  walk(vaultRoot, file => {
    if (file.includes('/.git/')) return;
    const rel = path.relative(vaultRoot, file);
    if (rel === 'package-lock.json') return;
    const text = safeRead(file);
    for (const p of patterns) if (p.test(text)) suspicious.push(rel);
  });

  if (missing.length || suspicious.length) {
    if (missing.length) console.error(`Missing required files: ${missing.join(', ')}`);
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
  console.log(`AI Memory Vault CLI\n\nUsage:\n  ai-vault scan [project]\n  ai-vault claim [project] [--dry-run]\n  ai-vault export [project] [--project-id id] [--dry-run]\n  ai-vault validate\n`);
}

if (command === 'scan') printScan(detectProject(target));
else if (command === 'claim') claim(detectProject(target));
else if (command === 'export') exportDraft(detectProject(target));
else if (command === 'validate') validate();
else help();
