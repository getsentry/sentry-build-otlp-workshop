#!/usr/bin/env node

/**
 * Downloads and runs the OpenTelemetry Collector with the Sentry Exporter
 *
 * The Sentry Exporter is included in the standard otelcol-contrib distribution.
 * This script auto-downloads the binary if not present.
 *
 * Features:
 * - Native OTLP forwarding to Sentry
 * - Automatic project routing by service.name
 * - Auto-creation of Sentry projects
 * - Organization-level authentication
 *
 * Usage: node scripts/run-collector-sentry.js [start|stop|logs|health]
 *
 * Required environment variables:
 *   SENTRY_ORG_SLUG    - Your Sentry organization slug
 *   SENTRY_AUTH_TOKEN  - Custom Integration token with project:read/write
 */

import { spawn, exec, execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, chmodSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';
import { promisify } from 'util';
import https from 'https';
import { x as tarExtract } from 'tar';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Minimum version required for org_slug/auth_token Sentry exporter config
// This feature was merged to main but requires v0.145.0+ when released
// Check releases: https://github.com/open-telemetry/opentelemetry-collector-releases/releases
const COLLECTOR_VERSION = '0.145.0';
const COLLECTOR_DIR = join(rootDir, '.otel-collector');
const CONFIG_PATH = join(rootDir, 'collector-config-sentry.yaml');
const PID_FILE = join(COLLECTOR_DIR, 'collector-sentry.pid');
const LOG_FILE = join(COLLECTOR_DIR, 'collector-sentry.log');

// Detect platform and architecture
function getPlatform() {
  const platform = process.platform;
  const arch = process.arch;

  let osPart, archPart;

  if (platform === 'darwin') {
    osPart = 'darwin';
  } else if (platform === 'linux') {
    osPart = 'linux';
  } else if (platform === 'win32') {
    osPart = 'windows';
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  if (arch === 'x64') {
    archPart = 'amd64';
  } else if (arch === 'arm64') {
    archPart = 'arm64';
  } else {
    throw new Error(`Unsupported architecture: ${arch}`);
  }

  return { os: osPart, arch: archPart };
}

function getCollectorUrl() {
  const { os, arch } = getPlatform();
  const extension = os === 'windows' ? '.zip' : '.tar.gz';

  return `https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v${COLLECTOR_VERSION}/otelcol-contrib_${COLLECTOR_VERSION}_${os}_${arch}${extension}`;
}

function getBinaryPath() {
  const { os } = getPlatform();
  const extension = os === 'windows' ? '.exe' : '';
  return join(COLLECTOR_DIR, `otelcol-contrib${extension}`);
}

async function downloadCollector() {
  const url = getCollectorUrl();
  const binaryPath = getBinaryPath();
  const tarPath = join(COLLECTOR_DIR, 'collector.tar.gz');

  console.log('Downloading OpenTelemetry Collector (includes Sentry Exporter)...');
  console.log(`  Version: ${COLLECTOR_VERSION}`);
  console.log(`  URL: ${url}`);

  // Download the tar.gz file
  await new Promise((resolve, reject) => {
    const followRedirect = (targetUrl) => {
      https.get(targetUrl, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          followRedirect(response.headers.location);
        } else if (response.statusCode === 200) {
          const fileStream = createWriteStream(tarPath);
          response.pipe(fileStream);

          fileStream.on('finish', () => {
            fileStream.close();
            console.log('Downloaded successfully, extracting...');
            resolve();
          });

          fileStream.on('error', reject);
        } else {
          reject(new Error(`Download failed with status ${response.statusCode}`));
        }
      }).on('error', reject);
    };

    followRedirect(url);
  });

  // Extract the binary
  try {
    await tarExtract({
      file: tarPath,
      cwd: COLLECTOR_DIR,
    });

    // Make executable
    chmodSync(binaryPath, 0o755);

    // Clean up tar file
    unlinkSync(tarPath);

    console.log('Collector ready');
  } catch (error) {
    throw new Error(`Failed to extract collector: ${error.message}`);
  }
}

async function ensureCollector() {
  const binaryPath = getBinaryPath();

  if (!existsSync(COLLECTOR_DIR)) {
    mkdirSync(COLLECTOR_DIR, { recursive: true });
  }

  if (!existsSync(binaryPath)) {
    await downloadCollector();
  } else {
    console.log('Collector binary already exists');
  }
}

function isCollectorRunning() {
  if (!existsSync(PID_FILE)) {
    return false;
  }

  try {
    const pid = parseInt(readFileSync(PID_FILE, 'utf8').trim());

    let isRunning = false;

    if (process.platform === 'win32') {
      try {
        execSync(`tasklist /FI "PID eq ${pid}" | find "${pid}"`, { stdio: 'pipe' });
        isRunning = true;
      } catch {
        isRunning = false;
      }
    } else {
      try {
        process.kill(pid, 0);
        isRunning = true;
      } catch {
        isRunning = false;
      }
    }

    if (!isRunning) {
      try {
        unlinkSync(PID_FILE);
      } catch {}
    }

    return isRunning;
  } catch {
    return false;
  }
}

