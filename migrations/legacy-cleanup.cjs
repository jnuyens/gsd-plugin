#!/usr/bin/env node

/**
 * GSD Legacy Cleanup -- Audit and optionally remove legacy GSD install artifacts
 *
 * This script helps users migrate from the legacy ~/.claude/get-shit-done/ install
 * to the plugin-based distribution (claude plugin install gsd).
 *
 * Usage:
 *   node migrations/legacy-cleanup.cjs           # Audit mode: list legacy artifacts
 *   node migrations/legacy-cleanup.cjs --clean    # Clean mode: remove with confirmation
 *
 * What it checks:
 *   - ~/.claude/get-shit-done/ directory (legacy install root)
 *   - GSD entries in project .mcp.json files
 *   - GSD hook entries in ~/.claude/settings.json
 *   - Legacy hook scripts in ~/.claude/hooks/
 *   - get-shit-done-cc npm package (global install)
 *
 * Safety:
 *   - Never silently deletes data
 *   - Audit mode is the default (read-only)
 *   - --clean mode prints what will be removed and asks for confirmation
 *   - The /gsd:update command is retired; plugin-managed updates replace it
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

// ─── Legacy path definitions ─────────────────────────────────────────────────

const HOME = os.homedir();

const LEGACY_PATHS = {
  gsdRoot: path.join(HOME, '.claude', 'get-shit-done'),
  settingsJson: path.join(HOME, '.claude', 'settings.json'),
  hooksDir: path.join(HOME, '.claude', 'hooks'),
  hookFiles: [
    'gsd-check-update.js',
    'gsd-context-monitor.js',
    'gsd-prompt-guard.js',
    'gsd-statusline.js',
  ],
};

// ─── Audit functions ─────────────────────────────────────────────────────────

function auditLegacyRoot() {
  const result = { found: false, path: LEGACY_PATHS.gsdRoot, details: '' };
  if (fs.existsSync(LEGACY_PATHS.gsdRoot)) {
    result.found = true;
    try {
      const versionFile = path.join(LEGACY_PATHS.gsdRoot, 'VERSION');
      if (fs.existsSync(versionFile)) {
        result.details = `Version: ${fs.readFileSync(versionFile, 'utf8').trim()}`;
      } else {
        result.details = 'No VERSION file found';
      }
    } catch {
      result.details = 'Could not read version';
    }
  }
  return result;
}

function auditMcpJson(cwd) {
  const results = [];
  // Check project .mcp.json
  const projectMcp = path.join(cwd, '.mcp.json');
  if (fs.existsSync(projectMcp)) {
    try {
      const content = JSON.parse(fs.readFileSync(projectMcp, 'utf8'));
      const servers = content.mcpServers || {};
      for (const [name, config] of Object.entries(servers)) {
        const args = (config.args || []).join(' ');
        const cmd = config.command || '';
        const fullCmd = `${cmd} ${args}`;
        if (fullCmd.includes('get-shit-done') || fullCmd.includes('.claude/get-shit-done')) {
          results.push({
            found: true,
            path: projectMcp,
            key: name,
            details: `Server "${name}" references legacy path: ${fullCmd.trim()}`,
          });
        }
      }
    } catch {
      // Not valid JSON, skip
    }
  }
  return results;
}

function auditSettingsJson() {
  const results = [];
  if (!fs.existsSync(LEGACY_PATHS.settingsJson)) return results;

  try {
    const content = JSON.parse(fs.readFileSync(LEGACY_PATHS.settingsJson, 'utf8'));

    // Check for hook entries referencing legacy GSD scripts
    const hooks = content.hooks || {};
    for (const [event, handlers] of Object.entries(hooks)) {
      if (!Array.isArray(handlers)) continue;
      for (const handler of handlers) {
        const cmd = handler.command || '';
        if (cmd.includes('gsd-') || cmd.includes('get-shit-done')) {
          results.push({
            found: true,
            path: LEGACY_PATHS.settingsJson,
            event,
            command: cmd,
            details: `Hook "${event}" references legacy GSD script: ${cmd}`,
          });
        }
      }
    }
  } catch {
    // Not valid JSON, skip
  }
  return results;
}

function auditHookFiles() {
  const results = [];
  for (const hookFile of LEGACY_PATHS.hookFiles) {
    const fullPath = path.join(LEGACY_PATHS.hooksDir, hookFile);
    if (fs.existsSync(fullPath)) {
      results.push({
        found: true,
        path: fullPath,
        details: `Legacy hook script: ${hookFile}`,
      });
    }
  }
  return results;
}

function auditNpmPackage() {
  const result = { found: false, path: 'get-shit-done-cc (global npm)', details: '' };
  try {
    const { execSync } = require('child_process');
    const output = execSync('npm list -g get-shit-done-cc --depth=0 2>/dev/null', {
      encoding: 'utf8',
      timeout: 10000,
    });
    if (output.includes('get-shit-done-cc')) {
      result.found = true;
      const match = output.match(/get-shit-done-cc@([\d.]+)/);
      result.details = match ? `Installed version: ${match[1]}` : 'Installed (version unknown)';
    }
  } catch {
    // Not installed or npm not available
  }
  return result;
}

// ─── Display functions ───────────────────────────────────────────────────────

function printHeader() {
  console.log('');
  console.log('GSD Legacy Install Audit');
  console.log('========================');
  console.log('');
  console.log('Checking for legacy GSD artifacts that should be removed after');
  console.log('migrating to: claude plugin install gsd');
  console.log('');
  console.log('Legacy paths checked:');
  console.log('  - ~/.claude/get-shit-done/ (legacy install root)');
  console.log('  - .mcp.json (legacy MCP server entries)');
  console.log('  - ~/.claude/settings.json (legacy hook entries)');
  console.log('  - ~/.claude/hooks/gsd-*.js (legacy hook scripts)');
  console.log('  - get-shit-done-cc npm package (legacy installer)');
  console.log('  - /gsd:update command (retired, now plugin-managed)');
  console.log('');
}

function printFindings(findings) {
  if (findings.length === 0) {
    console.log('No legacy GSD artifacts found. Your installation is clean.');
    console.log('');
    return;
  }

  console.log(`Found ${findings.length} legacy artifact(s):`);
  console.log('');

  for (let i = 0; i < findings.length; i++) {
    const f = findings[i];
    console.log(`  ${i + 1}. ${f.path}`);
    if (f.details) console.log(`     ${f.details}`);
  }
  console.log('');
}

// ─── Clean functions ─────────────────────────────────────────────────────────

function askConfirmation(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().startsWith('y'));
    });
  });
}

async function cleanLegacyRoot() {
  if (!fs.existsSync(LEGACY_PATHS.gsdRoot)) return false;
  console.log(`  Removing: ${LEGACY_PATHS.gsdRoot}`);
  fs.rmSync(LEGACY_PATHS.gsdRoot, { recursive: true, force: true });
  console.log('  Removed.');
  return true;
}

async function cleanMcpEntries(cwd) {
  const projectMcp = path.join(cwd, '.mcp.json');
  if (!fs.existsSync(projectMcp)) return false;

  try {
    const content = JSON.parse(fs.readFileSync(projectMcp, 'utf8'));
    const servers = content.mcpServers || {};
    let changed = false;

    for (const [name, config] of Object.entries(servers)) {
      const args = (config.args || []).join(' ');
      const cmd = config.command || '';
      if (`${cmd} ${args}`.includes('get-shit-done')) {
        console.log(`  Removing MCP server entry: "${name}" from ${projectMcp}`);
        delete servers[name];
        changed = true;
      }
    }

    if (changed) {
      content.mcpServers = servers;
      fs.writeFileSync(projectMcp, JSON.stringify(content, null, 2) + '\n');
      console.log('  Updated .mcp.json');
    }
    return changed;
  } catch {
    return false;
  }
}

async function cleanSettingsHooks() {
  if (!fs.existsSync(LEGACY_PATHS.settingsJson)) return false;

  try {
    const content = JSON.parse(fs.readFileSync(LEGACY_PATHS.settingsJson, 'utf8'));
    const hooks = content.hooks || {};
    let changed = false;

    for (const [event, handlers] of Object.entries(hooks)) {
      if (!Array.isArray(handlers)) continue;
      const filtered = handlers.filter((h) => {
        const cmd = h.command || '';
        if (cmd.includes('gsd-') || cmd.includes('get-shit-done')) {
          console.log(`  Removing hook: "${event}" -> ${cmd}`);
          changed = true;
          return false;
        }
        return true;
      });
      hooks[event] = filtered;
      if (filtered.length === 0) {
        delete hooks[event];
      }
    }

    if (changed) {
      content.hooks = hooks;
      fs.writeFileSync(LEGACY_PATHS.settingsJson, JSON.stringify(content, null, 2) + '\n');
      console.log('  Updated settings.json');
    }
    return changed;
  } catch {
    return false;
  }
}

async function cleanHookFiles() {
  let cleaned = false;
  for (const hookFile of LEGACY_PATHS.hookFiles) {
    const fullPath = path.join(LEGACY_PATHS.hooksDir, hookFile);
    if (fs.existsSync(fullPath)) {
      console.log(`  Removing: ${fullPath}`);
      fs.unlinkSync(fullPath);
      cleaned = true;
    }
  }
  return cleaned;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const cleanMode = args.includes('--clean');
  const cwd = process.cwd();

  printHeader();

  // Collect findings
  const findings = [];

  const rootAudit = auditLegacyRoot();
  if (rootAudit.found) findings.push(rootAudit);

  const mcpAudit = auditMcpJson(cwd);
  findings.push(...mcpAudit);

  const settingsAudit = auditSettingsJson();
  findings.push(...settingsAudit);

  const hookAudit = auditHookFiles();
  findings.push(...hookAudit);

  const npmAudit = auditNpmPackage();
  if (npmAudit.found) findings.push(npmAudit);

  printFindings(findings);

  if (findings.length === 0) {
    process.exit(0);
  }

  if (!cleanMode) {
    console.log('To remove these artifacts, run:');
    console.log('  node bin/gsd-tools.cjs migrate --clean');
    console.log('');
    console.log('Or manually remove them following the migration guide in README.md.');
    console.log('');
    process.exit(0);
  }

  // Clean mode
  console.log('--- CLEANUP MODE ---');
  console.log('');
  console.log('The following legacy artifacts will be removed:');
  printFindings(findings);

  const confirmed = await askConfirmation('Proceed with cleanup? (y/N) ');
  if (!confirmed) {
    console.log('Cleanup cancelled.');
    process.exit(0);
  }

  console.log('');
  console.log('Cleaning up...');
  console.log('');

  await cleanLegacyRoot();
  await cleanMcpEntries(cwd);
  await cleanSettingsHooks();
  await cleanHookFiles();

  if (npmAudit.found) {
    console.log('');
    console.log('  NOTE: get-shit-done-cc npm package detected but not auto-removed.');
    console.log('  To uninstall: npm uninstall -g get-shit-done-cc');
  }

  console.log('');
  console.log('Cleanup complete. Verify your plugin install:');
  console.log('  1. Start a new Claude Code session');
  console.log('  2. Run /gsd:status');
  console.log('');
}

// Export for use by gsd-tools.cjs
module.exports = { main, auditLegacyRoot, auditMcpJson, auditSettingsJson, auditHookFiles, auditNpmPackage };

// Direct execution
if (require.main === module) {
  main().catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
