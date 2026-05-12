import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';

const repoRoot = path.resolve(import.meta.dirname, '..');
const cli = path.join(repoRoot, 'scripts', 'ai-vault.js');

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ai-vault-test-'));
}

function run(args, options = {}) {
  return execFileSync(process.execPath, [cli, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    ...options
  });
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

test('scan detects package language, dependency, and framework', () => {
  const root = tempDir();
  const project = path.join(root, 'app');
  fs.mkdirSync(project);
  writeJson(path.join(project, 'package.json'), {
    name: 'react-app',
    dependencies: { react: 'latest' }
  });

  const scan = JSON.parse(run(['scan', project]));
  assert.equal(scan.name, 'react-app');
  assert.deepEqual(scan.languages, ['javascript']);
  assert.ok(scan.dependencies.includes('react'));
  assert.ok(scan.frameworks.includes('react'));
});

test('claim writes manifest, skill, and preserves existing memory outside marker', () => {
  const root = tempDir();
  const project = path.join(root, 'app');
  fs.mkdirSync(path.join(project, '.claude'), { recursive: true });
  writeJson(path.join(project, 'package.json'), { name: 'claim-app', dependencies: {} });
  fs.writeFileSync(path.join(project, '.claude', 'MEMORY.md'), '# Existing\n\nKeep this.\n');

  run(['claim', project]);

  const manifestPath = path.join(project, '.ai-memory', 'claimed-assets.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.project, 'claim-app');
  assert.ok(manifest.assets.some(asset => asset.id === 'vault-maintainer'));
  assert.ok(manifest.assets.every(asset => asset.sha256 && asset.shortHash));

  assert.ok(fs.existsSync(path.join(project, '.claude', 'skills', 'vault-maintainer', 'SKILL.md')));
  const memory = fs.readFileSync(path.join(project, '.claude', 'MEMORY.md'), 'utf8');
  assert.match(memory, /Keep this\./);
  assert.match(memory, /AI_MEMORY_VAULT_CLAIM/);
  assert.match(memory, /claimed-assets\.json/);
});

test('claim uses registry match rules for docker and claude assets', () => {
  const root = tempDir();
  const project = path.join(root, 'docker-app');
  fs.mkdirSync(path.join(project, '.claude'), { recursive: true });
  writeJson(path.join(project, 'package.json'), { name: 'docker-app', dependencies: {} });
  fs.writeFileSync(path.join(project, 'Dockerfile'), 'FROM node:22\n');

  const dryRun = JSON.parse(run(['claim', project, '--dry-run']));
  const ids = dryRun.assets.map(asset => asset.id);
  assert.ok(ids.includes('deployment-patterns'));
  assert.ok(ids.includes('claude-code-memory'));
});

test('export registers a project in registry', () => {
  const root = tempDir();
  const project = path.join(root, 'export-app');
  const registryPath = path.join(repoRoot, 'registry.yaml');
  const originalRegistry = fs.readFileSync(registryPath, 'utf8');
  fs.mkdirSync(project);
  writeJson(path.join(project, 'package.json'), { name: 'export-app', dependencies: {} });

  const projectId = `test-export-${Date.now()}`;
  try {
    run(['export', project, '--project-id', projectId]);
    assert.ok(fs.existsSync(path.join(repoRoot, 'projects', projectId, 'PROJECT.md')));
    const registry = fs.readFileSync(registryPath, 'utf8');
    assert.match(registry, new RegExp(`id: project:${projectId}`));
  } finally {
    fs.writeFileSync(registryPath, originalRegistry);
    fs.rmSync(path.join(repoRoot, 'projects', projectId), { recursive: true, force: true });
  }
});



test('context prints compact startup context with matched asset hashes', () => {
  const root = tempDir();
  const project = path.join(root, 'context-app');
  fs.mkdirSync(project);
  writeJson(path.join(project, 'package.json'), { name: 'context-app', dependencies: {} });

  const output = run(['context', project]);
  assert.match(output, /AI Memory Vault Context/);
  assert.match(output, /Relevant assets/);
  assert.match(output, /global-instructions/);
  assert.match(output, /public/);
});

test('summarize creates non-destructive proposal and session summary inbox entries', () => {
  const root = tempDir();
  const project = path.join(root, 'summary-app');
  fs.mkdirSync(project);
  writeJson(path.join(project, 'package.json'), { name: 'summary-app', dependencies: {} });
  fs.writeFileSync(path.join(project, 'README.md'), '# Summary App\n');

  const beforeProposals = new Set(fs.readdirSync(path.join(repoRoot, 'inbox', 'proposals')));
  const beforeSessions = new Set(fs.readdirSync(path.join(repoRoot, 'inbox', 'session-summaries')));
  try {
    const output = run(['summarize', project, '--text', 'Verified lesson: keep proposal first.']);
    assert.match(output, /Created summarize proposal/);
    const proposals = fs.readdirSync(path.join(repoRoot, 'inbox', 'proposals')).filter(file => !beforeProposals.has(file));
    const sessions = fs.readdirSync(path.join(repoRoot, 'inbox', 'session-summaries')).filter(file => !beforeSessions.has(file));
    assert.equal(proposals.length, 1);
    assert.equal(sessions.length, 1);
    const proposal = fs.readFileSync(path.join(repoRoot, 'inbox', 'proposals', proposals[0]), 'utf8');
    assert.match(proposal, /Status: proposed/);
    assert.match(proposal, /Visibility: private/);
    assert.match(proposal, /Verified lesson/);
  } finally {
    for (const file of fs.readdirSync(path.join(repoRoot, 'inbox', 'proposals'))) {
      if (!beforeProposals.has(file)) fs.rmSync(path.join(repoRoot, 'inbox', 'proposals', file), { force: true });
    }
    for (const file of fs.readdirSync(path.join(repoRoot, 'inbox', 'session-summaries'))) {
      if (!beforeSessions.has(file)) fs.rmSync(path.join(repoRoot, 'inbox', 'session-summaries', file), { force: true });
    }
  }
});



test('list-assets and asset expose progressive disclosure primitives', () => {
  const assets = JSON.parse(run(['list-assets', '--json']));
  assert.ok(assets.some(asset => asset.id === 'global-instructions'));
  assert.ok(assets.every(asset => asset.sha256 && asset.visibility));

  const asset = JSON.parse(run(['asset', 'global-instructions', '--json']));
  assert.equal(asset.id, 'global-instructions');
  assert.match(asset.content, /Global AI Instructions/);
});

test('status detects fresh and stale claimed assets', () => {
  const root = tempDir();
  const project = path.join(root, 'status-app');
  fs.mkdirSync(project);
  writeJson(path.join(project, 'package.json'), { name: 'status-app', dependencies: {} });
  run(['claim', project]);

  let status = JSON.parse(run(['status', project, '--json']));
  assert.equal(status.manifestFound, true);
  assert.ok(status.assets.some(asset => asset.status === 'fresh'));

  const manifestPath = path.join(project, '.ai-memory', 'claimed-assets.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.assets[0].sha256 = 'outdated';
  manifest.assets[0].shortHash = 'outdated';
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  status = JSON.parse(run(['status', project, '--json']));
  assert.ok(status.assets.some(asset => asset.status === 'stale'));
});

test('impact and map expose asset graph relationships', () => {
  const impact = JSON.parse(run(['impact', 'vault-maintainer', '--json']));
  assert.equal(impact.asset.id, 'vault-maintainer');
  assert.ok(Array.isArray(impact.fileReferences));

  const map = run(['map']);
  assert.match(map, /```mermaid/);
  assert.match(map, /global_assets/);
  assert.match(map, /vault_maintainer/);
});

test('sync dry-run describes pull validate claim status workflow', () => {
  const root = tempDir();
  const project = path.join(root, 'sync-app');
  fs.mkdirSync(project);
  writeJson(path.join(project, 'package.json'), { name: 'sync-app', dependencies: {} });

  const output = run(['sync', project, '--dry-run']);
  assert.match(output, /git pull --ff-only/);
  assert.match(output, /ai-vault claim/);
  assert.match(output, /ai-vault status/);
});

test('validate fails for broken registry path and obvious secret', () => {
  const root = tempDir();
  const vault = path.join(root, 'vault');
  fs.cpSync(repoRoot, vault, {
    recursive: true,
    filter: source => !source.includes(`${path.sep}.git${path.sep}`) && !source.endsWith(`${path.sep}.git`)
  });

  const registryPath = path.join(vault, 'registry.yaml');
  const cleanRegistry = fs.readFileSync(registryPath, 'utf8');
  fs.appendFileSync(registryPath, '\n  - id: broken\n    type: pattern\n    path: missing/file.md\n');
  let result = spawnSync(process.execPath, ['scripts/ai-vault.js', 'validate'], { cwd: vault, encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /registry path does not exist/);

  fs.writeFileSync(registryPath, cleanRegistry);
  const secretName = ['api', 'key'].join('_');
  const secretValue = ['1234567890', 'abcdef123456'].join('');
  fs.writeFileSync(path.join(vault, 'leaked.txt'), `${secretName} = "${secretValue}"\n`);
  result = spawnSync(process.execPath, ['scripts/ai-vault.js', 'validate'], { cwd: vault, encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Potential secrets found/);
});