async function startCollector() {
  if (isCollectorRunning()) {
    console.log('Collector (Sentry exporter) is already running');
    console.log('Run "npm run sentry:stop" to stop it first');
    return;
  }

  await ensureCollector();

  const binaryPath = getBinaryPath();

  // Check config exists
  if (!existsSync(CONFIG_PATH)) {
    console.error(`Error: ${CONFIG_PATH} not found`);
    process.exit(1);
  }

  // Load environment variables
  const envPath = join(rootDir, '.env');
  let envVars = { ...process.env };

  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        envVars[key] = value;
      }
    });
  }

  // Check required environment variables
  const requiredVars = ['SENTRY_ORG_SLUG', 'SENTRY_AUTH_TOKEN'];
  const missingVars = requiredVars.filter(v => !envVars[v]);

  if (missingVars.length > 0) {
    console.error('Error: Missing required environment variables:');
    missingVars.forEach(v => console.error(`  - ${v}`));
    console.error('');
    console.error('Add these to your .env file:');
    console.error('  SENTRY_ORG_SLUG=your-org-slug');
    console.error('  SENTRY_AUTH_TOKEN=sntrys_eyJ...');
    console.error('');
    console.error('To get these values:');
    console.error('  1. Organization slug: Settings → General Settings');
    console.error('     Or from URL: https://sentry.io/organizations/{org-slug}/');
    console.error('  2. Auth token: Settings → Developer Settings → Custom Integrations');
    console.error('     Create an integration with Project: Read and Project: Write permissions');
    process.exit(1);
  }

  console.log('');
  console.log('Starting OpenTelemetry Collector (Sentry Exporter)...');
  console.log(`  Config: ${CONFIG_PATH}`);
  console.log('  Mode: Native Sentry Exporter with Auto-Routing');
  console.log(`  Org: ${envVars.SENTRY_ORG_SLUG}`);
  console.log('  Auto-create projects: enabled');
  console.log('');

  const logStream = createWriteStream(LOG_FILE, { flags: 'a' });

  await new Promise((resolve, reject) => {
    logStream.on('open', resolve);
    logStream.on('error', reject);
  });

  const collector = spawn(binaryPath, ['--config', CONFIG_PATH], {
    detached: true,
    stdio: ['ignore', logStream.fd, logStream.fd],
    env: envVars,
  });

  collector.unref();

  writeFileSync(PID_FILE, collector.pid.toString());

  await new Promise(resolve => setTimeout(resolve, 2000));

  if (isCollectorRunning()) {
    console.log('Collector started successfully');
    console.log(`  PID: ${collector.pid}`);
    console.log('  HTTP: http://localhost:4318');
    console.log('  gRPC: http://localhost:4317');
    console.log('  Health: http://localhost:13133');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Start services: npm run sentry:services');
    console.log('  2. Or start all: npm run demo:sentry');
    console.log('');
    console.log(`View logs: tail -f ${LOG_FILE}`);
  } else {
    console.error('Collector failed to start. Check logs:');
    console.error(`  tail -f ${LOG_FILE}`);
    process.exit(1);
  }
}

async function stopCollector() {
  if (!isCollectorRunning()) {
    console.log('Collector (Sentry exporter) is not running');
    return;
  }

  const pid = parseInt(readFileSync(PID_FILE, 'utf8').trim());

  console.log(`Stopping collector (PID: ${pid})...`);

  try {
    if (process.platform === 'win32') {
      await execAsync(`taskkill /F /PID ${pid}`);
    } else {
      process.kill(pid, 'SIGTERM');

      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (!isCollectorRunning()) {
          break;
        }
      }

      if (isCollectorRunning()) {
        process.kill(pid, 'SIGKILL');
      }
    }

    if (existsSync(PID_FILE)) {
      unlinkSync(PID_FILE);
    }

    console.log('Collector stopped');
  } catch (error) {
    console.error('Error stopping collector:', error.message);
    if (existsSync(PID_FILE)) {
      try {
        unlinkSync(PID_FILE);
      } catch {}
    }
  }
}

async function showLogs() {
  if (!existsSync(LOG_FILE)) {
    console.log('No logs found. Collector may not have been started yet.');
    return;
  }

  const { spawn } = await import('child_process');
  const tail = spawn('tail', ['-f', LOG_FILE], { stdio: 'inherit' });

  process.on('SIGINT', () => {
    tail.kill();
    process.exit(0);
  });
}

async function checkHealth() {
  try {
    const response = await fetch('http://localhost:13133');
    if (response.ok) {
      console.log('Collector is healthy');
    } else {
      console.log(`Collector health check failed: ${response.status}`);
    }
  } catch (error) {
    console.log('Collector is not responding (may not be running)');
  }
}

// Main
const command = process.argv[2];

switch (command) {
  case 'start':
    startCollector().catch(error => {
      console.error('Error:', error.message);
      process.exit(1);
    });
    break;
  case 'stop':
    stopCollector().catch(error => {
      console.error('Error:', error.message);
      process.exit(1);
    });
    break;
  case 'logs':
    showLogs();
    break;
  case 'health':
    checkHealth();
    break;
  default:
    console.log('Usage: node scripts/run-collector-sentry.js [start|stop|logs|health]');
    console.log('');
    console.log('Commands:');
    console.log('  start   Start the collector with Sentry exporter');
    console.log('  stop    Stop the collector');
    console.log('  logs    Tail the collector logs');
    console.log('  health  Check collector health endpoint');
    process.exit(1);
}
