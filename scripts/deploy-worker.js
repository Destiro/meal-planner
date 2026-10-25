#!/usr/bin/env node
/**
 * Deploys the Cloudflare Worker in worker/ if it has changed since the last successful deploy.
 *
 * `npm start` runs this before starting Expo, so the Worker is always up to date with your code.
 * It never stops the app from starting: if the deploy can't happen (offline, not logged in, old Node),
 * it says so and carries on.
 *
 *   node scripts/deploy-worker.js           deploy only if worker/ changed
 *   node scripts/deploy-worker.js --force   deploy regardless (npm run deploy:worker)
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const WORKER_DIR = path.join(__dirname, '..', 'worker');
// Remembers what was last deployed. Git-ignored, so each computer keeps its own.
const STAMP_FILE = '.last-deploy';
// The parts of worker/ that make up what gets deployed.
const WATCHED = ['src', 'wrangler.jsonc', 'package.json'];
// Wrangler won't run on anything older.
const MIN_NODE_MAJOR = 22;

function listFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries
    .flatMap((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? listFiles(full, base) : [path.relative(base, full)];
    })
    .sort();
}

/** A fingerprint of the Worker's code and config. Line endings are ignored so Windows and Mac agree. */
function hashWorker(workerDir = WORKER_DIR) {
  const hash = crypto.createHash('sha256');
  for (const item of WATCHED) {
    const full = path.join(workerDir, item);
    if (!fs.existsSync(full)) continue;
    const files = fs.statSync(full).isDirectory() ? listFiles(full, workerDir) : [item];
    for (const file of files) {
      const content = fs.readFileSync(path.join(workerDir, file), 'utf8').replace(/\r\n/g, '\n');
      hash.update(`${file.replace(/\\/g, '/')}\n${content}\n`);
    }
  }
  return hash.digest('hex');
}

function readStamp(workerDir = WORKER_DIR) {
  try {
    return fs.readFileSync(path.join(workerDir, STAMP_FILE), 'utf8').trim();
  } catch {
    return null;
  }
}

function writeStamp(hash, workerDir = WORKER_DIR) {
  fs.writeFileSync(path.join(workerDir, STAMP_FILE), `${hash}\n`);
}

const nodeIsSupported = (version = process.versions.node) => Number(version.split('.')[0]) >= MIN_NODE_MAJOR;

/** True if the Worker's code differs from what was last deployed (or nothing was deployed yet). */
const needsDeploy = (workerDir = WORKER_DIR) => readStamp(workerDir) !== hashWorker(workerDir);

function run(commandLine) {
  // Run through a shell, which is how Windows finds npm and npx.
  return spawnSync(commandLine, { cwd: WORKER_DIR, stdio: 'inherit', shell: true });
}

function main(argv = process.argv.slice(2)) {
  const force = argv.includes('--force');
  if (!fs.existsSync(WORKER_DIR)) return;

  if (!force && !needsDeploy()) {
    console.log('Worker is up to date.');
    return;
  }
  if (!nodeIsSupported()) {
    console.warn(`Skipping the Worker deploy: it needs Node ${MIN_NODE_MAJOR} or newer (this is ${process.versions.node}).`);
    return;
  }

  if (!fs.existsSync(path.join(WORKER_DIR, 'node_modules'))) {
    console.log('Installing the Worker tools (first time only)...');
    if (run('npm install').status !== 0) {
      console.warn('Could not install the Worker tools, so the Worker was not deployed. Starting the app anyway.');
      return;
    }
  }

  console.log('Deploying the Worker...');
  const hash = hashWorker();
  if (run('npx wrangler deploy').status === 0) {
    writeStamp(hash);
    console.log('Worker deployed.');
  } else {
    console.warn('The Worker was not deployed (offline, or not logged in?). Starting the app anyway.');
    console.warn('Run `npm run deploy:worker` to try again.');
  }
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    // Never block the app from starting.
    console.warn('Skipping the Worker deploy:', e instanceof Error ? e.message : e);
  }
}

module.exports = { hashWorker, readStamp, writeStamp, needsDeploy, nodeIsSupported, listFiles };
